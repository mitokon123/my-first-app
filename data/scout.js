/**
 * scout.js
 * スカウト（仲間にする）に関する数値。ゲームバランスの中心。
 *
 * ▼ スカウト成功率の計算式（すべてこのファイルの数値で調整可能）
 *   成功率 = 種族の scoutRate × (1 + (1 - HP割合) × hpBonusMax) × 道具の倍率
 *   結果は minRate〜maxRate の範囲に収める。
 *
 *   HP が満タンのとき  … scoutRate のまま
 *   HP が少ないほど    … 最大で hpBonusMax の分だけ倍率が上がる
 *
 * hpBonusMax : HPが0のときに加算される倍率の上限
 * minRate    : 最低成功率（絶対に成功しない状況を作らない）
 * maxRate    : 最高成功率（確実に成功する状況を作らない）
 * defaultItemMultiplier : 道具を使わない場合の倍率
 */
(function (NS) {
  "use strict";

  NS.rawData.scout = {
    hpBonusMax: 1.5,
    minRate: 0.05,
    maxRate: 0.95,
    defaultItemMultiplier: 1.0
  };
})(window.MyGame);
