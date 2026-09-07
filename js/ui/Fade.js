/**
 * Fade.js
 * 画面をいったん暗くして、何かをしてから、明るく戻す。
 *
 * SceneManager の暗転は「画面そのものを切り替える」ときのもの。
 * こちらは同じ画面のまま中身だけ入れ替えたいとき（階を降りるなど）に使う。
 *
 * 使い方
 *   this.fade = new MyGame.Fade({ duration: 260, color: "#04060c" });
 *   this.fade.start(function () { … いちばん暗いところで行うこと … });
 *   update: this.fade.update(dt);
 *           if (this.fade.isActive()) return;   // 暗転中は操作を受け付けない
 *   render: this.fade.render(ctx);              // いちばん最後に描く
 */
(function (NS) {
  "use strict";

  /**
   * @param {object} [params] { duration, color }
   */
  function Fade(params) {
    this.params = params || {};
    this.phase = "idle";     // "idle" / "out"（暗くする）/ "in"（明るく戻す）
    this.timer = 0;
    this.duration = 0;
    this._onCovered = null;
  }

  /**
   * 暗転を始める。
   * 長さが0なら暗転せず、その場で onCovered を呼ぶ（演出を切っている場合）。
   *
   * @param {function} [onCovered] いちばん暗くなった時点で呼ばれる
   * @param {number} [duration] 長さ（ms）。省略時は設定の duration
   * @returns {boolean} 暗転を始めたか（false ならその場で済ませた）
   */
  Fade.prototype.start = function (onCovered, duration) {
    var length = (duration === undefined) ? (this.params.duration || 0) : duration;

    if (length <= 0) {
      if (onCovered) onCovered();
      return false;
    }

    this._onCovered = onCovered || null;
    this.phase = "out";
    this.duration = length;
    this.timer = length;
    return true;
  };

  Fade.prototype.update = function (dt) {
    if (this.phase === "idle") return;

    this.timer -= dt;
    if (this.timer > 0) return;

    if (this.phase === "out") {
      var covered = this._onCovered;
      this._onCovered = null;

      // 先に明転へ移してから呼ぶ。呼び先が画面を切り替えても状態が壊れない
      this.phase = "in";
      this.timer = this.duration;
      if (covered) covered();
      return;
    }

    this.phase = "idle";
    this.timer = 0;
  };

  Fade.prototype.isActive = function () {
    return this.phase !== "idle";
  };

  /** 暗幕の濃さ（0〜1） */
  Fade.prototype.getAlpha = function () {
    if (this.phase === "idle" || this.duration <= 0) return 0;

    var remain = Math.max(0, this.timer) / this.duration;
    return (this.phase === "out") ? (1 - remain) : remain;
  };

  Fade.prototype.render = function (ctx) {
    var alpha = this.getAlpha();
    if (alpha <= 0) return;

    ctx.save();
    ctx.globalAlpha = Math.min(1, alpha);
    ctx.fillStyle = this.params.color || "#000000";
    ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    ctx.restore();
  };

  NS.Fade = Fade;
})(window.MyGame);
