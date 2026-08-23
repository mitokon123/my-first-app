/**
 * AbilitySystem.js
 * アビリティ（特性）の効果を集計する。
 *
 * ▼ 役割
 * 「このモンスターのアビリティを全部見て、合計でどれだけ倍率が掛かるか」を答えるだけ。
 * ステータスの計算そのものや戦闘の進行には関与しない。
 *
 * ▼ 効果の種類を増やすには
 * data/abilities.js に新しい type を書き、ここに対応する集計メソッドを足す。
 * 同じ種類の効果が複数あれば、倍率はすべて掛け合わせる。
 *
 * ▼ 相手に必要なインターフェース
 *   getSpecies() : 種族データ（abilities に特性idの配列を持つ）
 *   getMaxHp() / currentHp : 条件判定に使う
 */
(function (NS) {
  "use strict";

  /**
   * @param {MyGame.GameData} gameData
   */
  function AbilitySystem(gameData) {
    this.data = gameData;
  }

  /**
   * そのモンスターが持つアビリティの定義を並べて返す。
   *
   * 1体が持てる数は data/config.js の abilityMax まで（現在は1つ）。
   * データに多く書かれていても、先頭から数えてこの数までしか効かない。
   *
   * @param {object} monster
   * @returns {object[]}
   */
  AbilitySystem.prototype.getAbilities = function (monster) {
    var species = (monster && monster.getSpecies) ? monster.getSpecies() : null;
    return this.resolveAbilities(species);
  };

  /**
   * 種族データから、実際に効く特性の定義を並べて返す。
   * 図鑑など、個体が無い場面でも使えるようにしてある。
   * @param {object} species 種族データ
   */
  AbilitySystem.prototype.resolveAbilities = function (species) {
    var ids = (species && species.abilities) || [];
    var limit = (this.data.config || {}).abilityMax;
    if (typeof limit !== "number") limit = ids.length;

    var result = [];
    for (var i = 0; i < ids.length && result.length < limit; i++) {
      var ability = (this.data.abilities || {})[ids[i]];
      if (ability) result.push(ability);
    }
    return result;
  };

  /**
   * ステータスに掛かる倍率の合計。
   * @param {object} monster
   * @param {string} stat "hp" / "attack" / "defense" / "speed" / "pp"
   * @returns {number} 倍率（何も無ければ 1）
   */
  AbilitySystem.prototype.getStatMultiplier = function (monster, stat) {
    var self = this;
    return this._collect(monster, function (effect) {
      if (effect.type !== "statMultiplier") return null;
      if (effect.stat !== stat) return null;
      if (!self._matchCondition(monster, effect.condition)) return null;
      return effect.value;
    });
  };

  /**
   * 自分が与えるダメージに掛かる倍率の合計。
   * @param {object} monster
   * @param {string} elementId 使う技の属性
   */
  AbilitySystem.prototype.getDamageDealtMultiplier = function (monster, elementId) {
    var self = this;
    return this._collect(monster, function (effect) {
      if (effect.type !== "damageDealt") return null;
      if (effect.element && effect.element !== elementId) return null;
      if (!self._matchCondition(monster, effect.condition)) return null;
      return effect.value;
    });
  };

  /**
   * 自分が受けるダメージに掛かる倍率の合計。
   * @param {object} monster
   * @param {string} elementId 受ける技の属性
   */
  AbilitySystem.prototype.getDamageTakenMultiplier = function (monster, elementId) {
    var self = this;
    return this._collect(monster, function (effect) {
      if (effect.type !== "damageTaken") return null;
      if (effect.element && effect.element !== elementId) return null;
      if (!self._matchCondition(monster, effect.condition)) return null;
      return effect.value;
    });
  };

  /**
   * 条件を満たしているか。condition が無ければ常に true。
   */
  AbilitySystem.prototype._matchCondition = function (monster, condition) {
    if (!condition) return true;

    var maxHp = monster.getMaxHp ? monster.getMaxHp() : 0;
    var ratio = maxHp > 0 ? (monster.currentHp / maxHp) : 0;

    if (condition.hpBelow !== undefined && ratio > condition.hpBelow) return false;
    if (condition.hpAbove !== undefined && ratio < condition.hpAbove) return false;
    return true;
  };

  /**
   * 全アビリティの全効果を見て、当てはまる倍率を掛け合わせる。
   * @param {function} pick 効果を受け取り、倍率か null を返す
   */
  AbilitySystem.prototype._collect = function (monster, pick) {
    var abilities = this.getAbilities(monster);
    var total = 1;

    for (var i = 0; i < abilities.length; i++) {
      var effects = abilities[i].effects || [];
      for (var j = 0; j < effects.length; j++) {
        var value = pick(effects[j]);
        if (typeof value === "number") total *= value;
      }
    }
    return total;
  };

  NS.AbilitySystem = AbilitySystem;
})(window.MyGame);
