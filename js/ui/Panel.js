/**
 * Panel.js
 * UI の共通土台。枠付きパネルの描画と、テーマ（色・フォント）の参照をまとめる。
 * 各UI部品はこれを使うことで、data/ui.js の theme を変えるだけで見た目が揃って変わる。
 */
(function (NS) {
  "use strict";

  /**
   * @param {CanvasRenderingContext2D} ctx
   * @param {object} theme data/ui.js の theme
   */
  function Panel(ctx, theme) {
    this.ctx = ctx;
    this.theme = theme || {};
  }

  /**
   * 枠付きパネルを描く。
   * @param {object} rect { x, y, w, h }
   */
  Panel.prototype.drawBox = function (rect) {
    var t = this.theme;
    var bw = t.borderWidth || 2;

    this.ctx.fillStyle = t.panelBg || "rgba(0,0,0,0.9)";
    this.ctx.fillRect(rect.x, rect.y, rect.w, rect.h);

    this.ctx.strokeStyle = t.panelBorder || "#ffffff";
    this.ctx.lineWidth = bw;
    // 線がぼやけないよう半ピクセルずらす
    this.ctx.strokeRect(rect.x + bw / 2, rect.y + bw / 2, rect.w - bw, rect.h - bw);
  };

  /**
   * テキストを描く。
   * @param {string} str
   * @param {number} x
   * @param {number} y
   * @param {object} [opts] { color, font, align }
   */
  Panel.prototype.drawText = function (str, x, y, opts) {
    opts = opts || {};
    var t = this.theme;
    this.ctx.fillStyle = opts.color || t.textColor || "#ffffff";
    this.ctx.font = opts.font || t.font || "14px monospace";
    this.ctx.textAlign = opts.align || "left";
    this.ctx.fillText(str, x, y);
    this.ctx.textAlign = "left";
  };

  /** パネル内側の左上座標を返す（padding を考慮） */
  Panel.prototype.innerOrigin = function (rect) {
    var p = this.theme.padding || 8;
    return { x: rect.x + p, y: rect.y + p };
  };

  /**
   * その座標が枠の中にあるか。マウス操作の当たり判定に使う。
   * @param {object} rect { x, y, w, h }
   * @param {object} point { x, y }
   */
  Panel.containsPoint = function (rect, point) {
    if (!rect || !point) return false;
    return point.x >= rect.x && point.x < rect.x + rect.w
        && point.y >= rect.y && point.y < rect.y + rect.h;
  };

  NS.Panel = Panel;
})(window.MyGame);
