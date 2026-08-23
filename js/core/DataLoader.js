/**
 * DataLoader.js
 * 「データの読み込み」だけを担当する（読み込み専用）。
 * 現在は data/*.js が登録した MyGame.rawData を受け取り、GameData を生成して返す。
 *
 * 将来 JSON（fetch）へ移行する場合は、この build を async 化して
 * fetch でファイルを読む実装に差し替えるだけでよい（他は変更不要）。
 */
(function (NS) {
  "use strict";

  var DataLoader = {
    /**
     * 生データから GameData を構築して返す。
     * @param {object} raw 生データ（省略時は MyGame.rawData）
     * @returns {MyGame.GameData}
     */
    build: function (raw) {
      raw = raw || NS.rawData || {};
      return new NS.GameData(raw);
    }
  };

  NS.DataLoader = DataLoader;
})(window.MyGame);
