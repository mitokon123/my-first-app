/**
 * run.js
 * 「1回の挑戦（ラン）」に関する設定。
 *
 * ダンジョンへ入ってから拠点へ戻るまでが1回のラン。
 * ランの途中で拾ったものは、無事に帰らないと持ち帰れない。
 *
 * loseItemsOnDefeat   : 全滅したとき、そのランで拾ったアイテムを失うか
 *   持ち込んだ分は失わない。失うのは「そのランで手に入れた分」だけ
 * loseMonstersOnDefeat: 全滅したとき、そのランでスカウトした仲間を失うか
 * healOnReturn        : 拠点へ戻ったときに仲間を全回復するか
 *   ラン中は回復手段が道具だけになるので、これを false にするとかなり厳しくなる
 *
 * blessing            : 階を降りるたびに選ぶ「加護」の設定
 *   enabled      : 加護を出すか
 *   choiceCount  : 一度に出す選択肢の数
 *   allowRepeat  : 同じ加護を何度も選べるか（false なら一度取ったものは出ない）
 *   activeMax    : 選択肢に入れておける加護の数の上限（拠点の「加護を選ぶ」で使う）
 *   rarityLabels : 出やすさ（weight）を言葉で表すための対応表
 *     min の大きいものから順に見て、最初に当てはまったものを使う
 *   加護の中身は data/blessings.js
 */
(function (NS) {
  "use strict";

  NS.rawData.run = {
    loseItemsOnDefeat: true,
    loseMonstersOnDefeat: false,
    healOnReturn: true,

    blessing: {
      enabled: true,
      choiceCount: 3,
      allowRepeat: false,

      // 選択肢に入れておける加護の数の上限。
      // 加護は1階降りるごとに1つしか取れないので、9個あれば9階ぶん。
      // いまの最深は4階なので余裕はあるが、
      // 「買うほど選択肢が薄まる」のを防ぐために上限を設けてある
      // （買った加護は消えない。外して入れ替えるだけ）
      activeMax: 9,

      // 数字のままだと分かりにくいので、言葉で示す
      rarityLabels: [
        { min: 1.0, label: "よく出る", color: "#5fd18c" },
        { min: 0.7, label: "ふつう",   color: "#7fd9e8" },
        { min: 0.5, label: "少ない",   color: "#ffd75e" },
        { min: 0,   label: "まれ",     color: "#e8b4ff" }
      ]
    }
  };
})(window.MyGame);
