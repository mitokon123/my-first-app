/**
 * CommandMenu.js
 * 縦並びの選択メニューUI部品。上下で選び、決定/キャンセルを返す。
 *
 * 項目は { label, value } の配列で渡す。何を選んだかは value で受け取る。
 * 戦闘のコマンド、技選択、将来のメニュー画面など、どこでも再利用できる。
 *
 * ▼ マウス
 * 項目に重ねると選択が移り、押すと決定になる。
 * この部品を使っている画面は、コードを変えなくてもマウスで操作できる。
 */
(function (NS) {
  "use strict";

  /**
   * @param {MyGame.Panel} panel
   * @param {object} rect { x, y, w, h, lineHeight? }
   *   lineHeight を指定すると、その間隔で項目を並べる（省略時はテーマの行間）
   */
  function CommandMenu(panel, rect) {
    this.panel = panel;
    this.rect = rect;
    this.items = [];
    this.index = 0;
  }

  /**
   * 項目を設定する。
   * @param {Array<{label:string, value:*}>} items
   */
  CommandMenu.prototype.setItems = function (items) {
    this.items = items || [];
    this.index = 0;
  };

  /** 現在選択中の項目 */
  CommandMenu.prototype.getSelected = function () {
    return this.items[this.index] || null;
  };

  /**
   * 入力を処理する。
   * @param {MyGame.Input} input
   * @returns {{type:"confirm", value:*}|{type:"cancel"}|null}
   */
  CommandMenu.prototype.handleInput = function (input) {
    if (this.items.length === 0) return null;

    if (input.isPressed("up")) {
      this.index = (this.index - 1 + this.items.length) % this.items.length;
    }
    if (input.isPressed("down")) {
      this.index = (this.index + 1) % this.items.length;
    }

    // マウス：重ねた項目へ選択を移し、押されたら決定する
    var hovered = this._hoveredIndex(input);
    if (hovered >= 0) {
      this.index = hovered;
      if (input.getPointer && input.getPointer().clicked) {
        var clicked = this.getSelected();
        return { type: "confirm", value: clicked ? clicked.value : null };
      }
    }

    if (input.isPressed("confirm")) {
      var selected = this.getSelected();
      return { type: "confirm", value: selected ? selected.value : null };
    }
    if (input.isPressed("cancel")) {
      return { type: "cancel" };
    }
    return null;
  };

  /**
   * カーソルが乗っている項目の番号（乗っていなければ -1）。
   * 動かしていない間はキーボードの選択を邪魔しないよう、
   * 「動いた」か「押された」ときだけ見る。
   */
  CommandMenu.prototype._hoveredIndex = function (input) {
    if (!input.getPointer) return -1;

    var pointer = input.getPointer();
    if (!pointer.inside) return -1;
    if (!pointer.moved && !pointer.clicked) return -1;

    for (var i = 0; i < this.items.length; i++) {
      if (NS.Panel.containsPoint(this._itemRect(i), pointer)) return i;
    }
    return -1;
  };

  /** 項目1つ分の当たり判定の範囲（描画位置に合わせる） */
  CommandMenu.prototype._itemRect = function (index) {
    var t = this.panel.theme;
    var lineHeight = this.rect.lineHeight || t.lineHeight || 18;
    var origin = this.panel.innerOrigin(this.rect);

    return {
      x: this.rect.x,
      y: origin.y + lineHeight * index,
      w: this.rect.w,
      h: lineHeight
    };
  };

  CommandMenu.prototype.render = function () {
    var t = this.panel.theme;
    this.panel.drawBox(this.rect);

    var origin = this.panel.innerOrigin(this.rect);
    var lineHeight = this.rect.lineHeight || t.lineHeight || 18;

    for (var i = 0; i < this.items.length; i++) {
      var y = origin.y + lineHeight * (i + 1) - 4;
      var selected = (i === this.index);

      if (selected) {
        this.panel.drawText("▶", origin.x, y, { color: t.cursorColor });
      }
      this.panel.drawText(
        this.items[i].label,
        origin.x + 18,
        y,
        { color: selected ? t.cursorColor : t.textColor }
      );
    }
  };

  NS.CommandMenu = CommandMenu;
})(window.MyGame);
