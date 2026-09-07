/**
 * battle.js
 * 戦闘に関する数値・計算パラメータ。ゲームバランスの中心。
 *
 * ▼ ダメージ計算式（すべてこのファイルの数値で調整可能）
 *
 *   基礎 = 攻撃力 × attackFactor + 技威力 × powerFactor - 防御力 × defenseFactor
 *   基礎 = max(0, 基礎)
 *   ダメージ = floor( 基礎 × 属性倍率 × クリティカル倍率 × 乱数(randomMin〜randomMax) )
 *   ダメージ = max(minDamage, ダメージ)   ※属性無効のときは 0
 *
 *   通常攻撃は「威力0の技」として扱うので、同じ式で計算できる
 *   （normalAttackSkill で指定した技を使う）。
 *
 * ▼ 属性倍率
 *   耐性が0以上 … 倍率 = 1 - 耐性 × resistance.resistStep
 *   耐性がマイナス … 倍率 = 1 + |耐性| × resistance.weaknessStep
 *   耐性は data/monsters.js の resistances（-5〜10）。
 *     -5 → ×2.00（2倍）   0 → ×1.00   +9 → ×0.10   +10 → 無効
 *   耐性が immuneAt 以上、または immunities に入っている属性はダメージ0。
 *   無属性（elements.js の physical:true）は耐性の影響を受けない。
 *
 * ▼ クリティカル
 *   確率 = critical.baseRate + 技の criticalBonus
 *   当たると damage に critical.multiplier を掛ける。
 *
 * ▼ 命中
 *   技に accuracy が書かれていればその値、無ければ defaultAccuracy。
 *
 * ▼ 行動順
 *   全員の行動を決めたあと、素早さの大きい順に行動する。
 *   並べ替えに使う素早さは speedVariance の範囲でぶれる。
 *   speedTieBreak … 素早さが同じときの決め方（"random" / "allyFirst" / "enemyFirst"）
 */
(function (NS) {
  "use strict";

  NS.rawData.battle = {
    damage: {
      attackFactor: 0.75,   // 攻撃力に掛ける係数
      powerFactor: 0.55,    // 技威力に掛ける係数
      defenseFactor: 0.25,  // 防御力に掛ける係数
      randomMin: 0.9,
      randomMax: 1.1,
      minDamage: 1
    },

    /**
     * 敵が狙う位置の重み（盤面の左から順）。
     * 前に置いた仲間ほど狙われる。並び順が「誰を盾にするか」の選択になる。
     * 盤面に出ている数が少ないときは、その数だけで割り直す。
     */
    targetWeights: [0.50, 0.35, 0.15],

    critical: {
      baseRate: 0.03,   // 全キャラ共通の会心率
      multiplier: 2.0   // 会心時の倍率
    },

    /**
     * 属性耐性。プラスとマイナスで1あたりの効き方を変えている。
     *   プラス側 … 1につき resistStep だけ軽くなる（+10 で完全無効）
     *   マイナス側 … 1につき weaknessStep だけ重くなる（-5 で2倍）
     * 弱点のほうが1あたりの動きが大きいので、少ない値でも効きが分かる。
     */
    resistance: {
      resistStep: 0.10,   // 耐性1あたりの軽減量（+9 で0.1倍まで下がる）
      weaknessStep: 0.20, // 弱点1あたりの増加量（-5 で2.0倍）
      immuneAt: 10,       // この値以上は完全無効（immunities と同じ扱い）
      minMultiplier: 0    // 倍率の下限（マイナス倍率を防ぐ）
    },

    /**
     * 防御コマンド。
     * 選んだターンの間、受けるダメージが multiplier 倍になる（属性も会心も問わない）。
     * 次のターンが始まると解除される。
     */
    defend: { multiplier: 0.5 },

    /**
     * 敵の行動の決め方。
     * skillRate の確率で技を使い、それ以外は通常攻撃をする。
     * （序盤の敵なので低めにしてある）
     */
    enemyAi: { skillRate: 0.25 },

    speedVariance: { min: 0.8, max: 1.2 },  // 行動順を決めるときの素早さのぶれ

    normalAttackSkill: "normalAttack",  // 「攻撃」コマンドで使う技id
    defaultAccuracy: 1.0,               // accuracy が書かれていない技の命中率

    speedTieBreak: "random",
    fleeSuccessRate: 0.6
  };
})(window.MyGame);
