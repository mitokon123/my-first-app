/**
 * sprites_icons.js
 * 属性・状態異常・ステータス（バフ／デバフ）の小さな絵。
 *
 * どれも 16×16。文字の隣に 12〜16px で出すので、
 * 細かい模様は入れず「色と形」で見分けられることを優先している。
 *
 *   iconElem〇〇   … 属性（data/elements.js の icon から指す）
 *   iconStatus〇〇 … 状態異常（data/statuses.js の icon から指す）
 *   iconStat〇〇   … ステータス。バフ／デバフの印に使う（data/ui.js の icons.stats から指す）
 *   iconArrowUp / iconArrowDown … ステータスの絵の右下に重ねる矢印（上がった／下がった）
 *
 * 書き方（パレット・pixels）は data/sprites.js を参照。
 * 光は左上から。K が輪郭、H が光、D が影。
 */
(function (NS) {
  "use strict";

  NS.extend("sprites", {

    // ================= 属性 =================

    // 火：ゆらめく炎。芯が黄色く、外へ行くほど赤い
    iconElemFire: {
      palette: { ".": null, "K": "#5a1a08", "R": "#e8542a", "O": "#ff9a3c", "Y": "#ffe27a" },
      pixels: [
        "................",
        ".......K........",
        "......KRK.......",
        "......KRK...K...",
        ".....KRRK..KRK..",
        ".....KRRRK.KRK..",
        "....KRROORKRRK..",
        "....KROOYORRRK..",
        "...KRROYYYORRK..",
        "...KROOYYYOORK..",
        "...KROYYYYYORK..",
        "...KROOYYYOORK..",
        "....KROOOOORK...",
        ".....KRRRRRK....",
        "......KKKKK.....",
        "................"
      ]
    },

    // 水：しずく。左上に光の点
    iconElemWater: {
      palette: { ".": null, "K": "#123a6a", "B": "#4fb0d1", "D": "#2a78b8", "H": "#d8f4ff" },
      pixels: [
        "................",
        ".......K........",
        ".......K........",
        "......KBK.......",
        "......KBK.......",
        ".....KBBBK......",
        ".....KBBBK......",
        "....KHBBBBK.....",
        "....KHBBBBDK....",
        "...KBBBBBBDDK...",
        "...KBBBBBBDDK...",
        "...KBBBBBDDDK...",
        "....KBBBDDDK....",
        ".....KBDDDK.....",
        "......KKKK......",
        "................"
      ]
    },

    // 風：巻いた風の筋（渦）
    iconElemWind: {
      palette: { ".": null, "K": "#1e5a3a", "G": "#7fe0a8", "H": "#d6fff0" },
      pixels: [
        "................",
        "................",
        "......KKKKK.....",
        "....KKGGHGGKK...",
        "...KGGKKKKKGGK..",
        "...KGK.....KGK..",
        "..KGK...KKK.KGK.",
        "..KGK..KGHGK.KK.",
        "..KGK..KGK.K....",
        "..KGK..KGK......",
        "...KGK.KGGK.....",
        "...KGGK.KGGK....",
        "....KGGKKKGK....",
        ".....KKGGGK.....",
        ".......KKK......",
        "................"
      ]
    },

    // 地：角ばった岩
    iconElemEarth: {
      palette: { ".": null, "K": "#3a2a14", "A": "#a8804a", "D": "#7a5a30", "H": "#d8b478" },
      pixels: [
        "................",
        "................",
        "........KK......",
        ".......KHAK.....",
        "......KHAAAK....",
        ".....KHAAAADK...",
        "....KHAAAAADK...",
        "...KHAAAAAADDK..",
        "...KAAAAAADDDK..",
        "..KAAAAAADDDDK..",
        "..KAAAAADDDDDK..",
        "..KAAAADDDDDDK..",
        "..KAAADDDDDDDK..",
        "..KKKKKKKKKKKK..",
        "................",
        "................"
      ]
    },

    // 雷：いなずま
    iconElemThunder: {
      palette: { ".": null, "K": "#5a4a08", "Y": "#ffe25e", "H": "#fff8c8" },
      pixels: [
        "................",
        "........KKKK....",
        ".......KHYYK....",
        "......KHYYK.....",
        "......KYYYK.....",
        ".....KHYYK......",
        ".....KYYYKKK....",
        "....KHYYYYYYK...",
        "....KKKKKYYK....",
        "........KYYK....",
        ".......KYYK.....",
        ".......KYK......",
        "......KYK.......",
        "......KK........",
        ".....K..........",
        "................"
      ]
    },

    // 光：輝く星
    iconElemLight: {
      palette: { ".": null, "K": "#6a5a10", "Y": "#ffe9a0", "H": "#ffffff" },
      pixels: [
        "................",
        ".......KK.......",
        ".......KYK......",
        ".......KYK......",
        "...K...KYK...K..",
        "...KK.KHYYK.KK..",
        "....KKKHYYKKK...",
        ".....KHHYYYK....",
        ".....KYYYYYK....",
        "....KKKYYYKKK...",
        "...KK.KYYYK.KK..",
        "...K...KYK...K..",
        ".......KYK......",
        ".......KYK......",
        ".......KK.......",
        "................"
      ]
    },

    // 闇：三日月
    iconElemDark: {
      palette: { ".": null, "K": "#1a0e2c", "P": "#8a5fb0", "D": "#5a3a80", "H": "#d0b0ff" },
      pixels: [
        "................",
        "................",
        ".......KKKK.....",
        ".....KKHPPPK....",
        "....KHPPKKKK....",
        "...KHPPK........",
        "...KPPK.........",
        "..KPPK..........",
        "..KPPK..........",
        "..KPPDK.........",
        "...KPDDK........",
        "...KDDDDK.......",
        "....KDDDDKKKK...",
        ".....KKDDDDDK...",
        ".......KKKKK....",
        "................"
      ]
    },

    // ================= 状態異常 =================

    // 毒：紫の泡が立つしずく
    iconStatusPoison: {
      palette: { ".": null, "K": "#2c1440", "P": "#9a5fd1", "D": "#6a3a9a", "H": "#e0c0ff", "G": "#7fd06a" },
      pixels: [
        "................",
        "...KK...........",
        "..KGGK..K.......",
        "..KGGK.KGK......",
        "...KK...K.......",
        "......KK........",
        ".....KPPK.......",
        "....KHPPPK......",
        "....KHPPPDK.....",
        "...KPPPPPDDK....",
        "...KPPPPPDDK....",
        "...KPPPPDDDK....",
        "....KPPDDDK.....",
        ".....KDDDK......",
        "......KKK.......",
        "................"
      ]
    },

    // 麻痺：ぐるぐる回る星（目を回している）
    iconStatusParalysis: {
      palette: { ".": null, "K": "#5a4a08", "Y": "#ffd75e", "H": "#fff4c0" },
      pixels: [
        "................",
        "......K.........",
        ".....KYK....KK..",
        "...KKKYKKK.KYK..",
        "...KHYYYYK.KK...",
        "....KYYYK.......",
        "...KYYKYYK......",
        "...KK...KK......",
        "..........K.....",
        ".........KYK....",
        ".KK....KKKYKKK..",
        "KYK....KHYYYYK..",
        ".KK.....KYYYK...",
        ".......KYYKYYK..",
        ".......KK...KK..",
        "................"
      ]
    },

    // 眠り：Z が3つ
    iconStatusSleep: {
      palette: { ".": null, "K": "#1a2a5a", "B": "#8fb0ff", "H": "#e0ecff" },
      pixels: [
        "................",
        "........KKKKKK..",
        "........KHBBBK..",
        "........KKKBBK..",
        "..........KBK...",
        ".........KBK....",
        "........KBBKKK..",
        "........KBBBBK..",
        "...KKKKKKKKKKK..",
        "...KHBBBK.......",
        "...KKKBBK.......",
        ".....KBK........",
        "....KBK.........",
        "...KBBKKK.......",
        "...KBBBBK.......",
        "...KKKKKK......."
      ]
    },

    // 封印：錠前
    iconStatusSeal: {
      palette: { ".": null, "K": "#2a2a30", "S": "#9a9aa8", "D": "#5a5a68", "Y": "#d8b048", "H": "#e8e8f0" },
      pixels: [
        "................",
        ".....KKKKK......",
        "....KSHHHSK.....",
        "...KSK...KSK....",
        "...KSK...KSK....",
        "...KSK...KSK....",
        "..KKKKKKKKKKK...",
        "..KYYYYYYYYYK...",
        "..KYYYYKYYYYK...",
        "..KYYYKDKYYYK...",
        "..KYYYYKYYYYK...",
        "..KYYYYKYYYYK...",
        "..KYYYYYYYYYK...",
        "..KDDDDDDDDDK...",
        "..KKKKKKKKKKK...",
        "................"
      ]
    },

    // 盲目：閉じた目（まつげ付き）
    iconStatusBlind: {
      palette: { ".": null, "K": "#3a3a48", "S": "#b0b0c0" },
      pixels: [
        "................",
        "................",
        "................",
        "................",
        "................",
        "..KK........KK..",
        "...KK......KK...",
        "....KKK..KKK....",
        "......KKKK......",
        "....KSKKKKSK....",
        "...KS.K..K.SK...",
        "...K..KS.SK..K..",
        "......K..K......",
        "................",
        "................",
        "................"
      ]
    },

    // 呪い：紫の炎のような影
    iconStatusCurse: {
      palette: { ".": null, "K": "#1a0a2a", "P": "#7a3aa8", "D": "#4a1a70", "H": "#c080ff" },
      pixels: [
        "................",
        "........K.......",
        ".......KPK......",
        "...K...KPK..K...",
        "..KPK.KHPPK.KPK.",
        "..KPK.KHPPPKKPK.",
        "..KPPKKPPPPPPPK.",
        "..KPPPPPPDDPPPK.",
        "...KPPPKDDDKPK..",
        "...KPPKDKDDKPK..",
        "...KPPKDDDDKPK..",
        "....KPPKDDKPK...",
        "....KPPPKKPPK...",
        ".....KPPPPPK....",
        "......KKKKK.....",
        "................"
      ]
    },

    // 即死：どくろ
    iconStatusInstantDeath: {
      palette: { ".": null, "K": "#101018", "W": "#e8e8f0", "D": "#a0a0b0" },
      pixels: [
        "................",
        ".....KKKKKK.....",
        "....KWWWWWWK....",
        "...KWWWWWWWWK...",
        "...KWWWWWWWWK...",
        "...KWKKWWKKWK...",
        "...KKKKWWKKKK...",
        "...KWKKWWKKWK...",
        "...KWWWWWWWWK...",
        "....KWWKKWWK....",
        ".....KKWWKK.....",
        ".....KWKKWK.....",
        ".....KDKKDK.....",
        ".....KKKKKK.....",
        "................",
        "................"
      ]
    },

    // ================= ステータス（バフ／デバフの印） =================

    // HP：ハート
    iconStatHp: {
      palette: { ".": null, "K": "#5a1020", "R": "#e8425a", "H": "#ffb0c0" },
      pixels: [
        "................",
        "................",
        "...KKK...KKK....",
        "..KHRRK.KRRRK...",
        ".KHRRRRKRRRRRK..",
        ".KRRRRRRRRRRRK..",
        ".KRRRRRRRRRRRK..",
        ".KRRRRRRRRRRRK..",
        "..KRRRRRRRRRK...",
        "...KRRRRRRRK....",
        "....KRRRRRK.....",
        ".....KRRRK......",
        "......KRK.......",
        ".......K........",
        "................",
        "................"
      ]
    },

    // 攻撃：剣
    iconStatAttack: {
      palette: { ".": null, "K": "#2a2a30", "S": "#c8ccd8", "H": "#ffffff", "B": "#8a5a2e", "Y": "#d8b048" },
      pixels: [
        "................",
        "...........KK...",
        "..........KHSK..",
        ".........KHSSK..",
        "........KHSSK...",
        ".......KHSSK....",
        "......KHSSK.....",
        ".....KHSSK......",
        "..K.KHSSK.......",
        "..KKKSSK........",
        "..KYYYK.........",
        ".KBKYYYK........",
        "KBBK.KKK........",
        ".KBK............",
        "..K.............",
        "................"
      ]
    },

    // 防御：盾
    iconStatDefense: {
      palette: { ".": null, "K": "#12305a", "B": "#4f80d1", "D": "#2a5aa0", "H": "#c0dcff" },
      pixels: [
        "................",
        "...KKKKKKKKK....",
        "..KHBBBBBBBBK...",
        "..KHBBBBBBBDK...",
        "..KHBBBKBBBDK...",
        "..KHBBKHKBBDK...",
        "..KBBBKHKBDDK...",
        "..KBBBBKBBDDK...",
        "..KBBBBBBBDDK...",
        "...KBBBBBDDK....",
        "...KBBBBDDDK....",
        "....KBBBDDK.....",
        ".....KBDDK......",
        "......KDK.......",
        ".......K........",
        "................"
      ]
    },

    // 素早さ：羽根
    iconStatSpeed: {
      palette: { ".": null, "K": "#1a4a5a", "C": "#7fd9e8", "H": "#e0fbff", "D": "#3a90a8" },
      pixels: [
        "................",
        "...........KK...",
        "..........KHCK..",
        ".........KHCCK..",
        "........KHCCDK..",
        ".......KHCCDK...",
        "......KHCCDDK...",
        ".....KHCCDDK....",
        "....KHCCDDK.....",
        "....KCCDDK......",
        "...KCCDDK.......",
        "...KCDDK........",
        "..KDDKK.........",
        "..KKK...........",
        ".K..............",
        "................"
      ]
    },

    // PP：光る玉
    iconStatPp: {
      palette: { ".": null, "K": "#2a1a5a", "P": "#8f7fe8", "D": "#5a48b0", "H": "#e8e0ff" },
      pixels: [
        "................",
        "................",
        ".....KKKKKK.....",
        "....KHHPPPPK....",
        "...KHHPPPPPPK...",
        "...KHPPPPPPDK...",
        "..KHPPPPPPPDDK..",
        "..KPPPPPPPPDDK..",
        "..KPPPPPPPDDDK..",
        "..KPPPPPPDDDDK..",
        "...KPPPPDDDDK...",
        "...KPPPDDDDDK...",
        "....KPDDDDDK....",
        ".....KKKKKK.....",
        "................",
        "................"
      ]
    },

    // 与ダメージ・被ダメージ（「効」）：はじける印
    iconStatOther: {
      palette: { ".": null, "K": "#5a3a08", "Y": "#ffd75e", "H": "#fff4c0", "O": "#ff9a3c" },
      pixels: [
        "................",
        ".......K........",
        "..K...KYK...K...",
        "..KK..KYK..KK...",
        "...KK.KYK.KK....",
        "....KKKHKKK.....",
        "..KKKHHHHHKKK...",
        ".KYYYHHOHHYYYK..",
        "..KKKHHHHHKKK...",
        "....KKKOKKK.....",
        "...KK.KOK.KK....",
        "..KK..KOK..KK...",
        "..K...KOK...K...",
        ".......K........",
        "................",
        "................"
      ]
    },

    // 矢印。ステータスの絵の右下に重ねる（上がった＝緑、下がった＝赤）
    iconArrowUp: {
      palette: { ".": null, "K": "#0a2a14", "G": "#5fd18c" },
      pixels: [
        "................",
        "................",
        "................",
        "................",
        "................",
        "................",
        "................",
        "................",
        "............K...",
        "...........KGK..",
        "..........KGGGK.",
        ".........KGGGGGK",
        ".........KKKGKKK",
        "...........KGK..",
        "...........KGK..",
        "...........KKK.."
      ]
    },

    iconArrowDown: {
      palette: { ".": null, "K": "#3a0a0a", "R": "#e8542a" },
      pixels: [
        "................",
        "................",
        "................",
        "................",
        "................",
        "................",
        "................",
        "................",
        "...........KKK..",
        "...........KRK..",
        "...........KRK..",
        ".........KKKRKKK",
        ".........KRRRRRK",
        "..........KRRRK.",
        "...........KRK..",
        "............K..."
      ]
    }
  });
})(window.MyGame);
