/**
 * BackButton.js
 * 画面の隅に置く「戻る」ボタン。マウスだけでも前の画面へ戻れるようにするための部品。
 *
 * キーボードの Esc と同じ働きをする。
 * 見た目と当たり判定は TextButton に任せ、ここは
 * 「共通の位置と『戻る』という文言」を決めるだけ。
 *
 * 位置と大きさは data/ui.js の theme.backButton（全画面で共通）、
 * 文言は data/messages.js の common.back。
 */
(function (NS) {
  "use strict";

  /**
   * @param {MyGame.Panel} panel
   * @param {object} gameData
   * @param {object} [rect] 位置を変えたい画面だけ指定する（省略で共通の位置）
   */
  function BackButton(panel, gameData, rect) {
    var position = rect || (gameData.ui || {}).theme.backButton
                || { x: 690, y: 552, w: 80, h: 30 };
    var label = ((gameData.messages || {}).common || {}).back || "戻る";

    this.button = new NS.TextButton(panel, position, label);
  }

  /** @returns {boolean} 押されたか */
  BackButton.prototype.handleInput = function (input) {
    return this.button.handleInput(input);
  };

  BackButton.prototype.render = function () {
    this.button.render();
  };

  NS.BackButton = BackButton;
})(window.MyGame);
