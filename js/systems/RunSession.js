/**
 * RunSession.js
 * 1回の挑戦（ダンジョンへ入ってから拠点へ戻るまで）の記録。
 *
 * 「そのランで手に入れたもの」だけを覚えておく係。
 * 全滅したときに何を失うかは Game が決め、ここは記録に徹する。
 *
 * 持ち物そのものには触らないので、拾う経路（戦闘のドロップ・宝箱など）が
 * 増えても、Game.giveItem を通していればここは変更しなくてよい。
 */
(function (NS) {
  "use strict";

  /**
   * @param {object} dungeon 挑んでいるダンジョンの定義（data/dungeons.js の1件）
   */
  function RunSession(dungeon) {
    this.dungeon = dungeon || null;
    this.gainedItems = {};    // itemId → 個数
    this.gainedMonsters = []; // そのランで仲間になった個体
    this.gainedGold = 0;      // そのランで得たゴールド（全滅しても失わない）
    this.blessings = [];      // 階を降りるたびに選んだ加護（data/blessings.js の定義）
    this.deepestFloor = 1;    // いちばん深く潜った階
  }

  /** そのランで得たゴールドを記録する */
  RunSession.prototype.recordGold = function (amount) {
    if (!amount || amount <= 0) return;
    this.gainedGold += amount;
  };

  /** 到達した階を記録する（いちばん深いところだけ覚える） */
  RunSession.prototype.recordFloor = function (floor) {
    if (floor > this.deepestFloor) this.deepestFloor = floor;
  };

  /**
   * その挑戦で得たものをまとめて返す。
   * 結果画面に出すためのもので、記録そのものは変えない。
   */
  RunSession.prototype.getSummary = function () {
    return {
      dungeon: this.dungeon,
      floor: this.deepestFloor,
      gold: this.gainedGold,
      items: this.getGainedItems(),
      monsters: this.gainedMonsters.slice()
    };
  };

  /** 加護を1つ得る */
  RunSession.prototype.addBlessing = function (blessing) {
    if (blessing) this.blessings.push(blessing);
  };

  RunSession.prototype.getBlessings = function () { return this.blessings; };

  /** その加護を既に持っているか */
  RunSession.prototype.hasBlessing = function (id) {
    for (var i = 0; i < this.blessings.length; i++) {
      if (this.blessings[i].id === id) return true;
    }
    return false;
  };

  /** 加護の効果をすべて並べて返す（パーティ全員に掛かる） */
  RunSession.prototype.getBlessingEffects = function () {
    var effects = [];
    for (var i = 0; i < this.blessings.length; i++) {
      effects = effects.concat(this.blessings[i].effects || []);
    }
    return effects;
  };

  /** そのランで手に入れたアイテムを記録する */
  RunSession.prototype.recordItem = function (itemId, count) {
    if (!itemId || !count || count <= 0) return;
    this.gainedItems[itemId] = (this.gainedItems[itemId] || 0) + count;
  };

  /** そのランで仲間になった個体を記録する */
  RunSession.prototype.recordMonster = function (monster) {
    if (monster) this.gainedMonsters.push(monster);
  };

  /** @returns {Array<{itemId:string, count:number}>} 手に入れた順は保証しない */
  RunSession.prototype.getGainedItems = function () {
    var result = [];
    for (var id in this.gainedItems) {
      if (!Object.prototype.hasOwnProperty.call(this.gainedItems, id)) continue;
      result.push({ itemId: id, count: this.gainedItems[id] });
    }
    return result;
  };

  RunSession.prototype.getGainedMonsters = function () {
    return this.gainedMonsters;
  };

  NS.RunSession = RunSession;
})(window.MyGame);
