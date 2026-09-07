/**
 * skills.js
 * スキル（技）の定義。数値はすべてここで管理する。
 *
 * power         : 威力（0 なら通常攻撃と同じ計算になる）
 * pp            : 使うのに必要なPP。0 なら何度でも使える
 * accuracy      : 命中率（0〜1）。書かなければ battle.js の defaultAccuracy（=100%）
 * criticalBonus : 会心率への上乗せ（書かなければ 0）
 * canCritical   : false と書くと会心が出なくなる。
 *                 範囲全体の技はこれを付ける方針（1体ずつ判定すると、
 *                 運だけで一気に崩れる回ができてしまうため）
 * evadable      : false と書くと、相手の回避率（monsters.js の evasion）で
 *                 かわされなくなる。省略すると かわされる
 * target        : 対象。次の3つが書ける
 *     "enemy"      … 相手を1体選ぶ
 *     "self"       … 自分。相手を選ばずに出せる
 *     "ally"       … 味方を1体選ぶ（自分も選べる）。回復役の技はこれ
 *     "allEnemies" … 向かい側の盤面にいる全員。宣言とPPの支払いは1回で、
 *                    命中判定とダメージは1体ずつ出す（避ける子・耐える子が出る）
 *
 * drain         : 与えたダメージのうち、何割を自分のHPに戻すか（0〜1）。
 *                 書かなければ吸わない。威力を低くして釣り合いを取る
 * heal          : HPを回復する技。{ min, max } か { amount } を書く
 *                 ★ 攻撃力では変わらない固定値にすること。
 *                   攻撃力に比例させると、育てるほど回復量まで伸びて手がつけられなくなる
 * ▼ modifier : 一時的な強化・弱体（バフ／デバフ）。書かなければ何も掛からない
 *     duration : 何ターン続くか。かけたターンを含めて数える
 *     effects  : 掛かる効果。書き方は data/abilities.js の特性とまったく同じ
 *                （statMultiplier / statBonus / damageDealt / damageTaken）
 *     message  : かかったときの文（省略時は messages.js の modifierUp / modifierDown）
 *   威力（power）を持たない技は、掛けるだけでダメージを与えない。
 *   同じ技を重ねがけしても効果は重ならず、残りターン数が建て直されるだけ。
 *   戦闘が終わると全部消える。
 *   ※ 状態異常（毒・まひなど）はこれとは別の仕組みで作る予定
 * element       : 属性id（elements.js を参照）。"none" は耐性の影響を受けない
 * effect        : 当たったときの演出の型（data/effects.js の shapes のid）
 *                 省略すると演出なし。色は element から決まるので指定しない
 * description   : 技を選ぶときに出る説明文
 * showInDex     : false なら図鑑の「技」に載せない（省略すると載る）。
 *                 通常攻撃は覚える技ではなくコマンドなので、これで隠してある
 *
 * ★ 新しい技の追加は、このファイルに1エントリ足すだけでよい。
 *   演出も、型の名前を1行書くだけ（技ごとに絵を用意しない）。
 */
