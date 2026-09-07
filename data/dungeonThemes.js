/**
 * dungeonThemes.js
 * ダンジョンの「見た目」だけをまとめたファイル。色と床の飾りを決める。
 *
 * data/dungeons.js の theme に、ここのidを書いて結びつける。
 *   mossyMine: { ..., theme: "mine" }
 * theme を書かなかったダンジョンは、data/dungeon.js と data/ui.js の既定の色になる。
 *
 * name        : 何のテーマか（コードからは使わない。読む人のための覚え書き）
 * background  : マップの外側（余白）の色
 * tiles       : タイルの色。キーは data/dungeon.js の tiles の name
 *     wall / floor / stairs
 *   書かなかったものは data/dungeon.js の色をそのまま使う
 * stairsMark  : 階段に重ねる記号の見た目（省略時は data/ui.js の dungeon.stairsMark）
 * battle      : その場所で戦うときの背景。省略すると data/ui.js の battle.background
 *     gradientTop / gradientBottom … 上から下へのグラデーション
 *     groundY / groundColor / edgeColor … 立っている地面の帯と、その上端の線
 *     particles … 漂うもの（data/ui.js の粒子と同じ書き方。速さを負にすると昇る）
 * decorations : 床に散らす飾り。当たり判定も効果も無く、見た目だけのもの
 *     count : 1階層あたりに置く個数（min〜max からランダム）
 *     table : 何を置くか。weight は出やすさの比
 *   絵の実体は data/sprites.js。飾りを増やすときは、そちらに1つ足して
 *   ここの table に並べるだけでよい（コードの変更は要らない）。
 *
 * ★ 地方が増えたら、その地方のテーマをここに足す。
 *   複数のダンジョンで同じテーマを使い回してもよい（同じ地方の見た目を揃えたいとき）。
 */
(function (NS) {
  "use strict";

  NS.rawData.dungeonThemes = {
    // 苔むす坑道。湿った岩と苔。深淵の入口らしく、暗いが緑がかっている
    mine: {
      name: "苔むした坑道",
      background: "#060a08",
      tiles: {
        wall:   "#3a4a3c",
        floor:  "#141c17",
        stairs: "#2a3a2c"
      },
      decorations: {
        count: { min: 10, max: 16 },
        table: [
          { sprite: "decoMoss",   weight: 1.0 },
          { sprite: "decoPebble", weight: 0.6 }
        ]
      },
      // 戦闘の背景：湿った緑の岩肌。胞子がゆっくり漂う
      battle: {
        gradientTop: "#16291d",
        gradientBottom: "#060b08",
        groundY: 346, groundColor: "#0b1710", edgeColor: "#2a4a33",
        particles: {
          count: 22, color: "#6fa84f", minSize: 1, maxSize: 2,
          minSpeed: -13, maxSpeed: -4, minAlpha: 0.08, maxAlpha: 0.30,
          minDriftX: -5, maxDriftX: 5
        }
      }
    },

    // 灼熱の亀裂。焼けた岩肌と、まだ熱を持っている床のひび
    ember: {
      name: "焼けた岩",
      background: "#0d0503",
      tiles: {
        wall:   "#5a2f22",
        floor:  "#1e1010",
        stairs: "#4a2418"
      },
      stairsMark: { color: "#ffb15e" },
      decorations: {
        count: { min: 8, max: 14 },
        table: [
          { sprite: "decoEmber",  weight: 1.0 },
          { sprite: "decoPebble", weight: 0.4 }
        ]
      },
      // 戦闘の背景：焼けた岩と、下から昇る火の粉
      battle: {
        gradientTop: "#3a1409",
        gradientBottom: "#0d0503",
        groundY: 346, groundColor: "#1c0c07", edgeColor: "#6b2f17",
        particles: {
          count: 30, color: "#ffa32e", minSize: 1, maxSize: 2.5,
          minSpeed: -34, maxSpeed: -10, minAlpha: 0.15, maxAlpha: 0.55,
          minDriftX: -8, maxDriftX: 8
        }
      }
    },

    // 静寂の深層。冷たく青い。ここまで来た者の骨が転がっている
    depths: {
      name: "冷えた最深部",
      background: "#04050c",
      tiles: {
        wall:   "#343a5e",
        floor:  "#0f1220",
        stairs: "#252b48"
      },
      decorations: {
        count: { min: 6, max: 12 },
        table: [
          { sprite: "decoBone",   weight: 0.8 },
          { sprite: "decoPebble", weight: 0.6 }
        ]
      },
      // 戦闘の背景：冷たく静かな最深部。細かい塵がゆっくり降る
      battle: {
        gradientTop: "#141a33",
        gradientBottom: "#03050c",
        groundY: 346, groundColor: "#080b16", edgeColor: "#2c3762",
        particles: {
          count: 26, color: "#8ea0d8", minSize: 1, maxSize: 1.8,
          minSpeed: 5, maxSpeed: 16, minAlpha: 0.06, maxAlpha: 0.26,
          minDriftX: -3, maxDriftX: 3
        }
      }
    }
  };
})(window.MyGame);
