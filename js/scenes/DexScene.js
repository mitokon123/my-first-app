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
   * モンスター・アイテム・特性・技は「出会ったもの」を集める図鑑、
   * 性格・加護は「どんなものがあるか」を確かめる一覧（最初から全部見える）。
   */
  var TABS = ["monsters", "items", "abilities", "skills", "natures", "blessings"];

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
    else if (tab === "skills") rows = this._buildSkillRows();
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

  /**
   * その加護をもう知っているか。
   *
   * 最初から選択肢に出るもの（locked でないもの）は、いつでも見える。
   * 謎の商人が売っているもの（locked）は、買うまで伏せる。
   * 買わないと一生出会わない加護の名前と効果が、図鑑で先に見えてしまうため。
   */
  DexScene.prototype._isBlessingKnown = function (id, blessing) {
    if (!blessing.locked) return true;
    return !!(this.game.hasBoughtBlessing && this.game.hasBoughtBlessing(id));
  };

  /** 加護を並べる（出やすさは言葉で右に出す） */
  DexScene.prototype._buildBlessingRows = function () {
    var data = this.game.data;
    return flatRows(data.blessings, function (id, blessing) {
      var known = this._isBlessingKnown(id, blessing);
      if (!known) {
        return { label: this.texts.unknownName || "???", value: id };
      }
      var rarity = NS.BlessingSystem.getRarity(data, blessing);
      return {
        label: blessing.name,
        right: rarity.label,
        rightColor: rarity.color,
        value: id
      };
    }.bind(this));
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

  /**
   * 図鑑に載せる技だけを集める。
   * 通常攻撃のように showInDex: false と書かれたものは外す
   * （覚える技ではなくコマンドなので、集める対象にならない）。
   */
  DexScene.prototype._dexSkills = function () {
    var skills = this.game.data.skills || {};
    var result = {};

    for (var id in skills) {
      if (!Object.prototype.hasOwnProperty.call(skills, id)) continue;
      if (skills[id].showInDex === false) continue;
      result[id] = skills[id];
    }
    return result;
  };

  /**
   * その技が判明しているか。
   *
   * ★ 条件は「仲間が実際に覚えたか」。種族を捕まえただけでは判明しない。
   *   技はレベルで覚えるので、捕獲を条件にしていたころは
   *   Lv1のスライムを1体捕まえただけで、Lv11で覚える「キュア」まで出ていた。
   *   特性は種族そのものが持つものなので、そちらは捕獲だけで判明してよい。
   *
   * 記録は Discovery が持つ（逃がした個体が覚えていた技も残る）。
   * @param {string} skillId
   */
  DexScene.prototype._isSkillKnown = function (skillId) {
    var discovery = this.game.discovery;
    return !!(discovery && discovery.isSkillLearned(skillId));
  };

  /**
   * その技を覚えるモンスターを探す。
   * @param {string} skillId
   * @param {boolean} caughtOnly 仲間にしたものだけに絞るか
   * @returns {object[]} [{ monster, level }] level は覚えるレベル
   */
  DexScene.prototype._learnersOf = function (skillId, caughtOnly) {
    var monsters = this.game.data.monsters || {};
    var discovery = this.game.discovery;
    var result = [];

    for (var id in monsters) {
      if (!Object.prototype.hasOwnProperty.call(monsters, id)) continue;
      var level = learnLevel(monsters[id], skillId);
      if (level === null) continue;
      if (caughtOnly && !discovery.isMonsterCaught(id)) continue;
      result.push({ monster: monsters[id], level: level });
    }
    return result;
  };

  /**
   * 技を属性ごとに並べる。
   * 分類を持たないので、属性そのものを見出しに使う（色も属性の色になる）。
   */
  DexScene.prototype._buildSkillRows = function () {
    var data = this.game.data;

    return buildRows(this._dexSkills(), data.elements || {}, "element", function (id, skill) {
      var known = this._isSkillKnown(id);
      return {
        label: known ? skill.name : (this.texts.unknownName || "???"),
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

  /**
   * アイテムを分類（category）ごとに並べる。
   * 装備は「装備」のくくりの中で、さらに武器・防具・アクセサリーに分ける（見やすさのため）
   */
  DexScene.prototype._buildItemRows = function () {
    var data = this.game.data;
    var discovery = this.game.discovery;
    var categories = (data.categories || {}).item || {};

    var subgroups = {
      keyOf: function (id, item) { return item.equip ? NS.EffectSystem.slotOf(item) : null; },
      defs: (data.categories || {}).equipSlot || {}
    };

    return buildRows(data.items, categories, "category", function (id, item) {
      var obtained = discovery.isItemObtained(id);
      return {
        label: obtained ? item.name : (this.texts.unknownName || "???"),
        right: obtained ? (this.texts.obtainedLabel || "") : "",
        value: id
      };
    }.bind(this), subgroups);
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
    else if (tab === "skills") content = this._buildSkillDetail();
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
    this.list.render(this.game.clock);

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
      // 種族ごとの大きさ（sizeScale）。下端をそろえて上へ伸ばすので、
      // 大きい相手でも下の説明文に食い込まない
      var base = rect.spriteSize || 72;
      var size = Math.round(base * (m.content.sizeScale || 1));
      // 図鑑でも種族ごとの動きを見せる（どんな動き方をするのか分かるように）
      this.sprites.drawMotion(m.content.sprite,
        rect.x + (rect.w - size) / 2, origin.y + 6 + (base - size), size, size,
        NS.Motion.forSprite(this.game.data, m.content.sprite, m.content.motion,
          this.game.clock, 0));
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
                  this.texts.tabAbilities || "", this.texts.tabSkills || "",
                  this.texts.tabNatures || "", this.texts.tabBlessings || ""];

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
    } else if (tab === "abilities" || tab === "skills") {
      var isKnown = (tab === "abilities")
        ? this._isAbilityKnown.bind(this)
        : this._isSkillKnown.bind(this);
      var ids = Object.keys((tab === "abilities" ? data.abilities : this._dexSkills()) || {});
      var known = 0;
      for (var i = 0; i < ids.length; i++) {
        if (isKnown(ids[i])) known++;
      }
      text = (this.texts.knownLabel || "") + " " + known + " / " + ids.length;
    } else if (tab === "blessings") {
      // 買わないと出会えない加護があるので、集めた数として出す
      var blessings = data.blessings || {};
      var ids = Object.keys(blessings);
      var owned = 0;
      for (var b = 0; b < ids.length; b++) {
        if (this._isBlessingKnown(ids[b], blessings[ids[b]])) owned++;
      }
      text = (this.texts.knownLabel || "") + " " + owned + " / " + ids.length;
    } else {
      // 性格は集めるものではないので、総数だけを出す
      text = (this.texts.totalLabel || "") + " " + Object.keys(data.natures || {}).length;
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
      return { sprite: monster.sprite, motion: monster.motion,
               sizeScale: monster.sizeScale || 1, lines: lines };
    }

    lines.push({ text: (this.texts.scoutLabel || "") + " " +
                       Math.round((monster.scoutRate || 0) * 100) + "%" });

    // 耐性（0でないものだけ）
    this._pushResistanceLines(lines, monster, data);

    // 落とすもの。一度でも仲間にすれば、そのモンスターから取れるものが全て分かる
    this._pushDropLines(lines, monster, data);

    // 特性（アビリティ）は名前と効果の説明を出す
    var abilities = this.abilitySystem.resolveAbilities(monster);
    for (var a = 0; a < abilities.length; a++) {
      lines.push({ text: "" });
      lines.push({ text: "【" + abilities[a].name + "】", color: t.cursorColor });
      this._pushWrapped(lines, abilities[a].description);
    }

    lines.push({ text: "" });
    this._pushWrapped(lines, monster.description);

    // 愛情度で書き足される記録。その種族でいちばん深まった段階までを出す
    this._pushAffectionRecords(lines, monster, selected.value);

    return { sprite: monster.sprite, motion: monster.motion, lines: lines };
  };

  /**
   * 愛情度の段階ごとに書き足される、主人公の記録（data/monsters.js の records）。
   * 段階の id（used / trust / bond）をキーに書く。まだ書いていない段階は何も出さない。
   * どこまで読めるかは、その種族でいちばん深まった段階（Discovery.getAffectionStage）
   */
  DexScene.prototype._pushAffectionRecords = function (lines, monster, speciesId) {
    var records = monster.records || {};
    var stages = (this.game.data.affection || {}).stages || [];
    var reached = this.game.discovery.getAffectionStage
      ? this.game.discovery.getAffectionStage(speciesId) : 0;

    for (var i = 1; i <= reached && i < stages.length; i++) {
      var text = records[stages[i].id];
      if (!text) continue;
      lines.push({ text: "" });
      lines.push({ text: (this.texts.recordLabel || "― {stage} ―").replace("{stage}", stages[i].name),
                   color: this.theme.cursorColor });
      this._pushWrapped(lines, text);
    }
  };

  /**
   * 落とすものを「・薬草  15%」の形で並べる。
   *
   * 一度でも仲間にすれば、その種族から取れるものが全て見えるようになる。
   * まだ拾ったことのない品も出す —— 何が取れるか分からないまま
   * 同じ相手を延々と倒し続ける、という状態を避けるため。
   * （落とさない種族では、見出しごと出さない）
   */
  DexScene.prototype._pushDropLines = function (lines, monster, data) {
    var drops = monster.drops || [];
    if (drops.length === 0) return;

    var t = this.theme;
    lines.push({ text: "" });
    lines.push({ text: this.texts.dropLabel || "", color: t.cursorColor });

    for (var i = 0; i < drops.length; i++) {
      var item = data.getItem(drops[i].item);
      if (!item) continue;

      // 個数に幅があるものは「（1〜2個）」を添える
      var min = (drops[i].min === undefined) ? 1 : drops[i].min;
      var max = (drops[i].max === undefined) ? min : drops[i].max;
      var count = (max > min) ? ("（" + min + "〜" + max + "個）") : "";

      lines.push({
        text: "・" + item.name + count + "  " + Math.round((drops[i].rate || 0) * 100) + "%",
        color: t.subTextColor
      });
    }
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
    if (category) {
      // 装備は「装備・武器」のように枠まで出す
      var label = category.name;
      if (item.equip) label += "・" + NS.EffectSystem.slotName(item, data);
      lines.push({ text: label, color: category.color });
    }

    lines.push({ text: "所持 " + this.game.inventory.getCount(item.id) });
    lines.push({ text: "" });
    this._pushWrapped(lines, item.description);

    // 装備なら効果
    if (item.equip) {
      lines.push({ text: "" });
      lines.push({ text: this.texts.effectLabel || "", color: t.cursorColor });
      var effects = item.equip.effects || [];
      for (var e = 0; e < effects.length; e++) {
        var text = NS.EffectSystem.describeEffect(effects[e], data);
        if (text) lines.push({ text: "・" + text });
      }
    }

    // 誰が落とすか・どこで拾えるか
    var sources = this._itemSources(item.id);
    lines.push({ text: "" });
    lines.push({ text: this.texts.sourceLabel || "", color: t.cursorColor });
    if (sources.length === 0) {
      lines.push({ text: "・" + (this.texts.sourceNone || ""), color: t.hintColor });
    }
    for (var s = 0; s < sources.length; s++) lines.push({ text: "・" + sources[s] });

    return { sprite: null, lines: lines };
  };

  /**
   * そのアイテムの出どころ（落とすモンスター・宝箱）を文にして返す。
   *
   * ★ まだ会っていないモンスターは名前を伏せる（???）。
   *   図鑑に載っていない相手が「何を落とすか」で先に分かってしまうと、
   *   出会いの楽しみが減る。会っていれば確率まで出す。
   * 店・工房は出さない（そちらの画面で分かるので）。
   */
  DexScene.prototype._itemSources = function (itemId) {
    var data = this.game.data;
    var discovery = this.game.discovery;
    var texts = this.texts;
    var lines = [];
    var id;

    // 落とすモンスター（主も種族の drops に書いてある）
    var monsters = data.monsters || {};
    for (id in monsters) {
      if (!Object.prototype.hasOwnProperty.call(monsters, id)) continue;
      var drops = monsters[id].drops || [];
      for (var i = 0; i < drops.length; i++) {
        if (drops[i].item !== itemId) continue;
        var seen = discovery.isMonsterSeen(id);
        lines.push(fillText(texts.sourceDrop || "{name}  {rate}%", {
          name: seen ? monsters[id].name : (texts.unknownName || "???"),
          rate: seen ? Math.round((drops[i].rate || 0) * 100) : "?"
        }));
      }
    }

    // 宝箱。どこでも出る中身と、その場所だけの中身
    var chest = ((data.features || {}).chest || {}).effect || {};
    if (tableHas(chest.table, itemId)) lines.push(texts.sourceChest || "宝箱");

    var dungeons = data.dungeons || {};
    for (id in dungeons) {
      if (!Object.prototype.hasOwnProperty.call(dungeons, id)) continue;
      var tables = dungeons[id].featureTables || {};
      if (tableHas(tables.chest, itemId)) {
        lines.push(fillText(texts.sourceChestAt || "宝箱（{name}）", { name: dungeons[id].name }));
      }
    }
    return lines;
  };

  function tableHas(table, itemId) {
    for (var i = 0; i < (table || []).length; i++) {
      if (table[i].item === itemId) return true;
    }
    return false;
  }

  function fillText(template, values) {
    return (template || "").replace(/\{(\w+)\}/g, function (m, key) {
      return (values[key] !== undefined) ? values[key] : m;
    });
  }

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

  /** 技の詳細を行の配列にする */
  DexScene.prototype._buildSkillDetail = function () {
    var selected = this.list.getSelected();
    if (!selected) return null;

    var data = this.game.data;
    var skill = data.getSkill(selected.value);
    if (!skill) return null;

    var t = this.theme;
    var lines = [];

    // まだ覚えるモンスターを仲間にしていなければ伏せる
    if (!this._isSkillKnown(selected.value)) {
      lines.push({ text: this.texts.unknownName || "???", font: t.font, color: t.textColor });
      lines.push({ text: "" });
      lines.push({ text: this.texts.unknownSkill || "" });
      return { sprite: null, lines: lines };
    }

    lines.push({ text: skill.name, font: t.font, color: t.textColor });

    var element = (data.elements || {})[skill.element];
    lines.push({ text: (this.texts.elementLabel || "") + " " + (element ? element.name : "-"),
                 color: element ? element.color : null });

    // 威力0の意味は技によって違う。
    //   ふつうの技 … 通常攻撃と同じ計算なので「-」と出す
    //   支援の技（回復・バフ・デバフ） … そもそもダメージを与えないので、行ごと出さない
    //     （キュアに「威力 -」と並ぶと、殴る技のように見えてしまうため）
    var isSupport = !skill.power && (skill.modifier || skill.heal);
    if (skill.power) {
      lines.push({ text: (this.texts.powerLabel || "") + " " + skill.power });
    } else if (!isSupport) {
      lines.push({ text: (this.texts.powerLabel || "") + " " + (this.texts.powerNormal || "-") });
    }
    lines.push({ text: (this.texts.ppLabel || "") + " " + (skill.pp || 0) });

    // accuracy を書いていない技は data/battle.js の既定値で当たる
    var fallback = (data.battle || {}).defaultAccuracy;
    var accuracy = (skill.accuracy === undefined)
      ? ((fallback === undefined) ? 1 : fallback)
      : skill.accuracy;
    lines.push({ text: (this.texts.accuracyLabel || "") + " " +
                       Math.round(accuracy * 100) + "%" });

    if (skill.criticalBonus) {
      lines.push({ text: (this.texts.criticalLabel || "") + " +" +
                         Math.round(skill.criticalBonus * 100) + "%" });
    }

    // 一時的な強化・弱体（バフ／デバフ）。効果の説明は EffectSystem に任せる
    if (skill.modifier) {
      lines.push({ text: "" });
      lines.push({ text: (this.texts.modifierLabel || "") + " " +
                         (this.texts.durationLabel || "{n}ターン")
                           .replace("{n}", skill.modifier.duration || 1),
                   color: t.cursorColor });

      var mods = skill.modifier.effects || [];
      for (var m = 0; m < mods.length; m++) {
        var line = NS.EffectSystem.describeEffect(mods[m], data);
        if (line) lines.push({ text: "・" + line });
      }
      if (skill.target === "self") {
        lines.push({ text: this.texts.selfTarget || "", color: t.hintColor });
      }
    }

    // 状態異常をあたえる技。何をどれくらいの確率で入れるかを出す。
    // 色は data/statuses.js のものを使う（戦闘中の印と同じ色）
    if (skill.status) {
      var status = data.getStatus ? data.getStatus(skill.status.id) : null;
      if (status) {
        var chance = (skill.status.chance === undefined) ? 1 : skill.status.chance;
        lines.push({ text: "" });
        lines.push({ text: (this.texts.statusLabel || "") + " " + status.name +
                           "  " + Math.round(chance * 100) + "%",
                     color: status.color || t.cursorColor });
        // 通る確率は相手の耐性で下がる。数字だけ見て決められると誤解を招く
        lines.push({ text: this.texts.statusNote || "", color: t.hintColor });
      }
    }

    lines.push({ text: "" });
    this._pushWrapped(lines, skill.description);

    // 仲間にしたモンスターのうち、この技を覚えるもの
    var learners = this._learnersOf(selected.value, true);
    if (learners.length > 0) {
      lines.push({ text: "" });
      lines.push({ text: this.texts.learnerLabel || "", color: t.cursorColor });
      for (var i = 0; i < learners.length; i++) {
        lines.push({ text: "・" + learners[i].monster.name + " Lv" + learners[i].level });
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

    // まだ買っていない加護は、名前も効果も出さない。
    // 一覧で伏せておいて詳細で見えたら、伏せた意味がない
    if (!this._isBlessingKnown(selected.value, blessing)) {
      lines.push({ text: this.texts.unknownName || "???", font: t.font, color: t.textColor });
      lines.push({ text: "" });
      this._pushWrapped(lines, this.texts.blessingLockedNote);
      return { sprite: null, lines: lines };
    }

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
   * @param {object} [subgroups] 分類の中をさらに分けるとき（装備を武器・防具・アクセサリーに）
   *   { keyOf: (id, definition) → 小分類id か null, defs: { id: { name, order, color } } }
   *   小分類の見出しは分類の見出しより一段小さく（"武器" のように）出す
   */
  function buildRows(definitions, categories, categoryKey, makeEntry, subgroups) {
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
      if (subgroups) ids = sortBySubgroup(ids, definitions, subgroups);

      var currentSub = null;
      for (var j = 0; j < ids.length; j++) {
        var sub = subgroups ? subgroups.keyOf(ids[j], definitions[ids[j]]) : null;
        if (sub && sub !== currentSub) {
          var def = subgroups.defs[sub] || { name: sub };
          rows.push({ type: "header", label: "  " + def.name, color: def.color || category.color });
          currentSub = sub;
        }
        var entry = makeEntry(ids[j], definitions[ids[j]]);
        entry.type = "entry";
        rows.push(entry);
      }
    }
    return rows;
  }

  /** 小分類の order 順に並べ替える（小分類の無いものは元の順のまま先頭） */
  function sortBySubgroup(ids, definitions, subgroups) {
    var indexed = ids.map(function (id, index) {
      var sub = subgroups.keyOf(id, definitions[id]);
      var order = (sub && subgroups.defs[sub]) ? subgroups.defs[sub].order : -1;
      return { id: id, order: order, index: index };
    });
    indexed.sort(function (a, b) {
      return (a.order - b.order) || (a.index - b.index);
    });
    return indexed.map(function (x) { return x.id; });
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

  /**
   * その種族がその技を覚えるレベル。覚えないなら null。
   * 同じ技が複数の行に書かれていても、いちばん早いレベルを返す。
   */
  function learnLevel(species, skillId) {
    var learnset = (species && species.learnset) || [];
    var found = null;

    for (var i = 0; i < learnset.length; i++) {
      if (learnset[i].skill !== skillId) continue;
      if (found === null || learnset[i].level < found) found = learnset[i].level;
    }
    return found;
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
