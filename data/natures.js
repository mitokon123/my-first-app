/**
 * natures.js
 * 性格の定義。個体ごとの味付け（ステータス補正）を持つ。
 *
 * hp / attack / defense / speed : 各ステータスの倍率（1.0 で補正なし）
 *
 * ★ 性格の追加は、このファイルに1エントリ足すだけでよい。
 */
(function (NS) {
  "use strict";

  NS.rawData.natures = {
    balanced: { id: "balanced", name: "素直", hp: 1.0,  attack: 1.0,  defense: 1.0,  speed: 1.0  },
    brave:    { id: "brave",    name: "勇敢", hp: 1.0,  attack: 1.1,  defense: 0.9,  speed: 1.0  },
    sturdy:   { id: "sturdy",   name: "頑丈", hp: 1.1,  attack: 0.9,  defense: 1.1,  speed: 0.9  },
    timid:    { id: "timid",    name: "臆病", hp: 0.9,  attack: 0.95, defense: 1.15, speed: 1.1  },
    swift:    { id: "swift",    name: "俊敏", hp: 0.95, attack: 1.0,  defense: 0.95, speed: 1.15 }
  };
})(window.MyGame);
