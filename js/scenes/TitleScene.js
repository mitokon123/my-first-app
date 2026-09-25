/**
 * TitleScene.js
 * タイトル画面。ゲーム名・世界名の表示と、「新しく始める」「続きから」の選択。
 *
 * 演出は「深淵（Abyss）へ落ちていく」イメージ。
 *   背景のたてグラデーション → 奥へ続く同心円 → ゆっくり降る粒子 → 文字
 * の順に重ねて描いている。
 *
 * ▼ この画面は「どのファイルで遊ぶか」を決めない
 *   どちらを選んでも SaveSlotScene へ渡す。
 *   セーブファイルが3つあるので、始めるにも続けるにも
 *   「どのファイルか」を必ず通ることになる。
 *
 * ▼ パッチノートはメニューに置かない
 *   遊ぶための入口（始める・続ける）と、読み物は性質が違う。
 *   バージョン表記の隣に書のアイコンを置き、そこから開く。
 *   押せることが分かるよう、カーソルを乗せると明るくなる。
 *
 * 配置・配色は data/ui.js の title、文言は data/messages.js の title で管理する。
 * ゲーム名と世界名は data/config.js から取得する。
 */
(function (NS) {
  "use strict";

  var NOTICE_DURATION = 1800; // 通知を表示しておく時間（ms）

  function TitleScene(game) {
    this.game = game;
    this.elapsed = 0;

    var ui = game.data.ui || {};
    this.theme = ui.theme || {};
    this.layout = ui.title || {};
    this.texts = (game.data.messages || {}).title || {};

    this.panel = new NS.Panel(game.ctx, this.theme);
    this.sprites = new NS.SpriteRenderer(game.ctx, game.assets);
    // 絵の描き手を渡すと、項目の左にアイコンが付く
    this.menu = new NS.CommandMenu(this.panel, this.layout.menu, this.sprites);

    // バージョン表記の隣の、パッチノートを開くボタン
    this._patchHovered = false;

    // 粒子は奥・中・手前の3層。奥ほど遅く薄いので、重ねると奥行きが出る。
    // 層の設定が無い場合は、これまでどおり1層だけで動く
    this.particleLayers = NS.ParticleField.createLayers(
      this.layout.particleLayers || [this.layout.particles],
      game.canvas.width, game.canvas.height
    );

    this.saveManager = new NS.SaveManager(game.data);
    this.notice = new NS.Notice(this.theme.notice);

    // 開いたときの明転。1度だけ流す（パッチノートから戻るたびには流さない）
    this._introTimer = 0;
    this._introPlayed = false;

    this._buildMenu();
  }

  /**
   * メニューは「新しく始める」「続きから」。
   * 探索を中断したファイルがあるときだけ「中断したところから」が先頭に足される。
   * どれを選んでもセーブファイルの選択へ進むので、
   * ここで確認（はい／いいえ）は挟まない。上書きの確認はその先で行う。
   */
  TitleScene.prototype._buildMenu = function () {
    var items = [];
    if (this.saveManager.hasAnySuspend()) {
      items.push({ label: this.texts.resume || "resume", value: "resume", icon: "iconContinue" });
    }
    items.push({ label: this.texts.newGame  || "new",      value: "new",      icon: "iconNewGame" });
    items.push({ label: this.texts.continue || "continue", value: "continue", icon: "iconContinue" });
    this.menu.setItems(items);
  };

  TitleScene.prototype.enter = function () {
    // どのファイルも選んでいないので、最後に遊んだファイルの設定（音量など）に戻す
    this.game.useTitleSettings();
    this.game.audio.playBgm("title");
    // 中断の有無は探索から戻るたびに変わるので、開くたびに組み直す
    this._buildMenu();

    if (this._introPlayed) return;
    this._introPlayed = true;
    this.elapsed = 0;
    this._introTimer = (this.layout.intro || {}).duration || 0;
  };

  /** 明転の進み具合（0=まだ真っ暗 〜 1=終わり） */
  TitleScene.prototype._introProgress = function () {
    var duration = (this.layout.intro || {}).duration || 0;
    if (duration <= 0 || this._introTimer <= 0) return 1;
    return 1 - (this._introTimer / duration);
  };

  // --- 更新 ---

  TitleScene.prototype.update = function (dt) {
    this.elapsed += dt;
    if (this._introTimer > 0) this._introTimer -= dt;

    for (var i = 0; i < this.particleLayers.length; i++) {
      this.particleLayers[i].update(dt);
    }

    this.notice.update(dt);

    this._updatePatchButton();
    this._updateMenu();
  };

  TitleScene.prototype._updateMenu = function () {
    var result = this.menu.handleInput(this.game.input);
    if (!result || result.type !== "confirm") return;

    if (result.value === "new") this._openSlots("new");
    else if (result.value === "continue") this._openSlots("continue");
    else if (result.value === "resume") this._openSlots("resume");
  };

  /**
   * セーブファイルの選択へ進む。
   *
   * 「続きから」でどのファイルも空のときだけ、ここで止めて知らせる。
   * 空の一覧を見せても、選べるものが1つも無いので戻るしかない。
   */
  TitleScene.prototype._openSlots = function (mode) {
    if (mode === "continue" && !this.saveManager.hasAnySave()) {
      var saveTexts = (this.game.data.messages || {}).save || {};
      this._showNotice(saveTexts.empty || this.texts.noSaveAny || "");
      this.game.playError();
      return;
    }
    this.game.scenes.change(new NS.SaveSlotScene(this.game, this, mode));
  };

  // --- パッチノートを開くボタン（バージョン表記の隣） ---

  /** ボタンの当たり判定。バージョン表記の左に置く */
  TitleScene.prototype._patchRect = function () {
    var p = this.layout.patchButton;
    if (!p) return null;
    return { x: p.x, y: p.y, w: p.size, h: p.size };
  };

  TitleScene.prototype._updatePatchButton = function () {
    var rect = this._patchRect();
    var input = this.game.input;
    this._patchHovered = false;
    if (!rect || !input.getPointer) return;

    var pointer = input.getPointer();
    if (!pointer.inside) return;
    if (!NS.Panel.containsPoint(rect, pointer)) return;

    this._patchHovered = true;
    if (pointer.clicked) {
      this.game.scenes.change(new NS.PatchNoteScene(this.game, this));
    }
  };

  TitleScene.prototype._showNotice = function (text) {
    this.notice.show(text, NOTICE_DURATION);
  };

  // --- 描画 ---

  TitleScene.prototype.render = function (ctx) {
    var w = this.game.canvas.width;
    var h = this.game.canvas.height;

    this._renderBackground(ctx, w, h);
    this._renderAbyss(ctx);

    for (var i = 0; i < this.particleLayers.length; i++) {
      this.particleLayers[i].render(ctx);
    }

    this._renderVignette(ctx, w, h);
    this._renderLogo(ctx);
    this.menu.render(this.game.clock);

    this._renderNotice(ctx);
    this._renderFooter(ctx, w, h);
    this._renderIntro(ctx, w, h);
  };

  /**
   * 画面のふちを暗く落とす。中央の深淵へ視線が向くようにする。
   * 粒子より手前・題字より奥に置くので、題字は暗くならない。
   */
  TitleScene.prototype._renderVignette = function (ctx, w, h) {
    var v = this.layout.vignette;
    if (!v) return;

    var outer = Math.sqrt(w * w + h * h) / 2;
    var gradient = ctx.createRadialGradient(
      w / 2, h / 2, outer * (v.innerRatio || 0),
      w / 2, h / 2, outer);

    gradient.addColorStop(0, "rgba(0,0,0,0)");
    gradient.addColorStop(1, v.color || "#000000");

    ctx.save();
    ctx.globalAlpha = (v.alpha === undefined) ? 1 : v.alpha;
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, w, h);
    ctx.restore();
  };

  /** 開いたときの明転。真っ暗から徐々に見えてくる */
  TitleScene.prototype._renderIntro = function (ctx, w, h) {
    var progress = this._introProgress();
    if (progress >= 1) return;

    ctx.save();
    ctx.globalAlpha = 1 - progress;
    ctx.fillStyle = this.layout.gradientBottom || "#000000";
    ctx.fillRect(0, 0, w, h);
    ctx.restore();
  };

  /** 背景のたてグラデーション */
  TitleScene.prototype._renderBackground = function (ctx, w, h) {
    var L = this.layout;
    var gradient = ctx.createLinearGradient(0, 0, 0, h);
    gradient.addColorStop(0, L.gradientTop || "#000000");
    gradient.addColorStop(1, L.gradientBottom || "#000000");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, w, h);
  };

  /**
   * 奥へ続く同心円。ゆっくり明滅させながら、外へ広がり続ける。
   *
   * 円は中心から湧いて外へ流れていくので、こちらが落ちていくように見える。
   * 外側の円ほど薄くすることで、下へ行くほど暗くなる深淵らしさを出す。
   * 湧いた直後と消える直前は薄くして、入れ替わりを目立たせない。
   */
  TitleScene.prototype._renderAbyss = function (ctx) {
    var a = this.layout.abyss;
    if (!a) return;

    var rings = a.rings || 0;
    if (rings <= 0) return;

    var minAlpha = a.minAlpha === undefined ? 0.1 : a.minAlpha;
    var maxAlpha = a.maxAlpha === undefined ? 0.4 : a.maxAlpha;
    var center = (minAlpha + maxAlpha) / 2;
    var amplitude = (maxAlpha - minAlpha) / 2;

    // 何個ぶん外へ進んだか（0〜rings を繰り返す）
    var advance = (this.elapsed * (a.expandSpeed || 0)) % rings;

    ctx.save();
    ctx.strokeStyle = a.color || "#223355";
    ctx.lineWidth = a.lineWidth || 1;

    for (var i = 0; i < rings; i++) {
      var slot = (i + advance) % rings;
      var radius = (a.baseRadius || 0) + (a.ringGap || 0) * slot;

      // 円ごとに位相をずらして明滅させる
      var phase = this.elapsed * (a.pulseSpeed || 0) + i * 0.8;
      var fade = 1 - (a.fadePerRing || 0) * slot;
      var edge = Math.min(1, slot, rings - slot);   // 両端で0になる

      ctx.globalAlpha = Math.max(0,
        (center + amplitude * Math.sin(phase)) * fade * edge);
      ctx.beginPath();
      ctx.arc(a.centerX, a.centerY, radius, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();
  };

  /** ゲーム名・世界名・副題 */
  TitleScene.prototype._renderLogo = function (ctx) {
    var L = this.layout;
    var config = this.game.data.config || {};

    // ゲーム名（文字間を空けて重厚に見せる）
    //   ゆっくり浮き沈みし、光のにじみも合わせて増減させる。
    //   開いた直後は少し下から上がってくる
    var logo = L.logo || {};
    var clock = this.game.clock;
    var progress = this._introProgress();
    var rise = (1 - progress) * ((L.intro || {}).riseY || 0);

    ctx.save();
    ctx.font = logo.font || "40px monospace";
    ctx.fillStyle = logo.color || "#ffffff";
    ctx.textAlign = "center";
    ctx.shadowColor = logo.glowColor || "transparent";
    ctx.shadowBlur = Math.max(0,
      NS.Motion.value(logo.glowPulse, clock, 0, logo.glowBlur || 0));
    ctx.globalAlpha = progress;

    drawSpacedText(ctx, config.gameTitle || "",
      logo.x,
      logo.y + rise + NS.Motion.value(logo.float, clock, 0, 0),
      logo.letterSpacing || 0);
    ctx.restore();

    // 世界名
    var world = L.world || {};
    ctx.save();
    ctx.font = world.font || "14px monospace";
    ctx.fillStyle = world.color || "#888888";
    ctx.textAlign = "center";
    ctx.fillText("- " + (config.worldName || "") + " -", world.x, world.y);
    ctx.restore();

    // 副題
    var sub = L.subtitle || {};
    ctx.save();
    ctx.font = sub.font || "12px monospace";
    ctx.fillStyle = sub.color || "#666666";
    ctx.textAlign = "center";
    ctx.fillText(this.texts.subtitle || "", sub.x, sub.y);
    ctx.restore();
  };

  TitleScene.prototype._renderNotice = function (ctx) {
    if (!this.notice.isActive()) return;

    var pos = this.layout.notice || { x: 320, y: 392 };
    ctx.save();
    ctx.globalAlpha = this.notice.getAlpha();
    ctx.font = "13px monospace";
    ctx.fillStyle = this.theme.cursorColor || "#ffd75e";
    ctx.textAlign = "center";
    ctx.fillText(this.notice.getText(), pos.x, pos.y);
    ctx.restore();
  };

  /** 操作説明とバージョン、そしてパッチノートのアイコン */
  TitleScene.prototype._renderFooter = function (ctx, w, h) {
    var L = this.layout;
    var config = this.game.data.config || {};

    ctx.save();
    ctx.font = this.theme.smallFont || "12px monospace";
    ctx.fillStyle = this.theme.hintColor || "#5b6688";

    var hint = L.hint || { x: w / 2, y: h - 28 };
    ctx.textAlign = "center";
    ctx.fillText(this.texts.hint || "", hint.x, hint.y);

    var version = L.version || { x: w - 8, y: h - 8 };
    ctx.textAlign = "right";
    // カーソルが乗っているあいだは、バージョンも一緒に明るくする。
    // アイコンだけ光っても「どこが押せるのか」が伝わりにくいため
    ctx.fillStyle = this._patchHovered
      ? (this.theme.cursorColor || "#ffd75e")
      : (this.theme.hintColor || "#5b6688");
    ctx.fillText("v" + (config.version || "?"), version.x, version.y);
    ctx.restore();

    this._renderCredits(ctx);
    this._renderPatchButton(ctx);
  };

  /**
   * 左下の素材クレジット。data/audio.js の credits をそのまま並べる。
   *
   * ★ 表記が条件の素材を使うときは、ここに出ることが大事。
   *   1件目をいちばん下に置き、増えたぶんは上へ積む
   *   （下端の位置を固定しておけば、件数が変わっても隅から動かない）。
   */
  TitleScene.prototype._renderCredits = function (ctx) {
    var L = this.layout.credit;
    var credits = (this.game.data.audio || {}).credits || [];
    if (!L || credits.length === 0) return;

    var template = this.texts.credit || "{label}：{name} {url}";
    var lineHeight = L.lineHeight || 16;

    ctx.save();
    ctx.font = this.theme.smallFont || "12px monospace";
    ctx.fillStyle = this.theme.hintColor || "#5b6688";
    ctx.textAlign = "left";
    for (var i = 0; i < credits.length; i++) {
      var c = credits[i];
      var line = template
        .replace("{label}", c.label || "")
        .replace("{name}", c.name || "")
        .replace("{url}", c.url || "");
      ctx.fillText(line.trim(), L.x, L.y - lineHeight * i);
    }
    ctx.restore();
  };

  /**
   * バージョン表記の隣に置く「書」のアイコン。押すとパッチノートが開く。
   *
   * ふだんは薄く、カーソルを乗せるとはっきり出す。
   * 常に濃いと、隅の飾りなのか押せるものなのか分からない。
   */
  TitleScene.prototype._renderPatchButton = function (ctx) {
    var p = this.layout.patchButton;
    if (!p || !this.game.assets) return;

    ctx.save();
    ctx.globalAlpha = this._patchHovered
      ? (p.activeAlpha === undefined ? 1 : p.activeAlpha)
      : (p.idleAlpha === undefined ? 0.55 : p.idleAlpha);
    this.sprites.draw(p.icon || "iconPatchNote", p.x, p.y, p.size, p.size);
    ctx.restore();

    // 何のアイコンかは、乗せたときだけ文字で出す
    if (!this._patchHovered || !p.label) return;

    ctx.save();
    ctx.font = this.theme.smallFont || "12px monospace";
    ctx.fillStyle = this.theme.cursorColor || "#ffd75e";
    ctx.textAlign = "right";
    ctx.fillText(this.texts.patchNote || "", p.label.x, p.label.y);
    ctx.restore();
  };

  /** 文字間を空けて中央揃えで描く */
  function drawSpacedText(ctx, text, centerX, y, spacing) {
    if (!spacing) {
      ctx.fillText(text, centerX, y);
      return;
    }
    // 文字ごとの幅に間隔を足して全体幅を求め、左端から順に描く
    var totalWidth = 0;
    var i;
    for (i = 0; i < text.length; i++) {
      totalWidth += ctx.measureText(text.charAt(i)).width + spacing;
    }
    totalWidth -= spacing;

    var prevAlign = ctx.textAlign;
    ctx.textAlign = "left";
    var x = centerX - totalWidth / 2;
    for (i = 0; i < text.length; i++) {
      var ch = text.charAt(i);
      ctx.fillText(ch, x, y);
      x += ctx.measureText(ch).width + spacing;
    }
    ctx.textAlign = prevAlign;
  }

  NS.TitleScene = TitleScene;
})(window.MyGame);
