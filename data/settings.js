/**
 * settings.js
 * プレイヤーが調整できる設定の定義。
 *
 * storageKey : 設定を保存するときの localStorage のキー名
 * items      : 設定項目。上から順に設定画面へ並ぶ
 *   id       : 識別子（SettingsManager.get(id) で参照する）
 *   label    : 表示名
 *   type     : "range"（数値を左右で増減）
 *   min/max/step : range のときの範囲と刻み
 *   default  : 初期値
 *   unit     : 表示につける単位（省略可）
 *   valueLabels : 値ごとの表示名（min の値から順に対応）。指定すると数値の代わりに表示する
 *
 * ★ 設定項目を増やすときは items に1エントリ足すだけでよい。
 *   （音量は音声システムの実装後に実際の再生音量へつながる）
 */
(function (NS) {
  "use strict";

  NS.rawData.settings = {
    storageKey: "abyss-chronicle.settings",
    items: [
      // 戦闘の演出の速さ。1が最も遅く、8が最速。
      // 実際の倍率は data/ui.js の battle.animation.speedTable で決まる。
      //   最も遅い 1240ms ／ 標準 620ms ／ 最速 221ms（出来事1つあたり）
      // 「標準」が文章を読み切れる速さになるようにしてある。
      { id: "battleSpeed", label: "戦闘速度", type: "range",
        min: 1, max: 8, step: 1, default: 4,
        valueLabels: ["最も遅い", "遅い", "やや遅い", "標準",
                      "やや速い", "速い", "とても速い", "最速"] },

      // 技の演出と、画面の揺れ・発光の濃さ。
      // 実際の倍率は data/ui.js の battle.animation.effectScale で決まる。
      // 0（全くなし）にすると演出そのものを出さないので、
      // 光の点滅が苦手な人でも遊べる。
      { id: "effectLevel", label: "エフェクトの濃さ", type: "range",
        min: 0, max: 3, step: 1, default: 2,
        valueLabels: ["全くなし", "薄め", "標準", "濃いめ"] },

      // マウスのホイールを1段回したときに動く行数。
      // 一覧の選択にも、図鑑の説明のスクロールにも同じだけ効く。
      { id: "scrollSpeed", label: "スクロール速度", type: "range",
        min: 1, max: 5, step: 1, default: 1,
        valueLabels: ["1行ずつ", "2行ずつ", "3行ずつ", "4行ずつ", "5行ずつ"] },

      { id: "masterVolume", label: "全体音量", type: "range",
        min: 0, max: 100, step: 10, default: 70, unit: "%" },
      { id: "bgmVolume",    label: "BGM音量",  type: "range",
        min: 0, max: 100, step: 10, default: 70, unit: "%" },
      { id: "seVolume",     label: "効果音量", type: "range",
        min: 0, max: 100, step: 10, default: 80, unit: "%" }
    ]
  };
})(window.MyGame);
