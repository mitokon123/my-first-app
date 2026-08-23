/**
 * GameLoop.js
 * requestAnimationFrame による更新ループ。
 * 毎フレーム update(dt) → render() を呼ぶ。論理更新と描画の呼び出しを一元管理する。
 */
(function (NS) {
  "use strict";

  /**
   * @param {function(number):void} update 論理更新（dt: 経過ミリ秒）
   * @param {function():void} render 描画
   */
  function GameLoop(update, render) {
    this._update = update;
    this._render = render;
    this._last = 0;
    this._running = false;
    this._frame = this._frame.bind(this);
  }

  GameLoop.prototype.start = function () {
    if (this._running) return;
    this._running = true;
    this._last = performance.now();
    requestAnimationFrame(this._frame);
  };

  GameLoop.prototype.stop = function () {
    this._running = false;
  };

  GameLoop.prototype._frame = function (now) {
    if (!this._running) return;
    var dt = now - this._last;
    this._last = now;
    // タブ復帰などで dt が跳ね上がるのを抑える
    if (dt > 100) dt = 100;

    this._update(dt);
    this._render();

    requestAnimationFrame(this._frame);
  };

  NS.GameLoop = GameLoop;
})(window.MyGame);
