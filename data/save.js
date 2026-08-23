/**
 * save.js
 * セーブに関する設定。
 *
 * storageKey  : localStorage に保存するときのキー名
 * saveVersion : セーブデータの形式バージョン。
 *   将来データ構造を変えたとき、この番号で「古いセーブか」を判別して
 *   読み込みを拒否したり変換したりできるようにしている。
 */
(function (NS) {
  "use strict";

  NS.rawData.save = {
    storageKey: "my-first-app.save",
    saveVersion: 1
  };
})(window.MyGame);
