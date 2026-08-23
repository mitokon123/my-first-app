/**
 * elements.js
 * 属性の定義。火・水・風・地・雷・光・闇 の7属性と、耐性の影響を受けない「無」。
 *
 * id / name / color : 識別子・表示名・図鑑などで使う色
 * physical          : true なら耐性計算の対象外（無属性）
 *
 * ▼ 属性ダメージの倍率（data/battle.js の resistance で調整）
 *   倍率 = 1 - 耐性 × step        （step は現在 0.07）
 *   耐性は -5〜10 で、data/monsters.js の resistances に書く。
 *   immunities に属性idを入れると、その属性は完全に無効（ダメージ0）になる。
 *
 * ★ 属性を増やすときは、このファイルに1エントリ足すだけでよい。
 *   モンスターは monsters.js の element、技は skills.js の element で参照する。
 */
(function (NS) {
  "use strict";

  NS.rawData.elements = {
    // 耐性の影響を受けない。通常攻撃や「体当たり」などに使う
    none:    { id: "none",    name: "無",   color: "#9aa4c0", physical: true },

    fire:    { id: "fire",    name: "火",   color: "#e8542a" },
    water:   { id: "water",   name: "水",   color: "#4fb0d1" },
    wind:    { id: "wind",    name: "風",   color: "#7fd9a8" },
    earth:   { id: "earth",   name: "地",   color: "#c8a35e" },
    thunder: { id: "thunder", name: "雷",   color: "#ffd75e" },
    light:   { id: "light",   name: "光",   color: "#f2f0d8" },
    dark:    { id: "dark",    name: "闇",   color: "#8b6fd6" }
  };
})(window.MyGame);
