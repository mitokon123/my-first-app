/**
 * sprites_ui.js
 * 画面の飾りに使う絵。モンスターでもダンジョンの中身でもないもの。
 *
 *   icon〇〇  … 拠点メニューの項目につく絵
 *   campfire … 拠点の背景のたき火
 *
 * どれも 16×16。メニューでは20px前後に拡大されるので、
 * 細かい模様は入れず「輪郭で形が分かる」ことを優先している。
 *
 * 書き方（パレット・pixels）と分け方の方針は data/sprites.js を参照。
 */
(function (NS) {
  "use strict";

  NS.extend("sprites", {

    // --- 拠点メニューのアイコン ---

    // ダンジョンへ潜る（岩に開いた入口）
    iconDungeon: {
      palette: {
        ".": null,
        "K": "#2b2a26",   // 輪郭
        "S": "#8b8778",   // 岩
        "D": "#05070c"    // 奥の闇
      },
      pixels: [
        "................",
        "................",
        "...KKKKKKKKKK...",
        "..KSSSSSSSSSSK..",
        "..KSSSKKKKSSSK..",
        "..KSSKDDDDKSSK..",
        "..KSKDDDDDDKSK..",
        "..KSKDDDDDDKSK..",
        "..KSKDDDDDDKSK..",
        "..KSKDDDDDDKSK..",
        "..KSKDDDDDDKSK..",
        "..KSKDDDDDDKSK..",
        "..KSKDDDDDDKSK..",
        "..KKKDDDDDDKKK..",
        "................",
        "................"
      ]
    },

    // 仲間（並んだ2体のうしろ姿）
    iconParty: {
      palette: {
        ".": null,
        "K": "#1a2030",
        "G": "#5fd18c",
        "B": "#6f86c9"
      },
      pixels: [
        "................",
        "................",
        "................",
        "....KKK...KKK...",
        "...KGGGK.KBBBK..",
        "...KGGGK.KBBBK..",
        "....KKK...KKK...",
        "..KKKKKK.KKKKK..",
        ".KGGGGGGKBBBBBK.",
        ".KGGGGGGKBBBBBK.",
        ".KGGGGGGKBBBBBK.",
        ".KGGGGGGKBBBBBK.",
        ".KGGGGGGKBBBBBK.",
        "..KKKKKK.KKKKK..",
        "................",
        "................"
      ]
    },

    // ショップ（金貨の入った袋）
    iconShop: {
      palette: {
        ".": null,
        "K": "#3a2a10",
        "B": "#8a5a2e",   // 革
        "Y": "#ffd75e"    // 金貨
      },
      pixels: [
        "................",
        "................",
        ".......KK.......",
        "......KYYK......",
        ".....KYYYYK.....",
        "....KKKKKKKK....",
        "...KBBBBBBBBK...",
        "..KBBBYYYYBBBK..",
        "..KBBYYYYYYBBK..",
        "..KBBYYYYYYBBK..",
        "..KBBBYYYYBBBK..",
        "...KBBBBBBBBK...",
        "....KKKKKKKK....",
        "................",
        "................",
        "................"
      ]
    },

    // 工房（かなづち）
    // 加護の編成。深淵の加護画面と同じ「輪の中の光」を小さくしたもの
    iconBlessing: {
      palette: {
        ".": null,
        "K": "#1a1430",   // 輪郭
        "R": "#8b6fd6",   // 輪
        "W": "#e6e0ff"    // 中の光
      },
      pixels: [
        "................",
        "................",
        ".....KKKKKK.....",
        "...KKRRRRRRKK...",
        "..KRRK....KRRK..",
        "..KRK..WW..KRK..",
        ".KRK..WWWW..KRK.",
        ".KRK.WWWWWW.KRK.",
        ".KRK.WWWWWW.KRK.",
        ".KRK..WWWW..KRK.",
        "..KRK..WW..KRK..",
        "..KRRK....KRRK..",
        "...KKRRRRRRKK...",
        ".....KKKKKK.....",
        "................",
        "................"
      ]
    },

    iconCraft: {
      palette: {
        ".": null,
        "K": "#24201a",
        "S": "#b0b6c4",   // 金属
        "W": "#a06a34"    // 柄
      },
      pixels: [
        "................",
        "................",
        "...KKKKKKKK.....",
        "..KSSSSSSSSK....",
        "..KSSSSSSSSK....",
        "..KSSSSSSSSK....",
        "..KKKKSSKKKK....",
        "......KSSK......",
        "......KWWK......",
        "......KWWK......",
        "......KWWK......",
        "......KWWK......",
        "......KWWK......",
        ".......KK.......",
        "................",
        "................"
      ]
    },

    // 持ち物（ふた付きのかばん）
    iconItems: {
      palette: {
        ".": null,
        "K": "#2a1a0c",
        "B": "#a06a34",   // 革
        "W": "#744a20",   // ふた
        "Y": "#ffd75e"    // 留め金
      },
      pixels: [
        "................",
        "................",
        "................",
        "....KKKKKKKK....",
        "...KWWWWWWWWK...",
        "...KKKKKKKKKK...",
        "..KBBBBBBBBBBK..",
        "..KBBBBBBBBBBK..",
        "..KBBYYBBBBBBK..",
        "..KBBYYBBBBBBK..",
        "..KBBBBBBBBBBK..",
        "..KBBBBBBBBBBK..",
        "..KBBBBBBBBBBK..",
        "...KKKKKKKKKK...",
        "................",
        "................"
      ]
    },

    // 図鑑（開いた本）
    iconDex: {
      palette: {
        ".": null,
        "K": "#2a2438",
        "W": "#e8e0d0",   // 紙
        "L": "#7b86a4"    // 文字
      },
      pixels: [
        "................",
        "................",
        "..KKKKKKKKKKKK..",
        ".KWWWWWKKWWWWWK.",
        ".KWLLLWKKWLLLWK.",
        ".KWWWWWKKWWWWWK.",
        ".KWWWWWKKWWWWWK.",
        ".KWLLLWKKWLLLWK.",
        ".KWWWWWKKWWWWWK.",
        ".KWWWWWKKWWWWWK.",
        ".KWLLLWKKWLLLWK.",
        "..KKKKKKKKKKKK..",
        "................",
        "................",
        "................",
        "................"
      ]
    },

    // セーブ（巻物）
    iconSave: {
      palette: {
        ".": null,
        "K": "#3a2f18",
        "C": "#a06a34",   // 巻いてある部分
        "W": "#e8e0d0"    // 紙
      },
      pixels: [
        "................",
        "................",
        "..KKKKKKKKKKKK..",
        ".KCCCCCCCCCCCCK.",
        ".KCCCCCCCCCCCCK.",
        "..KKKKKKKKKKKK..",
        "...KWWWWWWWWK...",
        "...KWKKKKKKWK...",
        "...KWWWWWWWWK...",
        "...KWKKKKKKWK...",
        "...KWWWWWWWWK...",
        "..KKKKKKKKKKKK..",
        ".KCCCCCCCCCCCCK.",
        ".KCCCCCCCCCCCCK.",
        "..KKKKKKKKKKKK..",
        "................"
      ]
    },

    // 設定（歯車）
    iconSettings: {
      palette: {
        ".": null,
        "K": "#2a2f3e",
        "S": "#9aa3bc",   // 金属
        "D": "#10141f"    // 中央の穴
      },
      pixels: [
        "................",
        "................",
        ".....KKKKKK.....",
        "...KKKSSSSKKK...",
        "...KSSSSSSSSK...",
        "..KKSSSKKSSSKK..",
        "..KSSSKDDKSSSK..",
        "..KSSKDDDDKSSK..",
        "..KSSKDDDDKSSK..",
        "..KSSSKDDKSSSK..",
        "..KKSSSKKSSSKK..",
        "...KSSSSSSSSK...",
        "...KKKSSSSKKK...",
        ".....KKKKKK.....",
        "................",
        "................"
      ]
    },

    // --- 店主（data/shop.js の keeper から参照する） ---

    // よろず屋。深い頭巾をかぶった行商
    keeperGeneral: {
      palette: {
        ".": null,
        "K": "#241a12",   // 輪郭
        "H": "#5a4a7a",   // 頭巾
        "S": "#f2c9a0",   // 顔
        "W": "#101425",   // 目
        "C": "#7a5a3a",   // 外套
        "Y": "#ffd75e"    // 帯
      },
      pixels: [
        "................",
        "................",
        ".....KKKKKK.....",
        "....KHHHHHHK....",
        "...KHHHHHHHHK...",
        "...KHSSSSSSHK...",
        "...KSSWSSWSSK...",
        "...KSSSSSSSSK...",
        "...KSSSKKSSSK...",
        "....KSSSSSSK....",
        "...KCCCCCCCCK...",
        "..KCCCCCCCCCCK..",
        "..KCCCYYYYCCCK..",
        "..KCCCCCCCCCCK..",
        "..KKCCCCCCCCKK..",
        "...KKKKKKKKKK..."
      ]
    },

    // 加護を売る謎の商人。深いフードで顔を隠し、目だけが光っている。
    // 深層をクリアするまでショップに並ばない
    keeperMystic: {
      palette: {
        ".": null,
        "K": "#0d0a14",   // 輪郭
        "H": "#221a33",   // 深いフード
        "D": "#100c1a",   // フードの影（顔があるはずのところ）
        "W": "#b98bff",   // 光る目
        "C": "#1a1428",   // 外套
        "Y": "#8b6fd6"    // 帯と縁飾り
      },
      pixels: [
        "................",
        "................",
        ".....KKKKKK.....",
        "....KHHHHHHK....",
        "...KHHHHHHHHK...",
        "..KHHDDDDDDHHK..",
        "..KHDDDDDDDDHK..",
        "..KHDDWDDWDDHK..",
        "..KHDDDDDDDDHK..",
        "...KHDDDDDDHK...",
        "...KYCCCCCCYK...",
        "..KCCCCCCCCCCK..",
        "..KCCCYYYYCCCK..",
        "..KCCCCCCCCCCK..",
        "..KKCCCCCCCCKK..",
        "...KKKKKKKKKK..."
      ]
    },

    // 鉢巻きと前掛けの職人。今はどの店にも使っていないが、
    // 店を増やすときのためにそのまま置いてある
    // （data/shop.js の keeper に "keeperSmith" と書けば立つ）
    keeperSmith: {
      palette: {
        ".": null,
        "K": "#201814",
        "R": "#c0392b",   // 鉢巻き
        "S": "#f2c9a0",   // 顔
        "W": "#101425",   // 目
        "A": "#6b4a2e",   // 前掛け
        "B": "#8a8f9c"    // 留め具
      },
      pixels: [
        "................",
        "................",
        "....KKKKKKKK....",
        "...KRRRRRRRRK...",
        "...KSSSSSSSSK...",
        "...KSWSSSSWSK...",
        "...KSSSSSSSSK...",
        "...KSSKKKKSSK...",
        "....KSSSSSSK....",
        "..KKAAAAAAAAKK..",
        ".KAAAAAAAAAAAAK.",
        ".KAAAABBBBAAAAK.",
        ".KAAAAAAAAAAAAK.",
        ".KAAAAAAAAAAAAK.",
        ".KKAAAAAAAAAAKK.",
        "..KKKKKKKKKKKK.."
      ]
    },

    // --- 拠点の背景 ---

    // たき火。data/motions.js の blaze で揺らして使う
    campfire: {
      palette: {
        ".": null,
        "K": "#2a1a0c",   // 影
        "W": "#8a5a2e",   // 薪
        "R": "#e8542a",   // 炎（外）
        "O": "#ffa32e",   // 炎（中）
        "Y": "#ffe66e"    // 炎（芯）
      },
      pixels: [
        "................",
        "................",
        "................",
        ".......Y........",
        "......YOY.......",
        "......YOY.......",
        ".....YOOOY......",
        ".....YOOOY......",
        "....ROOOOOR.....",
        "....ROOOOOR.....",
        "...RROOOOORR....",
        "...RRRRRRRRR....",
        "..WWWKKKKKWWW...",
        ".WWWKKKKKKKWWW..",
        "..KKKKKKKKKKK...",
        "................"
      ]
    }
  });
})(window.MyGame);
