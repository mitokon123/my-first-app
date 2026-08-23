/**
 * bosses.js
 * ボスの定義。どのダンジョンに出るかは data/dungeons.js の boss で指定する。
 *
 * species     : 種族id（monsters.js を参照。ボス専用の種族を作ってもよい）
 * level       : レベル
 * title       : 表示名（省略時は種族名）
 * canScout    : スカウトできるか
 * canFlee     : 逃げられるか
 * isFinal     : 倒すとエンディングになるか
 *
 * ★ ボスを増やすときは、ここに1エントリ足して
 *   dungeons.js の boss からそのidを指すだけでよい。
 */
(function (NS) {
  "use strict";

  NS.rawData.bosses = {
    mineKeeper: {
      id: "mineKeeper",
      species: "mossGolem",
      level: 8,
      title: "坑道の主",
      canScout: false,
      canFlee: true,
      isFinal: false
    },

    blazeBeast: {
      id: "blazeBeast",
      species: "flamin",
      level: 18,
      title: "灼熱の獣",
      canScout: false,
      canFlee: true,
      isFinal: false
    },

    abyssKing: {
      id: "abyssKing",
      species: "kingSlime",
      level: 28,
      title: "深淵の王",
      canScout: false,
      canFlee: false,
      isFinal: true
    }
  };
})(window.MyGame);
