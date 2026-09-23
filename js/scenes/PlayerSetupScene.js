/**
 * PlayerSetupScene.js
 * 主人公の名前と服の色を決める画面。
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
 * 配置は data/ui.js の playerSetup、文言は data/messages.js の playerSetup。
 * 色そのものは data/player.js の appearance.colors。
 */
(function (NS) {
  "use strict";

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

    this.colors = NS.PlayerLook.colorsOf(game.data);

    // いまの値から始める（あとから変えるときは、今の名前と色が入っている）
    this.name = game.getPlayerName();
    this.colorIndex = this._indexOfColor(game.getPlayerColor());

    // "main" … 名前と色を選ぶ / "name" … 文字盤を開いている
    this.phase = "main";
    // main での選択位置：0 = 名前、1 = 色、2 = これで決定
    this.row = 0;
  }

  PlayerSetupScene.prototype.enter = function () {
    this.phase = "main";
  };

  PlayerSetupScene.prototype._indexOfColor = function (colorId) {
    for (var i = 0; i < this.colors.length; i++) {
      if (this.colors[i].id === colorId) return i;
    }
    return 0;
  };

  PlayerSetupScene.prototype._currentColor = function () {
    return this.colors[this.colorIndex] || null;
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

    if (input.isPressed("up")) this.row = (this.row + 2) % 3;
    if (input.isPressed("down")) this.row = (this.row + 1) % 3;

    // 色は左右で送る。色の行にいなくても替えられると迷うので、行にいるときだけ
    if (this.row === 1 && this.colors.length > 0) {
      if (input.isPressed("left")) {
        this.colorIndex = (this.colorIndex - 1 + this.colors.length) % this.colors.length;
      }
      if (input.isPressed("right")) {
        this.colorIndex = (this.colorIndex + 1) % this.colors.length;
      }
    }

    this._handleMouse(input);

    if (input.isPressed("confirm")) this._activateRow();
  };

  /** 色見本を直接押せるようにする */
  PlayerSetupScene.prototype._handleMouse = function (input) {
    if (!input.getPointer) return;

    var pointer = input.getPointer();
    if (!pointer.inside) return;

    for (var i = 0; i < this.colors.length; i++) {
      if (!NS.Panel.containsPoint(this._swatchRect(i), pointer)) continue;
      if (pointer.moved || pointer.clicked) { this.row = 1; this.colorIndex = i; }
      return;
    }

    // 名前の欄と決定のボタン
    var nameRect = this._rowRect(0);
    var doneRect = this._doneRect();
    if (NS.Panel.containsPoint(nameRect, pointer)) {
      if (pointer.moved) this.row = 0;
      if (pointer.clicked) this._openNameInput();
    } else if (NS.Panel.containsPoint(doneRect, pointer)) {
      if (pointer.moved) this.row = 2;
      if (pointer.clicked) this._finish();
    }
  };

  PlayerSetupScene.prototype._activateRow = function () {
    if (this.row === 0) this._openNameInput();
    else if (this.row === 2) this._finish();
    // 色の行で決定を押しても何もしない（左右で選ぶものなので）
  };

  PlayerSetupScene.prototype._openNameInput = function () {
    this.nameInput.open(this.name, this.texts.nameTitle || "");
    this.phase = "name";
  };

  /** 決めた内容をゲームへ移して、次の画面へ進む */
  PlayerSetupScene.prototype._finish = function () {
    var color = this._currentColor();

    this.game.playerName = this.name;
    this.game.playerColor = color ? color.id : null;

    if (this.mode === "edit") {
      this.game.scenes.change(this.returnScene);
      return;
    }
    // 新規のときは、ここから冒険が始まる
    this.game.scenes.change(new NS.HomeScene(this.game));
  };

  // --- 位置 ---

  PlayerSetupScene.prototype._rowRect = function (index) {
    var r = this.layout.rows || { x: 300, y: 150, w: 420, h: 52, gap: 12 };
    return { x: r.x, y: r.y + (r.h + (r.gap || 0)) * index, w: r.w, h: r.h };
  };

  /** 色見本1つぶんの四角 */
  PlayerSetupScene.prototype._swatchRect = function (index) {
    var s = this.layout.swatch || { x: 316, y: 226, size: 34, gap: 10 };
    return {
      x: s.x + (s.size + (s.gap || 0)) * index,
      y: s.y, w: s.size, h: s.size
    };
  };

  PlayerSetupScene.prototype._doneRect = function () {
    return this.layout.done || { x: 300, y: 300, w: 420, h: 44 };
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

  PlayerSetupScene.prototype._renderNameRow = function () {
    var rect = this._rowRect(0);
    var t = this.theme;
    var selected = (this.row === 0) && this.phase === "main";

    this.panel.drawBox(rect);
    if (selected) this._outline(rect);

    var origin = this.panel.innerOrigin(rect);
    this.panel.drawText(this.texts.nameLabel || "なまえ", origin.x, origin.y + 20,
      { font: t.smallFont, color: t.subTextColor });
    this.panel.drawText(this.name || "", origin.x + 96, origin.y + 22,
      { color: selected ? t.cursorColor : t.textColor });
    this.panel.drawText(this.texts.nameAction || "", rect.x + rect.w - 12, origin.y + 22,
      { align: "right", font: t.smallFont, color: t.hintColor });
  };

  PlayerSetupScene.prototype._renderColorRow = function () {
    var rect = this._rowRect(1);
    var t = this.theme;
    var selected = (this.row === 1) && this.phase === "main";

    this.panel.drawBox(rect);
    if (selected) this._outline(rect);

    var origin = this.panel.innerOrigin(rect);
    this.panel.drawText(this.texts.colorLabel || "ふくの色", origin.x, origin.y + 20,
      { font: t.smallFont, color: t.subTextColor });

    var ctx = this.panel.ctx;
    for (var i = 0; i < this.colors.length; i++) {
      var sw = this._swatchRect(i);
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

  PlayerSetupScene.prototype._renderDone = function () {
    var rect = this._doneRect();
    var t = this.theme;
    var selected = (this.row === 2) && this.phase === "main";

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
