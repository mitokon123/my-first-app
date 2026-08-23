/**
 * BattleSystem.js
 * ターン制戦闘のロジック。描画は一切行わず、結果を「イベントの配列」で返す。
 * 画面（BattleScene）はそのイベントを読んで表示するだけでよい。
 *
 * ▼ 戦闘の流れ
 *   1. 盤面（味方・敵とも最大 battleFieldSize 体）に出ている全員の行動を決める
 *   2. 味方・敵をまとめて素早さの大きい順に並べ、その順で行動する
 *   3. 倒れた者が出たら、控えから盤面へ繰り上げる
 *
 * ▼ 受け取るモンスターについて
 * 特定のクラスに依存しない。次のインターフェースを満たすオブジェクトなら何でもよい。
 *   getName() / getMaxHp() / getAttack() / getDefense() / getSpeed()
 *   isFainted() / takeDamage(n) / currentHp / skills
 *   getSpecies()（任意。経験値の算出に使用）
 *
 * ▼ 数値はすべて data/battle.js から取得する（このファイルに数値を書かない）。
 */
(function (NS) {
  "use strict";

  /**
   * @param {MyGame.GameData} gameData
   * @param {MyGame.Random} random
   */
  function BattleSystem(gameData, random) {
    this.data = gameData;
    this.random = random;
    // 特性・装備によるダメージ倍率の集計に使う
    this.effects = NS.EffectSystem ? new NS.EffectSystem(gameData) : null;
    this.allies = [];
    this.enemies = [];
    this.fieldSize = (gameData.config || {}).battleFieldSize || 3;
    this.finished = false;
    this.result = null; // "win" | "lose" | "flee" | その他（外部から終了させた場合）
  }

  /**
   * 戦闘を開始する。
   * @param {object[]} allies 味方（先頭から盤面に出る）
   * @param {object[]} enemies 敵
   */
  BattleSystem.prototype.start = function (allies, enemies) {
    this.allies = allies || [];
    this.enemies = enemies || [];
    this.finished = false;
    this.result = null;

    this._resetFieldMarks();
  };

  /**
   * 戦闘中だけ使う印を、開始時にすべて消してから付け直す。
   *
   * これらは前の戦闘の状態が残ると誤動作するため、必ずここで初期化する。
   *   _removed   … 盤面から取り除かれた（スカウトで仲間になった等）
   *                 消し忘れると、その個体は次の戦闘以降ずっと行動しなくなる
   *   _defending … 防御中
   *   _onField   … 盤面に出ている（控えから上がった者だけを知らせるために使う）
   */
  BattleSystem.prototype._resetFieldMarks = function () {
    var i;
    for (i = 0; i < this.allies.length; i++) {
      this.allies[i]._removed = false;
      this.allies[i]._defending = false;
      this.allies[i]._onField = false;
    }
    for (i = 0; i < this.enemies.length; i++) {
      this.enemies[i]._removed = false;
      this.enemies[i]._defending = false;
    }

    var field = this.getFieldAllies();
    for (i = 0; i < field.length; i++) field[i]._onField = true;
  };

  // --- 盤面の参照 ---

  /** 盤面に出ている味方（戦闘可能な先頭から fieldSize 体） */
  BattleSystem.prototype.getFieldAllies = function () {
    return aliveMembers(this.allies, this.fieldSize);
  };

  /** 盤面に出ている敵 */
  BattleSystem.prototype.getFieldEnemies = function () {
    return aliveMembers(this.enemies, this.fieldSize);
  };

  BattleSystem.prototype.isOver = function () { return this.finished; };
  BattleSystem.prototype.getResult = function () { return this.result; };

  // --- ターン進行 ---

  /**
   * 盤面の味方全員の行動を受け取り、1ターン分を解決する。
   *
   * @param {object[]} allyActions 盤面の味方と同じ並びの行動
   *   { type: "skill", skillId, targetIndex } … 技を使う（targetIndex は盤面の敵の番号）
   *   { type: "item",  itemId, targetIndex, targetSide } … 道具を使う（実際の効果は呼び出し側で適用済み）
   *   { type: "scout", targetIndex }  … スカウト（判定は呼び出し側）
   *   { type: "flee" }                … 逃走（1人でも選べば逃走判定を行う）
   *   { type: "skip" }                … 何もしない
   * @returns {object[]} 発生したイベントの配列
   */
  BattleSystem.prototype.takeTurn = function (allyActions) {
    var events = [];
    if (this.finished) return events;

    var fieldAllies = this.getFieldAllies();
    var fieldEnemies = this.getFieldEnemies();
    if (fieldAllies.length === 0 || fieldEnemies.length === 0) {
      this._finish(events);
      return events;
    }

    // 防御は前のターンの分を解除してから、このターンの分を設定する
    this._applyDefend(fieldAllies, allyActions, events);

    // 「逃げる」は行動順の前にまとめて判定する
    if (containsFlee(allyActions)) {
      if (this._tryFlee(events)) return events;
    }

    var order = this._buildTurnOrder(fieldAllies, fieldEnemies, allyActions);

    for (var i = 0; i < order.length; i++) {
      var step = order[i];
      // 先に倒された者、盤面から取り除かれた者（スカウトされた等）は行動しない
      if (step.actor.isFainted() || step.actor._removed) continue;

      this._performAction(step, events);
      if (this._checkFinish(events)) return events;
    }

    // 倒れた者がいれば控えから繰り上げる
    this._refillField(events);
    this._checkFinish(events);
    return events;
  };

  /**
   * 味方・敵の行動をまとめ、素早さの大きい順に並べる。
   * 同じ素早さのときの決め方は data/battle.js の speedTieBreak。
   *
   * ただしスカウトだけは特別で、
   *   ・誘った1体だけが味方から行動する（他の味方は動かない）
   *   ・素早さに関係なく最初に行動する
   * 失敗した場合は、そのあと敵だけが行動する。
   */
  BattleSystem.prototype._buildTurnOrder = function (fieldAllies, fieldEnemies, allyActions) {
    var i;
    var enemySteps = [];

    for (i = 0; i < fieldEnemies.length; i++) {
      enemySteps.push({
        actor: fieldEnemies[i], side: "enemy",
        action: this._chooseEnemyAction(fieldEnemies[i], fieldAllies),
        speed: this._rollSpeed(fieldEnemies[i])
      });
    }

    // スカウトを選んだ味方がいれば、その1体だけが先に行動する
    var scoutIndex = findScoutIndex(allyActions);
    if (scoutIndex >= 0 && fieldAllies[scoutIndex]) {
      var scoutStep = {
        actor: fieldAllies[scoutIndex], side: "ally",
        action: allyActions[scoutIndex], speed: Infinity
      };
      return [scoutStep].concat(this._sortBySpeed(enemySteps));
    }

    var steps = enemySteps;
    for (i = 0; i < fieldAllies.length; i++) {
      var action = (allyActions && allyActions[i]) || { type: "skip" };
      steps.push({
        actor: fieldAllies[i], side: "ally",
        action: action, speed: this._rollSpeed(fieldAllies[i])
      });
    }

    return this._sortBySpeed(steps);
  };

  /**
   * 行動順を決めるための素早さ。
   * 毎ターン speedVariance の範囲でぶれるので、
   * 素早さが近い者どうしは順番が入れ替わることがある。
   */
  BattleSystem.prototype._rollSpeed = function (actor) {
    var config = (this.data.battle || {}).speedVariance || {};
    var min = (typeof config.min === "number") ? config.min : 1;
    var max = (typeof config.max === "number") ? config.max : 1;

    return actor.getSpeed() * (min + this.random.next() * (max - min));
  };

  BattleSystem.prototype._sortBySpeed = function (steps) {
    var tieBreak = (this.data.battle || {}).speedTieBreak || "random";
    var random = this.random;

    // 並べ替えが安定するよう、あらかじめ同速時の順位を決めておく
    for (var i = 0; i < steps.length; i++) {
      if (tieBreak === "allyFirst") steps[i]._tie = (steps[i].side === "ally") ? 0 : 1;
      else if (tieBreak === "enemyFirst") steps[i]._tie = (steps[i].side === "enemy") ? 0 : 1;
      else steps[i]._tie = random.next();
    }

    steps.sort(function (a, b) {
      if (b.speed !== a.speed) return b.speed - a.speed;
      return a._tie - b._tie;
    });
    return steps;
  };

  /**
   * 敵の行動を決める。
   * data/battle.js の enemyAi.skillRate の確率で技を使い、それ以外は通常攻撃。
   * PPが足りない技は候補から外し、使える技が無ければ通常攻撃をする。
   */
  BattleSystem.prototype._chooseEnemyAction = function (enemy, fieldAllies) {
    var target = this.random.nextInt(0, Math.max(0, fieldAllies.length - 1));
    var fallback = { type: "skill", skillId: this.getNormalAttackId(), targetIndex: target };

    var skillRate = ((this.data.battle || {}).enemyAi || {}).skillRate;
    if (typeof skillRate !== "number") skillRate = 1;
    if (this.random.next() >= skillRate) return fallback;

    var usable = [];
    var skills = enemy.skills || [];
    for (var i = 0; i < skills.length; i++) {
      if (this._canUseSkill(enemy, skills[i])) usable.push(skills[i]);
    }
    if (usable.length === 0) return fallback;

    return { type: "skill", skillId: this.random.pick(usable), targetIndex: target };
  };

  /**
   * 防御を設定し直す。
   * 前のターンの防御はここで解除されるので、効果は「選んだターンの間」だけ続く。
   */
  BattleSystem.prototype._applyDefend = function (fieldAllies, allyActions, events) {
    var i;
    // まず全員の防御を解除する
    for (i = 0; i < this.allies.length; i++) this.allies[i]._defending = false;
    for (i = 0; i < this.enemies.length; i++) this.enemies[i]._defending = false;

    for (i = 0; i < fieldAllies.length; i++) {
      var action = allyActions && allyActions[i];
      if (!action || action.type !== "defend") continue;

      fieldAllies[i]._defending = true;
      events.push({ type: "defend", side: "ally", actorName: fieldAllies[i].getName() });
    }
  };

  /** 「攻撃」に使う技id */
  BattleSystem.prototype.getNormalAttackId = function () {
    return (this.data.battle || {}).normalAttackSkill || "normalAttack";
  };

  /**
   * その技を今のPPで使えるか。
   * PPを持たない相手（テスト用の簡易オブジェクトなど）は常に使える扱い。
   */
  BattleSystem.prototype._canUseSkill = function (actor, skillId) {
    var skill = this.data.getSkill(skillId);
    if (!skill) return false;

    var cost = skill.pp || 0;
    if (cost <= 0) return true;
    if (!actor.canPayPp) return true;
    return actor.canPayPp(cost);
  };

  /** 1体分の行動を実行する */
  BattleSystem.prototype._performAction = function (step, events) {
    var action = step.action || { type: "skip" };

    // 技以外（道具・スカウトなど）は、BattleSystem は中身を知らない。
    // 呼び出し側が設定した onNonSkillAction に、正しい行動順のタイミングで処理を任せる。
    if (action.type !== "skill") {
      if (this.onNonSkillAction) this.onNonSkillAction(step, events);
      return;
    }

    var target = this._resolveTarget(step, action);
    if (!target) return;

    this._performSkill(step.actor, target, action.skillId, step.side, events);
  };

  /**
   * 行動時点での対象を決める。
   *
   * 対象は「番号」ではなく「選んだ個体そのもの」で覚えておく（action.target）。
   * 番号だけで覚えると、先に別の相手が倒れて並びがずれたときに
   * 狙っていない相手を攻撃してしまうため。
   * 選んだ相手が既に倒れている場合だけ、生きている別の相手に切り替える。
   */
  BattleSystem.prototype._resolveTarget = function (step, action) {
    var candidates = (step.side === "ally") ? this.getFieldEnemies() : this.getFieldAllies();
    if (candidates.length === 0) return null;

    // 選んだ個体が今も戦えるならそのまま
    if (action.target && !action.target.isFainted()
        && candidates.indexOf(action.target) >= 0) {
      return action.target;
    }

    // 個体を覚えていない場合（敵の行動など）は番号で探す
    var index = action.targetIndex;
    if (index === undefined || index === null) index = 0;

    var target = candidates[index];
    if (target && !target.isFainted()) return target;

    return candidates[0] || null;
  };

  /** 技を使用し、PPの支払い・命中判定・ダメージ適用を行う */
  BattleSystem.prototype._performSkill = function (actor, target, skillId, side, events) {
    var skill = this.data.getSkill(skillId);
    if (!skill) {
      events.push({ type: "noSkill", side: side, actorName: actor.getName() });
      return;
    }

    // PPが足りない技は出せないので、通常攻撃に切り替える
    if (!this._canUseSkill(actor, skillId)) {
      skill = this.data.getSkill(this.getNormalAttackId());
      if (!skill) {
        events.push({ type: "noSkill", side: side, actorName: actor.getName() });
        return;
      }
    }

    // PPを支払う（通常攻撃は0なので減らない）
    if (skill.pp && actor.payPp) actor.payPp(skill.pp);

    events.push({
      type: "useSkill", side: side,
      actorName: actor.getName(), skillName: skill.name
    });

    var battle = this.data.battle || {};
    var accuracy = (skill.accuracy === undefined)
      ? (battle.defaultAccuracy === undefined ? 1 : battle.defaultAccuracy)
      : skill.accuracy;

    if (this.random.next() >= accuracy) {
      events.push({ type: "miss", side: side, targetName: target.getName(), target: target });
      return;
    }

    var result = this.calcDamage(actor, target, skill);

    // 無効化されたときはダメージを与えず、その旨だけ知らせる
    if (result.immune) {
      events.push({ type: "immune", side: side, targetName: target.getName(), target: target });
      return;
    }

    if (result.critical) {
      events.push({ type: "critical", side: side, targetName: target.getName(), target: target });
    }
    // 属性の通りやすさ（等倍のときは何も出さない）
    if (result.elementMultiplier > 1) {
      events.push({ type: "effective", side: side, targetName: target.getName(), target: target });
    } else if (result.elementMultiplier < 1) {
      events.push({ type: "resisted", side: side, targetName: target.getName(), target: target });
    }

    target.takeDamage(result.damage);

    events.push({
      type: "damage", side: side,
      targetName: target.getName(), amount: result.damage,
      currentHp: target.currentHp, maxHp: target.getMaxHp(),
      // 画面側がダメージ表示の位置を決められるよう、対象そのものも渡す
      target: target, critical: result.critical
    });

    if (target.isFainted()) {
      events.push({ type: "faint", side: side, targetName: target.getName(), target: target });
    }
  };

  /**
   * ダメージを計算する。式・数値は data/battle.js。
   *
   *   基礎 = 攻撃力×attackFactor + 技威力×powerFactor - 防御力×defenseFactor
   *   ダメージ = floor( max(0, 基礎) × 属性倍率 × 会心倍率 × 乱数 )
   *
   * @returns {{damage:number, critical:boolean, elementMultiplier:number, immune:boolean}}
   */
  BattleSystem.prototype.calcDamage = function (attacker, defender, skill) {
    var battle = this.data.battle || {};
    var config = battle.damage || {};

    var elementId = skill.element || "none";
    if (this._isImmune(defender, elementId)) {
      return { damage: 0, critical: false, elementMultiplier: 0, immune: true };
    }

    var attackFactor = numberOr(config.attackFactor, 1);
    var powerFactor = numberOr(config.powerFactor, 1);
    var defenseFactor = numberOr(config.defenseFactor, 0);
    var randomMin = numberOr(config.randomMin, 1);
    var randomMax = numberOr(config.randomMax, 1);
    var minDamage = numberOr(config.minDamage, 1);

    // 防御で0を下回っても、そこから先はマイナスにしない
    var base = attacker.getAttack() * attackFactor
             + (skill.power || 0) * powerFactor
             - defender.getDefense() * defenseFactor;
    base = Math.max(0, base);

    var elementMultiplier = this._elementMultiplier(defender, elementId);
    var critical = this._rollCritical(skill);
    var criticalMultiplier = critical
      ? numberOr((battle.critical || {}).multiplier, 1)
      : 1;

    // 防御中はどんなダメージも軽くなる（属性も会心も問わない）
    var defendMultiplier = defender._defending
      ? numberOr((battle.defend || {}).multiplier, 1)
      : 1;

    // 特性・装備（攻める側の上乗せ・受ける側の軽減）
    var abilityMultiplier = 1;
    if (this.effects) {
      abilityMultiplier = this.effects.getDamageDealtMultiplier(attacker, elementId)
                        * this.effects.getDamageTakenMultiplier(defender, elementId);
    }

    var variance = randomMin + this.random.next() * (randomMax - randomMin);
    var damage = Math.floor(
      base * elementMultiplier * criticalMultiplier * defendMultiplier
           * abilityMultiplier * variance);

    return {
      damage: Math.max(minDamage, damage),
      critical: critical,
      elementMultiplier: elementMultiplier,
      immune: false
    };
  };

  /** 会心が出たか。確率は 共通値 + 技の criticalBonus */
  BattleSystem.prototype._rollCritical = function (skill) {
    var config = (this.data.battle || {}).critical || {};
    var rate = numberOr(config.baseRate, 0) + numberOr(skill.criticalBonus, 0);
    return this.random.next() < rate;
  };

  /**
   * 属性倍率を返す。
   *   倍率 = 1 - 相手の耐性 × step
   * 無属性（physical）は耐性の影響を受けないので常に 1。
   */
  BattleSystem.prototype._elementMultiplier = function (defender, elementId) {
    if (this._isNonElemental(elementId)) return 1;
    if (!defender.getResistance) return 1;

    var config = (this.data.battle || {}).resistance || {};
    var step = numberOr(config.step, 0);
    var minMultiplier = numberOr(config.minMultiplier, 0);

    var resistance = defender.getResistance(elementId) || 0;
    return Math.max(minMultiplier, 1 - resistance * step);
  };

  BattleSystem.prototype._isImmune = function (defender, elementId) {
    if (this._isNonElemental(elementId)) return false;
    return !!(defender.isImmuneTo && defender.isImmuneTo(elementId));
  };

  /** 耐性計算の対象外（無属性）か */
  BattleSystem.prototype._isNonElemental = function (elementId) {
    var element = (this.data.elements || {})[elementId];
    return !element || !!element.physical;
  };

  /** 倒れた者の代わりに、控えが盤面へ出てきたことを知らせる */
  BattleSystem.prototype._refillField = function (events) {
    var field = this.getFieldAllies();
    for (var i = 0; i < field.length; i++) {
      if (!field[i]._onField) {
        field[i]._onField = true;
        events.push({ type: "enterField", side: "ally", actorName: field[i].getName() });
      }
    }
  };

  /** 逃走を試みる。成功したら戦闘終了して true */
  BattleSystem.prototype._tryFlee = function (events) {
    var rate = (this.data.battle || {}).fleeSuccessRate || 0;
    if (this.random.next() < rate) {
      events.push({ type: "fleeSuccess" });
      this.finished = true;
      this.result = "flee";
      events.push({ type: "battleEnd", result: "flee" });
      return true;
    }
    events.push({ type: "fleeFailed" });
    return false;
  };

  /** 勝敗が決したかを判定し、決していれば終了処理を行う */
  BattleSystem.prototype._checkFinish = function (events) {
    if (this.finished) return true;
    if (firstAlive(this.enemies) && firstAlive(this.allies)) return false;

    this._finish(events);
    return true;
  };

  /** 戦闘終了処理（勝利時は経験値を付与） */
  BattleSystem.prototype._finish = function (events) {
    if (this.finished) return;
    this.finished = true;

    if (!firstAlive(this.enemies)) {
      this.result = "win";
      this._awardExp(events);
    } else {
      this.result = "lose";
    }
    events.push({ type: "battleEnd", result: this.result });
  };

  /**
   * 戦闘を外部要因で終了させる（スカウト成功など）。
   * BattleSystem は終了理由の中身を知らず、結果の文字列を保持するだけにしている。
   */
  /**
   * 敵を盤面から取り除く（スカウトで仲間になった場合など）。
   * 倒したわけではないので、経験値の対象にもならない。
   */
  BattleSystem.prototype.removeEnemy = function (enemy) {
    var index = this.enemies.indexOf(enemy);
    if (index < 0) return false;

    enemy._removed = true;
    this.enemies.splice(index, 1);
    return true;
  };

  BattleSystem.prototype.finishWith = function (result) {
    var events = [];
    if (this.finished) return events;
    this.finished = true;
    this.result = result;
    events.push({ type: "battleEnd", result: result });
    return events;
  };

  /** 倒した敵の経験値を、生存している味方全員へ付与する */
  BattleSystem.prototype._awardExp = function (events) {
    var total = 0;
    for (var i = 0; i < this.enemies.length; i++) {
      var enemy = this.enemies[i];

      // レベルに応じた量は個体が計算する。
      // 持たない相手（テスト用の簡易オブジェクトなど）は種族の基準値をそのまま使う
      if (typeof enemy.getExpReward === "function") {
        total += enemy.getExpReward();
      } else {
        var species = enemy.getSpecies ? enemy.getSpecies() : null;
        if (species && species.expReward) total += species.expReward;
      }
    }
    if (total <= 0) return;

    events.push({ type: "expGained", amount: total });

    for (var j = 0; j < this.allies.length; j++) {
      var ally = this.allies[j];
      if (ally.isFainted() || !ally.gainExp) continue;

      var before = ally.level;
      var gained = ally.gainExp(total);
      if (gained.levels > 0) {
        events.push({
          type: "levelUp", actorName: ally.getName(),
          fromLevel: before, toLevel: ally.level
        });
        for (var k = 0; k < gained.learned.length; k++) {
          var skill = this.data.getSkill(gained.learned[k]);
          events.push({
            type: "skillLearned", actorName: ally.getName(),
            skillName: skill ? skill.name : gained.learned[k]
          });
        }
      }
    }
  };

  // --- 内部ヘルパ ---

  /** 戦闘可能な者を先頭から最大 limit 体まで集める */
  function aliveMembers(list, limit) {
    var result = [];
    for (var i = 0; i < list.length && result.length < limit; i++) {
      if (!list[i].isFainted()) result.push(list[i]);
    }
    return result;
  }

  function firstAlive(list) {
    for (var i = 0; i < list.length; i++) {
      if (!list[i].isFainted()) return list[i];
    }
    return null;
  }

  /** 数値として使える値ならそれを、そうでなければ既定値を返す */
  function numberOr(value, fallback) {
    return (typeof value === "number") ? value : fallback;
  }

  function containsFlee(actions) {
    for (var i = 0; i < (actions || []).length; i++) {
      if (actions[i] && actions[i].type === "flee") return true;
    }
    return false;
  }

  /** スカウトを選んだ味方の位置（いなければ -1） */
  function findScoutIndex(actions) {
    for (var i = 0; i < (actions || []).length; i++) {
      if (actions[i] && actions[i].type === "scout") return i;
    }
    return -1;
  }

  NS.BattleSystem = BattleSystem;
})(window.MyGame);
