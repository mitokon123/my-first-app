/**
 * TutorialBox.js
 * 場面の上に重ねて出す、チュートリアルのふきだし。
 *
 * 出す中身は data/tutorial.js、出すかどうかの判断は TutorialSystem。
 * ここは「見せて、送って、閉じる」だけを持つ。
 *
 * ▼ 使い方（場面の側）
 *   this.tutorial = new NS.TutorialBox(this.panel, game);
 *   this.tutorial.show(game.tutorial.take("battleStart"));
 *   // update の先頭で
 *   if (this.tutorial.isActive()) { this.tutorial.handleInput(input); return; }
 *   // render の最後で
 *   this.tutorial.render();
 *
 * ▼ 出ているあいだは、その場面の操作を止めること
 *   止めないと、説明を読んでいる裏で戦闘が進んでしまう。
 *   上の「return」がその役目。
 *
 * ▼ 枠の高さは行数から決める
 *   説明ごとに行数が違うので、決め打ちにすると余白が空いたりはみ出したりする。
 */
(function (NS) {
  "use strict";

  /**
   * @param {MyGame.Panel} panel
   * @param {MyGame.Game} game
   */
  function TutorialBox(panel, game) {
    this.panel = panel;
    this.game = game;

    var ui = game.data.ui || {};
    this.theme = ui.theme || {};
    this.layout = ui.tutorial || {};
    this.texts = (game.data.messages || {}).tutorial || {};

    this.queue = [];   // まだ見せていない説明
    this.current = null;

    /**
     * 「どこを指すか」を教えてもらう係。
     *
     * 説明に pointAt が書いてあると、その名前を渡して四角を返してもらう。
     * ふきだしは画面の中身を知らないので、指し先の場所は場面の側に聞く。
     * 設定していなければ、矢印は出ないだけで他は今までどおり動く。
     */
    this.targetResolver = null;
  }

  /**
   * 指し先を教える係を設定する。
   * @param {function(string): object|null} resolver pointAt → { x, y, w, h }
   */
  TutorialBox.prototype.setTargetResolver = function (resolver) {
    this.targetResolver = resolver || null;
  };

  /** いま指している四角（指さない説明のときは null） */
  TutorialBox.prototype._target = function () {
    if (!this.current || !this.current.pointAt || !this.targetResolver) return null;
    return this.targetResolver(this.current.pointAt) || null;
  };

  /**
   * 説明を並べて見せ始める。
   * @param {object[]} steps TutorialSystem.take() が返したもの
   */
  TutorialBox.prototype.show = function (steps) {
    if (!steps || steps.length === 0) return;

    this.queue = steps.slice();
    this.current = this.queue.shift();
  };

  TutorialBox.prototype.isActive = function () {
    return !!this.current;
  };

  /**
   * 決定で次へ、Esc でこれ以降ぜんぶ出さない。
   * @returns {boolean} まだ出ているか
   */
  TutorialBox.prototype.handleInput = function (input) {
    if (!this.current) return false;

    if (input.isPressed("cancel")) {
      // 「いつでもやめられる」ようにしておく。設定から戻せる
      if (this.game.tutorial) this.game.tutorial.disable();
      this.queue = [];
      this.current = null;
      return false;
    }

    if (input.isPressed("confirm") || this._clicked(input)) {
      this.current = this.queue.length > 0 ? this.queue.shift() : null;
    }
    return !!this.current;
  };

  /** ふきだしのどこかを押したら「次へ」と同じ扱いにする */
  TutorialBox.prototype._clicked = function (input) {
    if (!input.getPointer) return false;

    var pointer = input.getPointer();
    if (!pointer.clicked) return false;

    return NS.Panel.containsPoint(this._rect(), pointer);
  };

  /** 行数から枠の大きさを決める */
  TutorialBox.prototype._rect = function () {
    var L = this.layout;
    var box = L.box || { x: 180, y: 170, w: 440 };
    var lineHeight = L.lineHeight || 22;
    var lines = (this.current && this.current.lines) ? this.current.lines.length : 0;

    // 見出し＋本文＋操作案内。padding は上下ぶん
    var height = (L.padding || 20) * 2 + (L.titleHeight || 30)
               + lineHeight * lines + (L.hintHeight || 28);

    return { x: box.x, y: box.y, w: box.w, h: height };
  };

  TutorialBox.prototype.render = function () {
    if (!this.current) return;

    var t = this.theme;
    var L = this.layout;
    var rect = this._rect();

    // ★ 先に不透明で塗りつぶしてから枠を描く。
    //   共通の枠（Panel.drawBox）は半透明なので、そのままだと
    //   後ろの盤面やパーティ表示が透けて、説明が読みにくくなる。
    //   ここは「読ませるための窓」なので、後ろを完全に隠す
    var ctx = this.panel.ctx;
    ctx.fillStyle = L.background || "#0d1220";
    ctx.fillRect(rect.x, rect.y, rect.w, rect.h);

    this.panel.drawBox(rect);

    var origin = this.panel.innerOrigin(rect);
    var lineHeight = L.lineHeight || 22;
    var y = origin.y + (L.titleHeight || 30);

    this.panel.drawText(this.current.title || "", origin.x, y,
      { font: L.titleFont || t.font, color: t.cursorColor });
    y += 8;

    var lines = this.current.lines || [];
    for (var i = 0; i < lines.length; i++) {
      y += lineHeight;
      this.panel.drawText(lines[i], origin.x, y, { color: t.textColor });
    }

    // 残りの数を出す。何回押せば終わるかが分かるように
    var hint = this.queue.length > 0
      ? (this.texts.hintMore || "").replace("{count}", this.queue.length + 1)
      : (this.texts.hintLast || "");

    this.panel.drawText(hint, origin.x, y + (L.hintHeight || 28),
      { font: t.smallFont, color: t.hintColor });

    this._renderPointer(rect);
  };

  /**
   * 説明している項目を四角で囲み、ふきだしから矢印を引く。
   *
   * ★ 囲みと矢印は**ふきだしを描いたあと**に描く。
   *   先に描くと、ふきだしの塗りつぶしで消えてしまう。
   *
   * ★ 矢印はふきだしの角からではなく、いちばん近い辺から出す。
   *   角から出すと、指し先が真下にあるときに斜めに大回りして見える。
   */
  TutorialBox.prototype._renderPointer = function (rect) {
    var target = this._target();
    if (!target) return;

    var P = this.layout.pointer || {};
    var ctx = this.panel.ctx;
    var color = P.color || this.theme.cursorColor || "#ffd75e";

    // 指し先の四角（少し外側に広げて、文字に重ならないようにする）
    var pad = (P.padding === undefined) ? 3 : P.padding;
    var box = {
      x: target.x - pad, y: target.y - pad,
      w: target.w + pad * 2, h: target.h + pad * 2
    };

    // ふきだし側の出発点：指し先に面した辺の真ん中
    var fromX = clamp(box.x + box.w / 2, rect.x + 12, rect.x + rect.w - 12);
    var fromY = (box.y > rect.y + rect.h) ? (rect.y + rect.h) : rect.y;
    // 指し先側の到着点：ふきだしに面した辺の真ん中
    var toX = clamp(rect.x + rect.w / 2, box.x, box.x + box.w);
    var toY = (box.y > rect.y + rect.h) ? box.y : (box.y + box.h);

    ctx.save();
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineWidth = P.lineWidth || 2;

    ctx.strokeRect(box.x, box.y, box.w, box.h);

    ctx.beginPath();
    ctx.moveTo(fromX, fromY);
    ctx.lineTo(toX, toY);
    ctx.stroke();

    // 矢じり。線の向きに合わせて三角を描く
    var size = P.headSize || 8;
    var angle = Math.atan2(toY - fromY, toX - fromX);
    ctx.beginPath();
    ctx.moveTo(toX, toY);
    ctx.lineTo(toX - size * Math.cos(angle - 0.4), toY - size * Math.sin(angle - 0.4));
    ctx.lineTo(toX - size * Math.cos(angle + 0.4), toY - size * Math.sin(angle + 0.4));
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  };

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  NS.TutorialBox = TutorialBox;
})(window.MyGame);
