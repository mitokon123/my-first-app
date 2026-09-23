/**
 * sprites_marsh.js
 * 腐食の毒沼（ステージ4）のモンスターの絵。
 *
 * MyGame.extend("sprites", ...) で足しているので、
 * sprites_abyss.js を触らずに1つのファイルとして増やせる。
 *
 * ▼ 描き方は既存の32×32と同じ決まりにそろえてある
 *   K … 輪郭（いちばん暗い）
 *   N … いちばん深い影（面と面のさかい・奥側）
 *   D … 影
 *   A … 体の地の色
 *   H … 光の当たる面
 *   P … いちばん明るいふち
 *   W … 目
 *   光は**左上から**当てる（フレイミンで決めた向き。全種そろえてある）。
 *
 * ▼ 立体に見せるための4点（マグマウルフのコメントと同じ）
 *   1. 面ごとに色を変える（線ではなく面で影をつける）
 *   2. 光の当たるふちに1段明るい色を置く
 *   3. 奥にあるものほど暗くする（手前の脚と奥の脚で色を変える）
 *   4. 接地する下端に暗い色を敷いて、床から浮かせない
 */
(function (NS) {
  "use strict";

  NS.extend("sprites", {

    /**
     * ドクバチ。沼の雑魚。速いが脆い。
     *
     * 縞のある腹と、下へ伸びた針で「毒を刺す相手」だと一目で分かるようにしてある。
     * 腹は 黄緑(H) と 紫黒(V) を交互に3段重ね、下へ向かって細くした。
     * 翅は本体より淡い灰青(G)。同じ緑で塗ると体と一続きの塊に見えてしまう。
     */
    venomBee: {
      palette: {
        ".": null,
        "K": "#0d1207",   // 輪郭
        // ※ 深い影（N）は置いていない。小さい虫なので3段も影を刻むと潰れる
        "D": "#455a1c",   // 影
        "A": "#7a962a",   // 体（黄緑）
        "H": "#a3c23a",   // 光の当たる面
        "P": "#c8e05a",   // いちばん明るいふち（毒の色）
        "V": "#3a2150",   // 腹の縞（紫黒）
        "U": "#5c3a7a",   // 縞の明るいところ
        "G": "#93a8b4",   // 翅
        "W": "#ffe36e"    // 目
      },
      pixels: [
        "................................",
        "........K..............K........",
        ".........K............K.........",
        "..........K..........K..........",
        "..........KKKKKKKKKKKK..........",
        ".........KHHHHHHHHHHHHK.........",
        "........KHHWWWWHHWWWWHHK........",
        "........KHAWWWWHHWWWWAHK........",
        ".........KAAAAAAAAAAAAK.........",
        "..........KADDDDDDDDAK..........",
        "...........KKKKKKKKKK...........",
        "..KKKKKKKKK.KKKKKKKK.KKKKKKKKK..",
        "..KGGGGGGGK.KPPHHHPK.KGGGGGGGK..",
        "..KGGGGGGGK.KPHHHHHK.KGGGGGGGK..",
        "..KGGGGGGGK.KAHHHHAK.KGGGGGGGK..",
        "..KKGGGGGKK.KADDDDAK.KKGGGGGKK..",
        "...KKKKKKK..KAAAAAAK..KKKKKKK...",
        "..........KPPHHHHHHPPK..........",
        ".........KPHHHHHHHHHHPK.........",
        ".........KVVVVVVVVVVVVK.........",
        ".........KUVVVVVVVVVVUK.........",
        ".........KHHHHHHHHHHHHK.........",
        ".........KAHHHHHHHHHHAK.........",
        ".........KVVVVVVVVVVVVK.........",
        ".........KUVVVVVVVVVVUK.........",
        "..........KHHHHHHHHHHK..........",
        "..........KAHHHHHHHHAK..........",
        "..........KVVVVVVVVVVK..........",
        "...........KUVVVVVVUK...........",
        "............KAHHHHAK............",
        ".............KAHAK..............",
        "...............KK..............."
      ]
    },

    /**
     * ドロガメ。沼の壁役。
     *
     * ★ 「硬い」を甲羅の**模様**で伝える。
     *   最初は丸いドームだけで描いたが、遠目には苔むした岩と区別がつかなかった。
     *   影の色（D）で甲羅を6枚の板に割ってある。この線が入るだけで甲羅に見える。
     *
     * 甲羅は緑、体と脚は泥の色（B系）。材質を分けないと一続きの塊になる
     * （キノコンの傘と柄を分けたのと同じ理由）。
     */
    mudTurtle: {
      palette: {
        ".": null,
        "K": "#0d1207",   // 輪郭
        "N": "#23301a",   // 甲羅の下側（いちばん深い影）
        "D": "#3d5226",   // 甲羅の板のさかい
        "A": "#5f7a33",   // 甲羅
        "H": "#86a344",   // 甲羅の光の当たる面
        "P": "#b4cc63",   // 甲羅のてっぺん
        "M": "#3a2c18",   // 体の影（泥）
        "B": "#6b5636",   // 体（泥色）
        "Y": "#937c4e",   // 体の光の当たる面
        "W": "#ffe36e"    // 目
      },
      pixels: [
        "................................",
        "................................",
        "................................",
        "................................",
        "................................",
        "..........KKKKKKKKKKKK..........",
        ".......KKKPPPPPPPPPPPPKKK.......",
        ".....KKPPPPPHHHHHHHHPPPPPKK.....",
        "....KPPPHHHHHHHHHHHHHHHHPPPK....",
        "...KPPHHHHHHHDDDDDDHHHHHHHPPK...",
        "..KPHHHHHHDDDAAAAAADDDHHHHHHPK..",
        "..KHHHHHDDDAAAAAAAAAADDDHHHHHK..",
        ".KHHHHDDDAAAAAAAAAAAAAADDDHHHHK.",
        ".KHHHDDDAAAAAAAAAAAAAAAADDDHHHK.",
        ".KHHDDDAAAADDAAAAAADDAAAADDDHHK.",
        ".KHDDDAAAAADDAAAAAADDAAAAADDDHK.",
        ".KDDDAAAAAADDAAAAAADDAAAAAADDDK.",
        ".KDDNNNNNNNNNNNNNNNNNNNNNNNNDDK.",
        "..KKNNNNNNNNNNNNNNNNNNNNNNNNKK..",
        "...KKKKKKKKKKKKKKKKKKKKKKKKKK...",
        "....KYYYK...KYYYYYYK...KYYYK....",
        "...KYYYYYK.KYYWWYYWWYYK.KYYYYYK.",
        "...KYBBBYK.KYBWWBBWWBYK.KYBBBYK.",
        "...KBBBBBK.KBBBBBBBBBBK.KBBBBBK.",
        "...KBBMBBK.KBBMMMMMMBBK.KBBMBBK.",
        "...KMMMMMK..KMMMMMMMMK..KMMMMMK.",
        "....KKKKK....KKKKKKKK....KKKKK..",
        "................................",
        "................................",
        "................................",
        "................................",
        "................................"
      ]
    },

    /**
     * ヌマボネ。沼に沈んだ者の骨。搦め手の役。
     *
     * 下半身は作らず、泥（V/U）に沈んだまま浮いている形にしてある。
     * 脚を描くとただの骸骨になるが、沼から生えていると「この場所のもの」になる。
     * 眼窩だけ毒々しい緑（W）に光らせて、骨の灰色の中で一点だけ目を引かせる。
     */
    marshBone: {
      palette: {
        ".": null,
        "K": "#0a0d10",   // 輪郭
        "N": "#1c2430",   // 肋の奥（いちばん深い影）
        "D": "#3d4a52",   // 骨の影
        "A": "#7a8a90",   // 骨
        "H": "#a8b8bc",   // 骨の光の当たる面
        "P": "#d8e4e0",   // いちばん明るいふち
        "V": "#2a3a1e",   // 沈んでいる泥
        "U": "#465a28",   // 泥の明るいところ
        "W": "#8ce05a"    // 眼窩の光
      },
      pixels: [
        "................................",
        "................................",
        "................................",
        "................................",
        "................................",
        "..........KKKKKKKKKKKK..........",
        ".........KPPPPPPPPPPPPK.........",
        "........KPHHHHHHHHHHHHPK........",
        "........KPHHHHHHHHHHHHPK........",
        "........KHHKKKKHHKKKKHHK........",
        "........KHAKWWKHHKWWKAHK........",
        "........KHAKKKKAAKKKKAHK........",
        ".........KAAAAKKKKAAAAK.........",
        ".........KDAAKAKKAKAADK.........",
        "..........KDDDDDDDDDDK..........",
        ".............KAHHAK.............",
        ".............KAHHAK.............",
        "........KKPPPPPPPPPPPPPPKK......",
        ".......KPHHHKKKKKKKKHHHPK.......",
        ".......KAHHKNNNNNNNNKHHAK.......",
        ".......KAHHKNNNNNNNNKHHAK.......",
        ".......KDAAKNNNNNNNNKAADK.......",
        ".......KDAAKNNNNNNNNKAADK.......",
        "........KKDDKNNNNNNKDDKK........",
        "..........KKDDDDDDDDKK..........",
        ".........KUUVVVVVVVVUUK.........",
        "........KUUVVVVVVVVVVUUK........",
        ".......KUUVVVVVVVVVVVVUUK.......",
        "......KUUVVVVVVVVVVVVVVUUK......",
        "......KKVVVVVVVVVVVVVVVVKK......",
        ".......KKKKKKKKKKKKKKKKKK.......",
        "................................"
      ]
    },

    /**
     * ヌシガエル。腐食の毒沼の主。
     *
     * ★ 他の主と形がかぶらないように選んだ姿。
     *   モスゴーレム（縦に長い岩）／マグマウルフ（四つ足の獣）／
     *   キングスライム（丸い塊）／ヨミリュウ（翼）と並べて、
     *   「横に広くて低い」のはこれだけになる。
     *
     * 横幅いっぱいに口を割って、盤面に出たときの圧を出している。
     * 背中のいぼ（E）は毒の色（階段記号と同じ #c8e05a）で、
     * 「この沼の毒はこいつが出している」と見て分かるようにした。
     *
     * 32×32。表示は sizeScale 1.3 で一回り大きく出す（他の主と同じやり方）。
     */
    marshLord: {
      palette: {
        ".": null,
        "K": "#0a1008",   // 輪郭
        "N": "#16240e",   // 腹の下（いちばん深い影）
        "D": "#2c4416",   // 影
        "A": "#4a6b1e",   // 体
        "H": "#6f9128",   // 光の当たる面
        "P": "#9cbb3e",   // いちばん明るいふち（背）
        "V": "#5a2a4a",   // 口の中
        "U": "#8a4a6a",   // 口の中の明るいところ
        "E": "#c8e05a",   // 背中のいぼ（毒）
        "W": "#ffe36e"    // 目
      },
      pixels: [
        "................................",
        "................................",
        "................................",
        "................................",
        "................................",
        "........KKKK........KKKK........",
        ".......KPPPPK......KPPPPK.......",
        "......KPWWWWPK....KPWWWWPK......",
        "......KPWWKKWPK..KPWWKKWPK......",
        "......KHWWKKWHK..KHWWKKWHK......",
        ".....KHHHHHHHKKKKKKHHHHHHHK.....",
        "....KPHHHHHHHHHHHHHHHHHHHHPK....",
        "...KPHHHHHHHHHHHHHHHHHHHHHHPK...",
        "..KPHHEHHHHHHHHHHHHHHHHHEHHHPK..",
        "..KPHHHHHHHHHHHHHHHHHHHHHHHHPK..",
        "..KPHHEHHHHHHHHHHHHHHHHHEHHHPK..",
        "..KHHHHHHHHHHHHHHHHHHHHHHHHHHK..",
        "..KKKKKKKKKKKKKKKKKKKKKKKKKKKK..",
        "..KVVVVVVVVVVVVVVVVVVVVVVVVVVK..",
        "..KUVVVVVVVVVVVVVVVVVVVVVVVVUK..",
        "..KKKKKKKKKKKKKKKKKKKKKKKKKKKK..",
        "..KAHHHHHHHHHHHHHHHHHHHHHHHHAK..",
        "..KAAHHHHHHHHHHHHHHHHHHHHHHAAK..",
        "..KDAAAAAAAAAAAAAAAAAAAAAAAADK..",
        "...KDDAAAAAAAAAAAAAAAAAAAADDK...",
        "....KDDDNNNNNNNNNNNNNNNNDDDK....",
        ".....KKDDDDDDDDDDDDDDDDDDKK.....",
        ".KHHHHHK.KDDDDDDDDDDDDDK.KHHHHHK",
        ".KAHHHAK.KNNNNNNNNNNNNNK.KAHHHAK",
        ".KAAAAAK.KKKKKKKKKKKKKKK.KAAAAAK",
        ".KKKKKKK................KKKKKKK.",
        "................................"
      ]
    }
  });
})(window.MyGame);
