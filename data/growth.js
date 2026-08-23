/**
 * growth.js
 * レベルアップ・成長に関する数値。ゲームバランスの中心なので独立させている。
 *
 * ▼ 現在の計算式（すべてこのファイルの数値で調整可能）
 *   実効ステータス = floor( 基礎値 × (1 + (レベル - 1) × 成長率) × 性格補正 ) + 個体値
 *     基礎値   … data/monsters.js の baseHp / baseAttack / baseDefense / baseSpeed
 *     成長率   … data/monsters.js の growthRate（種族ごと。詳細は下記）
 *     性格補正 … data/natures.js の倍率
 *     個体値   … 0〜ivMax のランダム（同じ種族でも個体ごとに差が出る）
 *
 *   次のレベルに必要な経験値 = floor( expBase × レベル ^ expExponent )
 *     ※ 累計ではなく「そのレベルから次のレベルまで」に必要な量
 *
 *   倒したときにもらえる経験値 = floor( expReward × (1 + (相手のLv - 1) × expRewardPerLevel) )
 *     expReward … data/monsters.js の種族ごとの基準値（Lv1のときの量）
 *   倒したときにもらえるゴールド = floor( goldReward × (1 + (相手のLv - 1) × goldRewardPerLevel) )
 *
 * ▼ 成長率について
 *   monsters.js の growthRate は次の2つの書き方ができる。
 *     growthRate: 0.08                          … 全ステータス共通
 *     growthRate: { hp: 0.12, attack: 0.06, ... } … ステータスごとに指定
 *   ステータスごとの指定で書かなかった項目は default → defaultGrowthRate の順に使う。
 *   どちらの書き方でも minGrowthRate〜maxGrowthRate の範囲に収める。
 */
(function (NS) {
  "use strict";

  NS.rawData.growth = {
    // レベル上限はモンスターごとに monsters.js の maxLevel で指定できる。
    //   defaultMaxLevel … maxLevel が書かれていない種族に使う既定値
    //   levelCap        … 種族がどう指定しても超えられない絶対の上限
    defaultMaxLevel: 50,
    levelCap: 99,

    // 成長率（1レベルごとの基礎ステータス上昇率）
    defaultGrowthRate: 0.06,  // monsters.js に growthRate が無い場合に使う
    minGrowthRate: 0.01,      // 種族がこれより小さく指定してもこの値まで
    maxGrowthRate: 0.55,      // 種族がこれより大きく指定してもこの値まで

    expBase: 12,           // 必要経験値の基準値
    expExponent: 1.5,      // 必要経験値の指数

    // 倒したときにもらえる経験値は、相手のレベルが高いほど増える。
    //   もらえる経験値 = floor( monsters.js の expReward × (1 + (相手のLv - 1) × expRewardPerLevel) )
    // 0 にすると、レベルに関係なく expReward のままになる。
    expRewardPerLevel: 0.15,

    // ゴールドも同じ形でレベルに応じて増える（monsters.js の goldReward が基準）
    goldRewardPerLevel: 0.15,

    ivMax: 3               // 個体値の最大値（0〜この値のランダム）
  };
})(window.MyGame);
