/**
 * PatchNoteScene.js
 * パッチノート（更新履歴）の画面。タイトル画面から開く。
 *
 * 左にバージョンの一覧、右にその内容を出す。
 * 過去のバージョンも同じ操作で読み返せるようにしてある。
 *
 * 項目の種類（追加・調整・修正など）は色つきの札で示す。
 * 種類と色は data/patchnotes.js の types で決まるので、
 * 種類を増やしてもこのコードは変更しなくてよい。
 *
 * ▼ 操作
 *   ↑↓        … 左でバージョンを選ぶ
 *   ←→ / 決定 … 内容側へ移り、↑↓で読み進める
 *   ホイール    … カーソルの位置にある側をスクロール
 *   Esc / 戻る … タイトルへ
 */
(function (NS) {
  "use strict";

  /**
   * @param {MyGame.Game} game
   * @param {object} returnScene 閉じたときに戻るシーン
   */
  function PatchNoteScene(game, returnScene) {
    this.game = game;
    this.returnScene = returnScene;

    var ui = game.data.ui || {};
    this.theme = ui.theme || {};
    this.layout = ui.patchNote || {};
    this.texts = (game.data.messages || {}).patchNote || {};

    var notes = game.data.patchnotes || {};
    this.versions = notes.versions || [];
    this.types = notes.types || {};

    this.panel = new NS.Panel(game.ctx, this.theme);
    this.renderer = new NS.Renderer(game.ctx);
    this.backButton = new NS.BackButton(this.panel, game.data);

    this.index = 0;       // 選んでいるバージョン
    this.scroll = 0;      // 内容の表示開始行
    this.focus = "list";  // "list"（バージョンを選ぶ）/ "notes"（内容を読む）
  }

  PatchNoteScene.prototype.enter = function () {
    this.index = 0;
    this.scroll = 0;
    this.focus = "list";
  };

  PatchNoteScene.prototype.getSelected = function () {
    return this.versions[this.index] || null;
  };

  // --- 更新 ---

  PatchNoteScene.prototype.update = function () {
    var input = this.game.input;

    if (this.backButton.handleInput(input) || input.isPressed("cancel")) {
      this.game.scenes.change(this.returnScene);
      return;
    }

    // カーソルを重ねた側を操作できるようにする
    this._updateFocusByPointer(input);

    if (this.focus === "notes") this._updateNotes(input);
    else this._updateList(input);
  };

  /** マウスを重ねた側へ操作の対象を移す */
  PatchNoteScene.prototype._updateFocusByPointer = function (input) {
    if (!input.getPointer) return;

    var pointer = input.getPointer();
    if (!pointer.inside) return;
    if (!pointer.moved && !pointer.clicked && !pointer.wheel) return;

    if (NS.Panel.containsPoint(this.layout.list, pointer)) this.focus = "list";
    else if (NS.Panel.containsPoint(this.layout.notes, pointer)) this.focus = "notes";
  };

  PatchNoteScene.prototype._updateList = function (input) {
    var count = this.versions.length;
    if (count === 0) return;

    var before = this.index;

    if (input.isPressed("up")) this.index = (this.index - 1 + count) % count;
    if (input.isPressed("down")) this.index = (this.index + 1) % count;

    var hovered = this._hoveredVersion(input);
    if (hovered >= 0) this.index = hovered;

    // ホイールは端で止める（回り込むと今どこを見ているか分からなくなる）
    var wheel = input.getPointer ? input.getPointer().wheel : 0;
    if (wheel) this.index = clamp(this.index + wheel, 0, count - 1);

    // 別のバージョンを選んだら、内容は先頭から読み直す
    if (this.index !== before) this.scroll = 0;

    if (input.isPressed("confirm") || input.isPressed("right")) this.focus = "notes";
  };

  PatchNoteScene.prototype._updateNotes = function (input) {
    var max = this._maxScroll();

    if (input.isPressed("up")) this.scroll = Math.max(0, this.scroll - 1);
    if (input.isPressed("down")) this.scroll = Math.min(max, this.scroll + 1);

    var wheel = input.getPointer ? input.getPointer().wheel : 0;
    if (wheel) this.scroll = clamp(this.scroll + wheel, 0, max);

    if (input.isPressed("left")) this.focus = "list";
  };

  /** カーソルが乗っているバージョンの番号（乗っていなければ -1） */
  PatchNoteScene.prototype._hoveredVersion = function (input) {
    if (!input.getPointer) return -1;

    var pointer = input.getPointer();
    if (!pointer.inside) return -1;
    if (!pointer.moved && !pointer.clicked) return -1;

    var L = this.layout.list;
    for (var i = 0; i < this.versions.length; i++) {
      var rect = { x: L.x, y: L.y + L.rowHeight * i, w: L.w, h: L.rowHeight - 4 };
      if (NS.Panel.containsPoint(rect, pointer)) return i;
    }
    return -1;
  };

  // --- 内容の組み立て ---

  /**
   * 選んでいるバージョンの内容を、描く行の配列にする。
   * 長い文は折り返し、2行目以降は種類の札のぶんだけ字下げする。
   *
   * @returns {Array<{text:string, tag:object|null}>}
   */
  PatchNoteScene.prototype._buildLines = function () {
    var version = this.getSelected();
    if (!version) return [];

    var chars = this.layout.notes.charsPerLine || 34;
    var entries = version.entries || [];
    var lines = [];

    for (var i = 0; i < entries.length; i++) {
      var type = this.types[entries[i].type] || null;
      var wrapped = wrapText(entries[i].text || "", chars);

      for (var j = 0; j < wrapped.length; j++) {
        // 札は1行目にだけ付ける
        lines.push({ text: wrapped[j], tag: (j === 0) ? type : null });
      }
      lines.push({ text: "", tag: null });   // 項目のあいだに1行あける
    }
    return lines;
  };

  PatchNoteScene.prototype._visibleLines = function () {
    var N = this.layout.notes;
    var lh = this.theme.lineHeight || 18;
    return Math.max(1, Math.floor((N.h - (this.theme.padding || 8) * 2 - 24) / lh));
  };

  PatchNoteScene.prototype._maxScroll = function () {
    return Math.max(0, this._buildLines().length - this._visibleLines());
  };

  // --- 描画 ---

  PatchNoteScene.prototype.render = function (ctx) {
    var w = this.game.canvas.width;
    var h = this.game.canvas.height;

    this.renderer.clear(this.layout.background || "#0a0f1c", w, h);

    this._renderHeading();
    this._renderLegend();
    this._renderVersionList();
    this._renderNotes();
    this._renderHint();
    this.backButton.render();
  };

  PatchNoteScene.prototype._renderHeading = function () {
    var title = this.layout.title || {};
    var subtitle = this.layout.subtitle || {};

    this.panel.drawText(this.texts.title || "", title.x, title.y,
      { font: title.font, color: title.color });
    this.panel.drawText(this.texts.subtitle || "", subtitle.x, subtitle.y,
      { font: subtitle.font, color: subtitle.color });
  };

  /** 色が何を表すかの凡例。上部に並べる */
  PatchNoteScene.prototype._renderLegend = function () {
    var pos = this.layout.legend;
    if (!pos) return;

    var x = pos.x;
    for (var id in this.types) {
      if (!Object.prototype.hasOwnProperty.call(this.types, id)) continue;
      var type = this.types[id];

      this._drawTag(type, x, pos.y);
      x += pos.gap;
    }
  };

  /** 種類の札（色つきの小さな四角に文字） */
  PatchNoteScene.prototype._drawTag = function (type, x, y) {
    var T = this.layout.tag || { w: 34, h: 16 };
    var ctx = this.panel.ctx;

    ctx.fillStyle = type.color || this.theme.subTextColor;
    ctx.fillRect(x, y - T.h + 3, T.w, T.h);

    this.panel.drawText(type.label, x + T.w / 2, y,
      { align: "center", font: this.theme.smallFont, color: this.layout.tagTextColor || "#0a0f1c" });
  };

  /** 左：バージョンの一覧（新しいものが上） */
  PatchNoteScene.prototype._renderVersionList = function () {
    var L = this.layout.list;
    var t = this.theme;

    this.panel.drawBox({ x: L.x, y: L.y - 10, w: L.w, h: L.h });

    for (var i = 0; i < this.versions.length; i++) {
      var version = this.versions[i];
      var selected = (i === this.index);
      var y = L.y + L.rowHeight * i;

      if (selected) {
        this.panel.ctx.fillStyle = this.layout.selectedBg || "rgba(74,107,168,0.3)";
        this.panel.ctx.fillRect(L.x + 2, y, L.w - 4, L.rowHeight - 4);
      }

      this.panel.drawText(version.version, L.x + 12, y + 20,
        { color: selected ? t.cursorColor : t.textColor });
      this.panel.drawText(version.date || "", L.x + L.w - 12, y + 20,
        { align: "right", font: t.smallFont, color: t.hintColor });
      this.panel.drawText(version.summary || "", L.x + 12, y + 38,
        { font: t.smallFont, color: t.subTextColor });
    }
  };

  /** 右：選んでいるバージョンの内容 */
  PatchNoteScene.prototype._renderNotes = function () {
    var N = this.layout.notes;
    var t = this.theme;

    this.panel.drawBox(N);

    var version = this.getSelected();
    if (!version) return;

    var origin = this.panel.innerOrigin(N);
    var lh = t.lineHeight || 18;

    // 見出し（バージョン名）
    this.panel.drawText(version.version + "　" + (version.summary || ""),
      origin.x, origin.y + 16,
      { color: (this.focus === "notes") ? t.cursorColor : t.textColor });

    var lines = this._buildLines();
    var visible = this._visibleLines();

    // まだ中身の無いバージョン（開発中）は、空欄に見えないよう一言出す
    if (lines.length === 0) {
      this.panel.drawText(this.texts.empty || "", origin.x, origin.y + 44,
        { font: t.smallFont, color: t.hintColor });
      return;
    }

    var max = Math.max(0, lines.length - visible);
    if (this.scroll > max) this.scroll = max;

    var top = origin.y + 40;
    var textX = origin.x + (this.layout.tag || {}).w + 10;
    var end = Math.min(lines.length, this.scroll + visible);
    var y = top;

    for (var i = this.scroll; i < end; i++) {
      var line = lines[i];
      if (line.tag) this._drawTag(line.tag, origin.x, y);
      if (line.text) {
        this.panel.drawText(line.text, textX, y, { font: t.smallFont, color: t.textColor });
      }
      y += lh;
    }

    this._renderScrollMarks(N, top, lines.length, visible);
  };

  PatchNoteScene.prototype._renderScrollMarks = function (rect, top, total, visible) {
    var t = this.theme;
    var color = (this.focus === "notes") ? t.cursorColor : t.hintColor;

    if (this.scroll > 0) {
      this.panel.drawText("▲", rect.x + rect.w - 16, top - 6,
        { font: t.smallFont, color: color });
    }
    if (this.scroll + visible < total) {
      this.panel.drawText("▼", rect.x + rect.w - 16, rect.y + rect.h - 8,
        { font: t.smallFont, color: color });
    }
  };

  PatchNoteScene.prototype._renderHint = function () {
    var pos = this.layout.hint || { x: 48, y: 570 };
    var hint = (this.focus === "notes") ? this.texts.hintNotes : this.texts.hintList;

    this.panel.drawText(hint || "", pos.x, pos.y,
      { font: this.theme.smallFont, color: this.theme.hintColor });
  };

  /** 値を範囲内に収める */
  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  /** 文字数で折り返す（等幅フォント前提の簡易処理） */
  function wrapText(text, charsPerLine) {
    var lines = [];
    for (var i = 0; i < text.length; i += charsPerLine) {
      lines.push(text.substr(i, charsPerLine));
    }
    return lines;
  }

  NS.PatchNoteScene = PatchNoteScene;
})(window.MyGame);
