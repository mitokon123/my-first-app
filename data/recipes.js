/**
 * recipes.js
 * 工房で作れるものの一覧（レシピ）。
 *
 * id         : 識別子
 * result     : 作れるもの { item, count }（アイテムid と個数）
 * materials  : 必要な素材 [{ item, count }]
 * gold       : 作るのに必要なゴールド。書かなければ無料（素材だけで作れる）
 * unlockedBy : このダンジョンをクリアするまで並ばない（省略で最初から作れる）
 * order      : 一覧での並び順（小さいほど先）
 *
 * ★ 作れるものを増やすときは、このファイルに1エントリ足すだけでよい。
 *   装備もアイテムの一種なので、回復薬と同じ書き方で作れる。
 */
(function (NS) {
  "use strict";

  NS.rawData.recipes = {
    potion: {
      id: "potion",
      order: 1,
      result: { item: "potion", count: 1 },
      materials: [ { item: "herb", count: 2 } ]
    },

    stoneBand: {
      id: "stoneBand",
      order: 2,
      result: { item: "stoneBand", count: 1 },
      materials: [ { item: "oreShard", count: 3 } ]
    },

    glowLantern: {
      id: "glowLantern",
      order: 3,
      result: { item: "glowLantern", count: 1 },
      materials: [
        { item: "glowDust", count: 2 },
        { item: "oreShard", count: 2 }
      ],
      unlockedBy: "mossyMine"
    },

    // ボスの落とすものを使う。倒す理由になるレシピ
    mossCharm: {
      id: "mossCharm",
      order: 4,
      result: { item: "mossCharm", count: 1 },
      materials: [
        { item: "mossyCore", count: 1 },
        { item: "oreShard", count: 6 }
      ],
      unlockedBy: "mossyMine"
    }
  };
})(window.MyGame);
