/**
 * ShopScene.js
 * 拠点のショップ。左右キーで「買う」と「売る」を切り替える。
 *
 * 品揃え・値段の判断はすべて ShopSystem が行い、この画面は表示と入力だけを担当する。
 * 配置は data/ui.js の shop、文言は data/messages.js の shop で管理する。
 *
 * ▼ 操作
 *   ↑↓   … 選ぶ
 *   ←→   … 買う / 売る の切り替え
 *   決定   … 買う場合は「個数を決める → はい／いいえ」の2段階に進む
 *   Esc    … 1つ前へ戻る（一覧なら拠点へ）
 *
 * ▼ 状態（this.phase）
 *   "list"     … 品物を選ぶ
 *   "quantity" … 何個買うかを決める（合計金額をその場に出す）
 *   "confirm"  … 「買いますか?」のはい／いいえ
 */
(function (NS) {
  "use strict";

  var NOTICE_DURATION = 1800;
  var TABS = ["buy", "sell"];

  /**
   * @param {MyGame.Game} game
   * @param {object} returnScene 閉じたときに戻るシーン
   */
  function ShopScene(game, returnScene) {
    this.game = game;
    this.returnScene = returnScene;

    var ui = game.data.ui || {};
    this.theme = ui.theme || {};
    this.layout = ui.shop || {};
    this.texts = (game.data.messages || {}).shop || {};

    this.panel = new NS.Panel(game.ctx, this.theme);
    this.renderer = new NS.Renderer(game.ctx);
    this.list = new NS.ScrollList(this.panel, this.layout.list);
    this.shop = new NS.ShopSystem(game.data);

    this.confirmMenu = new NS.CommandMenu(this.panel, this.layout.confirmMenu);
    this.backButton = new NS.BackButton(this.panel, game.data);

    this.tabIndex = 0;
    this.phase = "list";
    this.order = null;       // 買おうとしている内容 { itemId, price, count, max }
    this._notice = null;
    this._noticeTimer = 0;

    this._rebuildList();
  }

  ShopScene.prototype.enter = function () {
    this.tabIndex = 0;
    this.phase = "list";
    this.order = null;
    this._notice = null;
    this._rebuildList();
  };

  ShopScene.prototype.getTab = function () { return TABS[this.tabIndex]; };

  // --- 一覧の組み立て ---

  ShopScene.prototype._rebuildList = function () {
    this.list.setRows(this.getTab() === "buy" ? this._buildBuyRows() : this._buildSellRows());
  };

  /** 店に並んでいる品物。買えないものは薄く表示する */
  ShopScene.prototype._buildBuyRows = function () {
    var stock = this.shop.getStock(this.game.clearedDungeons);
    var t = this.theme;
    var rows = [];

    for (var i = 0; i < stock.length; i++) {
      var affordable = this.game.canAfford(stock[i].price);
      rows.push({
        type: "entry",
        label: stock[i].item.name,
        right: stock[i].price + "G",
        color: affordable ? t.textColor : t.hintColor,
        value: { itemId: stock[i].item.id, price: stock[i].price }
      });
    }
    return rows;
  };

  /** 持ち物のうち、売れるもの */
  ShopScene.prototype._buildSellRows = function () {
    var slots = this.game.inventory.getSlots();
    var rows = [];

    for (var i = 0; i < slots.length; i++) {
      var item = this.game.data.getItem(slots[i].itemId);
      if (!item || !this.shop.canSell(item)) continue;

      rows.push({
        type: "entry",
        label: item.name + " x" + slots[i].count,
        right: this.shop.getSellPrice(item) + "G",
        value: { itemId: item.id, price: this.shop.getSellPrice(item) }
      });
    }
    return rows;
  };

  // --- 更新 ---

  ShopScene.prototype.update = function (dt) {
    var input = this.game.input;

    if (this._noticeTimer > 0) {
      this._noticeTimer -= dt;
      if (this._noticeTimer <= 0) this._notice = null;
    }

    // 「戻る」ボタン。個数を決めている途中なら1つ前へ戻す
    if (this.backButton.handleInput(input)) {
      this._goBack();
      return;
    }

    if (this.phase === "quantity") { this._updateQuantity(input); return; }
    if (this.phase === "confirm")  { this._updateConfirm(input); return; }

    if (input.isPressed("left")) this._changeTab(-1);
    if (input.isPressed("right")) this._changeTab(1);
    if (this._clickedTab(input)) return;

    // ScrollList が扱うのは上下移動だけ。決定・取消はここで見る
    this.list.handleInput(input);

    if (input.isPressed("cancel")) {
      this.game.scenes.change(this.returnScene);
      return;
    }
    // マウスで行を押した場合も決定と同じ扱いにする
    if (input.isPressed("confirm") || this.list.clickedEntry(input)) this._onConfirm();
  };

  // --- 個数を決める ---

  /**
   * 何個やりとりするかを決める状態に入る。
   * 買うときも売るときも同じ流れにする（誤って決定しないように）。
   * @param {string} mode "buy" / "sell"
   */
  ShopScene.prototype._beginQuantity = function (mode, choice) {
    var item = this.game.data.getItem(choice.itemId);
    var max = (mode === "buy")
      ? this.shop.getMaxBuyCount(this.game, item, choice.price)
      : this.shop.getMaxSellCount(this.game, item);

    // 1個もやりとりできないなら、理由を出して一覧のままにする
    if (max <= 0) {
      this._showNotice(this._blockedReason(mode, choice));
      return;
    }

    this.order = {
      mode: mode, itemId: choice.itemId, price: choice.price, count: 1, max: max
    };
    this.phase = "quantity";
  };

  /** 1個もやりとりできない理由 */
  ShopScene.prototype._blockedReason = function (mode, choice) {
    if (mode === "sell") return this.texts.notOwned;
    return this.game.canAfford(choice.price) ? this.texts.inventoryFull : this.texts.notEnoughGold;
  };

  ShopScene.prototype._updateQuantity = function (input) {
    var step = this.layout.quantityStep || 10;

    if (input.isPressed("up")) this._changeCount(1);
    if (input.isPressed("down")) this._changeCount(-1);
    if (input.isPressed("right")) this._changeCount(step);
    if (input.isPressed("left")) this._changeCount(-step);

    if (input.isPressed("cancel")) {
      this.phase = "list";
      this.order = null;
      return;
    }
    if (input.isPressed("confirm")) this._beginConfirm();
  };

  /** 個数を増減する（1〜買える上限に収める） */
  ShopScene.prototype._changeCount = function (delta) {
    if (!this.order) return;
    this.order.count = Math.max(1, Math.min(this.order.max, this.order.count + delta));
  };

  /** 合計金額 */
  ShopScene.prototype._orderTotal = function () {
    return this.order ? this.order.price * this.order.count : 0;
  };

  // --- はい / いいえ ---

  ShopScene.prototype._beginConfirm = function () {
    this.confirmMenu.setItems([
      { label: this.texts.yes || "はい", value: "yes" },
      { label: this.texts.no || "いいえ", value: "no" }
    ]);
    this.phase = "confirm";
  };

  ShopScene.prototype._updateConfirm = function (input) {
    var result = this.confirmMenu.handleInput(input);
    if (!result) return;

    // 取り消し・いいえ は個数の選択へ戻る
    if (result.type === "cancel" || result.value === "no") {
      this.phase = "quantity";
      return;
    }
    if (result.value !== "yes") return;

    if (this.order && this.order.mode === "sell") this._sell();
    else this._buy();
  };

  /** 1つ前へ戻る（一覧まで戻っていれば拠点へ） */
  ShopScene.prototype._goBack = function () {
    if (this.phase === "confirm") { this.phase = "quantity"; return; }
    if (this.phase === "quantity") { this.phase = "list"; this.order = null; return; }
    this.game.scenes.change(this.returnScene);
  };

  ShopScene.prototype._changeTab = function (direction) {
    this.tabIndex = (this.tabIndex + direction + TABS.length) % TABS.length;
    this._notice = null;
    this._rebuildList();
  };

  /** 上部の「買う / 売る」をマウスで押したか */
  ShopScene.prototype._clickedTab = function (input) {
    if (!input.getPointer || !input.getPointer().clicked) return false;

    var T = this.layout.tabs;
    if (!T) return false;

    var pointer = input.getPointer();
    for (var i = 0; i < TABS.length; i++) {
      var rect = { x: T.x + (T.w + T.gap) * i, y: T.y, w: T.w, h: T.h };
      if (!NS.Panel.containsPoint(rect, pointer)) continue;

      if (i !== this.tabIndex) {
        this.tabIndex = i;
        this._notice = null;
        this._rebuildList();
      }
      return true;
    }
    return false;
  };

  ShopScene.prototype._onConfirm = function () {
    var selected = this.list.getSelected();
    if (!selected) return;

    // 買うときも売るときも、個数と金額を確かめてから実行する
    this._beginQuantity(this.getTab(), selected.value);
  };

  /** 所持金・持ち物が変わったので一覧を作り直す（カーソル位置は保つ） */
  ShopScene.prototype._refreshList = function () {
    var index = this.list.index;
    this._rebuildList();
    if (index < this.list.rows.length) this.list.index = index;
  };

  ShopScene.prototype._buy = function () {
    if (!this.order) return;

    var item = this.game.data.getItem(this.order.itemId);
    var result = this.shop.buy(this.game, this.order.itemId, this.order.price, this.order.count);

    this._showNotice(result.success
      ? fill(this.texts.bought, { name: item.name, count: result.count, price: result.gold })
      : (this.texts[result.reason] || result.reason));

    this.order = null;
    this.phase = "list";
    this._refreshList();
  };

  ShopScene.prototype._sell = function () {
    if (!this.order) return;

    var item = this.game.data.getItem(this.order.itemId);
    var result = this.shop.sell(this.game, this.order.itemId, this.order.count);

    this._showNotice(result.success
      ? fill(this.texts.sold, { name: item.name, count: result.count, price: result.gold })
      : (this.texts[result.reason] || result.reason));

    this.order = null;
    this.phase = "list";
    this._refreshList();
  };

  ShopScene.prototype._showNotice = function (text) {
    this._notice = text;
    this._noticeTimer = NOTICE_DURATION;
  };

  // --- 描画 ---

  ShopScene.prototype.render = function (ctx) {
    var w = this.game.canvas.width;
    var h = this.game.canvas.height;

    this.renderer.clear(this.layout.background || "#000000", w, h);

    this._renderHeading();
    this._renderTabs();
    this._renderGold();
    this.list.render();

    // 個数を決めている間は、説明の代わりに注文の内容を出す
    if (this.phase === "list") this._renderDetail();
    else this._renderOrder();

    this._renderNotice();
    this._renderHint();
    this.backButton.render();
  };

  /**
   * 買おうとしている内容。
   * 「何を・何個・合計いくら・買うと残りいくら」までその場で分かるようにする。
   */
  ShopScene.prototype._renderOrder = function () {
    var rect = this.layout.detail;
    if (!rect || !this.order) return;

    this.panel.drawBox(rect);

    var t = this.theme;
    var origin = this.panel.innerOrigin(rect);
    var lh = t.lineHeight || 18;
    var y = origin.y + 20;

    var selling = (this.order.mode === "sell");
    var item = this.game.data.getItem(this.order.itemId);
    var total = this._orderTotal();
    // 買えば減り、売れば増える
    var rest = (this.game.gold || 0) + (selling ? total : -total);

    this.panel.drawText(item ? item.name : this.order.itemId, origin.x, y);
    y += lh + 6;

    // 個数（増減できることが分かるよう ◀▶ を添える）
    this.panel.drawText(this.texts.countLabel || "", origin.x, y,
      { font: t.smallFont, color: t.subTextColor });
    this.panel.drawText("◀ " + this.order.count + " ▶",
      rect.x + rect.w - (t.padding || 8), y,
      { align: "right", color: t.cursorColor });
    y += lh + 2;

    this.panel.drawText(fill(this.texts.maxCount, { max: this.order.max }), origin.x, y,
      { font: t.smallFont, color: t.hintColor });
    y += lh + 8;

    // 単価と合計
    this.panel.drawText(
      fill(selling ? this.texts.unitSellPrice : this.texts.unitPrice, { price: this.order.price }),
      origin.x, y, { font: t.smallFont, color: t.subTextColor });
    y += lh;

    this.panel.drawText(this.texts.totalLabel || "", origin.x, y, { font: t.smallFont });
    this.panel.drawText(total + "G", rect.x + rect.w - (t.padding || 8), y,
      { align: "right", color: t.cursorColor });
    y += lh + 2;

    this.panel.drawText(
      fill(selling ? this.texts.afterGoldSell : this.texts.afterGold, { amount: rest }),
      origin.x, y, { font: t.smallFont, color: t.subTextColor });
    y += lh + 10;

    // はい／いいえ
    if (this.phase !== "confirm") return;

    this.panel.drawText(
      fill(selling ? this.texts.confirmSell : this.texts.confirmBuy,
           { name: item ? item.name : "", count: this.order.count, price: total }),
      origin.x, y, { font: t.smallFont, color: t.textColor });

    this.confirmMenu.render();
  };

  ShopScene.prototype._renderHeading = function () {
    var title = this.layout.title || {};
    var subtitle = this.layout.subtitle || {};

    this.panel.drawText(this.texts.title || "", title.x, title.y,
      { font: title.font, color: title.color });
    this.panel.drawText(this.texts.subtitle || "", subtitle.x, subtitle.y,
      { font: subtitle.font, color: subtitle.color });
  };

  ShopScene.prototype._renderTabs = function () {
    var T = this.layout.tabs;
    if (!T) return;

    var t = this.theme;
    var labels = [this.texts.tabBuy || "", this.texts.tabSell || ""];

    for (var i = 0; i < labels.length; i++) {
      var x = T.x + (T.w + T.gap) * i;
      var selected = (i === this.tabIndex);

      this.panel.ctx.fillStyle = selected ? "rgba(74,107,168,0.35)" : "rgba(8,10,20,0.6)";
      this.panel.ctx.fillRect(x, T.y, T.w, T.h);
      this.panel.ctx.strokeStyle = selected ? (t.cursorColor || "#ffd75e")
                                            : (t.panelBorder || "#3a4266");
      this.panel.ctx.lineWidth = 1;
      this.panel.ctx.strokeRect(x + 0.5, T.y + 0.5, T.w - 1, T.h - 1);

      this.panel.drawText(labels[i], x + T.w / 2, T.y + 20,
        { align: "center", font: t.smallFont,
          color: selected ? t.cursorColor : t.subTextColor });
    }
  };

  ShopScene.prototype._renderGold = function () {
    var pos = this.layout.gold;
    if (!pos) return;

    var template = ((this.game.data.messages || {}).home || {}).gold || "{amount}G";
    this.panel.drawText(template.replace("{amount}", this.game.gold || 0), pos.x, pos.y,
      { align: "right", font: pos.font || this.theme.font,
        color: pos.color || this.theme.cursorColor });
  };

  /** 右側：選んでいる品物の説明 */
  ShopScene.prototype._renderDetail = function () {
    var rect = this.layout.detail;
    if (!rect) return;

    this.panel.drawBox(rect);

    var selected = this.list.getSelected();
    if (!selected) {
      var empty = (this.getTab() === "buy") ? this.texts.noStock : this.texts.nothingToSell;
      this.panel.drawText(empty || "", rect.x + (this.theme.padding || 8), rect.y + 30,
        { font: this.theme.smallFont, color: this.theme.hintColor });
      return;
    }

    var item = this.game.data.getItem(selected.value.itemId);
    if (!item) return;

    var t = this.theme;
    var origin = this.panel.innerOrigin(rect);
    var lh = t.lineHeight || 18;
    var y = origin.y + 20;

    this.panel.drawText(item.name, origin.x, y);
    y += lh + 4;

    var category = ((this.game.data.categories || {}).item || {})[item.category];
    if (category) {
      this.panel.drawText(category.name, origin.x, y,
        { font: t.smallFont, color: category.color });
      y += lh;
    }

    this.panel.drawText(
      fill(this.texts.owned, { count: this.game.inventory.getCount(item.id) }),
      origin.x, y, { font: t.smallFont, color: t.subTextColor });
    y += lh + 6;

    var lines = wrapText(item.description || "", rect.charsPerLine || 18);
    for (var i = 0; i < lines.length; i++) {
      this.panel.drawText(lines[i], origin.x, y, { font: t.smallFont, color: t.subTextColor });
      y += lh;
    }

    // 装備なら効果も出す
    if (!item.equip) return;

    y += 6;
    this.panel.drawText(this.texts.effectLabel || "", origin.x, y,
      { font: t.smallFont, color: t.cursorColor });
    y += lh;

    var effects = item.equip.effects || [];
    for (var k = 0; k < effects.length; k++) {
      this.panel.drawText("・" + this._describeEffect(effects[k]), origin.x, y,
        { font: t.smallFont, color: t.subTextColor });
      y += lh;
    }
  };

  /** 装備の効果1つを文章にする（組み立ては EffectSystem に任せる） */
  ShopScene.prototype._describeEffect = function (effect) {
    return NS.EffectSystem.describeEffect(effect, this.game.data);
  };

  ShopScene.prototype._renderNotice = function () {
    if (!this._notice) return;
    var pos = this.layout.notice || { x: 400, y: 530 };

    this.panel.drawText(this._notice, pos.x, pos.y,
      { align: "center", color: this.theme.cursorColor });
  };

  ShopScene.prototype._renderHint = function () {
    var pos = this.layout.hint || { x: 48, y: 570 };
    var hint;

    if (this.phase === "quantity") hint = this.texts.hintQuantity;
    else if (this.phase === "confirm") hint = this.texts.hintConfirm;
    else hint = this.texts.hint;

    this.panel.drawText(hint || "", pos.x, pos.y,
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

  NS.ShopScene = ShopScene;
})(window.MyGame);
