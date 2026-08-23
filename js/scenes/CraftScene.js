/**
 * CraftScene.js
 * 拠点の工房。素材とゴールドから、道具や装備を作る。
 *
 * 作れるかどうかの判断はすべて CraftSystem が行い、この画面は表示と入力だけを担当する。
 * 配置は data/ui.js の craft、文言は data/messages.js の craft で管理する。
 *
 * ▼ 操作
 *   ↑↓   … 作るものを選ぶ
 *   決定   … 「作りますか?」のはい／いいえへ
 *   Esc    … 1つ前へ戻る（一覧なら拠点へ）
 */
(function (NS) {
  "use strict";

  var NOTICE_DURATION = 1800;

  /**
   * @param {MyGame.Game} game
   * @param {object} returnScene 閉じたときに戻るシーン
   */
  function CraftScene(game, returnScene) {
    this.game = game;
    this.returnScene = returnScene;

    var ui = game.data.ui || {};
    this.theme = ui.theme || {};
    this.layout = ui.craft || {};
    this.texts = (game.data.messages || {}).craft || {};

    this.panel = new NS.Panel(game.ctx, this.theme);
    this.renderer = new NS.Renderer(game.ctx);
    this.list = new NS.ScrollList(this.panel, this.layout.list);
    this.confirmMenu = new NS.CommandMenu(this.panel, this.layout.confirmMenu);
    this.backButton = new NS.BackButton(this.panel, game.data);
    this.craftSystem = new NS.CraftSystem(game.data);

    this.phase = "list";   // "list" | "confirm"
    this._notice = null;
    this._noticeTimer = 0;

    this._rebuildList();
  }

  CraftScene.prototype.enter = function () {
    this.phase = "list";
    this._notice = null;
    this._rebuildList();
  };

  // --- 一覧の組み立て ---

  CraftScene.prototype._rebuildList = function () {
    var recipes = this.craftSystem.getRecipes(this.game.clearedDungeons);
    var t = this.theme;
    var rows = [];

    for (var i = 0; i < recipes.length; i++) {
      var item = this.game.data.getItem(recipes[i].result.item);
      var ready = this.craftSystem.canCraft(this.game, recipes[i]).ok;

      rows.push({
        type: "entry",
        label: item.name,
        // 費用が要るレシピだけ右側に金額を出す
        right: (recipes[i].gold || 0) > 0 ? (recipes[i].gold + "G") : "",
        // 作れないものは薄く表示する
        color: ready ? t.textColor : t.hintColor,
        value: recipes[i]
      });
    }
    this.list.setRows(rows);
  };

  CraftScene.prototype._selectedRecipe = function () {
    var selected = this.list.getSelected();
    return selected ? selected.value : null;
  };

  // --- 更新 ---

  CraftScene.prototype.update = function (dt) {
    var input = this.game.input;

    if (this._noticeTimer > 0) {
      this._noticeTimer -= dt;
      if (this._noticeTimer <= 0) this._notice = null;
    }

    // 「戻る」ボタン。確認の途中なら一覧へ戻す
    if (this.backButton.handleInput(input)) {
      if (this.phase === "confirm") this.phase = "list";
      else this.game.scenes.change(this.returnScene);
      return;
    }

    if (this.phase === "confirm") { this._updateConfirm(input); return; }

    // ScrollList が扱うのは上下移動だけ。決定・取消はここで見る
    this.list.handleInput(input);

    if (input.isPressed("cancel")) {
      this.game.scenes.change(this.returnScene);
      return;
    }
    // マウスで行を押した場合も決定と同じ扱いにする
    if (input.isPressed("confirm") || this.list.clickedEntry(input)) this._onConfirm();
  };

  CraftScene.prototype._onConfirm = function () {
    var recipe = this._selectedRecipe();
    if (!recipe) return;

    // 作れないなら理由を出すだけ（確認画面には入らない）
    var check = this.craftSystem.canCraft(this.game, recipe);
    if (!check.ok) {
      this._showNotice(this.texts[check.reason] || check.reason);
      return;
    }

    this.confirmMenu.setItems([
      { label: this.texts.yes || "はい", value: "yes" },
      { label: this.texts.no || "いいえ", value: "no" }
    ]);
    this.phase = "confirm";
  };

  CraftScene.prototype._updateConfirm = function (input) {
    var result = this.confirmMenu.handleInput(input);
    if (!result) return;

    if (result.type === "cancel" || result.value === "no") {
      this.phase = "list";
      return;
    }
    if (result.value === "yes") this._craft();
  };

  CraftScene.prototype._craft = function () {
    var recipe = this._selectedRecipe();
    if (!recipe) return;

    var item = this.game.data.getItem(recipe.result.item);
    var result = this.craftSystem.craft(this.game, recipe);

    this._showNotice(result.success
      ? fill(this.texts.crafted, { name: item.name, count: result.count })
      : (this.texts[result.reason] || result.reason));

    this.phase = "list";

    // 素材と所持金が変わるので一覧を作り直す（カーソル位置は保つ）
    var index = this.list.index;
    this._rebuildList();
    if (index < this.list.rows.length) this.list.index = index;
  };

  CraftScene.prototype._showNotice = function (text) {
    this._notice = text;
    this._noticeTimer = NOTICE_DURATION;
  };

  // --- 描画 ---

  CraftScene.prototype.render = function (ctx) {
    var w = this.game.canvas.width;
    var h = this.game.canvas.height;

    this.renderer.clear(this.layout.background || "#000000", w, h);

    this._renderHeading();
    this._renderGold();
    this.list.render();
    this._renderDetail();

    if (this.phase === "confirm") this.confirmMenu.render();

    this._renderNotice();
    this._renderHint();
    this.backButton.render();
  };

  CraftScene.prototype._renderHeading = function () {
    var title = this.layout.title || {};
    var subtitle = this.layout.subtitle || {};

    this.panel.drawText(this.texts.title || "", title.x, title.y,
      { font: title.font, color: title.color });
    this.panel.drawText(this.texts.subtitle || "", subtitle.x, subtitle.y,
      { font: subtitle.font, color: subtitle.color });
  };

  CraftScene.prototype._renderGold = function () {
    var pos = this.layout.gold;
    if (!pos) return;

    var template = ((this.game.data.messages || {}).home || {}).gold || "{amount}G";
    this.panel.drawText(template.replace("{amount}", this.game.gold || 0), pos.x, pos.y,
      { align: "right", font: pos.font || this.theme.font,
        color: pos.color || this.theme.cursorColor });
  };

  /**
   * 右側：必要な素材と、できるものの説明。
   * 足りていない素材は色を変えて、ひと目で分かるようにする。
   */
  CraftScene.prototype._renderDetail = function () {
    var rect = this.layout.detail;
    if (!rect) return;

    this.panel.drawBox(rect);

    var recipe = this._selectedRecipe();
    if (!recipe) {
      this.panel.drawText(this.texts.empty || "", rect.x + (this.theme.padding || 8),
        rect.y + 30, { font: this.theme.smallFont, color: this.theme.hintColor });
      return;
    }

    var t = this.theme;
    var origin = this.panel.innerOrigin(rect);
    var lh = t.lineHeight || 18;
    var y = origin.y + 20;
    var i;

    var item = this.game.data.getItem(recipe.result.item);
    var count = recipe.result.count || 1;

    this.panel.drawText(item.name + (count > 1 ? (" ×" + count) : ""), origin.x, y);
    y += lh + 6;

    // 必要な素材
    this.panel.drawText(this.texts.materialLabel || "", origin.x, y,
      { font: t.smallFont, color: t.cursorColor });
    y += lh;

    var status = this.craftSystem.getMaterialStatus(this.game, recipe);
    for (i = 0; i < status.length; i++) {
      var line = "・" + status[i].item.name + "  " + status[i].owned + "/" + status[i].need;
      this.panel.drawText(line, origin.x, y,
        { font: t.smallFont, color: status[i].enough ? t.subTextColor : (t.hpBarLow || "#e8542a") });
      y += lh;
    }

    // 費用（無料のレシピでは行そのものを出さない）
    var gold = recipe.gold || 0;
    if (gold > 0) {
      y += 4;
      this.panel.drawText(this.texts.costLabel || "", origin.x, y, { font: t.smallFont });
      this.panel.drawText(gold + "G", rect.x + rect.w - (t.padding || 8), y,
        { align: "right", font: t.smallFont,
          color: this.game.canAfford(gold) ? t.subTextColor : (t.hpBarLow || "#e8542a") });
      y += lh;
    }
    y += 8;

    // できるものの説明
    var lines = wrapText(item.description || "", rect.charsPerLine || 18);
    for (i = 0; i < lines.length; i++) {
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
  CraftScene.prototype._describeEffect = function (effect) {
    return NS.EffectSystem.describeEffect(effect, this.game.data);
  };

  CraftScene.prototype._renderNotice = function () {
    if (!this._notice) return;
    var pos = this.layout.notice || { x: 400, y: 526 };

    this.panel.drawText(this._notice, pos.x, pos.y,
      { align: "center", color: this.theme.cursorColor });
  };

  CraftScene.prototype._renderHint = function () {
    var pos = this.layout.hint || { x: 48, y: 570 };
    var hint = (this.phase === "confirm") ? this.texts.hintConfirm : this.texts.hint;

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

  NS.CraftScene = CraftScene;
})(window.MyGame);
