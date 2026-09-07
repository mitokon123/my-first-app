/**
 * dungeons.js
 * 挑めるダンジョン（ステージ）の一覧。拠点の「ダンジョンへ潜る」で選ぶ。
 *
 * order       : 選択画面での並び順
 * region      : どの地方にあるか（今は全て "abyss"。下の「今後の方針」を参照）
 * name        : 表示名
 * subtitle    : 一覧に出す短い説明
 * description : 詳細に出す説明
 * floors      : 最深階。ここまで潜るとボスがいる
 * unlockedBy  : 挑めるようになる条件（null なら最初から挑める）。次の書き方ができる
 *     "mossyMine"                        … そのダンジョンをクリア
 *     ["mossyMine", "scorchingFissure"]  … 並べた全部をクリア
 *     { dungeons: [...], count: 2 }      … 並べたうちの2つをクリア
 *     { region: "abyss" }                … その地方を全部クリア
 *     { region: "abyss", count: 3 }      … その地方のうち3つをクリア
 * theme       : 見た目（色と床の飾り）。data/dungeonThemes.js のidを書く
 *               省略すると既定の色になる。同じテーマを複数のダンジョンで使い回してもよい
 * generation  : マップ生成の設定。省略した項目は data/dungeon.js の既定を使う
 * encounter   : この場所の敵の出方
 *   rate      : 1歩あたりの遭遇確率（省略時は data/enemies.js の既定）
 *   groupSize : 一度に出てくる敵の数。2通りの書き方ができる
 *     { min: 1, max: 3 }  … min〜max から均等に選ぶ
 *     [ { count: 1, weight: 0.4 }, { count: 3, weight: 0.2 }, … ]
 *                         … 体数ごとに出やすさを変える（多い数を渋くしたいとき）
 *   levelRange: この場所の出現レベルの既定
 *   table     : 出現候補（species / weight / minLevel / maxLevel / minFloor / maxFloor）
 *     minLevel / maxLevel : その種族だけの出現レベル（階やダンジョンの指定より優先）
 *     minFloor / maxFloor : 出る階を絞る。省略すると全階に出る
 *       例: { species: "…", weight: 0.4, minFloor: 3 } … B3F以降だけ
 *   perFloor  : 階ごとの上書き（"1" が B1F）。書いた項目だけが上書きされる
 *     rate / levelRange / groupSize を階ごとに変えられる（table は変えられない
 *     ——出る種族を階で絞りたいときは、上の minFloor / maxFloor を使う）
 *     例: "3": { levelRange:{min:2,max:4}, groupSize:{min:1,max:2} }
 * featureTables : その場所だけの仕掛けの中身。仕掛けid（chest など）ごとに書く
 *   data/features.js の共通の中身に「足される」（上書きではない）ので、
 *   薬草・回復薬・精気の実はどのダンジョンでも出続ける。
 *   ここにはその場所で手に入る素材を並べる。書き方はドロップと同じ：
 *     chest: [{ item, weight, min, max }]
 *   ★ 主が落とす素材（苔むした核・灼熱の牙）は入れない。
 *     倒すこと自体に意味を残すため
 * boss        : 最深階に出るボスのid（data/bosses.js を参照）
 *
 * ★ ダンジョンを増やすときは、このファイルに1エントリ足すだけでよい。
 *
 * ─────────────────────────────────────────────
 * ▼ 今後の方針（ステージをどう増やしていくか）
 *
 * 【第1段階】1〜4ステージ目までは一本道。すべて同じ地方 "abyss"（深淵）に置く。
 *   前のステージをクリアすると次が開く、という今の形をそのまま伸ばす。
 *   モンスターもこのファイルと data/monsters.js にまとめて書く。
 *   （もとは5ステージの予定だったが、4に短縮して地方解放を早めることにした）
 *
 * 【第2段階】4ステージ目をクリアすると「地方選択」が開く。ここで自由度が大きく上がる。
 *   地方ごとに出るモンスター・強さ・難易度が変わり、いくつもの地方を並べて選べる。
 *   深淵とは別の地方が増えるので、そこで初めてファイルを分ける：
 *     data/dungeons/ には置かず、地方ごとに data/monsters_〇〇.js のように分割する。
 *     （1ファイルが大きくなりすぎるのを防ぐため。読み込みは app.html の配列に足すだけ）
 *
 * 【区切り】ここまでできたら v1.0.0（正式リリース）。
 *   4ステージ目の unlockedBy は今までどおり前のステージ、
 *   地方選択の解放条件は { region: "abyss" } で書ける（判定はもう入っている）。
 *
 * 【解放条件について】
 *   地方が並列になると「この地方を全部クリアしたら次の地方」という条件が要る。
 *   そのために unlockedBy は複数条件を書けるようにしてある（上の説明を参照）。
 *   判定は js/systems/DungeonCatalog.js の isUnlocked が行う。
 *
 * 【エンディング】
 *   現在は data/bosses.js で isFinal: true のボス（深淵の王）を倒すと終わる。
 *   地方が増えたら「全地方クリアで最終地方が開く」形になる見込み。ここは保留中。
 * ─────────────────────────────────────────────
 */
