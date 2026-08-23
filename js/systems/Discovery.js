/**
 * Discovery.js
 * 図鑑の「発見記録」を管理する。
 *
 * 記録するのは3種類。
 *   monstersSeen   … 戦闘で出会ったモンスター
 *   monstersCaught … 捕まえたモンスター
 *   itemsObtained  … 手に入れたことのあるアイテム
 *
 * 記録するだけの役目で、図鑑の表示方法や進行には関与しない。
 */
(function (NS) {
  "use strict";

  function Discovery() {
    this.monstersSeen = {};
    this.monstersCaught = {};
    this.itemsObtained = {};
  }

  // --- 記録 ---

  Discovery.prototype.markMonsterSeen = function (speciesId) {
    if (speciesId) this.monstersSeen[speciesId] = true;
  };

  /** 捕獲は「見た」ことも同時に満たす */
  Discovery.prototype.markMonsterCaught = function (speciesId) {
    if (!speciesId) return;
    this.monstersSeen[speciesId] = true;
    this.monstersCaught[speciesId] = true;
  };

  Discovery.prototype.markItemObtained = function (itemId) {
    if (itemId) this.itemsObtained[itemId] = true;
  };

  // --- 参照 ---

  Discovery.prototype.isMonsterSeen = function (id) { return !!this.monstersSeen[id]; };
  Discovery.prototype.isMonsterCaught = function (id) { return !!this.monstersCaught[id]; };
  Discovery.prototype.isItemObtained = function (id) { return !!this.itemsObtained[id]; };

  Discovery.prototype.countMonstersSeen = function () { return countKeys(this.monstersSeen); };
  Discovery.prototype.countMonstersCaught = function () { return countKeys(this.monstersCaught); };
  Discovery.prototype.countItemsObtained = function () { return countKeys(this.itemsObtained); };

  // --- セーブ ---

  Discovery.prototype.toSaveData = function () {
    return {
      monstersSeen: Object.keys(this.monstersSeen),
      monstersCaught: Object.keys(this.monstersCaught),
      itemsObtained: Object.keys(this.itemsObtained)
    };
  };

  Discovery.fromSaveData = function (saved) {
    var discovery = new Discovery();
    if (!saved) return discovery;

    fill(discovery.monstersSeen, saved.monstersSeen);
    fill(discovery.monstersCaught, saved.monstersCaught);
    fill(discovery.itemsObtained, saved.itemsObtained);
    return discovery;
  };

  function fill(target, list) {
    for (var i = 0; i < (list || []).length; i++) target[list[i]] = true;
  }

  function countKeys(obj) {
    return Object.keys(obj).length;
  }

  NS.Discovery = Discovery;
})(window.MyGame);
