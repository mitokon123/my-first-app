/**
 * BlessingSelectScene.js
 * 拠点の「加護を選ぶ」。潜ったときに選択肢へ出る加護を決める。
 *
 * 持っている加護を一覧にして、1つずつ「入れる／外す」を切り替えるだけの画面。
 * 入れておける数には上限があり（data/run.js の blessing.activeMax）、
 * いっぱいのときは、どれかを外さないと新しいものを入れられない。
 *
 * 何を持っているか・入れているかは Game が持ち、この画面は表示と入力だけを担当する。
 * 配置は data/ui.js の blessingSelect、文言は data/messages.js の blessingSelect。
 *
 * ▼ 操作
 *   ↑↓   … 加護を選ぶ
 *   決定   … 入れる／外すを切り替える
 *   Esc    … 拠点へ戻る
 */
(function (NS) {
  "use strict";

  var NOTICE_DURATION = 1800;

  /**
   * @param {MyGame.Game} game
   * @param {object} returnScene 閉じたときに戻るシーン
   */
  function BlessingSelectScene(game, returnScene) {
    this.game = game;
    this.returnScene = returnScene;

    var ui = game.data.ui || {};
    this.theme = ui.theme || {};
    this.layout = ui.blessingSelect || {};
    this.texts = (game.data.messages || {}).blessingSelect || {};

    this.panel = new NS.Panel(game.ctx, this.theme);
    this.list = new NS.ScrollList(this.panel, this.layout.list);
    this.backButton = new NS.BackButton(this.panel, game.data);
    this.notice = new NS.Notice(this.theme.notice);

    this._rebuildList();
  }

  BlessingSelectScene.prototype.enter = function () {
    this.notice.clear();
    this._rebuildList();
  };

  // --- 一覧の組み立て ---

  /**
   * 持っている加護を並べる。
   * 入れているものには印を付け、外しているものは薄く表示する。
   */
  BlessingSelectScene.prototype._rebuildList = function () {
    var ids = this.game.getOwnedBlessingIds();
    var blessings = this.game.data.blessings || {};
    var t = this.theme;
    var rows = [];

    // 入れているものを先に並べる。今の編成がひと目で分かるように
    ids.sort(function (a, b) {
      var activeA = this.game.isBlessingActive(a) ? 0 : 1;
      var activeB = this.game.isBlessingActive(b) ? 0 : 1;
      if (activeA !== activeB) return activeA - activeB;
      return 0;
    }.bind(this));

    for (var i = 0; i < ids.length; i++) {
      var blessing = blessings[ids[i]];
      if (!blessing) continue;

      var active = this.game.isBlessingActive(ids[i]);
      rows.push({
        type: "entry",
        label: (active ? (this.texts.markOn || "◆ ") : (this.texts.markOff || "・ ")) + blessing.name,
        right: NS.BlessingSystem.getRarity(this.game.data, blessing).label,
        color: active ? t.textColor : t.hintColor,
        value: ids[i]
      });
    }

    if (rows.length === 0) {
      rows.push({ type: "header", label: this.texts.empty || "", color: t.hintColor });
    }
    this.list.setRows(rows);
  };

  /** いま選んでいる加護（無ければ null） */
  BlessingSelectScene.prototype._selected = function () {
    var row = this.list.getSelected();
    if (!row || !row.value) return null;
    return (this.game.data.blessings || {})[row.value] || null;
  };

  // --- 更新 ---

  BlessingSelectScene.prototype.update = function (dt) {
    var input = this.game.input;

    this.notice.update(dt);

    if (this.backButton.handleInput(input)) {
      this.game.scenes.change(this.returnScene);
      return;
    }

    this.list.handleInput(input);

    if (input.isPressed("cancel")) {
      this.game.scenes.change(this.returnScene);
      return;
    }
    if (input.isPressed("confirm") || this.list.clickedEntry(input)) this._toggle();
  };

  /** 入れる／外すを切り替える。いっぱいのときは理由を出すだけ */
  BlessingSelectScene.prototype._toggle = function () {
    var row = this.list.getSelected();
    if (!row || !row.value) return;

    var blessing = (this.game.data.blessings || {})[row.value];
    var result = this.game.toggleBlessing(row.value);

    if (!result.changed) {
      this._showNotice(fill(this.texts[result.reason] || result.reason,
        { max: this.game.getBlessingActiveMax() }));
      return;
    }

    this._showNotice(fill(result.active ? this.texts.turnedOn : this.texts.turnedOff,
      { name: blessing ? blessing.name : row.value }));

    // 並べ替えが入るので、選んでいた加護を追いかける
    var keep = row.value;
    this._rebuildList();
    this._focus(keep);
  };

  /** 指定の加護にカーソルを合わせる */
  BlessingSelectScene.prototype._focus = function (blessingId) {
    for (var i = 0; i < this.list.rows.length; i++) {
      if (this.list.rows[i].value === blessingId) {
        this.list.index = i;
        return;
      }
    }
  };

  BlessingSelectScene.prototype._showNotice = function (text) {
    this.notice.show(text, NOTICE_DURATION);
  };

  // --- 描画 ---

  BlessingSelectScene.prototype.render = function (ctx) {
    var w = this.game.canvas.width;
    var h = this.game.canvas.height;

    ctx.fillStyle = this.theme.background || "#0b1016";
    ctx.fillRect(0, 0, w, h);

    this._renderHeading();
    this._renderCount();
    this.list.render(this.game.clock);
    this._renderDetail();
    this._renderHint();

    this._renderNotice();
    this.backButton.render();
  };

  /** 知らせ。工房・ショップと同じ出し方にそろえてある */
  BlessingSelectScene.prototype._renderNotice = function () {
    if (!this.notice.isActive()) return;
    var pos = this.layout.notice || { x: 400, y: 526 };

    var ctx = this.game.ctx;
    ctx.save();
    ctx.globalAlpha = this.notice.getAlpha();
    this.panel.drawText(this.notice.getText(), pos.x, pos.y,
      { align: "center", color: this.theme.cursorColor });
    ctx.restore();
  };

  BlessingSelectScene.prototype._renderHeading = function () {
    var title = this.layout.title || {};
    var subtitle = this.layout.subtitle || {};

    this.panel.drawText(this.texts.title || "", title.x, title.y,
      { font: title.font, color: title.color });
    this.panel.drawText(this.texts.subtitle || "", subtitle.x, subtitle.y,
      { font: subtitle.font, color: subtitle.color });
  };

  /** 右上に「入れている数 / 上限」を出す。上限に達していたら色を変える */
  BlessingSelectScene.prototype._renderCount = function () {
    var pos = this.layout.count;
    if (!pos) return;

    var active = this.game.countActiveBlessings();
    var max = this.game.getBlessingActiveMax();
    var full = (active >= max);

    this.panel.drawText(fill(this.texts.count, { active: active, max: max }), pos.x, pos.y,
      { align: "right", font: pos.font || this.theme.font,
        color: full ? (this.theme.cursorColor || "#ffd75e") : (pos.color || this.theme.textColor) });
  };

  /** 右側：選んでいる加護の説明と、いまの状態 */
  BlessingSelectScene.prototype._renderDetail = function () {
    var rect = this.layout.detail;
    if (!rect) return;

    this.panel.drawBox(rect);

    var blessing = this._selected();
    if (!blessing) {
      this.panel.drawText(this.texts.empty || "", rect.x + (this.theme.padding || 8),
        rect.y + 30, { font: this.theme.smallFont, color: this.theme.hintColor });
      return;
    }

    var t = this.theme;
    var origin = this.panel.innerOrigin(rect);
    var lh = t.lineHeight || 18;
    var y = origin.y + 20;
    var i;

    this.panel.drawText(blessing.name, origin.x, y);
    y += lh + 4;

    // 出やすさ（data/run.js の rarityLabels）
    var rarity = NS.BlessingSystem.getRarity(this.game.data, blessing);
    this.panel.drawText((this.texts.rarityLabel || "") + " " + rarity.label, origin.x, y,
      { font: t.smallFont, color: rarity.color || t.subTextColor });
    y += lh + 6;

    var lines = wrapText(blessing.description || "", rect.charsPerLine || 18);
    for (i = 0; i < lines.length; i++) {
      this.panel.drawText(lines[i], origin.x, y, { font: t.smallFont, color: t.subTextColor });
      y += lh - 2;
    }
    y += 10;

    var row = this.list.getSelected();
    var active = row && row.value && this.game.isBlessingActive(row.value);
    this.panel.drawText(active ? (this.texts.stateOn || "") : (this.texts.stateOff || ""),
      origin.x, y,
      { font: t.smallFont, color: active ? (t.cursorColor || "#ffd75e") : t.hintColor });
  };

  BlessingSelectScene.prototype._renderHint = function () {
    var pos = this.layout.hint;
    if (!pos) return;

    this.panel.drawText(this.texts.hint || "", pos.x, pos.y,
      { font: this.theme.smallFont, color: this.theme.hintColor });
  };

  /** テンプレートの {key} を置き換える */
  function fill(template, values) {
    if (!template) return "";
    return template.replace(/\{(\w+)\}/g, function (match, key) {
      return (values[key] !== undefined) ? values[key] : match;
    });
  }

  /** 文字数で折り返す（等幅フォント前提の簡易処理） */
  function wrapText(text, charsPerLine) {
    var lines = [];
    for (var i = 0; i < text.length; i += charsPerLine) {
      lines.push(text.substr(i, charsPerLine));
    }
    return lines;
  }

  NS.BlessingSelectScene = BlessingSelectScene;
})(window.MyGame);
