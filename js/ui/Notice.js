/**
 * Notice.js
 * 画面に一定時間だけ出す短い知らせ（セーブしました、○○を手に入れた、など）。
 *
 * 文と残り時間を持つだけの部品。どこに・どんな色で描くかは各画面が決める。
 * 出るときと消えるときに濃さが変わるので、ぱっと現れて消える感じにならない。
 *
 * 使い方
 *   this.notice = new MyGame.Notice(theme.notice);
 *   this.notice.show("セーブしました", 1600);
 *   update: this.notice.update(dt);
 *   render: if (this.notice.isActive()) { …getAlpha() を掛けて getText() を描く… }
 *
 * 濃さの変わり方（fadeIn / fadeOut）は data/ui.js の theme.notice。
 */
(function (NS) {
  "use strict";

  /**
   * @param {object} [params] { fadeIn, fadeOut } 出入りにかける時間（ms）
   */
  function Notice(params) {
    this.params = params || {};
    this.text = null;
    this.timer = 0;      // 残り時間
    this.duration = 0;   // 出したときの長さ
  }

  /**
   * 知らせを出す。text が空なら何も出さない（消す）。
   * @param {string} text
   * @param {number} duration 出しておく時間（ms）
   */
  Notice.prototype.show = function (text, duration) {
    this.text = text || null;
    this.duration = duration || 0;
    this.timer = this.text ? this.duration : 0;
  };

  /** すぐ消す */
  Notice.prototype.clear = function () {
    this.text = null;
    this.timer = 0;
    this.duration = 0;
  };

  Notice.prototype.update = function (dt) {
    if (this.timer <= 0) return;

    this.timer -= dt;
    if (this.timer <= 0) {
      this.timer = 0;
      this.text = null;
    }
  };

  Notice.prototype.isActive = function () {
    return !!this.text && this.timer > 0;
  };

  Notice.prototype.getText = function () {
    return this.text;
  };

  /**
   * 今の濃さ（0〜1）。
   * 出てすぐは薄く、消える直前も薄くなる。
   * 出しておく時間が短いときは、濃くなりきらないまま消える（両方の小さい方を取る）。
   */
  Notice.prototype.getAlpha = function () {
    if (!this.isActive()) return 0;

    var fadeIn = this.params.fadeIn || 0;
    var fadeOut = this.params.fadeOut || 0;
    var shown = this.duration - this.timer;   // 出てからの経過
    var alpha = 1;

    if (fadeIn > 0 && shown < fadeIn) alpha = shown / fadeIn;
    if (fadeOut > 0 && this.timer < fadeOut) {
      alpha = Math.min(alpha, this.timer / fadeOut);
    }

    if (alpha < 0) return 0;
    if (alpha > 1) return 1;
    return alpha;
  };

  NS.Notice = Notice;
})(window.MyGame);
