/**
 * ShopSystem.js
 * ショップの「並ぶ品物」「値段」「売り買いできるか」を担当する。
 *
 * ▼ 役割
 * 画面には関与しない。買える／売れるかを判断し、実際のやりとりを行うだけ。
 * ゴールドと持ち物への反映は Game のメソッド（spendGold / giveGold / giveItem）に任せる。
 *
 * ▼ 値段
 *   買値 = shop.js の stock に price があればそれ、無ければ items.js の price
 *   売値 = items.js の price × shop.js の sellRate（切り捨て。最低1G）
 *   price が 0 のアイテムは売り買いできない（重要アイテムなど）
 */
(function (NS) {
  "use strict";

  /**
   * @param {MyGame.GameData} gameData
   */
  function ShopSystem(gameData) {
    this.data = gameData;
    this.config = gameData.shop || {};
  }

  // --- 品揃え ---

  /**
   * 店に並んでいる品物を返す。
   * unlockedBy が書かれているものは、そのダンジョンをクリアするまで並ばない。
   *
   * @param {object} cleared クリア済みダンジョンの一覧（{ id: true }）
   * @returns {Array<{item:object, price:number}>}
   */
  ShopSystem.prototype.getStock = function (cleared) {
    var stock = this.config.stock || [];
    var result = [];

    for (var i = 0; i < stock.length; i++) {
      var entry = stock[i];
      if (entry.unlockedBy && !(cleared && cleared[entry.unlockedBy])) continue;

      var item = this.data.getItem(entry.item);
      if (!item) continue;   // 定義が無い品は黙って飛ばす

      result.push({ item: item, price: this.getBuyPrice(item, entry) });
    }
    return result;
  };

  /**
   * 買値。stock 側の指定があればそちらを優先する。
   * @param {object} item items.js のエントリ
   * @param {object} [entry] stock のエントリ
   */
  ShopSystem.prototype.getBuyPrice = function (item, entry) {
    if (entry && typeof entry.price === "number") return entry.price;
    return (item && item.price) || 0;
  };

  /**
   * 売値。買値に sellRate を掛ける。
   * @returns {number} 売れないものは 0
   */
  ShopSystem.prototype.getSellPrice = function (item) {
    var base = (item && item.price) || 0;
    if (base <= 0) return 0;

    var rate = (this.config.sellRate === undefined) ? 0.5 : this.config.sellRate;
    return Math.max(1, Math.floor(base * rate));
  };

  /** 売れるアイテムか（price が 0 のものは売れない） */
  ShopSystem.prototype.canSell = function (item) {
    return this.getSellPrice(item) > 0;
  };

  // --- 売り買い ---

  /**
   * 一度に買える最大数を返す。
   * 「所持金」と「持ち物の空き」の小さいほうまで。
   *
   * @param {MyGame.Game} game
   * @param {object} item items.js のエントリ
   * @param {number} price 1個あたりの買値
   * @returns {number} 0 なら買えない
   */
  ShopSystem.prototype.getMaxBuyCount = function (game, item, price) {
    if (!item || price <= 0) return 0;

    var affordable = Math.floor(game.gold / price);
    if (affordable <= 0) return 0;

    // 持ち物の空き（まだ1つも持っていない場合は、枠が空いているかも見る）
    var maxStack = (item.maxStack === undefined) ? 99 : item.maxStack;
    var owned = game.inventory.getCount(item.id);
    if (owned <= 0 && game.inventory.isFull()) return 0;

    return Math.max(0, Math.min(affordable, maxStack - owned));
  };

  /**
   * 買う。
   * 持ち物に入りきらなかった分は買わない（受け取った数だけ支払う）。
   *
   * @param {MyGame.Game} game
   * @param {string} itemId
   * @param {number} price 1個あたりの買値
   * @param {number} [count] 買う個数（省略で1個）
   * @returns {{success:boolean, reason:string, count:number, gold:number}}
   *   reason: "bought" | "notEnoughGold" | "inventoryFull" | "unknown"
   */
  ShopSystem.prototype.buy = function (game, itemId, price, count) {
    var item = this.data.getItem(itemId);
    if (!item) return fail("unknown");

    count = (count === undefined) ? 1 : Math.max(1, count);
    if (!game.canAfford(price * count)) return fail("notEnoughGold");

    // 先に持ち物へ入れてみる（入らないのに払ってしまわないように）
    var added = game.giveItem(itemId, count);
    if (added <= 0) return fail("inventoryFull");

    var total = price * added;
    game.spendGold(total);
    return { success: true, reason: "bought", count: added, gold: total };
  };

  /**
   * 一度に売れる最大数（持っている数）。
   * @returns {number} 0 なら売れない
   */
  ShopSystem.prototype.getMaxSellCount = function (game, item) {
    if (!item || !this.canSell(item)) return 0;
    return game.inventory.getCount(item.id);
  };

  /**
   * 売る。持っている数を超えた分は売らない。
   *
   * @param {number} [count] 売る個数（省略で1個）
   * @returns {{success:boolean, reason:string, count:number, gold:number}}
   *   reason: "sold" | "cannotSell" | "notOwned" | "unknown"
   */
  ShopSystem.prototype.sell = function (game, itemId, count) {
    var item = this.data.getItem(itemId);
    if (!item) return fail("unknown");
    if (!this.canSell(item)) return fail("cannotSell");

    count = (count === undefined) ? 1 : Math.max(1, count);
    var removed = game.inventory.remove(itemId, count);
    if (removed <= 0) return fail("notOwned");

    var gold = this.getSellPrice(item) * removed;
    game.giveGold(gold);

    return { success: true, reason: "sold", count: removed, gold: gold };
  };

  function fail(reason) {
    return { success: false, reason: reason, count: 0, gold: 0 };
  }

  NS.ShopSystem = ShopSystem;
})(window.MyGame);
