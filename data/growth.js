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
 *
 * ─────────────────────────────────────────────
 * ▼ 構想：レベルで成長率が変わる仕組み（未実装・地方解放のバージョンで入れる）
 *
 * 今は「1レベルごとの上昇率」が最初から最後まで同じ。
 * これを、あるレベルを境に変えられるようにする。
 *   例：スライムのHP成長率を Lv1〜39 は 0.16、Lv40以降は 0.24 にする
 *
 * ねらいは「育て切ったときの伸びしろ」を種族ごとに変えること。
 * 上限が99の種族（スライム・コウモリ・フレイミン）は、
 * 今のままだと上限が高いだけで、伸び方は序盤と変わらない。
 * 後半で伸びが変わると、長く育てる理由がはっきりする。
 *
 * ▼ 書き方の案（配列で段階を並べる）
 *     growthRate: {
 *       hp: [{ from: 1, rate: 0.16 }, { from: 40, rate: 0.24 }],
 *       attack: 0.16            // 段階が要らない項目は今までどおり数値でよい
 *     }
 *   from は「そのレベルから」。並び順に関係なく from の大きいものが優先。
 *
 * ▼ 直す場所は1か所だけ
 *   js/entities/MonsterInstance.js の getGrowthRate(statKey) が
 *   すでに「数値でもオブジェクトでも書ける」形になっているので、
 *   ここに配列の場合の分岐を足すだけでよい。
 *   ステータス計算式もダメージ計算も戦闘も変更しなくてよい。
 *   （getGrowthRate は今レベルを受け取っていないので、引数を1つ増やすことになる）
 *
 * ▼ 気をつけること
 *   ・図鑑の成長率表示（DexScene）が数値ひとつ前提になっていないか確認する
 *   ・段階が変わっても、これまでのセーブがそのまま読めること
 *     （ステータスは毎回その場で計算しているので、保存し直しは要らないはず）
 * ─────────────────────────────────────────────
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
