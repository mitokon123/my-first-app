/**
 * HelpScene.js
 * 「遊び方」画面。よくある質問を分類ごとに並べ、選ぶと答えを出す。
 *
 * 中身（質問と答え）は data/help.js、配置は data/ui.js の help、
 * 画面まわりの文言は data/messages.js の help が持つ。
 * この画面は**読むだけ**で、ゲームの状態を一切変えない。
 *
 * ▼ 図鑑や持ち物と同じ「左に一覧・右に中身」の形にしてある。
 *   困って開く画面なので、他の画面と操作を変えないほうがよい。
 *
 * ▼ 答えが長いときは右側を送れる（↑↓ではなく Q/E とホイール）。
 *   ↑↓ は一覧の移動に使うので、そこを奪わない。
 */
(function (NS) {
  "use strict";

  function HelpScene(game, returnScene) {
    this.game = game;
    this.returnScene = returnScene;

    var ui = game.data.ui || {};
    this.theme = ui.theme || {};
    this.layout = ui.help || {};
    this.texts = (game.data.messages || {}).help || {};
    this.help = game.data.help || {};

    this.panel = new NS.Panel(game.ctx, this.theme);
    this.list = new NS.ScrollList(this.panel, this.layout.list);
    this.backButton = new NS.BackButton(this.panel, game.data);

    this.answerTop = 0;   // 答えを何行目から出しているか

    this._buildList();
  }

  HelpScene.prototype.enter = function () {};

  /**
   * その質問をいま出してよいか。
   *
   * ★ まだ出会っていない機能の質問は隠す。
   *   工房も加護も見ていない人に「加護の選択とは?」と並べると、
   *   答えではなく疑問が増えるため。
   *   条件の書き方は data/dungeons.js の unlockedBy と同じ。
   */
  HelpScene.prototype._isUnlocked = function (entry) {
    // 中身を別の場所から作る質問は、中身が空なら出さない
    // （素材を1つも使っていないのに「音楽について」が並ぶのを防ぐ）
    if (entry.answerFrom && this._generatedAnswer(entry.answerFrom).length === 0) {
      return false;
    }

    if (!entry.unlockedBy) return true;
    if (!NS.DungeonCatalog) return true;

    return NS.DungeonCatalog.isConditionMet(
      entry.unlockedBy, this.game.clearedDungeons, this.game.data);
  };

  /**
   * データから組み立てる答え。
   *
   * ★ 手で書くと二重管理になるものだけをここで作る。
   *   音の出どころは data/audio.js の credits に書いてあるので、
   *   遊び方のためにもう一度書き写さない（片方だけ直す事故を防ぐ）。
   */
  HelpScene.prototype._generatedAnswer = function (kind) {
    if (kind !== "audioCredits") return [];

    var credits = (this.game.data.audio || {}).credits || [];
    var lines = [];

    for (var i = 0; i < credits.length; i++) {
      var c = credits[i];
      var line = c.name || "";
      if (c.label) line = c.label + "：" + line;
      if (c.note) line += "（" + c.note + "）";
      if (c.url) line += "  " + c.url;
      lines.push(line);
    }
    return lines;
  };

  /** 分類ごとに見出しを挟んで、質問を並べる */
  HelpScene.prototype._buildList = function () {
    var categories = this.help.categories || {};
    var entries = this.help.entries || {};

    // 分類を order 順に
    var order = [];
    for (var cid in categories) order.push(categories[cid]);
    order.sort(function (a, b) { return (a.order || 999) - (b.order || 999); });

    var rows = [];
    for (var c = 0; c < order.length; c++) {
      var category = order[c];
      var mine = [];
      for (var eid in entries) {
        if (entries[eid].category !== category.id) continue;
        if (!this._isUnlocked(entries[eid])) continue;
        mine.push(entries[eid]);
      }
      // 中身が1つも無い分類は、見出しごと出さない
      if (mine.length === 0) continue;

      mine.sort(function (a, b) { return (a.order || 999) - (b.order || 999); });
      rows.push({ type: "header", label: "- " + category.name + " -", color: category.color });

      for (var m = 0; m < mine.length; m++) {
        rows.push({ type: "entry", label: mine[m].question, value: mine[m].id });
      }
    }
    this.list.setRows(rows);
  };

  // --- 更新 ---

  HelpScene.prototype.update = function () {
    var input = this.game.input;

    if (this.backButton.handleInput(input) || input.isPressed("cancel")) {
      this.game.scenes.change(this.returnScene);
      return;
    }

    // 質問を変えたら、答えは先頭から読み直す
    if (this.list.handleInput(input)) this.answerTop = 0;

    this._scrollAnswer(input);
  };

  /** 答えの送り。Q/E とホイール（↑↓は一覧が使っている） */
  HelpScene.prototype._scrollAnswer = function (input) {
    var lines = this._answerLines();
    var visible = this.layout.answer ? (this.layout.answer.visibleLines || 14) : 14;
    var maxTop = Math.max(0, lines.length - visible);
    if (maxTop === 0) { this.answerTop = 0; return; }

    var step = 0;
    if (input.isPressed("prevTab")) step = -1;
    if (input.isPressed("nextTab")) step = 1;

    if (input.getPointer) {
      var pointer = input.getPointer();
      if (pointer.wheel && pointer.inside && this.layout.detail
          && NS.Panel.containsPoint(this.layout.detail, pointer)) {
        step = pointer.wheel > 0 ? 1 : -1;
      }
    }
    if (step === 0) return;

    this.answerTop = Math.max(0, Math.min(maxTop, this.answerTop + step));
  };

  /** いま選んでいる質問の答えを、折り返した行の配列にする */
  HelpScene.prototype._answerLines = function () {
    var selected = this.list.getSelected();
    if (!selected) return [];

    var entry = (this.help.entries || {})[selected.value];
    if (!entry) return [];

    var perLine = (this.layout.answer && this.layout.answer.charsPerLine) || 20;
    var lines = [];
    var paragraphs = entry.answerFrom
      ? this._generatedAnswer(entry.answerFrom)
      : (entry.answer || []);

    for (var p = 0; p < paragraphs.length; p++) {
      // 段落のあいだは1行空ける。続きものに見えないように
      if (p > 0) lines.push("");
      var wrapped = wrapText(paragraphs[p], perLine);
      for (var i = 0; i < wrapped.length; i++) lines.push(wrapped[i]);
    }
    return lines;
  };

  // --- 描画 ---

  HelpScene.prototype.render = function (ctx) {
    var L = this.layout;

    ctx.fillStyle = L.background || "#0a0f1c";
    ctx.fillRect(0, 0, this.game.canvas.width, this.game.canvas.height);

    var title = L.title || {};
    var subtitle = L.subtitle || {};
    this.panel.drawText(this.texts.title || "", title.x, title.y,
      { font: title.font, color: title.color });
    this.panel.drawText(this.texts.subtitle || "", subtitle.x, subtitle.y,
      { font: subtitle.font, color: subtitle.color });

    this.list.render(this.game.clock);
    this._renderAnswer();
    this._renderHint();
    this.backButton.render();
  };

  HelpScene.prototype._renderAnswer = function () {
    var rect = this.layout.detail;
    if (!rect) return;

    this.panel.drawBox(rect);

    var selected = this.list.getSelected();
    if (!selected) return;

    var entry = (this.help.entries || {})[selected.value];
    if (!entry) return;

    var t = this.theme;
    var a = this.layout.answer || {};
    var origin = this.panel.innerOrigin(rect);
    var lh = a.lineHeight || 20;
    var y = origin.y + 18;

    // 質問そのものを見出しとして出す。一覧から目を戻さなくて済むように
    var head = wrapText(entry.question, (a.charsPerLine || 20) - 2);
    for (var h = 0; h < head.length; h++) {
      this.panel.drawText(head[h], origin.x, y, { color: t.cursorColor });
      y += lh;
    }
    y += 6;

    var lines = this._answerLines();
    var visible = a.visibleLines || 14;
    var end = Math.min(lines.length, this.answerTop + visible);

    for (var i = this.answerTop; i < end; i++) {
      this.panel.drawText(lines[i], origin.x, y,
        { font: t.smallFont, color: t.subTextColor });
      y += lh;
    }

    this._renderAnswerMark(rect, lines.length, visible, t);
  };

  /** 答えに続きがあることを示す印 */
  HelpScene.prototype._renderAnswerMark = function (rect, total, visible, t) {
    if (this.answerTop > 0) {
      this.panel.drawText("▲", rect.x + rect.w - 18, rect.y + 20,
        { font: t.smallFont, color: t.hintColor });
    }
    if (this.answerTop + visible < total) {
      this.panel.drawText("▼", rect.x + rect.w - 18, rect.y + rect.h - 10,
        { font: t.smallFont, color: t.hintColor });
    }
  };

  HelpScene.prototype._renderHint = function () {
    var hint = this.layout.hint;
    if (!hint) return;

    this.panel.drawText(this.texts.hint || "", hint.x, hint.y,
      { font: this.theme.smallFont, color: this.theme.hintColor });
  };

  /**
   * 行の先頭に来てはいけない文字（句読点・閉じ括弧）。
   * この画面は読ませるための画面なので、
   * 「。」で始まる行が出ないようにしている。
   */
  var NO_LINE_START = "。、）」』】〉》”’!?！？…・:：;；";

  /**
   * 決められた文字数で折り返す。
   * 日本語は単語の切れ目が無いので、文字数で切っている。
   *
   * ★ 切れ目の次が句読点だった場合は、その1文字を前の行へ送る。
   *   そうしないと「。ただし毒で〜」のように、句点で始まる行ができる。
   */
  function wrapText(text, charsPerLine) {
    var lines = [];
    var source = String(text || "");
    var per = charsPerLine || 20;

    while (source.length > per) {
      var cut = per;
      // 次の行の頭に句読点が来るなら、1文字ぶん多く取って前の行に収める。
      // 句読点が続く場合もあるので、収まるあいだは繰り返す
      while (cut < source.length && NO_LINE_START.indexOf(source.charAt(cut)) >= 0) {
        cut++;
      }
      lines.push(source.slice(0, cut));
      source = source.slice(cut);
    }
    if (source.length > 0) lines.push(source);
    return lines;
  }

  NS.HelpScene = HelpScene;
})(window.MyGame);
