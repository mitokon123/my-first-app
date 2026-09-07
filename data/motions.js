/**
 * motions.js
 * 「絵をどう動かすか」の定義。モンスターやUIの部品がこれを名前で参照する。
 *
 * 1枚の絵を動かして見せる方式なので、コマ絵を描き足さなくても
 * この1行を足すだけで新しい動きが作れる。数値はすべてこのファイルに置く。
 *
 * ▼ 使い方
 *   data/monsters.js の種族に motion: "float" と書く。
 *   実際の計算は js/ui/Motion.js、描画は SpriteRenderer.drawMotion。
 *
 * ▼ 動かせるもの（チャンネル）
 *   offsetX : 左右のずれ（px）
 *   offsetY : 上下のずれ（px）。画面は下が＋なので、上へ動かすには負の値
 *   scale   : 大きさ。1 を基準にした増減（0.04 なら 0.96〜1.04 の間で伸縮）
 *             足元を基準に伸縮するので、浮き上がって見えない
 *   scaleX  : 横だけの倍率。scale に掛かる
 *   scaleY  : 縦だけの倍率。scale に掛かる
 *             ★ 縦と横を少しずらして動かすと、1枚の絵のままでも
 *               「息をしている」ように見える（dragonBreathe がその例）
 *   alpha   : 濃さ。1 を基準にした増減（0.2 なら 0.8〜1.0 の間で明滅）
 *
 * ▼ 伸縮の基準（チャンネルではなく、定義そのものに書く）
 *   anchor: "top"  … 上端を固定して伸び縮みする。
 *                    天井からぶら下がっているもの向け（riftIdle がその例）。
 *                    書かなければ足元が固定される（ふつうはこちら）
 *
 * ▼ チャンネルの中身
 *   amplitude : どれだけ動くか
 *   speed     : 速さ（1ミリ秒あたりのラジアン）。0.002 でおよそ3秒に1往復
 *   period    : 1往復にかかるミリ秒。speed の代わりにこちらで書いてもよい
 *               コマ絵と合わせたいときは、必ずこちらで書く（下の slimeIdle 参照）
 *   wave      : 波の形
 *       "sin"    … -1〜1 を行き来する（既定）。ふわふわした往復
 *       "bounce" … 0〜1 を跳ねる。片方向だけに動かしたいとき（跳ねる、など）
 *       "blink"  … 0か1。かちっと切り替わる明滅
 *   phase     : 位相のずらし（0〜1）。チャンネル同士をずらしたいときに使う
 *
 * ▼ コマ絵
 *   frames: { interval: 200 }
 *   と書くと 200ms ごとに次の絵へ切り替わる。
 *   種族側は sprite に絵を並べて書くだけ：
 *     slime: { sprite: ["slime1", "slime2", "slime3"], motion: "frameNormal" }
 *
 *   ★ 枚数はここに書かない。絵の枚数から読み取るので、
 *     絵を1枚足しても減らしても、このファイルは直さなくてよい。
 *
 *   ★ コマ絵と「ずっと続く動き」は重ねられる。
 *     形が変わりながら、なめらかに浮くこともできる（frameFloat がその例）。
 *     つまり2〜3枚描くだけでよく、滑らかなループを描き切る必要はない。
 *
 * ★ 動きを増やすときは、このファイルに1エントリ足すだけでよい。
 *
 * ─────────────────────────────────────────────
 * ▼ 場面ごとの動き（攻撃・被弾・技を放つ…）は、書かなくても全種族に付く
 *
 * このファイルの下の方に motionDefaults がある。
 * data/monsters.js に motions を書いていない種族は、全員そこから拾う。
 * つまり新しいモンスターを足しても、モーションの行は1行も要らない。
 *
 * 種族ごとに変えたいときだけ、data/monsters.js に1行：
 *   motions: { faint: "crumble" }        // 倒れ方だけ差し替える
 *   motions: { attack: null }            // その場面だけ動かさない
 * 書いた場面だけが上書きされ、残りは既定のまま。
 *
 * 【技のエフェクト】いちばん行数が増えるのはここなので、
 *   「技ごとに絵を用意しない」ことを原則にしている。
 *
 *   ・形の型を10個ほど用意する（斬る／弾ける／貫く／降りそそぐ など）
 *   ・色は data/elements.js の属性色をそのまま使う
 *     → 同じ「弾ける」が、火なら赤く、水なら青く出る
 *   ・技側は effect: "burst" の1行だけ
 * ─────────────────────────────────────────────
 */
