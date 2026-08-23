/**
 * DexScene.js
 * 図鑑画面。モンスター図鑑とアイテム図鑑を左右キーで切り替える。
 *
 * どちらも「まだ発見していないもの」は ??? で伏せて表示し、
 * 全体の中でどれだけ集まったかが分かるようにしている。
 * 発見の記録は Discovery が持つ。
 *
 * 一覧は分類（categories.js）ごとに区切って並べる。
 * 配置は data/ui.js の dex、文言は data/messages.js の dex で管理する。
 *
 * ▼ 右側の詳細について
 * 説明が長いと枠に収まらないため、いったん「行の配列」を組み立ててから
 * 入る分だけ描く。決定キーで詳細へカーソルを移すと、上下でスクロールできる。
 */
(function (NS) {
  "use strict";

  /**
   * 表の並び。
   * モンスター・アイテム・特性は「出会ったもの」を集める図鑑、
   * 性格・加護は「どんなものがあるか」を確かめる一覧（最初から全部見える）。
   */
  var TABS = ["monsters", "items", "abilities", "natures", "blessings"];

  /**
   * @param {MyGame.Game} game
   * @param {object} returnScene 閉じたときに戻るシーン
   */
  function DexScene(game, returnScene) {
    this.game = game;
    this.returnScene = returnScene;

    var ui = game.data.ui || {};
    this.theme = ui.theme || {};
    this.layout = ui.dex || {};
    this.texts = (game.data.messages || {}).dex || {};

    this.panel = new NS.Panel(game.ctx, this.theme);
    this.sprites = new NS.SpriteRenderer(game.ctx, game.assets);
    this.renderer = new NS.Renderer(game.ctx);
    this.list = new NS.ScrollList(this.panel, this.layout.list);
    this.backButton = new NS.BackButton(this.panel, game.data);
    this.abilitySystem = new NS.AbilitySystem(game.data);

    this.tabIndex = 0;
    this.focus = "list";     // "list"（一覧を選ぶ）/ "detail"（説明を読む）
    this.detailScroll = 0;   // 詳細の表示開始行

    this._rebuildList();
  }

  DexScene.prototype.enter = function () {
    this._rebuildList();
    this.focus = "list";
    this.detailScroll = 0;
  };

  DexScene.prototype.getTab = function () { return TABS[this.tabIndex]; };

  // --- 一覧の組み立て ---

  DexScene.prototype._rebuildList = function () {
    var tab = this.getTab();
    var rows;

    if (tab === "monsters") rows = this._buildMonsterRows();
    else if (tab === "items") rows = this._buildItemRows();
    else if (tab === "abilities") rows = this._buildAbilityRows();
    else if (tab === "natures") rows = this._buildNatureRows();
    else rows = this._buildBlessingRows();

    this.list.setRows(rows);
  };

  /** 性格を並べる（分類が無いので見出し無しの一覧） */
  DexScene.prototype._buildNatureRows = function () {
    return flatRows(this.game.data.natures, function (id, nature) {
      return { label: nature.name, value: id };
    });
  };

  /** 加護を並べる（出やすさは言葉で右に出す） */
  DexScene.prototype._buildBlessingRows = function () {
    var data = this.game.data;
    return flatRows(data.blessings, function (id, blessing) {
      var rarity = NS.BlessingSystem.getRarity(data, blessing);
      return {
        label: blessing.name,
        right: rarity.label,
        rightColor: rarity.color,
        value: id
      };
    });
  };

  /**
   * 特性が判明しているか。
   * その特性を持つモンスターを1体でも仲間にしていれば分かる、という扱い。
   * （モンスター図鑑でも、特性は仲間にしたときだけ見えるようにしてある）
   * @param {string} abilityId
   */
  DexScene.prototype._isAbilityKnown = function (abilityId) {
    return this._ownersOf(abilityId, true).length > 0;
  };

  /**
   * その特性を持つモンスターを探す。
   * @param {string} abilityId
   * @param {boolean} caughtOnly 仲間にしたものだけに絞るか
   */
  DexScene.prototype._ownersOf = function (abilityId, caughtOnly) {
    var monsters = this.game.data.monsters || {};
    var discovery = this.game.discovery;
    var result = [];

    for (var id in monsters) {
      if (!Object.prototype.hasOwnProperty.call(monsters, id)) continue;
      var abilities = this._effectiveAbilities(monsters[id]);
      if (abilities.indexOf(abilityId) < 0) continue;
      if (caughtOnly && !discovery.isMonsterCaught(id)) continue;
      result.push(monsters[id]);
    }
    return result;
  };

  /** 実際に効いている特性のidだけを返す（1体あたりの上限を反映する） */
  DexScene.prototype._effectiveAbilities = function (species) {
    var list = this.abilitySystem.resolveAbilities(species);
    var ids = [];
    for (var i = 0; i < list.length; i++) ids.push(list[i].id);
    return ids;
  };

  /** 特性を分類ごとに並べる */
  DexScene.prototype._buildAbilityRows = function () {
    var data = this.game.data;
    var categories = (data.categories || {}).ability || {};

    return buildRows(data.abilities, categories, "category", function (id, ability) {
      var known = this._isAbilityKnown(id);
      return {
        label: known ? ability.name : (this.texts.unknownName || "???"),
        right: known ? (this.texts.knownLabel || "") : "",
        value: id
      };
    }.bind(this));
  };

  /** モンスターを分類（family）ごとに並べる */
  DexScene.prototype._buildMonsterRows = function () {
    var data = this.game.data;
    var discovery = this.game.discovery;
    var families = (data.categories || {}).monster || {};

    return buildRows(data.monsters, families, "family", function (id, monster) {
      var seen = discovery.isMonsterSeen(id);
      var caught = discovery.isMonsterCaught(id);
      return {
        label: seen ? monster.name : (this.texts.unknownName || "???"),
        right: caught ? (this.texts.caughtLabel || "") : (seen ? (this.texts.seenLabel || "") : ""),
        value: id
      };
    }.bind(this));
  };

  /** アイテムを分類（category）ごとに並べる */
  DexScene.prototype._buildItemRows = function () {
    var data = this.game.data;
    var discovery = this.game.discovery;
    var categories = (data.categories || {}).item || {};

    return buildRows(data.items, categories, "category", function (id, item) {
      var obtained = discovery.isItemObtained(id);
      return {
        label: obtained ? item.name : (this.texts.unknownName || "???"),
        right: obtained ? (this.texts.obtainedLabel || "") : "",
        value: id
      };
    }.bind(this));
  };

  // --- 更新 ---

  DexScene.prototype.update = function () {
    var input = this.game.input;

    // 「戻る」ボタンはどの状態でも押せる
    if (this.backButton.handleInput(input)) {
      this.game.scenes.change(this.returnScene);
      return;
    }

    // 説明を読んでいる間は、上下がスクロールになる
    if (this.focus === "detail") {
      this._updateDetailFocus(input);
      return;
    }

    if (input.isPressed("left")) this._changeTab(-1);
    if (input.isPressed("right")) this._changeTab(1);
    if (this._clickedTab(input)) return;

    // 説明の上でホイールを回したら、そのままスクロールする
    if (this._scrollDetailByWheel(input)) return;

    // 一覧を動かしたら、詳細は先頭から読み直す
    if (this.list.handleInput(input)) this.detailScroll = 0;

    // 説明が枠に収まりきらないときだけ、読むモードに入れる
    var confirmed = input.isPressed("confirm") || this.list.clickedEntry(input);
    if (confirmed && this._canScrollDetail()) {
      this.focus = "detail";
      return;
    }

    if (input.isPressed("cancel")) {
      this.game.scenes.change(this.returnScene);
    }
  };

  DexScene.prototype._updateDetailFocus = function (input) {
    var max = this._maxDetailScroll();

    if (input.isPressed("up")) this.detailScroll = Math.max(0, this.detailScroll - 1);
    if (input.isPressed("down")) this.detailScroll = Math.min(max, this.detailScroll + 1);

    // 読んでいる間は、枠の外で回してもスクロールできるようにする
    this._applyWheel(input.getPointer ? input.getPointer().wheel : 0);

    if (input.isPressed("cancel") || input.isPressed("confirm")) {
      this.focus = "list";
      this.detailScroll = 0;
    }
  };

  /**
   * 説明の上でホイールを回したときのスクロール。
   * 一覧を選んでいる状態でも、読むモードに入らずそのまま読み進められる。
   * @returns {boolean} スクロールしたか
   */
  DexScene.prototype._scrollDetailByWheel = function (input) {
    if (!input.getPointer) return false;

    var pointer = input.getPointer();
    if (!pointer.wheel || !pointer.inside) return false;
    if (!NS.Panel.containsPoint(this.layout.detail, pointer)) return false;

    return this._applyWheel(pointer.wheel);
  };

  /** スクロール量を加える（範囲内に収める） */
  DexScene.prototype._applyWheel = function (wheel) {
    if (!wheel) return false;

    var max = this._maxDetailScroll();
    var next = Math.max(0, Math.min(max, this.detailScroll + wheel));
    if (next === this.detailScroll) return false;

    this.detailScroll = next;
    return true;
  };

  /**
   * 詳細の中身と、何行入るかを測る。
   *
   * 描画のときだけ測っていると、更新の順番によっては
   * 1つ前の内容の行数でスクロール量を判断してしまう。
   * そうならないよう、更新でも描画でもこの結果を使う。
   *
   * @returns {{content:object|null, top:number, bottom:number, visible:number, total:number}}
   */
  DexScene.prototype._measureDetail = function () {
    var rect = this.layout.detail;
    var t = this.theme;
    var lh = t.lineHeight || 18;

    var tab = this.getTab();
    var content;
    if (tab === "monsters") content = this._buildMonsterDetail();
    else if (tab === "items") content = this._buildItemDetail();
    else if (tab === "abilities") content = this._buildAbilityDetail();
    else if (tab === "natures") content = this._buildNatureDetail();
    else content = this._buildBlessingDetail();

    var origin = this.panel.innerOrigin(rect);
    var top = origin.y + 20;

    // スプライトは枠の上部に固定し、その下だけをスクロールさせる
    if (content && content.sprite) top = origin.y + (rect.spriteSize || 72) + 26;

    var bottom = rect.y + rect.h - (t.padding || 8);
    var lines = (content && content.lines) || [];

    return {
      content: content,
      top: top,
      bottom: bottom,
      visible: Math.max(1, Math.floor((bottom - top) / lh) + 1),
      total: lines.length
    };
  };

  /** 詳細をどこまで下げられるか（0 なら全部見えている） */
  DexScene.prototype._maxDetailScroll = function () {
    var m = this._measureDetail();
    return Math.max(0, m.total - m.visible);
  };

  DexScene.prototype._canScrollDetail = function () {
    return this._maxDetailScroll() > 0;
  };

  DexScene.prototype._changeTab = function (direction) {
    this.tabIndex = (this.tabIndex + direction + TABS.length) % TABS.length;
    this.detailScroll = 0;
    this._rebuildList();
  };

  /** 上部のタブをマウスで押したか（押されたらその表へ切り替える） */
  DexScene.prototype._clickedTab = function (input) {
    if (!input.getPointer || !input.getPointer().clicked) return false;

    var T = this.layout.tabs;
    if (!T) return false;

    var pointer = input.getPointer();
    for (var i = 0; i < TABS.length; i++) {
      var rect = { x: T.x + (T.w + T.gap) * i, y: T.y, w: T.w, h: T.h };
      if (!NS.Panel.containsPoint(rect, pointer)) continue;

      if (i !== this.tabIndex) {
        this.tabIndex = i;
        this.detailScroll = 0;
        this._rebuildList();
      }
      return true;
    }
    return false;
  };

  // --- 描画 ---

  DexScene.prototype.render = function (ctx) {
    var w = this.game.canvas.width;
    var h = this.game.canvas.height;

    this.renderer.clear(this.layout.background || "#000000", w, h);

    this._renderHeading();
    this._renderTabs();
    this._renderProgress();
    this.list.render();

    this._renderDetail();
    this._renderHint();
    this.backButton.render();
  };

  /**
   * 右側の詳細。
   * 中身は各タブが「行の配列」で作り、ここが枠に入る分だけ描く。
   */
  DexScene.prototype._renderDetail = function () {
    var rect = this.layout.detail;
    this.panel.drawBox(rect);

    var m = this._measureDetail();
    if (!m.content) return;

    var t = this.theme;
    var origin = this.panel.innerOrigin(rect);
    var lh = t.lineHeight || 18;

    if (m.content.sprite) {
      var size = rect.spriteSize || 72;
      this.sprites.draw(m.content.sprite, rect.x + (rect.w - size) / 2, origin.y + 6, size, size);
    }

    // 内容が変わって行数が減った場合に、行き過ぎたままにならないようにする
    var max = Math.max(0, m.total - m.visible);
    if (this.detailScroll > max) this.detailScroll = max;

    var lines = m.content.lines || [];
    var end = Math.min(lines.length, this.detailScroll + m.visible);
    var y = m.top;

    for (var i = this.detailScroll; i < end; i++) {
      var line = lines[i];
      this.panel.drawText(line.text, line.center ? (rect.x + rect.w / 2) : origin.x, y,
        {
          align: line.center ? "center" : "left",
          font: line.font || t.smallFont,
          color: line.color || t.subTextColor
        });
      y += lh;
    }

    this._renderDetailScrollMarks(rect, m);
  };

  /** 続きがあることを示す印。読むモードのときは色を変えて分かるようにする */
  DexScene.prototype._renderDetailScrollMarks = function (rect, m) {
    var t = this.theme;
    var color = (this.focus === "detail") ? t.cursorColor : t.hintColor;

    if (this.detailScroll > 0) {
      this.panel.drawText("▲", rect.x + rect.w - 16, m.top - 4,
        { font: t.smallFont, color: color });
    }
    if (this.detailScroll + m.visible < m.total) {
      this.panel.drawText("▼", rect.x + rect.w - 16, m.bottom,
        { font: t.smallFont, color: color });
    }
  };

  DexScene.prototype._renderHeading = function () {
    var title = this.layout.title || {};
    var subtitle = this.layout.subtitle || {};

    this.panel.drawText(this.texts.title || "", title.x, title.y,
      { font: title.font, color: title.color });
    this.panel.drawText(this.texts.subtitle || "", subtitle.x, subtitle.y,
      { font: subtitle.font, color: subtitle.color });
  };

  /** タブ（モンスター／アイテム） */
  DexScene.prototype._renderTabs = function () {
    var T = this.layout.tabs;
    if (!T) return;

    var t = this.theme;
    var labels = [this.texts.tabMonsters || "", this.texts.tabItems || "",
                  this.texts.tabAbilities || "", this.texts.tabNatures || "",
                  this.texts.tabBlessings || ""];

    for (var i = 0; i < labels.length; i++) {
      var x = T.x + (T.w + T.gap) * i;
      var selected = (i === this.tabIndex);

      this.panel.ctx.fillStyle = selected ? "rgba(74,107,168,0.35)" : "rgba(8,10,20,0.6)";
      this.panel.ctx.fillRect(x, T.y, T.w, T.h);
      this.panel.ctx.strokeStyle = selected ? (t.cursorColor || "#ffd75e") : (t.panelBorder || "#3a4266");
      this.panel.ctx.lineWidth = 1;
      this.panel.ctx.strokeRect(x + 0.5, T.y + 0.5, T.w - 1, T.h - 1);

      this.panel.drawText(labels[i], x + T.w / 2, T.y + 20,
        { align: "center", font: t.smallFont,
          color: selected ? t.cursorColor : t.subTextColor });
    }
  };

  /** 収集率（発見数／総数） */
  DexScene.prototype._renderProgress = function () {
    var pos = this.layout.progress;
    if (!pos) return;

    var data = this.game.data;
    var discovery = this.game.discovery;
    var text;

    var tab = this.getTab();
    if (tab === "monsters") {
      text = (this.texts.caughtLabel || "") + " " + discovery.countMonstersCaught() +
             " / " + (this.texts.seenLabel || "") + " " + discovery.countMonstersSeen() +
             " / " + Object.keys(data.monsters).length;
    } else if (tab === "items") {
      text = (this.texts.obtainedLabel || "") + " " + discovery.countItemsObtained() +
             " / " + Object.keys(data.items).length;
    } else if (tab === "abilities") {
      var ids = Object.keys(data.abilities || {});
      var known = 0;
      for (var i = 0; i < ids.length; i++) {
        if (this._isAbilityKnown(ids[i])) known++;
      }
      text = (this.texts.knownLabel || "") + " " + known + " / " + ids.length;
    } else {
      // 性格・加護は集めるものではないので、総数だけを出す
      var all = (tab === "natures") ? data.natures : data.blessings;
      text = (this.texts.totalLabel || "") + " " + Object.keys(all || {}).length;
    }

    this.panel.drawText(text, pos.x, pos.y,
      { align: "right", font: this.theme.smallFont, color: this.theme.subTextColor });
  };

  /**
   * モンスターの詳細を行の配列にする。
   * @returns {{sprite:string, lines:object[]}|null}
   */
  DexScene.prototype._buildMonsterDetail = function () {
    var selected = this.list.getSelected();
    if (!selected) return null;

    var data = this.game.data;
    var discovery = this.game.discovery;
    var monster = data.getMonsterData(selected.value);
    if (!monster) return null;

    var t = this.theme;
    var lines = [];

    // 未発見なら伏せる
    if (!discovery.isMonsterSeen(selected.value)) {
      lines.push({ text: this.texts.unknownName || "???", font: t.font, color: t.textColor });
      lines.push({ text: "" });
      lines.push({ text: this.texts.unknownDesc || "" });
      return { sprite: null, lines: lines };
    }

    var partyTexts = (data.messages || {}).party || {};
    var family = ((data.categories || {}).monster || {})[monster.family];
    var element = (data.elements || {})[monster.element];

    lines.push({ text: monster.name, font: t.font, color: t.textColor, center: true });
    lines.push({ text: (this.texts.familyLabel || "") + " " + (family ? family.name : "-"),
                 color: family ? family.color : null });
    lines.push({ text: (this.texts.elementLabel || "") + " " + (element ? element.name : "-"),
                 color: element ? element.color : null });
    lines.push({ text: "HP " + monster.baseHp });
    lines.push({ text: (partyTexts.attackLabel || "") + " " + monster.baseAttack });
    lines.push({ text: (partyTexts.defenseLabel || "") + " " + monster.baseDefense });
    lines.push({ text: (partyTexts.speedLabel || "") + " " + monster.baseSpeed });
    lines.push({ text: "PP " + (monster.basePp || 0) });

    // 仲間にしたものだけ、より詳しい情報と説明を見せる
    if (!discovery.isMonsterCaught(selected.value)) {
      lines.push({ text: this.texts.notCaught || "", color: t.hintColor });
      return { sprite: monster.sprite, lines: lines };
    }

    lines.push({ text: (this.texts.scoutLabel || "") + " " +
                       Math.round((monster.scoutRate || 0) * 100) + "%" });

    // 耐性（0でないものだけ）
    this._pushResistanceLines(lines, monster, data);

    // 特性（アビリティ）は名前と効果の説明を出す
    var abilities = this.abilitySystem.resolveAbilities(monster);
    for (var a = 0; a < abilities.length; a++) {
      lines.push({ text: "" });
      lines.push({ text: "【" + abilities[a].name + "】", color: t.cursorColor });
      this._pushWrapped(lines, abilities[a].description);
    }

    lines.push({ text: "" });
    this._pushWrapped(lines, monster.description);

    return { sprite: monster.sprite, lines: lines };
  };

  /** 0以外の耐性を「属性 +2」の形で並べる */
  DexScene.prototype._pushResistanceLines = function (lines, monster, data) {
    var resistances = monster.resistances || {};
    var elements = data.elements || {};
    var entries = [];

    for (var id in resistances) {
      if (!Object.prototype.hasOwnProperty.call(resistances, id)) continue;
      if (!resistances[id]) continue;   // 0（等倍）は出さない
      entries.push({ id: id, value: resistances[id] });
    }
    if (entries.length === 0) return;

    lines.push({ text: "" });
    lines.push({ text: this.texts.resistanceLabel || "", color: this.theme.cursorColor });

    for (var i = 0; i < entries.length; i++) {
      var element = elements[entries[i].id];
      var value = entries[i].value;
      lines.push({
        text: "・" + (element ? element.name : entries[i].id) +
              " " + (value > 0 ? "+" : "") + value,
        color: element ? element.color : null
      });
    }
  };

  /** アイテムの詳細を行の配列にする */
  DexScene.prototype._buildItemDetail = function () {
    var selected = this.list.getSelected();
    if (!selected) return null;

    var data = this.game.data;
    var item = data.getItem(selected.value);
    if (!item) return null;

    var t = this.theme;
    var lines = [];

    if (!this.game.discovery.isItemObtained(selected.value)) {
      lines.push({ text: this.texts.unknownName || "???", font: t.font, color: t.textColor });
      lines.push({ text: "" });
      lines.push({ text: this.texts.unknownItem || "" });
      return { sprite: null, lines: lines };
    }

    lines.push({ text: item.name, font: t.font, color: t.textColor });

    var category = ((data.categories || {}).item || {})[item.category];
    if (category) lines.push({ text: category.name, color: category.color });

    lines.push({ text: "所持 " + this.game.inventory.getCount(item.id) });
    lines.push({ text: "" });
    this._pushWrapped(lines, item.description);

    return { sprite: null, lines: lines };
  };

  /** 特性の詳細を行の配列にする */
  DexScene.prototype._buildAbilityDetail = function () {
    var selected = this.list.getSelected();
    if (!selected) return null;

    var data = this.game.data;
    var ability = (data.abilities || {})[selected.value];
    if (!ability) return null;

    var t = this.theme;
    var lines = [];

    // まだ持っているモンスターを仲間にしていなければ伏せる
    if (!this._isAbilityKnown(selected.value)) {
      lines.push({ text: this.texts.unknownName || "???", font: t.font, color: t.textColor });
      lines.push({ text: "" });
      lines.push({ text: this.texts.unknownAbility || "" });
      return { sprite: null, lines: lines };
    }

    lines.push({ text: ability.name, font: t.font, color: t.textColor });

    var category = ((data.categories || {}).ability || {})[ability.category];
    if (category) lines.push({ text: category.name, color: category.color });

    lines.push({ text: "" });
    this._pushWrapped(lines, ability.description);

    // 仲間にしたモンスターのうち、この特性を持つもの
    var owners = this._ownersOf(selected.value, true);
    if (owners.length > 0) {
      lines.push({ text: "" });
      lines.push({ text: this.texts.ownerLabel || "", color: t.cursorColor });
      for (var i = 0; i < owners.length; i++) {
        lines.push({ text: "・" + owners[i].name });
      }
    }
    return { sprite: null, lines: lines };
  };

  /**
   * 性格の詳細。どのステータスが上がり下がりするかを並べる。
   * 倍率1.0（変化なし）の項目も、比べやすいように出す。
   */
  DexScene.prototype._buildNatureDetail = function () {
    var selected = this.list.getSelected();
    if (!selected) return null;

    var nature = (this.game.data.natures || {})[selected.value];
    if (!nature) return null;

    var t = this.theme;
    var party = (this.game.data.messages || {}).party || {};
    var lines = [];

    lines.push({ text: nature.name, font: t.font, color: t.textColor });
    lines.push({ text: "" });

    var stats = [
      { key: "hp", label: "HP" },
      { key: "attack", label: party.attackLabel || "攻撃" },
      { key: "defense", label: party.defenseLabel || "防御" },
      { key: "speed", label: party.speedLabel || "素早さ" }
    ];

    for (var i = 0; i < stats.length; i++) {
      var value = (nature[stats[i].key] === undefined) ? 1 : nature[stats[i].key];
      var color = t.subTextColor;
      if (value > 1) color = t.hpBarHigh || "#5fd18c";
      else if (value < 1) color = t.hpBarLow || "#e8542a";

      lines.push({ text: stats[i].label + " ×" + value, color: color });
    }

    lines.push({ text: "" });
    this._pushWrapped(lines, this.texts.natureNote);

    return { sprite: null, lines: lines };
  };

  /** 加護の詳細。効果と出やすさを出す */
  DexScene.prototype._buildBlessingDetail = function () {
    var selected = this.list.getSelected();
    if (!selected) return null;

    var blessing = (this.game.data.blessings || {})[selected.value];
    if (!blessing) return null;

    var t = this.theme;
    var lines = [];

    lines.push({ text: blessing.name, font: t.font, color: t.textColor });
    lines.push({ text: "" });
    this._pushWrapped(lines, blessing.description);

    lines.push({ text: "" });
    lines.push({ text: this.texts.effectLabel || "", color: t.cursorColor });

    var effects = blessing.effects || [];
    for (var i = 0; i < effects.length; i++) {
      var text = NS.EffectSystem.describeEffect(effects[i], this.game.data);
      if (text) lines.push({ text: "・" + text });
    }

    var rarity = NS.BlessingSystem.getRarity(this.game.data, blessing);
    lines.push({ text: "" });
    lines.push({
      text: (this.texts.rarityLabel || "") + rarity.label,
      color: rarity.color || t.hintColor
    });

    lines.push({ text: "" });
    this._pushWrapped(lines, this.texts.blessingNote);

    return { sprite: null, lines: lines };
  };

  /** 長い文章を折り返して行に足す */
  DexScene.prototype._pushWrapped = function (lines, text) {
    var chars = (this.layout.detail || {}).charsPerLine || 15;
    var wrapped = wrapText(text || "", chars);
    for (var i = 0; i < wrapped.length; i++) lines.push({ text: wrapped[i] });
  };

  DexScene.prototype._renderHint = function () {
    var pos = this.layout.hint || { x: 48, y: 570 };
    var hint;

    if (this.focus === "detail") hint = this.texts.hintDetail;
    else if (this._canScrollDetail()) hint = this.texts.hintScrollable;
    else hint = this.texts.hint;

    this.panel.drawText(hint || "", pos.x, pos.y,
      { font: this.theme.smallFont, color: this.theme.hintColor });
  };

  // --- 共通ヘルパ ---

  /**
   * 定義一覧を分類ごとに区切った行の配列にする。
   * @param {object} definitions id → 定義
   * @param {object} categories 分類の定義
   * @param {string} categoryKey 定義の中で分類idを指すキー名
   * @param {function} makeEntry (id, definition) → 行の内容
   */
  function buildRows(definitions, categories, categoryKey, makeEntry) {
    var groups = {};

    for (var id in definitions) {
      if (!Object.prototype.hasOwnProperty.call(definitions, id)) continue;
      var categoryId = definitions[id][categoryKey] || "other";
      if (!groups[categoryId]) groups[categoryId] = [];
      groups[categoryId].push(id);
    }

    var ordered = Object.keys(groups).sort(function (a, b) {
      var oa = categories[a] ? categories[a].order : 999;
      var ob = categories[b] ? categories[b].order : 999;
      return oa - ob;
    });

    var rows = [];
    for (var i = 0; i < ordered.length; i++) {
      var category = categories[ordered[i]] || { name: ordered[i] };
      rows.push({ type: "header", label: "- " + category.name + " -", color: category.color });

      var ids = groups[ordered[i]];
      for (var j = 0; j < ids.length; j++) {
        var entry = makeEntry(ids[j], definitions[ids[j]]);
        entry.type = "entry";
        rows.push(entry);
      }
    }
    return rows;
  }

  /**
   * 分類で区切らず、そのまま並べた行を作る。
   * 性格・加護のように分類を持たないものに使う。
   */
  function flatRows(definitions, makeEntry) {
    var rows = [];

    for (var id in definitions) {
      if (!Object.prototype.hasOwnProperty.call(definitions, id)) continue;
      var entry = makeEntry(id, definitions[id]);
      entry.type = "entry";
      rows.push(entry);
    }
    return rows;
  }

  /** 文字数で折り返す（等幅フォント前提の簡易処理） */
  function wrapText(text, charsPerLine) {
    var lines = [];
    for (var i = 0; i < text.length; i += charsPerLine) {
      lines.push(text.substr(i, charsPerLine));
    }
    return lines;
  }

  NS.DexScene = DexScene;
})(window.MyGame);
