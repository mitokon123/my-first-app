/**
 * HpBar.js
 * 残量バーの描画部品。既定では残量に応じて色が変わる
 * （しきい値・色は data/ui.js の theme）。
 *
 * 色を固定したい場合は drawPp のように options.color を渡す。
 * PPなど「減っても危険ではない」値は、色を変えないほうが読みやすい。
 */
(function (NS) {
  "use strict";

  function HpBar(ctx, theme) {
    this.ctx = ctx;
    this.theme = theme || {};
  }

  /**
   * @param {number} x
   * @param {number} y
   * @param {number} w 全体の幅
   * @param {number} h 高さ
   * @param {number} current 現在値
   * @param {number} max 最大値
   * @param {object} [options] { color, bg } 指定すると残量による色分けをしない
   */
  HpBar.prototype.draw = function (x, y, w, h, current, max, options) {
    var t = this.theme;
    var ratio = max > 0 ? Math.max(0, Math.min(1, current / max)) : 0;

    // 背景
    this.ctx.fillStyle = (options && options.bg) || t.hpBarBg || "#333333";
    this.ctx.fillRect(x, y, w, h);

    this.ctx.fillStyle = (options && options.color) || this._colorFor(ratio);
    this.ctx.fillRect(x, y, Math.floor(w * ratio), h);
  };

  /** PPバー。HPと区別できるよう、残量にかかわらず同じ色で描く */
  HpBar.prototype.drawPp = function (x, y, w, h, current, max) {
    var t = this.theme;
    this.draw(x, y, w, h, current, max,
      { color: t.ppBarColor || "#4fb0d1", bg: t.ppBarBg || t.hpBarBg });
  };

  /** 残量に応じた色 */
  HpBar.prototype._colorFor = function (ratio) {
    var t = this.theme;
    if (ratio <= (t.hpLowThreshold === undefined ? 0.25 : t.hpLowThreshold)) {
      return t.hpBarLow || "#ff0000";
    }
    if (ratio <= (t.hpMidThreshold === undefined ? 0.5 : t.hpMidThreshold)) {
      return t.hpBarMid || "#ffff00";
    }
    return t.hpBarHigh || "#00ff00";
  };

  NS.HpBar = HpBar;
})(window.MyGame);
