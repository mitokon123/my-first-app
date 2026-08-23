/**
 * ItemScene.js
 * 持ち物画面。分類ごとに所持アイテムを並べ、選ぶと説明を表示する。
 * 使えるアイテムは、対象のモンスターを選んで使用できる。
 *
 * ▼ 状態（this.phase）
 *   "list"   … アイテムを選ぶ
 *   "target" … 使う相手（パーティ）を選ぶ
 *
 * 配置は data/ui.js の items、文言は data/messages.js の items で管理する。
 */
(function (NS) {
  "use strict";

  var NOTICE_DURATION = 1600;
  var USE_SCENE = "home";   // この画面で使えるアイテムの場面id（items.js の usableIn と対応）

  /**
   * @param {MyGame.Game} game
   * @param {object} returnScene 閉じたときに戻るシーン
   */
  function ItemScene(game, returnScene) {
    this.game = game;
    this.returnScene = returnScene;

    var ui = game.data.ui || {};
    this.theme = ui.theme || {};
    this.layout = ui.items || {};
    this.texts = (game.data.messages || {}).items || {};

    this.panel = new NS.Panel(game.ctx, this.theme);
    this.hpBar = new NS.HpBar(game.ctx, this.theme);
    this.renderer = new NS.Renderer(game.ctx);
    this.list = new NS.ScrollList(this.panel, this.layout.list);
    this.backButton = new NS.BackButton(this.panel, game.data);
    this.usage = new NS.ItemUsage(game.data);

    this.phase = "list";
    this.targetIndex = 0;
    this._notice = null;
    this._noticeTimer = 0;

    this._rebuildList();
  }

  ItemScene.prototype.enter = function () {
    this.phase = "list";
    this._rebuildList();
  };

  /** 持ち物から一覧の行を組み立てる（分類ごとに見出しを挟む） */
  ItemScene.prototype._rebuildList = function () {
    var inventory = this.game.inventory;
    var rows = [];

    if (inventory) {
      var groups = inventory.groupByCategory();
      for (var g = 0; g < groups.length; g++) {
        var group = groups[g];
        rows.push({ type: "header", label: "- " + group.category.name + " -",
                    color: group.category.color });

        for (var s = 0; s < group.slots.length; s++) {
          var slot = group.slots[s];
          var item = this.game.data.getItem(slot.itemId);
          rows.push({
            type: "entry",
            label: item ? item.name : slot.itemId,
            right: "x" + slot.count,
            value: slot.itemId
          });
        }
      }
    }
    this.list.setRows(rows);
  };

  // --- 更新 ---

  ItemScene.prototype.update = function (dt) {
    if (this._noticeTimer > 0) {
      this._noticeTimer -= dt;
      if (this._noticeTimer <= 0) this._notice = null;
    }

    if (this.phase === "target") this._updateTarget();
    else this._updateList();
  };

  ItemScene.prototype._updateList = function () {
    var input = this.game.input;
    if (this.backButton.handleInput(input)) {
      this.game.scenes.change(this.returnScene);
      return;
    }

    this.list.handleInput(input);

    if (input.isPressed("cancel")) {
      this.game.scenes.change(this.returnScene);
      return;
    }
    // マウスで行を押した場合も決定と同じ扱いにする
    if (input.isPressed("confirm") || this.list.clickedEntry(input)) this._beginUse();
  };

  /** 使えるアイテムなら対象選択へ進む */
  ItemScene.prototype._beginUse = function () {
    var selected = this.list.getSelected();
    if (!selected) return;

    if (!this.usage.isUsableIn(selected.value, USE_SCENE)) {
      this._showNotice(this.texts.cannotUse || "");
      return;
    }
    this.targetIndex = 0;
    this.phase = "target";
  };

  ItemScene.prototype._updateTarget = function () {
    var input = this.game.input;
    var party = this.game.party;
    var size = party ? party.size() : 0;

    if (size > 0) {
      if (input.isPressed("up")) this.targetIndex = (this.targetIndex - 1 + size) % size;
      if (input.isPressed("down")) this.targetIndex = (this.targetIndex + 1) % size;
    }

    if (input.isPressed("cancel")) {
      this.phase = "list";
      return;
    }
    if (input.isPressed("confirm")) this._useOnTarget();
  };

  ItemScene.prototype._useOnTarget = function () {
    var selected = this.list.getSelected();
    var target = this.game.party.get(this.targetIndex);
    if (!selected || !target) return;

    var result = this.usage.use(selected.value, target, this.game.inventory);

    if (result.success) {
      var template = this.texts.used || "";
      this._showNotice(template
        .replace("{name}", target.getName())
        .replace("{amount}", result.amount));
    } else if (result.reason === "noEffect") {
      this._showNotice(this.texts.noEffect || "");
    } else {
      this._showNotice(this.texts.cannotUse || "");
    }

    // 使って個数が変わるので一覧を作り直す
    this._rebuildList();
    this.phase = "list";
  };

  ItemScene.prototype._showNotice = function (text) {
    this._notice = text;
    this._noticeTimer = NOTICE_DURATION;
  };

  // --- 描画 ---

  ItemScene.prototype.render = function (ctx) {
    var w = this.game.canvas.width;
    var h = this.game.canvas.height;

    this.renderer.clear(this.layout.background || "#000000", w, h);
    this._renderHeading();

    if (this.list.hasEntries()) {
      this.list.render();
    } else {
      this.panel.drawBox(this.layout.list);
      var origin = this.panel.innerOrigin(this.layout.list);
      this.panel.drawText(this.texts.empty || "", origin.x, origin.y + 24);
    }

    if (this.phase === "target") this._renderTargets();
    else this._renderDetail();

    this._renderNotice(ctx);
    this._renderHint();
    this.backButton.render();
  };

  ItemScene.prototype._renderHeading = function () {
    var L = this.layout;
    var title = L.title || {};
    var subtitle = L.subtitle || {};
    var inventory = this.game.inventory;

    this.panel.drawText(this.texts.title || "", title.x, title.y,
      { font: title.font, color: title.color });

    // 使用中の枠数を副題の代わりに出す
    var text = this.texts.subtitle || "";
    if (inventory && this.texts.slotsLabel) {
      text = this.texts.slotsLabel
        .replace("{used}", inventory.slotCount())
        .replace("{max}", inventory.maxSlots);
    }
    this.panel.drawText(text, subtitle.x, subtitle.y,
      { font: subtitle.font, color: subtitle.color });
  };

  /** 右側：選択中アイテムの説明 */
  ItemScene.prototype._renderDetail = function () {
    var rect = this.layout.detail;
    if (!rect) return;

    var t = this.theme;
    this.panel.drawBox(rect);

    var selected = this.list.getSelected();
    if (!selected) return;

    var item = this.game.data.getItem(selected.value);
    if (!item) return;

    var origin = this.panel.innerOrigin(rect);
    var lh = t.lineHeight || 18;
    var y = origin.y + 16;

    this.panel.drawText(item.name, origin.x, y);
    y += lh;

    var category = ((this.game.data.categories || {}).item || {})[item.category];
    if (category) {
      this.panel.drawText(category.name, origin.x, y,
        { font: t.smallFont, color: category.color });
      y += lh;
    }

    this.panel.drawText(
      (this.texts.countLabel || "") + " " + this.game.inventory.getCount(item.id),
      origin.x, y, { font: t.smallFont, color: t.subTextColor });
    y += lh + 6;

    // 説明文は枠の幅に合わせて折り返す
    var lines = wrapText(item.description || "", 16);
    for (var i = 0; i < lines.length; i++) {
      this.panel.drawText(lines[i], origin.x, y,
        { font: t.smallFont, color: t.subTextColor });
      y += lh;
    }
  };

  /** 使う相手（パーティ）の選択 */
  ItemScene.prototype._renderTargets = function () {
    var rect = this.layout.detail;
    if (!rect) return;

    var t = this.theme;
    this.panel.drawBox(rect);

    var origin = this.panel.innerOrigin(rect);
    this.panel.drawText(this.texts.selectTarget || "", origin.x, origin.y + 16,
      { color: t.cursorColor });

    var party = this.game.party;
    if (!party) return;

    var rowHeight = 54;
    var top = origin.y + 44;

    for (var i = 0; i < party.size(); i++) {
      var monster = party.get(i);
      var y = top + rowHeight * i;
      var selected = (i === this.targetIndex);

      if (selected) this.panel.drawText("▶", origin.x, y, { color: t.cursorColor });
      this.panel.drawText(monster.getName() + " Lv" + monster.level, origin.x + 18, y,
        { color: selected ? t.cursorColor : t.textColor, font: t.smallFont });

      this.hpBar.draw(origin.x + 18, y + 8, 160, 8, monster.currentHp, monster.getMaxHp());
      this.panel.drawText(monster.currentHp + "/" + monster.getMaxHp(),
        origin.x + 18, y + 30, { font: t.smallFont, color: t.subTextColor });
    }
  };

  ItemScene.prototype._renderNotice = function (ctx) {
    if (!this._notice) return;
    var pos = this.layout.notice || { x: 400, y: 526 };

    ctx.save();
    ctx.font = "14px monospace";
    ctx.fillStyle = this.theme.cursorColor || "#ffd75e";
    ctx.textAlign = "center";
    ctx.fillText(this._notice, pos.x, pos.y);
    ctx.restore();
  };

  ItemScene.prototype._renderHint = function () {
    var pos = this.layout.hint || { x: 48, y: 570 };
    var text = (this.phase === "target") ? this.texts.hintTarget : this.texts.hintList;
    this.panel.drawText(text || "", pos.x, pos.y,
      { font: this.theme.smallFont, color: this.theme.hintColor });
  };

  /** 文字数で折り返す（等幅フォント前提の簡易処理） */
  function wrapText(text, charsPerLine) {
    var lines = [];
    for (var i = 0; i < text.length; i += charsPerLine) {
      lines.push(text.substr(i, charsPerLine));
    }
    return lines;
  }

  NS.ItemScene = ItemScene;
})(window.MyGame);
