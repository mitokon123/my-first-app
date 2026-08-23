/**
 * features.js
 * 階層に置かれる「仕掛けマス」の定義。宝箱・泉・罠など。
 *
 * id      : 識別子（dungeons.js の features から個数を指定するときに使う）
 * name    : 表示名
 * mark    : マップに重ねて表示する記号
 * color   : 記号の色
 * hidden  : true なら踏むまで表示しない（罠など）
 * once    : true なら一度使うと消える
 * effect  : 踏んだときの効果
 *   type "giveItem" … table から1つ選んで渡す
 *        table : [{ item, weight, min, max }] 中身の候補（重み付き抽選）
 *   type "heal"     … 仲間を回復する
 *        hpRatio / ppRatio : 最大値に対する割合（1.0 で全回復）
 *   type "damage"   … 仲間全員にダメージ
 *        hpRatio      : 最大HPに対する割合
 *        leaveAtLeast : 最低これだけHPを残す（罠だけで全滅しないようにする）
 *
 * ★ 新しい仕掛けの追加は、このファイルに1エントリ足し、
 *   dungeons.js の features で個数を指定するだけでよい。
 *   新しい効果の種類を足すときは js/systems/FeatureSystem.js に処理を追加する。
 */
(function (NS) {
  "use strict";

  NS.rawData.features = {
    chest: {
      id: "chest",
      name: "宝箱",
      mark: "宝",
      color: "#ffd75e",
      hidden: false,
      once: true,
      effect: {
        type: "giveItem",
        table: [
          { item: "herb",     weight: 1.0, min: 1, max: 1 },
          { item: "oreShard", weight: 0.4, min: 1, max: 2 },
          { item: "potion",   weight: 0.2, min: 1, max: 1 }
        ]
      }
    },

    spring: {
      id: "spring",
      name: "泉",
      mark: "泉",
      color: "#4fb0d1",
      hidden: false,
      once: true,
      effect: { type: "heal", hpRatio: 0.5, ppRatio: 0.5 }
    },

    trap: {
      id: "trap",
      name: "罠",
      mark: "罠",
      color: "#e8542a",
      hidden: true,     // 踏むまで見えない
      once: true,
      effect: { type: "damage", hpRatio: 0.12, leaveAtLeast: 1 }
    }
  };
})(window.MyGame);
