/**
 * PlayerSetupScene.js
 * 主人公の名前・服の色・性別・一人称を決める画面。
 *
 * ▼ 2つの入口から同じ画面を使う
 *   ・新しく始めるとき（セーブファイルを選んだ直後）
 *   ・拠点の「設定」から、あとで変えたいとき
 *   決めるものは同じなので、画面を2つ作らない。
 *   違うのは**やめたときにどこへ戻るか**だけ（mode）。
 *
 * ▼ mode
 *   "new"  … 新規。やめてもタイトルへは戻さず、そのまま決めてもらう
 *            （名前と色が決まらないまま冒険に出ると、あとで直す入口が遠い）
 *   "edit" … あとから変更。Esc でそのまま戻れる
 *
 * ▼ 色は「選んだ姿」をその場で見せる
 *   色の名前だけ並べても、着せたところが想像できない。
 *   選んでいる色の絵を大きく出し、歩かせて見せる。
 *
 * ▼ 性別と一人称は、ゲームの進み方には何も影響しない（data/player.js）
 *   一人称だけは、物語の台詞の {me} に差し込まれる。
 *
 * 配置は data/ui.js の playerSetup、文言は data/messages.js の playerSetup。
 * 色・性別・一人称の選択肢は data/player.js。
 */
(function (NS) {
  "use strict";

  // 上から並ぶ欄。left/right で選ぶのは color / gender / firstPerson の3つ
  var ROWS = ["name", "color", "gender", "firstPerson", "done"];

  function PlayerSetupScene(game, returnScene, mode) {
    this.game = game;
    this.returnScene = returnScene;
    this.mode = (mode === "edit") ? "edit" : "new";

    var ui = game.data.ui || {};
    this.theme = ui.theme || {};
    this.layout = ui.playerSetup || {};
    this.texts = (game.data.messages || {}).playerSetup || {};

    this.panel = new NS.Panel(game.ctx, this.theme);
    this.sprites = new NS.SpriteRenderer(game.ctx, game.assets);
    this.renderer = new NS.Renderer(game.ctx);
    this.nameInput = new NS.NameInput(this.panel, game.data);
    this.backButton = new NS.BackButton(this.panel, game.data);

    var player = game.data.player || {};
    this.colors = NS.PlayerLook.colorsOf(game.data);
    this.genders = player.genders || [];
    this.firstPersons = player.firstPersons || [];

    // いまの値から始める（あとから変えるときは、今の名前と色が入っている）
    this.name = game.getPlayerName();
    this.colorIndex = this._indexOfColor(game.getPlayerColor());
    this.genderIndex = indexById(this.genders, game.getPlayerGender());
    this.firstPersonIndex = Math.max(0, this.firstPersons.indexOf(game.getPlayerFirstPerson()));

    // "main" … 欄を選ぶ / "name" … 文字盤を開いている
    this.phase = "main";
    this.row = 0;   // ROWS の何番目か
  }

  PlayerSetupScene.prototype.enter = function () {
    this.phase = "main";
  };

  PlayerSetupScene.prototype._indexOfColor = function (colorId) {
    return indexById(this.colors, colorId);
  };

  PlayerSetupScene.prototype._currentColor = function () {
    return this.colors[this.colorIndex] || null;
  };

  PlayerSetupScene.prototype._rowKind = function () {
    return ROWS[this.row];
  };

  function indexById(list, id) {
    for (var i = 0; i < list.length; i++) {
      if (list[i].id === id) return i;
    }
    return 0;
  }

  // --- 選択肢（左右で送るもの）---

  /**
   * 左右で選ぶ欄の中身。欄ごとに「いくつあるか」「いま何番目か」を1か所で扱う。
   * @returns {{count:number, get:function, set:function}|null}
   */
  PlayerSetupScene.prototype._choiceOf = function (kind) {
    var self = this;
    if (kind === "color") {
      return { count: this.colors.length,
               get: function () { return self.colorIndex; },
               set: function (i) { self.colorIndex = i; } };
    }
    if (kind === "gender") {
      return { count: this.genders.length,
               get: function () { return self.genderIndex; },
               set: function (i) { self.genderIndex = i; } };
    }
    if (kind === "firstPerson") {
      return { count: this.firstPersons.length,
               get: function () { return self.firstPersonIndex; },
               set: function (i) { self.firstPersonIndex = i; } };
    }
    return null;
  };

  /** 性別・一人称の札に書く文字 */
  PlayerSetupScene.prototype._chipLabels = function (kind) {
    if (kind === "gender") {
      var names = [];
      for (var i = 0; i < this.genders.length; i++) names.push(this.genders[i].name || "");
      return names;
    }
    if (kind === "firstPerson") return this.firstPersons.slice();
    return [];
  };

  // --- 更新 ---

  PlayerSetupScene.prototype.update = function () {
    if (this.phase === "name") this._updateName();
    else this._updateMain();
  };

  PlayerSetupScene.prototype._updateName = function () {
    var result = this.nameInput.handleInput(this.game.input);
    if (!result) return;

    if (result.type === "done") {
      // 空のまま決めた場合は、既定の呼び名に戻す
      this.name = result.name || (this.game.data.player || {}).defaultName || "";
    }
    this.phase = "main";
  };

  PlayerSetupScene.prototype._updateMain = function () {
    var input = this.game.input;

    // あとから変更のときだけ、そのまま戻れる
    if (this.mode === "edit" &&
        (this.backButton.handleInput(input) || input.isPressed("cancel"))) {
      this.game.scenes.change(this.returnScene);
      return;
    }

    if (input.isPressed("up")) this.row = (this.row + ROWS.length - 1) % ROWS.length;
    if (input.isPressed("down")) this.row = (this.row + 1) % ROWS.length;

    // 左右は、選ぶものがある欄にいるときだけ効く（別の欄にいて替わると迷う）
    var choice = this._choiceOf(this._rowKind());
    if (choice && choice.count > 0) {
      if (input.isPressed("left")) choice.set((choice.get() - 1 + choice.count) % choice.count);
      if (input.isPressed("right")) choice.set((choice.get() + 1) % choice.count);
    }

    this._handleMouse(input);

    if (input.isPressed("confirm")) this._activateRow();
  };

  /** 色見本・札・名前の欄・決定のボタンを直接押せるようにする */
  PlayerSetupScene.prototype._handleMouse = function (input) {
    if (!input.getPointer) return;

    var pointer = input.getPointer();
    if (!pointer.inside) return;

    // 色見本・性別・一人称の札
    var kinds = ["color", "gender", "firstPerson"];
    for (var k = 0; k < kinds.length; k++) {
      var choice = this._choiceOf(kinds[k]);
      for (var i = 0; i < choice.count; i++) {
        if (!NS.Panel.containsPoint(this._optionRect(kinds[k], i), pointer)) continue;
        if (pointer.moved || pointer.clicked) {
          this.row = ROWS.indexOf(kinds[k]);
          choice.set(i);
        }
        return;
      }
    }

    // 名前の欄と決定のボタン
    if (NS.Panel.containsPoint(this._rowRect(ROWS.indexOf("name")), pointer)) {
      if (pointer.moved) this.row = ROWS.indexOf("name");
      if (pointer.clicked) this._openNameInput();
    } else if (NS.Panel.containsPoint(this._doneRect(), pointer)) {
      if (pointer.moved) this.row = ROWS.indexOf("done");
      if (pointer.clicked) this._finish();
    }
  };

  PlayerSetupScene.prototype._activateRow = function () {
    var kind = this._rowKind();
    if (kind === "name") this._openNameInput();
    else if (kind === "done") this._finish();
    // 選ぶ欄で決定を押しても何もしない（左右で選ぶものなので）
  };

  PlayerSetupScene.prototype._openNameInput = function () {
    this.nameInput.open(this.name, this.texts.nameTitle || "");
    this.phase = "name";
  };

  /** 決めた内容をゲームへ移して、次の画面へ進む */
  PlayerSetupScene.prototype._finish = function () {
    var color = this._currentColor();
    var gender = this.genders[this.genderIndex];

    this.game.playerName = this.name;
    this.game.playerColor = color ? color.id : null;
    this.game.playerGender = gender ? gender.id : null;
    this.game.playerFirstPerson = this.firstPersons[this.firstPersonIndex] || null;

    if (this.mode === "edit") {
      this.game.scenes.change(this.returnScene);
      return;
    }
    // 新規のときは、ここから冒険が始まる。オープニングを流してから拠点へ
    this.game.playStory("newGame", new NS.HomeScene(this.game));
  };

  // --- 位置 ---

  PlayerSetupScene.prototype._rowRect = function (index) {
    var r = this.layout.rows || { x: 310, y: 122, w: 442, h: 62, gap: 12 };
    return { x: r.x, y: r.y + (r.h + (r.gap || 0)) * index, w: r.w, h: r.h };
  };

  /** 選ぶ欄の、i 番目の選択肢の四角（色は色見本、性別・一人称は札） */
  PlayerSetupScene.prototype._optionRect = function (kind, i) {
    if (kind === "color") {
      var s = this.layout.swatch || { x: 420, y: 210, size: 34, gap: 12 };
      return { x: s.x + (s.size + (s.gap || 0)) * i, y: s.y, w: s.size, h: s.size };
    }
    var c = this.layout.chip || { x: 420, w: 48, h: 30, gap: 6 };
    var row = this._rowRect(ROWS.indexOf(kind));
    return {
      x: c.x + (c.w + (c.gap || 0)) * i,
      y: row.y + Math.floor((row.h - c.h) / 2),
      w: c.w, h: c.h
    };
  };

  PlayerSetupScene.prototype._doneRect = function () {
    return this.layout.done || { x: 310, y: 426, w: 442, h: 52 };
  };

  // --- 描画 ---

  PlayerSetupScene.prototype.render = function (ctx) {
    var L = this.layout;

    this.renderer.clear(L.background || "#0a0f1c",
      this.game.canvas.width, this.game.canvas.height);

    var title = L.title || {};
    var subtitle = L.subtitle || {};
    var heading = (this.mode === "new") ? this.texts.titleNew : this.texts.titleEdit;

    this.panel.drawText(heading || "", title.x, title.y,
      { font: title.font, color: title.color });
    this.panel.drawText(this.texts.subtitle || "", subtitle.x, subtitle.y,
      { font: subtitle.font, color: subtitle.color });

    this._renderPreview();
    this._renderNameRow();
    this._renderColorRow();
    this._renderChipRow("gender", this.texts.genderLabel || "性別");
    this._renderChipRow("firstPerson", this.texts.firstPersonLabel || "一人称");
    this._renderDone();
    this._renderHint();

    if (this.mode === "edit") this.backButton.render();

    // 文字盤は、決めているあいだ全部の上に重ねる
    if (this.phase === "name") this.nameInput.render(this.game.clock);
  };

  /** 左：選んでいる色で、実際に歩いているところを見せる */
  PlayerSetupScene.prototype._renderPreview = function () {
    var p = this.layout.preview;
    if (!p) return;

    this.panel.drawBox({ x: p.boxX, y: p.boxY, w: p.boxW, h: p.boxH });

    var color = this._currentColor();
    var sprites = NS.PlayerLook.spritesFor(this.game.data, color ? color.id : null);
    var look = NS.PlayerLook.appearanceOf(this.game.data);

    // 立ち姿ではなく歩いているところを出す。実際に動く姿が分かるように
    var motion = NS.Motion.forSprite(this.game.data, sprites,
      look.walkMotion || "playerWalk", this.game.clock, 0);

    this.sprites.drawMotion(sprites,
      p.x - p.size / 2, p.y - p.size / 2, p.size, p.size, motion);

    if (color) {
      this.panel.drawText(color.name || "", p.x, p.labelY,
        { align: "center", color: this.theme.subTextColor });
    }
  };

  /** 欄の枠と、左の見出し。選んでいれば枠を光らせる */
  PlayerSetupScene.prototype._renderRowFrame = function (kind, label) {
    var rect = this._rowRect(ROWS.indexOf(kind));
    var selected = (this._rowKind() === kind) && this.phase === "main";

    this.panel.drawBox(rect);
    if (selected) this._outline(rect);

    var origin = this.panel.innerOrigin(rect);
    this.panel.drawText(label, origin.x, rect.y + rect.h / 2 + 5,
      { font: this.theme.smallFont, color: this.theme.subTextColor });
    return { rect: rect, selected: selected };
  };

  PlayerSetupScene.prototype._renderNameRow = function () {
    var frame = this._renderRowFrame("name", this.texts.nameLabel || "なまえ");
    var rect = frame.rect;
    var t = this.theme;
    var chips = this.layout.chip || { x: 420 };
    var baseY = rect.y + rect.h / 2 + 6;

    this.panel.drawText(this.name || "", chips.x, baseY,
      { color: frame.selected ? t.cursorColor : t.textColor });
    this.panel.drawText(this.texts.nameAction || "", rect.x + rect.w - 12, baseY,
      { align: "right", font: t.smallFont, color: t.hintColor });
  };

  PlayerSetupScene.prototype._renderColorRow = function () {
    this._renderRowFrame("color", this.texts.colorLabel || "ふくの色");
    var t = this.theme;

    var ctx = this.panel.ctx;
    for (var i = 0; i < this.colors.length; i++) {
      var sw = this._optionRect("color", i);
      ctx.save();
      ctx.fillStyle = this.colors[i].base || "#888888";
      ctx.fillRect(sw.x, sw.y, sw.w, sw.h);
      // 選んでいる色だけ枠を付ける。色そのものは変えない（見本なので）
      ctx.strokeStyle = (i === this.colorIndex)
        ? (t.cursorColor || "#ffd75e")
        : (t.panelBorder || "#3a4560");
      ctx.lineWidth = (i === this.colorIndex) ? 3 : 1;
      ctx.strokeRect(sw.x, sw.y, sw.w, sw.h);
      ctx.restore();
    }
  };

  /** 性別・一人称の欄。選択肢を札にして横に並べ、選んでいるものだけ光らせる */
  PlayerSetupScene.prototype._renderChipRow = function (kind, label) {
    this._renderRowFrame(kind, label);

    var t = this.theme;
    var c = this.layout.chip || {};
    var labels = this._chipLabels(kind);
    var current = this._choiceOf(kind).get();
    var ctx = this.panel.ctx;

    for (var i = 0; i < labels.length; i++) {
      var r = this._optionRect(kind, i);
      var on = (i === current);

      ctx.save();
      ctx.strokeStyle = on ? (t.cursorColor || "#ffd75e") : (t.panelBorder || "#3a4560");
      ctx.lineWidth = on ? 2 : 1;
      ctx.strokeRect(r.x + 0.5, r.y + 0.5, r.w - 1, r.h - 1);
      ctx.restore();

      this.panel.drawText(labels[i], r.x + r.w / 2, r.y + r.h / 2 + 5,
        { align: "center", font: c.font || t.smallFont,
          color: on ? (t.cursorColor || "#ffd75e") : t.subTextColor });
    }
  };

  PlayerSetupScene.prototype._renderDone = function () {
    var rect = this._doneRect();
    var t = this.theme;
    var selected = (this._rowKind() === "done") && this.phase === "main";

    this.panel.drawBox(rect);
    if (selected) this._outline(rect);

    var label = (this.mode === "new") ? this.texts.start : this.texts.apply;
    this.panel.drawText(label || "", rect.x + rect.w / 2, rect.y + rect.h / 2 + 6,
      { align: "center", color: selected ? t.cursorColor : t.textColor });
  };

  /** 選んでいる欄を囲む */
  PlayerSetupScene.prototype._outline = function (rect) {
    var ctx = this.panel.ctx;
    ctx.save();
    ctx.strokeStyle = this.theme.cursorColor || "#ffd75e";
    ctx.lineWidth = 2;
    ctx.strokeRect(rect.x + 1, rect.y + 1, rect.w - 2, rect.h - 2);
    ctx.restore();
  };

  PlayerSetupScene.prototype._renderHint = function () {
    var hint = this.layout.hint;
    if (!hint) return;

    var text = (this.phase === "name")
      ? ""   // 文字盤が自分で案内を出す
      : (this.mode === "new" ? this.texts.hintNew : this.texts.hintEdit);

    this.panel.drawText(text || "", hint.x, hint.y,
      { font: this.theme.smallFont, color: this.theme.hintColor });
  };

  NS.PlayerSetupScene = PlayerSetupScene;
})(window.MyGame);
