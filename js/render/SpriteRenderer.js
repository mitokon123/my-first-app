/**
 * SpriteRenderer.js
 * AssetLoader が用意した描画物を、指定ピクセル位置・サイズで描く。
 * ドット絵の拡大は imageSmoothingEnabled=false（Game側で設定）によりくっきり表示される。
 */
(function (NS) {
  "use strict";

  /**
   * @param {CanvasRenderingContext2D} ctx
   * @param {MyGame.AssetLoader} assets
   */
  function SpriteRenderer(ctx, assets) {
    this.ctx = ctx;
    this.assets = assets;
  }

  /**
   * スプライトを描く。
   * @param {string} id スプライトid
   * @param {number} dx 描画先X（px）
   * @param {number} dy 描画先Y（px）
   * @param {number} dw 描画幅（px）
   * @param {number} dh 描画高（px）
   */
  SpriteRenderer.prototype.draw = function (id, dx, dy, dw, dh) {
    var img = this.assets ? this.assets.get(id) : null;
    if (!img) return;
    // 画像方式(Image)はロード完了前は描かない（コード生成のCanvasは常に描画可）
    if (img instanceof HTMLImageElement && !img.complete) return;
    this.ctx.drawImage(img, dx, dy, dw, dh);
  };

  NS.SpriteRenderer = SpriteRenderer;
})(window.MyGame);
