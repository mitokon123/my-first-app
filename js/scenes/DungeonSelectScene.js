/**
 * DungeonSelectScene.js
 * ダンジョン選択画面。拠点の「ダンジョンへ潜る」から開く。
 *
 * 左に場所の一覧、右に選んでいる場所の詳細を出す。
 * まだ解放されていない場所は選べず、解放条件を表示する。
 *
 * 一覧の中身は data/dungeons.js、解放判定は DungeonCatalog が持つ。
 * 配置は data/ui.js の dungeonSelect、文言は data/messages.js の dungeonSelect。
 */
(function (NS) {
  "use strict";

  /**
   * @param {MyGame.Game} game
   * @param {object} returnScene 閉じたときに戻るシーン
   */
  function DungeonSelectScene(game, returnScene) {
    this.game = game;
    this.returnScene = returnScene;

    var ui = game.data.ui || {};
    this.theme = ui.theme || {};
    this.layout = ui.dungeonSelect || {};
    this.texts = (game.data.messages || {}).dungeonSelect || {};

    this.panel = new NS.Panel(game.ctx, this.theme);
    this.renderer = new NS.Renderer(game.ctx);
    this.backButton = new NS.BackButton(this.panel, game.data);

    this.dungeons = NS.DungeonCatalog.list(game.data);
    this.index = 0;
  }

  DungeonSelectScene.prototype.enter = function () {
    this.dungeons = NS.DungeonCatalog.list(this.game.data);
    if (this.index >= this.dungeons.length) this.index = 0;
  };

  DungeonSelectScene.prototype.getSelected = function () {
    return this.dungeons[this.index] || null;
  };

  DungeonSelectScene.prototype.isUnlocked = function (dungeon) {
    return NS.DungeonCatalog.isUnlocked(dungeon, this.game.clearedDungeons, this.game.data);
  };

  // --- 更新 ---

  DungeonSelectScene.prototype.update = function () {
    var input = this.game.input;
    var count = this.dungeons.length;

    if (this.backButton.handleInput(input)) {
      this.game.scenes.change(this.returnScene);
      return;
    }

    if (count > 0) {
      if (input.isPressed("up")) this.index = (this.index - 1 + count) % count;
      if (input.isPressed("down")) this.index = (this.index + 1) % count;
    }

    // マウス：重ねた場所へ選択を移し、押したら挑む
    var hovered = this._hoveredIndex(input);
    if (hovered >= 0) this.index = hovered;

    if (input.isPressed("cancel")) {
      this.game.scenes.change(this.returnScene);
      return;
    }

    var clicked = hovered >= 0 && input.getPointer && input.getPointer().clicked;
    if (input.isPressed("confirm") || clicked) this._enter();
  };

  /** カーソルが乗っている場所の番号（乗っていなければ -1） */
  DungeonSelectScene.prototype._hoveredIndex = function (input) {
    if (!input.getPointer) return -1;

    var pointer = input.getPointer();
    if (!pointer.inside) return -1;
    if (!pointer.moved && !pointer.clicked) return -1;

    var L = this.layout.list;
    for (var i = 0; i < this.dungeons.length; i++) {
      var rect = { x: L.x, y: L.y + L.rowHeight * i, w: L.w, h: L.h };
      if (NS.Panel.containsPoint(rect, pointer)) return i;
    }
    return -1;
  };

  /** 選んだ場所へ挑む（解放されていなければ何もしない） */
  DungeonSelectScene.prototype._enter = function () {
    var dungeon = this.getSelected();
    if (!dungeon || !this.isUnlocked(dungeon)) return;

    // ここから拠点へ戻るまでが1回の挑戦（ラン）になる
    this.game.beginRun(dungeon);
    this.game.scenes.change(new NS.DungeonScene(this.game, dungeon));
  };

  // --- 描画 ---

  DungeonSelectScene.prototype.render = function (ctx) {
    var w = this.game.canvas.width;
    var h = this.game.canvas.height;

    this.renderer.clear(this.layout.background || "#000000", w, h);
    this._renderHeading();

    for (var i = 0; i < this.dungeons.length; i++) {
      this._renderRow(this.dungeons[i], i);
    }
    this._renderDetail();
    this._renderHint();
    this.backButton.render();
  };

  DungeonSelectScene.prototype._renderHeading = function () {
    var title = this.layout.title || {};
    var subtitle = this.layout.subtitle || {};

    this.panel.drawText(this.texts.title || "", title.x, title.y,
      { font: title.font, color: title.color });
    this.panel.drawText(this.texts.subtitle || "", subtitle.x, subtitle.y,
      { font: subtitle.font, color: subtitle.color });
  };

  /**
   * その場所のテーマ（色）を返す。まだ行けない場所は中身を見せないので null。
   */
  DungeonSelectScene.prototype._themeOf = function (dungeon, unlocked) {
    if (!unlocked || !dungeon || !dungeon.theme) return null;
    return (this.game.data.dungeonThemes || {})[dungeon.theme] || null;
  };

  /** 表示する名前。まだ行けない場所は伏せる */
  DungeonSelectScene.prototype._nameOf = function (dungeon, unlocked) {
    if (unlocked) return dungeon.name;
    return this.texts.unknownName || "？？？";
  };

  /** 一覧の1件を描く */
  DungeonSelectScene.prototype._renderRow = function (dungeon, i) {
    var L = this.layout.list;
    var t = this.theme;
    var rect = { x: L.x, y: L.y + L.rowHeight * i, w: L.w, h: L.h };

    this.panel.drawBox(rect);

    var unlocked = this.isUnlocked(dungeon);
    var selected = (i === this.index);
    var origin = this.panel.innerOrigin(rect);

    this._renderThemeBar(rect, dungeon, unlocked);

    if (selected) {
      this.panel.drawText("▶", rect.x - 18, origin.y + 24, { color: t.cursorColor });
    }

    // 未開放の場所は名前を伏せ、灰色にして「まだ分からない」ことを示す
    var nameColor = !unlocked ? t.hintColor
                  : (selected ? t.cursorColor : t.textColor);
    this.panel.drawText(this._nameOf(dungeon, unlocked), origin.x, origin.y + 18,
      { color: nameColor });

    // 右上に状態（クリア済／未開放）
    var state = this.game.isDungeonCleared(dungeon.id) ? this.texts.cleared
              : (!unlocked ? this.texts.locked : null);
    if (state) {
      this.panel.drawText(state, rect.x + rect.w - (t.padding || 8), origin.y + 18,
        { align: "right", font: t.smallFont,
          color: unlocked ? t.cursorColor : t.hintColor });
    }

    // 未開放なら、どんな場所かも伏せる
    var subtitle = unlocked ? (dungeon.subtitle || "") : (this.texts.unknownName || "");
    this.panel.drawText(subtitle, origin.x, origin.y + 40,
      { font: t.smallFont, color: t.subTextColor });

    var floors = unlocked
      ? (this.texts.floorsLabel || "").replace("{floors}", dungeon.floors)
      : "";
    this.panel.drawText(floors, origin.x, origin.y + 58,
      { font: t.smallFont, color: t.hintColor });
  };

  /**
   * 一覧の左端に、その場所の色の帯を出す。
   * 一覧を眺めるだけで「緑の坑道・赤い亀裂・青い深層」と雰囲気が分かるようにする。
   * まだ行けない場所は、雰囲気も伏せて一律の暗い色にする。
   */
  DungeonSelectScene.prototype._renderThemeBar = function (rect, dungeon, unlocked) {
    var bar = this.layout.themeBar;
    if (!bar || !bar.width) return;

    var theme = this._themeOf(dungeon, unlocked);
    var tiles = (theme && theme.tiles) || {};
    var color = tiles.wall || this.layout.lockedColor || "#242a3a";

    var ctx = this.game.ctx;
    var gradient = ctx.createLinearGradient(0, rect.y, 0, rect.y + rect.h);
    gradient.addColorStop(0, color);
    gradient.addColorStop(1, tiles.floor || this.layout.lockedColor || "#242a3a");

    ctx.save();
    ctx.fillStyle = gradient;
    ctx.fillRect(rect.x + 2, rect.y + 2, bar.width, rect.h - 4);
    ctx.restore();
  };

  /**
   * 右側：選んでいる場所の詳細。
   * 上から順に 説明 → 出現するモンスター → 手に入るもの → 主 を縦に流し込む。
   */
  DungeonSelectScene.prototype._renderDetail = function () {
    var rect = this.layout.detail;
    if (!rect) return;

    this.panel.drawBox(rect);

    var dungeon = this.getSelected();
    if (!dungeon) return;

    var t = this.theme;
    var origin = this.panel.innerOrigin(rect);
    var lh = rect.lineHeight || t.lineHeight || 18;
    var unlocked = this.isUnlocked(dungeon);

    // 帯の下端から少し離して書き始める（帯と文章がくっつくと読みにくい）
    var y = this._renderDetailBanner(rect, dungeon, unlocked) + lh + 6;

    // 解放されていなければ、必要な条件だけを出す
    if (!unlocked) {
      var required = NS.DungeonCatalog.requiredName(
        this.game.data, dungeon, this.game.clearedDungeons);
      var hint = (this.texts.lockedHint || "").replace("{name}", required || "");
      this._renderLines(wrapText(hint, rect.charsPerLine || 15),
        origin.x, y, t.hintColor, lh);
      return;
    }

    y = this._renderLines(
      splitDescription(dungeon.description || "", rect.charsPerLine || 15),
      origin.x, y, t.subTextColor, lh);

    y += lh;
    y = this._renderSection(this.texts.monstersLabel,
      this._monsterEntries(dungeon), origin.x, y, rect, lh);

    y += lh - 4;
    y = this._renderSection(this.texts.dropsLabel,
      this._itemEntries(dungeon), origin.x, y, rect, lh);

    // 最深階に待つ相手。クリア済みなら名前を出す
    var boss = (this.game.data.bosses || {})[dungeon.boss];
    if (!boss) return;

    y += lh - 4;
    var known = this.game.isDungeonCleared(dungeon.id);
    this.panel.drawText(
      (this.texts.bossLabel || "") + " " +
      (known ? (boss.title || "") : (this.texts.unknownBoss || "")),
      origin.x, y, { font: t.smallFont, color: t.cursorColor });
  };

  /**
   * 詳細欄の上部に、その場所の色の帯と名前を出す。
   * 帯の色は実際のダンジョンの壁と床の色なので、潜る前に雰囲気が伝わる。
   *
   * 帯は下へ行くほど枠の色へ溶けるようにして、下端に線を引かない。
   * 線を引くと文章のすぐ上に横線が走って、窮屈に見えるため。
   *
   * @returns {number} 帯の下端のy（続きはここから離して書く）
   */
  DungeonSelectScene.prototype._renderDetailBanner = function (rect, dungeon, unlocked) {
    var origin = this.panel.innerOrigin(rect);
    var banner = rect.banner;

    if (!banner || !banner.height) {
      var plainY = origin.y + 20;
      this.panel.drawText(this._nameOf(dungeon, unlocked), origin.x, plainY);
      return plainY;
    }

    var theme = this._themeOf(dungeon, unlocked);
    var tiles = (theme && theme.tiles) || {};
    var locked = this.layout.lockedColor || "#242a3a";

    var ctx = this.game.ctx;
    var top = rect.y + 2;
    var bottom = top + banner.height;

    // 上は壁の色、下は枠の色。境目が出ないよう、下端は透明にして溶かす
    var gradient = ctx.createLinearGradient(0, top, 0, bottom);
    gradient.addColorStop(0, tiles.wall || locked);
    gradient.addColorStop(0.55, (theme && theme.background) || locked);
    gradient.addColorStop(1, "rgba(0,0,0,0)");

    ctx.save();
    ctx.fillStyle = gradient;
    ctx.fillRect(rect.x + 2, top, rect.w - 4, banner.height);
    ctx.restore();

    // 名前は帯の上寄りに置く（下は溶けているので、そこに文字を置くと沈んで見える）
    this.panel.drawText(this._nameOf(dungeon, unlocked),
      origin.x, top + Math.floor(banner.height * 0.42) + 6,
      { color: unlocked ? this.theme.textColor : this.theme.hintColor });

    return bottom;
  };

  /** 文字列の配列を1行ずつ描き、次の描画位置を返す */
  DungeonSelectScene.prototype._renderLines = function (lines, x, y, color, lh) {
    for (var i = 0; i < lines.length; i++) {
      this.panel.drawText(lines[i], x, y, { font: this.theme.smallFont, color: color });
      y += lh;
    }
    return y;
  };

  /**
   * 見出し＋名前の一覧を、指定の列数で並べる。
   * @param {string} label 見出し
   * @param {object[]} entries [{ text, color }]
   * @returns {number} 次の描画位置
   */
  DungeonSelectScene.prototype._renderSection = function (label, entries, x, y, rect, lh) {
    var t = this.theme;
    var columns = rect.columns || 2;
    var columnWidth = rect.columnWidth || 130;

    this.panel.drawText(label || "", x, y, { font: t.smallFont, color: t.hintColor });
    y += lh;

    for (var i = 0; i < entries.length; i++) {
      var col = i % columns;
      this.panel.drawText(entries[i].text, x + columnWidth * col, y,
        { font: t.smallFont, color: entries[i].color || t.textColor });
      if (col === columns - 1) y += lh;
    }
    // 最後の行が埋まりきらなかった場合も1行ぶん進める
    if (entries.length % columns !== 0) y += lh;
    return y;
  };

  /** 出現するモンスター（名前を属性の色で出す） */
  DungeonSelectScene.prototype._monsterEntries = function (dungeon) {
    var data = this.game.data;
    var species = NS.DungeonCatalog.getSpecies(data, dungeon);
    var entries = [];

    for (var i = 0; i < species.length; i++) {
      var element = (data.elements || {})[species[i].element];
      entries.push({
        text: species[i].name,
        color: (element && element.color) || this.theme.textColor
      });
    }
    return entries;
  };

  /** 手に入るもの（名前を分類の色で出す。ボスの分はクリア後に出る） */
  DungeonSelectScene.prototype._itemEntries = function (dungeon) {
    var data = this.game.data;
    var cleared = this.game.isDungeonCleared(dungeon.id);
    var items = NS.DungeonCatalog.getDropItems(data, dungeon, cleared);
    var categories = (data.categories || {}).item || {};
    var entries = [];

    for (var i = 0; i < items.length; i++) {
      var category = categories[items[i].category];
      entries.push({
        text: items[i].name,
        color: (category && category.color) || this.theme.textColor
      });
    }
    if (entries.length === 0) {
      entries.push({ text: this.texts.noDrops || "", color: this.theme.hintColor });
    }
    return entries;
  };

  DungeonSelectScene.prototype._renderHint = function () {
    var pos = this.layout.hint || { x: 48, y: 570 };
    this.panel.drawText(this.texts.hint || "", pos.x, pos.y,
      { font: this.theme.smallFont, color: this.theme.hintColor });
  };

  /** 改行で区切ったうえ、長い行は文字数で折り返す */
  function splitDescription(text, charsPerLine) {
    var result = [];
    var paragraphs = text.split("\n");

    for (var i = 0; i < paragraphs.length; i++) {
      var lines = wrapText(paragraphs[i], charsPerLine);
      for (var j = 0; j < lines.length; j++) result.push(lines[j]);
    }
    return result;
  }

  /** 文字数で折り返す（等幅フォント前提の簡易処理） */
  function wrapText(text, charsPerLine) {
    var lines = [];
    for (var i = 0; i < text.length; i += charsPerLine) {
      lines.push(text.substr(i, charsPerLine));
    }
    return lines;
  }

  NS.DungeonSelectScene = DungeonSelectScene;
})(window.MyGame);
