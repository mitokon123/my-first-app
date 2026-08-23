/**
 * ScreenEffects.js
 * 画面全体にかかる演出。今は「揺れ」と「発光」の2つ。
 *
 * 使い方
 *   effects.shake(強さ) / effects.flash(色, 濃さ) で演出を起こす
 *   update(dt) で時間を進める
 *   描画は begin(ctx) 〜 end(ctx) で挟む。挟んだ中身が揺れる
 *   renderOverlay(ctx, w, h) で発光を重ねる
 *
 * 戦闘に限らず使えるよう、画面の中身については何も知らない作りにしている。
 */
(function (NS) {
  "use strict";

  /**
   * @param {object} params { shakeDuration, flashDuration }
   * @param {MyGame.Random} [random]
   */
  function ScreenEffects(params, random) {
    this.params = params || {};
    this.random = random || new NS.Random();

    this.shakePower = 0;
    this.shakeTimer = 0;

    this.flashColor = null;
    this.flashAlpha = 0;
    this.flashTimer = 0;
  }

  /**
   * 画面を揺らす。
   * @param {number} power 揺れ幅（px）。0以下なら何もしない
   */
  ScreenEffects.prototype.shake = function (power) {
    if (!power || power <= 0) return;
    // 既に揺れている場合は強い方を優先する
    this.shakePower = Math.max(this.shakePower, power);
    this.shakeTimer = this.params.shakeDuration || 250;
  };

  /**
   * 画面を一瞬光らせる。
   * @param {string} color 色
   * @param {number} alpha 濃さ（0〜1）
   */
  ScreenEffects.prototype.flash = function (color, alpha) {
    if (!color) return;
    this.flashColor = color;
    this.flashAlpha = alpha === undefined ? 0.2 : alpha;
    this.flashTimer = this.params.flashDuration || 200;
  };

  ScreenEffects.prototype.isActive = function () {
    return this.shakeTimer > 0 || this.flashTimer > 0;
  };

  ScreenEffects.prototype.update = function (dt) {
    if (this.shakeTimer > 0) {
      this.shakeTimer -= dt;
      if (this.shakeTimer <= 0) { this.shakeTimer = 0; this.shakePower = 0; }
    }
    if (this.flashTimer > 0) {
      this.flashTimer -= dt;
      if (this.flashTimer <= 0) { this.flashTimer = 0; this.flashColor = null; }
    }
  };

  /** 揺れを適用して描画を始める（end と必ず対で使う） */
  ScreenEffects.prototype.begin = function (ctx) {
    ctx.save();
    if (this.shakeTimer <= 0 || this.shakePower <= 0) return;

    // 時間が経つほど揺れを小さくする
    var duration = this.params.shakeDuration || 250;
    var strength = this.shakePower * (this.shakeTimer / duration);
    var dx = (this.random.next() * 2 - 1) * strength;
    var dy = (this.random.next() * 2 - 1) * strength;
    ctx.translate(dx, dy);
  };

  ScreenEffects.prototype.end = function (ctx) {
    ctx.restore();
  };

  /** 発光を画面全体に重ねる（揺れの外側で呼ぶ） */
  ScreenEffects.prototype.renderOverlay = function (ctx, width, height) {
    if (this.flashTimer <= 0 || !this.flashColor) return;

    var duration = this.params.flashDuration || 200;
    ctx.save();
    ctx.globalAlpha = this.flashAlpha * (this.flashTimer / duration);
    ctx.fillStyle = this.flashColor;
    ctx.fillRect(0, 0, width, height);
    ctx.restore();
  };

  NS.ScreenEffects = ScreenEffects;
})(window.MyGame);
