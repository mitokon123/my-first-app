/**
 * story.js
 * 物語の場面。決まった場面に来たとき、1度だけ流れる。
 *
 * 中身の決まりごとは ストーリー構成.md。**そこに書かれていない固有名詞・設定は足さない。**
 * 本文の元は scenario_yoran.md（揺籃の穴 場面1〜8）。直すときは両方をそろえる。
 *
 * scenes : 場面のひとつひとつ
 *   id       : 識別子。**見たかどうかをこのidでセーブに残す**ので、
 *              一度出した場面のidは変えないこと（変えるともう一度流れる）
 *   trigger  : どこで流れるか。下の一覧から選ぶ
 *   when     : 流れる条件（省略するといつでも）。
 *                cleared: "ダンジョンid" … そのダンジョンをクリアしている
 *                event:   "出来事id"     … その出来事（data/dungeons.js の events）を済ませている
 *                result:  "win" など     … event の戦いの結果（win / lose / flee / scouted。配列で複数可。
 *                                           null は「結果が残っていない」＝結果を残す前のセーブ）
 *                caught:  "種族id"       … その種族を仲間にしたことがある
 *                seenAny: ["場面id", …]  … どれかをもう見た
 *                notSeen: ["場面id", …]  … どれもまだ見ていない
 *   order    : 同じ trigger に複数あるときの順番（小さいほど先）。
 *              条件を満たした場面が2つ以上あれば、この順に続けて流れる
 *   draft    : true にすると、画面の右上に「（仮の文章）」の印が出る。文章が決まったら消す
 *   bgm      : 流す曲の id（data/audio.js の bgm）。"none" で止める。省略すると、いま鳴っている曲のまま
 *   letterbox: true にすると、上下に黒い帯が出る（映画のような画面）
 *   style    : 既定の見せ方。ページごとに上書きできる
 *     "narration" … 真ん中に文が浮かぶ（語り）
 *     "dialogue"  … 画面の下の窓に、話す人の名前と台詞が出る（会話）
 *     "title"     … 大きな見出しが、字間を詰めながら浮かぶ（区切り）
 *     "choice"    … 選択肢。choices: [{ label, pages: [...] }]。
 *                   前のページの台詞を窓に出したまま、右上に項目を並べる（lines を書けばそちらを出す）。
 *                   選んだ項目の pages がすぐあとに入り、終わったら選択肢の後ろのページへ続く
 *   bg       : 最初の背景（data/ui.js の story.backdrops の id）
 *   pages    : ページの並び。決定（クリック）で次へ進む
 *     lines   : 本文。1要素が1行。**折り返さないので、長すぎる行は自分で分ける**
 *               目安：語り 4行・25字まで／会話 3行・30字まで／見出し 2行・10字まで
 *     speaker : 話す人の名前（dialogue のときだけ出る）
 *     style   : このページだけ見せ方を変える
 *     bg      : 背景を変える。書かなければ前のページのまま（変わるときは溶けて切り替わる）
 *     transition: "black" … 暗転。真っ暗から明けていく（背景が前のページと同じなら暗転しない）
 *     if      : そのページを入れる条件（書き方は when と同じ）。場面の始まりで決まる
 *     marks   : そのページを見たら、ここに書いた場面も見たことにする（別の場面の代わりを務めるページ）
 *     delay   : 文字が出はじめるまで待つミリ秒（「少し間を置く」）
 *     actors  : 画面に立たせるもの。書かなければ前のページのまま。[] で全員下がる
 *       monster: "種族id" / player: true / sprite: "絵のid" のどれか
 *       x, y   : x は中心、y は足元（px）。size は大きさ（px）
 *       enter  : 登場の動き fade / rise / drop / left / right / grow（前のページにいたものは動かない）
 *       motion : 動き（data/motions.js）。モンスターは種族の動き、主人公は立ち姿の動きが既定
 *       silhouette : 色を書くと、その色の影だけを描く（正体を見せない）
 *       glow   : 後ろに淡い光を置く色
 *       id     : 同じものとして扱う名前。位置を変えて出し直したいときは、別の id にする
 *       ※ いなくなったものは、その場で薄れて下がる
 *     fx      : ページの頭の演出。1つか配列で
 *                 "shake"（揺れ）/ "flash"（光）/ { type: "memory", bg } 別の背景を一瞬だけ重ねる
 *                 { type, power, time, color, alpha } で強さや長さも変えられる
 *               揺れと光は、設定「エフェクトの濃さ」に従う（0 なら出ない）
 *     se      : ページの頭で鳴らす効果音（data/audio.js の se）
 *     bgm     : ページの頭で曲を変える（"none" で止める）
 *     cue     : 文字を出しきったあとに起きる演出（「この文のあと」）。
 *               { actors, fx, se }。actors を書くと、そこで立ち絵が入れ替わる。
 *               at にミリ秒を書くと、ページの頭からその時間で起きる
 *
 * ▼ 文の中で使える差し込み
 *   {player} … 主人公の名前（プレイヤーが決めたもの）
 *   {me}     … 主人公の一人称（私・僕・俺 など。プレイヤーが選んだもの。data/player.js）
 *
 * ▼ 流れる場面（trigger）の一覧
 *   newGame    … 新しく始めて、名前と見た目を決めた直後（拠点へ行く前）
 *   homeReturn … 拠点に着いたとき（探索の結果画面のあと・「続きから」で始めたとき）。
 *                when で「どの主を倒したあとか」を決める
 *   ★ 場面を増やすときは、その画面で game.playStory(trigger, 次の画面) を呼ぶ1行を足す。
 *     既にある trigger を使うならコードは触らない。
 *
 * ▼ 古いセーブ（この仕組みができる前）を読んだ場合
 *   その時点にある場面は**全部もう見た扱い**にする（チュートリアルと同じ）。
 *   あとで足した場面は、その人にもふつうに流れる。
 *
 * 画面の配置・背景の中身は data/ui.js の story、案内の文言は data/messages.js の story。
 * 人物の絵（オルド・イレーネ・探索者）は data/sprites_story.js。
 */
