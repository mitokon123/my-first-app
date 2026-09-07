/**
 * NameInput.js
 * 名前をつけるための文字盤。
 *
 * ▼ なぜ文字盤なのか
 * ゲーム画面は Canvas なので、日本語入力（IME）が使えない。
 * キーを直接拾う方法だと英数字しか打てないため、
 * 画面に文字を並べて1文字ずつ選ぶ形にしている。
 *
 * 文字表・面（ひらがな／カタカナ）・最大文字数は data/naming.js、
 * 置き場所と色は data/ui.js の nameInput が持つ。ここは操作と描画だけを行う。
 *
 * ▼ 操作
 *   上下左右 … カーソル移動（下端は「けす／かな／けってい」の並び）
 *   決定     … その文字を足す。ボタンの上ならそのボタンを押す
 *   取り消し … 1文字消す。空のときは名前つけそのものをやめる
 *   Q / E    … 面を切り替える（ひらがな ⇄ カタカナ）
 *   マウス   … マスを直接押せる
 *
 * 使い方
 *   this.nameInput = new MyGame.NameInput(panel, game.data);
 *   this.nameInput.open("スライム");
 *   update: var r = this.nameInput.handleInput(input);
 *           r && r.type === "done"   → r.name が決まった名前
 *           r && r.type === "cancel" → やめた
 *   render: this.nameInput.render(clock);
 */
