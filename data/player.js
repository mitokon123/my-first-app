/**
 * player.js
 * プレイヤーの初期状態。
 *
 * starterMonsters : 最初から連れているモンスター（種族idとレベル）
 * starterItems    : 最初から持っているアイテム（アイテムidと個数）
 * startingGold    : 最初から持っているゴールド
 * inventoryMax    : 持ち物に入れられる種類数の上限
 *
 * ★ 開始時の内容を変えたいときは、このファイルを編集するだけでよい。
 */
(function (NS) {
  "use strict";

  NS.rawData.player = {
    starterMonsters: [
      { species: "slime", level: 5 }
    ],

    starterItems: [
      { item: "herb", count: 3 },
      { item: "potion", count: 1 }
    ],

    startingGold: 50,

    inventoryMax: 20
  };
})(window.MyGame);
