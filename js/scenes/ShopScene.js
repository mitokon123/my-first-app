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
    this.sprites = new NS.SpriteRenderer(game.ctx, game.assets);
    this.list = new NS.ScrollList(this.panel, this.layout.list);
    this.shop = new NS.ShopSystem(game.data);

    this.confirmMenu = new NS.CommandMenu(this.panel, this.layout.confirmMenu);
    this.backButton = new NS.BackButton(this.panel, game.data);

    this.shops = this.shop.getShops(game.clearedDungeons);
    this.shopIndex = 0;
    this.tabIndex = 0;
    this.phase = "list";
    this.order = null;       // 買おうとしている内容 { itemId, price, count, max }
    this.notice = new NS.Notice(this.theme.notice);

    this._rebuildList();
  }

  ShopScene.prototype.enter = function () {
    // クリア状況が変わっていると開く店が増えるので、開くたびに数え直す
    this.shops = this.shop.getShops(this.game.clearedDungeons);
    if (this.shopIndex >= this.shops.length) this.shopIndex = 0;

    this.tabIndex = 0;
    this.phase = "list";
    this.order = null;
    this.notice.clear();
    this._rebuildList();
  };

  ShopScene.prototype.getTab = function () { return TABS[this.tabIndex]; };

  /** いま見ている店（1軒も開いていなければ null） */
  ShopScene.prototype.getShop = function () {
    return this.shops[this.shopIndex] || null;
  };

  // --- 一覧の組み立て ---

  /** 加護を売る店を見ているか（data/shop.js の type: "blessing"） */
  ShopScene.prototype._isBlessingShop = function () {
    var shop = this.getShop();
    return !!(shop && shop.type === "blessing");
  };

  ShopScene.prototype._rebuildList = function () {
    // 加護は売れないので、この店では常に「買う」一覧を出す
    if (this._isBlessingShop()) {
      this.list.setRows(this._buildBlessingRows());
      return;
    }
    this.list.setRows(this.getTab() === "buy" ? this._buildBuyRows() : this._buildSellRows());
  };

  /**
   * 謎の商人に並ぶ加護。
   * 買ったものは値段のかわりに「持っている」と出し、選べないようにする。
   */
  ShopScene.prototype._buildBlessingRows = function () {
    var blessings = this.game.data.blessings || {};
    var t = this.theme;
    var rows = [];

    for (var id in blessings) {
      if (!Object.prototype.hasOwnProperty.call(blessings, id)) continue;

      var blessing = blessings[id];
      if (!blessing.locked) continue;   // 最初から使えるものは売らない

      var owned = this.game.hasBoughtBlessing(id);
      var affordable = this.game.canAfford(blessing.price || 0);

      rows.push({
        type: "entry",
        label: blessing.name,
        right: owned ? (this.texts.owned || "所持") : (blessing.price + "G"),
        color: owned ? t.hintColor : (affordable ? t.textColor : t.hintColor),
        value: owned ? null : { blessingId: id, price: blessing.price || 0 }
      });
    }

    if (rows.length === 0) {
      rows.push({ type: "header", label: this.texts.noBlessings || "売り物がない", color: t.hintColor });
    }
    return rows;
  };

  /** 店に並んでいる品物。買えないものは薄く表示する */
  ShopScene.prototype._buildBuyRows = function () {
    var stock = this.shop.getStock(this.game.clearedDungeons, this.getShop());
    var t = this.theme;
    var rows = [];
    var lastCategory = null;

    for (var i = 0; i < stock.length; i++) {
      var item = stock[i].item;

      // 分類が変わったら見出しを挟む（持ち物の画面と同じ見せ方にそろえる）
      var category = this.shop.getCategory(item);
      if (category !== lastCategory) {
        rows.push(this._categoryHeader(category));
        lastCategory = category;
      }

      var affordable = this.game.canAfford(stock[i].price);
      rows.push({
        type: "entry",
        label: item.name,
        right: stock[i].price + "G",
        color: affordable ? t.textColor : t.hintColor,
        value: { itemId: item.id, price: stock[i].price }
      });
    }
    return rows;
  };

  /** 分類の見出し。持ち物・図鑑と同じ形にそろえる */
  ShopScene.prototype._categoryHeader = function (category) {
    return {
      type: "header",
      label: "- " + ((category && category.name) || "その他") + " -",
      color: (category && category.color) || this.theme.subTextColor
    };
  };

  /**
   * 持ち物のうち、売れるもの。
   * 買う側と同じく分類ごとに並べる（持ち物の画面と行き来しても迷わないように）。
   */
  ShopScene.prototype._buildSellRows = function () {
    var inventory = this.game.inventory;
    var rows = [];
    if (!inventory) return rows;

    var groups = inventory.groupByCategory();

    for (var g = 0; g < groups.length; g++) {
      var group = groups[g];
      var entries = [];

      for (var s = 0; s < group.slots.length; s++) {
        var slot = group.slots[s];
        var item = this.game.data.getItem(slot.itemId);
        if (!item || !this.shop.canSell(item)) continue;

        var price = this.shop.getSellPrice(item);
        entries.push({
          type: "entry",
          label: item.name + " x" + slot.count,
          right: price + "G",
          value: { itemId: item.id, price: price }
        });
      }

      // 売れるものが1つも無い分類は、見出しごと出さない
      if (entries.length === 0) continue;

      rows.push(this._categoryHeader(group.category));
      for (var e = 0; e < entries.length; e++) rows.push(entries[e]);
    }
    return rows;
  };

  // --- 更新 ---

  ShopScene.prototype.update = function (dt) {
    var input = this.game.input;

    this.notice.update(dt);

    // 「戻る」ボタン。個数を決めている途中なら1つ前へ戻す
    if (this.backButton.handleInput(input)) {
      this._goBack();
      return;
    }

    if (this.phase === "quantity") { this._updateQuantity(input); return; }
    if (this.phase === "confirm")  { this._updateConfirm(input); return; }

    // 上下段のタブ。左右で「買う／売る」、上のタブは店の切り替え
    if (input.isPressed("left")) this._changeTab(-1);
    if (input.isPressed("right")) this._changeTab(1);
    if (input.isPressed("prevTab")) this._changeShop(-1);
    if (input.isPressed("nextTab")) this._changeShop(1);
    if (this._clickedShopTab(input)) return;
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

  /** いま買おう（売ろう）としているものの名前。加護と品物の両方に対応する */
  ShopScene.prototype._orderName = function () {
    if (!this.order) return "";

    if (this.order.mode === "blessing") {
      var blessing = (this.game.data.blessings || {})[this.order.blessingId];
      return (blessing && blessing.name) || this.order.blessingId;
    }
    var item = this.game.data.getItem(this.order.itemId);
    return (item && item.name) || this.order.itemId;
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

    if (this.order && this.order.mode === "blessing") this._buyBlessing();
    else if (this.order && this.order.mode === "sell") this._sell();
    else this._buy();
  };

  /** 加護を買う。恒久的に残るので、持ち物ではなく Game に記録される */
  ShopScene.prototype._buyBlessing = function () {
    if (!this.order) return;

    var blessing = (this.game.data.blessings || {})[this.order.blessingId];
    var result = this.game.buyBlessing(this.order.blessingId);

    if (result.success) {
      // 上限（data/run.js の activeMax）でいっぱいなら、買っても選択肢には入らない。
      // 拠点で入れ替えてもらう必要があるので、そこまで伝える
      var text = fill(this.texts.blessingBought, { name: blessing.name, price: this.order.price });
      if (!this.game.isBlessingActive(this.order.blessingId)) {
        text += this.texts.blessingFull || "";
      }
      this._showNotice(text);
    } else {
      this._showNotice(this.texts[result.reason] || result.reason);
    }

    this.order = null;
    this.phase = "list";
    this._refreshList();
  };

  /** 1つ前へ戻る（一覧まで戻っていれば拠点へ） */
  ShopScene.prototype._goBack = function () {
    if (this.phase === "confirm") { this.phase = "quantity"; return; }
    if (this.phase === "quantity") { this.phase = "list"; this.order = null; return; }
    this.game.scenes.change(this.returnScene);
  };

  ShopScene.prototype._changeTab = function (direction) {
    // 加護は売れないので、この店では「買う／売る」を切り替えさせない
    if (this._isBlessingShop()) return;

    this.tabIndex = (this.tabIndex + direction + TABS.length) % TABS.length;
    this.notice.clear();
    this._rebuildList();
  };

  /** 店を切り替える。売る一覧は店に関係ないので、買う側に戻す */
  ShopScene.prototype._changeShop = function (direction) {
    var count = this.shops.length;
    if (count <= 1) return;

    this.shopIndex = (this.shopIndex + direction + count) % count;
    this.tabIndex = 0;
    this.notice.clear();
    this._rebuildList();
  };

  /** 上段の店タブをマウスで押したか */
  ShopScene.prototype._clickedShopTab = function (input) {
    if (!input.getPointer || !input.getPointer().clicked) return false;

    var T = this.layout.shopTabs;
    if (!T) return false;

    var pointer = input.getPointer();
    for (var i = 0; i < this.shops.length; i++) {
      var rect = { x: T.x + (T.w + T.gap) * i, y: T.y, w: T.w, h: T.h };
      if (!NS.Panel.containsPoint(rect, pointer)) continue;

      if (i !== this.shopIndex) {
        this.shopIndex = i;
        this.tabIndex = 0;
        this.notice.clear();
        this._rebuildList();
      }
      return true;
    }
    return false;
  };

  /** 上部の「買う / 売る」をマウスで押したか */
  ShopScene.prototype._clickedTab = function (input) {
    if (this._isBlessingShop()) return false;   // 加護の店には「売る」が無い
    if (!input.getPointer || !input.getPointer().clicked) return false;

    var T = this.layout.tabs;
    if (!T) return false;

    var pointer = input.getPointer();
    for (var i = 0; i < TABS.length; i++) {
      var rect = { x: T.x + (T.w + T.gap) * i, y: T.y, w: T.w, h: T.h };
      if (!NS.Panel.containsPoint(rect, pointer)) continue;

      if (i !== this.tabIndex) {
        this.tabIndex = i;
        this.notice.clear();
        this._rebuildList();
      }
      return true;
    }
    return false;
  };

  ShopScene.prototype._onConfirm = function () {
    var selected = this.list.getSelected();
    if (!selected) return;

    // 加護は1つずつしか買えないので、個数を決める段は飛ばして確認へ進む
    if (selected.value && selected.value.blessingId) {
      this.order = {
        mode: "blessing", blessingId: selected.value.blessingId,
        price: selected.value.price, count: 1, max: 1
      };
      this._beginConfirm();
      return;
    }
    if (this._isBlessingShop()) return;   // 「所持」の行など、選べないもの

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
    this.notice.show(text, NOTICE_DURATION);
  };

  // --- 描画 ---

  ShopScene.prototype.render = function (ctx) {
    var w = this.game.canvas.width;
    var h = this.game.canvas.height;

    this.renderer.clear(this.layout.background || "#000000", w, h);

    this._renderHeading();
    this._renderShopTabs();
    this._renderTabs();
    this._renderKeeper();
    this._renderGold();
    this.list.render(this.game.clock);

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
    var buyingBlessing = (this.order.mode === "blessing");
    var name = this._orderName();
    var total = this._orderTotal();
    // 買えば減り、売れば増える
    var rest = (this.game.gold || 0) + (selling ? total : -total);

    this.panel.drawText(name, origin.x, y);
    y += lh + 6;

    // 加護は1つずつしか買えないので、個数の行は出さずに説明を出す
    if (buyingBlessing) {
      var blessing = (this.game.data.blessings || {})[this.order.blessingId];
      if (blessing) {
        // 枠に収まる文字数で折り返す（他の画面と同じやり方）
        var lines = wrapText(blessing.description || "",
          (this.layout.detail && this.layout.detail.charsPerLine) || 18);
        for (var i = 0; i < lines.length; i++) {
          this.panel.drawText(lines[i], origin.x, y, { font: t.smallFont, color: t.subTextColor });
          y += lh - 2;
        }
        y += 8;
      }
    } else {
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
    }

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
      buyingBlessing
        ? fill(this.texts.confirmBlessing, { name: name, price: total })
        : fill(selling ? this.texts.confirmSell : this.texts.confirmBuy,
               { name: name, count: this.order.count, price: total }),
      origin.x, y, { font: t.smallFont, color: t.textColor });

    this.confirmMenu.render(this.game.clock);
  };

  ShopScene.prototype._renderHeading = function () {
    var title = this.layout.title || {};
    var subtitle = this.layout.subtitle || {};
    var shop = this.getShop();

    this.panel.drawText(this.texts.title || "", title.x, title.y,
      { font: title.font, color: title.color });

    // 見出しの下は、いま見ている店の一言にする
    var line = (shop && shop.subtitle) || this.texts.subtitle || "";
    this.panel.drawText(line, subtitle.x, subtitle.y,
      { font: subtitle.font, color: subtitle.color });
  };

  /**
   * 上段の店タブ。開いている店だけが並ぶ。
   * 1軒しか開いていなくても出す（どの店にいるかが分かるように）。
   */
  ShopScene.prototype._renderShopTabs = function () {
    var T = this.layout.shopTabs;
    if (!T || this.shops.length === 0) return;

    for (var i = 0; i < this.shops.length; i++) {
      this._drawTab(T, i, this.shops[i].name || "", i === this.shopIndex);
    }
  };

  ShopScene.prototype._renderTabs = function () {
    var T = this.layout.tabs;
    if (!T) return;

    var labels = [this.texts.tabBuy || "", this.texts.tabSell || ""];
    for (var i = 0; i < labels.length; i++) {
      this._drawTab(T, i, labels[i], i === this.tabIndex);
    }
  };

  /** タブ1つ分。上段（店）と下段（買う／売る）で見た目をそろえる */
  ShopScene.prototype._drawTab = function (T, index, label, selected) {
    var t = this.theme;
    var ctx = this.panel.ctx;
    var x = T.x + (T.w + T.gap) * index;

    ctx.fillStyle = selected ? "rgba(74,107,168,0.35)" : "rgba(8,10,20,0.6)";
    ctx.fillRect(x, T.y, T.w, T.h);
    ctx.strokeStyle = selected ? (t.cursorColor || "#ffd75e") : (t.panelBorder || "#3a4266");
    ctx.lineWidth = 1;
    ctx.strokeRect(x + 0.5, T.y + 0.5, T.w - 1, T.h - 1);

    this.panel.drawText(label, x + T.w / 2, T.y + Math.round(T.h / 2) + 4,
      { align: "center", font: t.smallFont,
        color: selected ? t.cursorColor : t.subTextColor });
  };

  /** 店主。店ごとに違う相手が立っている */
  ShopScene.prototype._renderKeeper = function () {
    var pos = this.layout.keeper;
    var shop = this.getShop();
    if (!pos || !shop || !shop.keeper) return;

    var size = pos.size || 64;
    this.sprites.drawMotion(shop.keeper, pos.x, pos.y, size, size,
      NS.Motion.of(this.game.data, shop.keeperMotion, this.game.clock, 0));
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
    if (!this.notice.isActive()) return;
    var pos = this.layout.notice || { x: 400, y: 530 };

    var ctx = this.game.ctx;
    ctx.save();
    ctx.globalAlpha = this.notice.getAlpha();
    this.panel.drawText(this.notice.getText(), pos.x, pos.y,
      { align: "center", color: this.theme.cursorColor });
    ctx.restore();
  };

  ShopScene.prototype._renderHint = function () {
    var pos = this.layout.hint || { x: 48, y: 570 };
    var hint;

    if (this.phase === "quantity") hint = this.texts.hintQuantity;
    else if (this.phase === "confirm") hint = this.texts.hintConfirm;
    // 店が1軒しか開いていないときに「店を変える」と書いても混乱するだけ
    else if (this.shops.length > 1) hint = this.texts.hintShops || this.texts.hint;
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