(function (NS) {
  "use strict";

  /**
   * @param {MyGame.Panel} panel
   * @param {MyGame.GameData} gameData
   */
  function NameInput(panel, gameData) {
    this.panel = panel;
    this.data = gameData;
    this.config = gameData.naming || {};
    this.layout = ((gameData.ui || {}).nameInput) || {};
    this.texts = ((gameData.messages || {}).naming) || {};

    this.pageIndex = 0;
    this.row = 0;
    this.col = 0;
    this.text = "";
    this.title = "";
  }

  /**
   * 文字盤を開く。
   * @param {string} [initialName] 最初から入れておく名前
   * @param {string} [title] 上に出す見出し
   */
  NameInput.prototype.open = function (initialName, title) {
    this.text = initialName || "";
    this.title = title || "";
    this.pageIndex = 0;
    this.row = 0;
    this.col = 0;
  };

  // --- 文字表の読み取り ---

  NameInput.prototype._page = function () {
    return (this.config.pages || [])[this.pageIndex] || { rows: [] };
  };

  NameInput.prototype._rows = function () {
    return this._page().rows || [];
  };

  NameInput.prototype._commands = function () {
    return this.config.commands || [];
  };

  /** 文字の行数（コマンドの並びは含まない） */
  NameInput.prototype._charRowCount = function () {
    return this._rows().length;
  };

  /** いまカーソルがコマンドの並びにいるか */
  NameInput.prototype._onCommandRow = function () {
    return this.row >= this._charRowCount();
  };

  /** その行に何マスあるか */
  NameInput.prototype._colCount = function (row) {
    if (row >= this._charRowCount()) return this._commands().length;
    return (this._rows()[row] || "").length;
  };

  /** いま選んでいる文字（コマンドの上なら null） */
  NameInput.prototype._selectedChar = function () {
    if (this._onCommandRow()) return null;
    return (this._rows()[this.row] || "").charAt(this.col) || null;
  };

  // --- 入力 ---

  /**
   * @returns {null | {type:"done", name:string} | {type:"cancel"}}
   */
  NameInput.prototype.handleInput = function (input) {
    // 面の切り替え（左右は文字を選ぶのに使うので、別のキーを割り当てる）
    if (input.isPressed("prevTab") || input.isPressed("nextTab")) this._turnPage();

    this._moveCursor(input);

    var clicked = this._clickedCell(input);
    if (clicked) {
      this.row = clicked.row;
      this.col = clicked.col;
      return this._commit();
    }

    if (input.isPressed("confirm")) return this._commit();

    if (input.isPressed("cancel")) {
      // 何も入っていなければ、名前つけそのものをやめる
      if (this.text.length === 0) return { type: "cancel" };
      this._backspace();
    }
    return null;
  };

  NameInput.prototype._moveCursor = function (input) {
    var rowMax = this._charRowCount();   // コマンドの並びを足した最後の行番号

    if (input.isPressed("up"))    this.row = (this.row - 1 + rowMax + 1) % (rowMax + 1);
    if (input.isPressed("down"))  this.row = (this.row + 1) % (rowMax + 1);

    // 行が変わると、その行に無い列を指していることがあるので寄せる
    var cols = this._colCount(this.row);
    if (this.col >= cols) this.col = Math.max(0, cols - 1);

    if (input.isPressed("left"))  this.col = (this.col - 1 + cols) % cols;
    if (input.isPressed("right")) this.col = (this.col + 1) % cols;
  };

  /** いま選んでいるものを実行する */
  NameInput.prototype._commit = function () {
    if (this._onCommandRow()) {
      var command = this._commands()[this.col];
      if (!command) return null;

      if (command.value === "done")  return { type: "done", name: this.text };
      if (command.value === "back")  { this._backspace(); return null; }
      if (command.value === "page")  { this._turnPage(); return null; }
      return null;
    }

    var ch = this._selectedChar();
    if (!ch || ch === " ") return null;

    var max = this.config.maxLength || 8;
    if (this.text.length >= max) return null;   // いっぱいなら何も起きない

    this.text += ch;
    return null;
  };

  NameInput.prototype._backspace = function () {
    this.text = this.text.slice(0, -1);
  };

  NameInput.prototype._turnPage = function () {
    var pages = this.config.pages || [];
    if (pages.length <= 1) return;

    this.pageIndex = (this.pageIndex + 1) % pages.length;
    // 面によって行の長さが違うことがあるので、はみ出していたら寄せる
    this.row = Math.min(this.row, this._charRowCount());
    var cols = this._colCount(this.row);
    if (this.col >= cols) this.col = Math.max(0, cols - 1);
  };

  // --- マス目の位置 ---

  NameInput.prototype._cellSize = function () {
    var c = this.config.cell || {};
    return { w: c.w || 34, h: c.h || 30, gap: c.gap || 2 };
  };

  /** 文字1マスの矩形 */
  NameInput.prototype._charRect = function (row, col) {
    var g = this.layout.grid || { x: 0, y: 0 };
    var s = this._cellSize();
    return {
      x: g.x + col * (s.w + s.gap),
      y: g.y + row * (s.h + s.gap),
      w: s.w, h: s.h
    };
  };

  /** コマンド1つぶんの矩形（span のぶんだけ横に広い） */
  NameInput.prototype._commandRect = function (index) {
    var g = this.layout.grid || { x: 0, y: 0 };
    var s = this._cellSize();
    var commands = this._commands();

    var col = 0;
    for (var i = 0; i < index; i++) col += (commands[i].span || 1);

    var span = commands[index] ? (commands[index].span || 1) : 1;
    return {
      x: g.x + col * (s.w + s.gap),
      y: g.y + this._charRowCount() * (s.h + s.gap) + (this.layout.commandGap || 8),
      w: span * (s.w + s.gap) - s.gap,
      h: s.h
    };
  };

  NameInput.prototype._rectOf = function (row, col) {
    return (row >= this._charRowCount()) ? this._commandRect(col) : this._charRect(row, col);
  };

  /** カーソルが乗っているマス（乗っていなければ null） */
  NameInput.prototype._hoveredCell = function (input) {
    if (!input.getPointer) return null;

    var pointer = input.getPointer();
    if (!pointer.inside) return null;

    var rows = this._charRowCount();
    for (var r = 0; r <= rows; r++) {
      var cols = this._colCount(r);
      for (var c = 0; c < cols; c++) {
        if (NS.Panel.containsPoint(this._rectOf(r, c), pointer)) return { row: r, col: c };
      }
    }
    return null;
  };

  /** 押されたマス（押されていなければ null） */
  NameInput.prototype._clickedCell = function (input) {
    if (!input.getPointer || !input.getPointer().clicked) return null;
    return this._hoveredCell(input);
  };

  // --- 描画 ---

  NameInput.prototype.render = function (clock) {
    var t = this.panel.theme;
    var L = this.layout;
    var ctx = this.panel.ctx;

    if (L.box) this.panel.drawBox(L.box);

    // 見出し
    if (this.title && L.title) {
      this.panel.drawText(this.title, L.title.x, L.title.y,
        { font: t.font, color: t.textColor });
    }

    this._renderTypedName(clock);
    this._renderPageLabel();
    this._renderGrid();
    this._renderHint();
  };

  /** いま入っている名前。空きマスを下線で見せて、あと何文字入るか分かるようにする */
  NameInput.prototype._renderTypedName = function (clock) {
    var t = this.panel.theme;
    var N = this.layout.name;
    if (!N) return;

    var ctx = this.panel.ctx;
    var max = this.config.maxLength || 8;
    var step = N.charWidth || 20;

    for (var i = 0; i < max; i++) {
      var x = N.x + i * step;
      var ch = this.text.charAt(i);

      // 空きマスの下線
      ctx.fillStyle = (i === this.text.length) ? (t.cursorColor || "#ffd75e")
                                               : (t.panelBorder || "#3a4266");
      ctx.fillRect(x, N.y + 4, step - 4, 2);

      if (ch) {
        this.panel.drawText(ch, x, N.y, { font: N.font || t.font, color: t.textColor });
      }
    }
  };

  /** いまどの面を見ているか */
  NameInput.prototype._renderPageLabel = function () {
    var P = this.layout.page;
    if (!P) return;

    this.panel.drawText(this._page().label || "", P.x, P.y,
      { align: P.align || "right", font: this.panel.theme.smallFont,
        color: this.panel.theme.subTextColor });
  };

  NameInput.prototype._renderGrid = function () {
    var rows = this._charRowCount();
    var r, c;

    for (r = 0; r < rows; r++) {
      var line = this._rows()[r] || "";
      for (c = 0; c < line.length; c++) {
        var ch = line.charAt(c);
        if (ch === " ") continue;
        this._drawCell(this._charRect(r, c), ch, r === this.row && c === this.col, true);
      }
    }

    var commands = this._commands();
    for (c = 0; c < commands.length; c++) {
      this._drawCell(this._commandRect(c), commands[c].label,
        this.row === rows && c === this.col, false);
    }
  };

  /**
   * マスを1つ描く。
   * @param {boolean} isChar 文字のマスか（コマンドは少し色を変える）
   */
  NameInput.prototype._drawCell = function (rect, label, selected, isChar) {
    var t = this.panel.theme;
    var ctx = this.panel.ctx;

    ctx.fillStyle = selected ? (t.buttonHoverBg || "rgba(74,107,168,0.45)")
                             : (isChar ? "rgba(8,10,20,0.55)" : "rgba(8,10,20,0.8)");
    ctx.fillRect(rect.x, rect.y, rect.w, rect.h);

    ctx.strokeStyle = selected ? (t.cursorColor || "#ffd75e") : (t.panelBorder || "#3a4266");
    ctx.lineWidth = 1;
    ctx.strokeRect(rect.x + 0.5, rect.y + 0.5, rect.w - 1, rect.h - 1);

    this.panel.drawText(label, rect.x + rect.w / 2, rect.y + rect.h / 2 + 5, {
      align: "center",
      font: isChar ? (t.font || "14px monospace") : (t.smallFont || "12px monospace"),
      color: selected ? (t.cursorColor || "#ffd75e")
                      : (isChar ? t.textColor : t.subTextColor)
    });
  };

  NameInput.prototype._renderHint = function () {
    var H = this.layout.hint;
    if (!H) return;

    this.panel.drawText(this.texts.hint || "", H.x, H.y,
      { font: this.panel.theme.smallFont, color: this.panel.theme.hintColor });
  };

  NS.NameInput = NameInput;
})(window.MyGame);
