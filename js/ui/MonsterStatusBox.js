/**
 * MonsterStatusBox.js
 * モンスターの名前・レベル・HPを表示する部品。
 * 味方・敵のどちらにも使える（showHpNumbers で数値表示を切り替える）。
 */
(function (NS) {
  "use strict";

  /**
   * @param {MyGame.Panel} panel
   * @param {MyGame.HpBar} hpBar
   */
  function MonsterStatusBox(panel, hpBar) {
    this.panel = panel;
    this.hpBar = hpBar;
  }

  /**
   * @param {object} rect { x, y, w, h }
   * @param {object} monster MonsterInstance互換
   * @param {boolean} showHpNumbers HPを数値でも表示するか
   */
  MonsterStatusBox.prototype.render = function (rect, monster, showHpNumbers) {
    if (!monster) return;

    var t = this.panel.theme;
    this.panel.drawBox(rect);

    var origin = this.panel.innerOrigin(rect);

    // 名前とレベル
    this.panel.drawText(monster.getName(), origin.x, origin.y + 14);
    this.panel.drawText("Lv" + monster.level,
      rect.x + rect.w - (t.padding || 8), origin.y + 14,
      { align: "right", color: t.subTextColor });

    // HPバー
    var barY = origin.y + 24;
    var barW = rect.w - (t.padding || 8) * 2;
    this.hpBar.draw(origin.x, barY, barW, 8, monster.currentHp, monster.getMaxHp());

    // HP数値（味方のみ表示する想定）
    if (showHpNumbers) {
      this.panel.drawText(
        monster.currentHp + "/" + monster.getMaxHp(),
        rect.x + rect.w - (t.padding || 8), barY + 22,
        { align: "right", color: t.subTextColor, font: t.smallFont }
      );
    }
  };

  NS.MonsterStatusBox = MonsterStatusBox;
})(window.MyGame);
