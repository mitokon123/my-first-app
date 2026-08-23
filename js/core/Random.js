/**
 * Random.js
 * シード指定可能な擬似乱数（xorshift32）。
 * ローグライクでは「同じシードで同じダンジョン」を再現できると
 * デバッグ・検証・将来のシード共有機能に役立つため、Math.random を直接使わない。
 */
(function (NS) {
  "use strict";

  /**
   * @param {number} [seed] 省略時は現在時刻から生成
   */
  function Random(seed) {
    this.setSeed(seed);
  }

  Random.prototype.setSeed = function (seed) {
    if (seed === undefined || seed === null) seed = Date.now();
    // 0 は xorshift で不動点になるため避ける
    this.seed = (seed >>> 0) || 1;

    // 近い値のシード（連番や Date.now() の連続呼び出し）でも出力が偏らないよう、
    // 初期状態を撹拌してから使う。これをしないと最初の数個の乱数がほぼ同じ値になる。
    this._state = scramble(this.seed);
    for (var i = 0; i < WARMUP_COUNT; i++) this.next();
  };

  var WARMUP_COUNT = 8; // 初期状態を十分にかき混ぜるための空回し回数

  // シード値をハッシュして散らす（splitmix32 相当）
  function scramble(seed) {
    var x = (seed + 0x9e3779b9) >>> 0;
    x = Math.imul(x ^ (x >>> 16), 0x21f0aaad) >>> 0;
    x = Math.imul(x ^ (x >>> 15), 0x735a2d97) >>> 0;
    x = (x ^ (x >>> 15)) >>> 0;
    return x || 1;
  }

  // 0以上1未満の実数
  Random.prototype.next = function () {
    var x = this._state;
    x ^= x << 13; x >>>= 0;
    x ^= x >> 17;
    x ^= x << 5;  x >>>= 0;
    this._state = x;
    return x / 4294967296;
  };

  // min以上max以下の整数
  Random.prototype.nextInt = function (min, max) {
    return min + Math.floor(this.next() * (max - min + 1));
  };

  // 配列からランダムに1つ選ぶ
  Random.prototype.pick = function (arr) {
    if (!arr || arr.length === 0) return null;
    return arr[this.nextInt(0, arr.length - 1)];
  };

  NS.Random = Random;
})(window.MyGame);
