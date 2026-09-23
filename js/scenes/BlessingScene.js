/**
 * BlessingScene.js
 * 階を降りたときに出る「加護を選ぶ」画面。
 *
 * 選んだ加護はそのラン限りで、パーティ全員に掛かる。
 * 候補を選ぶのは BlessingSystem、効果を配るのは Game。この画面は表示と入力だけを行う。
 *
 * ▼ 操作
 *   ↑↓ / マウス … 選ぶ
 *   決定          … その加護を得て、探索へ戻る
 *
 * この画面は取り消せない（必ず1つ選ぶ）。
 *
 * 配置は data/ui.js の blessing、文言は data/messages.js の blessing。
 */
(function (NS) {
  "use strict";

  /**
   * @param {MyGame.Game} game
   * @param {object[]} choices 選ばせる加護（data/blessings.js の定義）
   * @param {object} returnScene 選び終わったら戻るシーン
   */
  function BlessingScene(game, choices, returnScene) {
    this.game = game;
    this.choices = choices || [];
    this.returnScene = returnScene;

    var ui = game.data.ui || {};
    this.theme = ui.theme || {};
    this.layout = ui.blessing || {};
    this.texts = (game.data.messages || {}).blessing || {};

    this.panel = new NS.Panel(game.ctx, this.theme);
    this.renderer = new NS.Renderer(game.ctx);

    this.index = 0;
    this.elapsed = 0;
  }

  BlessingScene.prototype.enter = function () {
    this.index = 0;
    this.elapsed = 0;
  };

  // --- 更新 ---

  BlessingScene.prototype.update = function (dt) {
    this.elapsed += dt;

    var input = this.game.input;
    var count = this.choices.length;
    if (count === 0) {
      this._finish();
      return;
    }

    if (input.isPressed("up")) this.index = (this.index - 1 + count) % count;
    if (input.isPressed("down")) this.index = (this.index + 1) % count;

    // マウス：重ねた候補へ移り、押したら決まる
    var hovered = this._hoveredIndex(input);
    if (hovered >= 0) this.index = hovered;

    var clicked = hovered >= 0 && input.getPointer && input.getPointer().clicked;
    if (input.isPressed("confirm") || clicked) this._choose();
  };

  BlessingScene.prototype._choose = function () {
    var blessing = this.choices[this.index];
    if (blessing) this.game.addBlessing(blessing);
    this._finish();
  };

  BlessingScene.prototype._finish = function () {
    this.game.scenes.change(this.returnScene);
  };

  /** カーソルが乗っている候補の番号（乗っていなければ -1） */
  BlessingScene.prototype._hoveredIndex = function (input) {
    if (!input.getPointer) return -1;

    var pointer = input.getPointer();
    if (!pointer.inside) return -1;
    if (!pointer.moved && !pointer.clicked) return -1;

    for (var i = 0; i < this.choices.length; i++) {
      if (NS.Panel.containsPoint(this._cardRect(i), pointer)) return i;
    }
    return -1;
  };

  /** 候補1つ分の枠 */
  BlessingScene.prototype._cardRect = function (index) {
    var L = this.layout.card || { x: 140, y: 190, w: 520, h: 86, gap: 100 };
    return { x: L.x, y: L.y + L.gap * index, w: L.w, h: L.h };
  };

  // --- 描画 ---

  BlessingScene.prototype.render = function (ctx) {
    var w = this.game.canvas.width;
    var h = this.game.canvas.height;

    this.renderer.clear(this.layout.background || "#0a0f1c", w, h);

    this._renderHeading(w);
    for (var i = 0; i < this.choices.length; i++) this._renderCard(i);
    this._renderShortNote(w);
    this._renderOwned();
    this._renderHint();
  };

  /**
   * 選択肢が満たなかったときの断り書き。
   *
   * 枠は「等級を引いてから、その等級の加護を選ぶ」順で作るので、
   * 引いた等級を1つも編成していないと枠が空になる（BlessingSystem を参照）。
   * 何も言わずに2つしか出さないと不具合に見えるので、理由をその場に出す。
   * ＝「絞り込みすぎている」と気づける唯一の場所。
   */
  BlessingScene.prototype._renderShortNote = function (w) {
    var full = (((this.game.data.run || {}).blessing) || {}).choiceCount || 3;
    if (this.choices.length >= full) return;

    var note = this.texts.fewChoices;
    if (!note) return;

    // いちばん下のカードの少し下に置く（カードの数で位置が変わる）
    var rect = this._cardRect(Math.max(0, this.choices.length - 1));
    this.panel.drawText(note, w / 2, rect.y + rect.h + 26,
      { align: "center", font: this.theme.smallFont, color: this.theme.hintColor });
  };

  BlessingScene.prototype._renderHeading = function (w) {
    var title = this.layout.title || { y: 100 };
    var subtitle = this.layout.subtitle || { y: 130 };

    this.panel.drawText(this.texts.title || "", w / 2, title.y,
      { align: "center", font: title.font || "24px monospace", color: title.color });
    this.panel.drawText(this.texts.subtitle || "", w / 2, subtitle.y,
      { align: "center", font: subtitle.font || this.theme.smallFont,
        color: subtitle.color || this.theme.subTextColor });
  };

  BlessingScene.prototype._renderCard = function (index) {
    var t = this.theme;
    var rect = this._cardRect(index);
    var blessing = this.choices[index];
    var selected = (index === this.index);

    this.panel.drawBox(rect);

    // 選んでいる候補は枠を強調する
    if (selected) {
      this.panel.ctx.strokeStyle = t.cursorColor || "#ffd75e";
      this.panel.ctx.lineWidth = 2;
      this.panel.ctx.strokeRect(rect.x + 1, rect.y + 1, rect.w - 2, rect.h - 2);
      this.panel.drawText("▶", rect.x - 20, rect.y + rect.h / 2 + 5, { color: t.cursorColor });
    }

    var origin = this.panel.innerOrigin(rect);
    this.panel.drawText(blessing.name, origin.x, origin.y + 20,
      { color: selected ? t.cursorColor : t.textColor });
    this.panel.drawText(blessing.description || "", origin.x, origin.y + 44,
      { font: t.smallFont, color: t.subTextColor });
  };

  /** いま受けている加護（重ねて強くなることが分かるように） */
  BlessingScene.prototype._renderOwned = function () {
    var pos = this.layout.owned;
    var run = this.game.run;
    if (!pos || !run) return;

    var owned = run.getBlessings();
    if (owned.length === 0) return;

    var names = [];
    for (var i = 0; i < owned.length; i++) names.push(owned[i].name);

    this.panel.drawText((this.texts.ownedLabel || "") + " " + names.join("、"),
      pos.x, pos.y,
      { align: "center", font: this.theme.smallFont, color: this.theme.hintColor });
  };

  BlessingScene.prototype._renderHint = function () {
    var pos = this.layout.hint || { x: 400, y: 560 };
    this.panel.drawText(this.texts.hint || "", pos.x, pos.y,
      { align: "center", font: this.theme.smallFont, color: this.theme.hintColor });
  };

  NS.BlessingScene = BlessingScene;
})(window.MyGame);
