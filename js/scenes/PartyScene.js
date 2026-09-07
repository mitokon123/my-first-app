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
      case "deposit": this._depositToStorage(); this.mode = "list"; break;
      case "take":    this._takeFromStorage();  this.mode = "list"; break;
      case "reorder": this._beginReorder(); break;
      case "equip":   this._beginEquip(); break;
      case "name":    this._beginNaming(); break;
    }
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
   * 装備の候補。いま着けているものは「外す」として先頭に置く。
   * @returns {object[]} ScrollList の行
   */
  PartyScene.prototype._buildEquipRows = function (monster) {
    var rows = [];
    var t = this.theme;
    var i;

    // 着けているもの（外す用）
    var equipped = monster.equipment || [];
    for (i = 0; i < equipped.length; i++) {
      var worn = this.game.data.getItem(equipped[i]);
      if (!worn) continue;
      rows.push({
        type: "entry",
        label: worn.name,
        right: this.texts.unequipLabel || "",
        color: t.cursorColor,
        value: { action: "unequip", index: i }
      });
    }

    // 持ち物の中の装備品
    var slots = this.game.inventory.getSlots();
    for (i = 0; i < slots.length; i++) {
      var item = this.game.data.getItem(slots[i].itemId);
      if (!item || !item.equip) continue;
      rows.push({
        type: "entry",
        label: item.name,
        right: "x" + slots[i].count,
        value: { action: "equip", itemId: item.id }
      });
    }
    return rows;
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
        : (this.texts.inventoryFull || null);
    } else {
      var item = this.game.data.getItem(choice.itemId);
      this._notice = this.game.equipItem(monster, choice.itemId)
        ? fill(this.texts.equipped, { name: monster.getName(), item: item.name })
        : (this.texts.inventoryFull || null);
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
      return;
    }

    var monster = party.get(index);
    if (!monster) return;

    if (!this.game.depositToStorage(index)) {
      this._notice = this.texts.storageFull || null;
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
    var changes = this._statChanges(monster, unequipping ? [] : [itemId]);

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

    this.panel.drawText(monster.getName() + "  Lv" + monster.level, textX, rect.y + 22);

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
    var lh = t.lineHeight || 18;

    this.panel.drawText(monster.getName(), x, y);
    y += lh;

    var nature = monster.getNature();
    this.panel.drawText(
      (this.texts.natureLabel || "nature") + ": " + (nature ? nature.name : "-"),
      x, y, { color: t.subTextColor, font: t.smallFont });
    y += lh;

    this.panel.drawText("HP " + monster.currentHp + "/" + monster.getMaxHp(),
      x, y, { color: t.subTextColor, font: t.smallFont });
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

    // 装備
    y += 4;
    this.panel.drawText(this.texts.equipLabel || "equipment", x, y, { font: t.smallFont });
    y += lh;

    var equipped = monster.equipment || [];
    if (equipped.length === 0) {
      this.panel.drawText("・" + (this.texts.noEquip || "-"), x, y,
        { color: t.hintColor, font: t.smallFont });
      return;
    }

    for (i = 0; i < equipped.length; i++) {
      var item = this.game.data.getItem(equipped[i]);
      this.panel.drawText("・" + (item ? item.name : equipped[i]), x, y,
        { color: t.subTextColor, font: t.smallFont });
      y += lh;
    }

    this._renderResistances(monster, x, y + 4, rect);
  };

  /**
   * 全属性の耐性を、2列の表にして出す。
   *
   * ★ ここで出すのは monster.getResistance()。
   *   種族の耐性だけでなく、装備の resistBonus（炎よけの札・宵よけの札）まで
   *   足したあとの値なので、「着けたらどう変わるか」がこの画面で分かる。
   *   0（等倍）の属性も省かずに並べる —— 何が等倍なのかも知りたい情報のため。
   */
  PartyScene.prototype._renderResistances = function (monster, x, y, rect) {
    if (!monster.getResistance) return;

    var t = this.theme;
    var lh = t.lineHeight || 18;
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

      var text = element.name + " " + (value > 0 ? "+" : "") + value;
      var col = i % 2;
      this.panel.drawText(text, x + col * colWidth, y,
        { color: color, font: t.smallFont });

      if (col === 1) y += lh;
    }
  };

  /** そのモンスターが実際に持っている特性の定義を並べる（1体あたりの上限を反映） */
  PartyScene.prototype._getAbilities = function (monster) {
    if (!NS.AbilitySystem) return [];
    if (!this._abilitySystem) this._abilitySystem = new NS.AbilitySystem(this.game.data);
    return this._abilitySystem.getAbilities(monster);
  };

  NS.PartyScene = PartyScene;
})(window.MyGame);
