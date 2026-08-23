/**
 * sprites.js
 * スプライト（見た目）の定義。
 *
 * file:// でも確実に動くよう、既定は「コード生成方式」：
 *   { pixels: [...文字列配列...], palette: { 記号: 色 } }
 *   → 起動時に AssetLoader がオフスクリーンCanvasへ描く。
 *
 * ★ 後からPNGへ差し替える場合は、そのエントリを次の形に書き換えるだけ：
 *   player: { src: "assets/sprites/player.png" }
 *   （AssetLoader が src を優先して画像を読み込む）
 *
 * palette の色に null（または未定義）を指定した記号は「透明」。
 */
(function (NS) {
  "use strict";

  NS.rawData.sprites = {
    player: {
      palette: {
        ".": null,        // 透明
        "K": "#101425",   // 輪郭・目の黒
        "B": "#4a7fe0",   // 体（青）
        "S": "#f2c9a0",   // 肌
        "W": "#ffffff"    // 目の白
      },
      pixels: [
        "................",
        ".....KKKKKK.....",
        "....KBBBBBBK....",
        "...KBBBBBBBBK...",
        "...KBBBBBBBBK...",
        "...KBSSSSSSBK...",
        "...KSSKWWKSSK...",
        "...KSSKWWKSSK...",
        "...KSSSSSSSSK...",
        "....KSSSSSSK....",
        "...KBBBBBBBBK...",
        "..KBBBBBBBBBBK..",
        "..KBBBBBBBBBBK..",
        "..KBBK..KBBK....",
        "...KK....KK.....",
        "................"
      ]
    },

    slime: {
      palette: {
        ".": null,
        "K": "#0f2a1e",   // 輪郭
        "G": "#5fd18c",   // 体（緑）
        "L": "#a8f0c4",   // ハイライト
        "W": "#ffffff"    // 目
      },
      pixels: [
        "................",
        "................",
        ".......KKK......",
        ".....KKGGGKK....",
        "....KGLGGGGGK...",
        "...KGLGGGGGGGK..",
        "...KGGGGGGGGGK..",
        "..KGGWWGGGWWGGK.",
        "..KGGWWGGGWWGGK.",
        "..KGGGGGGGGGGGK.",
        "..KGGGGGGGGGGGK.",
        "..KGGGGGGGGGGGK.",
        "..KGGGGGGGGGGGK.",
        "..KKGGGGGGGGGKK.",
        "....KKKKKKKKK...",
        "................"
      ]
    },

    kingSlime: {
      palette: {
        ".": null,
        "K": "#0a1f2e",   // 輪郭
        "B": "#4fb0d1",   // 体（青緑）
        "L": "#a8e8f0",   // ハイライト
        "Y": "#ffd75e",   // 王冠
        "W": "#ffffff"    // 目
      },
      pixels: [
        ".....Y.Y.Y......",
        "....YYYYYYY.....",
        "....YYYYYYY.....",
        "......KKK.......",
        "....KKBBBKK.....",
        "...KBLBBBBBK....",
        "..KBLBBBBBBBK...",
        "..KBBBBBBBBBK...",
        ".KBBWWBBBWWBBK..",
        ".KBBWWBBBWWBBK..",
        ".KBBBBBBBBBBBK..",
        ".KBBBBKKKBBBBK..",
        ".KBBBBBBBBBBBK..",
        ".KKBBBBBBBBBKK..",
        "..KKKKKKKKKKK...",
        "................"
      ]
    },

    batty: {
      palette: {
        ".": null,
        "K": "#1a1030",
        "P": "#8b6fd6",   // 体（紫）
        "D": "#5a44a0",   // 翼の影
        "W": "#ffe36e"    // 目
      },
      pixels: [
        "................",
        "................",
        "..K..........K..",
        ".KDK........KDK.",
        ".KDDK.KKK..KDDK.",
        ".KDDDKPPPKKDDDK.",
        ".KDDDKPPPKKDDDK.",
        ".KDDKPWPWPKKDDK.",
        "..KKKPPPPPKKKK..",
        "....KPWPWPK.....",
        "....KPPPPPK.....",
        ".....KPPPK......",
        "......KKK.......",
        "................",
        "................",
        "................"
      ]
    },

    // --- 苔むす坑道のモンスター ---

    mossRat: {
      palette: {
        ".": null,
        "K": "#221b12",   // 輪郭
        "G": "#9a8b70",   // 体（灰茶）
        "M": "#6fa84f",   // 背の苔
        "W": "#ffe36e",   // 目
        "T": "#7a6b52"    // 尻尾
      },
      pixels: [
        "................",
        "..KK........KK..",
        ".KGGK......KGGK.",
        ".KGGK......KGGK.",
        "..KGGKKKKKKGGK..",
        ".KGGMGGGGGGMGGK.",
        ".KGGGMGGGGMGGGK.",
        ".KGWWGGGGGGWWGK.",
        ".KGWWGGGGGGWWGK.",
        ".KGGGGGKKGGGGGK.",
        ".KGGGGGGGGGGGGK.",
        "..KGGGGGGGGGGK..",
        "TTKGGGGGGGGGGK..",
        "T.KKGGKKGGKKGK..",
        "....KK..KK......",
        "................"
      ]
    },

    rocky: {
      palette: {
        ".": null,
        "K": "#2b2a26",   // 輪郭
        "S": "#7d7a72",   // 岩肌
        "D": "#4f4d47",   // ひび
        "M": "#6fa84f",   // 苔
        "W": "#ffd75e"    // 目
      },
      pixels: [
        "................",
        "................",
        "....KKKKKKKK....",
        "...KSSSSSSSSK...",
        "..KSSMSSSSMSSK..",
        ".KSSSSSSSSSSSSK.",
        ".KSSWWSSSSWWSSK.",
        ".KSSWWSSSSWWSSK.",
        ".KSSSSSSSSSSSSK.",
        ".KSSSSSSSSSSSSK.",
        ".KSSSDDSSDDSSSK.",
        ".KSSSSSSSSSSSSK.",
        "..KSSSSSSSSSSK..",
        "...KKSSSSSSKK...",
        ".....KKKKKK.....",
        "................"
      ]
    },

    glowBug: {
      palette: {
        ".": null,
        "K": "#2a2410",   // 輪郭
        "Y": "#ffe36e",   // 光る部分
        "L": "#bfe4ff",   // 羽
        "B": "#6b5a2e",   // 胴
        "W": "#3a2f10"    // 目
      },
      pixels: [
        "................",
        "......KKKK......",
        ".....KYYYYK.....",
        "..K.KYWYYWYK.K..",
        ".KLK.KYYYYK.KLK.",
        ".KLLK.KKKK.KLLK.",
        ".KLLLKBBBBKLLLK.",
        "..KLLKBBBBKLLK..",
        "...KKKBBBBKKK...",
        "......KBBK......",
        "......KYYK......",
        ".....KYYYYK.....",
        "......KYYK......",
        ".......KK.......",
        "................",
        "................"
      ]
    },

    sporin: {
      palette: {
        ".": null,
        "K": "#241a2e",   // 輪郭
        "P": "#8a5fb0",   // 傘（紫）
        "W": "#e8d5ff",   // 傘のまだら
        "S": "#e8e0d0",   // 柄
        "E": "#2a1f38"    // 目
      },
      pixels: [
        "................",
        ".....KKKKKK.....",
        "...KKPPPPPPKK...",
        "..KPPPPWWPPPPK..",
        ".KPPWWPPPPWWPPK.",
        ".KPPPPPPPPPPPPK.",
        "KPPPPWWPPWWPPPPK",
        "KPPPPPPPPPPPPPPK",
        ".KKKKKKKKKKKKKK.",
        "....KSSSSSSK....",
        "....KSESSESK....",
        "....KSSSSSSK....",
        "....KSSSSSSK....",
        "....KSSSSSSK....",
        "....KKSSSSKK....",
        "......KKKK......"
      ]
    },

    mossGolem: {
      palette: {
        ".": null,
        "K": "#1d2418",   // 輪郭
        "S": "#6e6a5c",   // 石の体
        "M": "#5f9a45",   // 苔
        "W": "#a8f0c4"    // 光る目
      },
      pixels: [
        "..KKKK....KKKK..",
        ".KMMMMKKKKMMMMK.",
        ".KMSSMMMMMMSSMK.",
        "KSSSSSSSSSSSSSSK",
        "KSSMSSSSSSSSMSSK",
        "KSWWSSSSSSSSWWSK",
        "KSWWSSSSSSSSWWSK",
        "KSSSSSKKKKSSSSSK",
        "KSSSSSSSSSSSSSSK",
        ".KSSMSSSSSSMSSK.",
        ".KSSSSSSSSSSSSK.",
        "..KSSSSSSSSSSK..",
        "..KSSKKKKKKSSK..",
        ".KSSK......KSSK.",
        ".KSSK......KSSK.",
        ".KKKK......KKKK."
      ]
    },

    flamin: {
      palette: {
        ".": null,
        "K": "#3a1002",
        "R": "#e8542a",   // 体（赤）
        "O": "#ffa32e",   // 炎（橙）
        "Y": "#ffe66e",   // 炎（黄）
        "W": "#ffffff"
      },
      pixels: [
        "................",
        ".......Y........",
        "......YOY.......",
        ".....YOOOY......",
        "....KYOOOYK.....",
        "...KRROOORRK....",
        "..KRRRRRRRRRK...",
        "..KRRWRRRWRRK...",
        "..KRRWRRRWRRK...",
        "..KRRRRRRRRRK...",
        "..KRRRRRRRRRK...",
        "...KRRRRRRRK....",
        "....KRRKKRRK....",
        "....KKK..KKK....",
        "................",
        "................"
      ]
    }
  };
})(window.MyGame);
