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

  // メニューの並び・絵・解放条件は data/home.js が持つ

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
    // 描き手を渡すと、項目の左に絵がつく（data/ui.js の menu.iconSize）
    this.menu = new NS.CommandMenu(this.panel, this.layout.menu, this.sprites);

    this.particles = new NS.ParticleField(
      this.layout.particles, game.canvas.width, game.canvas.height
    );

    this.random = new NS.Random();

    this.notice = new NS.Notice(this.theme.notice);
    // 初めての場面で出る説明（出ているあいだはメニューを操作できない）
    this.tutorial = new NS.TutorialBox(this.panel, game);

    // 画面に出している所持金。実際の額へ向かって少しずつ動かす
    this._shownGold = null;

    this._ensureParty();
    this._buildMenu();
  }

  /** 進行データ（パーティ・持ち物・発見記録）を用意する */
  HomeScene.prototype._ensureParty = function () {
    this.game.ensureProgress();
  };

  /**
   * メニューを組み立てる。
   * まだ使えない項目も並べるが、灰色にして「今は選べない」ことを示す
   * （隠してしまうと、何が増えるのか分からなくなるため）。
   */
  HomeScene.prototype._buildMenu = function () {
    var entries = (this.game.data.home || {}).menu || [];
    var items = [];
    var keep = this.menu.index;   // 組み直しても、選んでいた場所に戻す

    for (var i = 0; i < entries.length; i++) {
      var entry = entries[i];
      var locked = !this._isEntryUnlocked(entry);

      items.push({
        label: this.texts[entry.key] || entry.key,
        value: entry.value,
        ready: entry.ready !== false,
        locked: locked,
        unlockedBy: entry.unlockedBy,
        icon: entry.icon,
        color: locked ? this.theme.hintColor : null
      });
    }
    this.menu.setItems(items);
    if (keep > 0 && keep < items.length) this.menu.index = keep;
  };

  /** その項目が使えるか。条件の判定はダンジョンや店と同じ仕組みを使う */
  HomeScene.prototype._isEntryUnlocked = function (entry) {
    if (!entry.unlockedBy) return true;
    if (!NS.DungeonCatalog) return true;

    return NS.DungeonCatalog.isConditionMet(
      entry.unlockedBy, this.game.clearedDungeons, this.game.data);
  };

  HomeScene.prototype.enter = function () {
    // 拠点まわりの画面（仲間・持ち物・設定…）から戻ってきても、
    // 同じidなので曲は流れたまま途切れない。
    // 店と工房だけは自分の曲を持つので、戻るとここで拠点の曲に戻る
    this.game.audio.playBgm("home");
    this._ensureParty();
    // 戻ってくるたびに組み直す（クリアして使えるようになった項目を反映するため）
    this._buildMenu();

    // 帰還時の知らせ（失ったものなど）は、開いたときに一度だけ出す
    if (this._pendingNotice) {
      this._showNotice(this._pendingNotice, RETURN_NOTICE_DURATION);
      this._pendingNotice = null;
    }

    // 初めて拠点を開いたときの説明。
    // 知らせを出したときは重ならないよう、次に開いたときへ回す
    if (this.game.tutorial && !this.notice.isActive()) {
      this.tutorial.show(this.game.tutorial.take("homeReturn"));
    }
  };

  // --- 更新 ---

  HomeScene.prototype.update = function (dt) {
    this.particles.update(dt);
    this._updateGold();

    this.notice.update(dt);

    // 説明を出している間はメニューを触らせない
    if (this.tutorial.isActive()) {
      this.tutorial.handleInput(this.game.input);
      return;
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
    if (!selected) return;

    // 未実装の項目は知らせるだけで、画面は変えない
    if (selected.ready === false) {
      var template = this.texts.comingSoon || "{name}";
      this._showNotice(template.replace("{name}", selected.label));
      this.game.playError();
      return;
    }

    // まだ使えない項目は、何をすれば使えるかを知らせる
    if (selected.locked) {
      this._showNotice(this._lockedMessage(selected));
      this.game.playError();
      return;
    }

    this._openFeature(value);
  };

  /** 「○○ は △△ をクリアすると使える」。条件の名前が分からなければ短い文 */
  HomeScene.prototype._lockedMessage = function (item) {
    var required = NS.DungeonCatalog
      ? NS.DungeonCatalog.conditionName(
          this.game.data, item.unlockedBy, this.game.clearedDungeons)
      : null;

    if (!required) {
      return (this.texts.lockedShort || "{name}").replace("{name}", item.label);
    }
    return (this.texts.locked || "{name}")
      .replace("{name}", item.label)
      .replace("{required}", required);
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
      case "blessing":
        this.game.scenes.change(new NS.BlessingSelectScene(this.game, this));
        break;
      case "items":
        this.game.scenes.change(new NS.ItemScene(this.game, this));
        break;
      case "dex":
        this.game.scenes.change(new NS.DexScene(this.game, this));
        break;
      case "help":
        this.game.scenes.change(new NS.HelpScene(this.game, this));
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
   * 拠点からのセーブ。書き込む先のファイルを選ぶ画面へ。
   * 実際に書くのは SaveSlotScene（mode "save"）。書けたら音が鳴り、ここへ戻ってくる
   */
  HomeScene.prototype._save = function () {
    this.game.scenes.change(new NS.SaveSlotScene(this.game, this, "save"));
  };

  /**
   * 表示中の所持金を、実際の額へ近づける。
   *
   * 買い物から戻ったときに数字がすっと動くので、増えたか減ったかが分かる。
   * 差が1未満になったら、端数を残さないよう実際の額に合わせる。
   */
  HomeScene.prototype._updateGold = function () {
    var actual = this.game.gold || 0;

    // 初めて開いたときは、0から数え上げずにその額から始める
    if (this._shownGold === null) {
      this._shownGold = actual;
      return;
    }

    var diff = actual - this._shownGold;
    if (Math.abs(diff) < 1) {
      this._shownGold = actual;
      return;
    }
    this._shownGold += diff * ((this.layout.gold || {}).countSpeed || 0.14);
  };

  HomeScene.prototype._showNotice = function (text, duration) {
    this.notice.show(text, duration || NOTICE_DURATION);
  };

  // --- 描画 ---

  HomeScene.prototype.render = function (ctx) {
    var w = this.game.canvas.width;
    var h = this.game.canvas.height;

    this._renderBackground(ctx, w, h);
    this._renderScenery(ctx, w, h);
    this.particles.render(ctx);
    this._renderHeading(ctx);
    this._renderGold();
    this.menu.render(this.game.clock);
    this._renderPartyStatus();
    this._renderNotice(ctx);
    this._renderHint(ctx);
    this.tutorial.render();
  };

  /**
   * 背景の景色。穴（揺籃の穴）のそばで、たき火を囲む場所を絵で見せる。
   *
   * パネルより先に描くので、上下の余白にだけ見える。
   * 地面 → 穴 → たき火 の順。穴は地面より手前に描かないと埋まってしまう。
   */
  HomeScene.prototype._renderScenery = function (ctx, w, h) {
    var S = this.layout.scenery;
    if (!S) return;

    this._renderGround(ctx, w, h, S.ground);
    this._renderHole(ctx, S.hole);
    this._renderCampfire(ctx, S.campfire);
  };

  /** 画面の下にある深い穴。ふちだけがうっすら光る */
  HomeScene.prototype._renderHole = function (ctx, hole) {
    if (!hole) return;

    ctx.save();
    ctx.beginPath();
    ctx.ellipse(hole.cx, hole.cy, hole.rx, hole.ry, 0, 0, Math.PI * 2);
    ctx.fillStyle = hole.color || "#000000";
    ctx.fill();

    if (hole.rimColor) {
      ctx.strokeStyle = hole.rimColor;
      ctx.lineWidth = hole.rimWidth || 2;
      ctx.stroke();
    }
    ctx.restore();
  };

  /** 穴のふちの地面。上端に細い線を引いて手前と奥を分ける */
  HomeScene.prototype._renderGround = function (ctx, w, h, ground) {
    if (!ground) return;

    ctx.save();
    ctx.fillStyle = ground.color || "#000000";
    ctx.fillRect(0, ground.y, w, h - ground.y);

    if (ground.edgeColor) {
      ctx.fillStyle = ground.edgeColor;
      ctx.fillRect(0, ground.y, w, 1);
    }
    ctx.restore();
  };

  /** たき火。まわりの明かりをゆっくり強弱させ、炎そのものは blaze で揺らす */
  HomeScene.prototype._renderCampfire = function (ctx, fire) {
    if (!fire) return;

    var size = fire.size || 32;
    var centerX = fire.x + size / 2;
    var centerY = fire.y + size / 2;

    if (fire.glowRadius) {
      var radius = Math.max(1,
        NS.Motion.value(fire.glowPulse, this.game.clock, 0, fire.glowRadius));
      var glow = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, radius);
      glow.addColorStop(0, fire.glowColor || "#ffffff");
      glow.addColorStop(1, "rgba(0,0,0,0)");

      ctx.save();
      ctx.globalAlpha = (fire.glowAlpha === undefined) ? 0.15 : fire.glowAlpha;
      ctx.fillStyle = glow;
      ctx.fillRect(centerX - radius, centerY - radius, radius * 2, radius * 2);
      ctx.restore();
    }

    this.sprites.drawMotion("campfire", fire.x, fire.y, size, size,
      NS.Motion.of(this.game.data, fire.motion, this.game.clock, 0));
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
    var shown = (this._shownGold === null) ? (this.game.gold || 0) : this._shownGold;

    this.panel.drawText(template.replace("{amount}", Math.round(shown)),
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

    var sprite = monster.getSpriteId();
    // 種族ごとの大きさ（sizeScale）。下端をそろえて上へ伸ばす
    var base = S.spriteSize;
    var size = Math.round(base * (monster.getSizeScale ? monster.getSizeScale() : 1));
    this.sprites.drawMotion(sprite, x - (size - base) / 2, y + (base - size), size, size,
      NS.Motion.forSprite(this.game.data, sprite, monster.getMotionId(),
        this.game.clock, monster.getMotionPhase()));

    // 文字の開始位置は元の大きさで決める（大きい相手でも行がずれないように）
    var textX = x + base + 14;
    this.panel.drawText(monster.getName() + "  Lv" + monster.level, textX, y + 16);

    this.hpBar.draw(textX, y + 24, S.hpBarWidth, 8, monster.currentHp, monster.getMaxHp());
    this.panel.drawText(
      monster.currentHp + "/" + monster.getMaxHp(),
      textX + S.hpBarWidth + 10, y + 32,
      { font: t.smallFont, color: t.subTextColor }
    );
  };

  HomeScene.prototype._renderNotice = function (ctx) {
    if (!this.notice.isActive()) return;
    var pos = this.layout.notice || { x: 400, y: 470 };

    ctx.save();
    ctx.globalAlpha = this.notice.getAlpha();
    ctx.font = "14px monospace";
    ctx.fillStyle = this.theme.cursorColor || "#ffd75e";
    ctx.textAlign = "center";
    ctx.fillText(this.notice.getText(), pos.x, pos.y);
    ctx.restore();
  };

  HomeScene.prototype._renderHint = function (ctx) {
    var pos = this.layout.hint || { x: 48, y: 570 };
    this.panel.drawText(this.texts.hint || "", pos.x, pos.y,
      { font: this.theme.smallFont, color: this.theme.hintColor });
  };

  NS.HomeScene = HomeScene;
})(window.MyGame);
