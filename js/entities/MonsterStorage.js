/**
 * MonsterStorage.js
 * 拠点の預かり所。パーティに入りきらない仲間を預けておく場所。
 *
 * Party と同じ形の入れ物だが、こちらは並び順に意味がない（戦闘に出ないため）。
 * 上限は data/config.js の storageMax。
 */
(function (NS) {
  "use strict";

  /**
   * @param {number} maxSize 預けられる数の上限
   */
  function MonsterStorage(maxSize) {
    this.members = [];
    this.maxSize = maxSize;
  }

  // --- 参照 ---

  MonsterStorage.prototype.getMembers = function () { return this.members; };
  MonsterStorage.prototype.get = function (index) { return this.members[index] || null; };
  MonsterStorage.prototype.size = function () { return this.members.length; };
  MonsterStorage.prototype.isEmpty = function () { return this.members.length === 0; };

  MonsterStorage.prototype.isFull = function () {
    if (this.maxSize === undefined || this.maxSize === null) return false;
    return this.members.length >= this.maxSize;
  };

  // --- 変更 ---

  /**
   * 預ける。
   * @returns {boolean} 預けられたか（いっぱいなら false）
   */
  MonsterStorage.prototype.add = function (monster) {
    if (!monster || this.isFull()) return false;
    this.members.push(monster);
    return true;
  };

  /**
   * 引き取る。
   * @returns {object|null} 取り出した個体
   */
  MonsterStorage.prototype.remove = function (index) {
    if (index < 0 || index >= this.members.length) return null;
    return this.members.splice(index, 1)[0];
  };


  // --- セーブ・ロード ---

  MonsterStorage.prototype.toSaveData = function () {
    var members = [];
    for (var i = 0; i < this.members.length; i++) {
      members.push(this.members[i].toSaveData());
    }
    return { members: members };
  };

  /** 復元できなかった個体（種族が消えた等）は読み飛ばす */
  MonsterStorage.fromSaveData = function (saved, gameData, maxSize) {
    var storage = new MonsterStorage(maxSize);
    var members = (saved && saved.members) || [];

    for (var i = 0; i < members.length; i++) {
      var monster = NS.MonsterInstance.fromSaveData(members[i], gameData);
      if (monster) storage.add(monster);
    }
    return storage;
  };

  NS.MonsterStorage = MonsterStorage;
})(window.MyGame);
