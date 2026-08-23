/**
 * Inventory.js
 * 持ち物（アイテムの所持数）を管理する。
 *
 * アイテムの定義そのものは data/items.js が持ち、ここは「何を何個持っているか」だけを扱う。
 * 1種類あたりの上限は items.js の maxStack、種類数の上限は data/player.js の inventoryMax。
 *
 * 並び順は「手に入れた順」を保つ（分類ごとの並べ替えは表示側で行う）。
 */
(function (NS) {
  "use strict";

  /**
   * @param {MyGame.GameData} gameData
   * @param {number} [maxSlots] 種類数の上限（省略時は data/player.js の inventoryMax）
   */
  function Inventory(gameData, maxSlots) {
    this.data = gameData;
    this.maxSlots = (maxSlots === undefined)
      ? (gameData.player || {}).inventoryMax
      : maxSlots;

    this.slots = [];  // [{ itemId, count }] 手に入れた順
  }

  // --- 参照 ---

  Inventory.prototype.getSlots = function () { return this.slots; };
  Inventory.prototype.slotCount = function () { return this.slots.length; };
  Inventory.prototype.isEmpty = function () { return this.slots.length === 0; };

  Inventory.prototype.isFull = function () {
    if (this.maxSlots === undefined || this.maxSlots === null) return false;
    return this.slots.length >= this.maxSlots;
  };

  /** 指定アイテムの所持数（持っていなければ 0） */
  Inventory.prototype.getCount = function (itemId) {
    var slot = this._findSlot(itemId);
    return slot ? slot.count : 0;
  };

  Inventory.prototype.has = function (itemId, count) {
    return this.getCount(itemId) >= (count || 1);
  };

  /**
   * 分類ごとにまとめた一覧を返す（表示用）。
   * @returns {Array<{category:object, slots:Array}>} 分類の order 順
   */
  Inventory.prototype.groupByCategory = function () {
    var categories = (this.data.categories || {}).item || {};
    var groups = {};

    for (var i = 0; i < this.slots.length; i++) {
      var item = this.data.getItem(this.slots[i].itemId);
      var categoryId = (item && item.category) || "other";
      if (!groups[categoryId]) groups[categoryId] = [];
      groups[categoryId].push(this.slots[i]);
    }

    var result = [];
    for (var id in groups) {
      if (!Object.prototype.hasOwnProperty.call(groups, id)) continue;
      result.push({
        category: categories[id] || { id: id, name: id, order: 999 },
        slots: groups[id]
      });
    }
    result.sort(function (a, b) {
      return (a.category.order || 999) - (b.category.order || 999);
    });
    return result;
  };

  // --- 変更 ---

  /**
   * アイテムを加える。
   * 既に持っていればその数を増やし、無ければ新しい枠を使う。
   * @returns {number} 実際に加えられた個数（上限で入りきらない分は加えない）
   */
  Inventory.prototype.add = function (itemId, count) {
    count = (count === undefined) ? 1 : count;
    if (count <= 0) return 0;

    var definition = this.data.getItem(itemId);
    if (!definition) return 0;

    var maxStack = definition.maxStack === undefined ? 99 : definition.maxStack;
    var slot = this._findSlot(itemId);

    if (!slot) {
      if (this.isFull()) return 0;
      slot = { itemId: itemId, count: 0 };
      this.slots.push(slot);
    }

    var space = maxStack - slot.count;
    var added = Math.min(space, count);
    slot.count += added;
    return added;
  };

  /**
   * アイテムを減らす。0個になった枠は取り除く。
   * @returns {number} 実際に減らせた個数
   */
  Inventory.prototype.remove = function (itemId, count) {
    count = (count === undefined) ? 1 : count;
    var slot = this._findSlot(itemId);
    if (!slot) return 0;

    var removed = Math.min(slot.count, count);
    slot.count -= removed;
    if (slot.count <= 0) {
      this.slots.splice(this.slots.indexOf(slot), 1);
    }
    return removed;
  };

  Inventory.prototype.clear = function () {
    this.slots = [];
  };

  Inventory.prototype._findSlot = function (itemId) {
    for (var i = 0; i < this.slots.length; i++) {
      if (this.slots[i].itemId === itemId) return this.slots[i];
    }
    return null;
  };

  // --- 初期化・セーブ ---

  /** data/player.js の starterItems から初期の持ち物を作る */
  Inventory.createStarting = function (gameData) {
    var inventory = new Inventory(gameData);
    var starters = (gameData.player || {}).starterItems || [];

    for (var i = 0; i < starters.length; i++) {
      inventory.add(starters[i].item, starters[i].count);
    }
    return inventory;
  };

  Inventory.prototype.toSaveData = function () {
    var slots = [];
    for (var i = 0; i < this.slots.length; i++) {
      slots.push({ itemId: this.slots[i].itemId, count: this.slots[i].count });
    }
    return { slots: slots };
  };

  /**
   * 保存データから復元する。
   * 定義が無くなったアイテムは読み飛ばす（データ変更後も安全に読める）。
   */
  Inventory.fromSaveData = function (saved, gameData) {
    var inventory = new Inventory(gameData);
    var slots = (saved && saved.slots) || [];

    for (var i = 0; i < slots.length; i++) {
      inventory.add(slots[i].itemId, slots[i].count);
    }
    return inventory;
  };

  NS.Inventory = Inventory;
})(window.MyGame);
