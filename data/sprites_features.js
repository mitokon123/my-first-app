/**
 * sprites_features.js
 * ダンジョンの中に置かれるものの絵。
 *
 *   仕掛けマス … data/features.js から sprite / usedSprite で参照する
 *   床の飾り   … data/dungeonThemes.js の decorations から参照する
 *
 * 書き方（パレット・pixels）と、ファイルを分けている理由は data/sprites.js を参照。
 */
(function (NS) {
  "use strict";

  NS.extend("sprites", {

    // --- 仕掛けマス（data/features.js） ---

    chest: {
      palette: {
        ".": null,
        "K": "#2a1a0c",   // 輪郭
        "B": "#8a5a2e",   // 木
        "Y": "#ffd75e",   // 金の帯
        "L": "#5a3a14"    // 鍵穴
      },
      pixels: [
        "................",
        "................",
        "..KKKKKKKKKKKK..",
        ".KYYYYYYYYYYYYK.",
        ".KYBBBBBBBBBBYK.",
        ".KYBBBBBBBBBBYK.",
        ".KYYYYYYYYYYYYK.",
        ".KBBBBBKKBBBBBK.",
        ".KBBBBBKLKBBBBK.",
        ".KYYYYYKKYYYYYK.",
        ".KYBBBBBBBBBBYK.",
        ".KYBBBBBBBBBBYK.",
        ".KYYYYYYYYYYYYK.",
        "..KKKKKKKKKKKK..",
        "................",
        "................"
      ]
    },

    // 開けたあとの宝箱。通った跡が分かるように残す
    chestOpen: {
      palette: {
        ".": null,
        "K": "#2a1a0c",
        "B": "#6b451f",   // 少し暗い木
        "Y": "#c8a35e",   // くすんだ金
        "D": "#12100c"    // 中の影
      },
      pixels: [
        "................",
        "..KKKKKKKKKKKK..",
        "..KYYYYYYYYYYK..",
        "..KKKKKKKKKKKK..",
        "...KKKKKKKKKK...",
        "..KDDDDDDDDDDK..",
        "..KDDDDDDDDDDK..",
        ".KYYYYYYYYYYYYK.",
        ".KYBBBBBBBBBBYK.",
        ".KYBBBBBBBBBBYK.",
        ".KYYYYYYYYYYYYK.",
        "..KKKKKKKKKKKK..",
        "................",
        "................",
        "................",
        "................"
      ]
    },

    spring: {
      palette: {
        ".": null,
        "K": "#16203a",   // 輪郭
        "W": "#6e7a92",   // 石のふち
        "C": "#4fb0d1",   // 水
        "L": "#bfe4ff"    // 水面の光
      },
      pixels: [
        "................",
        "................",
        "....KKKKKKKK....",
        "..KKWWWWWWWWKK..",
        ".KWWWWWWWWWWWWK.",
        ".KWCCCCCCCCCCWK.",
        ".KWCLLLLCCCCCWK.",
        ".KWCCCCCCCLLCWK.",
        ".KWCCCCCCCCCCWK.",
        ".KWWWWWWWWWWWWK.",
        "..KKWWWWWWWWKK..",
        "....KKKKKKKK....",
        "................",
        "................",
        "................",
        "................"
      ]
    },

    // 使ったあとの泉。水が引いている
    springUsed: {
      palette: {
        ".": null,
        "K": "#16203a",
        "W": "#4e5870",
        "D": "#232b3e"    // 干上がった底
      },
      pixels: [
        "................",
        "................",
        "....KKKKKKKK....",
        "..KKWWWWWWWWKK..",
        ".KWWWWWWWWWWWWK.",
        ".KWDDDDDDDDDDWK.",
        ".KWDDDDDDDDDDWK.",
        ".KWDDDDDDDDDDWK.",
        ".KWDDDDDDDDDDWK.",
        ".KWWWWWWWWWWWWK.",
        "..KKWWWWWWWWKK..",
        "....KKKKKKKK....",
        "................",
        "................",
        "................",
        "................"
      ]
    },

    // 作動した罠。踏むまでは表示しない（features.js の hidden）
    trapSprung: {
      palette: {
        ".": null,
        "K": "#2b2a26",   // 割れた床のふち
        "D": "#0d0f16",   // 穴
        "R": "#c8ccd8"    // 棘
      },
      pixels: [
        "................",
        "................",
        "................",
        "....KKKKKKKK....",
        "..KKDDDDDDDDKK..",
        ".KDDDDDDDDDDDDK.",
        ".KDDDDDDDDDDDDK.",
        ".KDRDDRDDRDDRDK.",
        ".KRRDRRDRRDRRDK.",
        "..KKDDDDDDDDKK..",
        "....KKKKKKKK....",
        "................",
        "................",
        "................",
        "................"
      ]
    },

    // --- 床の飾り（data/dungeonThemes.js） ---
    //
    // 当たり判定も効果も持たない、見た目だけのもの。
    // 「仕掛けと間違えない」ことが第一なので、輪郭を描かず・低い彩度で・床に散らす。

    // 苔（苔むす坑道）
    decoMoss: {
      palette: {
        ".": null,
        "G": "#3f6b46",   // 苔
        "D": "#2b4a30"    // 影
      },
      pixels: [
        "................",
        "...GG...........",
        "..GGGD......GG..",
        "..GGD......GGGD.",
        "...G.......GDG..",
        "...........GG...",
        "................",
        "......GG........",
        ".....GGGD.......",
        "....GGGGG.......",
        ".....GGD........",
        "................",
        "...........GG...",
        "..GG......GGGD..",
        ".GGGD......GG...",
        "..GG............"
      ]
    },

    // 小石（どのダンジョンでも使える汎用の飾り）
    decoPebble: {
      palette: {
        ".": null,
        "S": "#4a5262",
        "D": "#343b4a"
      },
      pixels: [
        "................",
        "................",
        "....SSD.........",
        "....SSD.........",
        "................",
        "................",
        "..........SD....",
        ".SD.......SSD...",
        ".SSD............",
        "................",
        "................",
        "......SD........",
        "................",
        "................",
        "...........SSD..",
        "................"
      ]
    },

    // 熱を持った床のひび（灼熱の亀裂）
    decoEmber: {
      palette: {
        ".": null,
        "Y": "#e88a3a",   // 光っているところ
        "R": "#b4432a",   // ひび
        "D": "#5a2216"    // ふち
      },
      pixels: [
        "................",
        "...D............",
        "...DR...........",
        "....RY..........",
        "....DR..........",
        ".....RD.........",
        ".....R..........",
        "................",
        "..........D.....",
        ".........DR.....",
        ".........RY.....",
        "........DR......",
        "........R.......",
        "................",
        "..RD............",
        "...R............"
      ]
    },

    // 古い骨（静寂の深層）
    decoBone: {
      palette: {
        ".": null,
        "B": "#8d919e",
        "D": "#5d6270"
      },
      pixels: [
        "................",
        "................",
        "..BB............",
        ".BDDB...........",
        "..BBB...........",
        "...BDB..........",
        "....BDB.........",
        ".....BDB........",
        "......BDB.......",
        ".......BDB......",
        "........BBB.....",
        "........BDDB....",
        ".........BB.....",
        "................",
        "..BD............",
        "...B............"
      ]
    }
  });
})(window.MyGame);
