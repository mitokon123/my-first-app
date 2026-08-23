/**
 * shop.js
 * 拠点のショップの設定。
 *
 * sellRate : 売値の割合。売値 = items.js の price × sellRate（切り捨て）
 * stock    : 店に並ぶ品物
 *   item       : アイテムid（data/items.js を参照）
 *   price      : 買値。省略すると items.js の price をそのまま使う
 *   unlockedBy : このダンジョンをクリアするまで並ばない（省略で最初から並ぶ）
 *
 * ★ 品揃えを変えるときは stock を編集するだけでよい。
 *   装備もアイテムの一種なので、同じ書き方で並べられる。
 */
(function (NS) {
  "use strict";

  NS.rawData.shop = {
    sellRate: 0.5,

    stock: [
      { item: "herb" },
      { item: "potion" },
      { item: "fangCharm" },
      { item: "stoneBand", unlockedBy: "mossyMine" },
      { item: "glowLantern", unlockedBy: "mossyMine" },
      { item: "elixir", unlockedBy: "scorchingFissure" }
    ]
  };
})(window.MyGame);
