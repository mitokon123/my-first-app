/**
 * dungeon.js
 * ダンジョンのデータ。ステップ4からは「ランダム生成」に対応。
 *
 * generation: 生成パラメータ（DungeonGenerator が使用）。数値はここで管理する。
 * tiles: タイル記号ごとの定義（当たり判定・色）。
 *   '#' = 壁, '.' = 床
 *
 * ※ 画面 800x600 / tileSize 32 のとき、表示できるのは 25列 x 18行（下端24pxは情報欄）。
 *   現状はカメラ（スクロール）未実装のため、生成サイズも画面に収まる 25x18 にしている。
 *   これより広いマップ（場所ごとの広さの差別化など）はカメラ実装とセットで拡張する。
 */
(function (NS) {
  "use strict";

  NS.rawData.dungeon = {
    generation: {
      width: 25,       // マップの列数
      height: 18,      // マップの行数
      roomMin: 3,      // 部屋の最小辺
      roomMax: 7,      // 部屋の最大辺
      roomCount: 8,    // 目標の部屋数
      attempts: 200    // 部屋配置の試行回数上限（少ないと目標部屋数に届かない）
    },
    /**
     * 1階層に置く仕掛けマスの個数（全ダンジョン共通の既定）。
     * ダンジョンごとに変えたい場合は data/dungeons.js の features に書く。
     * 種類そのものの定義は data/features.js。
     */
    featureCounts: {
      chest:  { min: 1, max: 2 },
      spring: { min: 0, max: 1 },
      trap:   { min: 1, max: 2 }
    },

    tiles: {
      "#": { name: "wall",   solid: true,  color: "#3a4266" },
      ".": { name: "floor",  solid: false, color: "#141a2b" },
      // 階段。踏むと次の階層へ進む（ボス階では踏むとボス戦になる）
      ">": { name: "stairs", solid: false, color: "#2a3a5a", stairs: true }
    }
  };
})(window.MyGame);
