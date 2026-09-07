/**
 * ResultScene.js
 * 挑戦（ラン）が終わったときの結果画面。
 *
 * 「どこまで潜って、何を持ち帰れたか」を1枚で見せる。
 * 拠点へ戻る前に必ず通るので、拾ったものが分からないまま終わることがなくなる。
 *
 * 結果の中身は DungeonScene が組み立てて渡す。この画面は表示だけを行い、
 * 持ち物やゴールドには一切触れない（すでに Game 側で反映済み）。
 *
 * 配置は data/ui.js の result、文言は data/messages.js の result。
 */
(function (NS) {
  "use strict";

  /**
   * @param {MyGame.Game} game
   * @param {object} summary
   *   outcome  : "escaped"（無事帰還）/ "cleared"（主を倒した）/ "defeated"（全滅）
   *   dungeon  : 挑んだダンジョンの定義
   *   floor    : 到達した階
   *   gold     : その挑戦で得たゴールド
   *   items    : [{ itemId, count }] 手に入れたもの
   *   lostItems: [{ itemId, count }] 失ったもの（全滅時のみ）
   */
  function ResultScene(game, summary) {
    this.game = game;
    this.summary = summary || {};

    var ui = game.data.ui || {};
    this.theme = ui.theme || {};
    this.layout = ui.result || {};
    this.texts = (game.data.messages || {}).result || {};

    this.panel = new NS.Panel(game.ctx, this.theme);
    this.renderer = new NS.Renderer(game.ctx);
    this.list = new NS.ScrollList(this.panel, this.layout.list);
    // マウスだけでも先へ進めるように
    this.homeButton = new NS.TextButton(this.panel, this.layout.homeButton,
      this.texts.toHome || "拠点へ");

    this.list.setRows(this._buildRows());
  }

  ResultScene.prototype.enter = function () {};

  // --- 中身の組み立て ---

  /**
   * 手に入れたもの・失ったものを1つの一覧にする。
   * 分類ごとの見出しは使わず、「手に入れた」「失った」で分ける。
   */
  ResultScene.prototype._buildRows = function () {
    var rows = [];
    var gained = this.summary.items || [];
    var lost = this.summary.lostItems || [];

    rows.push(this._header(this.texts.gainedLabel, this.theme.cursorColor));
    if (gained.length === 0) {
      rows.push(this._plain(this.texts.nothing, this.theme.hintColor));
    } else {
      this._pushItems(rows, gained, this.theme.textColor);
    }

    // 全滅したときだけ、落としてきたものを出す
    if (lost.length > 0) {
      rows.push(this._plain("", this.theme.hintColor));
      rows.push(this._header(this.texts.lostLabel, this.theme.hpBarLow || "#e8542a"));
      this._pushItems(rows, lost, this.theme.hintColor);
    }

    return rows;
  };

  ResultScene.prototype._pushItems = function (rows, entries, color) {
    for (var i = 0; i < entries.length; i++) {
      var item = this.game.data.getItem(entries[i].itemId);
      rows.push({
        type: "entry",
        label: item ? item.name : entries[i].itemId,
        right: "x" + entries[i].count,
        color: color,
        value: entries[i].itemId
      });
    }
  };

  ResultScene.prototype._header = function (label, color) {
    return { type: "header", label: "- " + (label || "") + " -", color: color };
  };

  /** 選べない1行（「何も無かった」など） */
  ResultScene.prototype._plain = function (label, color) {
    return { type: "header", label: label || "", color: color };
  };

  // --- 更新 ---

  ResultScene.prototype.update = function () {
    var input = this.game.input;

    // 一覧は眺めるだけ。上下とホイールで送れる
    this.list.handleInput(input);

    // 「拠点へ」ボタン・決定キー・右クリックのどれでも先へ進む。
    // 一覧の行を押しても進まないのは、読んでいる途中で誤って閉じないようにするため。
    if (this.homeButton.handleInput(input) ||
        input.isPressed("confirm") ||
        input.isPressed("cancel")) {
      this.game.scenes.change(new NS.HomeScene(this.game));
    }
  };

  // --- 描画 ---

  ResultScene.prototype.render = function (ctx) {
    var w = this.game.canvas.width;
    var h = this.game.canvas.height;

    this.renderer.clear(this.layout.background || "#0a0f1c", w, h);

    this._renderHeading();
    this._renderSummary();
    this.list.render(this.game.clock);
    this.homeButton.render();
    this._renderHint();
  };

  /** 見出し。結果によって色と文が変わる */
  ResultScene.prototype._renderHeading = function () {
    var L = this.layout;
    var outcome = this.summary.outcome || "escaped";
    var style = (L.outcomes || {})[outcome] || {};
    var title = L.title || {};
    var subtitle = L.subtitle || {};

    this.panel.drawText(this.texts[outcome] || "", title.x, title.y,
      { align: title.align, font: title.font, color: style.color || title.color });

    this.panel.drawText(this._placeText(), subtitle.x, subtitle.y,
      { align: subtitle.align, font: subtitle.font, color: subtitle.color });
  };

  /** 「苔むす坑道 B3F まで」 */
  ResultScene.prototype._placeText = function () {
    var dungeon = this.summary.dungeon;
    return (this.texts.reached || "")
      .replace("{name}", (dungeon && dungeon.name) || "")
      .replace("{floor}", this.summary.floor || 1);
  };

  /** 得たゴールド */
  ResultScene.prototype._renderSummary = function () {
    var pos = this.layout.gold;
    if (!pos) return;

    this.panel.drawText(
      (this.texts.gold || "{amount}G").replace("{amount}", this.summary.gold || 0),
      pos.x, pos.y,
      { align: pos.align || "left", font: pos.font, color: pos.color || this.theme.cursorColor });
  };

  ResultScene.prototype._renderHint = function () {
    var pos = this.layout.hint || { x: 48, y: 570 };
    this.panel.drawText(this.texts.hint || "", pos.x, pos.y,
      { font: this.theme.smallFont, color: this.theme.hintColor });
  };

  NS.ResultScene = ResultScene;
})(window.MyGame);