(function (NS) {
  "use strict";

  NS.rawData.dungeons = {
    mossyMine: {
      id: "mossyMine",
      order: 1,
      region: "abyss",
      name: "苔むす坑道",
      theme: "mine",
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
      // 坑道の宝箱。倒して集めるのと同じ素材が、探索でも手に入る
      featureTables: {
        chest: [
          { item: "oreShard", weight: 0.50, min: 1, max: 2 },
          { item: "glowDust", weight: 0.35, min: 1, max: 1 }
        ]
      },
      boss: "mineKeeper"
    },

    scorchingFissure: {
      id: "scorchingFissure",
      order: 2,
      region: "abyss",
      name: "灼熱の亀裂",
      theme: "ember",
      subtitle: "熱気が立ちのぼる裂け目。火の魔物が多い。",
      description: "地の底から熱を吹き上げる大きな裂け目。\n" +
                   "炎をまとう魔物が群れており、火に弱い者には厳しい。\n" +
                   "道は狭く入り組んでいる。",
      floors: 4,
      unlockedBy: "mossyMine",
      generation: { width: 25, height: 18, roomMin: 3, roomMax: 5, roomCount: 10, attempts: 220 },
      encounter: {
        rate: 0.10,
        groupSize: { min: 1, max: 2 },
        levelRange: { min: 4, max: 8 },
        // 在来種だけが出る。コウモリとスライムは坑道のモンスターなので、ここには出さない。
        // 弱いものほど重みを大きくして、雑魚が多く・壁役がたまに出るようにしてある
        // 重みの合計が 4.0 なので、そのまま割合になる
        //   スミビ 22.5% / フレイミン 22.5% / ハイバネ 20% / ヒビイワ 17.5% / マグマガニ 17.5%
        table: [
          { species: "cinderling", weight: 0.9 },
          { species: "flamin",     weight: 0.9 },
          { species: "ashWing",    weight: 0.8 },
          { species: "crackRock",  weight: 0.7 },
          { species: "magmaCrab",  weight: 0.7 }
        ],
        // 上2階は浅場、下2階でレベルも数も一段上がる
        perFloor: {
          "1": { levelRange: { min: 4, max: 8 },  groupSize: { min: 1, max: 2 } },
          "2": { levelRange: { min: 4, max: 8 },  groupSize: { min: 1, max: 2 } },
          "3": { levelRange: { min: 5, max: 10 }, groupSize: { min: 2, max: 3 } },
          "4": { levelRange: { min: 5, max: 10 }, groupSize: { min: 2, max: 3 } }
        }
      },
      // 亀裂の宝箱。焼けた殻はいちばん出にくいマグマガニの素材なので、ここでも渋くしてある。
      // 鉱石のかけらはヒビイワとマグマガニも落とすので、この階でも拾える
      featureTables: {
        chest: [
          { item: "emberAsh",      weight: 0.45, min: 1, max: 2 },
          { item: "ashFeather",    weight: 0.35, min: 1, max: 1 },
          { item: "oreShard",      weight: 0.30, min: 1, max: 2 },
          { item: "scorchedShell", weight: 0.25, min: 1, max: 1 }
        ]
      },
      boss: "blazeBeast"
    },

    silentDepths: {
      id: "silentDepths",
      order: 3,
      region: "abyss",
      name: "静寂の深層",
      theme: "depths",
      subtitle: "音の絶えた最深部。深淵の主が待つ。",
      description: "物音ひとつしない、深淵のいちばん底。\n" +
                   "ここまで潜った者だけが、その主と対峙できる。",
      // 5階だと一本道が長すぎたので4階に短縮した（亀裂と同じ深さ）
      floors: 4,
      unlockedBy: "scorchingFissure",
      generation: { width: 25, height: 18, roomMin: 4, roomMax: 8, roomCount: 7, attempts: 200 },
      // 推奨レベルは16。敵はそれより少し下に置いて、育ててから来る場所にしてある
      encounter: {
        rate: 0.09,
        groupSize: { min: 2, max: 3 },
        levelRange: { min: 10, max: 15 },
        // 在来種だけが出る。コウモリ・スライムは坑道、フレイミンは亀裂の魔物なので、
        // 深層には残していない（灼熱の亀裂と同じ考え方）
        //
        // ★ この表は上2階（B1F・B2F）ぶん。下2階は perFloor で表ごと差し替える。
        //   重みの合計を 1.00 にしてあるので、数字がそのまま出現率になる
        table: [
          { species: "murkling", weight: 0.33 },
          { species: "kageZuta", weight: 0.27 },
          { species: "puddling", weight: 0.23 },
          { species: "boltBug",  weight: 0.17 }
        ],
        // 上2階は軽く、降りるほど数とレベルが上がる。
        // B4Fだけ下限が13なので、主の前で必ず一段重くなる
        perFloor: {
          "1": { levelRange: { min: 10, max: 13 }, groupSize: { min: 1, max: 2 } },
          "2": { levelRange: { min: 10, max: 13 }, groupSize: { min: 1, max: 2 } },
          // B3Fはビリムシが一気に増える。雷持ちが多い階として、
          // ここを抜けるのに雷耐性が要るようにしてある
          "3": {
            levelRange: { min: 10, max: 15 },
            groupSize: { min: 2, max: 2 },
            table: [
              { species: "murkling", weight: 0.27 },
              { species: "kageZuta", weight: 0.25 },
              { species: "puddling", weight: 0.22 },
              { species: "boltBug",  weight: 0.26 }
            ]
          },
          // B4Fだけ体数を重み付きにしてある。
          // 均等（1〜3体）だと3体が33%も出て、主の直前が重くなりすぎるため。
          //
          // 竜はこの階にしか出ない。最深部の門番という位置づけで、
          // 在来種4種を少しずつ削って16%ぶんの枠を作っている
          "4": {
            levelRange: { min: 13, max: 15 },
            groupSize: [
              { count: 1, weight: 0.4 },
              { count: 2, weight: 0.4 },
              { count: 3, weight: 0.2 }
            ],
            table: [
              { species: "murkling",    weight: 0.24 },
              { species: "kageZuta",    weight: 0.22 },
              { species: "puddling",    weight: 0.20 },
              { species: "boltBug",     weight: 0.18 },
              { species: "abyssDragon", weight: 0.16 }
            ]
          }
        }
      },
      // 深層の宝箱。在来種を足すたびに、その素材をここにも並べる
      featureTables: {
        chest: [
          { item: "abyssFragment", weight: 0.40, min: 1, max: 1 },
          { item: "duskDew",       weight: 0.45, min: 1, max: 2 },
          { item: "twistedVine",   weight: 0.30, min: 1, max: 1 },
          { item: "stormWing",     weight: 0.22, min: 1, max: 1 },
          { item: "slimeShard",    weight: 0.35, min: 1, max: 2 },
          // 竜の鱗だけは渋くしてある。倒して手に入れることに意味を残すため
          { item: "dragonScale",   weight: 0.12, min: 1, max: 1 }
        ]
      },
      boss: "abyssKing"
    }
  };
})(window.MyGame);
