/**
 * BattleSystem.js
 * ターン制戦闘のロジック。描画は一切行わず、結果を「イベントの配列」で返す。
 * 画面（BattleScene）はそのイベントを読んで表示するだけでよい。
 *
 * ▼ 戦闘の流れ
 *   1. 盤面（味方・敵とも最大 battleFieldSize 体）に出ている全員の行動を決める
 *   2. 味方・敵をまとめて素早さの大きい順に並べ、その順で行動する
 *
 * ▼ 味方の枠（slots）
 *   味方の盤面は「枠」で持つ。開始時に戦える者を先頭から埋め、
 *   以後は**倒れても自動では入れ替わらない**。倒れた枠はそのまま残り、
 *   次のターンに交代コマンドで手動で入れ替える（倒れた枠は交代しか選べない）。
 *   蘇生技を足すときに、勝手に入れ替わっていると戻す相手がいなくなるため。
 *   倒れた枠の交代は、その枠に手番が無いので、だれよりも先に済ませる。
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
    this.slots = [];    // 味方の盤面の枠（倒れた者も残る）
    this.fieldSize = (gameData.config || {}).battleFieldSize || 3;
    this.finished = false;
    this.result = null; // "win" | "lose" | "flee" | その他（外部から終了させた場合）
  }

  /**
   * 戦闘を開始する。
   * @param {object[]} allies 味方（戦える者が先頭から盤面に出る）
   * @param {object[]} enemies 敵
   */
  BattleSystem.prototype.start = function (allies, enemies) {
    this.allies = allies || [];
    this.enemies = enemies || [];
    this.finished = false;
    this.result = null;

    // 枠を埋めるのはこのときだけ。以後は交代（replaceSlot）でしか変わらない
    this.slots = aliveMembers(this.allies, this.fieldSize);
    this._resetFieldMarks();
  };

  /**
   * 戦闘中だけ使う印を、開始時にすべて消してから付け直す。
   *
   * これらは前の戦闘の状態が残ると誤動作するため、必ずここで初期化する。
   *   _removed   … 盤面から取り除かれた（スカウトで仲間になった等）
   *                 消し忘れると、その個体は次の戦闘以降ずっと行動しなくなる
   *   _defending … 防御中
   */
  BattleSystem.prototype._resetFieldMarks = function () {
    var i;
    for (i = 0; i < this.allies.length; i++) {
      this.allies[i]._removed = false;
      this.allies[i]._defending = false;
    }
    for (i = 0; i < this.enemies.length; i++) {
      this.enemies[i]._removed = false;
      this.enemies[i]._defending = false;
    }
  };

  // --- 盤面の参照 ---

  /**
   * 味方の枠。倒れた者もその場に残る。
   * 行動を決める順・画面に並べる順はこれ。
   */
  BattleSystem.prototype.getFieldSlots = function () {
    return this.slots;
  };

  /** 盤面に出ていて、まだ戦える味方（狙える・動ける者） */
  BattleSystem.prototype.getFieldAllies = function () {
    return aliveMembers(this.slots, this.fieldSize);
  };

  /**
   * 枠の中身を入れ替える（交代）。
   * 出ていく者が枠にいない、入る者がもう枠にいる、のどちらかなら何もしない。
   */
  BattleSystem.prototype.replaceSlot = function (outgoing, incoming) {
    var index = this.slots.indexOf(outgoing);
    if (index < 0 || !incoming || this.slots.indexOf(incoming) >= 0) return false;

    this.slots[index] = incoming;
    return true;
  };

  /** 盤面に出ている敵 */
  BattleSystem.prototype.getFieldEnemies = function () {
    return aliveMembers(this.enemies, this.fieldSize);
  };

  BattleSystem.prototype.isOver = function () { return this.finished; };
  BattleSystem.prototype.getResult = function () { return this.result; };

  // --- ターン進行 ---

  /**
   * 味方の枠ごとの行動を受け取り、1ターン分を解決する。
   *
   * @param {object[]} slotActions 枠（getFieldSlots）と同じ並びの行動
   *   { type: "skill", skillId, targetIndex } … 技を使う（targetIndex は盤面の敵の番号）
   *   { type: "item",  itemId, targetIndex, targetSide } … 道具を使う（実際の効果は呼び出し側で適用済み）
   *   { type: "scout", targetIndex }  … スカウト（判定は呼び出し側）
   *   { type: "swap",  incoming }     … 交代（入れ替えは呼び出し側）
   *   { type: "flee" }                … 逃走（1人でも選べば逃走判定を行う）
   *   { type: "skip" }                … 何もしない
   * @returns {object[]} 発生したイベントの配列
   */
  BattleSystem.prototype.takeTurn = function (slotActions) {
    var events = [];
    if (this.finished) return events;

    // 受け取った配列は触らない（済ませた交代を skip に置き換えるため写す）
    var actions = (slotActions || []).slice();

    // 倒れた枠の交代は、だれよりも先に済ませる（倒れた者に手番は無い）
    this._applyFaintedSwaps(actions, events);

    var fieldAllies = this.getFieldAllies();
    var fieldEnemies = this.getFieldEnemies();
    if (fieldAllies.length === 0 || fieldEnemies.length === 0) {
      this._finish(events);
      return events;
    }

    // 防御は前のターンの分を解除してから、このターンの分を設定する
    this._applyDefend(actions, events);

    // 「逃げる」は行動順の前にまとめて判定する
    if (containsFlee(actions)) {
      if (this._tryFlee(events)) return events;
    }

    var order = this._buildTurnOrder(fieldAllies, fieldEnemies, actions);

    for (var i = 0; i < order.length; i++) {
      var step = order[i];
      // 先に倒された者、盤面から取り除かれた者（スカウトされた等）は行動しない
      if (step.actor.isFainted() || step.actor._removed) continue;

      this._performAction(step, events);
      if (this._checkFinish(events)) return events;
    }

    // 状態異常のダメージ（毒）と、残りターンを減らす処理
    this._tickStatuses(events);
    if (this._checkFinish(events)) return events;

    // バフ／デバフの残りターンを1つ減らす（ターンの最後にまとめて）
    this._tickModifiers(events);

    this._checkFinish(events);
    return events;
  };

  /**
   * 倒れている枠が選んだ交代を、行動順より前に済ませる。
   * 済ませた枠の行動は skip に置き換える（入ってきた者はこのターン動かない）。
   */
  BattleSystem.prototype._applyFaintedSwaps = function (actions, events) {
    for (var i = 0; i < this.slots.length; i++) {
      var action = actions[i];
      if (!action || action.type !== "swap") continue;

      var actor = this.slots[i];
      if (!actor.isFainted()) continue;   // 生きている者の交代は素早さ順のまま

      if (this.onNonSkillAction) {
        this.onNonSkillAction({ actor: actor, side: "ally", action: action }, events);
      }
      actions[i] = { type: "skip" };
    }
  };

  /**
   * 盤面に出ている全員の状態異常を1ターン進める。
   * ダメージのあるもの（毒）はここで削り、残りターンが尽きたものは外す。
   */
  BattleSystem.prototype._tickStatuses = function (events) {
    this._tickStatusSide(this.getFieldAllies(), "ally", events);
    this._tickStatusSide(this.getFieldEnemies(), "enemy", events);
  };

  BattleSystem.prototype._tickStatusSide = function (group, side, events) {
    for (var i = 0; i < group.length; i++) {
      var monster = group[i];
      if (!monster.tickStatuses || monster.isFainted()) continue;

      // ダメージのある状態異常（毒）
      var defs = monster.getStatusDefs();
      for (var d = 0; d < defs.length; d++) {
        var damage = this._statusTickDamage(monster, defs[d]);
        if (damage <= 0) continue;

        monster.takeDamage(damage);
        events.push({
          type: "statusDamage", targetSide: side,
          targetName: monster.getName(), target: monster,
          statusId: defs[d].id, statusName: defs[d].name,
          amount: damage, currentHp: monster.currentHp, maxHp: monster.getMaxHp()
        });
        if (monster.isFainted()) {
          events.push({ type: "faint", targetSide: side,
            targetName: monster.getName(), target: monster });
          break;
        }
      }

      // 残りターンを1つ減らし、切れたものを知らせる
      var expired = monster.tickStatuses();
      for (var j = 0; j < expired.length; j++) {
        events.push({
          type: "statusEnd", targetSide: side,
          targetName: monster.getName(), target: monster,
          statusId: expired[j].id, statusName: expired[j].name
        });
      }
    }
  };

  /**
   * 状態異常1つぶんの、ターン終了時ダメージ。
   *
   * 割合ダメージは最大HPが大きい相手ほど効きすぎるので、
   * data/statuses.js の max で上限を掛けてある。
   */
  BattleSystem.prototype._statusTickDamage = function (monster, def) {
    var spec = def.turnDamage;
    if (!spec) return 0;

    var damage = Math.floor(monster.getMaxHp() * (spec.hpRatio || 0));
    if (spec.max !== undefined) damage = Math.min(damage, spec.max);
    damage = Math.max(spec.min === undefined ? 1 : spec.min, damage);

    // leaveAtLeast を書くと、そのぶんは必ず残す（戦闘中の毒は 0＝倒れうる）
    var floor = spec.leaveAtLeast === undefined ? 0 : spec.leaveAtLeast;
    var allowed = Math.max(0, monster.currentHp - floor);
    return Math.min(damage, allowed);
  };

  /**
   * 盤面に出ている全員のバフ／デバフを1ターン進め、切れたものを知らせる。
   *
   * ターンの最後にまとめて行うので、
   * 「3ターン続く」と書いた効果は、かけたターンを含めて3ターン効く。
   */
  BattleSystem.prototype._tickModifiers = function (events) {
    this._tickSide(this.getFieldAllies(), "ally", events);
    this._tickSide(this.getFieldEnemies(), "enemy", events);
  };

  BattleSystem.prototype._tickSide = function (group, side, events) {
    for (var i = 0; i < group.length; i++) {
      var monster = group[i];
      if (!monster.tickModifiers) continue;

      var expired = monster.tickModifiers();
      for (var j = 0; j < expired.length; j++) {
        events.push({
          type: "modifierEnd", targetSide: side,
          targetName: monster.getName(), target: monster,
          skillName: expired[j].name
        });
      }
    }
  };

  /**
   * 戦闘が終わったので、掛かっているバフ／デバフをすべて外す。
   * 持ち帰ってしまうと、次の戦闘に効果が残ってしまう。
   */
  BattleSystem.prototype.clearAllModifiers = function () {
    var everyone = (this.allies || []).concat(this.enemies || []);
    for (var i = 0; i < everyone.length; i++) {
      if (everyone[i].clearModifiers) everyone[i].clearModifiers();
      // 状態異常も一緒に片づける。ただし毒（persists）だけは持ち帰る
      if (everyone[i].clearBattleStatuses) everyone[i].clearBattleStatuses();
    }
  };

  /**
   * 味方・敵の行動をまとめ、素早さの大きい順に並べる。
   * 同じ素早さのときの決め方は data/battle.js の speedTieBreak。
   *
   * ただしスカウトだけは特別で、
   *   ・誘った1体だけが味方から行動する（他の味方は動かない）
   *   ・素早さに関係なく最初に行動する
   * 失敗した場合は、そのあと敵だけが行動する。
   *
   * ★ ここから小技が生まれている（意図して残してある）
   *
   *   他の味方の行動は、この行動順から丸ごと外れる。攻撃も技も道具も出ない。
   *   ところが防御だけは別で、takeTurn が行動順を組む「前」に
   *   _applyDefend で allyActions から直接かけているため、そのまま効く。
   *
   *   つまり 1体目・2体目に防御を選んでから3体目で誘うと、
   *   前の2体が守りを固めた状態のまま誘える。
   *   逆に1体目で誘うと、残り2体は何もできずにターンが終わる。
   *
   *   「誘うのは最後の1体」「その前は防御」と気づいた人が得をする形なので、
   *   このまま残す。防御以外も通したくなったら、ここで
   *   スカウト以外の味方の step も並べるようにすればよい。
   */
  BattleSystem.prototype._buildTurnOrder = function (fieldAllies, fieldEnemies, actions) {
    var i;
    var enemySteps = [];
    var slots = this.slots;

    for (i = 0; i < fieldEnemies.length; i++) {
      enemySteps.push({
        actor: fieldEnemies[i], side: "enemy",
        action: this._chooseEnemyAction(fieldEnemies[i], fieldAllies),
        speed: this._rollSpeed(fieldEnemies[i])
      });
    }

    // スカウトを選んだ味方がいれば、その1体だけが先に行動する
    var scoutIndex = findScoutIndex(actions);
    if (scoutIndex >= 0 && slots[scoutIndex] && !slots[scoutIndex].isFainted()) {
      var scoutStep = {
        actor: slots[scoutIndex], side: "ally",
        action: actions[scoutIndex], speed: Infinity
      };
      return [scoutStep].concat(this._sortBySpeed(enemySteps));
    }

    // 行動は枠ごとに受け取っている。倒れている枠は手番を持たない
    var steps = enemySteps;
    for (i = 0; i < slots.length; i++) {
      if (slots[i].isFainted()) continue;
      var action = (actions && actions[i]) || { type: "skip" };
      steps.push({
        actor: slots[i], side: "ally",
        action: action, speed: this._rollSpeed(slots[i])
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
    var target = this._pickTargetIndex(fieldAllies);
    var fallback = { type: "skill", skillId: this.getNormalAttackId(), targetIndex: target };

    // 決まった順番を持っている相手（主など）は、そのとおりに動く
    if (enemy.actionPattern) return this._patternAction(enemy, target, fallback);

    if (this.random.next() >= this._skillRateFor(enemy)) return fallback;

    var usable = [];
    var skills = enemy.skills || [];
    for (var i = 0; i < skills.length; i++) {
      if (!this._canUseSkill(enemy, skills[i])) continue;
      // すでに効いている強化・弱体は掛け直しても意味がないので選ばない
      // （重ねがけはターン数が建て直されるだけ。手番を捨てることになる）
      if (this._modifierAlreadyOn(enemy, skills[i])) continue;
      // 全員満タンなら回復技は選ばない（手番を捨てることになる）
      if (this._healPointless(enemy, skills[i])) continue;
      usable.push(skills[i]);
    }
    if (usable.length === 0) return fallback;

    var chosen = this.random.pick(usable);
    var skill = this.data.getSkill(chosen);

    // 味方にかける技は、狙う先が自分の側になる。いちばん傷ついた仲間を治す
    if (skill && skill.target === "ally") {
      return { type: "skill", skillId: chosen, targetIndex: this._mostWoundedIndex(enemy) };
    }
    return { type: "skill", skillId: chosen, targetIndex: target };
  };

  /** 自分の側で、最大HPからいちばん減っている仲間の番号 */
  BattleSystem.prototype._mostWoundedIndex = function (actor) {
    var field = (this.enemies.indexOf(actor) >= 0)
      ? this.getFieldEnemies() : this.getFieldAllies();

    var best = 0, worst = Infinity;
    for (var i = 0; i < field.length; i++) {
      var m = field[i];
      if (m.isFainted()) continue;
      var ratio = m.currentHp / m.getMaxHp();
      if (ratio < worst) { worst = ratio; best = i; }
    }
    return best;
  };

  /** 回復技だが、自分の側に減っている仲間が一人もいないか */
  BattleSystem.prototype._healPointless = function (actor, skillId) {
    var skill = this.data.getSkill(skillId);
    if (!skill || !skill.heal || skill.power) return false;

    var field = (this.enemies.indexOf(actor) >= 0)
      ? this.getFieldEnemies() : this.getFieldAllies();

    for (var i = 0; i < field.length; i++) {
      if (!field[i].isFainted() && field[i].currentHp < field[i].getMaxHp()) return false;
    }
    return true;
  };

  /**
   * その相手が技を出す確率。
   *
   * ふつうは data/battle.js の enemyAi.skillRate（全体の既定）を使うが、
   * data/monsters.js の種族に skillRate を書くと、その種族だけ変えられる。
   * 妨害役のように「技を出してこそ意味がある」相手を高くするための仕組み。
   */
  BattleSystem.prototype._skillRateFor = function (enemy) {
    var species = enemy.getSpecies ? enemy.getSpecies() : null;
    if (species && typeof species.skillRate === "number") return species.skillRate;

    var rate = ((this.data.battle || {}).enemyAi || {}).skillRate;
    return (typeof rate === "number") ? rate : 1;
  };

  /**
   * 敵が狙う位置を選ぶ。
   *
   * 重みは data/battle.js の targetWeights（前に置いた仲間ほど狙われる）。
   * 盤面の数が重みの数と違うときは、出ている数だけで割り直すので、
   * 1体でも3体でも同じ書き方で動く。
   * 重みが書かれていなければ、今までどおり均等に選ぶ。
   */
  BattleSystem.prototype._pickTargetIndex = function (fieldAllies) {
    var count = fieldAllies.length;
    if (count <= 1) return 0;

    var weights = (this.data.battle || {}).targetWeights;
    if (!weights || weights.length === 0) {
      return this.random.nextInt(0, count - 1);
    }

    var total = 0;
    var i;
    for (i = 0; i < count; i++) total += numberOr(weights[i], 0);
    if (total <= 0) return this.random.nextInt(0, count - 1);

    var roll = this.random.next() * total;
    for (i = 0; i < count; i++) {
      roll -= numberOr(weights[i], 0);
      if (roll < 0) return i;
    }
    return count - 1;
  };

  /**
   * 決まった順番の次の1つを行動に変える。
   * PPが足りない技に当たったときは通常攻撃に落ちるが、順番そのものは進める
   * （撃てなかった回に足踏みして、ずっと同じ技を狙い続けないように）。
   */
  BattleSystem.prototype._patternAction = function (enemy, target, fallback) {
    var entry = enemy.nextPatternAction();
    if (!entry) return fallback;

    if (entry === "wait") return { type: "wait" };
    if (!this._canUseSkill(enemy, entry)) return fallback;

    return { type: "skill", skillId: entry, targetIndex: target };
  };

  /**
   * その技の効果が、もう自分に掛かっているか。
   * 自分にかける強化・弱体だけを見る（相手にかける技は毎回意味がある）。
   */
  BattleSystem.prototype._modifierAlreadyOn = function (monster, skillId) {
    var skill = this.data.getSkill(skillId);
    if (!skill || !skill.modifier || skill.target !== "self") return false;
    if (!monster.getModifier) return false;

    return !!monster.getModifier(skillId);
  };

  /**
   * 防御を設定し直す。
   * 前のターンの防御はここで解除されるので、効果は「選んだターンの間」だけ続く。
   */
  BattleSystem.prototype._applyDefend = function (actions, events) {
    var i;
    // まず全員の防御を解除する
    for (i = 0; i < this.allies.length; i++) this.allies[i]._defending = false;
    for (i = 0; i < this.enemies.length; i++) this.enemies[i]._defending = false;

    for (i = 0; i < this.slots.length; i++) {
      var action = actions && actions[i];
      if (!action || action.type !== "defend") continue;
      if (this.slots[i].isFainted()) continue;

      this.slots[i]._defending = true;
      events.push({ type: "defend", side: "ally", actorName: this.slots[i].getName() });
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

    // 状態異常で動けないか（麻痺・眠り）。動けなければ、そこで手番が終わる
    if (this._blockedByStatus(step, events)) return;

    // ようすをみる。何もしないが、何もしなかったと分かるようにする
    if (action.type === "wait") {
      events.push({ type: "wait", side: step.side, actorName: step.actor.getName() });
      return;
    }

    // 技以外（道具・スカウトなど）は、BattleSystem は中身を知らない。
    // 呼び出し側が設定した onNonSkillAction に、正しい行動順のタイミングで処理を任せる。
    if (action.type !== "skill") {
      if (this.onNonSkillAction) this.onNonSkillAction(step, events);
      return;
    }

    // 封印。技は使えないが、通常攻撃はできる
    if (this._sealedFrom(step, action, events)) return;

    var skill = this.data.getSkill(action.skillId);

    // 範囲全体の技は、向かい側の盤面にいる全員が対象
    if (skill && skill.target === "allEnemies") {
      var group = (step.side === "ally") ? this.getFieldEnemies() : this.getFieldAllies();
      this._performSkillOnAll(step.actor, group.slice(), action.skillId, step.side, events);
      return;
    }

    // 自分にかける技（バフなど）は相手を選ばない
    var target = (skill && skill.target === "self")
      ? step.actor
      : this._resolveTarget(step, action, skill);
    if (!target) return;

    this._performSkill(step.actor, target, action.skillId, step.side, events);
  };

  /**
   * 状態異常で手番そのものを失うか（麻痺・眠り）。
   *
   * data/statuses.js の blocksTurn を見る。
   *   "always" … 必ず動けない（眠り）
   *   数値      … その確率で動けない（麻痺の0.5）
   *
   * 複数掛かっているときは、上から順に見て**最初に止めたものだけ**を知らせる。
   * 「眠っている」と「しびれて動けない」が同時に並ぶと、何で止まったのか分からないため。
   *
   * @returns {boolean} 止められたか
   */
  BattleSystem.prototype._blockedByStatus = function (step, events) {
    var actor = step.actor;
    var defs = actor.getStatusDefs ? actor.getStatusDefs() : [];

    for (var i = 0; i < defs.length; i++) {
      var block = defs[i].blocksTurn;
      if (block === undefined || block === null) continue;

      var stopped = (block === "always") || (this.random.next() < block);
      if (!stopped) continue;

      events.push({
        type: "statusBlocked", targetSide: step.side,
        targetName: actor.getName(), target: actor,
        statusId: defs[i].id, statusName: defs[i].name
      });
      return true;
    }
    return false;
  };

  /**
   * 封印で、その技が使えないか。
   *
   * ★ 通常攻撃（data/battle.js の normalAttackSkill）は止めない。
   *   「攻撃」はコマンドであって覚えた技ではないので、
   *   これも封じると何もできない相手になってしまう。
   *
   * @returns {boolean} 止められたか
   */
  BattleSystem.prototype._sealedFrom = function (step, action, events) {
    var actor = step.actor;
    var normalId = (this.data.battle || {}).normalAttackSkill;
    if (action.skillId === normalId) return false;

    var defs = actor.getStatusDefs ? actor.getStatusDefs() : [];
    for (var i = 0; i < defs.length; i++) {
      if (!defs[i].blocksSkills) continue;

      events.push({
        type: "statusBlocked", targetSide: step.side,
        targetName: actor.getName(), target: actor,
        statusId: defs[i].id, statusName: defs[i].name
      });
      return true;
    }
    return false;
  };

  /**
   * 命中率に掛かる倍率（盲目）。
   * 属性耐性と同じで、引き算ではなく掛け算にそろえてある。
   */
  BattleSystem.prototype._accuracyMultiplier = function (actor) {
    var defs = actor && actor.getStatusDefs ? actor.getStatusDefs() : [];
    var total = 1;

    for (var i = 0; i < defs.length; i++) {
      if (typeof defs[i].accuracyMul === "number") total *= defs[i].accuracyMul;
    }
    return total;
  };

  /**
   * 殴られて目を覚ますか（眠り）。
   *
   * ダメージを受けたときにだけ呼ぶ。
   * 「起こしてしまうので殴れない」という読み合いを作るための仕掛け。
   */
  BattleSystem.prototype._wakeOnDamage = function (target, events) {
    var defs = target && target.getStatusDefs ? target.getStatusDefs() : [];

    for (var i = 0; i < defs.length; i++) {
      var chance = defs[i].wakeOnDamage;
      if (typeof chance !== "number") continue;
      if (this.random.next() >= chance) continue;

      target.removeStatus(defs[i].id);
      events.push({
        type: "statusEnd", targetName: target.getName(), target: target,
        statusId: defs[i].id, statusName: defs[i].name
      });
    }
  };

  /**
   * 行動時点での対象を決める。
   *
   * 対象は「番号」ではなく「選んだ個体そのもの」で覚えておく（action.target）。
   * 番号だけで覚えると、先に別の相手が倒れて並びがずれたときに
   * 狙っていない相手を攻撃してしまうため。
   * 選んだ相手が既に倒れている場合だけ、生きている別の相手に切り替える。
   */
  BattleSystem.prototype._resolveTarget = function (step, action, skill) {
    var candidates = this._candidatesFor(step.side, skill);
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

  /**
   * その技が狙える相手の一覧。
   *
   * ふつうは向かい側だが、味方にかける技（target: "ally"）だけは
   * 行動した側の盤面から選ぶ。回復役を成り立たせるための分岐。
   */
  BattleSystem.prototype._candidatesFor = function (side, skill) {
    var own = (side === "ally") ? this.getFieldAllies() : this.getFieldEnemies();
    var foe = (side === "ally") ? this.getFieldEnemies() : this.getFieldAllies();
    return (skill && skill.target === "ally") ? own : foe;
  };

  /**
   * HPを回復する技。
   * 回復量は data/skills.js の heal（{ min, max } または { amount }）で決める。
   *
   * ★ 攻撃力では変わらない固定値にしてある。
   *   攻撃力に比例させると、育てるほど回復量まで伸びて手がつけられなくなるため。
   */
  BattleSystem.prototype._applyHeal = function (actor, target, skill, side, events) {
    if (!target || !target.heal || target.isFainted()) return;

    var spec = skill.heal || {};
    var min = (typeof spec.min === "number") ? spec.min
            : ((typeof spec.amount === "number") ? spec.amount : 0);
    var max = (typeof spec.max === "number") ? spec.max : min;
    if (max < min) max = min;

    var amount = (max > min) ? this.random.nextInt(min, max) : min;
    if (amount <= 0) return;

    var before = target.currentHp;
    target.heal(amount);

    var healed = target.currentHp - before;
    if (healed <= 0) {
      // 満タンで効果がなかったことは伝える（手番を捨てたと分かるように）
      events.push({
        type: "healFull", side: side,
        // 治す相手は行動した側にいる。書かないと「敵の」が付いてしまう
        targetSide: side,
        targetName: target.getName(), target: target
      });
      return;
    }

    // イベントの形は道具の回復・吸血とそろえてある（画面側は変更不要）
    events.push({
      type: "heal", side: side,
      targetSide: side,
      targetName: target.getName(),
      healAmount: healed,
      revealTarget: target,
      revealHp: target.currentHp
    });
  };

  /**
   * 状態異常を1つかける。
   *
   * 通るかどうかは「技に書いた確率 × 耐性の倍率」で決まる。
   * 耐性の式は属性耐性とまったく同じ（data/battle.js の resistance）ので、
   * 耐性10で無効、5で半減になる。覚える仕組みを2つにしないため。
   *
   * ★ 即死だけは特別で、次の2つを先に見る。
   *   ・主（ボス）は受け付けない
   *   ・味方が最後の1体のときは効かない（HP1で耐える）
   *   運だけで挑戦が終わるのを防ぐため。罠の leaveAtLeast: 1 と同じ考え方。
   */
  BattleSystem.prototype._applyStatus = function (actor, target, skill, side, events) {
    var spec = skill.status;
    var def = this.data.getStatus ? this.data.getStatus(spec.id) : null;
    if (!def) return;

    var targetSide = (target === actor) ? side : opposite(side);

    // 完全に無効な相手（主の即死耐性など）
    if (target.isImmuneToStatus && target.isImmuneToStatus(spec.id)) {
      events.push({ type: "statusImmune", targetSide: targetSide,
        targetName: target.getName(), target: target, statusId: spec.id, statusName: def.name });
      return;
    }

    var chance = (spec.chance === undefined) ? 1 : spec.chance;
    chance *= this._statusResistMultiplier(target, spec.id);
    if (this.random.next() >= chance) {
      events.push({ type: "statusMiss", targetSide: targetSide,
        targetName: target.getName(), target: target, statusId: spec.id, statusName: def.name });
      return;
    }

    if (def.instantKill) {
      this._applyInstantKill(target, def, targetSide, events);
      return;
    }

    var applied = target.addStatus(spec.id, this.random);
    if (!applied) return;

    events.push({
      type: "status", targetSide: targetSide,
      targetName: target.getName(), target: target,
      statusId: spec.id, statusName: def.name,
      renewed: applied.renewed
    });
  };

  /**
   * 即死を通す。
   *
   * 最後の1体でも守らない。最後の味方に通れば、そこで挑戦が終わる。
   * だからこそ耐性装備を積む意味が生まれる、という設計にしてある。
   */
  BattleSystem.prototype._applyInstantKill = function (target, def, targetSide, events) {
    target.takeDamage(target.currentHp);
    events.push({ type: "status", targetSide: targetSide,
      targetName: target.getName(), target: target,
      statusId: def.id, statusName: def.name, renewed: false });
    // statusId は「何で倒れたか」。即死の音が倒れる音を兼ねるので、画面側はこれを見て faint の音を省く
    events.push({ type: "faint", targetSide: targetSide,
      targetName: target.getName(), target: target, statusId: def.id });
  };

  /**
   * 状態異常の通りやすさ。属性耐性と同じ式を使う。
   *   耐性が0以上   … 倍率 = 1 - 耐性 × resistStep
   *   耐性がマイナス … 倍率 = 1 + |耐性| × weaknessStep
   */
  BattleSystem.prototype._statusResistMultiplier = function (target, statusId) {
    if (!target.getStatusResist) return 1;

    var config = (this.data.battle || {}).resistance || {};
    var resist = target.getStatusResist(statusId);
    if (resist >= (config.immuneAt || 10)) return 0;

    var step = (resist >= 0)
      ? 1 - resist * (config.resistStep || 0.1)
      : 1 + Math.abs(resist) * (config.weaknessStep || 0.2);

    return Math.max(config.minMultiplier || 0, step);
  };

  /**
   * バフ／デバフを1つかける。
   * 効果の中身は data/skills.js の modifier に書いてあり、
   * 書き方は特性・装備・加護と同じなので、ここは渡すだけでよい。
   */
  BattleSystem.prototype._applyModifier = function (actor, target, skill, side, events) {
    if (!target.addModifier) return;

    var applied = target.addModifier(skill);
    if (!applied) return;

    events.push({
      type: "modifier", side: side,
      // 自分にかける技では対象が行動した側と同じになるので、対象の側も渡す
      targetSide: (target === actor) ? side : opposite(side),
      targetName: target.getName(), target: target,
      skillId: skill.id, skillName: skill.name,
      // 画面が印を出すのに使う（実際の効果より遅れて出すので、中身も渡しておく）
      effects: skill.modifier.effects || [],
      message: skill.modifier.message || null,
      // 同じものが既に掛かっていた場合は「かけ直した」と分かるようにする
      renewed: applied.renewed,
      // 上がったのか下がったのかは、画面側が印の色を決めるのに使う
      raised: isRaising(skill.modifier)
    });
  };

  function opposite(side) { return (side === "ally") ? "enemy" : "ally"; }

  /**
   * その効果が「強くする」ものか。
   * ステータスの倍率が1より大きい、または受けるダメージが1より小さければ強化とみなす。
   */
  function isRaising(spec) {
    var effects = (spec && spec.effects) || [];
    for (var i = 0; i < effects.length; i++) {
      var e = effects[i];
      if (e.type === "statMultiplier" && e.value > 1) return true;
      if (e.type === "statBonus" && e.value > 0) return true;
      if (e.type === "damageDealt" && e.value > 1) return true;
      if (e.type === "damageTaken" && e.value < 1) return true;
    }
    return false;
  }

  /** 技を使用し、PPの支払い・命中判定・ダメージ適用を行う（単体） */
  BattleSystem.prototype._performSkill = function (actor, target, skillId, side, events) {
    var skill = this._prepareSkill(actor, skillId, side, events);
    if (!skill) return;

    this._resolveHit(actor, target, skill, side, events);
  };

  /**
   * 範囲全体の技。
   * 「〜の○○!」の宣言とPPの支払いは1回だけ行い、
   * 命中判定とダメージは相手ごとに出す（1体ずつ避けたり耐えたりできる）。
   */
  BattleSystem.prototype._performSkillOnAll = function (actor, targets, skillId, side, events) {
    var skill = this._prepareSkill(actor, skillId, side, events);
    if (!skill) return;

    // PPが足りずに通常攻撃へ切り替わった場合は、範囲技ではないので1体だけ
    if (skill.target !== "allEnemies") {
      if (targets[0]) this._resolveHit(actor, targets[0], skill, side, events);
      return;
    }

    for (var i = 0; i < targets.length; i++) {
      // この技で先に倒れた相手は飛ばす
      if (targets[i].isFainted() || targets[i]._removed) continue;
      this._resolveHit(actor, targets[i], skill, side, events);
    }
  };

  /**
   * 技を出せる形にととのえる（PPの支払いと宣言まで）。
   * 出せなければ null を返す。
   */
  BattleSystem.prototype._prepareSkill = function (actor, skillId, side, events) {
    var skill = this.data.getSkill(skillId);
    if (!skill) {
      events.push({ type: "noSkill", side: side, actorName: actor.getName() });
      return null;
    }

    // PPが足りない技は出せないので、通常攻撃に切り替える
    if (!this._canUseSkill(actor, skillId)) {
      skill = this.data.getSkill(this.getNormalAttackId());
      if (!skill) {
        events.push({ type: "noSkill", side: side, actorName: actor.getName() });
        return null;
      }
    }

    // PPを支払う（通常攻撃は0なので減らない）
    if (skill.pp && actor.payPp) actor.payPp(skill.pp);

    events.push({
      type: "useSkill", side: side,
      actorName: actor.getName(), skillName: skill.name,
      // 画面側が踏み込みの動きや技の演出を付けられるよう、
      // 行動した本人と使った技も渡す（damage で target を渡しているのと同じ理由）
      actor: actor, skill: skill
    });
    return skill;
  };

  /** 相手1体ぶんの命中判定・効果・ダメージ */
  BattleSystem.prototype._resolveHit = function (actor, target, skill, side, events) {
    var battle = this.data.battle || {};
    var accuracy = (skill.accuracy === undefined)
      ? (battle.defaultAccuracy === undefined ? 1 : battle.defaultAccuracy)
      : skill.accuracy;

    // 盲目などで命中率が下がる。
    // このあとに回避判定がもう一度あることに注意（当たりにくさは2段構え）
    accuracy *= this._accuracyMultiplier(actor);

    if (this.random.next() >= accuracy) {
      events.push({ type: "miss", side: side, targetName: target.getName(), target: target });
      return;
    }

    // 相手がかわす。命中判定を抜けたあとの、受け手側の最後の関門。
    // 自分にかける技と、evadable: false と書いた技はかわせない
    if (this._isEvaded(actor, target, skill)) {
      events.push({ type: "miss", side: side, targetName: target.getName(), target: target });
      return;
    }

    // HPを回復する技。威力を持たない技はここで終わり
    if (skill.heal) {
      this._applyHeal(actor, target, skill, side, events);
      if (!skill.power) return;
    }

    // バフ／デバフをかける技。威力を持たない技はここで終わり
    if (skill.modifier) {
      this._applyModifier(actor, target, skill, side, events);
      if (!skill.power) return;
    }

    // 状態異常をかける技。ダメージも持つ技（毒の牙など）は、このあとダメージへ進む
    if (skill.status) {
      this._applyStatus(actor, target, skill, side, events);
      // 即死が通った相手には、そのあとダメージを与えない
      if (target.isFainted()) return;
      if (!skill.power) return;
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

    // 与えたダメージの一部を自分のHPに変える（吸血など）。
    // 倒しきった相手からも吸えるので、faint より先に処理する
    this._applyDrain(actor, skill, result.damage, side, events);

    if (target.isFainted()) {
      events.push({ type: "faint", side: side, targetName: target.getName(), target: target });
      return;
    }

    // 殴られて目を覚ます（眠り）。倒れた相手には意味がないので、そのあとに置く
    this._wakeOnDamage(target, events);
  };

  /**
   * 与えたダメージの一部を、行動した本人のHPに戻す。
   * 割合は data/skills.js の drain（0〜1）。書いていない技では何も起きない。
   *
   * イベントの形は「道具で回復したとき」と同じ（healAmount / revealTarget / revealHp）に
   * そろえてあるので、画面側の再生処理は変更しなくてよい。
   */
  BattleSystem.prototype._applyDrain = function (actor, skill, damage, side, events) {
    if (!skill.drain || damage <= 0) return;
    if (!actor || !actor.heal || actor.isFainted()) return;

    // 1未満に切り捨てられて「吸ったのに0」にならないよう、最低1は戻す
    var amount = Math.max(1, Math.floor(damage * skill.drain));
    var before = actor.currentHp;
    actor.heal(amount);

    var healed = actor.currentHp - before;
    if (healed <= 0) return;   // 満タンなら何も起きない（文も出さない）

    events.push({
      type: "drain", side: side,
      // 吸うのは行動した本人。書かないと「敵の」が付いてしまう
      targetSide: side,
      targetName: actor.getName(),
      healAmount: healed,
      revealTarget: actor,
      revealHp: actor.currentHp
    });
  };

  /**
   * ダメージを計算する。式・数値は data/battle.js。
   *
   *   技      基礎 = 攻撃力×skill.attackFactor + 技威力×skill.powerFactor - 防御力×defenseFactor
   *   通常攻撃 基礎 = 攻撃力×normal.attackFactor                          - 防御力×defenseFactor
   *   ダメージ = floor( max(0, 基礎) × 属性倍率 × 会心倍率 × 防御 × 特性装備 × 乱数 )
   *
   * 「通常攻撃」は normalAttackSkill の技だけ。体当たりなどの無属性技は技の式。
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

    var isNormal = (skill.id === this.getNormalAttackId());
    var factors = (isNormal ? config.normal : config.skill) || {};
    var attackFactor = numberOr(factors.attackFactor, 1);
    var powerFactor = numberOr(factors.powerFactor, 1);
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

  /**
   * 相手がかわしたか。
   *
   * 命中率（技の側の当たりやすさ）とは別に、受け手が持つ「よけやすさ」。
   * ほとんどのモンスターは0なので、素早い相手だけがときどきかわす。
   *
   * 自分や味方にかける技はかわしようがなく、
   * data/skills.js に evadable: false と書いた技もかわせない。
   */
  BattleSystem.prototype._isEvaded = function (actor, target, skill) {
    if (target === actor) return false;
    // 味方にかける技（回復など）を、素早い仲間がよけてしまわないように
    if (skill.target === "ally") return false;
    if (skill.evadable === false) return false;
    if (!target.getEvasion) return false;

    var evasion = target.getEvasion();
    if (evasion <= 0) return false;

    return this.random.next() < evasion;
  };

  /** 会心が出たか。確率は 共通値 + 技の criticalBonus */
  BattleSystem.prototype._rollCritical = function (skill) {
    // 会心を出さない技（範囲全体の技など）
    if (skill.canCritical === false) return false;

    var config = (this.data.battle || {}).critical || {};
    var rate = numberOr(config.baseRate, 0) + numberOr(skill.criticalBonus, 0);
    return this.random.next() < rate;
  };

  /**
   * 属性倍率を返す。
   *   耐性が0以上   … 倍率 = 1 - 耐性 × resistStep
   *   耐性がマイナス … 倍率 = 1 + |耐性| × weaknessStep
   * 弱点側のほうが1あたりの動きを大きくしてあるので、
   * 「苦手な相手にはよく通る」がはっきり出る。
   *
   * 無属性（physical）は耐性の影響を受けないので常に 1。
   */
  BattleSystem.prototype._elementMultiplier = function (defender, elementId) {
    if (this._isNonElemental(elementId)) return 1;
    if (!defender.getResistance) return 1;

    var config = (this.data.battle || {}).resistance || {};
    var minMultiplier = numberOr(config.minMultiplier, 0);
    var resistance = defender.getResistance(elementId) || 0;

    if (resistance < 0) {
      return 1 + (-resistance) * numberOr(config.weaknessStep, 0);
    }
    return Math.max(minMultiplier, 1 - resistance * numberOr(config.resistStep, 0));
  };

  /**
   * その属性が完全に効かないか。
   * immunities に書かれている場合と、耐性が immuneAt 以上の場合の両方。
   * （耐性を上げきることが「無効」に行き着くようにしてある）
   */
  BattleSystem.prototype._isImmune = function (defender, elementId) {
    if (this._isNonElemental(elementId)) return false;
    if (defender.isImmuneTo && defender.isImmuneTo(elementId)) return true;

    var immuneAt = (this.data.battle || {}).resistance || {};
    if (immuneAt.immuneAt === undefined || !defender.getResistance) return false;

    return (defender.getResistance(elementId) || 0) >= immuneAt.immuneAt;
  };

  /** 耐性計算の対象外（無属性）か */
  BattleSystem.prototype._isNonElemental = function (elementId) {
    var element = (this.data.elements || {})[elementId];
    return !element || !!element.physical;
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
    // 掛かっている強化・弱体は持ち帰らせない
    this.clearAllModifiers();
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
    // 掛かっている強化・弱体は持ち帰らせない
    this.clearAllModifiers();
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
          fromLevel: before, toLevel: ally.level,
          // 画面側が喜ぶ動きを付けられるよう、本人も渡す
          actor: ally
        });
        for (var k = 0; k < gained.learned.length; k++) {
          var skill = this.data.getSkill(gained.learned[k]);
          events.push({
            type: "skillLearned", actorName: ally.getName(),
            // 図鑑に「覚えた」と記録するのは画面側なので、idも渡す
            // （BattleSystem は Game を知らないまま済ませたい）
            skillId: gained.learned[k],
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