(function (NS) {
  "use strict";

  // --- 拠点の夜（背景 camp）で人物が立つ位置。たき火は x 664〜716 ---
  //   たき火の左に、右から 主人公・スライム・オルド・イレーネ・探索者 と並ぶ
  var PLAYER = { player: true, x: 596, y: 414, size: 64, enter: "fade" };
  var SLIME  = { monster: "slime", x: 534, y: 414, size: 46, enter: "fade" };
  var ORD    = { id: "ord", sprite: "npcOrd", motion: "breathe", x: 462, y: 414, size: 68, enter: "fade" };
  var IRENE  = { id: "irene", sprite: "npcIrene", motion: "breathe", x: 388, y: 414, size: 66, enter: "fade" };
  var SCOUT  = { id: "scout", sprite: "npcScout", motion: "breathe", x: 300, y: 414, size: 64, enter: "left" };

  // 「小さな、青い影」（あの夜、主人公の前に立った何か。正体は見せない）
  var BLUE_SHADOW = { id: "blueShadow", monster: "slime", x: 400, y: 520, size: 64,
                      enter: "fade", silhouette: "#2a4a9a" };

  // 拠点に連れて帰ったヨミリュウ（場面4-誘う・場面7）。人物の左に立つ
  var DRAGON_CAMP = { id: "dragonCamp", monster: "abyssDragon", x: 210, y: 414, size: 170, enter: "fade" };

  // --- 場面4（ヨミリュウの報告）で、結果が違っても同じページ ---

  // 頭：「闇が息をした。」のあとに、竜を影だけで立たせる／揺れ／闇の息
  var YOMI_OPEN = {
    lines: [
      "深層の四階。",
      "闇が息をした。"
    ],
    cue: {
      actors: [ { id: "dragon", monster: "abyssDragon", x: 400, y: 545, size: 230,
                  enter: "fade", silhouette: "#0b0d1c", glow: "#5a44a8" } ],
      fx: ["shake"], se: "darkBreath", hold: 900
    }
  };
  // 暗転して拠点の夜。イレーネが立つ
  var YOMI_ASK = { transition: "black", bg: "camp", style: "dialogue", speaker: "イレーネ",
                   actors: [ PLAYER, SLIME, IRENE ], lines: [ "竜、ですか。揺籃の穴に。" ] };
  var YOMI_NO_RECORD = { style: "dialogue", speaker: "イレーネ", lines: [
    "揺籃は、探索者が最初に潜る穴です。",
    "竜が出たという記録は、協会に一つもありません。"
  ] };
  var YOMI_SHADOW = { style: "dialogue", speaker: "イレーネ", lines: [
    "暗い深層では、影が大きく見えるものです。",
    "初めての試験なら、なおさら。"
  ] };
  var YOMI_INSIST = { style: "dialogue", speaker: "{player}", lines: [
    "見間違いじゃありません。",
    "{me}は、この目で見ました。記録にも残しています。"
  ] };
  var YOMI_RECEIVE = { style: "dialogue", speaker: "イレーネ", lines: [ "記録は、受け取りますよ。" ] };
  // 前の台詞から少し間を置く
  var YOMI_REJECT = { style: "dialogue", speaker: "イレーネ", delay: 900, lines: [ "受理はしませんが。" ] };
  // イレーネが下がり、オルドが立つ
  var YOMI_ORD_SILENT = { actors: [ PLAYER, SLIME, ORD ], lines: [
    "オルドは何も言わなかった。",
    "ただ、じっと深淵のほうを見ていた。"
  ] };

  // 場面8（初めて全滅したとき）の本文。場面4-負けにも差し込むので、ここに置く
  var FIRST_DEFEAT_LINES = [
    "気がつくと、たき火のそばだった。",
    "持っていたはずの素材は、",
    "どこにもない。"
  ];

  NS.rawData.story = {
    scenes: {

      /** --- 場面1 オープニング（新しく始めた直後） --- */
      opening: {
        id: "opening",
        trigger: "newGame",
        order: 1,
        letterbox: true,
        bgm: "none",          // 曲なし（炎の音だけ）
        style: "narration",
        bg: "burning",
        pages: [
          { se: "fire", lines: [
            "あの夜のことを、今も覚えている。",
            "村が燃えていた。",
            "深淵から溢れたモンスターが",
            "すべてを踏み潰していった。"
          ] },
          { fx: ["shake"], se: "bodyPress", lines: [
            "クロニクラーだった親は、",
            "{me}を背に庇い、",
            "炎の向こう――深淵へと消えた。"
          ] },
          { actors: [ BLUE_SHADOW ], lines: [
            "最後に見たのは、",
            "{me}の前に立ちはだかる、",
            "小さな、青い影だった。"
          ] },
          { transition: "black", bg: "camp", bgm: "home", actors: [ PLAYER ], lines: [
            "それから、何年かが過ぎた。",
            "{me}は今、深淵のほとりにいる。",
            "あの夜の続きを、記録するために。"
          ] },
          { style: "dialogue", speaker: "オルド", actors: [ PLAYER, ORD ], lines: [
            "お前が{player}か。",
            "明日の試験は揺籃の穴だ。",
            "四つの区画を抜け、主を記録して戻れ。"
          ] },
          { style: "dialogue", speaker: "オルド", actors: [ PLAYER, SLIME, ORD ], lines: [
            "同行するモンスターを一体、連れていく決まりだ。",
            "協会で預かっていたスライムだ。"
          ] },
          { style: "dialogue", speaker: "{player}", lines: [
            "……"
          ] },
          { style: "dialogue", speaker: "オルド", lines: [
            "怖いか？",
            "……それでいい。",
            "怖がれる奴は、生きて戻る。"
          ] },
          { lines: [
            "スライムは、{me}の足元から離れなかった。",
            "{me}は、その体に触れることが",
            "できなかった。"
          ] },
          { style: "title", bg: "night", actors: [], lines: [
            "揺籃の穴",
            "クロニクラー認定試験"
          ] }
        ]
      },

      /** --- 場面2 坑道の主のあと（苔むす坑道をクリアして拠点に戻ったとき） --- */
      mineCleared: {
        id: "mineCleared",
        trigger: "homeReturn",
        when: { cleared: "mossyMine" },
        order: 10,
        bgm: "home",
        bg: "camp",
        style: "dialogue",
        pages: [
          { speaker: "オルド", actors: [ PLAYER, SLIME, ORD ], lines: [
            "坑道の主を記録したか。",
            "見せてみろ。"
          ] },
          { style: "narration", lines: [
            "オルドは黙って頁をめくり、",
            "ある一行で、指を止めた。"
          ] },
          // 1行目はスライムの図鑑の説明文の引用（早見表/図鑑説明文.txt）。図鑑を変えたらここも揃える
          { speaker: "オルド", lines: [
            "「人を襲う可能性はある」か。",
            "……そいつは今日、何度お前の前に出た？"
          ] },
          { speaker: "{player}", lines: [
            "数えきれないくらい……"
          ] },
          { speaker: "オルド", lines: [
            "……そうか。記録は見たとおりに書け。",
            "怖いなら怖いと書けばいい。",
            "それが、クロニクラーの仕事だ。"
          ] }
        ]
      },

      /** --- 場面3 亀裂の主のあと（灼熱の亀裂をクリアして拠点に戻ったとき） --- */
      fissureCleared: {
        id: "fissureCleared",
        trigger: "homeReturn",
        when: { cleared: "scorchingFissure" },
        order: 20,
        bgm: "home",
        bg: "camp",
        style: "dialogue",
        pages: [
          { speaker: "オルド", actors: [ PLAYER, ORD ], lines: [
            "灼熱の獣を越えたか。",
            "……亀裂の熱も、モンスターも、妙に強くなかったか。"
          ] },
          // 選択肢。どちらを選んでも、最後の語りのページへ続く
          { style: "choice", choices: [
            { label: "はい", pages: [
              { speaker: "オルド", lines: [
                "そうだったろう。",
                "昔の揺籃は、もっとおとなしい穴だった。"
              ] },
              { speaker: "オルド", lines: [
                "ここ数年、底のほうで何かが詰まっている。",
                "……気のせいならいいがな。"
              ] }
            ] },
            { label: "いいえ", pages: [
              { speaker: "オルド", lines: [
                "そうか。……お前が強くなったのかもしれんな。",
                "だが、昔の揺籃は、もっとおとなしい穴だった。"
              ] },
              { speaker: "オルド", lines: [
                "ここ数年、底のほうで何かが詰まっている。",
                "……気のせいならいいがな。"
              ] }
            ] }
          ] },
          // スライムはたき火のそばで丸くなり、主人公は少し離れて腰を下ろす
          { style: "narration",
            actors: [
              { id: "playerApart", player: true, x: 548, y: 414, size: 64, enter: "fade" },
              { monster: "slime", x: 640, y: 420, size: 40, enter: "fade" },
              ORD
            ],
            lines: [
              "スライムは、たき火のそばで丸くなっていた。",
              "{me}は、少し離れて腰を下ろした。",
              "それでも、昨日よりは近かった。"
            ] }
        ]
      },

      /**
       * --- 場面4 ヨミリュウの報告（静寂の深層の地下4階でヨミリュウに襲われて戻ったとき） ---
       * 戦いの結果で4つに分かれる（負け・逃げ・勝ち・誘う）。頭の1ページはどれも同じ。
       * 「負け」には、結果を残す前のセーブ（result が null）も含める
       */
      yomiryuReport: {
        id: "yomiryuReport",
        trigger: "homeReturn",
        when: { event: "yomiryuAmbush", result: ["lose", null] },
        order: 30,
        letterbox: true,
        bgm: "none",          // 曲なし
        bg: "depths",
        style: "narration",
        pages: [
          YOMI_OPEN,
          { lines: [
            "気づいたときには、",
            "{me}たちは地に伏していた。"
          ] },
          // 初めての全滅がこの戦いだったときだけ、場面8をここに差し込む（場面8は別には流れない）
          { "if": { notSeen: ["firstDefeat"] }, marks: "firstDefeat",
            transition: "black", bg: "camp", actors: [ PLAYER, SLIME ],
            lines: FIRST_DEFEAT_LINES },
          YOMI_ASK,
          { style: "dialogue", speaker: "{player}", lines: [
            "深層の四階です。黒い鱗の竜が、闇を吐いて……。",
            "ひと息で、全員が倒されかけました。"
          ] },
          YOMI_NO_RECORD,
          YOMI_SHADOW,
          YOMI_INSIST,
          YOMI_RECEIVE,
          YOMI_REJECT,
          YOMI_ORD_SILENT
        ]
      },

      /** --- 場面4-逃げ --- */
      yomiryuReportFled: {
        id: "yomiryuReportFled",
        trigger: "homeReturn",
        when: { event: "yomiryuAmbush", result: "flee" },
        order: 30,
        letterbox: true,
        bgm: "none",
        bg: "depths",
        style: "narration",
        pages: [
          YOMI_OPEN,
          { lines: [
            "{me}たちは、振り返らずに走った。",
            "背中を、闇の気配が追ってきた。"
          ] },
          YOMI_ASK,
          { style: "dialogue", speaker: "{player}", lines: [
            "深層の四階です。黒い鱗の竜が、闇を吐いて……。",
            "逃げるのが、やっとでした。"
          ] },
          YOMI_NO_RECORD,
          YOMI_SHADOW,
          YOMI_INSIST,
          YOMI_RECEIVE,
          YOMI_REJECT,
          YOMI_ORD_SILENT
        ]
      },

      /** --- 場面4-勝ち --- */
      yomiryuReportWon: {
        id: "yomiryuReportWon",
        trigger: "homeReturn",
        when: { event: "yomiryuAmbush", result: "win" },
        order: 30,
        letterbox: true,
        bgm: "none",
        bg: "depths",
        style: "narration",
        pages: [
          YOMI_OPEN,
          { lines: [
            "何度も倒れかけ、",
            "それでも、{me}たちは立っていた。",
            "竜は、深淵の闇へと崩れていった。"
          ] },
          YOMI_ASK,
          { style: "dialogue", speaker: "{player}", lines: [
            "深層の四階です。黒い鱗の竜が、闇を吐いて……。",
            "なんとか、倒しました。"
          ] },
          { style: "dialogue", speaker: "イレーネ", lines: [
            "試験中の新人が、竜種を。",
            "……ますます、信じがたいですね。"
          ] },
          YOMI_INSIST,
          YOMI_RECEIVE,
          YOMI_REJECT,
          YOMI_ORD_SILENT
        ]
      },

      /** --- 場面4-誘う（ヨミリュウのスカウトに成功して戻ったとき） --- */
      yomiryuReportScouted: {
        id: "yomiryuReportScouted",
        trigger: "homeReturn",
        when: { event: "yomiryuAmbush", result: "scouted" },
        order: 30,
        letterbox: true,
        bgm: "none",
        bg: "depths",
        style: "narration",
        pages: [
          YOMI_OPEN,
          { lines: [
            "闇の中で、竜はこちらを見ていた。",
            "そして――{me}たちの後ろに、",
            "静かに、ついてきた。"
          ] },
          // ここで初めて竜の姿を見せる
          { transition: "black", bg: "camp", actors: [ DRAGON_CAMP, PLAYER, SLIME ], lines: [
            "野営地が、静まり返った。"
          ] },
          { style: "dialogue", speaker: "イレーネ", actors: [ DRAGON_CAMP, PLAYER, SLIME, IRENE ], lines: [
            "……これは。"
          ] },
          { style: "dialogue", speaker: "{player}", lines: [
            "深層の四階にいました。",
            "揺籃の穴に、竜がいたんです。"
          ] },
          { style: "dialogue", speaker: "イレーネ", lines: [
            "……ええ。"
          ] },
          { style: "dialogue", speaker: "イレーネ", delay: 900, lines: [
            "このことは、しばらく伏せておいてください。",
            "探索者たちが、騒ぎますから。"
          ] },
          { actors: [ DRAGON_CAMP, PLAYER, SLIME, ORD ], lines: [
            "オルドが、喉の奥で小さく笑った。"
          ] },
          { style: "dialogue", speaker: "オルド", lines: [
            "誰も信じない竜を、連れて帰ってきたか。"
          ] }
        ]
      },

      /** --- 場面5 深層の主のあと（静寂の深層をクリアして拠点に戻ったとき） --- */
      depthsCleared: {
        id: "depthsCleared",
        trigger: "homeReturn",
        when: { cleared: "silentDepths" },
        order: 40,
        bgm: "home",
        bg: "camp",
        style: "narration",
        pages: [
          { lines: [
            "スライムたちの王を前にしても、",
            "この小さな一体は、{me}の前から",
            "一歩も退かなかった。"
          ] },
          // 燃える村を一瞬だけ重ねる／小さな青い影
          { fx: [{ type: "memory", bg: "burning" }],
            actors: [ { id: "blueShadow", monster: "slime", x: 400, y: 410, size: 60,
                        enter: "fade", silhouette: "#2a4a9a" } ],
            lines: [
              "あの夜と、同じように。"
            ] },
          { style: "dialogue", speaker: "オルド", actors: [ PLAYER, ORD ], lines: [
            "いい相棒を持ったな。"
          ] },
          { style: "dialogue", speaker: "{player}", lines: [
            "……相棒じゃ、ありません。"
          ] },
          { style: "dialogue", speaker: "オルド", lines: [
            "そうか。",
            "なら、記録にはそう書いておけ。"
          ] },
          { actors: [ PLAYER, SLIME, ORD ], lines: [
            "その夜、{me}は初めて、",
            "スライムの頭にそっと触れた。",
            "思っていたより、ずっと温かく、柔らかかった。"
          ] }
        ]
      },

      /** --- 場面6 試験の終わり（腐食の毒沼をクリアして拠点に戻ったとき） --- */
      marshCleared: {
        id: "marshCleared",
        trigger: "homeReturn",
        when: { cleared: "venomMarsh" },
        order: 50,
        bgm: "home",
        bg: "camp",
        style: "dialogue",
        pages: [
          { speaker: "イレーネ", actors: [ PLAYER, SLIME, IRENE, ORD ], lines: [
            "四つの主の記録、確かに受け取りました。",
            "揺籃の穴の踏破を、協会として認めます。"
          ] },
          { speaker: "イレーネ", se: "levelUp", lines: [
            "{player}、合格です。",
            "今日から、あなたはクロニクラーです。"
          ] },
          { speaker: "イレーネ", lines: [
            "竜の記録は……まあ、保管しておきましょう。"
          ] },
          { speaker: "オルド", lines: [
            "……よく戻った。"
          ] },
          { style: "narration", bgm: "none", lines: [
            "その夜のことだった。"
          ] },
          // 駆け込む足音の音源が無いので、いまは逃げる音で代わりにしている
          { speaker: "探索者", fx: [{ type: "shake", power: 4 }], se: "flee",
            actors: [ PLAYER, SLIME, IRENE, ORD, SCOUT ],
            lines: [
              "支部長！穴が……穴がひとつ、塞がれました！"
            ] },
          { speaker: "イレーネ", lines: [
            "……落ち着いて。状況を報告してください。"
          ] },
          { speaker: "探索者", lines: [
            "天蓋会です。",
            "塞いだ穴のあたりで、モンスターが暴れていると……"
          ] },
          { style: "narration", fx: [{ type: "memory", bg: "burning" }], lines: [
            "モンスターが、溢れる。",
            "あの夜と、同じだった。"
          ] },
          { style: "narration", bg: "abyss",
            actors: [ { monster: "slime", x: 400, y: 520, size: 64, enter: "fade" } ],
            lines: [
              "天蓋会。",
              "その名を聞いたのは、この夜が初めてだった。"
            ] },
          { style: "title", bg: "night", actors: [], lines: [
            "記録は、",
            "ここから始まる"
          ] }
        ]
      },

      /**
       * --- 場面7 報告が受理される ---
       * 場面4を「負け／逃げ／勝ち」で見たあと、ヨミリュウを仲間にして拠点に戻ったとき（一度だけ）。
       * 場面4-誘う を見た場合は流さない。場面6の前でも後でもよい
       */
      reportAccepted: {
        id: "reportAccepted",
        trigger: "homeReturn",
        when: {
          caught: "abyssDragon",
          seenAny: ["yomiryuReport", "yomiryuReportFled", "yomiryuReportWon"],
          notSeen: ["yomiryuReportScouted"]
        },
        order: 35,
        bgm: "home",
        bg: "camp",
        style: "narration",
        pages: [
          { actors: [ DRAGON_CAMP, PLAYER, SLIME ], lines: [
            "竜を連れて戻った{me}を見て、",
            "イレーネは、しばらく何も言わなかった。"
          ] },
          { style: "dialogue", speaker: "イレーネ", actors: [ DRAGON_CAMP, PLAYER, SLIME, IRENE ], lines: [
            "……先日の報告ですが。"
          ] },
          { style: "dialogue", speaker: "イレーネ", delay: 900, lines: [
            "受理、しておきます。"
          ] },
          { actors: [ DRAGON_CAMP, PLAYER, SLIME, IRENE, ORD ], lines: [
            "オルドが、喉の奥で小さく笑った。"
          ] }
        ]
      },

      /**
       * --- 場面8 初めて全滅したとき（一度だけ） ---
       * 初めての全滅がヨミリュウ戦だったときは、場面4-負けに差し込まれて、こちらは流れない
       * （差し込んだページが marks: "firstDefeat" で、これを見たことにする）
       */
      firstDefeat: {
        id: "firstDefeat",
        trigger: "homeReturn",
        when: { event: "defeated" },
        order: 60,
        bgm: "home",
        bg: "void",
        style: "narration",
        pages: [
          // 暗転のまま、拠点の夜へ
          { transition: "black", bg: "camp", actors: [ PLAYER, SLIME ], lines: FIRST_DEFEAT_LINES }
        ]
      }
    }
  };
})(window.MyGame);
