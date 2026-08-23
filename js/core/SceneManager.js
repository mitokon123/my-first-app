/**
 * SceneManager.js
 * 現在のシーンを保持し、切り替えを行う。
 * シーンは { enter?(), exit?(), update(dt), render(ctx) } を実装したオブジェクト。
 */
(function (NS) {
  "use strict";

  function SceneManager() {
    this.current = null;
  }

  /**
   * シーンを切り替える。前シーンの exit と 新シーンの enter を呼ぶ。
   * @param {object} scene
   */
  SceneManager.prototype.change = function (scene) {
    if (this.current && this.current.exit) this.current.exit();
    this.current = scene;
    if (scene && scene.enter) scene.enter();
  };

  SceneManager.prototype.update = function (dt) {
    if (this.current && this.current.update) this.current.update(dt);
  };

  SceneManager.prototype.render = function (ctx) {
    if (this.current && this.current.render) this.current.render(ctx);
  };

  NS.SceneManager = SceneManager;
})(window.MyGame);
