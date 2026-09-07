/**
 * sprites_abyss.js
 * 地方「深淵（abyss）」に出るモンスターの絵。
 *
 * ここに入るのは、data/dungeons.js で region: "abyss" になっている
 * ダンジョン（苔むす坑道・灼熱の亀裂・静寂の深層）に出る種族。
 *
 * 別の地方が増えたら data/sprites_〇〇.js を新しく作る。
 * 書き方（パレット・pixels）と分け方の方針は data/sprites.js を参照。
 */
(function (NS) {
  "use strict";

  NS.extend("sprites", {

    // --- どの階でも出るもの ---

    /**
     * α-5で 32×32 に描き直した。3枚（slime / slimeStretch / slimeSquash）とも
     * 「16×16をそのまま2倍に拡大してから塗り直す」方式（やり方は batty のコメント参照）。
     *
     * ★ 3枚とも足元の行が29でそろっていることを確認してある。
     *   ここがずれると、跳ねる動き（slimeIdle）で絵が切り替わるたびに浮き上がる。
     *   縦横の関係も保たれている：
     *     伸びる 28×24 ／ ふつう 26×26 ／ 潰れる 22×32
     *
     * ハイライト（L）は作者が置いた位置に戻してある。
     * 塗り直しに任せると輪郭沿いの明るいふちに吸収されて、照りが消える。
     */
    slime: {
      palette: {
        ".": null,
        "K": "#071a12",   // 輪郭
        "N": "#16402c",   // 面と面のさかい・いちばん深い影
        "D": "#2f8a5d",   // 影
        "G": "#5fd18c",   // 体（緑）
        "H": "#86e5ad",   // 光の当たる面
        "L": "#a8f0c4",   // ハイライト
        "W": "#ffffff"    // 目
      },
      pixels: [
        "................................",
        "................................",
        "................................",
        "................................",
        "...............KKKK.............",
        "..............KNNNNK............",
        "...........KKKHHHHHHKKK.........",
        "..........KNNNHGGGGHNNNK........",
        ".........KHHLLGGGGGGHHHHK.......",
        "........KNHGLLGGGGGGGGGHNK......",
        ".......KHHLLGGGGGGGGGGGGHHK.....",
        "......KNHGLLGGGGGGGGGGGGGHNK....",
        "......KNHGGGGGGGGGGGGGGGGDNK....",
        "......KNHGGGGGGGGGGGGGGGGDNK....",
        ".....KHHGGWWWWGGGGGGWWWWGGDDK...",
        "....KNHGGGWWWWGGGGGGWWWWGGGDNK..",
        "....KNHGGGWWWWGGGGGGWWWWGGGDNK..",
        "....KNHGGGWWWWGGGGGGWWWWGGGDNK..",
        "....KNHGGGGGGGGGGGGGGGGGGGGDNK..",
        "....KNHGGGGGGGGGGGGGGGGGGGGDNK..",
        "....KNHGGGGGGGGGGGGGGGGGGGGDNK..",
        "....KNHGGGGGGGGGGGGGGGGGGGGDNK..",
        "....KNHGGGGGGGGGGGGGGGGGGGGDNK..",
        "....KNHGGGGGGGGGGGGGGGGGGGGDNK..",
        "....KNHGGGGGGGGGGGGGGGGGGGGDNK..",
        "....KNHDGGGGGGGGGGGGGGGGGGDDNK..",
        "....KNNNDGGGGGGGGGGGGGGGGDNNNK..",
        ".....KKKDDDDDDDDDDDDDDDDDDKKK...",
        "........KNNNNNNNNNNNNNNNNK......",
        ".........KKKKKKKKKKKKKKKK.......",
        "................................",
        "................................"
      ]
    },

    // スライムの潰れた姿。地面に着いた瞬間に使う（横に広がり、背が低い）
    //   足元（下から2行目）を slime と揃えてあるので、切り替えても浮き上がらない
    slimeSquash: {
      palette: {
        ".": null,
        "K": "#071a12",
        "N": "#16402c",
        "D": "#2f8a5d",
        "G": "#5fd18c",
        "H": "#86e5ad",
        "L": "#a8f0c4",
        "W": "#ffffff"
      },
      pixels: [
        "................................",
        "................................",
        "................................",
        "................................",
        "................................",
        "................................",
        "................................",
        "................................",
        ".............KKKKKK.............",
        "............KNNNNNNK............",
        ".......KKKKKHHHHHHHHKKKKK.......",
        "......KNNNNNHGGGGGGHNNNNNK......",
        "...KKKHHLLHHGGGGGGGGHHHHHHKKK...",
        "..KNNNHGLLGGGGGGGGGGGGGGGHNNNK..",
        "..KNHHGGGGGGGGGGGGGGGGGGGGHHNK..",
        "..KNHGGGGGGGGGGGGGGGGGGGGGGDNK..",
        ".KHHGGWWWWGGGGGGGGGGGGWWWWGGDDK.",
        "KNHGGGWWWWGGGGGGGGGGGGWWWWGGGDNK",
        "KNHGGGWWWWGGGGGGGGGGGGWWWWGGGDNK",
        "KNHGGGWWWWGGGGGGGGGGGGWWWWGGGDNK",
        "KNHGGGGGGGGGGGGGGGGGGGGGGGGGGDNK",
        "KNHGGGGGGGGGGGGGGGGGGGGGGGGGGDNK",
        "KNHGGGGGGGGGGGGGGGGGGGGGGGGGGDNK",
        "KNHGGGGGGGGGGGGGGGGGGGGGGGGGGDNK",
        "KNHGGGGGGGGGGGGGGGGGGGGGGGGGGDNK",
        "KNHGGGGGGGGGGGGGGGGGGGGGGGGGGDNK",
        "KNNNGGGGGGGGGGGGGGGGGGGGGGGGNNNK",
        ".KNNDDDDDDDDDDDDDDDDDDDDDDDDNNK.",
        "..KNNNNNNNNNNNNNNNNNNNNNNNNNNK..",
        "...KKKKKKKKKKKKKKKKKKKKKKKKKK...",
        "................................",
        "................................"
      ]
    },

    // スライムの伸びた姿。跳んでいる途中に使う（縦に伸びて、細い）
    slimeStretch: {
      palette: {
        ".": null,
        "K": "#071a12",
        "N": "#16402c",
        "D": "#2f8a5d",
        "G": "#5fd18c",
        "H": "#86e5ad",
        "L": "#a8f0c4",
        "W": "#ffffff"
      },
      pixels: [
        "................................",
        "................................",
        ".............KKKK...............",
        "............KNNNNK..............",
        "...........KHHHHHHK.............",
        "..........KNHGGGGHNK............",
        ".........KHHLLGGGGHHK...........",
        "........KNHGLLGGGGGHNK..........",
        ".......KHHLLGGGGGGGGHHKKK.......",
        "......KNHGLLGGGGGGGGGHHHNK......",
        ".....KHHGGGGGGGGGGGGGGHHHHK.....",
        "....KNHGGGGGGGGGGGGGGGGGGHNK....",
        "....KNHGGGGGGGGGGGGGGGGGGDNK....",
        "....KNHGGGGGGGGGGGGGGGGGGDNK....",
        "....KNHGGGWWWWGGGGWWWWGGGDNK....",
        "....KNHGGGWWWWGGGGWWWWGGGDNK....",
        "....KNHGGGWWWWGGGGWWWWGGGDNK....",
        "....KNHGGGWWWWGGGGWWWWGGGDNK....",
        "....KNHGGGGGGGGGGGGGGGGGGDNK....",
        "....KNHGGGGGGGGGGGGGGGGGGDNK....",
        "....KNHGGGGGGGGGGGGGGGGGGDNK....",
        "....KNHGGGGGGGGGGGGGGGGGGDNK....",
        "....KNHGGGGGGGGGGGGGGGGGGDNK....",
        "....KNHGGGGGGGGGGGGGGGGGGDNK....",
        "....KNHGGGGGGGGGGGGGGGGGGDNK....",
        "....KNHDGGGGGGGGGGGGGGGGDDNK....",
        "....KNNNDGGGGGGGGGGGGGGDNNNK....",
        ".....KKKDDDDDDDDDDDDDDDDKKK.....",
        "........KNNNNNNNNNNNNNNK........",
        ".........KKKKKKKKKKKKKK.........",
        "................................",
        "................................"
      ]
    },

    /**
     * 静寂の深層の主。α-5で 32×32 に描き直した。
     *
     * 前は 16×16 のスライムに小さな王冠を乗せただけで、雑魚と同じ大きさだった。
     * いまは枠いっぱいの大きな体にして、「大きな体と王冠」という説明どおりにしてある。
     *
     * ★ 体の色をミズダマリの水色から深い青へ移してある。
     *   ミズダマリも同じ #4fb0d1 を使っていたので、そのままだと
     *   最後の主が「大きいミズダマリ」に見えてしまう。
     *
     * 目は外が高く内が低い平行四辺形（吊り上がった目）。
     * 最初は白い長方形に黒目を置いたが、眼鏡にしか見えなかった。
     * 口はへの字に大きく取ってある。小さいと締まらない。
     *
     * ─── 立体に見せるためにやっていること ───
     * こいつだけは手足が無い「球」なので、magmaBeast とはやり方が違う。
     * 輪郭からの距離ではなく、**光源（左上）からの距離**で階調を決めている。
     * 輪郭沿いに明暗を置くと、球ではなく縁取りのある平らな円になる。
     *
     *   ・左上に近いほど明るい（P → L → B → D → N の5段）
     *   ・いちばん下の2行だけ一段明るく戻す＝床からの反射光。
     *     これが無いと、球が背景に貼りついて見える
     *   ・王冠にも同じ向きの陰影を入れる。
     *     体だけ球で王冠が平らだと、シールを貼ったように見える
     *   ・口は体の下側（暗いところ）にあるので、まわりを一段明るくして
     *     へこみに見せている
     */
    kingSlime: {
      palette: {
        ".": null,
        "K": "#08101f",   // 輪郭・目鼻立ち・王冠とのさかい
        "N": "#12294a",   // いちばん深い影（右下）
        "D": "#1b3a63",   // 体の影・底の反射光
        "B": "#2f66a8",   // 体（深い青）
        "L": "#5b9fd8",   // 照り
        "P": "#8fc7ee",   // ハイライト（左上）
        "Y": "#ffd75e",   // 王冠
        "O": "#c99b22",   // 王冠の影
        "W": "#dff2ff"    // 目
      },
      pixels: [
        "........KK..KK.KK.KK..KK........",
        ".......KYYKKYYKYYKYYKKYOK.......",
        ".......KYYYYYYYYYYYYYYYOK.......",
        ".......KYYYYYYYYYYYYOOOOK.......",
        ".......KYYYYYYYYYYYOOOOOK.......",
        ".......KOOOOOOOOOOOOOOOOK.......",
        "........KKKOOOOOOOOOOKKK........",
        "...........KKKKKKKKKK...........",
        "........KKKLLLLLBBBBBKKK........",
        "......KKPPPPPPLLLBBBBBDDKK......",
        ".....KLPPPPPPLLLLLBBBBBDDDK.....",
        "....KLLPPPPPPPLLLLBBBBBDDDDK....",
        "...KBLLLLLLPPPPLLLBBBBBDDDDNK...",
        "..KBBLLLLLPPPPPLLLBBBBBDDDDNNK..",
        "..KBBLLLPPPPPPPLLLBBBBBDDDDNNK..",
        ".KBBBKKKKKPPPPLLLLBBBBKKKKKNNNK.",
        ".KBBBWWWWKKKPLLLLLBBKKKWWWWNNNK.",
        ".KBBBWWWWWWKKLLLLBBKKWWWWWWNNNK.",
        "KBBBBWWWKKKWLLLLBBBBWKKKWWWNNNNK",
        "KDBBBBWWKKKWLLLBBBBBWKKKWWNNNNNK",
        "KDBBBBBBWWWWBBBBBBBBWWWWDNNNNNNK",
        "KDDBBBBBBBBBBBBBBBBBDDDDNNNNNNNK",
        "KDDDBBBBBBBBBBBBBBBBBDDDNNNNNNNK",
        "KDDDDDBBBBBBKKKKKKKKDDDNNNNNNNNK",
        "KDDDDDDDBBKKKKKKKKKKKKNNNNNNNNNK",
        "KNDDDDDDDKKKKKKKKKKKKKKNNNNNNNNK",
        ".KNNDDDDDDKKKDDDDDDKKKNNNNNNNNK.",
        ".KNNNNNNNNNNNNNNNNNNNNNNNNNNNNK.",
        ".KNNDDDDDDDDDDDDDDDDDDDDDDDDNNK.",
        "..KKNDDDDDDDDDDDDDDDDDDDDDDNKK..",
        "....KKKKKKKKKKKKKKKKKKKKKKKK....",
        "................................"
      ]
    },

    /**
     * α-5で 32×32 に描き直した。
     *
     * ★ ステージ1の6種は「16×16をそのまま2倍に拡大してから塗り直す」方式で作った。
     *   シルエットが1マスも変わらないので、キャラクターが別物にならない。
     *   やっているのは次の3つだけ。
     *     1. 2倍に拡大（形はそのまま）
     *     2. 拡大でできた四角い出っ張りの角を1マス落とす（ギザギザを消す）
     *     3. 内側を明暗6段で塗り直し、元の絵で内側にあった輪郭線は
     *        いちばん暗い段で「面と面のさかい」として戻す
     *   目や苔など、意味のある色はそのまま残す。
     *
     * コウモリは翼を体より一段暗く落としてある。
     * 落とさないと、角を丸めたときに翼と体が溶けて一枚の板に見える。
     */
    batty: {
      palette: {
        ".": null,
        "K": "#12091f",   // 輪郭
        "M": "#2e2158",   // 面と面のさかい・翼の影
        "D": "#4a3a80",   // 影
        "P": "#5a44a0",   // 翼
        "V": "#8b6fd6",   // 体（紫）
        "L": "#a88ce0",   // 光の当たる面
        "W": "#ffe36e"    // 目
      },
      pixels: [
        "................................",
        "................................",
        "................................",
        "................................",
        "................................",
        "....KK....................KK....",
        "...KPPK..................KPPK...",
        "..KMPPMK................KMPPMK..",
        "..KMPPPPK....KKKK......KPPPDMK..",
        "..KMPPPPMK..KMMMMK....KMPPPDMK..",
        "..KMPPPPPPKKLLLLLLKKKKPPPPPDMK..",
        "..KMPPPPPPMMLVVVVLMMMMPPPPPDMK..",
        "..KMPPPPPPMMVVVVVVMMMMPPPPPDMK..",
        "..KMPPPPPPMMVVVVVVMMMMPPPPPDMK..",
        "..KMPPPPMMVVWWVVWWVVMMMMPPPDMK..",
        "...KPPDDMMVVWWVVWWVVMMMMDDDDK...",
        "....KMMMMMVVVVVVVVVVMMMMMMMK....",
        ".....KKKMMVVVVVVVVVVMMKKKKK.....",
        "........KMLVVVVVVVVPMK..........",
        "........KMLVVVVVVVVPMK..........",
        "........KMLVVVVVVVVPMK..........",
        ".........KLLVVVVVVPPK...........",
        "..........KMLVVVVPMK............",
        "...........KLLPPPPK.............",
        "............KMMMMK..............",
        ".............KKKK...............",
        "................................",
        "................................",
        "................................",
        "................................",
        "................................",
        "................................"
      ]
    },

    // --- 苔むす坑道 ---

    // 16×16を2倍に拡大して塗り直した（やり方は batty のコメントを参照）。
    // 背の苔（M）と目（W）はそのまま残してある
    mossRat: {
      palette: {
        ".": null,
        "K": "#1a140d",   // 輪郭
        "N": "#3a3026",   // 面と面のさかい・いちばん深い影
        "D": "#6b5f4a",   // 影・尻尾
        "G": "#9a8b70",   // 体（灰茶）
        "H": "#b5a68a",   // 光の当たる面
        "M": "#6fa84f",   // 背の苔
        "W": "#ffe36e"    // 目
      },
      pixels: [
        "................................",
        "................................",
        ".....KK..................KK.....",
        "....KNNK................KNNK....",
        "...KHHHHK..............KHHHHK...",
        "..KNHGGHNK............KNHGGHNK..",
        "..KNHGGDNK............KNHGGDNK..",
        "...KHHGDNK............KNHGDDK...",
        "....KNHGGGKKKKKKKKKKKKGGGDNK....",
        "....KNHGGGNNNNNNNNNNNNGGGDNK....",
        "...KHHGGMMHHHHHHHHHHHHMMGGDDK...",
        "..KNHGGGMMGGGGGGGGGGGGMMGGGDNK..",
        "..KNHGGGGGMMGGGGGGGGMMGGGGGDNK..",
        "..KNHGGGGGMMGGGGGGGGMMGGGGGDNK..",
        "..KNHGWWWWGGGGGGGGGGGGWWWWGDNK..",
        "..KNHGWWWWGGGGGGGGGGGGWWWWGDNK..",
        "..KNHGWWWWGGGGGGGGGGGGWWWWGDNK..",
        "..KNHGWWWWGGGGGGGGGGGGWWWWGDNK..",
        "..KNHGGGGGGGGGNNNNGGGGGGGGGDNK..",
        "..KNHGGGGGGGGGNNNNGGGGGGGGGDNK..",
        "..KNHGGGGGGGGGGGGGGGGGGGGGGDNK..",
        "...KHHGGGGGGGGGGGGGGGGGGGGDDK...",
        "....KNHGGGGGGGGGGGGGGGGGGDNK....",
        "....KNHGGGGGGGGGGGGGGGGGGDNK....",
        ".KKKNNGGGGGGGGGGGGGGGGGGGDNK....",
        "KDKKNNDDGGGGDDDDGGGGDDDDDDNK....",
        "KK..KNNNDGGDNNNNDGGDNNNNDDNK....",
        ".....KKKDDDDKKKKDDDDKKKKKKK.....",
        "........KNNK....KNNK............",
        ".........KK......KK.............",
        "................................",
        "................................"
      ]
    },

    // 16×16を2倍に拡大して塗り直した（やり方は batty のコメントを参照）。
    // 岩なので、そのあと3×2マスごとの粗いノイズで明暗を1段ずらしてざらつかせている。
    // なめらかな階調のままだとスライムの質感になり、岩に見えない
    rocky: {
      palette: {
        ".": null,
        "K": "#1a1916",   // 輪郭
        "N": "#35342f",   // 面と面のさかい・いちばん深い影
        "D": "#4f4d47",   // ひび・影
        "S": "#7d7a72",   // 岩肌
        "H": "#9b9890",   // 光の当たる面
        "P": "#b8b5ac",   // いちばん明るいふち
        "M": "#6fa84f",   // 苔
        "W": "#ffd75e"    // 目
      },
      pixels: [
        "................................",
        "................................",
        "................................",
        "................................",
        ".........KKKKKKKKKKKKKK.........",
        "........KNNNDDDDDDNNNNNK........",
        ".......KSHHHPPPPPPHHHHHHK.......",
        "......KNSSSSHHHHHHSSSSSHNK......",
        ".....KPPHHMMSSSSSSHHMMHHHHK.....",
        "....KNPHHHMMSSSSSSHHMMHHSHNK....",
        "...KHHSSSSSSDDDSSSDDDSSSDDSHK...",
        "..KNHSSSSSSSDDDSSSDDDSSSDDDHNK..",
        "..KDPHSSWWWWSSSDDDSSWWWWSSSSDK..",
        "..KDPHSSWWWWSSSDDDSSWWWWSSSSDK..",
        "..KNHSSSWWWWSSSHHHDDWWWWSSSDNK..",
        "..KNHSSSWWWWSSSHHHDDWWWWSSSDNK..",
        "..KDPHSSSSSSHHHDDDHHHSSSHHHDNK..",
        "..KDPHSSSSSSHHHDDDHHHSSSHHHDNK..",
        "..KNHSSSSDDDDDDSSSHHHHHHSSSSDK..",
        "..KNHSSSSDDDDDDSSSHHHHHHSSSSDK..",
        "..KNHSDDDDNNNNDDDDDDDDSSDDDSDK..",
        "..KNHSDDDDNNNNDDDDDDDDSSDDDSDK..",
        "..KNHSDDDSSSDDDHHHSSSDDDSSSDNK..",
        "...KHHDDDSSSDDDHHHSSSDDDSSDDK...",
        "....KNHSSHHHSSSDDDSSSSSSSDNK....",
        ".....KHHDSHHSSSDDDSSSSDDDDK.....",
        "......KNNNDSSSSSSSSSSSDDNK......",
        ".......KKKDDDDDDDDDDDSKKK.......",
        "..........KNNNNNNNNNNK..........",
        "...........KKKKKKKKKK...........",
        "................................",
        "................................"
      ]
    },

    // 16×16を2倍に拡大して塗り直した（やり方は batty のコメントを参照）。
    // 翅（L）だけは体の黄色ではなく水色の段に置き換えている。
    // 同じ階調で塗ると、翅が体から生えた光の塊に見えて虫にならない
    glowBug: {
      palette: {
        ".": null,
        "K": "#1a1608",   // 輪郭
        "N": "#6b5a2e",   // 面と面のさかい・胴
        "D": "#c9a83e",   // 影
        "Y": "#ffe36e",   // 光る部分
        "H": "#fff2a8",   // 光の当たる面
        "C": "#7fb0d8",   // 翅の影
        "L": "#bfe4ff",   // 翅
        "I": "#e6f6ff",   // 翅の明るいところ
        "W": "#3a2f10"    // 目
      },
      pixels: [
        "................................",
        "................................",
        ".............KKKKKK.............",
        "............KNNNNNNK............",
        "...........KHHHHHHHHK...........",
        "..........KNHYYYYYYHNK..........",
        ".........KHHWWYYYYWWHHK.........",
        "....KK...KHHWWYYYYWWDHK...KK....",
        "...KIIK...KNHYYYYYYDNK...KIIK...",
        "..KNIINK...KHHYYYYDDK...KNIINK..",
        "..KNILIIK...KNNNNNNK...KIILCNK..",
        "..KNILLINK..KNNNNNNK..KNILLCNK..",
        "..KNILLLIIKKDDDDDDDDKKIILLLCNK..",
        "...KIILLLINNDDDDDDDDNNILLLCCK...",
        "....KNILLLNNDDDDDDDDNNLLLCNK....",
        ".....KIICCNNDDDDDDDDNNCCCCK.....",
        "......KNNNNNDDDDDDDDNNNNNK......",
        ".......KKKKKDDDDDDDDKKKKK.......",
        "............KNDDDNNK............",
        "............KNDDDNNK............",
        "............KNHYYDNK............",
        "............KNHYYDNK............",
        "...........KHHYYYYDDK...........",
        "...........KHHYYYYDDK...........",
        "............KNHYYDNK............",
        ".............KHHDDK.............",
        "..............KNNK..............",
        "...............KK...............",
        "................................",
        "................................",
        "................................",
        "................................"
      ]
    },

    // --- 灼熱の亀裂 ---

    /**
     * α-5で 32×32 に描き直した。
     *
     * ★ 形は 16×16 のときの比率をそのまま倍にしただけ。
     *   翼は縦長の板、外側の2列だけが熱を持つ、体は板のあいだの細い灰色、
     *   くちばしと尾の先だけ燃え差し色。この配置を崩すとハイバネでなくなる。
     *
     *   一度、翼を斜めに広げて三角形にしてみたが、鳥ではなく蛾に見えた。
     *   翼を「上へ立てた板」に保つのが、この子が鳥に見える条件。
     *
     * 元と変えたのは次の2つだけ。
     *   ・右の翼を2行ぶん下げた（羽ばたきの途中に見える。元は左右対称）
     *   ・体から離れたところに灰を数点散らした（「灰をまとって舞う」）
     *
     * 目は1組だけ（コウモリで目が4つに見えた失敗を繰り返さないため）。
     * 飛んでいるので枠の下は空けてある。
     */
    ashWing: {
      palette: {
        ".": null,
        "K": "#1c1613",   // 輪郭
        "N": "#3a322d",   // いちばん深い影
        "D": "#5e5650",   // 影（奥になる右の翼）
        "A": "#9a938d",   // 体（灰）
        "H": "#bdb6ae",   // 光の当たる面・舞う灰
        "P": "#ded8d0",   // いちばん明るいふち
        "E": "#ff9a3c",   // 燃え差し（翼の外縁・くちばし・尾）
        "Y": "#ffd07a",   // 燃え差しの明るいところ
        "W": "#ffe36e"    // 目
      },
      pixels: [
        "....KKKK........................",
        "...KYEHHK.......................",
        "..KYEHHHK....HD.........KKKK....",
        "..KYEAADHK...D.........KAAEYK...",
        "..KYEAADDK............KAAAAEYK..",
        "..KYEAADDK............KAADDEYK..",
        "..KYEAADDK..KKKKKKKK..KAADDEYK..",
        "..KYEAADDK.KHHHHHHHHK.KAADDEYK..",
        "...KYEAAAAKPPPPHHHHHHKDDDDDEYK..",
        "...KYEDAAAKKKHAAAAAKKKDDDDDEYK..",
        "....KYEDDDKWWAAAAAAWWKDDDDEYK...",
        ".....KKEDDKWWAAAAAAWWKDDDDEYK...",
        ".......KKKKDAAAAAAAADKDDDEKK....",
        "...........KHHEEEEDDK.KEYK......",
        "...........KHHAYYADDK.KKK.......",
        "............KHHAADDK............",
        ".....HD.....KNNNNNNK............",
        ".....D......KNNNNNDK............",
        ".............KHHDDK.............",
        ".............KHHDDK......DH.....",
        "..............KKKK........D.....",
        "..............KHHK..............",
        ".........HD...KHHK..............",
        ".........D.....KK...............",
        "...............KK...............",
        "................................",
        "................................",
        "................................",
        "................................",
        "................................",
        "................................",
        "................................"
      ]
    },

    /**
     * 焼けてひび割れた岩。α-5で 32×32 に描き直した。
     *
     * ★ 形は 16×16 のまま。横長の丸い岩・大きく左右に離れた2つの目・橙のひび。
     *   目を中央に寄せると顔が主役になって「岩」に見えなくなるので、
     *   元と同じくらい離してある。
     *
     * ★ 岩肌はわざとざらつかせてある（3×2マスごとの粗いノイズで明暗を1段ずらす）。
     *   なめらかな階調にするとスライムのような質感になり、岩に見えない。
     *
     * ひびは折れ線でたどって、中心を明るい橙（Y）、その両脇を橙（E）、
     * さらに外を黒（K）にしてある。1色だけで引くとただの線に見えるが、
     * 3段にすると「割れた奥から熱が覗いている」ように見える。
     *
     * 目のまわりは1マスぐるりと黒で囲む。ひびと同じ黄系なので、
     * 囲まないと縮めたときにひびと混ざって顔が消える。
     */
    crackRock: {
      palette: {
        ".": null,
        "K": "#150f0d",   // 輪郭・ひびのいちばん外
        "N": "#2a211d",   // いちばん深い影
        "D": "#453833",   // 影
        "S": "#6b5a52",   // 焼けた岩肌
        "H": "#8d7a70",   // 光の当たる面
        "P": "#b0998c",   // いちばん明るいふち
        "E": "#ff7a2a",   // 光るひび
        "Y": "#ffb45e",   // ひびの芯
        "W": "#ffd75e"    // 目
      },
      pixels: [
        "................................",
        "................................",
        "................................",
        "................................",
        "................................",
        "...........KKKKKKKKKK...........",
        "........KKKPPPPPKEKPPKKK........",
        "......KKHPPHPPPPPKYKHPPPKK......",
        ".....KPPPKKPHHHHHKEKPPPPPPK.....",
        "....KPPKKKEKSSSSSSKEKPPPHHPK....",
        "...KPHKKEYKKDDDSSSKYKSSSSSSPK...",
        "..KPHHKYKKKSDDDSKKKEKSSSDDSHPK..",
        "..KPKKKKKSSSSSSKKEKYKSSKKKKKPK..",
        ".KPPKWWWKSSSSKKKYKEKKSSKWWWKPPK.",
        ".KPHKWWEKHHHKKEEKKYKDSSKWWEKDHK.",
        ".KPHKKKKKHHKKYKKKHKEKSSKKKKKDNK.",
        ".KPPPHSSSSSKEKKDDDHKEKKSHHHDDNK.",
        ".KPPPHSSSSKKYKHDDDHHKYEKKHHDDNK.",
        ".KPHHSSSSDKEKKDSSSHHHKEEYKSSSDK.",
        "..KPHHSSSKKEKDDSSSHHHKYKKEKSDK..",
        "..KPHHNDDKYKKDDDDDSSKKEKDKYKDK..",
        "...KPHSNNKEKDDDDDDSSKEKKNNKEK...",
        "....KPSSNDKYKDDHHHSSKYKNNNNK....",
        ".....KKSSDKEKNNSSSDDDKKNNKK.....",
        ".......KKPPKKDDNNNDDNNNKK.......",
        ".........KKKHNNNNNNNKKK.........",
        "............KKKKKKKK............",
        "................................",
        "................................",
        "................................",
        "................................",
        "................................"
      ]
    },

    /**
     * マグマの中で暮らすカニ。
     *
     * この絵は制作者が MakeBead で描いた 32×31 のドット絵を、
     * 参考絵/bead-pattern(２).png から1マスずつ機械的に読み取ったもの
     * （方眼1マス=20px、中心の色を拾ってそのまま記号にしている）。
     * 元絵は31行で最後の1行が空だったので、上に2行足して32行に揃え、
     * ハサミが下端に来るようにしてある。
     *
     * 直すときは png ではなくこの配列を直接いじってよい。
     * ただし色は下のパレット9色から選ぶこと（元絵と同じ材料）。
     *
     * 僕が描いた版（ハサミを前に構えた甲羅型）は差し替えで消えている。
     * 脚が左右に4本ずつ生えていること、ハサミが甲羅の下から前へ出ていることが、
     * こちらのほうがはるかにカニに見える理由。
     *
     * ★ ハサミ（行23〜31）だけは後から描き直している。甲羅・脚・目は元絵のまま。
     *   元絵のハサミには次の3つの問題があった。
     *     ・左右が鏡になっていない（形の合わないマスが38個あった）
     *     ・口（開き）が無く、曲がった塊なのでツノか口ヒゲに見えた
     *     ・左のハサミの輪郭が下側で途切れていた
     *   いまは目の中心（列15.5）で鏡にして、上の細い指と下の太い手のあいだに
     *   3マス×2マスの口を空けてある。カニのハサミは上の指のほうが細いので、
     *   上下を同じ太さにすると万力に見える。
     */
    magmaCrab: {
      palette: {
        ".": null,
        "K": "#180b09",   // 輪郭
        "Z": "#111111",   // 差し色の黒
        "D": "#422620",   // 影
        "A": "#5c3a30",   // 殻
        "H": "#7d5245",   // 光の当たる面
        "R": "#ff5000",   // マグマ（濃い）
        "E": "#ff6a1e",   // マグマ
        "Y": "#ff8000",   // マグマ（明るい）
        "W": "#ffe36e"    // 目
      },
      pixels: [
        "................................",
        "................................",
        "................................",
        "................................",
        "................................",
        "................................",
        "................................",
        "................................",
        "................................",
        "................................",
        "................................",
        ".............RW...RW............",
        ".............RW...RW............",
        ".............KD...DK............",
        ".............ZD...DZ............",
        "..........KKKKZKKKZKKKKK........",
        "........KKZZHHHHHHHHHHHKK.......",
        "...KK..KZZHHHHHHHHHHHEHHHK.KKK..",
        "..KKDKKZHHHHHHHHEEHHHHHHHZKKAKK.",
        ".KK.KKKHHHEEAAAAAAAAHHHHHHKK..K.",
        "KK...KKHHAAAAAAAAAAAEEAAAAZK....",
        "..KKDKKAAAAAAAAAAAAAEEAAAAZDKK..",
        "..KKKZZAAAAEEAAAAAAAAAAAKKZKDDK.",
        ".KKD..KYYAAAAAAAEAAAAAAYYK...KD.",
        ".KK...KYYEKAAAAAAAAAAAEYYK.D.KK.",
        ".K..K.KYEEKAAAAAAAAAAAAEYK....KK",
        "...KK.KYEKKKKKKKKKKKKKKEYK..K..K",
        "..KKKKYEEEEEEK....KEEEEEEYK.DK..",
        "..KK.KYEEEK..........KEEEYK..D..",
        "...K.KYEEEK..........KEEEYK.....",
        ".....KYEEEERK......KREEEEYK.....",
        "......KKRRRK........KRRRKK......"
      ]
    },

    // 燃えさしの炭が起き上がったもの。5種の中でいちばん小さく描いて、
    // 見ただけで「弱いほう」と分かるようにしてある。
    // 炭の色を暗くしすぎると背景に沈んで目と炎だけが浮くので、少し明るめにしている
    /**
     * α-5で 32×32 に描き直した。
     *
     * 「燃えさしの炭」なので、炭の塊を割れた形にして、
     * 割れ目の奥から熾火（E）が覗くようにしてある。ここで炭だと伝わる。
     * 炎は頭の上に1つだけ、左へ傾けて立ちのぼらせる。
     *
     * 枠は埋めていない。5種の中でいちばん弱く、群れで湧く役なので、
     * 並べたときに実際に小さく見えるようにしてある。
     */
    cinderling: {
      palette: {
        ".": null,
        "K": "#0f0a08",   // 輪郭・炭の割れ目
        "N": "#1e1512",   // いちばん深い影
        "D": "#2e211c",   // 影
        "C": "#463430",   // 炭
        "H": "#6b544c",   // 光の当たる面
        "P": "#8f746a",   // いちばん明るいふち
        "E": "#ff6a1e",   // 割れ目の奥の熾火
        "F": "#ff9a3c",   // 炎
        "Y": "#ffe9a8",   // 炎の芯
        "W": "#ffd75e"    // 目
      },
      pixels: [
        "................................",
        "................................",
        "................................",
        "...............YY...............",
        "..............YYYY..............",
        ".............YYFEY..............",
        ".............YFFFEY.............",
        ".............FFFFEY.............",
        "..............FFFEE.............",
        "...........KKKCCCCDKK...........",
        ".........KKHHHCCCCCCCKK.........",
        "........KHPPPPPPCCCKCCCK........",
        "........KPPPKPPCCEKKDCCCK.......",
        ".......KHHHHKKECFEKDDDDCK.......",
        ".......KHHKKCKEFCCCKKDDDK.......",
        ".......KHHWWCCKECCCWWDDDK.......",
        ".......KHHWWCCKCCCCWWFDK........",
        "........KHHKCFCCCCCDEDDK........",
        "........KHHKKECCCCCDDDDK........",
        ".........KHHKENNNNNNNNK.........",
        ".........KHHCNNNNNNNNNK.........",
        "..........KHHCDDDDCDDK..........",
        "..........KKKKKKKKKKKK..........",
        "..........KHHK....KCCK..........",
        "..........KHHK....KCCK..........",
        ".........KKKKKK..KKKKK..........",
        "................................",
        "................................",
        "................................",
        "................................",
        "................................",
        "................................"
      ]
    },

    /**
     * 静寂の深層の雑魚。α-5で 32×32 に描き直した。
     *
     * 前は 16×16 の丸い塊に四角い目を2つ並べただけで、
     * ミズダマリ・スライムと並べるとシルエットが同じだった。
     *
     * 「底に溜まった闇がひとりでに形を持った」ものなので、
     * 次の3つで他とぶつからないようにしてある。
     *   ・左へ折れながら立ちのぼる細い煙（ここが体の一部だと分かるよう2〜3px幅）
     *   ・重心を右へ寄せた本体。目は左寄りなので、傾いて見える
     *   ・太さも長さも違う3本に割れて落ちる裾
     *
     * ★ 目は大きな単眼で、上まぶたを重くしてある。
     *   ゲーム中で目が1つなのはこいつだけなので、拠点の36pxでも見分けがつく。
     *   「一体では頼りない」という説明にも合わせている。
     */
    murkling: {
      palette: {
        ".": null,
        "K": "#0e0a18",   // 輪郭
        "D": "#1c1530",   // 影になる右下
        "P": "#3d3060",   // 闇の体
        "L": "#6b57a0",   // 光の当たる左上
        "V": "#8b6fd6",   // ほどけていく紫（闇属性の色）。煙の先と裾の先
        "W": "#e6e0ff"    // 目
      },
      pixels: [
        "................................",
        ".............KKK................",
        "............KVK.................",
        "...........KVK..................",
        "..........KVVK..................",
        "..........KVVVK.................",
        "...........KVVVKK...............",
        "...........KLLLPDKKK............",
        "..........KLLLPPPPDDKK..........",
        ".........KLLLPPPPPPPDDKK........",
        "........KLLLPPPPPPPPPPDDKK......",
        ".......KLLLPPPPPPPPPPPPDDDK.....",
        "......KLLLPPPPPPPPPPPPPPDDDK....",
        ".....KLLLPPKKKPPPPPPPPPPPDDDK...",
        ".....KLLLKKKKKKKPPPPPPPPPDDDK...",
        "....KLLLWWWWWWWWWPPPPPPPPPDDDK..",
        "....KLLWWWWWVWWWWWPPPPPPPPDDDK..",
        "....KLLWWWWVVVWWWWPPPPPPPPDDDK..",
        "....KLLWWWWVVVWWWWPPPPPPPPDDDK..",
        "....KLLLWWWVVVWWWPPPPPPPPDDDK...",
        ".....KLLLWWWVWWWPPPPPPPPPDDDK...",
        ".....KPPPPPPPPPPPPPPPPPPDDDK....",
        "......KPPPPPPPPPPPPPPPPPDDDK....",
        "......KPPPPPPPPPPPPPPPPDDDK.....",
        ".......KPPPPPKPPPPPKPPPDDDK.....",
        ".......KVVVVK.KVVVK.KVVVVVK.....",
        ".......KVVVK...KVVK..KVVVVK.....",
        "........KVVK...KVK...KVVVK......",
        "........KKK.....KK....KVVK......",
        "......................KVVK......",
        ".......................KKK......",
        "................................"
      ]
    },

    /**
     * 深層の妨害役。α-5で 32×32 に描き直した。
     *
     * 前は「丸い顔＋点目ふたつ」で、ヨドミと見分けがつかず蔦にも見えなかった。
     *
     * いまは「亜空間の裂け目から垂れ下がる蔦」。
     * 上の裂け目が他のどの種族とも違うシルエットになるので、
     * 色を塗りつぶしても、これがカゲヅタだと分かる。
     *
     * ねらいは「うざいけど憎めない」。
     * 出どころ（裂け目）は不気味に、ぶら下がっている本体は丸くて目を大きく。
     * ちからぬきを何度も撃たれて苛立つ相手だが、見た目で許せる、という手触りにしたい。
     */
    kageZuta: {
      palette: {
        ".": null,
        "K": "#0c1410",   // 輪郭
        "D": "#100a1c",   // 裂け目の奥（ほぼ黒）
        "R": "#8b6fd6",   // 裂け目のふち
        "G": "#1c2e21",   // 影になっている蔦
        "M": "#2a4732",   // 蔦
        "L": "#44704e",   // 光の当たる葉
        "W": "#eaf6ee",   // 目
        "P": "#c88ab0"    // ほお
      },
      pixels: [
        ".......KKKKKKKKKKKKKKKKK........",
        "....KKKRRRRRRRRRRRRRRRRRKKKK....",
        "..KKRRRDDDDDDDDDDDDDDDDDRRRRRKK.",
        "KKRRDDDDDDDDDDDDDDDDDDDDDDDDRRRK",
        "..KKRRRDDDDDDDDDDDDDDDDDRRRRRKK.",
        "....KKKRRRRRRRRRRRRRRRRRKKKK....",
        ".......KKKKKKGMGKKKKKKKKK.......",
        "..............KGMGK.............",
        "..............KGMGK.............",
        ".........KKLLKKGMGK.............",
        "........KLLLLLKGMGK.............",
        ".........KKLLKKGMGK.............",
        "..............KGMGK.............",
        "..............KGMGKKLLKK........",
        "..............KGMGKLLLLLK.......",
        "..............KGMGKKLLKK........",
        "..............KGMGK.............",
        ".............KGMMMGK............",
        "..........KKKGMMMMMGKKK.........",
        ".........KGMMLLLLLLLMMGK........",
        "........KGMLLLLLLLLLLLMGK.......",
        "........KGMLWWLLLLLWWLMGK.......",
        "........KGMLWWLLLLLWWLMGK.......",
        "........KGMLLLLLLLLLLLMGK.......",
        "........KGMLPPLLLLLPPLMGK.......",
        "........KGMLLLLKKLLLLLMGK.......",
        ".........KGMLLLLLLLLLMGK........",
        "..........KGMMLLLLLMMGK.........",
        "...........KKGMMMMMGKK..........",
        ".............KKGMGKK............",
        "..............KKGKK.............",
        "................................"
      ]
    },

    /**
     * 唯一の雷使い。α-5で 32×32 に描き直した。
     *
     * 前は黄色い楕円に四角い目を2つ並べただけで、虫の形になっていなかった。
     * いまは「小さな体に電気をためこんだ虫」を、次の4つで出している。
     *   ・頭→胸→腹の3節。くびれを入れないと、ただの塊に見える
     *   ・左右で高さも角度も違う翅（左は上へ、右は横から下へ）。羽ばたきの途中
     *   ・体から離した3か所の火花。「触れると弾ける」を体の外に出している
     *   ・複眼はあいだを2マス空ける。詰めると白い帯になって顔が潰れる
     *
     * ★ 枠を埋めていない（上7行・下5行が空）。
     *   深層でいちばん素早く、いちばん小さいので、
     *   他と並べたときに実際に小さく・浮いて見えるようにしてある。
     *   絵を大きくすると、この「小ささ」が消える。
     */
    boltBug: {
      palette: {
        ".": null,
        "K": "#150f06",   // 輪郭
        "O": "#c8891a",   // 体の濃いところ・腹の節・脚
        "Y": "#ffd75e",   // 体（雷の色）
        "H": "#fff2b0",   // 体の照り
        "B": "#3f8fa8",   // 翅の濃いところ
        "C": "#7fd9e8",   // 翅
        "W": "#ffffff"    // 複眼と火花
      },
      pixels: [
        "................................",
        "................................",
        "................................",
        "................................",
        "................................",
        "................................",
        "................................",
        ".............K.........W........",
        ".............K....K...W.........",
        "..............K...K....W........",
        "........KKKK.KKKKKK.............",
        "......KKCCBKKWWYYWWK............",
        "....KKCCCCBKKKWYYWKK............",
        "...KCCCCCCBKKWWYYWWK............",
        "...KCCCCCCBK.KHYYOK.............",
        "....KKCCCCBKKHYYYYOKKKKK........",
        "......KKCCBKHYYYYYYOKBCCKKK.....",
        "........KKKKHYYYYYYOKBCCCCCKK...",
        "............KHYYYYOKKBCCCCCKK...",
        ".....W....O..KHYYOK.KBCCKKK.....",
        "......W..O..KHYYYYOKKKKK........",
        ".....W...OO.KOOOOOOK.OO.........",
        ".........O..KHYYYYOK..O.........",
        ".............KOOOOK...W.........",
        ".............KHYYOK..W..........",
        "..............KOOK....W.........",
        "...............KK...............",
        "................................",
        "................................",
        "................................",
        "................................",
        "................................"
      ]
    },

    /**
     * 深層の攻撃役。α-5で 32×32 に描き直した。
     *
     * ★ 腕はつけていない。
     *   前は「水の腕を2本振り上げた」形にしていたが、細い腕は触角に見え、
     *   太くすると急須の注ぎ口に見えた。スライム型に手足を足そうとするのが
     *   そもそも無理だったので、姿勢そのもので殴り役を表している。
     *
     * 「近づいたものを重い水塊で叩き潰す」を、次の3つで出している。
     *   ・上が重く、前へせり出した塊（崩れる寸前の波。今にも落ちてきそうに見える）
     *   ・そこを支えるくびれ。細いほど上の重さが出る
     *   ・足元だけ水たまりとして横へ広がる
     *
     * ヨドミが「上が細く下が広い」ので、こちらはちょうど逆。
     * 並べたときにシルエットの段階で見分けがつく。
     * 目は傾いたスリット2本にして、せり出した塊の下から見下ろす顔にしてある。
     */
    puddling: {
      palette: {
        ".": null,
        "K": "#08141c",   // 輪郭
        "D": "#16303e",   // 影になる右下
        "B": "#23495c",   // 深いところの水
        "A": "#316f8a",   // 明るいところの水
        "S": "#4fb0d1",   // 上と左のふちの照り（水属性の色）
        "W": "#dff2f8"    // 目
      },
      pixels: [
        "................................",
        "................................",
        ".........KKKKKKKKKKK............",
        "......KKKSSSSSSSSSSSKKK.........",
        "....KKSSSAAAAAAAAAAASSSKK.......",
        "...KSSAAAAAAAAAAAAAAAAASSK......",
        "..KSAAAAABBBBBBBBBBBAAAAASK.....",
        ".KSAAABBBBBBBBBBBBBBBBBAAASK....",
        ".KSAABBBBBBBBBBBBBBBBBBBBAAK....",
        ".KSAABBBBBBBBBBBBBBBBBBBBBAAK...",
        ".KSAABBWWWBBBBBBBBBBWWWBBBDAK...",
        ".KSAABBBWWWBBBBBBBBWWWBBBBDDK...",
        ".KSAABBBBWWWBBBBBBWWWBBBBBDDK...",
        "..KSAABBBBBBBBBBBBBBBBBBBBDDK...",
        "...KSAABBBBBBBBBBBBBBBBBBDDK....",
        "....KSAABBBBBBBBBBBBBBBBDDK.....",
        ".....KSAABBBBBBBBBBBBBBDDK......",
        "......KSAABBBBBBBBBBBBDDK.......",
        ".......KSAABBBBBBBBBBDDK........",
        "........KSAABBBBBBBBDDK.........",
        ".........KSAABBBBBBDDK..........",
        "..........KSAABBBBDDK...........",
        "...........KSAABBBDDK...........",
        "...........KSAABBBDDK...........",
        "............KSAABBDDK...........",
        "............KSAABBBDDK..........",
        "..........KKAABBBBBBBSKK........",
        "........KKSSBBBBBBBBBASSKK......",
        "......KKSSAADDDDDDDDDAAASSKK....",
        "....KKSSAAAADDDDDDDDDDAAAASSK...",
        ".....KKKKKKKKKKKKKKKKKKKKKKK....",
        "................................"
      ]
    },

    /**
     * ゲーム中で初めての竜。48×48（sizeScale 1.35 で他より一回り大きく表示）。
     *
     * この絵は制作者が MakeBead で描いた 48×45 のドット絵を、
     * 参考絵/bead-pattern(1).png から1マスずつ機械的に読み取ったもの。
     * 目で書き写すと 2000 マス超のどこかを必ず間違えるので、
     * 画像のマス目（20px 間隔）の中心色を拾って変換している。
     * 元絵は 45 行なので、上に空行を3つ足して 48 行に揃えた
     * （足が下端に来るまま。BattleScene は下端そろえで描画する）。
     *
     * 直すときは元の png ではなくこの配列を直接いじってよい。
     * ただし色は下のパレット10色から選ぶこと（元絵と同じ材料）。
     */
    abyssDragon: {
      palette: {
        ".": null,
        "K": "#0a0710",   // 輪郭・影（いちばん多い）
        "P": "#3d2c5c",   // 体の鱗
        "M": "#1d1430",   // 翼の膜
        "L": "#57407f",   // 光の当たる鱗
        "H": "#7a683f",   // 角と爪
        "X": "#000000",   // Black（差し込みの黒）
        "Y": "#222222",   // Dark Charcoal
        "Z": "#111111",   // Very Dark Gray
        "I": "#dddddd",   // Near White（目のハイライト）
        "W": "#ff5e5e"    // 目
      },
      pixels: [
        "................................................",
        "................................................",
        "................................................",
        "................................................",
        "......................L.L........KK.............",
        "......................LLLP.......KHKK...........",
        ".....KKKKKK...........LLLPP......KHHK...........",
        "..KKKKMMMMKKKKKK.......LMPKK.....KHHK...........",
        "..KKMMMMMMMMMMXKK......MLPKHK....KKHHK..........",
        "..KKKMMMMMMMMMMMKK......LKKKHKK....KHKK.........",
        "...MMMMMMMMMMMMMMK.K....LLKKHHHKK..KHHHK........",
        "....MMMMMMMMMMMMMKKK.....LMMKHHHK...KHHK........",
        ".....MMMMMMMMMKKKKZKK...LMMLKKHHHKK.KHHKK.......",
        ".....MMMMMMKKKKMMMMMKK...LLLKKKHHHKKKHHHKK......",
        ".....MMMMKKKMMMMMMMMMK...LLLMMKKHHHKKHHHKKK.....",
        ".....MMKKKMMMMMMMMMMMKK...LMMLKKHHHKKKKKKPPK....",
        "....MMKKMMMMMMMMMMMMMKK...MKKKKKKHKPPKKPPPPK....",
        "...KKKKMMMMMMMMMMMMKKK....MLLLKXKKKPPPPPPPPK....",
        "...KMMMMMMMMMMMMMKKKKK.....LLLKKPPPPPPPPPPKKX...",
        "...MMMMMMMMMMMMKKKMMKK.....LLLKPPPPPPPPPPPKIX...",
        "..MMM..MMMMMMMKKMMMMKK....LLLKKPPPPKKKPPPPKWK...",
        "...........KKKKMMMMMXK....KKKKKKZPPKIIKPPPKKK...",
        "............KKMMMMMMMKKKKKKKXPPKKPPPKWWKPPPPK...",
        ".KKK........KMMMMMMMMKKKKXPPPPPKKPPPPKKKPPPPK...",
        ".KPPKK.....KKMMMMMMMMMKKPPPPPPPPKKPPPPPPPPPPKK..",
        "..KPPK.....KKMMM..MKKKKPPPPPPPPPPPLLLPKPPPPPXK..",
        "..KPPPK...KKKKM.....KKXPPPPPPLLLLLLLLLKKPPPPPK..",
        "..KPPPK....KKK.....KKKPPPPPKPLLLLLLKXLLLKLPPLK..",
        "..KKPPPK..........KKPPPKPPPKLYLLLLLKKKLLLKPPKK..",
        "...KPPPPK.......KKPPPPPKPPPKLLYYLLKK..KLLLKK....",
        "...KKPPPK......KXPPPPPPKKPPKLLLLYYKK...KKKK.....",
        "....KPPPKK....KPPPPZXPPPKPPKKLLLLLKKK...........",
        "....KPPPKKKKKKPPPPKKKKZPKKPPPKKLLKKPPK..........",
        "....KPPPPPPPPPPPPKPPKKKPLKKPPPKKKXPPPPK.........",
        "....KPPPPPPPPPPPKPPPPPKKYLKKPHHKYKKPPPPKK.......",
        "....KPPPPPPPPPPPKPPPPPPKYLLLKHKLLKKKPPPHHK......",
        "....KLLPPPPPPPPPKPPPPPPKLYLLLKKKKK..KKKHK.......",
        ".....KLLPPPPPPLKPPPPPPPKLLYLLLKKPKK...KK........",
        "......KKLLPLLLXKPPPPPPPKLLYYYKKPPPKK............",
        ".......KKLLLKKKXPPPPPPPKLLLYKKPPPPPKK...........",
        ".........KKKK.KZPPPPPPKKLLLKKPPPPPPPK...........",
        "..............KKPPPPZKKKKKKKXXPPPPPKK...........",
        "..............KKKPPPKK.....KZPPPPPKK............",
        "..............KPPKKKK......KXPPPPKKKK...........",
        "..............KPPPPPK......KKPPPPPPHKK..........",
        "..............KPPPPPKK......KKPPPHPPHK..........",
        "..............KHPHPHKK.......KKKKKHKK...........",
        "..............KHKHKHK.............KK............"
      ]
    },

    /**
     * 灼熱の亀裂の主。α-5で 32×32 に描き直した。
     *
     * 前は 16×16 の丸い塊に耳を足しただけで、獣に見えていなかった。
     * いまは低く構えた四足獣にしてある。
     *   ・頭を下げ、腰を高くした捕食者の姿勢。まっすぐ立たせると犬に見える
     *   ・体を横いっぱいに伸ばす。ここで坑道の主より一回り大きく見せている
     *   ・脚は4本とも描く。2本だと座っているように見える
     *
     * ★ たてがみは「背中の炎の棘」にしてある。
     *   首から背中へ帯状に流すと、炎ではなくマントか翼に見えた。
     *   棘3本に分けて、あいだに体の色を残すと炎に見える。
     *   光らせるのは棘・尻尾・口の中だけ。耳の先まで光らせると触角に見える。
     *
     * ★ 後ろ脚2本のあいだは必ず2マス空ける。
     *   隣り合わせに置くと1つの塊に融合して、3本足に見える（実際に一度そうなった）。
     *   前脚は胸から生やす。胴からだけ生やすと、胴の左端との
     *   あいだに隙間ができて脚が浮く。
     *
     * ─── 立体に見せるためにやっていること ───
     * 最初は輪郭沿いに明暗を1pxずつ入れただけで、ヨミリュウと並べると
     * 一枚板に見えた。立体感は次の4つで出している。順番に効く。
     *
     *   1. 重なる面のあいだに「黒（K）の切れ目」を入れる。いちばん効く。
     *      同系色の濃淡でぼかすと、面が繋がって平らに見える
     *   2. 肩と腿を「丸い塊」として描く。四足獣が立体に見えるのはこの2つがあるから。
     *      あいだの脇腹は落として、2つの塊を分ける
     *   3. 奥側の脚2本を2段暗く落とす。4本を同じ明るさで塗ると同じ平面に並んで見える
     *   4. 明暗を6段（K/N/D/A/H/P）持つ。光は左上から。
     *      背中と頭のてっぺんに P のふちを通すと、丸みの頂点が分かる
     */
    magmaBeast: {
      palette: {
        ".": null,
        "K": "#2b0f08",   // 輪郭・面と面のさかい
        "N": "#3d1608",   // いちばん深い影（奥側の脚・脇腹）
        "D": "#5a2211",   // 影
        "A": "#8c3a1e",   // 体（熱を持った赤茶）
        "H": "#b25436",   // 光の当たる面
        "P": "#d4744f",   // いちばん明るいふち（背・頭のてっぺん）
        "F": "#ff7a2a",   // 背中の炎
        "E": "#ffb14a",   // 炎の明るいところ・口の中
        "W": "#ffe36e"    // 目
      },
      pixels: [
        "................................",
        "................................",
        "................................",
        "................................",
        "...KK....KK.....................",
        "..KHHK..KHHK....................",
        "..KHHK..KHHK....................",
        "...KHHKKHDK.....................",
        ".KKPPPPPPPPKK...................",
        "KPPKKPHHAKKKHK.EE...............",
        "KHHWWAAAAWWKHHEEEE.EE........EEE",
        "KHHWWAAAAWWKAHEFFEEEEE......EEEE",
        "KDAAAAADDDDKAKFFFFEFFE.EE...EFFE",
        ".KDDDDDDDDDDK.EFFFFFFFEEEE.EFFFE",
        "..KKEEEEEKAAAKAAAAAAAAEFFE.EFFE.",
        "...KKEEEEKAAAPPPPPPAAANNAAKFFE..",
        "...KHHDDAAAAPKPPPPAAANAPPPPPPK..",
        "....KKKKAAANAKHHHANKNAPPPPPPAAK.",
        "........KHHNAKHHHADKDDHHHHHHHAK.",
        "........KHHNAKHHHADKDDHHHHHHHAK.",
        "........KHHNAKHHHADKDDHHHHHHHAK.",
        "........KHHAKKKKKKNKNKKKKKHHAK..",
        "........KHHK.KNNNNNNKKKKKHHAK...",
        "........KHHK..KDDDKKAANNKKANNK..",
        "........KHHK..KDDK..KHHK..KDDK..",
        "........KKKK..KKKK..KKKK..KKKK..",
        "........KDDK..KNNK..KDDK..KNNK..",
        ".......KDDDDKKNNNNKKDDDDKKNNNNK.",
        ".......KKKKKKKKKKKKKKKKKKKKKKKK.",
        "................................",
        "................................",
        "................................"
      ]
    },

    // 16×16を2倍に拡大して塗り直した（やり方は batty のコメントを参照）。
    // 柄（S）だけは傘の紫ではなく白い段に置き換えている。
    // 傘と柄は別の材質なので、同じ階調で塗ると一続きの塊に見える
    sporin: {
      palette: {
        ".": null,
        "K": "#160f1e",   // 輪郭
        "N": "#3a2850",   // 面と面のさかい・いちばん深い影
        "D": "#5f3f80",   // 傘の影
        "P": "#8a5fb0",   // 傘（紫）
        "H": "#a87ed0",   // 傘の光の当たる面
        "U": "#bdb49e",   // 柄の影
        "S": "#e8e0d0",   // 柄
        "T": "#faf5e8",   // 柄の光の当たる面
        "W": "#e8d5ff",   // 傘のまだら
        "E": "#2a1f38"    // 目
      },
      pixels: [
        "................................",
        "................................",
        "...........KKKKKKKKKK...........",
        "..........KNNNNNNNNNNK..........",
        ".......KKKHHHHHHHHHHHHKKK.......",
        "......KNNNHPPPPPPPPPPHNNNK......",
        ".....KHHHHPPPPWWWWPPPPHHHHK.....",
        "....KNHPPPPPPPWWWWPPPPPPPHNK....",
        "...KHHPPWWWWPPPPPPPPWWWWPPHHK...",
        "..KNHPPPWWWWPPPPPPPPWWWWPPPHNK..",
        "..KNHPPPPPPPPPPPPPPPPPPPPPPDNK..",
        "..KNHPPPPPPPPPPPPPPPPPPPPPPDNK..",
        ".KHHPPPPPPWWWWPPPPWWWWPPPPPPDDK.",
        "KNHPPPPPPPWWWWPPPPWWWWPPPPPPPDNK",
        "KNHPPPPPPPPPPPPPPPPPPPPPPPPPPDNK",
        ".KHHDDDDPPPPPPPPPPPPPPPPDDDDDDK.",
        "..KNNNNNNNNNNNNNNNNNNNNNNNNNNK..",
        "...KKKKKNNNNNNNNNNNNNNNNKKKKK...",
        "........KNTSSSSSSSSSSUNK........",
        "........KNTSSSSSSSSSSUNK........",
        "........KNTSEESSSSEESUNK........",
        "........KNTSEESSSSEESUNK........",
        "........KNTSSSSSSSSSSUNK........",
        "........KNTSSSSSSSSSSUNK........",
        "........KNTSSSSSSSSSSUNK........",
        "........KNTSSSSSSSSSSUNK........",
        "........KNTSSSSSSSSSSUNK........",
        "........KNTUSSSSSSSSUUNK........",
        "........KNNNUSSSSSSUNNNK........",
        ".........KKKUUUUUUUUKKK.........",
        "............KNNNNNNK............",
        ".............KKKKKK............."
      ]
    },

    /**
     * 苔むす坑道の主。α-5で 32×32 に描き直した。
     *
     * 前は 16×16 に顔と短い脚を詰めた「箱」で、巨人に見えなかった。
     * いまは全身の人型にしてある。「石の巨人」を出しているのは次の3つ。
     *   ・胴より広い肩。ここが巨人らしさの正体で、細くすると案山子になる
     *   ・胴と腕のあいだの1マスの隙間。無いとただの太い塊に見える
     *   ・細い首。頭が肩に埋もれると顔が消える
     *
     * ★ 苔は「上を向いた面」にだけ、まだらに置いてある。
     *   全部の上端に1pxずつ乗せると蛍光ラインの作業着に見えたので、
     *   頭と肩（y<=14）に限り、3マス幅くらいのまとまりで生やしている。
     *
     * ★ 苔は「面と面のさかい（K）」より先に置く。
     *   あとから置くと切れ目を塗りつぶして、肩に緑の帯ができる。
     *
     * ─── 立体に見せるためにやっていること（magmaBeast と同じ4項目）───
     *   1. 重なる面のあいだに黒（K）の切れ目。あご下・腕の付け根・腰・肘・膝。
     *      ただし肩を横一文字に切ると天秤棒を担いだように見えるので、
     *      切るのは腕の付け根（左右の端）だけにしてある
     *   2. 胸と腿を「塊」として起こす。平らな板に手足を生やすと案山子になる
     *   3. 影の側（右）を一段落とす。左右が同じ明るさだと正面の板に見える
     *   4. 明暗6段（K/N/D/S/H/P）。光は左上から
     */
    mossGolem: {
      palette: {
        ".": null,
        "K": "#131a10",   // 輪郭・面と面のさかい・ひび
        "N": "#26261f",   // いちばん深い影
        "D": "#3b3a30",   // 石の影
        "S": "#6e6a5c",   // 石の体
        "H": "#918c7c",   // 光の当たる石
        "P": "#b3ae9c",   // いちばん明るいふち（胸の張り）
        "M": "#3f7030",   // 苔のふち
        "G": "#6bb04f",   // 苔
        "W": "#a8f0c4"    // 光る目
      },
      pixels: [
        "................................",
        "................................",
        "................................",
        "............KKKKKKKK............",
        "...........KGGGHHHGGK...........",
        "...........KKKKKKKKKK...........",
        "...........KNWWNNWWNK...........",
        "...........KNWWNNWWNK...........",
        "...........NNNNSSNNNN...........",
        "............KKHSSDKK............",
        "..............KHHK..............",
        "....KKKKKKKKKKKKKKKKKKKKKKKK....",
        "...KHHHHHHHHGGSSSSGGGMMMSSSGK...",
        "...KHHHHHHHHGGSSSSGGGMMMSSSGK...",
        "...KHHSSSSSSSSSSSSSSSSSSSSDDK...",
        ".KKKKKKKSSSSSSSSSSSSSSSSKKKKKKK.",
        ".KHHSSSSDSHHPPPPPPPHHHSDSSSSDSK.",
        "KHHSSSSSDSHHHPPPPPHHKHSDSSSSSSSK",
        "KHHSSSSSKSSHKHHHHHHKKSSKSSSSSDDK",
        "KHHSSDDK.KHHKKSSSSSSDDK.KSSSSDDK",
        "KKKKKKKK.KHHSKSSSSSSSSDKKKKKKKKK",
        "KHHSSSSSKKSSSSKSDSSSSSKKDDDDDDDK",
        "KHHSSSDDK.KHHSSSDSSDDK..KSSDDDDK",
        "KHHDDDDDK.KKKKKKKKKKKK..KKKKKKK.",
        ".KHHDDDK.KKKKKKK.KKKKKKK........",
        "..KKKKKK.KHHHHHK.KSSSSSK........",
        ".........KHHHHDK.KSSSSHK........",
        ".........KKKKKKK.KKKKKKK........",
        "........KHHDDDDDKDDDDDDDK.......",
        "........KHHKKDDDHDDDKDDDK.......",
        ".......KKKKKKKKKKKKKKKKKKK......",
        "................................"
      ]
    },

    // --- 灼熱の亀裂 ---

    /**
     * α-5で 32×32 に描き直した。
     *
     * ★ 形は 16×16 のときのまま。頭の炎・丸い体・大きな白い目・短い足。
     *   一度これを「二足の獣」に描き直したが、それは解像度の話ではなく
     *   キャラクターそのものを別物にしてしまっていた。
     *   このバージョンでやるのは大きさと陰影だけで、誰であるかは変えない。
     *
     * ★ 体は「角を丸めた四角」。球ではない。
     *   16×16の元の絵を数えると、幅11・高さ7で、側面はほぼ垂直だった。
     *   丸い球にすると、かわいくはなるが別のモンスターになる。
     *   階調も球のような放射状ではなく、上と左からの向きでつけている。
     *
     * 足の裏側を一段明るく戻して、床からの反射光にしてある。
     *
     * ★ 目は薄い黄の点だけ。白目も黒い瞳も置かない。
     *   32×32になったので白目と瞳を描き分けてみたが、
     *   目が大きくなったぶん睨んでいるように見えて怖くなった。
     *   16×16のときと同じ「点2つ」がこいつの顔。
     *   元は真っ白（#ffffff）だったが、橙の体の上では白が浮くので
     *   少し黄に寄せてある（#fff3c4）。
     *   丸く塗ろうとして半径で判定すると十字の光になるので、
     *   4×4の角を落とした塊で置いている。
     */
    flamin: {
      palette: {
        ".": null,
        "K": "#3a1002",   // 輪郭・面と面のさかい
        "D": "#9c3312",   // 影
        "R": "#e8542a",   // 体（赤）
        "H": "#ff7a45",   // 光の当たる面
        "P": "#ffa06b",   // ハイライト（左上）
        "O": "#ffa32e",   // 炎（橙）
        "Y": "#ffe66e",   // 炎（黄）
        "W": "#fff3c4"    // 目（薄い黄）
      },
      pixels: [
        "................................",
        "................................",
        "...............YY...............",
        "..............YYYY..............",
        ".............YYOOYY.............",
        ".............YOOOOY.............",
        "............YOOOOOOY............",
        "............YOOOOOOY............",
        "...........YOOOOOOOOY...........",
        "...........YOOOOOOOOY...........",
        "............YOOOOOOOY...........",
        "........KKKKKKKKKKKKKKKK........",
        "......KKPPPPRRRRRRRRHPPPKK......",
        ".....KPPHHHHRRRRRRRRRHHHPPK.....",
        ".....KPHHHHHRRRRRRRRRHHHHHK.....",
        ".....KPHHHHWWRRRRRRWWHHHHHK.....",
        ".....KPHHHWWWWRRRRWWWWRRHHK.....",
        ".....KPHHHWWWWRRRRWWWWRRRDK.....",
        ".....KPHHHRWWRRRRRRWWRRRRDK.....",
        ".....KPHHHRRRRRRRRRRRRRRRDK.....",
        ".....KPHHHRRRRRRRRRRRRRRRDK.....",
        ".....KPHHHRRRRRRRRRRRRRRRDK.....",
        ".....KPHHHRRRRRRRRRRRRRRDDK.....",
        "......KKHHHRRDDDDDDRRRRDKK......",
        "........KKKKKKKKKKKKKKKK........",
        ".........KPHK......KPHK.........",
        ".........KDDK......KDDK.........",
        "........KKKKKK....KKKKKK........",
        "................................",
        "................................",
        "................................",
        "................................"
      ]
    }
  });
})(window.MyGame);
