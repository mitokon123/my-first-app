/**
 * Renderer.js
 * Canvas 描画の共通ユーティリティ。各シーンはこれを使って描画する。
 * （スプライト描画は今後 SpriteRenderer として追加予定）
 */
(function (NS) {
  "use strict";

  function Renderer(ctx) {
    this.ctx = ctx;
  }

  // 画面全体を単色で塗りつぶす
  Renderer.prototype.clear = function (color, w, h) {
    this.ctx.fillStyle = color;
    this.ctx.fillRect(0, 0, w, h);
  };

  // 矩形を塗る
  Renderer.prototype.rect = function (x, y, w, h, color) {
    this.ctx.fillStyle = color;
    this.ctx.fillRect(x, y, w, h);
  };

  // テキストを描く。opts: { color, font, align }
  Renderer.prototype.text = function (str, x, y, opts) {
    opts = opts || {};
    this.ctx.fillStyle = opts.color || "#ffffff";
    this.ctx.font = opts.font || "14px monospace";
    this.ctx.textAlign = opts.align || "left";
    this.ctx.fillText(str, x, y);
    this.ctx.textAlign = "left"; // 既定へ戻す
  };

  NS.Renderer = Renderer;
})(window.MyGame);
