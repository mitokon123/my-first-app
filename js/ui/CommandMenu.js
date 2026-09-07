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
   * @param {object} rect { x, y, w, h, lineHeight?, iconSize? }
   *   h は**最低の高さ**。項目が多いときは中身に合わせて自動で伸びる（_boxRect を参照）
   *   lineHeight を指定すると、その間隔で項目を並べる（省略時はテーマの行間）
   *   iconSize を指定し、かつ sprites を渡すと、項目の左に絵がつく
   * @param {MyGame.SpriteRenderer} [sprites] 項目に絵をつけるときだけ渡す
   */
  function CommandMenu(panel, rect, sprites) {
    this.panel = panel;
    this.rect = rect;
    this.sprites = sprites || null;
    this.items = [];
    this.index = 0;
  }

  /**
   * 項目を設定する。
   * @param {Array<{label:string, value:*, icon?:string}>} items
   *   icon はスプライトid。rect.iconSize と sprites の両方がある画面でだけ描かれる
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

  /**
   * 枠の範囲。
   *
   * 高さは**項目数から決める**。data/ui.js に書いた h は「最低の高さ」として扱う。
   * こうしないと、項目が増えたときに文字が枠からはみ出す
   * （実際に、仲間画面の項目が4つ→5つに増えたときにはみ出した）。
   */
  CommandMenu.prototype._boxRect = function () {
    var t = this.panel.theme;
    var lineHeight = this.rect.lineHeight || t.lineHeight || 18;
    var padding = t.padding || 8;
    var needed = padding * 2 + lineHeight * Math.max(1, this.items.length);

    return {
      x: this.rect.x, y: this.rect.y, w: this.rect.w,
      h: Math.max(this.rect.h || 0, needed)
    };
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

  /**
   * @param {number} [clock] 経過ミリ秒（game.clock）。渡すとカーソルが明滅する。
   *   渡さなければ今までどおり明滅しないので、既存の呼び出しはそのままでよい。
   */
  CommandMenu.prototype.render = function (clock) {
    var t = this.panel.theme;
    // 枠は項目数に合わせて伸ばす（_boxRect を参照）
    this.panel.drawBox(this._boxRect());

    var origin = this.panel.innerOrigin(this.rect);
    var lineHeight = this.rect.lineHeight || t.lineHeight || 18;
    var cursorAlpha = this._cursorAlpha(clock);

    // 絵をつけるのは、大きさと描き手の両方がそろっている画面だけ
    var iconSize = (this.sprites && this.rect.iconSize) || 0;
    var shift = t.selectedShift || 0;

    for (var i = 0; i < this.items.length; i++) {
      var item = this.items[i];
      var y = origin.y + lineHeight * (i + 1) - 4;
      var selected = (i === this.index);
      // 選んでいる項目だけ少し右へずらす（カーソルは動かさない）
      var x = origin.x + 18 + (selected ? shift : 0);

      if (selected) {
        this._drawCursor(origin.x, y, cursorAlpha, t.cursorColor);
      }

      if (iconSize > 0 && item.icon) {
        // 文字の下端に合わせて、少し持ち上げて置く
        this.sprites.draw(item.icon, x, y - iconSize + 4, iconSize, iconSize);
        x += iconSize + 8;
      }

      // item.color を書くと、その色で描く（選べない項目を灰色にするなど）。
      // 選んでいる項目でも色は変えない。灰色のまま「▶」だけが動く
      this.panel.drawText(item.label, x, y,
        { color: item.color || (selected ? t.cursorColor : t.textColor) });
    }
  };

  /** カーソルの濃さ。時計が無い、または設定が無ければ明滅しない */
  CommandMenu.prototype._cursorAlpha = function (clock) {
    var pulse = this.panel.theme.cursorPulse;
    if (clock === undefined || clock === null || !pulse || !NS.Motion) return 1;

    return Math.max(0, Math.min(1, NS.Motion.value(pulse, clock, 0, 1)));
  };

  /** 選択中を示す「▶」を描く */
  CommandMenu.prototype._drawCursor = function (x, y, alpha, color) {
    if (alpha >= 1) {
      this.panel.drawText("▶", x, y, { color: color });
      return;
    }

    var ctx = this.panel.ctx;
    ctx.save();
    ctx.globalAlpha = ctx.globalAlpha * alpha;
    this.panel.drawText("▶", x, y, { color: color });
    ctx.restore();
  };

  NS.CommandMenu = CommandMenu;
})(window.MyGame);
