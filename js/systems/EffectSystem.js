/**
 * EffectSystem.js
 * モンスターに掛かっている効果を、すべての出どころからまとめて集計する。
 *
 * ▼ 出どころ
 *   特性（アビリティ）… 種族が持つもの。AbilitySystem が「どれが効くか」を決める
 *   装備             … 個体が身につけているもの（data/items.js の equip）
 *   加護（ラン限定）  … 階を降りるたびに選んだもの。個体の runEffects に入っている
 *
 * 出どころが増えても collectEffects に1つ足すだけでよく、
 * ステータス計算も戦闘のダメージ計算も変更しなくてよい。
 *
 * ▼ 効果の書き方は出どころによらず共通（data/abilities.js の説明を参照）
 *   { type:"statMultiplier", stat:"attack", value:1.2 }
 *   { type:"statBonus",      stat:"defense", value:3 }
 *   { type:"damageDealt",    value:1.25, element:"fire" }
 *   { type:"damageTaken",    value:0.9 }
 *
 * ▼ 倍率と加算の違い
 *   statMultiplier は掛け算、statBonus は足し算。
 *   ステータスは floor(基礎 × 倍率) のあとに加算する（個体値と同じ扱い）。
 */
(function (NS) {
  "use strict";

  /**
   * @param {MyGame.GameData} gameData
   */
  function EffectSystem(gameData) {
    this.data = gameData;
    this.abilitySystem = NS.AbilitySystem ? new NS.AbilitySystem(gameData) : null;
  }

  /**
   * そのモンスターに掛かっている効果をすべて並べて返す。
   * @param {object} monster
   * @returns {object[]}
   */
  EffectSystem.prototype.collectEffects = function (monster) {
    if (!monster) return [];
    var effects = [];
    var i;

    // 特性
    var abilities = this.abilitySystem ? this.abilitySystem.getAbilities(monster) : [];
    for (i = 0; i < abilities.length; i++) {
      effects = effects.concat(abilities[i].effects || []);
    }

    // 装備
    var equipments = this.getEquipments(monster);
    for (i = 0; i < equipments.length; i++) {
      effects = effects.concat((equipments[i].equip || {}).effects || []);
    }

    // 加護（そのラン限り）。拠点へ戻ると Game が消す
    if (monster.runEffects && monster.runEffects.length > 0) {
      effects = effects.concat(monster.runEffects);
    }

    return effects;
  };

  /**
   * 身につけている装備の定義を並べて返す。
   * 1体が着けられる数は data/config.js の equipMax まで。
   * @param {object} monster
   * @returns {object[]} data/items.js のエントリ
   */
  EffectSystem.prototype.getEquipments = function (monster) {
    var ids = (monster && monster.equipment) || [];
    if (typeof ids === "string") ids = [ids];   // 1つだけ持たせた場合も扱えるように

    var limit = (this.data.config || {}).equipMax;
    if (typeof limit !== "number") limit = ids.length;

    var result = [];
    for (var i = 0; i < ids.length && result.length < limit; i++) {
      var item = this.data.getItem(ids[i]);
      if (item && item.equip) result.push(item);
    }
    return result;
  };

  // --- 集計 ---

  /**
   * ステータスに掛かる倍率（何も無ければ 1）。
   * @param {string} stat "hp" / "attack" / "defense" / "speed" / "pp"
   */
  EffectSystem.prototype.getStatMultiplier = function (monster, stat) {
    var self = this;
    return this._multiply(monster, function (effect) {
      if (effect.type !== "statMultiplier" || effect.stat !== stat) return null;
      if (!self._matchCondition(monster, effect.condition)) return null;
      return effect.value;
    });
  };

  /** ステータスへの加算（何も無ければ 0） */
  EffectSystem.prototype.getStatBonus = function (monster, stat) {
    var self = this;
    return this._sum(monster, function (effect) {
      if (effect.type !== "statBonus" || effect.stat !== stat) return null;
      if (!self._matchCondition(monster, effect.condition)) return null;
      return effect.value;
    });
  };

  /** 自分が与えるダメージに掛かる倍率 */
  EffectSystem.prototype.getDamageDealtMultiplier = function (monster, elementId) {
    var self = this;
    return this._multiply(monster, function (effect) {
      if (effect.type !== "damageDealt") return null;
      if (effect.element && effect.element !== elementId) return null;
      if (!self._matchCondition(monster, effect.condition)) return null;
      return effect.value;
    });
  };

  /** 自分が受けるダメージに掛かる倍率 */
  EffectSystem.prototype.getDamageTakenMultiplier = function (monster, elementId) {
    var self = this;
    return this._multiply(monster, function (effect) {
      if (effect.type !== "damageTaken") return null;
      if (effect.element && effect.element !== elementId) return null;
      if (!self._matchCondition(monster, effect.condition)) return null;
      return effect.value;
    });
  };

  /** 条件を満たしているか。condition が無ければ常に true */
  EffectSystem.prototype._matchCondition = function (monster, condition) {
    if (!condition) return true;

    var maxHp = monster.getMaxHp ? monster.getMaxHp() : 0;
    var ratio = maxHp > 0 ? (monster.currentHp / maxHp) : 0;

    if (condition.hpBelow !== undefined && ratio > condition.hpBelow) return false;
    if (condition.hpAbove !== undefined && ratio < condition.hpAbove) return false;
    return true;
  };

  /** 当てはまる効果の値をすべて掛け合わせる */
  EffectSystem.prototype._multiply = function (monster, pick) {
    var effects = this.collectEffects(monster);
    var total = 1;

    for (var i = 0; i < effects.length; i++) {
      var value = pick(effects[i]);
      if (typeof value === "number") total *= value;
    }
    return total;
  };

  /** 当てはまる効果の値をすべて足し合わせる */
  EffectSystem.prototype._sum = function (monster, pick) {
    var effects = this.collectEffects(monster);
    var total = 0;

    for (var i = 0; i < effects.length; i++) {
      var value = pick(effects[i]);
      if (typeof value === "number") total += value;
    }
    return total;
  };

  /**
   * 効果1つを日本語の1行にする（画面に出すため）。
   *
   * 装備・加護・特性のどこから来た効果でも同じ書き方になるよう、
   * 文章の組み立てはここ1か所にまとめてある。
   *
   * @param {object} effect 効果1件
   * @param {MyGame.GameData} gameData 属性名やラベルを引くために使う
   * @returns {string} 表せない種類なら空文字
   */
  EffectSystem.describeEffect = function (effect, gameData) {
    if (!effect) return "";

    var party = ((gameData.messages || {}).party) || {};
    var labels = {
      hp: "HP", pp: "PP",
      attack: party.attackLabel || "攻撃",
      defense: party.defenseLabel || "防御",
      speed: party.speedLabel || "素早さ"
    };
    var stat = labels[effect.stat] || effect.stat;
    var text = "";

    if (effect.type === "statBonus") {
      text = stat + " " + (effect.value >= 0 ? "+" : "") + effect.value;
    } else if (effect.type === "statMultiplier") {
      text = stat + " ×" + effect.value;
    } else if (effect.type === "damageDealt" || effect.type === "damageTaken") {
      var element = (gameData.elements || {})[effect.element];
      var name = element ? element.name : (party.allElements || "全");
      var kind = (effect.type === "damageDealt") ? "の与ダメージ" : "の被ダメージ";
      text = name + kind + " ×" + effect.value;
    }

    if (text && effect.condition) text += describeCondition(effect.condition);
    return text;
  };

  /** 条件つきの効果に「（HP25%以下のとき）」のようなただし書きを足す */
  function describeCondition(condition) {
    if (condition.hpBelow !== undefined) {
      return "（HP" + Math.round(condition.hpBelow * 100) + "%以下のとき）";
    }
    if (condition.hpAbove !== undefined) {
      return "（HP" + Math.round(condition.hpAbove * 100) + "%以上のとき）";
    }
    return "";
  }

  NS.EffectSystem = EffectSystem;
})(window.MyGame);
