/**
 * PartyScene.js
 * パーティ編成画面。手持ちの一覧表示と並び替えを行う。
 * 先頭に近い個体から戦闘に出るため、並び順の変更がそのまま編成になる。
 *
 * 拠点の「預かり所」との出し入れもここで行う（左右キーで表を切り替える）。
 *
 * ▼ 操作
 *   上下   … カーソル移動
 *   左右   … 連れていく仲間 / 預かり所 の切り替え
 *   決定   … その仲間に対して何をするかを選ぶ（下記）
 *   Esc/X  … 1つ前へ戻る、または画面を閉じる
 *
 * ▼ 決定を押すと出る項目
 *   連れていく側 … 預ける / 並び替え / 装備 / やめる
 *   預かり所側   … パーティに加える / 装備 / やめる
 *
 * 「選んで、その相手に何をするか決める」という一方向の流れにしてある。
 * （以前は2体を選んで入れ替える方式だったが、何が起きるか分かりにくかった）
 *
 * 配置・配色は data/ui.js の party、文言は data/messages.js の party で管理する。
 */
(function (NS) {
  "use strict";

  /**
   * @param {MyGame.Game} game
   * @param {object} returnScene 閉じたときに戻るシーン
   * @param {object} [options] { allowStorage } … false にすると預かり所を出さない
   *   探索中は拠点の預かり所へ手が届かないので、DungeonScene から false で開く
   */
  function PartyScene(game, returnScene, options) {
    this.game = game;
    this.returnScene = returnScene;

    var ui = game.data.ui || {};
    this.theme = ui.theme || {};
    this.layout = ui.party || {};
    this.texts = (game.data.messages || {}).party || {};

    this.panel = new NS.Panel(game.ctx, this.theme);
    this.hpBar = new NS.HpBar(game.ctx, this.theme);
    this.sprites = new NS.SpriteRenderer(game.ctx, game.assets);
    this.renderer = new NS.Renderer(game.ctx);

    // 預かり所は拠点にしか無い。探索中は連れている仲間の並び替えだけを行う
    this.allowStorage = !(options && options.allowStorage === false);

    this.index = 0;         // カーソル位置
    this.tab = "party";     // "party" | "storage"
    // "list"（一覧）/ "action"（何をするか）/ "reorder"（並び替え先）/ "equip"（装備を選ぶ）
    this.mode = "list";
    this.reorderFrom = -1;  // 並び替えの移動元

    this.equipList = new NS.ScrollList(this.panel, this.layout.equipList || this.layout.detail);
    this.actionMenu = new NS.CommandMenu(this.panel, this.layout.actionMenu);
    this.backButton = new NS.BackButton(this.panel, game.data);
    // 名前をつける文字盤（Canvas では日本語入力が使えないため）
    this.nameInput = new NS.NameInput(this.panel, game.data);
    this._notice = null;
  }

  PartyScene.prototype.enter = function () {
    this.index = 0;
    this.tab = "party";
    this.mode = "list";
    this.reorderFrom = -1;
    this._notice = null;
  };

  /** いま見ている側の一覧 */
  PartyScene.prototype._currentList = function () {
    return this._listOf(this.tab);
  };

  PartyScene.prototype._listOf = function (tab) {
    return (tab === "storage") ? this.game.storage : this.game.party;
  };

  /** カーソルが指している個体 */
  PartyScene.prototype._selected = function () {
    var list = this._currentList();
    return list ? list.get(this.index) : null;
  };

  // --- 更新 ---

  PartyScene.prototype.update = function () {
    var input = this.game.input;

    // 名前をつけている間は、他の操作を受け付けない（文字盤に集中させる）
    if (this.mode === "naming") { this._updateNamingMode(input); return; }

    // 「戻る」ボタン。何かを選んでいる途中なら一覧へ戻す
    if (this.backButton.handleInput(input)) {
      if (this.mode === "list") this.game.scenes.change(this.returnScene);
      else { this.mode = "list"; this.reorderFrom = -1; }
      return;
    }

    if (this.mode === "equip")   { this._updateEquipMode(input); return; }
    if (this.mode === "action")  { this._updateActionMode(input); return; }
    if (this.mode === "reorder") { this._updateReorderMode(input); return; }
    if (this.mode === "inspect") { this._updateInspectMode(input); return; }

    this._moveCursor(input);

    // 左右で 連れていく仲間 / 預かり所 を切り替える（預かり所が使えるときだけ）
    if (this.allowStorage) {
      if (input.isPressed("left") || input.isPressed("right")) this._switchTab();
      if (this._clickedTab(input)) return;
    }

    // E は装備への近道（一覧の項目からも選べる）
    if (input.isPressed("equip")) this._beginEquip();

    if (input.isPressed("confirm") || this._clickedRow(input)) this._beginAction();
    if (input.isPressed("cancel") || input.isPressed("party")) {
      this.game.scenes.change(this.returnScene);
    }
  };

  PartyScene.prototype._moveCursor = function (input) {
    var size = this._currentList().size();
    if (size <= 0) return;

    if (input.isPressed("up")) this.index = (this.index - 1 + size) % size;
    if (input.isPressed("down")) this.index = (this.index + 1) % size;

    // マウス：重ねた行へ選択を移す
    var hovered = this._hoveredRow(input);
    if (hovered >= 0) this.index = hovered;
  };

  /**
   * カーソルが乗っている行の番号（乗っていなければ -1）。
   * 一覧は画面に収まる分だけを窓のようにずらして描くので、その範囲だけを見る。
   */
  PartyScene.prototype._hoveredRow = function (input) {
    if (!input.getPointer) return -1;

    var pointer = input.getPointer();
    if (!pointer.inside) return -1;
    if (!pointer.moved && !pointer.clicked) return -1;

    var L = this.layout.list;
    var list = this._currentList();
    var visible = L.visible || 6;
    var start = this._listStart();

    for (var i = start; i < Math.min(list.size(), start + visible); i++) {
      var rect = { x: L.x, y: L.y + L.rowHeight * (i - start), w: L.w, h: L.h };
      if (NS.Panel.containsPoint(rect, pointer)) return i;
    }
    return -1;
  };

  /** 一覧の先頭に出している番号（描画と当たり判定で同じ計算を使う） */
  PartyScene.prototype._listStart = function () {
    var L = this.layout.list;
    var size = this._currentList().size();
    var visible = L.visible || 6;

    var start = Math.min(this.index - Math.floor(visible / 2), size - visible);
    return Math.max(0, start);
  };

  /** 行をマウスで押したか */
  PartyScene.prototype._clickedRow = function (input) {
    if (!input.getPointer || !input.getPointer().clicked) return false;
    return this._hoveredRow(input) >= 0;
  };

  /** 上部の「連れていく / 預かり所」をマウスで押したか */
  PartyScene.prototype._clickedTab = function (input) {
    if (!input.getPointer || !input.getPointer().clicked) return false;

    var pos = this.layout.tabs;
    if (!pos) return false;

    var pointer = input.getPointer();
    var tabs = ["party", "storage"];

    for (var i = 0; i < tabs.length; i++) {
      var rect = { x: pos.x + pos.gap * i - 8, y: pos.y - 16, w: pos.gap - 12, h: 24 };
      if (!NS.Panel.containsPoint(rect, pointer)) continue;
      if (this.tab !== tabs[i]) this._switchTab();
      return true;
    }
    return false;
  };

  // --- 選んだ仲間に何をするか ---

  PartyScene.prototype._beginAction = function () {
    if (!this._selected()) return;

    this.actionMenu.setItems(this._buildActionItems());
    this.mode = "action";
    this._notice = null;
  };

  /** 表によって選べることが変わる */
  PartyScene.prototype._buildActionItems = function () {
    var items = [];

    // 何も変えない項目なので先頭に置く（間違えて押しても損がない）
    items.push({ label: this.texts.actionInspect || "inspect", value: "inspect" });

    if (this.tab === "party") {
      // 探索中は預けられない（預かり所は拠点にある）
      if (this.allowStorage) {
        items.push({ label: this.texts.actionDeposit || "deposit", value: "deposit" });
      }
      items.push({ label: this.texts.actionReorder || "reorder", value: "reorder" });
    } else {
      items.push({ label: this.texts.actionTake || "take", value: "take" });
    }

    items.push({ label: this.texts.actionEquip || "equip", value: "equip" });
    items.push({ label: this.texts.actionName || "name", value: "name" });
    items.push({ label: this.texts.actionCancel || "cancel", value: "cancel" });
    return items;
  };

  PartyScene.prototype._updateActionMode = function (input) {
    var result = this.actionMenu.handleInput(input);
    if (!result) return;

    if (result.type === "cancel" || result.value === "cancel") {
      this.mode = "list";
      return;
    }
    if (result.type !== "confirm") return;

    switch (result.value) {
      case "inspect": this.mode = "inspect"; break;
      case "deposit": this._depositToStorage(); this.mode = "list"; break;
      case "take":    this._takeFromStorage();  this.mode = "list"; break;
      case "reorder": this._beginReorder(); break;
      case "equip":   this._beginEquip(); break;
      case "name":    this._beginNaming(); break;
    }
  };

  // --- 様子を見る ---

  /**
   * 眺めるだけの画面。何も変えない。
   *
   * 一覧の詳細欄は狭くて、絵も48pxしか出ない。
   * ここでは画面いっぱいを使って、絵を大きく出し、
   * 一覧では出しきれない**状態異常の耐性**まで並べる。
   *
   * ↑↓で他の仲間へそのまま移れる（いちいち一覧へ戻らなくてよい）。
   */
  PartyScene.prototype._updateInspectMode = function (input) {
    var size = this._currentList().size();

    if (size > 0) {
      if (input.isPressed("up")) this.index = (this.index - 1 + size) % size;
      if (input.isPressed("down")) this.index = (this.index + 1) % size;
    }
    if (input.isPressed("cancel") || input.isPressed("confirm")) this.mode = "list";
  };

  // --- 名前をつける ---

  PartyScene.prototype._beginNaming = function () {
    var monster = this._selected();
    if (!monster) return;

    var texts = (this.game.data.messages || {}).naming || {};
    this.nameInput.open(
      monster.nickname || "",
      (texts.titleRename || "").replace("{name}", monster.getName()));

    this.mode = "naming";
    this._notice = null;
  };

  PartyScene.prototype._updateNamingMode = function (input) {
    var result = this.nameInput.handleInput(input);
    if (!result) return;

    var texts = (this.game.data.messages || {}).naming || {};

    if (result.type === "cancel") {
      this._notice = texts.keptName || null;
      this.mode = "list";
      return;
    }

    var monster = this._selected();
    if (monster) {
      var before = monster.getName();
      monster.setNickname(result.name);
      this._notice = (texts.renamed || "")
        .replace("{old}", before)
        .replace("{new}", monster.getName());
    }
    this.mode = "list";
  };

  // --- 並び替え ---

  PartyScene.prototype._beginReorder = function () {
    this.reorderFrom = this.index;
    this.mode = "reorder";
  };

  PartyScene.prototype._updateReorderMode = function (input) {
    this._moveCursor(input);

    if (input.isPressed("cancel")) {
      this.mode = "list";
      this.reorderFrom = -1;
      return;
    }
    if (!input.isPressed("confirm") && !this._clickedRow(input)) return;

    this.game.party.swap(this.reorderFrom, this.index);
    this.reorderFrom = -1;
    this.mode = "list";
  };

  // --- 装備 ---

  /**
   * 選んでいる仲間に着けるものを選ぶ。
   * 着けられるものが1つも無くても画面は開く（押しても何も起きない、を避けるため）。
   */
  PartyScene.prototype._beginEquip = function () {
    var monster = this._currentList().get(this.index);
    if (!monster) return;

    this.equipList.setRows(this._buildEquipRows(monster));
    this.mode = "equip";
    this._notice = null;
  };

  /**
   * 装備の候補。枠（武器・防具・アクセサリー）ごとに見出しを挟んで並べる。
   * 各枠の中では、いま着けているもの（外す用）を先に、持ち物の装備をそのあとに置く。
   * 枠が埋まっている装備を選ぶと、その枠の古いものと入れ替わる（Game.equipItem）。
   * @returns {object[]} ScrollList の行
   */
  PartyScene.prototype._buildEquipRows = function (monster) {
    var rows = [];
    var t = this.theme;
    var data = this.game.data;
    var equipped = monster.equipment || [];
    var slots = this.game.inventory.getSlots();
    var order = this._slotOrder();

    for (var s = 0; s < order.length; s++) {
      var slot = order[s];
      var capacity = NS.EffectSystem.slotCapacity(data, slot);
      var entries = [];
      var i;

      // 着けているもの（外す用）
      for (i = 0; i < equipped.length; i++) {
        var worn = data.getItem(equipped[i]);
        if (!worn || NS.EffectSystem.slotOf(worn) !== slot) continue;
        entries.push({
          type: "entry",
          label: worn.name,
          right: this.texts.unequipLabel || "",
          color: t.cursorColor,
          value: { action: "unequip", index: i }
        });
      }
      var wornCount = entries.length;

      // 持ち物の中の、この枠の装備
      for (i = 0; i < slots.length; i++) {
        var item = data.getItem(slots[i].itemId);
        if (!item || !item.equip || NS.EffectSystem.slotOf(item) !== slot) continue;
        entries.push({
          type: "entry",
          label: item.name,
          right: "x" + slots[i].count,
          value: { action: "equip", itemId: item.id }
        });
      }
      if (entries.length === 0) continue;

      // 見出しに「何個中いくつ着けているか」を出す
      rows.push({
        type: "header",
        label: "- " + NS.EffectSystem.slotNameOf(slot, data) + " " + wornCount + "/" + capacity + " -",
        color: t.subTextColor
      });
      rows = rows.concat(entries);
    }
    return rows;
  };

  /** 枠の並び（重複を除いた data/config.js の equipSlots の順） */
  PartyScene.prototype._slotOrder = function () {
    var slots = (this.game.data.config || {}).equipSlots || [];
    var order = [];
    for (var i = 0; i < slots.length; i++) {
      if (order.indexOf(slots[i]) < 0) order.push(slots[i]);
    }
    return order;
  };

  PartyScene.prototype._updateEquipMode = function (input) {
    // ScrollList が扱うのは上下移動だけ。決定・取消はここで見る
    this.equipList.handleInput(input);

    if (input.isPressed("cancel") || input.isPressed("equip")) {
      this.mode = "list";
      return;
    }
    if (!input.isPressed("confirm") && !this.equipList.clickedEntry(input)) return;

    var selected = this.equipList.getSelected();
    if (!selected) return;

    this._applyEquipChoice(selected.value);
  };

  PartyScene.prototype._applyEquipChoice = function (choice) {
    var monster = this._currentList().get(this.index);
    if (!monster || !choice) return;

    if (choice.action === "unequip") {
      var removed = this.game.unequipItem(monster, choice.index);
      this._notice = removed
        ? fill(this.texts.unequipped, { name: this.game.data.getItem(removed).name })
        : (this.texts.stackFull || null);
      if (!removed) this.game.playError();
    } else {
      var item = this.game.data.getItem(choice.itemId);
      var result = this.game.equipItem(monster, choice.itemId);
      if (result.success && result.replaced) {
        var out = this.game.data.getItem(result.replaced);
        this._notice = fill(this.texts.equipSwapped, { out: out ? out.name : result.replaced, item: item.name });
      } else if (result.success) {
        this._notice = fill(this.texts.equipped, { name: monster.getName(), item: item.name });
      } else if (result.reason === "duplicate") {
        this._notice = fill(this.texts.equipDuplicate, { item: item.name });
        this.game.playError();
      } else {
        this._notice = this.texts.stackFull || null;
        this.game.playError();
      }
    }

    // 中身が変わったので作り直す（空になっても画面は開いたままにする）
    this.equipList.setRows(this._buildEquipRows(monster));
  };

  PartyScene.prototype._switchTab = function () {
    this.tab = (this.tab === "party") ? "storage" : "party";
    this._clampIndex();
    this._notice = null;
  };

  // --- 出し入れ ---

  /** 預かり所からパーティへ加える（空きがあるときだけ） */
  PartyScene.prototype._takeFromStorage = function () {
    var storage = this.game.storage;
    if (!storage || storage.isEmpty()) return;

    if (this.game.party.isFull()) {
      this._notice = this.texts.partyFull || null;
      this.game.playError();
      return;
    }

    var monster = storage.get(this.index);
    if (!monster || !this.game.takeFromStorage(this.index)) return;

    this._notice = fill(this.texts.tookOut, { name: monster.getName() });
    this._clampIndex();
  };

  /** パーティの1体を預かり所へ預ける */
  PartyScene.prototype._depositToStorage = function () {
    var party = this.game.party;
    var index = this.index;

    if (!party || party.size() <= 1) {
      // 最後の1体を預けると戦えなくなるので、預けさせない
      this._notice = this.texts.cannotStoreLast || null;
      this.game.playError();
      return;
    }

    var monster = party.get(index);
    if (!monster) return;

    if (!this.game.depositToStorage(index)) {
      this._notice = this.texts.storageFull || null;
      this.game.playError();
      return;
    }

    this._notice = fill(this.texts.stored, { name: monster.getName() });
    this._clampIndex();
  };

  /** 件数が変わったあと、カーソルを一覧の中へ収める */
  PartyScene.prototype._clampIndex = function () {
    var size = this._currentList().size();
    if (this.index >= size) this.index = Math.max(0, size - 1);
  };

  /** テンプレートの {key} を置き換える */
  function fill(template, values) {
    if (!template) return "";
    return template.replace(/\{(\w+)\}/g, function (match, key) {
      return (values[key] !== undefined) ? values[key] : match;
    });
  }

  // --- 描画 ---

  PartyScene.prototype.render = function (ctx) {
    var w = this.game.canvas.width;
    var h = this.game.canvas.height;
    var L = this.layout;
    var t = this.theme;

    this.renderer.clear(L.background || "#000000", w, h);

    // 様子を見ている間は画面ぜんぶを使う（一覧もタブも出さない）
    if (this.mode === "inspect") {
      this._renderInspect(this._currentList().get(this.index));
      this._renderHint(L, t);
      this.backButton.render();
      return;
    }

    this.panel.drawText(this.texts.title || "party",
      L.title.x, L.title.y, { font: t.largeFont });

    this._renderTabs(L, t);

    var list = this._currentList();
    var empty = (this.tab === "storage") ? this.texts.storageEmpty : this.texts.empty;

    if (!list || list.isEmpty()) {
      this.panel.drawText(empty || "", L.list.x, L.list.y + 30);
    } else {
      // 預かり所は6体より多く入るので、画面に収まる分だけを窓のようにずらして出す
      var visible = L.list.visible || 6;
      var start = this._listStart();

      for (var i = start; i < Math.min(list.size(), start + visible); i++) {
        this._renderRow(list.get(i), i, start);
      }

      // 装備を選んでいる間は、詳細の代わりに候補の一覧を出す
      if (this.mode === "equip") this._renderEquipList(list.get(this.index));
      else this._renderDetail(list.get(this.index));
    }

    // 「この仲間に何をするか」の項目
    if (this.mode === "action") this.actionMenu.render(this.game.clock);

    // 名前をつけている間は、文字盤を画面の手前に重ねる。
    // 案内は文字盤が自分で出すので、ここのヒントと「戻る」は出さない
    // （文字盤の間は他の操作を受け付けないため、押せるものを見せない）
    if (this.mode === "naming") {
      this.nameInput.render(this.game.clock);
      return;
    }

    this._renderHint(L, t);
    this.backButton.render();
  };

  /** 装備の候補一覧（詳細欄の位置に重ねて出す） */
  PartyScene.prototype._renderEquipList = function (monster) {
    var t = this.theme;
    var rect = this.layout.equipList || this.layout.detail;

    this.equipList.render(this.game.clock);

    var label = fill(this.texts.equipTitle, { name: monster ? monster.getName() : "" });
    this.panel.drawText(label, rect.x + (t.padding || 8), rect.y - 8,
      { font: t.smallFont, color: t.cursorColor });

    // 選んでいる装備の効果を下に出す
    var selected = this.equipList.getSelected();
    if (!selected) {
      // 着けられるものが1つも無い場合は、その理由を枠の中に出す
      this.panel.drawText(this.texts.noEquipment || "",
        rect.x + (t.padding || 8), rect.y + 30,
        { font: t.smallFont, color: t.hintColor });
      this.panel.drawText(this.texts.noEquipmentHint || "",
        rect.x + (t.padding || 8), rect.y + 30 + (t.lineHeight || 18),
        { font: t.smallFont, color: t.hintColor });
      return;
    }

    var unequipping = (selected.value.action === "unequip");
    var itemId = unequipping
      ? (monster.equipment || [])[selected.value.index]
      : selected.value.itemId;

    var item = this.game.data.getItem(itemId);
    if (!item) return;

    var x = rect.x + (t.padding || 8);
    var lh = t.lineHeight || 18;
    var y = rect.y + rect.h + 16;
    var i;

    // 効果の内容
    var lines = this._describeEquip(item);
    for (i = 0; i < lines.length; i++) {
      this.panel.drawText(lines[i], x, y, { font: t.smallFont, color: t.subTextColor });
      y += lh;
    }

    // 着けた（外した）ときにステータスがどう変わるか
    y += 6;
    var changes = this._statChanges(monster, this._equipmentAfter(monster, selected.value));

    for (i = 0; i < changes.length; i++) {
      var change = changes[i];
      var color = t.subTextColor;
      if (change.after > change.before) color = t.hpBarHigh || "#5fd18c";
      else if (change.after < change.before) color = t.hpBarLow || "#e8542a";

      this.panel.drawText(change.label, x, y, { font: t.smallFont, color: t.hintColor });
      this.panel.drawText(change.before + " → " + change.after,
        rect.x + rect.w - (t.padding || 8), y,
        { align: "right", font: t.smallFont, color: color });
      y += lh;
    }
  };

  /**
   * その選択をしたあとの装備の並び（実際には着け替えない。見せるためだけ）。
   * Game.equipItem と同じ決まり：枠が埋まっていれば、その枠の古いものが外れる。
   *
   * @param {object} monster
   * @param {{action:string, index?:number, itemId?:string}} choice
   * @returns {string[]}
   */
  PartyScene.prototype._equipmentAfter = function (monster, choice) {
    var list = (monster.equipment || []).slice();
    if (choice.action === "unequip") {
      list.splice(choice.index, 1);
      return list;
    }

    var data = this.game.data;
    var item = data.getItem(choice.itemId);
    if (!item || list.indexOf(choice.itemId) >= 0) return list;   // 同じものは着けられない

    var slot = NS.EffectSystem.slotOf(item);
    var capacity = NS.EffectSystem.slotCapacity(data, slot);
    var worn = [];
    for (var i = 0; i < list.length; i++) {
      var w = data.getItem(list[i]);
      if (w && w.equip && NS.EffectSystem.slotOf(w) === slot) worn.push(list[i]);
    }
    if (worn.length >= capacity && worn.length > 0) list.splice(list.indexOf(worn[0]), 1);

    list.push(choice.itemId);
    return list;
  };

  /**
   * その装備にしたときの、ステータスの変化を返す。
   *
   * 装備を一時的に差し替えて計算し、必ず元へ戻す。
   * ステータスは呼ばれるたびに計算されるので、こうしても持ち主の状態は変わらない。
   *
   * @param {object} monster
   * @param {string[]} equipment 着け替えたあとの装備id
   * @returns {Array<{label:string, before:number, after:number}>}
   */
  PartyScene.prototype._statChanges = function (monster, equipment) {
    var texts = this.texts;
    var stats = [
      { label: "HP", read: function (m) { return m.getMaxHp(); } },
      { label: texts.attackLabel || "攻撃",  read: function (m) { return m.getAttack(); } },
      { label: texts.defenseLabel || "防御", read: function (m) { return m.getDefense(); } },
      { label: texts.speedLabel || "素早さ", read: function (m) { return m.getSpeed(); } },
      { label: "PP", read: function (m) { return m.getMaxPp(); } }
    ];

    var before = [];
    var i;
    for (i = 0; i < stats.length; i++) before.push(stats[i].read(monster));

    var original = monster.equipment;
    monster.equipment = equipment;

    var result = [];
    try {
      for (i = 0; i < stats.length; i++) {
        result.push({ label: stats[i].label, before: before[i], after: stats[i].read(monster) });
      }
    } finally {
      monster.equipment = original;
    }
    return result;
  };

  /** 装備の効果を1行ずつの文章にする（組み立ては EffectSystem に任せる） */
  PartyScene.prototype._describeEquip = function (item) {
    var effects = (item.equip || {}).effects || [];
    var lines = [];

    for (var i = 0; i < effects.length; i++) {
      var text = NS.EffectSystem.describeEffect(effects[i], this.game.data);
      if (text) lines.push("・" + text);
    }
    return lines;
  };

  /** 上部の「パーティ / 預かり所」切り替え表示 */
  PartyScene.prototype._renderTabs = function (L, t) {
    var pos = L.tabs || { x: L.title.x + 160, y: L.title.y, gap: 130 };
    var party = this.game.party;
    var storage = this.game.storage;

    var labels = [
      { id: "party",
        text: (this.texts.tabParty || "party") +
              " " + (party ? party.size() : 0) + "/" + (party ? party.maxSize : 0) }
    ];

    // 預かり所へ手が届かない場面（探索中）では、表そのものを出さない
    if (this.allowStorage) {
      labels.push({ id: "storage",
        text: (this.texts.tabStorage || "storage") +
              " " + (storage ? storage.size() : 0) + "/" + (storage ? storage.maxSize : 0) });
    }

    for (var i = 0; i < labels.length; i++) {
      var selected = (labels[i].id === this.tab);
      this.panel.drawText(labels[i].text, pos.x + pos.gap * i, pos.y,
        { font: t.smallFont, color: selected ? t.cursorColor : t.hintColor });
    }
  };

  PartyScene.prototype._renderHint = function (L, t) {
    // 一時的な知らせ（預けた・連れ出した）があればそれを優先して出す
    if (this._notice) {
      this.panel.drawText(this._notice, L.hint.x, L.hint.y,
        { color: t.cursorColor, font: t.smallFont });
      return;
    }

    var hint;
    if (this.mode === "equip") hint = this.texts.hintEquip;
    else if (this.mode === "inspect") hint = this.texts.hintInspect;
    else if (this.mode === "action") hint = this.texts.hintAction;
    else if (this.mode === "reorder") hint = this.texts.hintReorder;
    else if (this.tab === "storage" && this.game.storage.isEmpty()) {
      // 何も預けていないときは「どうすれば預けられるか」を出す
      hint = this.texts.hintStorageEmpty;
    }
    // 探索中は表の切り替えが無いので、その案内を出さない
    else if (!this.allowStorage) hint = this.texts.hintNoStorage || this.texts.hintNormal;
    else hint = this.texts.hintNormal;

    this.panel.drawText(hint || "", L.hint.x, L.hint.y,
      { color: t.hintColor, font: t.smallFont });
  };

  /**
   * 一覧の1行を描く。
   * @param {number} i 一覧の中での番号
   * @param {number} [start] 画面に出している先頭の番号（描く位置の基準）
   */
  PartyScene.prototype._renderRow = function (monster, i, start) {
    var L = this.layout;
    var t = this.theme;
    var rect = {
      x: L.list.x,
      y: L.list.y + L.list.rowHeight * (i - (start || 0)),
      w: L.list.w,
      h: L.list.h
    };

    this.panel.drawBox(rect);

    // カーソル・選択中の印
    if (i === this.index) {
      this.panel.drawText("▶", rect.x - 18, rect.y + 34, { color: t.cursorColor });
    }
    // 並び替えの移動元
    if (this.mode === "reorder" && this.tab === "party" && i === this.reorderFrom) {
      this.panel.drawText("◆", rect.x - 18, rect.y + 16, { color: t.cursorColor });
    }

    // スプライト。種族ごとの大きさ（sizeScale）を掛けたうえで、
    // 中心をそろえて描く（行の高さは変わらないので、はみ出しは上下に散る）
    var base = L.spriteSize;
    var size = Math.round(base * (monster.getSizeScale ? monster.getSizeScale() : 1));
    var sprite = monster.getSpriteId();
    this.sprites.drawMotion(sprite,
      rect.x + 8 - (size - base) / 2, rect.y + (rect.h - size) / 2, size, size,
      NS.Motion.forSprite(this.game.data, sprite, monster.getMotionId(),
        this.game.clock, monster.getMotionPhase()));

    // 文字の開始位置は元の大きさで決める（大きい相手でも行がずれないように）
    var textX = rect.x + base + 20;

    // 盤面に出る位置（先頭から battleFieldSize 体）に印をつける（パーティ側のみ）
    var fieldSize = this.game.data.config.battleFieldSize || 3;
    if (this.tab === "party" && i < fieldSize) {
      var divider = L.fieldDivider || {};
      this.panel.drawText(divider.label || "", rect.x + rect.w - 10, rect.y + 18,
        { align: "right", color: divider.color || t.cursorColor, font: t.smallFont });
    }

    var heading = monster.getName() + "  Lv" + monster.level;
    this.panel.drawText(heading, textX, rect.y + 22);

    // 掛かっている状態異常の印。戦闘中・ダンジョンの左上と同じ絵
    this.panel.ctx.font = t.font || "14px monospace";
    NS.StatusMarks.draw(this.panel, NS.StatusMarks.defsOf(monster),
      textX + this.panel.ctx.measureText(heading).width + 8, rect.y + 22,
      { maxX: rect.x + rect.w - 46, sprites: this.sprites, data: this.game.data });   // 右上の「出撃」の手前で止める

    // HPバーと数値（戦闘不能なら表示を変える）
    var barWidth = L.hpBarWidth || (rect.w - size - 40);
    this.hpBar.draw(textX, rect.y + 32, barWidth, 8, monster.currentHp, monster.getMaxHp());
    var hpText = monster.isFainted()
      ? (this.texts.fainted || "fainted")
      : monster.currentHp + "/" + monster.getMaxHp();
    this.panel.drawText(hpText, textX, rect.y + 52,
      { color: monster.isFainted() ? t.hpBarLow : t.subTextColor, font: t.smallFont });
  };

  /** 選択中の個体の詳細を描く */
  PartyScene.prototype._renderDetail = function (monster) {
    if (!monster) return;

    var L = this.layout;
    var t = this.theme;
    var rect = L.detail;
    this.panel.drawBox(rect);

    var x = rect.x + (t.padding || 8);
    var y = rect.y + 22;
    // 行間は中身の量から決める。技や装備が多い仲間で枠からはみ出さないよう、
    // 入りきらないときだけ詰める（ふだんはテーマの行間のまま）
    var lh = this._detailLineHeight(monster, rect);

    this.panel.drawText(monster.getName(), x, y);
    y += lh;

    var nature = monster.getNature();
    this.panel.drawText(
      (this.texts.natureLabel || "nature") + ": " + (nature ? nature.name : "-"),
      x, y, { color: t.subTextColor, font: t.smallFont });
    y += lh;

    var hpLine = "HP " + monster.currentHp + "/" + monster.getMaxHp();
    this.panel.drawText(hpLine, x, y, { color: t.subTextColor, font: t.smallFont });

    // 状態異常はHPの行の右に、名前のまま並べる。
    //   一覧では1文字の印だが、こちらは詳細なので「毒」「呪い」と読める形で出す。
    //   行を増やさないのは、この枠に技・特性・装備・耐性まで入っているため
    this.panel.ctx.font = t.smallFont;
    NS.StatusMarks.drawNames(this.panel, NS.StatusMarks.defsOf(monster),
      x + this.panel.ctx.measureText(hpLine).width + 10, y,
      { maxX: rect.x + rect.w - (t.padding || 8), sprites: this.sprites, data: this.game.data });
    y += lh;

    this.panel.drawText("PP " + monster.currentPp + "/" + monster.getMaxPp(),
      x, y, { color: t.subTextColor, font: t.smallFont });
    y += lh;

    this.panel.drawText((this.texts.attackLabel || "ATK") + " " + monster.getAttack(),
      x, y, { color: t.subTextColor, font: t.smallFont });
    y += lh;

    this.panel.drawText((this.texts.defenseLabel || "DEF") + " " + monster.getDefense(),
      x, y, { color: t.subTextColor, font: t.smallFont });
    y += lh;

    this.panel.drawText((this.texts.speedLabel || "SPD") + " " + monster.getSpeed(),
      x, y, { color: t.subTextColor, font: t.smallFont });
    y += lh;

    var needed = monster.getExpToNextLevel() - monster.exp;
    this.panel.drawText((this.texts.expLabel || "next") + " " + needed,
      x, y, { color: t.subTextColor, font: t.smallFont });
    y += lh + 4;

    this.panel.drawText(this.texts.skillLabel || "skills", x, y, { font: t.smallFont });
    y += lh;

    var i;
    for (i = 0; i < monster.skills.length; i++) {
      var skill = this.game.data.getSkill(monster.skills[i]);
      this.panel.drawText("・" + (skill ? skill.name : monster.skills[i]),
        x, y, { color: t.subTextColor, font: t.smallFont });
      y += lh;
    }

    // 特性（アビリティ）
    var abilities = this._getAbilities(monster);
    if (abilities.length > 0) {
      y += 4;
      this.panel.drawText(this.texts.abilityLabel || "abilities", x, y, { font: t.smallFont });
      y += lh;

      for (i = 0; i < abilities.length; i++) {
        this.panel.drawText("・" + abilities[i].name, x, y,
          { color: t.subTextColor, font: t.smallFont });
        y += lh;
      }
    }

    // 装備。狭い欄なので、着けているものだけ並べ、空き枠は数でまとめる
    // （枠ごとの表示は「様子を見る」と着け替えの一覧にある）
    y += 4;
    this.panel.drawText(this.texts.equipLabel || "equipment", x, y, { font: t.smallFont });
    y += lh;

    var slotLines = this._equipSlotLines(monster);
    var emptyCount = 0;
    for (i = 0; i < slotLines.length; i++) {
      if (slotLines[i].empty) { emptyCount++; continue; }
      this.panel.drawText("・" + slotLines[i].text, x, y, { color: t.subTextColor, font: t.smallFont });
      y += lh;
    }
    if (emptyCount > 0) {
      this.panel.drawText("・" + fill(this.texts.slotsEmpty || "空き {n}", { n: emptyCount }), x, y,
        { color: t.hintColor, font: t.smallFont });
      y += lh;
    }

    this._renderResistances(monster, x, y + 4, rect, lh);
  };

  /**
   * 詳細欄の行間。全部の行が枠に収まる高さにする（上限はテーマの行間、下限 13px）。
   * 数える行：名前・性格・HP・PP・攻・防・速・次まで（8）、技、特性、装備、耐性（見出し＋2列で4行）
   */
  PartyScene.prototype._detailLineHeight = function (monster, rect) {
    var t = this.theme;
    var base = t.lineHeight || 18;

    var lines = 8;
    lines += 1 + monster.skills.length;
    var abilities = this._getAbilities(monster).length;
    if (abilities > 0) lines += 1 + abilities;
    var slots = this._equipSlotLines(monster);
    var worn = 0, empty = 0;
    for (var i = 0; i < slots.length; i++) { if (slots[i].empty) empty++; else worn++; }
    lines += 1 + worn + (empty > 0 ? 1 : 0);
    var elements = Object.keys(this.game.data.elements || {}).length - 1;   // 無属性を除く
    lines += 1 + Math.ceil(Math.max(0, elements) / 2);

    var gaps = 4 * 3 + 4;                     // 見出しの前の空き
    var available = rect.h - 22 - 8 - gaps;   // 上の余白・下の余白
    return Math.max(13, Math.min(base, Math.floor(available / lines)));
  };

  /**
   * 装備を枠ごとに1行ずつ。「武器：灼牙の戦刃」「防具：-」のように、
   * 空いている枠も出す（何が着けられるかが一目で分かるように）。
   * @returns {Array<{text:string, empty:boolean}>}
   */
  PartyScene.prototype._equipSlotLines = function (monster) {
    var data = this.game.data;
    var empty = this.texts.slotEmpty || "-";
    var slots = (data.config || {}).equipSlots || [];
    var equipped = (monster.equipment || []).slice();
    var lines = [];

    for (var s = 0; s < slots.length; s++) {
      var label = NS.EffectSystem.slotNameOf(slots[s], data) + "：";
      var found = -1;
      for (var i = 0; i < equipped.length; i++) {
        var item = data.getItem(equipped[i]);
        if (item && item.equip && NS.EffectSystem.slotOf(item) === slots[s]) { found = i; break; }
      }
      if (found >= 0) {
        var worn = data.getItem(equipped[found]);
        lines.push({ text: label + worn.name, empty: false, itemId: worn.id });
        equipped.splice(found, 1);   // 同じ種類の2つ目の枠には次のものが入る
      } else {
        lines.push({ text: label + empty, empty: true });
      }
    }
    return lines;
  };

  /**
   * 全属性の耐性を、2列の表にして出す。
   *
   * ★ ここで出すのは monster.getResistance()。
   *   種族の耐性だけでなく、装備の resistBonus（炎よけの札・宵よけの札）まで
   *   足したあとの値なので、「着けたらどう変わるか」がこの画面で分かる。
   *   0（等倍）の属性も省かずに並べる —— 何が等倍なのかも知りたい情報のため。
   */
  PartyScene.prototype._renderResistances = function (monster, x, y, rect, lineHeight) {
    if (!monster.getResistance) return;

    var t = this.theme;
    var lh = lineHeight || t.lineHeight || 18;
    var elements = this.game.data.elements || {};

    // elements.js の order 順に並べる（図鑑や技一覧と同じ並び）
    var ids = Object.keys(elements).filter(function (id) { return id !== "none"; });
    ids.sort(function (a, b) {
      return (elements[a].order || 0) - (elements[b].order || 0);
    });

    this.panel.drawText(this.texts.resistanceLabel || "", x, y, { font: t.smallFont });
    y += lh;

    var colWidth = Math.floor(((rect.w - (t.padding || 8) * 2)) / 2);

    for (var i = 0; i < ids.length; i++) {
      var element = elements[ids[i]];
      var value = monster.getResistance(ids[i]) || 0;

      // 強いところは青、弱いところは赤。等倍は目立たせない
      var color = t.hintColor;
      if (value > 0) color = t.hpBarFull || "#4fb0d1";
      else if (value < 0) color = t.hpBarLow || "#e8542a";

      var col = i % 2;
      var cx = x + col * colWidth;
      // 属性の絵を名前の前に置く（無い属性は文字だけ）
      var tx = NS.StatusMarks.drawElement(this.sprites, this.game.data, ids[i], cx, y, { size: 12 });
      if (tx > cx) tx += 3;

      var text = element.name + " " + (value > 0 ? "+" : "") + value;
      this.panel.drawText(text, tx, y, { color: color, font: t.smallFont });

      if (col === 1) y += lh;
    }
  };

  /**
   * 「様子を見る」の画面。眺めるだけで、何も変えない。
   *
   * 左に絵（一覧の48pxではなく大きく出す。動きもそのまま）、
   * 中央にステータスと装備、右に耐性を2種類ならべる。
   *
   * ★ 状態異常の耐性を出せるのはここだけ。
   *   一覧の詳細欄には属性耐性までしか入らなかった。
   */
  PartyScene.prototype._renderInspect = function (monster) {
    if (!monster) return;

    var t = this.theme;
    var L = this.layout.inspect || {};
    var rect = L.box || { x: 32, y: 48, w: 736, h: 470 };
    this.panel.drawBox(rect);

    // --- 左：絵と名前 ---
    var sp = L.sprite || { x: 128, y: 170, size: 128 };
    var base = sp.size || 128;
    var size = Math.round(base * (monster.getSizeScale ? monster.getSizeScale() : 1));
    var spriteId = monster.getSpriteId();

    this.sprites.drawMotion(spriteId,
      sp.x - size / 2, sp.y - size / 2, size, size,
      NS.Motion.forSprite(this.game.data, spriteId, monster.getMotionId(),
        this.game.clock, monster.getMotionPhase()));

    this.panel.drawText(monster.getName(), sp.x, (L.name || {}).y || 268,
      { align: "center", font: t.largeFont });

    var nature = monster.getNature();
    this.panel.drawText("Lv" + monster.level + "　" + (nature ? nature.name : "-"),
      sp.x, ((L.name || {}).y || 268) + 24,
      { align: "center", font: t.smallFont, color: t.subTextColor });

    // 左の下：技と特性（中央をステータスと装備に空けるため、こちらへ）
    this._renderInspectSkills(monster, L.left || { x: 64, y: 316, lineHeight: 20 });

    // --- 中央：ステータス・装備・装備の効果 ---
    var mid = L.stats || { x: 268, y: 96, lineHeight: 22 };
    this._renderInspectStats(monster, mid);

    // --- 右：耐性2種 → その下に効果 ---
    var right = L.resist || { x: 502, y: 96, lineHeight: 22, colWidth: 126 };
    var y = this._renderResistTable(monster, right,
      this.texts.resistanceLabel, this._elementRows(monster));
    y = this._renderResistTable(monster, { x: right.x, y: y + 10,
      lineHeight: right.lineHeight, colWidth: right.colWidth,
      font: right.font, iconSize: right.iconSize },
      this.texts.statusResistLabel, this._statusRows(monster));

    var fx = L.effects || {};
    this._renderEffectList(monster, {
      x: right.x, y: y + (fx.gap === undefined ? 10 : fx.gap),
      lineHeight: fx.lineHeight || 18,
      font: fx.font || right.font, fromFont: fx.fromFont,
      // 枠の内側まで。ここを越えるなら出どころの表記を省く
      maxX: rect.x + rect.w - (t.padding || 10)
    });
  };

  /** 様子を見る：左の下の、技と特性 */
  PartyScene.prototype._renderInspectSkills = function (monster, pos) {
    var t = this.theme;
    var lh = pos.lineHeight || 20;
    var x = pos.x, y = pos.y;
    var i;

    this.panel.drawText(this.texts.skillLabel || "", x, y, { font: t.smallFont });
    y += lh;
    for (i = 0; i < monster.skills.length; i++) {
      var skill = this.game.data.getSkill(monster.skills[i]);
      this.panel.drawText("・" + (skill ? skill.name : monster.skills[i]), x, y,
        { font: t.smallFont, color: t.subTextColor });
      y += lh;
    }

    var abilities = this._getAbilities(monster);
    if (abilities.length === 0) return;
    y += 6;
    this.panel.drawText(this.texts.abilityLabel || "", x, y, { font: t.smallFont });
    y += lh;
    for (i = 0; i < abilities.length; i++) {
      this.panel.drawText("・" + abilities[i].name, x, y, { font: t.smallFont, color: t.subTextColor });
      y += lh;
    }
  };

  /**
   * 様子を見る：中央のステータス欄。
   * 装備で上がった（下がった）ぶんは、値の隣に「(+8)」「(-2)」と出す。
   * 装備を外した状態と比べているので、特性・加護のぶんは含まない（装備の効き目だけが見える）。
   */
  PartyScene.prototype._renderInspectStats = function (monster, pos) {
    var t = this.theme;
    var lh = pos.lineHeight || 22;
    var font = pos.font || t.font;
    var x = pos.x, y = pos.y;
    var i;
    var self = this;

    var bare = this._statsWithout(monster);   // 装備なしのときの値

    function statLine(text, value, baseValue) {
      self.panel.drawText(text, x, y, { font: font, color: t.subTextColor });
      var diff = value - baseValue;
      if (diff !== 0) {
        self.panel.ctx.font = font;
        var w = self.panel.ctx.measureText(text).width;
        self.panel.drawText("(" + (diff > 0 ? "+" : "") + diff + ")", x + w + 6, y,
          { font: t.smallFont, color: diff > 0 ? (t.hpBarHigh || "#5fd18c") : (t.hpBarLow || "#e8542a") });
      }
      y += lh;
    }

    statLine("HP " + monster.currentHp + "/" + monster.getMaxHp(), monster.getMaxHp(), bare.hp);
    statLine("PP " + monster.currentPp + "/" + monster.getMaxPp(), monster.getMaxPp(), bare.pp);
    statLine((this.texts.attackLabel || "攻撃") + " " + monster.getAttack(), monster.getAttack(), bare.attack);
    statLine((this.texts.defenseLabel || "防御") + " " + monster.getDefense(), monster.getDefense(), bare.defense);
    statLine((this.texts.speedLabel || "素早さ") + " " + monster.getSpeed(), monster.getSpeed(), bare.speed);
    this.panel.drawText((this.texts.expLabel || "次まで") + " " + (monster.getExpToNextLevel() - monster.exp),
      x, y, { font: font, color: t.subTextColor });
    y += lh + 6;

    // 装備（枠ごと）。名前だけを並べる。
    // 効果は1つずつ書かず、特性のぶんとまとめて右下の「効果」欄に出す
    // （装備の下に並べると、4枠ぶんで欄が窮屈になっていた）
    this.panel.drawText(this.texts.equipLabel || "", x, y, { font: font });
    y += lh;
    var slotLines = this._equipSlotLines(monster);
    for (i = 0; i < slotLines.length; i++) {
      this.panel.drawText("・" + slotLines[i].text, x, y,
        { font: font, color: slotLines[i].empty ? t.hintColor : t.textColor });
      y += lh;
    }
  };

  /**
   * 特性と装備から得ている効果を、ひとまとめにして並べる。
   *
   * ★ ステータスの加算（攻撃+3 など）と耐性の加算は入れない。
   *   その2つは、すでに数値の隣に「(+15)」「(+5)」として出ている。
   *   ここに並べると同じことを二度書くことになり、欄だけが伸びる。
   *   出すのは**他では見えない効果**（倍率・与ダメージ・被ダメージ）だけ。
   *
   * @returns {{text:string, from:string}[]}
   */
  PartyScene.prototype._effectLines = function (monster) {
    var gameData = this.game.data;
    var lines = [];
    var i, j;

    function push(effects, from) {
      for (var k = 0; k < (effects || []).length; k++) {
        var effect = effects[k];
        // 加算は数値の隣に出ているので、ここでは繰り返さない
        if (effect.type === "statBonus" || effect.type === "resistBonus") continue;
        var text = NS.EffectSystem.describeEffect(effect, gameData);
        if (text) lines.push({ text: text, from: from });
      }
    }

    var abilities = this._getAbilities(monster);
    for (i = 0; i < abilities.length; i++) push(abilities[i].effects, abilities[i].name);

    var equipment = monster.equipment || [];
    for (j = 0; j < equipment.length; j++) {
      var item = gameData.getItem(equipment[j]);
      if (item) push((item.equip || {}).effects, item.name);
    }
    return lines;
  };

  /**
   * 様子を見る：右下の「効果」欄。特性と装備でいま効いているものを並べる。
   *
   * 1行が「素早さ ×1.1（深淵の牙）」の形。どこから来ている効果かが分かると、
   * 装備を外すか迷ったときに判断できる。
   * 何も無いときは見出しごと出さない（空の見出しだけ残ると、壊れて見える）。
   */
  PartyScene.prototype._renderEffectList = function (monster, pos) {
    var t = this.theme;
    var lines = this._effectLines(monster);
    if (lines.length === 0) return pos.y;

    var lh = pos.lineHeight || 18;
    var y = pos.y;

    this.panel.drawText(this.texts.effectLabel || "", pos.x, y,
      { font: pos.font || t.smallFont, color: t.cursorColor });
    y += lh;

    var font = pos.font || t.smallFont;
    var fromFont = pos.fromFont || t.smallFont;

    for (var i = 0; i < lines.length; i++) {
      var text = lines[i].text;
      this.panel.drawText(text, pos.x, y, { font: font, color: t.textColor });

      // 出どころ（特性名・装備名）は、効果の後ろに薄く小さく。
      // 「攻撃 ×1.5（HP25%以下のとき）」のように文が長いときは、はみ出すので出さない
      // （どの効果が効いているか自体は、効果の文だけで分かる）
      this.panel.ctx.font = font;
      var w = this.panel.ctx.measureText(text).width;
      this.panel.ctx.font = fromFont;
      var from = "（" + lines[i].from + "）";
      if (!pos.maxX || pos.x + w + 4 + this.panel.ctx.measureText(from).width <= pos.maxX) {
        this.panel.drawText(from, pos.x + w + 4, y, { font: fromFont, color: t.hintColor });
      }
      y += lh;
    }
    return y;
  };

  /**
   * 装備を全部外したときのステータス。「装備でいくつ上がっているか」を出すために使う。
   * 一時的に外して計算し、必ず戻す（ステータスは呼ばれるたびに計算されるので、持ち主は変わらない）
   */
  PartyScene.prototype._statsWithout = function (monster) {
    var original = monster.equipment;
    monster.equipment = [];
    try {
      return {
        hp: monster.getMaxHp(), pp: monster.getMaxPp(),
        attack: monster.getAttack(), defense: monster.getDefense(), speed: monster.getSpeed()
      };
    } finally {
      monster.equipment = original;
    }
  };

  /** 属性耐性の行（並びは elements.js の order） */
  PartyScene.prototype._elementRows = function (monster) {
    var elements = this.game.data.elements || {};
    var ids = Object.keys(elements).filter(function (id) { return id !== "none"; });
    ids.sort(function (a, b) { return (elements[a].order || 0) - (elements[b].order || 0); });

    // 装備で上がったぶん（bonus）は、装備を外した値と比べて出す
    var bare = this._resistancesWithout(monster, ids, "element");
    return ids.map(function (id, i) {
      var value = monster.getResistance(id) || 0;
      return { name: elements[id].name, icon: elements[id].icon || null,
               value: value, bonus: value - bare[i] };
    });
  };

  /** 状態異常耐性の行（並びは statuses.js に書いた順） */
  PartyScene.prototype._statusRows = function (monster) {
    var statuses = this.game.data.statuses || {};
    if (!monster.getStatusResist) return [];

    var ids = Object.keys(statuses);
    var bare = this._resistancesWithout(monster, ids, "status");
    return ids.map(function (id, i) {
      var value = monster.getStatusResist(id) || 0;
      return { name: statuses[id].name, icon: statuses[id].icon || null,
               value: value, bonus: value - bare[i] };
    });
  };

  /** 装備を全部外したときの耐性（属性 or 状態異常）。一時的に外して計算し、必ず戻す */
  PartyScene.prototype._resistancesWithout = function (monster, ids, kind) {
    var original = monster.equipment;
    monster.equipment = [];
    try {
      return ids.map(function (id) {
        return (kind === "status" ? monster.getStatusResist(id) : monster.getResistance(id)) || 0;
      });
    } finally {
      monster.equipment = original;
    }
  };

  /**
   * 耐性を2列の表にして描く。属性でも状態異常でも同じ見た目にする。
   * 強いところは青、弱いところは赤。等倍（0）は目立たせない。
   * @returns {number} 描き終えたあとのy
   */
  PartyScene.prototype._renderResistTable = function (monster, pos, label, rows) {
    var t = this.theme;
    var lh = pos.lineHeight || 18;
    var colWidth = pos.colWidth || 118;
    var y = pos.y;

    this.panel.drawText(label || "", pos.x, y, { font: pos.font || t.smallFont, color: t.cursorColor });
    y += lh;

    for (var i = 0; i < rows.length; i++) {
      var v = rows[i].value;
      var color = t.hintColor;
      if (v > 0) color = t.hpBarFull || "#4fb0d1";
      else if (v < 0) color = t.hpBarLow || "#e8542a";

      var cx = pos.x + (i % 2) * colWidth;
      // 名前の前に絵（属性・状態異常）。無いものは文字だけ
      if (rows[i].icon) {
        NS.StatusMarks.drawIcon(this.sprites, rows[i].icon, cx, y, pos.iconSize || 14);
        cx += (pos.iconSize || 14) + 4;
      }
      var text = rows[i].name + " " + (v > 0 ? "+" : "") + v;
      this.panel.drawText(text, cx, y, { color: color, font: pos.font || t.smallFont });

      // 装備で動いたぶん。「(+3)」のように値の隣へ小さく
      var bonus = rows[i].bonus || 0;
      if (bonus !== 0) {
        this.panel.ctx.font = pos.font || t.smallFont;
        var w = this.panel.ctx.measureText(text).width;
        this.panel.drawText("(" + (bonus > 0 ? "+" : "") + bonus + ")", cx + w + 4, y,
          { font: t.smallFont, color: bonus > 0 ? (t.hpBarHigh || "#5fd18c") : (t.hpBarLow || "#e8542a") });
      }

      if (i % 2 === 1) y += lh;
    }
    // 奇数個で終わったら、その行ぶんを送る
    if (rows.length % 2 === 1) y += lh;
    return y;
  };

  /** そのモンスターが実際に持っている特性の定義を並べる（1体あたりの上限を反映） */
  PartyScene.prototype._getAbilities = function (monster) {
    if (!NS.AbilitySystem) return [];
    if (!this._abilitySystem) this._abilitySystem = new NS.AbilitySystem(this.game.data);
    return this._abilitySystem.getAbilities(monster);
  };

  NS.PartyScene = PartyScene;
})(window.MyGame);
