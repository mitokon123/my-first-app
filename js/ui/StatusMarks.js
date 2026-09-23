/**
 * StatusMarks.js
 * 状態異常・バフ／デバフ・属性を、文字の隣に出す小さな印の共通の描き手。
 *
 * 戦闘・ダンジョン・仲間画面の3か所で同じ印を出したいので、ここにまとめてある。
 * どこで見ても同じ絵・同じ色になるので、
 * 「戦闘中に見た毒の印」と「ダンジョンの左上に出ている印」が同じものだと分かる。
 *
 * ▼ 絵と文字
 *   絵（data/sprites_icons.js）があればそれを描き、無ければ短い文字（short）で出す。
 *   絵は data/elements.js / data/statuses.js の icon、
 *   ステータスの絵は data/ui.js の icons.stats に書いてある。
 *   状態異常や属性を増やしても、このファイルは変更しなくてよい。
 *
 * ▼ 呼び方
 *   sprites（SpriteRenderer）を渡すと絵、渡さなければ文字。
 *   どちらも「描き終えたあとのx」を返すので、続けて別のものを描ける。
 */
(function (NS) {
  "use strict";

  var StatusMarks = {};

  /** 絵の大きさ（data/ui.js の icons.size。無ければ 14） */
  function iconSize(gameData, opts) {
    if (opts && opts.size) return opts.size;
    var icons = gameData && gameData.ui && gameData.ui.icons;
    return (icons && icons.size) || 14;
  }

  /**
   * 状態異常の印を横に並べて描く。
   *
   * @param {MyGame.Panel} panel
   * @param {object[]} defs data/statuses.js の定義の配列（monster.getStatusDefs() の戻り値）
   * @param {number} x 描き始めるx
   * @param {number} baseY 文字の下端のy
   * @param {object} [options]
   *   sprites … SpriteRenderer。渡すと絵で描く
   *   data    … GameData（絵の大きさを引くのに使う）
   *   size    … 絵の大きさ（px）
   *   font    … 文字で描くときの書体（省略時はテーマの smallFont）
   *   gap     … 印と印のすき間（px）
   *   maxX    … ここを超えるなら、その印から先は描かない（枠からはみ出さないため）
   * @returns {number} 描き終えたあとのx
   */
  StatusMarks.draw = function (panel, defs, x, baseY, options) {
    var opts = options || {};
    var t = panel.theme;
    var font = opts.font || t.smallFont || "12px monospace";
    var gap = (opts.gap === undefined) ? 4 : opts.gap;
    var maxX = (opts.maxX === undefined) ? Infinity : opts.maxX;
    var size = iconSize(opts.data, opts);
    var ctx = panel.ctx;

    for (var i = 0; i < (defs || []).length; i++) {
      var def = defs[i];
      if (!def) continue;

      if (opts.sprites && def.icon) {
        if (x + size > maxX) break;
        StatusMarks.drawIcon(opts.sprites, def.icon, x, baseY, size);
        x += size + gap;
        continue;
      }
      if (!def.short) continue;

      // drawText が書体を変えるので、測る直前に必ず戻す
      ctx.font = font;
      var width = ctx.measureText(def.short).width;
      if (x + width > maxX) break;

      panel.drawText(def.short, x, baseY, { font: font, color: def.color || t.textColor });
      x += width + gap;
    }
    return x;
  };

  /**
   * 絵を1つ、文字の下端（baseY）に合わせて描く。
   * 文字の高さより少し大きいので、下端を文字より 2px 下げて重心を合わせる。
   */
  StatusMarks.drawIcon = function (sprites, spriteId, x, baseY, size) {
    sprites.draw(spriteId, x, baseY - size + 2, size, size);
  };

  /**
   * バフ／デバフの印を1つ描く。ステータスの絵に、上がった／下がったの矢印を重ねる。
   *
   * @param {MyGame.Panel} panel
   * @param {MyGame.SpriteRenderer} sprites
   * @param {MyGame.GameData} gameData
   * @param {string} stat "hp" / "attack" / "defense" / "speed" / "pp" / "other"
   * @param {boolean} up 上がったか
   * @param {number} x
   * @param {number} baseY
   * @param {object} [options] { size }
   * @returns {number} 描き終えたあとのx
   */
  StatusMarks.drawModifier = function (panel, sprites, gameData, stat, up, x, baseY, options) {
    var icons = (gameData.ui || {}).icons || {};
    var size = iconSize(gameData, options);
    var spriteId = (icons.stats || {})[stat] || (icons.stats || {}).other;
    if (!spriteId) return x;

    StatusMarks.drawIcon(sprites, spriteId, x, baseY, size);
    var arrow = up ? icons.arrowUp : icons.arrowDown;
    if (arrow) StatusMarks.drawIcon(sprites, arrow, x, baseY, size);
    return x + size;
  };

  /**
   * バフ／デバフ1つを「どのステータスが」「上がったか下がったか」に要約する。
   * 効果が複数あるときは最初の1つで代表させる（枠が狭いため）。
   *
   * @param {object} mod { effects: [...] }（monster.modifiers の1件）
   * @returns {{stat:string|null, up:boolean}} stat は "hp" 等、与・被ダメージなら "other"
   */
  StatusMarks.summarizeModifier = function (mod) {
    var effects = (mod && mod.effects) || [];

    for (var i = 0; i < effects.length; i++) {
      var e = effects[i];
      if (e.type === "statMultiplier") return { stat: e.stat, up: e.value > 1 };
      if (e.type === "statBonus")      return { stat: e.stat, up: e.value > 0 };
      // 与ダメージ・被ダメージは、上がり下がりの向きが逆になることに注意
      if (e.type === "damageDealt")    return { stat: "other", up: e.value > 1 };
      if (e.type === "damageTaken")    return { stat: "other", up: e.value < 1 };
    }
    return { stat: null, up: false };
  };

  /**
   * 属性の絵を1つ描く（耐性の表などで名前の前に置く）。
   * 絵の無い属性（無属性）は何も描かず、x をそのまま返す。
   * @returns {number} 描き終えたあとのx（絵を描いたときだけ進む）
   */
  StatusMarks.drawElement = function (sprites, gameData, elementId, x, baseY, options) {
    var element = (gameData.elements || {})[elementId];
    if (!element || !element.icon) return x;

    var size = iconSize(gameData, options);
    StatusMarks.drawIcon(sprites, element.icon, x, baseY, size);
    return x + size;
  };

  /**
   * 印ではなく、名前をそのまま並べたいとき用（「毒 呪い」）。
   * 詳細を出す画面では、1文字の印だけでは何のことか分からないため。
   * sprites を渡すと、名前の前に絵もつく。
   *
   * @returns {number} 描き終えたあとのx
   */
  StatusMarks.drawNames = function (panel, defs, x, baseY, options) {
    var opts = options || {};
    var t = panel.theme;
    var font = opts.font || t.smallFont || "12px monospace";
    var gap = (opts.gap === undefined) ? 6 : opts.gap;
    var maxX = (opts.maxX === undefined) ? Infinity : opts.maxX;
    var size = iconSize(opts.data, opts);
    var ctx = panel.ctx;

    for (var i = 0; i < (defs || []).length; i++) {
      var def = defs[i];
      if (!def || !def.name) continue;

      ctx.font = font;
      var width = ctx.measureText(def.name).width;
      var iconWidth = (opts.sprites && def.icon) ? size + 2 : 0;
      if (x + iconWidth + width > maxX) break;

      if (iconWidth) {
        StatusMarks.drawIcon(opts.sprites, def.icon, x, baseY, size);
        x += iconWidth;
      }
      panel.drawText(def.name, x, baseY, { font: font, color: def.color || t.textColor });
      x += width + gap;
    }
    return x;
  };

  /** 個体から定義の配列を取り出す（状態異常を持たない個体でも安全に呼べる） */
  StatusMarks.defsOf = function (monster) {
    return (monster && monster.getStatusDefs) ? monster.getStatusDefs() : [];
  };

  NS.StatusMarks = StatusMarks;
})(window.MyGame);
