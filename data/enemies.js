/**
 * enemies.js
 * エンカウント（敵の出現）の共通設定。
 *
 * 「どこにどの敵が出るか」はダンジョンごとに違うので data/dungeons.js の encounter に書く。
 * このファイルは、そこに書かれていなかったときに使う既定値だけを持つ。
 *
 * encounterRate : 1歩あたりの遭遇確率（0〜1）
 * gracePeriod   : 戦闘直後に遭遇しない歩数（連続遭遇を防ぐ）
 * defaultLevel  : 出現レベルの既定値
 * defaultGroupSize : 一度に出てくる敵の数の既定値
 *
 * ▼ レベルの決まり方（上から順に、最初に見つかったものを使う）
 *     1. dungeons.js の table の minLevel / maxLevel … 場所ごと × モンスターごと
 *     2. dungeons.js の encounter.levelRange        … その場所の既定
 *     3. ここの defaultLevel                        … 全体の既定
 */
(function (NS) {
  "use strict";

  NS.rawData.enemies = {
    encounterRate: 0.08,
    gracePeriod: 8,
    defaultLevel: { min: 1, max: 1 },
    defaultGroupSize: { min: 1, max: 2 }
  };
})(window.MyGame);
