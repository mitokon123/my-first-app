/**
 * MessageLog.js
 * メッセージを順番に表示するUI部品。
 * 溜まったメッセージを1画面ずつ出し、決定キーで次へ進む。
 *
 * シーン側は push() で文字列を積み、isWaiting() が false になったら次の処理へ進む、
 * という使い方をする。表示の見た目は data/ui.js の theme に従う。
 */
(function (NS) {
  "use strict";

  /**
   * @param {MyGame.Panel} panel
   * @param {object} rect { x, y, w, h }
   * @param {number} linesPerPage 一度に表示する行数
   */
  function MessageLog(panel, rect, linesPerPage) {
    this.panel = panel;
    this.rect = rect;
    this.linesPerPage = linesPerPage || 3;
    this.queue = [];    // これから表示する行
    this.current = [];  // いま表示している行
  }

  /** メッセージを1行追加する */
  MessageLog.prototype.push = function (line) {
    if (line) this.queue.push(line);
  };

  /** 複数行をまとめて追加する */
  MessageLog.prototype.pushAll = function (lines) {
    for (var i = 0; i < (lines || []).length; i++) this.push(lines[i]);
  };

  /** 表示待ちのメッセージが残っているか */
  MessageLog.prototype.isWaiting = function () {
    return this.queue.length > 0 || this.current.length > 0;
  };

  /** まだ表示していないメッセージが残っているか */
  MessageLog.prototype.hasPending = function () {
    return this.queue.length > 0;
  };

  /** 次のページを表示する。表示するものが無くなったら current を空にする */
  MessageLog.prototype.advance = function () {
    if (this.queue.length === 0) {
      this.current = [];
      return;
    }
    this.current = this.queue.splice(0, this.linesPerPage);
  };

  /**
   * 1行だけ即座に表示に加える（演出の再生中に使う）。
   * 呼ぶ前に isFull() で空きを確認すること。
   * 古い行を勝手に消さないので、表示された内容は必ず読める。
   */
  MessageLog.prototype.stream = function (line) {
    if (!line) return;
    this.current.push(line);
  };

  /** 表示欄がいっぱいで、これ以上行を足せないか */
  MessageLog.prototype.isFull = function () {
    return this.current.length >= this.linesPerPage;
  };

  /** 表示中の行だけを消す（送り待ちを解除して次の行から表示する） */
  MessageLog.prototype.clearPage = function () {
    this.current = [];
  };

  /** 表示内容をすべて消す */
  MessageLog.prototype.clear = function () {
    this.queue = [];
    this.current = [];
  };

  MessageLog.prototype.render = function () {
    if (this.current.length === 0) return;

    var t = this.panel.theme;
    this.panel.drawBox(this.rect);

    var origin = this.panel.innerOrigin(this.rect);
    var lineHeight = t.lineHeight || 18;

    for (var i = 0; i < this.current.length; i++) {
      this.panel.drawText(
        this.current[i],
        origin.x,
        origin.y + lineHeight * (i + 1) - 4
      );
    }

    // まだ続きがあることを示す
    if (this.queue.length > 0 || this.waiting) {
      this.panel.drawText("▼", this.rect.x + this.rect.w - 20,
        this.rect.y + this.rect.h - 10, { color: t.hintColor, font: t.smallFont });
    }
  };

  NS.MessageLog = MessageLog;
})(window.MyGame);
