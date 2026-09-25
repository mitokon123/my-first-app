/**
 * regions.js
 * 地方（穴）の一覧。data/dungeons.js の region がここの id を指す。
 *
 * 物語の上では、Monstoria に開いた深淵の穴ひとつひとつが「地方」になる。
 * いまのダンジョン4つ（坑道・亀裂・深層・毒沼）は、どれも揺籃の穴の中の区画。
 * （ストーリー構成.md の 6）
 *
 * id   : 識別子（dungeons.js の region、解放条件の { region: "…" } で使う）
 * name : 表示名。ダンジョン選択の見出しの下に出る
 *
 * ★ 穴を増やすときは、ここに1つ足して、dungeons.js の region をそのidにする。
 */
(function (NS) {
  "use strict";

  NS.rawData.regions = {
    cradle: { id: "cradle", name: "揺籃の穴" }
  };
})(window.MyGame);
