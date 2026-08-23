/**
 * abilities.js
 * アビリティ（特性）の定義。モンスターが常に持っている効果。
 *
 * id / name / description : 識別子・表示名・図鑑での説明
 * category : 分類id（categories.js の ability を参照）。図鑑の並びに使う
 * effects  : 効果の配列。1つのアビリティに複数の効果を持たせられる
 *
 * ▼ 効果の種類（type）
 *
 * "statMultiplier" … ステータスに倍率を掛ける
 *     stat  : "hp" / "attack" / "defense" / "speed" / "pp"
 *     value : 倍率（1.2 なら20%上昇）
 *
 * "damageDealt" … 自分が与えるダメージに倍率を掛ける
 *     value   : 倍率
 *     element : 指定するとその属性の技のときだけ効く（省略で全部）
 *
 * "damageTaken" … 自分が受けるダメージに倍率を掛ける
 *     value   : 倍率（0.8 なら20%軽減）
 *     element : 指定するとその属性を受けたときだけ効く（省略で全部）
 *
 * ▼ 条件（condition。省略すると常に効く）
 *     hpBelow : 自分のHP割合がこの値以下のときだけ効く（0.25 なら1/4以下）
 *     hpAbove : 自分のHP割合がこの値以上のときだけ効く
 *
 * ★ 新しいアビリティの追加は、このファイルに1エントリ足すだけでよい。
 *   新しい「効果の種類」を足すときは js/systems/AbilitySystem.js に処理を追加する。
 */
(function (NS) {
  "use strict";

  NS.rawData.abilities = {
    // --- ステータス倍率の例 ---

    tough: {
      id: "tough",
      name: "たくましい",
      category: "stat",
      description: "体が丈夫で、HPが少し高い。",
      effects: [
        { type: "statMultiplier", stat: "hp", value: 1.15 }
      ]
    },

    swiftFoot: {
      id: "swiftFoot",
      name: "俊足",
      category: "stat",
      description: "動きが速く、素早さが上がる。",
      effects: [
        { type: "statMultiplier", stat: "speed", value: 1.2 }
      ]
    },

    guts: {
      id: "guts",
      name: "こんじょう",
      category: "stat",
      description: "HPが少なくなると攻撃が大きく上がる。",
      effects: [
        { type: "statMultiplier", stat: "attack", value: 1.5,
          condition: { hpBelow: 0.25 } }
      ]
    },

    // --- ダメージ倍率の例 ---

    fireSoul: {
      id: "fireSoul",
      name: "炎の魂",
      category: "damage",
      description: "火属性の技の威力が上がる。",
      effects: [
        { type: "damageDealt", value: 1.25, element: "fire" }
      ]
    },

    glowing: {
      id: "glowing",
      name: "発光",
      category: "damage",
      description: "体が光を放ち、光属性の技の威力が上がる。",
      effects: [
        { type: "damageDealt", value: 1.25, element: "light" }
      ]
    },

    thickSkin: {
      id: "thickSkin",
      name: "厚い皮膚",
      category: "damage",
      description: "受けるダメージが少し減る。",
      effects: [
        { type: "damageTaken", value: 0.9 }
      ]
    },

    // --- 複数の効果を持つ例 ---

    wildInstinct: {
      id: "wildInstinct",
      name: "野生の勘",
      category: "damage",
      description: "攻撃が上がるかわりに、受けるダメージも増える。",
      effects: [
        { type: "statMultiplier", stat: "attack", value: 1.2 },
        { type: "damageTaken", value: 1.15 }
      ]
    }
  };
})(window.MyGame);
