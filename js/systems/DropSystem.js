/**
 * DropSystem.js
 * 倒したモンスターが落とすアイテムを判定する。
 *
 * ▼ 戦闘や持ち物には依存しない
 * 「どのモンスターが何を落としたか」を計算して返すだけで、
 * 実際に持ち物へ入れる処理は呼び出し側が行う。
 * 宝箱や採取など、別の入手経路にも同じ判定を使える。
 *
 * ▼ 確率・個数はすべて data/monsters.js の drops が持つ。
 *   drops の各エントリは独立して判定するので、
 *   1体から複数種類のアイテムが同時に落ちることもある。
 */
(function (NS) {
  "use strict";

  /**
   * @param {MyGame.GameData} gameData
   * @param {MyGame.Random} random
   */
  function DropSystem(gameData, random) {
    this.data = gameData;
    this.random = random;
  }

  /**
   * モンスター1体分のドロップを判定する。
   * @param {object} monster MonsterInstance互換（getSpecies を持つ）
   * @returns {Array<{itemId:string, count:number}>}
   */
  DropSystem.prototype.rollFor = function (monster) {
    var species = (monster && monster.getSpecies) ? monster.getSpecies() : null;
    var drops = (species && species.drops) || [];
    var result = [];

    for (var i = 0; i < drops.length; i++) {
      var entry = drops[i];
      if (this.random.next() >= (entry.rate || 0)) continue;

      var min = entry.min === undefined ? 1 : entry.min;
      var max = entry.max === undefined ? min : entry.max;
      var count = this.random.nextInt(min, max);
      if (count > 0) result.push({ itemId: entry.item, count: count });
    }
    return result;
  };

  /**
   * 複数体分をまとめて判定し、同じアイテムは1つにまとめる。
   * @param {object[]} monsters
   * @returns {Array<{itemId:string, count:number}>}
   */
  DropSystem.prototype.rollForGroup = function (monsters) {
    var totals = {};
    var order = [];

    for (var i = 0; i < (monsters || []).length; i++) {
      var drops = this.rollFor(monsters[i]);
      for (var j = 0; j < drops.length; j++) {
        var id = drops[j].itemId;
        if (totals[id] === undefined) {
          totals[id] = 0;
          order.push(id);
        }
        totals[id] += drops[j].count;
      }
    }

    var result = [];
    for (var k = 0; k < order.length; k++) {
      result.push({ itemId: order[k], count: totals[order[k]] });
    }
    return result;
  };

  NS.DropSystem = DropSystem;
})(window.MyGame);
