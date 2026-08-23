/**
 * blessings.js
 * 「加護」＝ 階を降りるたびに選ぶ、そのラン限りの強化。
 *
 * 効果は特性・装備とまったく同じ形式で書ける（data/abilities.js の説明を参照）。
 *   statMultiplier … ステータスに倍率
 *   statBonus      … ステータスに加算
 *   damageDealt / damageTaken … 与える／受けるダメージに倍率
 *
 * id          : 識別子
 * name        : 表示名
 * description : 選ぶときに出る説明
 * weight      : 選択肢に出やすさ（大きいほど出やすい）
 * effects     : 効果の配列
 *
 * ▼ 加護はパーティ全員に掛かる
 *   誰に付けるかを選ばせると選択が長くなるため、全員に掛かる形にしている。
 *
 * ★ 加護を増やすときは、このファイルに1エントリ足すだけでよい。
 */
(function (NS) {
  "use strict";

  NS.rawData.blessings = {
    fierceBeat: {
      id: "fierceBeat",
      name: "猛る鼓動",
      description: "仲間全員の攻撃が10%上がる。",
      weight: 1.0,
      effects: [ { type: "statMultiplier", stat: "attack", value: 1.1 } ]
    },

    hardHide: {
      id: "hardHide",
      name: "硬い皮",
      description: "仲間全員の防御が10%上がる。",
      weight: 1.0,
      effects: [ { type: "statMultiplier", stat: "defense", value: 1.1 } ]
    },

    swiftWind: {
      id: "swiftWind",
      name: "疾風の加護",
      description: "仲間全員の素早さが10%上がる。",
      weight: 1.0,
      effects: [ { type: "statMultiplier", stat: "speed", value: 1.1 } ]
    },

    manaVessel: {
      id: "manaVessel",
      name: "魔力の器",
      description: "仲間全員のPPが2増える。",
      weight: 0.9,
      effects: [ { type: "statBonus", stat: "pp", value: 2 } ]
    },

    sharpEdge: {
      id: "sharpEdge",
      name: "一撃の冴え",
      description: "仲間全員の与えるダメージが8%増える。",
      weight: 0.7,
      effects: [ { type: "damageDealt", value: 1.08 } ]
    },

    guardMist: {
      id: "guardMist",
      name: "守りの霧",
      description: "仲間全員の受けるダメージが8%減る。",
      weight: 0.7,
      effects: [ { type: "damageTaken", value: 0.92 } ]
    },

    emberEcho: {
      id: "emberEcho",
      name: "残り火の記憶",
      description: "火属性の技で与えるダメージが20%増える。",
      weight: 0.5,
      effects: [ { type: "damageDealt", value: 1.20, element: "fire" } ]
    },

    lightGuide: {
      id: "lightGuide",
      name: "光の導き",
      description: "光属性の技で与えるダメージが20%増える。",
      weight: 0.5,
      effects: [ { type: "damageDealt", value: 1.20, element: "light" } ]
    },

    lastStand: {
      id: "lastStand",
      name: "背水の構え",
      description: "HPが1/4以下のとき、攻撃が30%上がる。",
      weight: 0.4,
      effects: [
        { type: "statMultiplier", stat: "attack", value: 1.30,
          condition: { hpBelow: 0.25 } }
      ]
    }
  };
})(window.MyGame);
