/**
 * BackButton.js
 * 画面の隅に置く「戻る」ボタン。マウスだけでも前の画面へ戻れるようにするための部品。
 *
 * キーボードの Esc と同じ働きをする。押せることが見えるように、
 * カーソルを重ねると色が変わる。
 *
 * 位置と大きさは data/ui.js の theme.backButton（全画面で共通）、
 * 文言は data/messages.js の common.back。
 */
(function (NS) {
  "use strict";

  /**
   * @param {MyGame.Panel} panel
   * @param {object} gameData
   * @param {object} [rect] 位置を変えたい画面だけ指定する（省略で共通の位置）
   */
  function BackButton(panel, gameData, rect) {
    this.panel = panel;
    this.rect = rect || (gameData.ui || {}).theme.backButton
             || { x: 690, y: 552, w: 80, h: 30 };
    this.label = ((gameData.messages || {}).common || {}).back || "戻る";
    this.hovered = false;
  }

  /**
   * 入力を見る。カーソルが重なっていれば色を変え、押されたら true を返す。
   * @returns {boolean} 押されたか
   */
  BackButton.prototype.handleInput = function (input) {
    this.hovered = false;
    if (!input || !input.getPointer) return false;

    var pointer = input.getPointer();
    if (!pointer.inside) return false;
    if (!NS.Panel.containsPoint(this.rect, pointer)) return false;

    this.hovered = true;
    return !!pointer.clicked;
  };

  BackButton.prototype.render = function () {
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

  NS.BackButton = BackButton;
})(window.MyGame);