(function (NS) {
  "use strict";

  NS.rawData.motions = {
    // ─────────────────────────────────────────
    // ここから heavy までは「汎用のひな形」。
    //
    // α-5で全19種に専用の動きを持たせたので、
    // モンスターが使っているのは breathe（店主）と blaze（拠点のたき火）だけ。
    // 残りは消していない。新しいモンスターを足すときの出発点になるし、
    // 「この形ならこう動かす」という語彙そのものだから。
    //
    // 新しい種族を作るときは、近いものをここから選んで名前を付け替え、
    // 下の「種族ごとの専用モーション」に1つ足すのが早い。
    // ─────────────────────────────────────────

    // 動かない。motion を書いていないのと同じ
    none: {},

    // ふわふわ浮く。地に足がついていないもの
    float: {
      offsetY: { amplitude: -2.5, speed: 0.0018 }
    },

    // 呼吸。立っているものの「生きている感じ」を出す最も控えめな動き
    breathe: {
      scale: { amplitude: 0.035, speed: 0.0016 }
    },

    // 左右にゆれる。植物やきのこなど、根が生えているもの
    sway: {
      offsetX: { amplitude: 1.6, speed: 0.0014 },
      scale:   { amplitude: 0.02, speed: 0.0014, phase: 0.25 }
    },

    // 跳ねる。小動物向け。bounce なので下には沈まない
    hop: {
      offsetY: { amplitude: -3.5, speed: 0.0042, wave: "bounce" }
    },

    // 羽ばたき。速い上下と、わずかな伸縮を少しずらして重ねる
    flutter: {
      offsetY: { amplitude: -2.0, speed: 0.0058 },
      scale:   { amplitude: 0.03, speed: 0.0058, phase: 0.25 }
    },

    // 明滅。光るもの向け。ゆっくり浮きながら光の強さが変わる
    glow: {
      offsetY: { amplitude: -1.5, speed: 0.0016 },
      alpha:   { amplitude: -0.14, speed: 0.0048 }
    },

    // 炎。速く小刻みに揺れ、明るさも変わる
    blaze: {
      offsetY: { amplitude: -1.5, speed: 0.0062 },
      offsetX: { amplitude: 0.8, speed: 0.0091, phase: 0.33 },
      alpha:   { amplitude: -0.10, speed: 0.0085 }
    },

    // どっしり。岩やゴーレムなど、重いものの非常にゆっくりした呼吸
    heavy: {
      scale: { amplitude: 0.018, speed: 0.0009 }
    },

    // 竜の呼吸。大きいものほど、ゆっくり・深く息をする
    //
    // 縦と横を同じ速さで、少しだけ位相をずらして動かしているのが要点。
    // 同時に動かすと絵がただ拡大縮小するだけだが、ずらすと
    //   胸が横にふくらむ → 少し遅れて背が伸びる → 抜ける
    // という順になり、体と翼が別々に動いて見える。
    // period は4.2秒。1体だけ極端に遅いので、並んだときに存在感が出る。
    //
    // 上下のずれ（offsetY）はあえて使っていない。足を地面から浮かせると
    // 重さが消えるので、伸縮だけにして足元は動かさないでおく
    dragonBreathe: {
      scaleX: { amplitude: 0.028, period: 4200 },
      scaleY: { amplitude: 0.024, period: 4200, phase: 0.18 }
    },

    // 亜空間から出入りする。天井の裂け目からぶら下がっているもの向け
    //
    // anchor: "top" で裂け目の側を固定してあるので、
    // 縦に縮むと下端（蔦の先）だけが裂け目へ吸い込まれていく。
    // 濃さを少し遅らせて動かすと、引っ込むときに薄くなって
    // 「向こう側へ入った」ように見える
    riftIdle: {
      anchor:  "top",
      scaleY:  { amplitude: -0.11, period: 3000 },
      offsetX: { amplitude: 1.2,   period: 3000, phase: 0.25 },
      alpha:   { amplitude: -0.10, period: 3000, phase: 0.08 }
    },

    // ─────────────────────────────────────────
    // 種族ごとの専用モーション（α-5）
    //
    // 上の float / hop / sway などは「その形のものなら何でも使える」汎用品で、
    // 3〜4種が同じ動きを共有していた。絵を 32×32 に描き直したので、
    // 種族ごとに1つずつ持たせて、動きでも見分けがつくようにしてある。
    //
    // ▼ 作るときの決まりごと
    //   ・地に足がついているものは offsetY を使わない。
    //     浮かせると重さが消える（ヨミリュウ・モスゴーレムがその例）
    //   ・wave:"bounce" は |sin| なので、位相を 0.5 ずらしても何も変わらない。
    //     跳ねる動きに着地の潰れを合わせるときは phase: 0.25（＝|cos|）を使う
    //   ・速さは period（1往復のミリ秒）で書く。speed で書くと丸め誤差でずれる
    // ─────────────────────────────────────────

    // コウモリ：翼を横に開閉する速い羽ばたき
    batFlutter: {
      scaleX:  { amplitude: 0.07, period: 340 },
      offsetY: { amplitude: -2.2, period: 340, phase: 0.25 }
    },

    // コケネズミ：跳ねて、着地した瞬間に潰れる
    //   phase: 0.25 で |cos| になるので、いちばん高いところで潰れが0、
    //   地面に着いた瞬間に潰れが最大になる
    ratHop: {
      offsetY: { amplitude: -4.0,  period: 1000, wave: "bounce" },
      scaleY:  { amplitude: -0.06, period: 1000, wave: "bounce", phase: 0.25 }
    },

    // イワゴロー：足が遅い岩。ほとんど動かず、わずかに傾くだけ
    rockIdle: {
      rotate: { amplitude: 0.004, period: 4600 },
      scaleY: { amplitude: 0.012, period: 4600, phase: 0.25 }
    },

    // ヒカリムシ：羽ばたきだけ速く、光はゆっくり明滅する
    bugGlow: {
      scaleX:  { amplitude: 0.05,  period: 240 },
      offsetY: { amplitude: -1.8,  period: 1900 },
      alpha:   { amplitude: -0.12, period: 1400 }
    },

    // キノコン：根が生えているので、ゆっくり傾いて胞子がにじむ
    sporeSway: {
      offsetX: { amplitude: 1.3,   period: 3800 },
      scaleY:  { amplitude: 0.018, period: 3800, phase: 0.30 },
      alpha:   { amplitude: -0.05, period: 2600 }
    },

    // スミビ：燃えさしの炭。小刻みに揺れ、火の勢いが安定しない
    emberIdle: {
      offsetY: { amplitude: -1.2,  period: 520 },
      offsetX: { amplitude: 0.7,   period: 380, phase: 0.33 },
      alpha:   { amplitude: -0.08, period: 300 }
    },

    // フレイミン：気性が荒い。落ち着かず細かく跳ねる
    flameHop: {
      offsetY: { amplitude: -2.6,  period: 760, wave: "bounce" },
      scaleY:  { amplitude: -0.05, period: 760, wave: "bounce", phase: 0.25 },
      alpha:   { amplitude: -0.06, period: 620 }
    },

    // ハイバネ：体がひどく軽い。熱に乗って漂う（羽ばたきだけ速い）
    ashDrift: {
      offsetY: { amplitude: -3.2,  period: 2600 },
      offsetX: { amplitude: 1.8,   period: 3400, phase: 0.40 },
      scaleX:  { amplitude: 0.05,  period: 420 }
    },

    // ヒビイワ：岩の遅い呼吸に、ひびから漏れる熱の明滅を重ねる
    crackPulse: {
      scaleY: { amplitude: 0.016, period: 3600 },
      alpha:  { amplitude: -0.09, period: 1800 }
    },

    // マグマガニ：じっと動かない。たまに横へ体重を移すだけ
    crabIdle: {
      offsetX: { amplitude: 1.1,   period: 3200 },
      scaleY:  { amplitude: 0.010, period: 3200, phase: 0.25 }
    },

    // ヨドミ：浮きながら、裾の滴が伸び縮みする
    murkFloat: {
      offsetY: { amplitude: -2.4,  period: 2800 },
      scaleY:  { amplitude: 0.035, period: 2800, phase: 0.25 },
      alpha:   { amplitude: -0.07, period: 3600 }
    },

    // ミズダマリ：上が重い水の塊。縦横が入れ替わるように波打つ
    waterWobble: {
      scaleX:  { amplitude: 0.030,  period: 2200 },
      scaleY:  { amplitude: -0.030, period: 2200 },
      offsetX: { amplitude: 1.0,    period: 2200, phase: 0.25 }
    },

    // ビリムシ：小さくて速い。帯電で小刻みに震える
    boltFlit: {
      offsetY: { amplitude: -1.6, period: 300 },
      offsetX: { amplitude: 0.8,  period: 190, phase: 0.5 },
      scaleX:  { amplitude: 0.05, period: 150 }
    },

    // モスゴーレム：石の巨人。呼吸が非常に遅く、足元は動かさない
    golemBreathe: {
      scaleY: { amplitude: 0.022, period: 5200 }
    },

    // マグマウルフ：獣の呼吸。竜より速く浅い。背の炎がゆらぐ
    beastBreathe: {
      scaleX: { amplitude: 0.020,  period: 2600 },
      scaleY: { amplitude: 0.016,  period: 2600, phase: 0.18 },
      alpha:  { amplitude: -0.05,  period: 1300 }
    },

    // キングスライム：大きなゼリーの塊。ゆっくり大きく波打つ
    kingWobble: {
      scaleX: { amplitude: 0.034,  period: 3000 },
      scaleY: { amplitude: -0.034, period: 3000 }
    },

    // --- コマ絵を使うとき ---
    //
    // 絵を2枚以上並べた種族に付ける。切り替える速さだけを決めればよい。
    //   slime: { sprite: ["slime1", "slime2"], motion: "frameNormal" }

    frameSlow:   { frames: { interval: 320 } },   // ゆったり
    frameNormal: { frames: { interval: 200 } },
    frameFast:   { frames: { interval: 120 } },   // せわしない

    // コマ絵に「ずっと続く動き」を重ねた例。
    // 形が変わりながら、そのあいだも滑らかに浮き沈みする
    frameFloat: {
      frames:  { interval: 260 },
      offsetY: { amplitude: -2.5, speed: 0.0018 }
    },

    // --- スライムの跳ねる動き（コマ絵と揺れを組み合わせた見本）---
    //
    // ★ コマ絵と上下の揺れを「ぴったり合わせる」書き方の例。
    //   コマ数 × interval ＝ 揺れの period にすると、
    //   地面に着いた瞬間に潰れ、跳んでいる間に伸びる、という形になる。
    //     4コマ × 220ms = 880ms ＝ period
    //   ここを合わせておけば、個体ごとに位相をずらしても崩れない。
    //   （speed で書くと丸めた誤差でだんだんずれるので、必ず period で書く）
    //
    //   絵は2枚描き足すだけでよい（潰れた姿・伸びた姿）。
    //   ふつうの姿は使い回すので、4コマの並びが2枚で作れる：
    //     sprite: ["slimeStretch", "slime", "slimeStretch", "slimeSquash"]
    //       0 …… 地面から昇る途中（伸びる）
    //       1 …… いちばん高いところ（ふつう）
    //       2 …… 落ちる途中（伸びる）
    //       3 …… 地面に着いた瞬間（潰れる）
    slimeIdle: {
      frames:  { interval: 220 },
      offsetY: { amplitude: -2.5, period: 880 }   // 220 × 4コマ
    },

    // ─────────────────────────────────────────
    // 1回だけ流れる動き（攻撃・被弾）
    //
    // duration を持つものが「1回流れて終わる」動き。上のものとは書き方が違う。
    //   amount … どれだけ動くか
    //   shape  … 出て戻るときの形
    //       "outBack"（既定）… 素早く出て、ゆっくり戻る。踏み込みらしい
    //           outRatio で「出きるまでの割合」を変えられる（既定 0.3）
    //       "pulse"          … なめらかに出て、なめらかに戻る
    //       "decay"          … 大きく始まり、揺れながら収まる。当たった衝撃らしい
    //           cycles で揺れる回数を変えられる（既定 2）
    //       "fade"           … 最大から、まっすぐ元へ戻るだけ
    //
    // 上下の向きは画面側が決める（相手のいる方向へ ±1 を掛ける）。
    // 戦闘は敵が上段・味方が下段なので、踏み込みは横ではなく縦になる。
    //
    // 種族ごとに変えたいときは data/monsters.js に1行：
    //   motions: { attack: "lunge", hit: "recoil" }
    // 書かなければ、その種族は攻撃・被弾で動かない。
    // ─────────────────────────────────────────

    // 踏み込む。相手の方へ素早く出て、ゆっくり戻る
    lunge: {
      duration: 300,
      offsetY: { amount: 26, shape: "outBack", outRatio: 0.28 },
      scale:   { amount: 0.08, shape: "outBack", outRatio: 0.28 }
    },

    // 技を放つ。踏み込みとの違いは「溜め」があること。
    //
    // windup は前半で相手と逆へ引き、後半で勢いよく出て戻る。
    // lunge より長く（460ms）、出る量は少なめにしてある。
    // ぶつかりに行く踏み込みではなく、その場から放つ動きに見せるため
    cast: {
      duration: 460,
      offsetY: { amount: 15,   shape: "windup", backRatio: 0.45 },
      scaleX:  { amount: 0.07, shape: "windup", backRatio: 0.45 },
      scaleY:  { amount: 0.09, shape: "windup", backRatio: 0.45 }
    },

    // 自分や味方にかける技（強化・回復）。相手の方へは動かず、その場で伸び上がる
    charge: {
      duration: 440,
      offsetY: { amount: -9,   shape: "pulse" },
      scaleY:  { amount: 0.11, shape: "pulse" },
      scaleX:  { amount: -0.04, shape: "pulse" }
    },

    // のけぞる。押された方へ飛んで、揺れながら収まる。同時に一瞬薄くなる
    recoil: {
      duration: 260,
      offsetY: { amount: 13, shape: "decay", cycles: 2 },
      alpha:   { amount: -0.45, shape: "fade" }
    },

    // --- 倒れる ---
    //
    // どれも shape: "rise" で、元に戻らずそのまま消える。
    // 終わったら描かないこと（BattleScene が「倒れ終わったか」を見ている）。

    // 倒れる（標準）。沈みながら縮んで消えていく
    fall: {
      duration: 460,
      offsetY: { amount: 20, shape: "rise" },
      scale:   { amount: -0.2, shape: "rise" },
      alpha:   { amount: -1, shape: "rise" }
    },

    // 落ちる。飛んでいるものが体勢を崩し、傾きながら落ちていく
    tumble: {
      duration: 520,
      offsetY: { amount: 32, shape: "rise" },
      rotate:  { amount: 0.35, shape: "rise" },
      alpha:   { amount: -1, shape: "rise" }
    },

    // 崩れる。重いものがその場で小さく潰れていく。あまり動かない
    crumble: {
      duration: 560,
      offsetY: { amount: 7, shape: "rise" },
      scale:   { amount: -0.5, shape: "rise" },
      alpha:   { amount: -1, shape: "rise" }
    },

    // 回復。ふわっと浮いて膨らみ、元へ戻る
    recover: {
      duration: 440,
      offsetY: { amount: -7, shape: "pulse" },
      scale:   { amount: 0.13, shape: "pulse" }
    },

    // レベルアップ：小さく跳ねる
    cheerHop: {
      duration: 520,
      offsetY: { amount: -20, shape: "pulse" },
      scale:   { amount: 0.07, shape: "pulse" }
    },

    // レベルアップ：その場で一回転（飛ぶものむけ）
    //   rotate は「何回まわすか」。1 で1回転
    cheerSpin: {
      duration: 560,
      rotate:  { amount: 1, shape: "rise" },
      offsetY: { amount: -12, shape: "pulse" }
    },

    // 防御中。1回で終わらず、防御しているあいだ続く（duration を持たない）
    //   offset で「縮こまった姿勢」そのものをずらし、amplitude で小刻みに震わせる
    guard: {
      scale:   { offset: -0.10, amplitude: 0.015, period: 780 },
      offsetY: { offset: 3 }
    }
  };

  /**
   * 場面ごとの動きの既定。
   *
   * data/monsters.js に motions を書いていない種族は、全員ここから拾う。
   * これを置いたおかげで、モンスターを1体足すのに
   * モーションの行を書き足す必要がなくなっている。
   *
   * ▼ action … 場面 → 上の一覧のid
   *   attack  … 技を出した（ぶつかりに行く技）
   *   cast    … 技を出した（離れて放つ技）
   *   buff    … 技を出した（自分・味方にかける技）
   *   hit     … ダメージを受けた
   *   guard   … 防御中（1回で終わらず、防御しているあいだ続く）
   *   heal    … 回復した
   *   faint   … 倒れた
   *   levelUp … レベルが上がった
   *
   * ▼ meleeEffects … どの技を「ぶつかりに行く技」とみなすか
   *   技の effect（data/skills.js）で見分ける。
   *   殴る・斬るは踏み込み、それ以外は離れて放つ動きになる。
   *   技を増やしても effect は必ず書くので、ここを直す必要はない。
   *   技ごとに変えたいときは data/skills.js に motion: "cast" と書けば上書きできる。
   */
  NS.rawData.motionDefaults = {
    action: {
      attack:  "lunge",
      cast:    "cast",
      buff:    "charge",
      hit:     "recoil",
      guard:   "guard",
      heal:    "recover",
      faint:   "fall",
      levelUp: "cheerHop"
    },
    meleeEffects: ["impact", "slash"]
  };
})(window.MyGame);
