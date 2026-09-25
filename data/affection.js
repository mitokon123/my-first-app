/**
 * affection.js
 * 愛情度（仲間ひとりひとりとの絆）の段階と報酬。
 *
 * 物語の上の決まりは ストーリー構成.md の 10「愛情度と図鑑の記録」。
 *
 * ▼ 上がり方
 *   **勝った戦闘で、一度でも場に出ていた仲間**に gainPerWin ずつ入る。
 *   控え（場に出ていない仲間）には入らない。経験値は控えにも全額入るので、
 *   「レベルは控えでも上がるが、絆は一緒に戦わないと深まらない」という差になる。
 *   逃げた・負けた・誘って終わった戦闘では増えない（出会ってすぐ逃げて稼げないように）。
 *   途中で倒れていても、場に出ていれば数える。
 *
 * ▼ 段階（stages）。上から順に並べる
 *   id        : 識別子。図鑑の記録（data/monsters.js の records）のキーにも使う
 *   name      : 表示名
 *   need      : この段階になるのに必要な回数（その個体が勝った戦闘に出た回数の合計）
 *   statBonus : この段階で上がる能力の割合（0.03 = +3%）。**前の段階のぶんに足していく**
 *               （慣れ +3%、信頼でさらに +3% → 合わせて +6%）
 *   bondReward: true の段階で、その種族だけの報酬（data/monsters.js の bondReward）を受け取る
 *
 * stats : statBonus が掛かる能力（HP・攻撃・防御・素早さ・PP）
 *
 * hideBondRewardUntilReached : true なら、愛情度の詳細（仲間の「様子を見る」から開く）で、
 *   絆に届くまで種族ごとの報酬を「？？？」と伏せる
 *
 * ▼ 種族ごとの報酬（data/monsters.js の bondReward）
 *   全モンスターに専用技があるわけではない。専用技の無いモンスターは、
 *   能力・耐性が上がったり、既存の技を覚えたりする。どれも同じ書き方で書ける：
 *     bondReward: { skill: "技のid" }                                   … 技を覚える（専用技でも既存の技でも）
 *     bondReward: { effects: [ { type: "statBonus", stat: "defense", value: 5 } ] } … 能力が上がる
 *     bondReward: { effects: [ { type: "resistBonus", element: "fire", value: 3 } ] } … 耐性が上がる
 *     skill と effects は両方書いてもよい。effects の書き方は特性・装備と同じ
 *
 * ★ 下がることはない。預かり所に預けても、そのまま残る。
 */
(function (NS) {
  "use strict";

  NS.rawData.affection = {
    gainPerWin: 1,
    stats: ["hp", "attack", "defense", "speed", "pp"],
    hideBondRewardUntilReached: true,
    stages: [
      { id: "meet",  name: "出会い", need: 0 },
      { id: "used",  name: "慣れ",   need: 20,  statBonus: 0.03 },
      { id: "trust", name: "信頼",   need: 60,  statBonus: 0.03 },
      { id: "bond",  name: "絆",     need: 120, bondReward: true }
    ]
  };
})(window.MyGame);
