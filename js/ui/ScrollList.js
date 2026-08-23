/**
 * ScrollList.js
 * 縦に長い一覧を、決まった行数ずつ表示するUI部品。
 * 選択位置に合わせて表示範囲が自動でずれる（スクロール）。
 *
 * 中身は「行の配列」で渡す。行は次の2種類。
 *   { type:"header", label }            … 分類の見出し（選択できない）
 *   { type:"entry",  label, value, ... } … 選択できる項目
 *
 * entry には right（右端の補助表示）と rightColor（その色）を付けられる。
 *
 * 持ち物・図鑑など、分類ごとに区切られた一覧で使い回せる。
 */
(function (NS) {
  "use strict";

  /**
   * @param {MyGame.Panel} panel
   * @param {object} rect { x, y, w, h, rowHeight, visibleRows }
   */
  function ScrollList(panel, rect) {
    this.panel = panel;
    this.rect = rect;
    this.rows = [];
    this.index = 0;   // 選択中の行（entry のみ）
    this.top = 0;     // 表示している先頭の行
  }

  /**
   * 行を設定する。最初の選択できる行にカーソルを合わせる。
   */
  ScrollList.prototype.setRows = function (rows) {
    this.rows = rows || [];
    this.index = this._firstSelectable();
    this.top = 0;
    this._scrollToIndex();
  };

  /** 選択中の行（選択できる行が無ければ null） */
  ScrollList.prototype.getSelected = function () {
    var row = this.rows[this.index];
    return (row && row.type === "entry") ? row : null;
  };

  ScrollList.prototype.hasEntries = function () {
    return this._firstSelectable() >= 0;
  };

  /**
   * 上下入力とマウスでカーソルを動かす。見出しは飛ばす。
   *
   * この部品は「選ぶ」ところまでを担当し、決定は呼び出し側が見る。
   * マウスで押した場合は clickedEntry() が true を返すので、
   * 呼び出し側は決定キーと同じ扱いにできる。
   *
   * @returns {boolean} 動いたか
   */
  ScrollList.prototype.handleInput = function (input) {
    if (!this.hasEntries()) return false;

    var moved = false;
    if (input.isPressed("up")) { this._move(-1); moved = true; }
    if (input.isPressed("down")) { this._move(1); moved = true; }

    // マウス：重ねた行へ選択を移す
    var hovered = this._hoveredIndex(input);
    if (hovered >= 0 && hovered !== this.index) {
      this.index = hovered;
      moved = true;
    }

    // ホイール：枠の上で回したら選択を上下させる
    if (this._handleWheel(input)) moved = true;

    if (moved) this._scrollToIndex();
    return moved;
  };

  /**
   * 枠の上でホイールを回したときの移動。
   * @returns {boolean} 動いたか
   */
  ScrollList.prototype._handleWheel = function (input) {
    if (!input.getPointer) return false;

    var pointer = input.getPointer();
    if (!pointer.wheel || !pointer.inside) return false;
    if (!NS.Panel.containsPoint(this.rect, pointer)) return false;

    var steps = Math.abs(pointer.wheel);
    var direction = pointer.wheel > 0 ? 1 : -1;
    var moved = false;

    // ホイールは端で止める。回り込むと、いちばん下まで送ったつもりが
    // 先頭へ戻ってしまい、送った位置を見失うため
    for (var i = 0; i < steps; i++) {
      if (!this._moveClamped(direction)) break;
      moved = true;
    }
    return moved;
  };

  /**
   * この呼び出しで「行が押されたか」。決定キーと同じ扱いにするために使う。
   * @returns {boolean}
   */
  ScrollList.prototype.clickedEntry = function (input) {
    if (!input.getPointer) return false;

    var pointer = input.getPointer();
    if (!pointer.clicked) return false;

    return this._hoveredIndex(input) >= 0;
  };

  /**
   * カーソルが乗っている行の番号（選択できる行のみ。無ければ -1）。
   * 動かしていない間はキーボードの選択を邪魔しない。
   */
  ScrollList.prototype._hoveredIndex = function (input) {
    if (!input.getPointer) return -1;

    var pointer = input.getPointer();
    if (!pointer.inside) return -1;
    if (!pointer.moved && !pointer.clicked) return -1;
    if (!NS.Panel.containsPoint(this.rect, pointer)) return -1;

    var visible = this.rect.visibleRows || 10;
    var end = Math.min(this.rows.length, this.top + visible);

    for (var i = this.top; i < end; i++) {
      if (!this.rows[i] || this.rows[i].type !== "entry") continue;
      if (NS.Panel.containsPoint(this._rowRect(i), pointer)) return i;
    }
    return -1;
  };

  /** 行1つ分の当たり判定の範囲（描画位置に合わせる） */
  ScrollList.prototype._rowRect = function (index) {
    var rowHeight = this.rect.rowHeight || 24;
    var origin = this.panel.innerOrigin(this.rect);

    return {
      x: this.rect.x,
      y: origin.y + rowHeight * (index - this.top),
      w: this.rect.w,
      h: rowHeight
    };
  };

  /**
   * 指定方向へ、次の選択できる行まで動かす（端で折り返す）。
   * キーボードの上下で使う。
   */
  ScrollList.prototype._move = function (direction) {
    var count = this.rows.length;
    var i = this.index;

    for (var step = 0; step < count; step++) {
      i = (i + direction + count) % count;
      if (this.rows[i] && this.rows[i].type === "entry") {
        this.index = i;
        return;
      }
    }
  };

  /**
   * 指定方向へ、次の選択できる行まで動かす（端で止まる。折り返さない）。
   * ホイールで使う。
   * @returns {boolean} 動いたか（端に着いていれば false）
   */
  ScrollList.prototype._moveClamped = function (direction) {
    var count = this.rows.length;

    for (var i = this.index + direction; i >= 0 && i < count; i += direction) {
      if (this.rows[i] && this.rows[i].type === "entry") {
        this.index = i;
        return true;
      }
    }
    return false;
  };

  ScrollList.prototype._firstSelectable = function () {
    for (var i = 0; i < this.rows.length; i++) {
      if (this.rows[i].type === "entry") return i;
    }
    return -1;
  };

  /** 選択行が表示範囲に入るよう、表示開始位置を調整する */
  ScrollList.prototype._scrollToIndex = function () {
    var visible = this.rect.visibleRows || 10;

    if (this.index < this.top) this.top = this.index;
    if (this.index >= this.top + visible) this.top = this.index - visible + 1;

    var maxTop = Math.max(0, this.rows.length - visible);
    this.top = Math.max(0, Math.min(maxTop, this.top));
  };

  ScrollList.prototype.render = function () {
    var t = this.panel.theme;
    var rect = this.rect;
    this.panel.drawBox(rect);

    var origin = this.panel.innerOrigin(rect);
    var rowHeight = rect.rowHeight || 24;
    var visible = rect.visibleRows || 10;
    var end = Math.min(this.rows.length, this.top + visible);

    for (var i = this.top; i < end; i++) {
      var row = this.rows[i];
      var y = origin.y + rowHeight * (i - this.top + 1) - 6;

      if (row.type === "header") {
        this.panel.drawText(row.label, origin.x, y,
          { font: t.smallFont, color: row.color || t.subTextColor });
        continue;
      }

      var selected = (i === this.index);
      if (selected) this.panel.drawText("▶", origin.x + 6, y, { color: t.cursorColor });

      this.panel.drawText(row.label, origin.x + 24, y,
        { color: selected ? t.cursorColor : (row.color || t.textColor) });

      // 右端の補助表示（所持数や状態など）。行ごとに色を変えられる
      if (row.right) {
        var rightColor = selected ? t.cursorColor : (row.rightColor || t.subTextColor);
        this.panel.drawText(row.right, rect.x + rect.w - (t.padding || 8), y,
          { align: "right", font: t.smallFont, color: rightColor });
      }
    }

    this._renderScrollMark(origin, rect, visible, t);
  };

  /** 上下に続きがあることを示す印 */
  ScrollList.prototype._renderScrollMark = function (origin, rect, visible, t) {
    if (this.top > 0) {
      this.panel.drawText("▲", rect.x + rect.w - 18, origin.y + 8,
        { font: t.smallFont, color: t.hintColor });
    }
    if (this.top + visible < this.rows.length) {
      this.panel.drawText("▼", rect.x + rect.w - 18, rect.y + rect.h - 10,
        { font: t.smallFont, color: t.hintColor });
    }
  };

  NS.ScrollList = ScrollList;
})(window.MyGame);
