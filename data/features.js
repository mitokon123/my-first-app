/**
 * features.js
 * 階層に置かれる「仕掛けマス」の定義。宝箱・泉・罠など。
 *
 * id         : 識別子（dungeons.js の features から個数を指定するときに使う）
 * name       : 表示名
 * sprite     : マップに置くときの絵（data/sprites.js を参照）
 * usedSprite : 使ったあとに残す絵。書かなければ、使った時点で見えなくなる
 * mark       : スプライトが無いときに代わりに描く記号
 * color      : 記号の色
 * hidden     : true なら踏むまで表示しない（罠など）
 * once       : true なら一度使うと消える
 * confirm    : true なら踏んだときに「使うか / やめておくか」を聞く
 *              やめておいた場合は使わずに残るので、あとで戻ってきて使える。
 *              聞くときの文は data/messages.js の feature.〇〇Prompt
 *              （〇〇 は仕掛けのid。例: springPrompt）
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
      sprite: "chest",
      usedSprite: "chestOpen",   // 開けたあとも残す（通った跡が分かる）
      mark: "宝",
      color: "#ffd75e",
      hidden: false,
      once: true,
      se: "chest",   // 使ったときの音（data/audio.js の se）。書かなければ無音
      // ここに書くのは「どのダンジョンでも出る中身」だけ。
      // その場所でしか出ない素材は data/dungeons.js の featureTables に書く
      //（上書きではなく追加されるので、下の3つはどこでも出続ける）
      effect: {
        type: "giveItem",
        table: [
          { item: "herb",        weight: 1.0, min: 1, max: 1 },
          // PPは泉か拠点でしか戻らなかったので、拾えるようにした
          { item: "spiritBerry", weight: 0.3, min: 1, max: 1 },
          { item: "potion",      weight: 0.2, min: 1, max: 1 }
        ]
      }
    },

    spring: {
      id: "spring",
      name: "泉",
      sprite: "spring",
      usedSprite: "springUsed",  // 水が引いた状態で残す
      mark: "泉",
      color: "#4fb0d1",
      hidden: false,
      once: true,
      confirm: true,   // 元気なうちに使ってしまわないよう、使うかどうかを選べる
      se: "spring",
      effect: { type: "heal", hpRatio: 0.5, ppRatio: 0.5 }
    },

    trap: {
      id: "trap",
      name: "罠",
      sprite: null,              // 踏むまでは何も出ない
      usedSprite: "trapSprung",  // 作動したあとに跡が残る
      mark: "罠",
      color: "#e8542a",
      hidden: true,     // 踏むまで見えない
      once: true,
      se: "trap",
      effect: { type: "damage", hpRatio: 0.12, leaveAtLeast: 1 }
    }
  };
})(window.MyGame);