(function (NS) {
  "use strict";

  NS.rawData.skills = {
    // 「攻撃」コマンドで使う通常攻撃。PPを使わないので何度でも出せる
    normalAttack: {
      id: "normalAttack",
      name: "攻撃",
      power: 0,
      pp: 0,
      target: "enemy",
      element: "none",
      effect: "impact",
      // 覚える技ではなくコマンドなので、図鑑には載せない
      showInDex: false,
      description: "PPを使わない基本の攻撃。いつでも出せる。"
    },

    tackle: {
      id: "tackle",
      name: "体当たり",
      power: 10,
      pp: 1,
      accuracy: 1.0,
      target: "enemy",
      element: "none",
      effect: "impact",
      description: "体ごとぶつかる。消費が軽く、必ず当たる。"
    },

    bite: {
      id: "bite",
      name: "噛みつく",
      power: 15,
      pp: 2,
      accuracy: 0.9,
      criticalBonus: 0.15,
      target: "enemy",
      element: "none",
      effect: "slash",
      description: "鋭くかみつく。会心が出やすいが、やや外れやすい。"
    },

    // 各属性の基本技。威力15 / PP2 / 命中100% でそろえてある
    ember: {
      id: "ember",
      name: "ファイア",
      power: 15,
      pp: 2,
      accuracy: 1.0,
      target: "enemy",
      element: "fire",
      effect: "burst",
      description: "小さな炎を放つ。火に弱い相手によく効く。"
    },

    rockThrow: {
      id: "rockThrow",
      name: "ストーン",
      power: 15,
      pp: 2,
      accuracy: 1.0,
      target: "enemy",
      element: "earth",
      effect: "shards",
      description: "石を投げつける。地に弱い相手によく効く。"
    },

    glimmer: {
      id: "glimmer",
      name: "フラッシュ",
      power: 15,
      pp: 2,
      accuracy: 1.0,
      target: "enemy",
      element: "light",
      effect: "flash",
      description: "強い光を浴びせる。光に弱い相手によく効く。"
    },

    darkSpore: {
      id: "darkSpore",
      name: "シャドウ",
      power: 15,
      pp: 2,
      accuracy: 1.0,
      target: "enemy",
      element: "dark",
      effect: "rain",
      description: "闇をまとわせる。闇に弱い相手によく効く。"
    },

    aqua: {
      id: "aqua",
      name: "アクア",
      power: 15,
      pp: 2,
      accuracy: 1.0,
      target: "enemy",
      element: "water",
      effect: "rain",
      description: "水をぶつける。水に弱い相手によく効く。"
    },

    gust: {
      id: "gust",
      name: "ウィンド",
      power: 15,
      pp: 2,
      accuracy: 1.0,
      target: "enemy",
      element: "wind",
      effect: "slash",
      // 見た目は「切る」だが、自分は踏み込まず離れて放つ
      // （書かないと effect から踏み込みだと判断される）
      motion: "cast",
      description: "鋭い風で切りつける。風に弱い相手によく効く。"
    },

    // --- 範囲技 ---

    // ゲーム中で初めての範囲全体の技。マグマウルフだけが使う。
    // 1体あたりの威力は基本技（15）より低いが、3体に届くので総量は大きい
    fireBreath: {
      id: "fireBreath",
      name: "火の息",
      power: 12,
      pp: 3,
      accuracy: 1.0,
      target: "allEnemies",
      element: "fire",
      effect: "burst",
      // 息は広がるのでよけようがない。回避率を持つ相手にも必ず当たる
      evadable: false,
      // 範囲全体の技は会心を出さない。
      // 3体それぞれで会心を判定すると、運だけで一気に崩れる回ができてしまう
      canCritical: false,
      description: "熱い息を吐き、相手全体を焼く。1体ずつへの威力は低いが、よけられない。"
    },

    // 重い体をそのまま叩きつける。属性を持たないので耐性で軽くならない
    bodyPress: {
      id: "bodyPress",
      name: "ボディプレス",
      power: 20,
      pp: 4,
      accuracy: 1.0,
      target: "enemy",
      element: "none",
      effect: "impact",
      description: "全体重をかけてのしかかる。重い一撃だが、消費するPPも大きい。"
    },

    // 威力を低くするかわりに、与えたぶんの一部を自分のHPに変える。
    // 削る速さより「粘れること」に価値がある技
    drainBite: {
      id: "drainBite",
      name: "吸血",
      power: 5,
      pp: 2,
      accuracy: 1.0,
      target: "enemy",
      element: "none",
      effect: "slash",
      drain: 0.3,
      description: "相手に噛みついて血を吸う。与えたダメージの3割ぶん、自分のHPが戻る。"
    },

    // 竜だけが使う範囲技。火の息（威力12/PP3）の一段上に置いてある。
    // 範囲技の方針どおり、よけられず・会心も出ない
    abyssBreath: {
      id: "abyssBreath",
      name: "奈落の息",
      power: 12,
      pp: 3,
      accuracy: 1.0,
      target: "allEnemies",
      element: "dark",
      effect: "burst",
      evadable: false,
      canCritical: false,
      description: "底なしの闇を吐き出し、相手全体を呑み込む。よけることはできない。"
    },

    // ゲーム中で初めての回復技。
    // 回復量は攻撃力に比例させず固定にしてある（育てても回復量は変わらない）
    cure: {
      id: "cure",
      name: "キュア",
      power: 0,
      pp: 2,
      accuracy: 1.0,
      target: "ally",
      element: "none",
      effect: "aura",
      heal: { min: 35, max: 45 },
      description: "味方1体のHPを回復する。回復する量は使う者の強さでは変わらない。"
    },

    // --- 強化・弱体の技 ---

    harden: {
      id: "harden",
      name: "こうか",
      power: 0,
      pp: 2,
      accuracy: 1.0,
      target: "self",
      element: "none",
      effect: "aura",
      modifier: {
        duration: 3,
        // この技だけの言い回し。書かなければ messages.js の modifierUp が使われる
        message: "{target} の 守りが 高まった!",
        // 防御の倍率だけでは効かない。ダメージ式が「防御 × 0.25」を引くだけなので、
        // ×1.5 にしても2ダメージしか減らず、逆に上げすぎると引き算が勝って無敵になる。
        // 防御コマンドと同じ damageTaken を混ぜて、効き目を素直にしてある
        effects: [
          { type: "statMultiplier", stat: "defense", value: 1.5 },
          { type: "damageTaken", value: 0.8 }
        ]
      },
      description: "体を硬くして、しばらく守りを上げる。相手を選ばずに出せる。"
    },

    // こうか（自分を強くする）と対になる、相手を弱くするほうの技。
    // 弱体であることは自動で判定されるので、印は赤・演出は上から下になる
    sapStrength: {
      id: "sapStrength",
      name: "ちからぬき",
      power: 0,
      pp: 2,
      accuracy: 1.0,
      target: "enemy",
      // こうかと同じく無属性。耐性で効いたり効かなかったりすると分かりにくいため
      element: "none",
      effect: "aura",
      modifier: {
        duration: 3,
        message: "{target} の 攻める力が 落ちた!",
        // 攻撃はダメージ式で「× 0.75」される側なので、倍率がそのまま効く。
        // 防御と違って引き算ではないため、こうかのような補強は要らない
        effects: [
          { type: "statMultiplier", stat: "attack", value: 0.8 }
        ]
      },
      description: "相手にからみついて力を奪い、しばらく攻撃を下げる。"
    },

    // 光の大技。サンダーと同じ「特別枠」で、威力を上げてPPを重くしてある
    //   他の属性の基本技 … 威力15 / PP2
    //   シャイン         … 威力32 / PP5
    // 闇に強く守られた相手（ヨミリュウ）を崩すための答えとして置いてある
    shine: {
      id: "shine",
      name: "シャイン",
      power: 32,
      pp: 5,
      accuracy: 1.0,
      target: "enemy",
      element: "light",
      effect: "flash",
      description: "目を灼くほどの光を放つ。闇を頼る相手ほど深く突き刺さる。"
    },

    // 雷だけは他の属性と枠が違う。elements.js の方針どおり、
    // 威力を上げるかわりにPPを重くして「強いが撃てる回数が少ない」形にしてある
    //   他の属性の基本技 … 威力15 / PP2
    //   サンダー         … 威力20 / PP3
    // 使い手はビリムシ1種だけ。仲間にすれば、こちらも撃てるようになる
    thunderBolt: {
      id: "thunderBolt",
      name: "サンダー",
      power: 20,
      pp: 3,
      accuracy: 1.0,
      target: "enemy",
      element: "thunder",
      effect: "flash",
      description: "強い電気を落とす。威力は高いが、消費するPPも大きい。"
    }
  };
})(window.MyGame);
