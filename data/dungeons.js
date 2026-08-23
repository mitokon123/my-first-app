/**
 * dungeons.js
 * 挑めるダンジョン（ステージ）の一覧。拠点の「ダンジョンへ潜る」で選ぶ。
 *
 * order       : 選択画面での並び順
 * name        : 表示名
 * subtitle    : 一覧に出す短い説明
 * description : 詳細に出す説明
 * floors      : 最深階。ここまで潜るとボスがいる
 * unlockedBy  : クリアが必要なダンジョンid（null なら最初から挑める）
 * generation  : マップ生成の設定。省略した項目は data/dungeon.js の既定を使う
 * encounter   : この場所の敵の出方
 *   rate      : 1歩あたりの遭遇確率（省略時は data/enemies.js の既定）
 *   groupSize : 一度に出てくる敵の数
 *   levelRange: この場所の出現レベルの既定
 *   table     : 出現候補（species / weight / minLevel / maxLevel）
 *   perFloor  : 階ごとの上書き（"1" が B1F）。書いた項目だけが上書きされる
 *     例: "3": { levelRange:{min:2,max:4}, groupSize:{min:1,max:2} }
 * boss        : 最深階に出るボスのid（data/bosses.js を参照）
 *
 * ★ ダンジョンを増やすときは、このファイルに1エントリ足すだけでよい。
 */
(function (NS) {
  "use strict";

  NS.rawData.dungeons = {
    mossyMine: {
      id: "mossyMine",
      order: 1,
      name: "苔むす坑道",
      subtitle: "深淵への入口。浅く、なだらか。",
      description: "かつて誰かが掘った古い坑道。\n" +
                   "壁は苔に覆われ、おとなしい魔物が住み着いている。\n" +
                   "深淵へ降りる者は、まずここを通る。",
      floors: 3,
      unlockedBy: null,
      generation: { width: 25, height: 18, roomMin: 3, roomMax: 7, roomCount: 8, attempts: 200 },
      encounter: {
        rate: 0.08,
        groupSize: { min: 1, max: 1 },
        levelRange: { min: 1, max: 1 },
        table: [
          { species: "slime",   weight: 1.0 },
          { species: "batty",   weight: 0.8 },
          { species: "mossRat", weight: 0.9 },
          { species: "rocky",   weight: 0.6 },
          { species: "glowBug", weight: 0.7 },
          { species: "sporin",  weight: 0.6 }
        ],
        // 深く潜るほど強い個体が増える
        perFloor: {
          "1": { levelRange: { min: 1, max: 1 }, groupSize: { min: 1, max: 1 } },
          "2": { levelRange: { min: 1, max: 3 }, groupSize: { min: 1, max: 1 } },
          "3": { levelRange: { min: 2, max: 4 }, groupSize: { min: 1, max: 2 } }
        }
      },
      boss: "mineKeeper"
    },

    scorchingFissure: {
      id: "scorchingFissure",
      order: 2,
      name: "灼熱の亀裂",
      subtitle: "熱気が立ちのぼる裂け目。火の魔物が多い。",
      description: "地の底から熱を吹き上げる大きな裂け目。\n" +
                   "炎をまとう魔物が群れており、火に弱い者には厳しい。\n" +
                   "道は狭く入り組んでいる。",
      floors: 4,
      unlockedBy: "mossyMine",
      generation: { width: 25, height: 18, roomMin: 3, roomMax: 5, roomCount: 10, attempts: 220 },
      encounter: {
        rate: 0.10,
        groupSize: { min: 2, max: 3 },
        levelRange: { min: 4, max: 8 },
        table: [
          { species: "flamin", weight: 1.2 },
          { species: "batty",  weight: 0.6 },
          { species: "slime",  weight: 0.4, minLevel: 1, maxLevel: 6 }
        ]
      },
      boss: "blazeBeast"
    },

    silentDepths: {
      id: "silentDepths",
      order: 3,
      name: "静寂の深層",
      subtitle: "音の絶えた最深部。深淵の主が待つ。",
      description: "物音ひとつしない、深淵のいちばん底。\n" +
                   "ここまで潜った者だけが、その主と対峙できる。",
      floors: 5,
      unlockedBy: "scorchingFissure",
      generation: { width: 25, height: 18, roomMin: 4, roomMax: 8, roomCount: 7, attempts: 200 },
      encounter: {
        rate: 0.09,
        groupSize: { min: 2, max: 3 },
        levelRange: { min: 10, max: 16 },
        table: [
          { species: "batty",  weight: 1.0 },
          { species: "flamin", weight: 1.0 },
          { species: "slime",  weight: 0.8, minLevel: 1, maxLevel: 14 }
        ]
      },
      boss: "abyssKing"
    }
  };
})(window.MyGame);
