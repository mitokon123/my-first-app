/**
 * HomeScene.js
 * 拠点（ホーム）画面。ダンジョンへ出発する前の準備を行う場所。
 *
 * 左にメニュー、右に手持ちの一覧を出す。
 * 未実装の項目（もちもの・ずかん・せってい）は枠だけ用意してあり、
 * 選ぶと「じゅんびちゅう」と表示する。実装できたら MENU_ITEMS の
 * ready を true にして、_openFeature に処理を足すだけでよい。
 *
 * 配置・配色は data/ui.js の home、文言は data/messages.js の home で管理する。
 */
(function (NS) {
  "use strict";

  var NOTICE_DURATION = 1600;      // 通知を表示しておく時間（ms）
  var RETURN_NOTICE_DURATION = 3600; // 帰還の知らせは読ませたいので長めに出す

  /**
   * メニューの並び。
   *   key   : data/messages.js の home から表示名を引くためのキー
   *   value : 選ばれたときの識別子
   *   ready : 実装済みか（false なら「じゅんびちゅう」を表示するだけ）
   */
  var MENU_ITEMS = [
    { key: "dungeon",  value: "dungeon",  ready: true },
    { key: "party",    value: "party",    ready: true },
    { key: "shop",     value: "shop",     ready: true },
    { key: "craft",    value: "craft",    ready: true },
    { key: "items",    value: "items",    ready: true },
    { key: "dex",      value: "dex",      ready: true },
    { key: "save",     value: "save",     ready: true },
    { key: "settings", value: "settings", ready: true }
  ];

  /**
   * @param {MyGame.Game} game
   * @param {string} [notice] 開いたときに一度だけ表示する知らせ（挑戦の結果など）
   */
  function HomeScene(game, notice) {
    this.game = game;
    this._pendingNotice = notice || null;

    var ui = game.data.ui || {};
    this.theme = ui.theme || {};
    this.layout = ui.home || {};
    this.texts = (game.data.messages || {}).home || {};

    this.panel = new NS.Panel(game.ctx, this.theme);
    this.hpBar = new NS.HpBar(game.ctx, this.theme);
    this.sprites = new NS.SpriteRenderer(game.ctx, game.assets);
    this.renderer = new NS.Renderer(game.ctx);
    this.menu = new NS.CommandMenu(this.panel, this.layout.menu);

    this.particles = new NS.ParticleField(
      this.layout.particles, game.canvas.width, game.canvas.height
    );

    this.saveManager = new NS.SaveManager(game.data);
    this.random = new NS.Random();

    this._notice = null;
    this._noticeTimer = 0;

    this._ensureParty();
    this._buildMenu();
  }

  /** 進行データ（パーティ・持ち物・発見記録）を用意する */
  HomeScene.prototype._ensureParty = function () {
    this.game.ensureProgress();
  };

  HomeScene.prototype._buildMenu = function () {
    var items = [];
    for (var i = 0; i < MENU_ITEMS.length; i++) {
      var entry = MENU_ITEMS[i];
      items.push({
        label: this.texts[entry.key] || entry.key,
        value: entry.value,
        ready: entry.ready
      });
    }
    this.menu.setItems(items);
  };

  HomeScene.prototype.enter = function () {
    this._ensureParty();

    // 帰還時の知らせ（失ったものなど）は、開いたときに一度だけ出す
    if (this._pendingNotice) {
      this._showNotice(this._pendingNotice, RETURN_NOTICE_DURATION);
      this._pendingNotice = null;
    }
  };

  // --- 更新 ---

  HomeScene.prototype.update = function (dt) {
    this.particles.update(dt);

    if (this._noticeTimer > 0) {
      this._noticeTimer -= dt;
      if (this._noticeTimer <= 0) this._notice = null;
    }

    var result = this.menu.handleInput(this.game.input);
    if (!result) return;

    if (result.type === "cancel") {
      this.game.scenes.change(new NS.TitleScene(this.game));
      return;
    }
    if (result.type === "confirm") this._select(result.value);
  };

  HomeScene.prototype._select = function (value) {
    var selected = this.menu.getSelected();

    // 未実装の項目は知らせるだけで、画面は変えない
    if (selected && selected.ready === false) {
      var template = this.texts.comingSoon || "{name}";
      this._showNotice(template.replace("{name}", selected.label));
      return;
    }
    this._openFeature(value);
  };

  /** 実装済みの項目を開く */
  HomeScene.prototype._openFeature = function (value) {
    switch (value) {
      case "dungeon":
        // どの場所へ挑むかを選んでもらう
        this.game.scenes.change(new NS.DungeonSelectScene(this.game, this));
        break;
      case "party":
        this.game.scenes.change(new NS.PartyScene(this.game, this));
        break;
      case "shop":
        this.game.scenes.change(new NS.ShopScene(this.game, this));
        break;
      case "craft":
        this.game.scenes.change(new NS.CraftScene(this.game, this));
        break;
      case "items":
        this.game.scenes.change(new NS.ItemScene(this.game, this));
        break;
      case "dex":
        this.game.scenes.change(new NS.DexScene(this.game, this));
        break;
      case "save":
        this._save();
        break;
      case "settings":
        this.game.scenes.change(new NS.SettingsScene(this.game, this));
        break;
    }
  };

  /**
   * 拠点からのセーブ。
   * マップは保存しないため、再開時はダンジョンが生成し直される。
   */
  HomeScene.prototype._save = function () {
    var result = this.saveManager.save({
      floor: 1,
      party: this.game.party,
      storage: this.game.storage,
      inventory: this.game.inventory,
      gold: this.game.gold,
      discovery: this.game.discovery,
      clearedDungeons: this.game.clearedDungeons,
      dungeon: null
    });

    var saveTexts = (this.game.data.messages || {}).save || {};
    this._showNotice(saveTexts[result.reason] || result.reason);
  };

  HomeScene.prototype._showNotice = function (text, duration) {
    this._notice = text;
    this._noticeTimer = duration || NOTICE_DURATION;
  };

  // --- 描画 ---

  HomeScene.prototype.render = function (ctx) {
    var w = this.game.canvas.width;
    var h = this.game.canvas.height;

    this._renderBackground(ctx, w, h);
    this.particles.render(ctx);
    this._renderHeading(ctx);
    this._renderGold();
    this.menu.render();
    this._renderPartyStatus();
    this._renderNotice(ctx);
    this._renderHint(ctx);
  };

  HomeScene.prototype._renderBackground = function (ctx, w, h) {
    var L = this.layout;
    var gradient = ctx.createLinearGradient(0, 0, 0, h);
    gradient.addColorStop(0, L.gradientTop || "#000000");
    gradient.addColorStop(1, L.gradientBottom || "#000000");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, w, h);
  };

  HomeScene.prototype._renderHeading = function (ctx) {
    var L = this.layout;
    var title = L.title || {};
    var subtitle = L.subtitle || {};

    this.panel.drawText(this.texts.title || "", title.x, title.y,
      { font: title.font, color: title.color });
    this.panel.drawText(this.texts.subtitle || "", subtitle.x, subtitle.y,
      { font: subtitle.font, color: subtitle.color });
  };

  /** 所持金。買い物の前後で必ず見えるよう、拠点では常に出しておく */
  HomeScene.prototype._renderGold = function () {
    var pos = this.layout.gold;
    if (!pos) return;

    var template = this.texts.gold || "{amount}G";
    this.panel.drawText(template.replace("{amount}", this.game.gold || 0),
      pos.x, pos.y,
      { align: "right", font: pos.font || this.theme.font, color: pos.color || this.theme.cursorColor });
  };

  /** 右側に手持ちの一覧を表示する */
  HomeScene.prototype._renderPartyStatus = function () {
    var S = this.layout.status;
    if (!S) return;

    var t = this.theme;
    this.panel.drawBox(S);

    var origin = this.panel.innerOrigin(S);
    this.panel.drawText(this.texts.statusTitle || "", origin.x, origin.y + 12,
      { font: t.smallFont, color: t.subTextColor });

    var party = this.game.party;
    if (!party || party.isEmpty()) {
      this.panel.drawText(this.texts.emptyParty || "", origin.x, origin.y + 44);
      return;
    }

    var listTop = origin.y + 30;
    for (var i = 0; i < party.size(); i++) {
      this._renderPartyRow(party.get(i), origin.x, listTop + S.rowHeight * i, S);
    }
  };

  HomeScene.prototype._renderPartyRow = function (monster, x, y, S) {
    var t = this.theme;

    this.sprites.draw(monster.getSpriteId(), x, y, S.spriteSize, S.spriteSize);

    var textX = x + S.spriteSize + 14;
    this.panel.drawText(monster.getName() + "  Lv" + monster.level, textX, y + 16);

    this.hpBar.draw(textX, y + 24, S.hpBarWidth, 8, monster.currentHp, monster.getMaxHp());
    this.panel.drawText(
      monster.currentHp + "/" + monster.getMaxHp(),
      textX + S.hpBarWidth + 10, y + 32,
      { font: t.smallFont, color: t.subTextColor }
    );
  };

  HomeScene.prototype._renderNotice = function (ctx) {
    if (!this._notice) return;
    var pos = this.layout.notice || { x: 400, y: 470 };

    ctx.save();
    ctx.font = "14px monospace";
    ctx.fillStyle = this.theme.cursorColor || "#ffd75e";
    ctx.textAlign = "center";
    ctx.fillText(this._notice, pos.x, pos.y);
    ctx.restore();
  };

  HomeScene.prototype._renderHint = function (ctx) {
    var pos = this.layout.hint || { x: 48, y: 570 };
    this.panel.drawText(this.texts.hint || "", pos.x, pos.y,
      { font: this.theme.smallFont, color: this.theme.hintColor });
  };

  NS.HomeScene = HomeScene;
})(window.MyGame);
