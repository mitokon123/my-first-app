/**
 * Discovery.js
 * 図鑑の「発見記録」を管理する。
 *
 * 記録するのは4種類。
 *   monstersSeen   … 戦闘で出会ったモンスター
 *   monstersCaught … 捕まえたモンスター
 *   itemsObtained  … 手に入れたことのあるアイテム
 *   skillsLearned  … 仲間が実際に覚えた技
 *
 * ▼ 技だけ「覚えた」を別に記録している理由
 *   技はレベルで覚えるので、種族を捕まえただけでは分からない。
 *   捕獲だけを条件にしていたころは、Lv1のスライムを1体捕まえた時点で
 *   Lv11で覚える「キュア」まで図鑑に出てしまっていた。
 *   特性は種族そのものが持つものなので、捕獲だけで判明してよい（そちらは今までどおり）。
 *
 *   逃がした・失った個体が覚えていた技も記録には残る。
 *   図鑑は「いま持っているもの」ではなく「これまでに見たもの」の記録なので、
 *   捕獲の記録が消えないのと同じ扱いにしてある。
 *
 * 記録するだけの役目で、図鑑の表示方法や進行には関与しない。
 */
(function (NS) {
  "use strict";

  function Discovery() {
    this.monstersSeen = {};
    this.monstersCaught = {};
    this.itemsObtained = {};
    this.skillsLearned = {};
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

  /** 仲間が技を覚えた。レベルアップで覚えたときと、仲間に加わったときに呼ぶ */
  Discovery.prototype.markSkillLearned = function (skillId) {
    if (skillId) this.skillsLearned[skillId] = true;
  };

  // --- 参照 ---

  Discovery.prototype.isMonsterSeen = function (id) { return !!this.monstersSeen[id]; };
  Discovery.prototype.isMonsterCaught = function (id) { return !!this.monstersCaught[id]; };
  Discovery.prototype.isItemObtained = function (id) { return !!this.itemsObtained[id]; };
  Discovery.prototype.isSkillLearned = function (id) { return !!this.skillsLearned[id]; };

  Discovery.prototype.countMonstersSeen = function () { return countKeys(this.monstersSeen); };
  Discovery.prototype.countMonstersCaught = function () { return countKeys(this.monstersCaught); };
  Discovery.prototype.countItemsObtained = function () { return countKeys(this.itemsObtained); };

  // --- セーブ ---

  Discovery.prototype.toSaveData = function () {
    return {
      monstersSeen: Object.keys(this.monstersSeen),
      monstersCaught: Object.keys(this.monstersCaught),
      itemsObtained: Object.keys(this.itemsObtained),
      skillsLearned: Object.keys(this.skillsLearned)
    };
  };

  Discovery.fromSaveData = function (saved) {
    var discovery = new Discovery();
    if (!saved) return discovery;

    fill(discovery.monstersSeen, saved.monstersSeen);
    fill(discovery.monstersCaught, saved.monstersCaught);
    fill(discovery.itemsObtained, saved.itemsObtained);
    // 古いセーブにはこの記録が無い。
    // Game._recordInitialDiscoveries が、いま連れている仲間の技を拾い直す
    fill(discovery.skillsLearned, saved.skillsLearned);
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
