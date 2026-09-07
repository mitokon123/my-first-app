/**
 * TextButton.js
 * 文字だけの小さなボタン。マウスだけでも操作できるようにするための部品。
 *
 * 押せることが見えるよう、カーソルを重ねると色が変わる。
 * どこに置くか・何と書くかは使う側が決める。
 *
 * 「戻る」ボタン（BackButton）も、探索中の「仲間 / 持ち物」もこれを使う。
 */
(function (NS) {
  "use strict";

  /**
   * @param {MyGame.Panel} panel
   * @param {object} rect { x, y, w, h }
   * @param {string} label 表示する文字
   */
  function TextButton(panel, rect, label) {
    this.panel = panel;
    this.rect = rect || { x: 0, y: 0, w: 80, h: 30 };
    this.label = label || "";
    this.hovered = false;
  }

  /**
   * 入力を見る。カーソルが重なっていれば色を変え、押されたら true を返す。
   * @returns {boolean} 押されたか
   */
  TextButton.prototype.handleInput = function (input) {
    this.hovered = false;
    if (!input || !input.getPointer) return false;

    var pointer = input.getPointer();
    if (!pointer.inside) return false;
    if (!NS.Panel.containsPoint(this.rect, pointer)) return false;

    this.hovered = true;
    return !!pointer.clicked;
  };

  TextButton.prototype.render = function () {
    var t = this.panel.theme;
    var rect = this.rect;
    var ctx = this.panel.ctx;

    ctx.fillStyle = this.hovered ? (t.buttonHoverBg || "rgba(74,107,168,0.45)")
                                 : (t.panelBg || "rgba(8,10,20,0.92)");
    ctx.fillRect(rect.x, rect.y, rect.w, rect.h);

    ctx.strokeStyle = this.hovered ? (t.cursorColor || "#ffd75e")
                                   : (t.panelBorder || "#3a4266");
    ctx.lineWidth = 1;
    ctx.strokeRect(rect.x + 0.5, rect.y + 0.5, rect.w - 1, rect.h - 1);

    this.panel.drawText(this.label, rect.x + rect.w / 2, rect.y + rect.h / 2 + 5, {
      align: "center",
      font: t.smallFont,
      color: this.hovered ? t.cursorColor : t.subTextColor
    });
  };

  NS.TextButton = TextButton;
})(window.MyGame);
