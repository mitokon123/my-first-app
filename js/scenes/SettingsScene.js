/**
 * SettingsScene.js
 * 設定画面。左で音量などを調整し、右で操作キーを確認する。
 *
 * ▼ 操作
 *   上下  … 項目を選ぶ
 *   左右  … 値を変える
 *   Esc/X … 保存して前の画面へ戻る
 *
 * 調整できる項目は data/settings.js、操作キーは data/keys.js、
 * 配置は data/ui.js の settings、文言は data/messages.js の settings で管理する。
 * どれもデータを足すだけで項目を増やせる。
 */
(function (NS) {
  "use strict";

  var NOTICE_DURATION = 1400; // 通知を表示しておく時間（ms）

  /**
   * @param {MyGame.Game} game
   * @param {object} returnScene 閉じたときに戻るシーン
   */
  function SettingsScene(game, returnScene) {
    this.game = game;
    this.returnScene = returnScene;

    var ui = game.data.ui || {};
    this.theme = ui.theme || {};
    this.layout = ui.settings || {};
    this.texts = (game.data.messages || {}).settings || {};
    this.keyConfig = game.data.keys || {};

    this.panel = new NS.Panel(game.ctx, this.theme);
    this.renderer = new NS.Renderer(game.ctx);
    this.backButton = new NS.BackButton(this.panel, game.data);
    this.settings = game.settings || new NS.SettingsManager(game.data);

    this.index = 0;
    this._notice = null;
    this._noticeTimer = 0;
  }

  SettingsScene.prototype.enter = function () {
    this.index = 0;
  };

  // --- 更新 ---

  SettingsScene.prototype.update = function (dt) {
    var input = this.game.input;
    var items = this.settings.items;

    if (this._noticeTimer > 0) {
      this._noticeTimer -= dt;
      if (this._noticeTimer <= 0) this._notice = null;
    }

    if (items.length > 0) {
      if (input.isPressed("up")) this.index = (this.index - 1 + items.length) % items.length;
      if (input.isPressed("down")) this.index = (this.index + 1) % items.length;

      if (input.isPressed("left")) this._changeValue(-1);
      if (input.isPressed("right")) this._changeValue(1);
    }

    if (input.isPressed("cancel") || this.backButton.handleInput(input)) this._close();
  };

  SettingsScene.prototype._changeValue = function (direction) {
    var item = this.settings.items[this.index];
    if (!item) return;
    this.settings.step(item.id, direction);
  };

  /** 設定を保存してから前の画面へ戻る */
  SettingsScene.prototype._close = function () {
    var result = this.settings.save();
    if (!result.success) {
      // 保存できなかったときは戻らず知らせる（設定が消えることに気づけるように）
      this._showNotice(this.texts.saveFailed || "");
      return;
    }
    this.game.scenes.change(this.returnScene);
  };

  SettingsScene.prototype._showNotice = function (text) {
    this._notice = text;
    this._noticeTimer = NOTICE_DURATION;
  };

  // --- 描画 ---

  SettingsScene.prototype.render = function (ctx) {
    var w = this.game.canvas.width;
    var h = this.game.canvas.height;
    var L = this.layout;

    this.renderer.clear(L.background || "#000000", w, h);

    this._renderHeading();
    this._renderItems();
    this._renderKeyList();
    this._renderNote();
    this._renderNotice(ctx);
    this._renderHint();
    this.backButton.render();
  };

  SettingsScene.prototype._renderHeading = function () {
    var title = this.layout.title || {};
    var subtitle = this.layout.subtitle || {};

    this.panel.drawText(this.texts.title || "", title.x, title.y,
      { font: title.font, color: title.color });
    this.panel.drawText(this.texts.subtitle || "", subtitle.x, subtitle.y,
      { font: subtitle.font, color: subtitle.color });
  };

  /** 左側：調整できる項目 */
  SettingsScene.prototype._renderItems = function () {
    var I = this.layout.items;
    if (!I) return;

    var t = this.theme;
    this.panel.drawBox(I);

    var origin = this.panel.innerOrigin(I);
    this.panel.drawText(this.texts.volumeTitle || "", origin.x, origin.y + 12,
      { font: t.smallFont, color: t.subTextColor });

    var top = origin.y + 34;
    for (var i = 0; i < this.settings.items.length; i++) {
      this._renderItemRow(this.settings.items[i], i, origin.x, top + I.rowHeight * i, I);
    }
  };

  SettingsScene.prototype._renderItemRow = function (item, i, x, y, I) {
    var t = this.theme;
    var selected = (i === this.index);
    var color = selected ? t.cursorColor : t.textColor;

    if (selected) this.panel.drawText("▶", x, y, { color: t.cursorColor });
    this.panel.drawText(item.label, x + 18, y, { color: color });

    // 値を横棒で表す（選択中は左右で変えられることを ◀ ▶ で示す）
    var barX = x + 130;
    var barY = y - 8;
    var ratio = valueRatio(item, this.settings.get(item.id));

    this.panel.ctx.fillStyle = t.hpBarBg || "#2a3350";
    this.panel.ctx.fillRect(barX, barY, I.barWidth, I.barHeight);
    this.panel.ctx.fillStyle = selected ? (t.cursorColor || "#ffd75e") : (t.subTextColor || "#9aa4c0");
    this.panel.ctx.fillRect(barX, barY, Math.round(I.barWidth * ratio), I.barHeight);

    this.panel.drawText(this.settings.formatValue(item.id),
      barX + I.barWidth + 12, y, { font: t.smallFont, color: color });

    if (selected) {
      this.panel.drawText("◀", barX - 14, y, { font: t.smallFont, color: t.cursorColor });
      this.panel.drawText("▶", barX + I.barWidth + 52, y, { font: t.smallFont, color: t.cursorColor });
    }
  };

  /** 右側：操作キーの一覧（data/keys.js の内容をそのまま表示する） */
  SettingsScene.prototype._renderKeyList = function () {
    var K = this.layout.keys;
    if (!K) return;

    var t = this.theme;
    this.panel.drawBox(K);

    var origin = this.panel.innerOrigin(K);
    this.panel.drawText(this.texts.keysTitle || "", origin.x, origin.y + 12,
      { font: t.smallFont, color: t.subTextColor });

    var order = this.keyConfig.order || [];
    var labels = this.keyConfig.actionLabels || {};
    var top = origin.y + 38;

    for (var i = 0; i < order.length; i++) {
      var action = order[i];
      var y = top + K.rowHeight * i;

      this.panel.drawText(labels[action] || action, origin.x, y,
        { font: t.smallFont });
      this.panel.drawText(this.game.input.getKeyLabels(action).join("  /  "),
        K.x + K.w - (t.padding || 8), y,
        { align: "right", font: t.smallFont, color: t.subTextColor });
    }
  };

  /** 音声が未実装であることの注記 */
  SettingsScene.prototype._renderNote = function () {
    var pos = this.layout.note;
    if (!pos) return;
    this.panel.drawText(this.texts.audioNote || "", pos.x, pos.y,
      { font: this.theme.smallFont, color: this.theme.hintColor });
  };

  SettingsScene.prototype._renderNotice = function (ctx) {
    if (!this._notice) return;
    var pos = this.layout.notice || { x: 400, y: 526 };

    ctx.save();
    ctx.font = "14px monospace";
    ctx.fillStyle = this.theme.cursorColor || "#ffd75e";
    ctx.textAlign = "center";
    ctx.fillText(this._notice, pos.x, pos.y);
    ctx.restore();
  };

  SettingsScene.prototype._renderHint = function () {
    var pos = this.layout.hint || { x: 48, y: 570 };
    this.panel.drawText(this.texts.hint || "", pos.x, pos.y,
      { font: this.theme.smallFont, color: this.theme.hintColor });
  };

  /** 現在値が min〜max のどのあたりかを 0〜1 で返す */
  function valueRatio(item, value) {
    var min = item.min === undefined ? 0 : item.min;
    var max = item.max === undefined ? 100 : item.max;
    if (max === min) return 0;
    return Math.max(0, Math.min(1, ((value || 0) - min) / (max - min)));
  }

  NS.SettingsScene = SettingsScene;
})(window.MyGame);
