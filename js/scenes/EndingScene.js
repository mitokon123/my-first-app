/**
 * EndingScene.js
 * エンディング画面。現在は簡素な表示のみ。
 * ボスを増やしたり演出を加えたりするときは、ここと data/messages.js の ending を差し替える。
 */
(function (NS) {
  "use strict";

  function EndingScene(game) {
    this.game = game;
    this.texts = (game.data.messages || {}).ending || {};
    this.theme = (game.data.ui || {}).theme || {};
    this.renderer = new NS.Renderer(game.ctx);
    this.elapsed = 0;
  }

  EndingScene.prototype.enter = function () {
    this.elapsed = 0;
  };

  EndingScene.prototype.update = function (dt) {
    this.elapsed += dt;

    // 誤操作で飛ばさないよう、少し待ってから受け付ける
    if (this.elapsed < 800) return;

    if (this.game.input.isPressed("confirm") || this.game.input.isPressed("cancel")) {
      // 進行データを初期化してタイトルへ
      this.game.party = null;
      this.game.storage = null;
      this.game.inventory = null;
      this.game.gold = null;
      this.game.discovery = null;
      this.game.clearedDungeons = null;
      this.game.boughtBlessings = null;
      this.game.offBlessings = null;
      this.game.run = null;
      this.game.scenes.change(new NS.TitleScene(this.game));
    }
  };

  EndingScene.prototype.render = function (ctx) {
    var w = this.game.canvas.width;
    var h = this.game.canvas.height;
    var t = this.theme;

    this.renderer.clear("#0b0f1a", w, h);

    this.renderer.text(this.texts.title || "", w / 2, h / 2 - 50,
      { color: t.cursorColor || "#ffd75e", font: "28px monospace", align: "center" });

    this.renderer.text(this.texts.body || "", w / 2, h / 2,
      { color: t.textColor || "#e8eaf0", font: "16px monospace", align: "center" });

    this.renderer.text(this.texts.thanks || "", w / 2, h / 2 + 34,
      { color: t.subTextColor || "#9aa4c0", font: "14px monospace", align: "center" });

    // 少し待ってから案内を点滅表示
    if (this.elapsed >= 800 && Math.floor(this.elapsed / 500) % 2 === 0) {
      this.renderer.text(this.texts.hint || "", w / 2, h - 60,
        { color: t.hintColor || "#5b6688", font: "12px monospace", align: "center" });
    }
  };

  NS.EndingScene = EndingScene;
})(window.MyGame);
