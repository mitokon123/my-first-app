/**
 * ScrollList.js
 * 縦に長い一覧を、枠の中でスクロールさせて表示するUI部品。
 *
 * 中身は「行の配列」で渡す。行は次の2種類。
 *   { type:"header", label }            … 分類の見出し（選択できない）
 *   { type:"entry",  label, value, ... } … 選択できる項目
 *
 * entry には right（右端の補助表示）と rightColor（その色）を付けられる。
 *
 * ▼ 動かし方
 *   ・上下キー … 選択を1つ動かす。選んだ行が枠の外なら、そこまでスクロールする。
 *               見出しの直下の行を選んだときは見出しも一緒に見せる
 *               （見出しだけ枠の外に取り残されて「分類が消えた」ように見えないため）
 *   ・マウス   … 重ねた行を選ぶ。押して離すと決定（clickedEntry）
 *   ・ホイール … 選択は動かさず、枠の中身だけをずらす（行単位ではなく px 単位）
 *   ・右端のバー … つまんで動かす。溝を押すとそこへ飛ぶ
 *
 * スクロールは px 単位で、表示は目標へ少し遅れて追いつく（theme.scrollbar.smoothing）。
 * 行単位で飛ばしていたころは、項目が多いと途中で止まれず、
 * 一番上へ戻ったときに見出しが隠れる不具合もあった。
 *
 * 持ち物・図鑑・店・工房など、分類ごとに区切られた一覧で使い回す。
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
    this.index = 0;          // 選択中の行（entry のみ）
    this.scroll = 0;         // いま表示しているずれ（px）
    this.scrollTarget = 0;   // 向かっている先（px）

    this._dragging = false;  // バーをつまんでいる最中
    this._dragGrab = 0;      // つまんだ位置（つまみの上端からの距離）
    this._wasDown = false;   // 前のフレームで左ボタンが押されていたか
    this._dragReleased = false;
  }

  // --- 行と大きさ ---

  ScrollList.prototype._rowHeight = function () { return this.rect.rowHeight || 24; };

  /** 枠の中で行を見せられる高さ（px） */
  ScrollList.prototype._viewHeight = function () {
    var rows = this.rect.visibleRows;
    if (rows) return rows * this._rowHeight();
    var padding = (this.panel.theme.padding || 8) * 2;
    return Math.max(this._rowHeight(), this.rect.h - padding);
  };

  ScrollList.prototype._contentHeight = function () {
    return this.rows.length * this._rowHeight();
  };

  ScrollList.prototype._maxScroll = function () {
    return Math.max(0, this._contentHeight() - this._viewHeight());
  };

  ScrollList.prototype._clampScroll = function (value) {
    return Math.max(0, Math.min(this._maxScroll(), value));
  };

  ScrollList.prototype._theme = function () {
    return this.panel.theme.scrollbar || {};
  };

  /** バーの幅ぶんだけ、行の当たり判定と描く幅を狭める */
  ScrollList.prototype._barSpace = function () {
    var s = this._theme();
    return (s.width || 6) + (s.margin || 4) * 2;
  };

  // --- 外から使うもの ---

  /**
   * 行を設定する。最初の選択できる行にカーソルを合わせ、先頭へ戻す。
   */
  ScrollList.prototype.setRows = function (rows) {
    this.rows = rows || [];
    this.index = this._firstSelectable();
    this.scroll = 0;
    this.scrollTarget = 0;
    this._scrollToIndex();
  };

  /**
   * 選択を指定の行へ移し、見える位置までスクロールする。
   * 一覧を作り直したあとにカーソル位置を戻すときはこれを使う
   * （index に直接入れるとスクロールが追いつかない）。
   */
  ScrollList.prototype.setIndex = function (index) {
    if (index < 0 || index >= this.rows.length) return;
    this.index = index;
    this._scrollToIndex();
    this.scroll = this.scrollTarget;   // 作り直しの直後は待たずに合わせる
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
   * 上下入力・マウス・ホイール・バーで選択と表示を動かす。見出しは飛ばす。
   *
   * この部品は「選ぶ」ところまでを担当し、決定は呼び出し側が見る。
   * マウスで押した場合は clickedEntry() が true を返すので、
   * 呼び出し側は決定キーと同じ扱いにできる。
   *
   * @returns {boolean} 選択が動いたか
   */
  ScrollList.prototype.handleInput = function (input) {
    this._dragReleased = false;
    if (!this.hasEntries()) return false;

    var moved = false;
    if (input.isPressed("up")) { this._move(-1); moved = true; }
    if (input.isPressed("down")) { this._move(1); moved = true; }
    if (moved) this._scrollToIndex();

    // バーをつまむ・溝を押す（行の選択より先に見る。バーの上の行を選ばないように）
    var onBar = this._handleScrollbar(input);

    // マウス：重ねた行へ選択を移す（つまんでいる最中は動かさない）
    if (!onBar) {
      var hovered = this._hoveredIndex(input);
      if (hovered >= 0 && hovered !== this.index) {
        this.index = hovered;
        moved = true;
      }
    }

    // ホイール：枠の上で回したら中身をずらす（選択はそのまま）
    this._handleWheel(input);

    return moved;
  };

  /**
   * この呼び出しで「行が押されたか」。決定キーと同じ扱いにするために使う。
   * バーを離した瞬間は決定にしない。
   * @returns {boolean}
   */
  ScrollList.prototype.clickedEntry = function (input) {
    if (!input.getPointer) return false;
    if (this._dragging || this._dragReleased) return false;

    var pointer = input.getPointer();
    if (!pointer.clicked) return false;
    if (this._scrollbarRect() && NS.Panel.containsPoint(this._scrollbarRect(), pointer)) return false;

    return this._hoveredIndex(input) >= 0;
  };

  // --- ホイール・バー ---

  ScrollList.prototype._handleWheel = function (input) {
    if (!input.getPointer) return;

    var pointer = input.getPointer();
    if (!pointer.wheel || !pointer.inside) return;
    if (!NS.Panel.containsPoint(this.rect, pointer)) return;

    // wheel は「段数 × 設定のスクロール速度」。1段で何行ぶん動くかは theme.scrollbar.wheelRows
    var rows = this._theme().wheelRows || 1;
    this.scrollTarget = this._clampScroll(this.scrollTarget + pointer.wheel * rows * this._rowHeight());
  };

  /**
   * 右端のバー。つまみを押して動かす、溝を押してそこへ飛ぶ。
   * @returns {boolean} このフレームの操作がバーに向いていたか
   */
  ScrollList.prototype._handleScrollbar = function (input) {
    if (!input.getPointer) return false;
    var track = this._scrollbarRect();
    if (!track) { this._dragging = false; return false; }

    var pointer = input.getPointer();
    var handle = this._handleRect(track);
    var pressedNow = pointer.down && !this._wasDown;
    this._wasDown = !!pointer.down;

    if (this._dragging) {
      if (!pointer.down) {
        this._dragging = false;
        this._dragReleased = true;
        return true;
      }
      // つまんだ位置を保ったまま、カーソルの高さへ追わせる
      var travel = track.h - handle.h;
      var ratio = travel > 0 ? (pointer.y - this._dragGrab - track.y) / travel : 0;
      this.scrollTarget = this._clampScroll(ratio * this._maxScroll());
      this.scroll = this.scrollTarget;   // つまんでいる間は遅れさせない
      return true;
    }

    if (!pointer.inside || !NS.Panel.containsPoint(track, pointer)) return false;

    if (pressedNow) {
      if (NS.Panel.containsPoint(handle, pointer)) {
        this._dragging = true;
        this._dragGrab = pointer.y - handle.y;
      } else {
        // 溝を押した：押した位置がつまみの真ん中になるように飛ぶ
        var t = track.h - handle.h;
        var r = t > 0 ? (pointer.y - track.y - handle.h / 2) / t : 0;
        this.scrollTarget = this._clampScroll(r * this._maxScroll());
      }
    }
    return true;
  };

  /** バーの溝の範囲。中身が枠に収まっているときは null（バーを出さない） */
  ScrollList.prototype._scrollbarRect = function () {
    if (this._maxScroll() <= 0) return null;
    var s = this._theme();
    var origin = this.panel.innerOrigin(this.rect);
    var width = s.width || 6;
    var margin = s.margin || 4;
    return {
      x: this.rect.x + this.rect.w - margin - width,
      y: origin.y,
      w: width,
      h: this._viewHeight()
    };
  };

  /** つまみの範囲（いまの表示位置に合わせる） */
  ScrollList.prototype._handleRect = function (track) {
    var s = this._theme();
    var view = this._viewHeight();
    var content = this._contentHeight();
    var h = Math.max(s.minHandle || 24, Math.floor(track.h * view / content));
    h = Math.min(track.h, h);
    var travel = track.h - h;
    var ratio = this._maxScroll() > 0 ? this.scroll / this._maxScroll() : 0;
    return { x: track.x, y: track.y + travel * ratio, w: track.w, h: h };
  };

  // --- 選択 ---

  /**
   * カーソルが乗っている行の番号（選択できる行のみ。無ければ -1）。
   * 動かしていない間はキーボードの選択を邪魔しない。
   */
  ScrollList.prototype._hoveredIndex = function (input) {
    if (!input.getPointer) return -1;

    var pointer = input.getPointer();
    if (!pointer.inside) return -1;
    if (!pointer.moved && !pointer.clicked) return -1;
    if (!NS.Panel.containsPoint(this._viewRect(), pointer)) return -1;

    var range = this._visibleRange();
    for (var i = range.start; i < range.end; i++) {
      if (!this.rows[i] || this.rows[i].type !== "entry") continue;
      if (NS.Panel.containsPoint(this._rowRect(i), pointer)) return i;
    }
    return -1;
  };

  /** 行を見せている範囲（バーの列は含めない） */
  ScrollList.prototype._viewRect = function () {
    var origin = this.panel.innerOrigin(this.rect);
    var bar = this._scrollbarRect() ? this._barSpace() : 0;
    return { x: this.rect.x, y: origin.y, w: this.rect.w - bar, h: this._viewHeight() };
  };

  /** 行1つ分の当たり判定の範囲（描画位置に合わせる） */
  ScrollList.prototype._rowRect = function (index) {
    var origin = this.panel.innerOrigin(this.rect);
    var bar = this._scrollbarRect() ? this._barSpace() : 0;
    return {
      x: this.rect.x,
      y: origin.y + this._rowHeight() * index - this.scroll,
      w: this.rect.w - bar,
      h: this._rowHeight()
    };
  };

  /** いま少しでも見えている行の範囲 [start, end) */
  ScrollList.prototype._visibleRange = function () {
    var rowHeight = this._rowHeight();
    var start = Math.max(0, Math.floor(this.scroll / rowHeight));
    var end = Math.min(this.rows.length, Math.ceil((this.scroll + this._viewHeight()) / rowHeight));
    return { start: start, end: end };
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

  ScrollList.prototype._firstSelectable = function () {
    for (var i = 0; i < this.rows.length; i++) {
      if (this.rows[i].type === "entry") return i;
    }
    return -1;
  };

  /**
   * 選択行が枠に入るよう、目標のずれを調整する。
   * 上へ出るときは、直上に続く見出しも一緒に入れる（分類名が隠れないように）。
   */
  ScrollList.prototype._scrollToIndex = function () {
    var rowHeight = this._rowHeight();
    var view = this._viewHeight();

    var topRow = this.index;
    while (topRow > 0 && this.rows[topRow - 1] && this.rows[topRow - 1].type === "header") topRow--;

    var rowTop = topRow * rowHeight;
    var rowBottom = (this.index + 1) * rowHeight;

    if (rowTop < this.scrollTarget) this.scrollTarget = rowTop;
    if (rowBottom > this.scrollTarget + view) this.scrollTarget = rowBottom - view;
    this.scrollTarget = this._clampScroll(this.scrollTarget);
  };

  // --- 描画 ---

  /**
   * @param {number} [clock] 経過ミリ秒（game.clock）。渡すとカーソルが明滅する。
   *   渡さなければ明滅しないので、既存の呼び出しはそのままでよい。
   */
  ScrollList.prototype.render = function (clock) {
    var t = this.panel.theme;
    var rect = this.rect;
    this.panel.drawBox(rect);

    this._approachTarget();

    var origin = this.panel.innerOrigin(rect);
    var rowHeight = this._rowHeight();
    var view = this._viewHeight();
    var track = this._scrollbarRect();
    var textRight = rect.x + rect.w - (t.padding || 8) - (track ? this._barSpace() : 0);
    var cursorAlpha = cursorAlphaFor(t, clock);
    var range = this._visibleRange();

    // 枠の中だけに描く（端の行が途中で切れて見えるのは、スクロールの途中だと分かるので良い）
    var ctx = this.panel.ctx;
    ctx.save();
    ctx.beginPath();
    ctx.rect(rect.x, origin.y, rect.w, view);
    ctx.clip();

    for (var i = range.start; i < range.end; i++) {
      var row = this.rows[i];
      var y = origin.y + rowHeight * (i + 1) - 6 - this.scroll;

      if (row.type === "header") {
        this.panel.drawText(row.label, origin.x, y,
          { font: t.smallFont, color: row.color || t.subTextColor });
        continue;
      }

      var selected = (i === this.index);
      if (selected) this._drawCursor(origin.x + 6, y, cursorAlpha, t.cursorColor);

      this.panel.drawText(row.label, origin.x + 24, y,
        { color: selected ? t.cursorColor : (row.color || t.textColor) });

      // 右端の補助表示（所持数や状態など）。行ごとに色を変えられる
      if (row.right) {
        var rightColor = selected ? t.cursorColor : (row.rightColor || t.subTextColor);
        this.panel.drawText(row.right, textRight, y,
          { align: "right", font: t.smallFont, color: rightColor });
      }
    }
    ctx.restore();

    if (track) this._renderScrollbar(track);
  };

  /** 表示のずれを目標へ近づける（つまんでいる間は即座） */
  ScrollList.prototype._approachTarget = function () {
    this.scrollTarget = this._clampScroll(this.scrollTarget);
    var diff = this.scrollTarget - this.scroll;
    if (Math.abs(diff) < 0.5) { this.scroll = this.scrollTarget; return; }
    var s = this._theme().smoothing;
    var rate = (s === undefined) ? 0.35 : Math.max(0.05, Math.min(1, s));
    this.scroll += diff * rate;
  };

  /** 右端のバー（溝とつまみ） */
  ScrollList.prototype._renderScrollbar = function (track) {
    var s = this._theme();
    var ctx = this.panel.ctx;
    var handle = this._handleRect(track);
    var radius = track.w / 2;

    ctx.save();
    ctx.fillStyle = s.track || "rgba(255,255,255,0.06)";
    roundRect(ctx, track.x, track.y, track.w, track.h, radius);
    ctx.fill();

    ctx.fillStyle = this._dragging ? (s.handleActive || "#ffd75e") : (s.handle || "#9aa4c0");
    roundRect(ctx, handle.x, handle.y, handle.w, handle.h, radius);
    ctx.fill();
    ctx.restore();
  };

  /** 選択中を示す「▶」を描く（CommandMenu と同じ見え方にそろえてある） */
  ScrollList.prototype._drawCursor = function (x, y, alpha, color) {
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

  /** カーソルの濃さ。時計が無い、または設定が無ければ明滅しない */
  function cursorAlphaFor(theme, clock) {
    var pulse = theme.cursorPulse;
    if (clock === undefined || clock === null || !pulse || !NS.Motion) return 1;

    return Math.max(0, Math.min(1, NS.Motion.value(pulse, clock, 0, 1)));
  }

  /** 角の丸い四角の輪郭（塗るのは呼び出し側） */
  function roundRect(ctx, x, y, w, h, r) {
    r = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.arcTo(x + w, y, x + w, y + r, r);
    ctx.lineTo(x + w, y + h - r);
    ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
    ctx.lineTo(x + r, y + h);
    ctx.arcTo(x, y + h, x, y + h - r, r);
    ctx.lineTo(x, y + r);
    ctx.arcTo(x, y, x + r, y, r);
    ctx.closePath();
  }

  NS.ScrollList = ScrollList;
})(window.MyGame);
