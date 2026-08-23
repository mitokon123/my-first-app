/**
 * skills.js
 * スキル（技）の定義。数値はすべてここで管理する。
 *
 * power         : 威力（0 なら通常攻撃と同じ計算になる）
 * pp            : 使うのに必要なPP。0 なら何度でも使える
 * accuracy      : 命中率（0〜1）。書かなければ battle.js の defaultAccuracy（=100%）
 * criticalBonus : 会心率への上乗せ（書かなければ 0）
 * target        : 対象（"enemy" / "self" など。今後拡張）
 * element       : 属性id（elements.js を参照）。"none" は耐性の影響を受けない
 * description   : 技を選ぶときに出る説明文
 *
 * ★ 新しい技の追加は、このファイルに1エントリ足すだけでよい。
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
      description: "闇をまとわせる。闇に弱い相手によく効く。"
    }
  };
})(window.MyGame);
