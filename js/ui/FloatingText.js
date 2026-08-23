/**
 * FloatingText.js
 * 浮かび上がって消える文字の演出。ダメージ表示などに使う。
 *
 * ▼ 動き
 *   出た瞬間は大きく、すぐ元の大きさに戻る（弾ける感じ）
 *   最初は速く上へ、だんだんゆっくりになる
 *   横へわずかに流れる
 *   終盤で薄くなって消える
 *
 * 戦闘に限らず使えるよう、位置と文字列だけを受け取る作りにしている。
 * 見た目や時間は data/ui.js から渡す設定で決まる。
 */
(function (NS) {
  "use strict";

  /**
   * @param {object} params popup の設定
   * @param {MyGame.Random} [random] 散らばり方に使う
   */
  function FloatingText(params, random) {
    this.params = params || {};
    this.random = random || new NS.Random();
    this.items = [];
  }

  /**
   * 文字を1つ浮かべる。
   * @param {number} x 中心のX
   * @param {number} y 開始のY
   * @param {string} text 表示する文字
   * @param {object} [options] { color, font, spread }
   *   spread に false を渡すと左右に散らさない
   */
  FloatingText.prototype.spawn = function (x, y, text, options) {
    options = options || {};
    var p = this.params;

    // 同じ相手に続けて出しても重ならないよう、左右へ少し散らす
    var spreadX = (options.spread === false) ? 0 : (p.spreadX || 0);
    var offsetX = spreadX ? (this.random.next() * 2 - 1) * spreadX : 0;
    var driftX = (p.driftX || 0) * (this.random.next() * 2 - 1);

    this.items.push({
      x: x + offsetX,
      y: y,
      driftX: driftX,
      text: text,
      color: options.color || "#ffffff",
      font: options.font || "20px monospace",
      elapsed: 0
    });
  };

  /** 表示中の文字があるか（演出の待ち合わせに使う） */
  FloatingText.prototype.isActive = function () {
    return this.items.length > 0;
  };

  FloatingText.prototype.clear = function () {
    this.items = [];
  };

  /**
   * 時間を進める。表示時間を過ぎたものは消す。
   * @param {number} dt 経過ミリ秒
   */
  FloatingText.prototype.update = function (dt) {
    var duration = this.params.duration || 700;

    for (var i = this.items.length - 1; i >= 0; i--) {
      this.items[i].elapsed += dt;
      if (this.items[i].elapsed >= duration) this.items.splice(i, 1);
    }
  };

  FloatingText.prototype.render = function (ctx) {
    var p = this.params;
    var duration = p.duration || 700;
    var rise = p.rise || 30;
    var popScale = p.popScale || 1;
    var popTime = p.popTime || 0.15;
    var fadeStart = p.fadeStart === undefined ? 0.7 : p.fadeStart;

    ctx.save();
    ctx.textAlign = "center";
    ctx.textBaseline = "alphabetic";

    for (var i = 0; i < this.items.length; i++) {
      var item = this.items[i];
      var progress = Math.min(1, item.elapsed / duration);

      // 最初は速く、だんだんゆっくり上がる
      var eased = 1 - (1 - progress) * (1 - progress);
      var x = item.x + item.driftX * eased;
      var y = item.y - rise * eased;

      // 出た瞬間だけ大きく見せる
      var scale = 1;
      if (progress < popTime) {
        scale = popScale - (popScale - 1) * (progress / popTime);
      }

      // 終盤で薄くする
      ctx.globalAlpha = (progress < fadeStart)
        ? 1
        : Math.max(0, 1 - (progress - fadeStart) / (1 - fadeStart));

      ctx.save();
      ctx.translate(x, y);
      ctx.scale(scale, scale);
      ctx.font = item.font;

      // 背景に紛れないよう縁取りする
      if (p.outlineColor) {
        ctx.lineWidth = 4;
        ctx.strokeStyle = p.outlineColor;
        ctx.strokeText(item.text, 0, 0);
      }
      ctx.fillStyle = item.color;
      ctx.fillText(item.text, 0, 0);
      ctx.restore();
    }
    ctx.restore();
  };

  NS.FloatingText = FloatingText;
})(window.MyGame);
