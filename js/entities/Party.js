/**
 * Party.js
 * プレイヤーの手持ちモンスターを管理する。
 *
 * 並び順に意味があり、先頭に近いものから戦闘に出る。
 * 上限（partyMax）は data/config.js で管理する。
 *
 * ▼ 中身の配列は getMembers() で取得できる。
 * BattleSystem など「モンスターの配列」を受け取る側へは、この配列をそのまま渡す。
 * （配列の実体を共有するので、戦闘中のHP変化などがそのまま手持ちへ反映される）
 */
(function (NS) {
  "use strict";

  /**
   * @param {number} maxSize 手持ちの上限
   */
  function Party(maxSize) {
    this.members = [];
    this.maxSize = maxSize;
  }

  // --- 参照 ---

  Party.prototype.getMembers = function () { return this.members; };
  Party.prototype.get = function (index) { return this.members[index] || null; };
  Party.prototype.size = function () { return this.members.length; };
  Party.prototype.isEmpty = function () { return this.members.length === 0; };

  Party.prototype.isFull = function () {
    if (this.maxSize === undefined || this.maxSize === null) return false;
    return this.members.length >= this.maxSize;
  };

  // --- 変更 ---

  /**
   * 仲間を加える。上限に達している場合は加えず false を返す。
   * @returns {boolean} 加えられたか
   */
  Party.prototype.add = function (monster) {
    if (!monster || this.isFull()) return false;
    this.members.push(monster);
    return true;
  };

  /**
   * 指定位置の仲間を外す。
   * @returns {object|null} 外した個体
   */
  Party.prototype.remove = function (index) {
    if (index < 0 || index >= this.members.length) return null;
    return this.members.splice(index, 1)[0];
  };

  /** 2体の並び順を入れ替える */
  Party.prototype.swap = function (a, b) {
    if (a === b) return false;
    if (a < 0 || b < 0 || a >= this.members.length || b >= this.members.length) return false;
    var tmp = this.members[a];
    this.members[a] = this.members[b];
    this.members[b] = tmp;
    return true;
  };

  /** 全員を全回復する */
  Party.prototype.healAll = function () {
    for (var i = 0; i < this.members.length; i++) {
      this.members[i].healFull();
    }
  };

  /**
   * ゲーム開始時のパーティを作る（data/player.js の starterMonsters から）。
   * 拠点・ダンジョンのどちらから始めても同じ手持ちになるよう、ここに集約している。
   * @param {MyGame.GameData} gameData
   * @param {MyGame.Random} random
   */
  Party.createStarting = function (gameData, random) {
    var party = new Party(gameData.config.partyMax);
    var starters = (gameData.player || {}).starterMonsters || [];

    for (var i = 0; i < starters.length; i++) {
      party.add(
        NS.MonsterInstance.create(starters[i].species, starters[i].level, gameData, random)
      );
    }
    return party;
  };

  // --- セーブ・ロード ---

  /** 保存用のデータへ変換する（並び順もそのまま保たれる） */
  Party.prototype.toSaveData = function () {
    var members = [];
    for (var i = 0; i < this.members.length; i++) {
      members.push(this.members[i].toSaveData());
    }
    return { members: members };
  };

  /**
   * 保存用データからパーティを復元する。
   * 復元できなかった個体（種族が消えた等）は読み飛ばす。
   * @param {object} saved
   * @param {MyGame.GameData} gameData
   * @param {number} maxSize
   */
  Party.fromSaveData = function (saved, gameData, maxSize) {
    var party = new Party(maxSize);
    var members = (saved && saved.members) || [];
    for (var i = 0; i < members.length; i++) {
      var monster = NS.MonsterInstance.fromSaveData(members[i], gameData);
      if (monster) party.add(monster);
    }
    return party;
  };

  NS.Party = Party;
})(window.MyGame);
