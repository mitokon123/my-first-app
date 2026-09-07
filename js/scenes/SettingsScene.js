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
    // 操作キーの一覧は行数が多いので、送った位置を覚えておく
    this.keyScroll = 0;
    this.notice = new NS.Notice(this.theme.notice);
  }

  SettingsScene.prototype.enter = function () {
    this.index = 0;
  };

  // --- 更新 ---

  SettingsScene.prototype.update = function (dt) {
    var input = this.game.input;
    var items = this.settings.items;

    this.notice.update(dt);

    if (items.length > 0) {
      if (input.isPressed("up")) this.index = (this.index - 1 + items.length) % items.length;
      if (input.isPressed("down")) this.index = (this.index + 1) % items.length;

      if (input.isPressed("left")) this._changeValue(-1);
      if (input.isPressed("right")) this._changeValue(1);
    }

    this._updateKeyScroll(input);

    if (input.isPressed("cancel") || this.backButton.handleInput(input)) this._close();
  };

  /**
   * 操作キーの一覧を送る。
   * 上下は設定の項目を選ぶのに使っているので、
   * ホイールと Q/E（左右のタブ送り）で動かす。
   */
  SettingsScene.prototype._updateKeyScroll = function (input) {
    var max = this._maxKeyScroll();
    if (max <= 0) {
      this.keyScroll = 0;
      return;
    }

    if (input.isPressed("prevTab")) this.keyScroll--;
    if (input.isPressed("nextTab")) this.keyScroll++;
    this.keyScroll += this._keyWheel(input);

    // 端で止める（回り込むと、どこまで見たか分からなくなる）
    this.keyScroll = Math.max(0, Math.min(max, this.keyScroll));
  };

  /** 一覧の枠の上でホイールを回した量（行数） */
  SettingsScene.prototype._keyWheel = function (input) {
    var K = this.layout.keys;
    if (!K || !input.getPointer) return 0;

    var pointer = input.getPointer();
    if (!pointer.wheel || !pointer.inside) return 0;
    if (!NS.Panel.containsPoint(K, pointer)) return 0;

    return pointer.wheel;
  };

  /** どこまで送れるか（0 なら全部入りきっている） */
  SettingsScene.prototype._maxKeyScroll = function () {
    var K = this.layout.keys || {};
    var total = (this.keyConfig.order || []).length;
    return Math.max(0, total - (K.visibleRows || total));
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
    this.notice.show(text, NOTICE_DURATION);
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
  /**
   * 項目の枠。
   *
   * 高さは**項目数から決める**。data/ui.js に書いた h は「最低の高さ」として扱う。
   * こうしないと、設定を1つ増やしただけで最後の項目が枠からはみ出す
   * （実際に「エフェクトの濃さ」を足したときに、効果音量がはみ出した）。
   */
  SettingsScene.prototype._itemsRect = function () {
    var I = this.layout.items;
    var padding = (this.theme.padding || 8);
    var count = (this.settings.items || []).length;
    // 見出し（volumeTitle）のぶん 34px と、下の余白を足す
    var needed = padding + 34 + I.rowHeight * count;

    return { x: I.x, y: I.y, w: I.w, h: Math.max(I.h || 0, needed) };
  };

  SettingsScene.prototype._renderItems = function () {
    var I = this.layout.items;
    if (!I) return;

    var t = this.theme;
    var box = this._itemsRect();
    this.panel.drawBox(box);

    var origin = this.panel.innerOrigin(box);
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
    var visible = K.visibleRows || order.length;
    var start = this.keyScroll;
    var end = Math.min(order.length, start + visible);

    for (var i = start; i < end; i++) {
      var action = order[i];
      var y = top + K.rowHeight * (i - start);

      this.panel.drawText(labels[action] || action, origin.x, y,
        { font: t.smallFont });
      this.panel.drawText(this.game.input.getKeyLabels(action).join("  /  "),
        K.x + K.w - (t.padding || 8), y,
        { align: "right", font: t.smallFont, color: t.subTextColor });
    }

    this._renderKeyScrollMarks(K, t, order.length, end);
  };

  /** 上下に続きがあることを示す印（一覧と同じ見せ方にそろえる） */
  SettingsScene.prototype._renderKeyScrollMarks = function (K, t, total, end) {
    if (this.keyScroll > 0) {
      this.panel.drawText("▲", K.x + K.w - 18, K.y + 20,
        { font: t.smallFont, color: t.hintColor });
    }
    if (end < total) {
      this.panel.drawText("▼", K.x + K.w - 18, K.y + K.h - 10,
        { font: t.smallFont, color: t.hintColor });
    }
  };

  /** 音声が未実装であることの注記 */
  /**
   * ただし書き。項目の枠が伸びたぶんだけ下へずらす
   * （data/ui.js の note.y は「最低でもこの位置」という意味になる）。
   */
  SettingsScene.prototype._renderNote = function () {
    var pos = this.layout.note;
    if (!pos) return;

    var box = this._itemsRect();
    var y = Math.max(pos.y, box.y + box.h + (this.layout.noteGap || 22));

    this.panel.drawText(this.texts.audioNote || "", pos.x, y,
      { font: this.theme.smallFont, color: this.theme.hintColor });
  };

  SettingsScene.prototype._renderNotice = function (ctx) {
    if (!this.notice.isActive()) return;
    var pos = this.layout.notice || { x: 400, y: 526 };

    ctx.save();
    ctx.globalAlpha = this.notice.getAlpha();
    ctx.font = "14px monospace";
    ctx.fillStyle = this.theme.cursorColor || "#ffd75e";
    ctx.textAlign = "center";
    ctx.fillText(this.notice.getText(), pos.x, pos.y);
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
