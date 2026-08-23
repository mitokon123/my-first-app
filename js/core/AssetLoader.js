/**
 * AssetLoader.js
 * スプライト定義から「描画可能なもの（Canvas または Image）」を用意して保持する。
 *
 * - コード生成方式 { pixels, palette } … オフスクリーンCanvasへ即描画（file:// でも確実）
 * - 画像方式        { src }              … Image を読み込む（後からPNGへ差し替え用）
 *
 * SpriteRenderer は get(id) で取得した描画物を drawImage で拡大描画する。
 */
(function (NS) {
  "use strict";

  function AssetLoader() {
    this._sprites = {}; // id → HTMLCanvasElement | HTMLImageElement
  }

  /**
   * スプライト定義群から描画物を構築する。
   * @param {object} spriteDefs gameData.sprites
   */
  AssetLoader.prototype.build = function (spriteDefs) {
    spriteDefs = spriteDefs || {};
    for (var id in spriteDefs) {
      if (!Object.prototype.hasOwnProperty.call(spriteDefs, id)) continue;
      var def = spriteDefs[id];
      if (def && def.src) {
        this._sprites[id] = loadImage(def.src);        // 画像方式（非同期）
      } else if (def && def.pixels) {
        this._sprites[id] = buildFromPixels(def);      // コード生成方式（同期）
      }
    }
  };

  // id に対応する描画物を返す（無ければ null）
  AssetLoader.prototype.get = function (id) {
    return this._sprites[id] || null;
  };

  // --- 内部ヘルパ ---

  // ドット絵（文字列配列＋パレット）から 1ドット=1px のCanvasを作る
  function buildFromPixels(def) {
    var rows = def.pixels;
    var palette = def.palette || {};
    var h = rows.length;
    var w = h > 0 ? rows[0].length : 0;

    var canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    var ctx = canvas.getContext("2d");

    for (var y = 0; y < h; y++) {
      var line = rows[y];
      for (var x = 0; x < w; x++) {
        var color = palette[line.charAt(x)];
        if (color) { // null/undefined は透明としてスキップ
          ctx.fillStyle = color;
          ctx.fillRect(x, y, 1, 1);
        }
      }
    }
    return canvas;
  }

  function loadImage(src) {
    var img = new Image();
    img.src = src;
    return img;
  }

  NS.AssetLoader = AssetLoader;
})(window.MyGame);
