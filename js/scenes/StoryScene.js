/**
 * StoryScene.js
 * 物語の場面を流す画面。data/story.js の1場面ぶんのページを順に見せる。
 *
 * ▼ 見せ方は4つ（ページごとに選べる）
 *   narration … 真ん中に文が浮かぶ（語り）
 *   dialogue  … 画面の下の窓に、話す人の名前と台詞が出る（会話）
 *   title     … 大きな見出しが、字間を詰めながら浮かび上がる（章の区切りなど）
 *   choice    … 選択肢。前の台詞を窓に出したまま、右上に項目を並べる。
 *               選んだ項目の pages をこのページのすぐあとに差し込み、終わったら共通のページへ続く
 *
 * ▼ ページの出し分け
 *   if    … 条件（書き方は場面の when と同じ）を満たすときだけ入るページ。場面の始まりで決める
 *   marks … そのページを見たら、別の場面を見たことにする（別の場面の代わりを務めるページ）
 *
 * ▼ 演出（どれもページごとに書ける。書かなければ前のページのまま）
 *   bg      … 背景（data/ui.js の story.backdrops の id）。変わるときは溶けるように切り替わる
 *   actors  … 画面に立たせるもの（モンスター・主人公）。新しく出たものだけ登場の動きをする
 *   fx      … ページの頭で1回だけ起きる演出（画面の揺れ・光）
 *   se      … ページの頭で鳴らす効果音
 *   bgm     … ページの頭で曲を変える（場面全体の bgm は最初に1回だけ）。"none" で止める
 *   transition: "black" … 暗転。真っ暗から明けていく（背景の切り替えを隠せる）
 *   delay   … 文字が出はじめるまで待つ（「少し間を置く」）
 *   cue     … 文字を出しきったあと（または決めた時刻）に起きる演出。
 *             { at, actors, fx, se, hold }。actors を書くと、そこで立ち絵が入れ替わる
 *   fx の memory … 別の背景を一瞬だけ重ねる（記憶がよぎる）
 *   場面全体の letterbox … 上下に黒い帯を出して、映画のような画面にする
 *   ※ いなくなった立ち絵は、その場で薄れて下がる
 *
 *   ★ 揺れと光は、設定「エフェクトの濃さ」に従う（0 なら出さない。戦闘と同じ表）。
 *     光の点滅が苦手な人でも見られるように。
 *
 * ▼ 操作
 *   決定・クリック … 文字が出ている途中なら全部出す。出きっていれば次のページ
 *   Esc           … 1回目で「もう一度で飛ばす」と出し、続けてもう1回でこの場面を飛ばす
 *
 * 流し終えたら（飛ばしても）、同じきっかけでまだ見ていない場面があれば続けて流す。
 * 無ければ次の画面へ移る（Game.playStory）。
 *
 * 配置・背景の中身は data/ui.js の story、案内の文言は data/messages.js の story。
 */
(function (NS) {
  "use strict";

  /**
   * @param {MyGame.Game} game
   * @param {object} story data/story.js の1場面
   * @param {object} nextScene 流し終えたら移る画面
   * @param {string} [trigger] この場面を流したきっかけ。続けて流す場面を探すのに使う
   */
  function StoryScene(game, story, nextScene, trigger) {
    this.game = game;
    this.story = story || {};
    this.nextScene = nextScene;
    this.trigger = trigger || null;

    var ui = game.data.ui || {};
    this.theme = ui.theme || {};
    this.layout = ui.story || {};
    this.texts = (game.data.messages || {}).story || {};

    this.panel = new NS.Panel(game.ctx, this.theme);
    this.renderer = new NS.Renderer(game.ctx);
    this.sprites = new NS.SpriteRenderer(game.ctx, game.assets);

    // 条件つきのページ（if）は、場面の始まりの時点で入れるかどうかを決める
    this.pages = this._visiblePages(this.story.pages || []);
    this.pageIndex = 0;
    this.choiceIndex = 0;   // 選択肢のページで、いま選んでいる項目
    this.pageElapsed = 0;
    this.sceneElapsed = 0;
    this._skipTimer = 0;   // 0 より大きいあいだは、もう一度 Esc で飛ばせる
    this._done = false;

    // 背景・立ち絵はページをまたいで引き継ぐので、ページごとに組み立てておく
    this._stages = buildStages(this.story, this.pages);
    this._bgSince = 0;      // いまの背景を出してからの時間（粒子の動きに使う）
    this._prevBg = null;    // 切り替わる前の背景（溶かしている間だけ）
    this._shake = null;     // { power, time, left }
    this._flash = null;     // { color, time, left }

    // 矢印キーでは何も起きないので、カーソル音を鳴らさない
    this.silentCursor = true;
  }

  /**
   * ページごとの「背景」と「立たせるもの」を決めておく。
   * 書いていないページは前のページのものを引き継ぐ（毎ページ書かなくてよいように）。
   *   actors … ページの頭で立っているもの
   *   final  … ページの終わりで立っているもの（cue で入れ替わるときだけ actors と違う）。
   *            次のページはこちらを引き継ぐ
   */
  function buildStages(story, pages) {
    var stages = [];
    var bg = story.bg || null;
    var actors = [];
    for (var i = 0; i < pages.length; i++) {
      if (pages[i].bg !== undefined) bg = pages[i].bg;
      if (pages[i].actors !== undefined) actors = pages[i].actors || [];
      var cue = pages[i].cue;
      var final = (cue && cue.actors !== undefined) ? (cue.actors || []) : actors;
      stages.push({ bg: bg, actors: actors, final: final });
      actors = final;
    }
    return stages;
  }

  /**
   * 条件（if）を満たすページだけを残す。条件の書き方は場面の when と同じ（StorySystem.isConditionMet）。
   * 場面8のページを場面4に差し込む、のように「そのときだけ入るページ」に使う
   */
  StoryScene.prototype._visiblePages = function (pages) {
    var result = [];
    var story = this.game.story;
    for (var i = 0; i < pages.length; i++) {
      var cond = pages[i]["if"];
      if (cond && !(story && story.isConditionMet(cond, this.game))) continue;
      result.push(pages[i]);
    }
    return result;
  };

  StoryScene.prototype.enter = function () {
    this._playBgm(this.story.bgm);
    this.pageElapsed = 0;
    this._startPage();
  };

  /** 曲を変える。"none" と書いたら止める（消え際をつけて） */
  StoryScene.prototype._playBgm = function (id) {
    if (!id) return;
    this.game.audio.playBgm(id === "none" ? null : id);
  };

  // --- 更新 ---

  StoryScene.prototype.update = function (dt) {
    if (this._done) return;
    var input = this.game.input;

    this.pageElapsed += dt;
    this.sceneElapsed += dt;
    this._bgSince += dt;
    if (this._skipTimer > 0) this._skipTimer = Math.max(0, this._skipTimer - dt);
    if (this._shake) this._shake.left -= dt;
    if (this._flash) this._flash.left -= dt;
    if (this._memory) this._memory.left -= dt;
    if (this._black) this._black.left -= dt;
    this._updateCue();

    if (input.isPressed("cancel")) {
      if (this._skipTimer > 0) { this._finish(); return; }
      this._skipTimer = this.layout.skipWindow || 2000;
      return;
    }

    var pointer = input.getPointer ? input.getPointer() : null;
    if (this._isChoice()) { this._updateChoice(input, pointer); return; }
    if (input.isPressed("confirm") || (pointer && pointer.clicked)) this._advance();
  };

  // --- 選択肢 ---

  StoryScene.prototype._isChoice = function () {
    return this._styleOf(this._page()) === "choice";
  };

  /** ↑↓・マウスで選び、決定で決める。出はじめ（pageFade）のあいだは受け付けない */
  StoryScene.prototype._updateChoice = function (input, pointer) {
    if (this.pageElapsed < this._textDuration()) return;
    var choices = this._page().choices || [];
    if (choices.length === 0) { if (input.isPressed("confirm")) this._advance(); return; }

    if (input.isPressed("up")) this.choiceIndex = (this.choiceIndex + choices.length - 1) % choices.length;
    if (input.isPressed("down")) this.choiceIndex = (this.choiceIndex + 1) % choices.length;

    if (pointer && pointer.inside) {
      for (var i = 0; i < choices.length; i++) {
        if (!NS.Panel.containsPoint(this._choiceItemRect(i, choices.length), pointer)) continue;
        if (pointer.moved || pointer.clicked) this.choiceIndex = i;
        if (pointer.clicked) { this._choose(i); return; }
      }
    }
    if (input.isPressed("confirm")) this._choose(this.choiceIndex);
  };

  /**
   * 選んだ項目のページを、このページのすぐあとに差し込んで進む。
   * 差し込んだページが終わると、選択肢の後ろに書いた共通のページへ続く
   */
  StoryScene.prototype._choose = function (index) {
    var choice = (this._page().choices || [])[index];
    if (!choice) return;
    var inserted = this._visiblePages(choice.pages || []);
    var args = [this.pageIndex + 1, 0].concat(inserted);
    Array.prototype.splice.apply(this.pages, args);
    this._stages = buildStages(this.story, this.pages);

    this._skipTimer = 0;
    this.pageIndex++;
    this.pageElapsed = 0;
    if (this.pageIndex >= this.pages.length) { this._finish(); return; }
    this._startPage();
  };

  /** 選択肢の枠（会話の窓の右上に乗せる） */
  StoryScene.prototype._choiceRect = function (count) {
    var C = this.layout.choice || {};
    var h = (C.padY || 10) * 2 + (C.itemHeight || 34) * count;
    return { x: C.x || 590, y: (C.bottom || 410) - h, w: C.w || 170, h: h };
  };

  StoryScene.prototype._choiceItemRect = function (i, count) {
    var C = this.layout.choice || {};
    var box = this._choiceRect(count);
    var ih = C.itemHeight || 34;
    return { x: box.x, y: box.y + (C.padY || 10) + ih * i, w: box.w, h: ih };
  };

  /**
   * 文字が出ている途中なら出しきる。出きっていれば次のページへ。
   * 文字のあとに起きる演出（cue）があるページは、文字を出しきった所で一度止めて、
   * 演出はきちんと見せる（2回目の決定で演出の終わりまで進む）
   */
  StoryScene.prototype._advance = function () {
    if (this.pageElapsed < this._textDuration()) {
      this.pageElapsed = this._textDuration();
      return;
    }
    if (!this._isPageShown()) {
      this.pageElapsed = this._pageDuration();
      return;
    }
    this._skipTimer = 0;
    this.pageIndex++;
    this.pageElapsed = 0;
    if (this.pageIndex >= this.pages.length) { this._finish(); return; }
    this._startPage();
  };

  /** ページの頭。背景の切り替え・効果音・揺れや光を起こす */
  StoryScene.prototype._startPage = function () {
    var page = this._page();
    var stage = this._stage();
    var before = this.pageIndex > 0 ? this._stages[this.pageIndex - 1] : null;

    var bgChanged = !before || before.bg !== stage.bg;
    if (bgChanged) {
      this._prevBg = before ? { id: before.bg, since: this._bgSince } : null;
      this._bgSince = 0;
    }

    // 別の場面の代わりを務めるページ（marks）は、その場面を見たことにする
    if (page.marks && this.game.story) this.game.story.markSeen(page.marks);

    // 選択肢のページだけ、カーソルの音を鳴らす
    this.silentCursor = !this._isChoice();
    this.choiceIndex = 0;

    // 曲はページの途中から変えられる（ダンジョンの話から拠点の話へ移るときなど）
    this._playBgm(page.bgm);
    if (page.se) this.game.audio.playSe(page.se);
    this._startFx(page.fx);

    // 暗転：真っ暗から明けていく。背景の切り替えはこの下で済ませる。
    // 背景が前のページと同じなら暗転しない（差し込んだページのあとで、二度暗くならないように）
    if (page.transition === "black" && bgChanged) {
      var time = this.layout.blackFade || 900;
      this._black = { time: time, left: time };
    }

    this._cueFired = false;
    this._cueAt = this._cueTime();
  };

  /**
   * 文字のあとに起きる演出（data/story.js の cue）の時刻。
   *   cue.at: "afterText"（文字を出しきったとき・既定）か、ページの頭からのミリ秒
   * cue が無いページは null
   */
  StoryScene.prototype._cueTime = function () {
    var cue = this._page().cue;
    if (!cue) return null;
    return (typeof cue.at === "number") ? cue.at : this._textDuration();
  };

  /** cue の時刻が来たら、効果音・揺れや光を起こす（立ち絵は描く側が切り替える） */
  StoryScene.prototype._updateCue = function () {
    if (this._cueFired || this._cueAt === null || this._cueAt === undefined) return;
    if (this.pageElapsed < this._cueAt) return;
    this._cueFired = true;
    var cue = this._page().cue || {};
    if (cue.se) this.game.audio.playSe(cue.se);
    this._startFx(cue.fx);
  };

  /**
   * 揺れと光。濃さは設定「エフェクトの濃さ」で掛ける（0 なら何もしない）
   * fx: "shake" / "flash" / { type, power, time, color } の1つか配列
   */
  StoryScene.prototype._startFx = function (fx) {
    if (!fx) return;
    var list = isArray(fx) ? fx : [fx];
    var intensity = this._effectIntensity();

    var defaults = this.layout.fx || {};
    for (var i = 0; i < list.length; i++) {
      var spec = (typeof list[i] === "string") ? { type: list[i] } : list[i];
      var base = defaults[spec.type] || {};
      var time = spec.time || base.time || 400;
      // 揺れと光は「エフェクトの濃さ」0 で出さない。記憶の重ねは話の一部なので残す
      if (intensity <= 0 && spec.type !== "memory") continue;
      if (spec.type === "shake") {
        this._shake = { power: (spec.power || base.power || 6) * intensity, time: time, left: time };
      } else if (spec.type === "memory") {
        // 別の背景を一瞬だけ重ねる（記憶がよぎる）。光ではないので濃さは設定で変えない
        this._memory = { bg: spec.bg || base.bg, alpha: spec.alpha || base.alpha || 0.55,
                         time: time, left: time };
      } else if (spec.type === "flash") {
        this._flash = { color: spec.color || base.color || "#ffffff",
                        alpha: Math.min(1, (spec.alpha || base.alpha || 0.8) * intensity),
                        time: time, left: time };
      }
    }
  };

  /** 設定「エフェクトの濃さ」の倍率（戦闘と同じ表 data/ui.js の battle.animation.effectScale） */
  StoryScene.prototype._effectIntensity = function () {
    var table = ((((this.game.data.ui || {}).battle) || {}).animation || {}).effectScale;
    var settings = this.game.settings;
    if (!table || !settings) return 1;
    var level = settings.get("effectLevel");
    if (typeof level !== "number") return 1;
    var value = table[Math.max(0, Math.min(table.length - 1, level))];
    return (typeof value === "number") ? value : 1;
  };

  StoryScene.prototype._finish = function () {
    if (this._done) return;
    this._done = true;
    // 同じきっかけでまだ見ていない場面があれば、続けて流す
    if (this.trigger && this.game.playStory) {
      this.game.playStory(this.trigger, this.nextScene);
      return;
    }
    this.game.scenes.change(this.nextScene);
  };

  // --- ページの中身 ---

  StoryScene.prototype._page = function () {
    return this.pages[this.pageIndex] || { lines: [] };
  };

  StoryScene.prototype._stage = function () {
    return this._stages[this.pageIndex] || { bg: null, actors: [] };
  };

  StoryScene.prototype._styleOf = function (page) {
    return page.style || this.story.style || "narration";
  };

  /** {player}（主人公の名前）と {me}（主人公の一人称）を差し込んだ文 */
  StoryScene.prototype._fill = function (text) {
    var game = this.game;
    var name = game.getPlayerName ? game.getPlayerName() : "";
    var me = game.getPlayerFirstPerson ? game.getPlayerFirstPerson() : "";
    return String(text || "").replace(/\{player\}/g, name).replace(/\{me\}/g, me);
  };

  StoryScene.prototype._lines = function (page) {
    var lines = page.lines || [];
    var result = [];
    for (var i = 0; i < lines.length; i++) result.push(this._fill(lines[i]));
    return result;
  };

  StoryScene.prototype._charCount = function (lines) {
    var n = 0;
    for (var i = 0; i < lines.length; i++) n += lines[i].length;
    return n;
  };

  /** 文字が出はじめるまでの待ち（data/story.js の delay。「少し間を置く」ページ用） */
  StoryScene.prototype._delay = function () {
    return this._page().delay || 0;
  };

  /** そのページの文字が出きるまでの時間（ms） */
  StoryScene.prototype._textDuration = function () {
    var page = this._page();
    if (this._styleOf(page) === "title") return this._delay() + ((this.layout.title || {}).duration || 1600);
    // 選択肢は、問いかけの文がもう出ているので、窓が浮かぶ時間だけ待つ
    if (this._styleOf(page) === "choice") return this._delay() + (this.layout.pageFade || 0);
    var cps = this.layout.charsPerSecond || 40;
    return this._delay() + (this.layout.pageFade || 0) + this._charCount(this._lines(page)) * 1000 / cps;
  };

  /** ページが出きるまでの時間。文字のあとの演出（cue）があれば、その登場の動きまで含む */
  StoryScene.prototype._pageDuration = function () {
    var text = this._textDuration();
    if (this._cueAt === null || this._cueAt === undefined) return text;
    var cue = this._page().cue || {};
    var hold = (cue.hold !== undefined) ? cue.hold : (this.layout.actorEnter || 700);
    return Math.max(text, this._cueAt + hold);
  };

  StoryScene.prototype._isPageShown = function () {
    return this.pageElapsed >= this._pageDuration();
  };

  /** いま何文字目まで出ているか */
  StoryScene.prototype._shownChars = function () {
    if (this.pageElapsed >= this._textDuration()) return Infinity;
    var cps = this.layout.charsPerSecond || 40;
    var t = this.pageElapsed - this._delay() - (this.layout.pageFade || 0);
    return (t <= 0) ? 0 : Math.floor(t * cps / 1000);
  };

  /** 出ているぶんだけに切った行 */
  StoryScene.prototype._visibleLines = function (lines) {
    if (this.pageElapsed >= this._textDuration()) return lines;

    var left = this._shownChars();
    var result = [];
    for (var i = 0; i < lines.length && left > 0; i++) {
      result.push(lines[i].slice(0, left));
      left -= lines[i].length;
    }
    return result;
  };

  // --- 描画 ---

  StoryScene.prototype.render = function (ctx) {
    var w = this.game.canvas.width;
    var h = this.game.canvas.height;
    var L = this.layout;

    this.renderer.clear(L.background || "#05070d", w, h);
    if (this._done) return;

    // 揺れは背景と立ち絵だけに掛ける（文字まで揺らすと読めない）
    ctx.save();
    var shake = this._shakeOffset();
    ctx.translate(shake.x, shake.y);
    this._renderBackdrop(ctx, w, h);
    this._renderMemory(ctx, w, h);
    this._renderActors(ctx);
    ctx.restore();

    this._renderVignette(ctx, w, h);
    this._renderBlack(ctx, w, h);
    this._renderLetterbox(ctx, w, h);

    var page = this._page();
    var lines = this._lines(page);
    var fade = L.pageFade || 0;
    var textTime = this.pageElapsed - this._delay();
    var alpha = (fade > 0) ? Math.max(0, Math.min(1, textTime / fade)) : (textTime >= 0 ? 1 : 0);

    ctx.save();
    ctx.globalAlpha = alpha;
    var style = this._styleOf(page);
    if (style === "dialogue") this._renderDialogue(page, lines);
    else if (style === "title") this._renderTitle(lines);
    else if (style !== "choice") this._renderNarration(lines);
    ctx.restore();
    // 選択肢は、問いかけの文を出したまま重ねるので、ページの浮かび上がりとは別に描く
    if (style === "choice") this._renderChoice(page, alpha);

    this._renderFlash(ctx, w, h);
    this._renderDraftBadge();
    this._renderHint();
  };

  StoryScene.prototype._backdropDef = function (id) {
    return ((this.layout.backdrops || {})[id]) || null;
  };

  /** 背景。切り替わった直後は、前の背景の上に新しい背景を溶かして重ねる */
  StoryScene.prototype._renderBackdrop = function (ctx, w, h) {
    var env = { game: this.game, sprites: this.sprites, w: w, h: h };
    var stage = this._stage();
    var fadeTime = this.layout.bgFade || 700;

    if (this._prevBg && this._bgSince < fadeTime) {
      NS.StoryBackdrop.draw(ctx, this._backdropDef(this._prevBg.id),
        this._prevBg.since + this._bgSince, env);
      ctx.save();
      ctx.globalAlpha = this._bgSince / fadeTime;
      NS.StoryBackdrop.draw(ctx, this._backdropDef(stage.bg), this._bgSince, env);
      ctx.restore();
      return;
    }
    this._prevBg = null;
    NS.StoryBackdrop.draw(ctx, this._backdropDef(stage.bg), this._bgSince, env);
  };

  /**
   * 立たせるもの。
   *   前にいなかったもの … 登場の動きをする
   *   前にいて、いなくなったもの … その場で薄れて下がる
   * 文字のあとの演出（cue）で入れ替わるページは、その時刻を境に「前」と「いま」を切り替える
   */
  StoryScene.prototype._renderActors = function (ctx) {
    var stage = this._stage();
    var prevStage = this.pageIndex > 0 ? this._stages[this.pageIndex - 1] : null;
    var cued = this._cueFired;
    var current = (cued ? stage.final : stage.actors) || [];
    var before = (cued ? stage.actors : (prevStage ? prevStage.final : [])) || [];
    var since = cued ? (this.pageElapsed - this._cueAt) : this.pageElapsed;

    // 下がっていくもの（先に描いて、登場するものの後ろにする）
    var exitTime = this.layout.actorExit || 500;
    var fading = 1 - since / exitTime;
    if (fading > 0) {
      for (var j = 0; j < before.length; j++) {
        if (containsActor(current, before[j])) continue;
        this._drawActor(ctx, before[j], 1, j, fading);
      }
    }

    for (var i = 0; i < current.length; i++) {
      var actor = current[i];
      var isNew = !containsActor(before, actor);
      var enterTime = actor.enterTime || this.layout.actorEnter || 700;
      var p = isNew ? Math.max(0, Math.min(1, since / enterTime)) : 1;
      this._drawActor(ctx, actor, easeOut(p), i);
    }
  };

  /** 別の背景を一瞬だけ重ねる（fx の memory）。ふわっと濃くなって、ふわっと消える */
  StoryScene.prototype._renderMemory = function (ctx, w, h) {
    var m = this._memory;
    if (!m || m.left <= 0) return;
    var p = 1 - m.left / m.time;
    ctx.save();
    ctx.globalAlpha = m.alpha * Math.sin(Math.PI * p);
    NS.StoryBackdrop.draw(ctx, this._backdropDef(m.bg), this.sceneElapsed,
      { game: this.game, sprites: this.sprites, w: w, h: h });
    ctx.restore();
  };

  /** 暗転（ページの transition: "black"）。真っ暗から明けていく */
  StoryScene.prototype._renderBlack = function (ctx, w, h) {
    var b = this._black;
    if (!b || b.left <= 0) return;
    ctx.save();
    ctx.globalAlpha = b.left / b.time;
    ctx.fillStyle = "#000000";
    ctx.fillRect(0, 0, w, h);
    ctx.restore();
  };

  /** 立ち絵の絵・動き・大きさを決める */
  StoryScene.prototype._actorLook = function (actor) {
    var data = this.game.data;
    if (actor.player) {
      var look = NS.PlayerLook.appearanceOf(data);
      return { sprite: NS.PlayerLook.spritesFor(data, this.game.getPlayerColor()),
               motion: actor.motion || look.idleMotion || "breathe" };
    }
    if (actor.monster) {
      var m = (data.monsters || {})[actor.monster] || {};
      return { sprite: m.sprite, motion: actor.motion || m.motion };
    }
    return { sprite: actor.sprite, motion: actor.motion || null };
  };

  /**
   * 1体ぶん描く。x は中心、y は足元。
   * 登場の動き（enter）：fade（浮かぶ）/ rise（下から）/ left・right（横から）/ drop（上から落ちる）/ grow（大きくなる）
   * silhouette に色を書くと、その色の影だけを描く（正体を見せない出し方）
   */
  StoryScene.prototype._drawActor = function (ctx, actor, p, index, fading) {
    var look = this._actorLook(actor);
    if (!look.sprite) return;

    var size = actor.size || 96;
    var motion = NS.Motion.forSprite(this.game.data, look.sprite, look.motion,
      this.game.clock, index * 0.37) || NS.Motion.still();
    var t = copy(motion);

    var enter = actor.enter || "fade";
    var dist = (this.layout.actorDistance || 60);
    if (enter === "rise") t.offsetY = (t.offsetY || 0) + dist * (1 - p);
    if (enter === "drop") t.offsetY = (t.offsetY || 0) - dist * 1.5 * (1 - p);
    if (enter === "left") t.offsetX = (t.offsetX || 0) - dist * 1.5 * (1 - p);
    if (enter === "right") t.offsetX = (t.offsetX || 0) + dist * 1.5 * (1 - p);
    if (enter === "grow") t.scale = (t.scale === undefined ? 1 : t.scale) * (0.6 + 0.4 * p);
    t.alpha = (t.alpha === undefined ? 1 : t.alpha) * p * (actor.alpha === undefined ? 1 : actor.alpha)
      * (fading === undefined ? 1 : fading);

    var x = actor.x - size / 2;
    var y = actor.y - size;

    if (actor.glow) this._drawGlow(ctx, actor, size, p * (fading === undefined ? 1 : fading));

    if (actor.silhouette) {
      this._drawSilhouette(ctx, look.sprite, x, y, size, t,
        (typeof actor.silhouette === "string") ? actor.silhouette : "#000000");
      return;
    }
    this.sprites.drawMotion(look.sprite, x, y, size, size, t);
  };

  /** 立ち絵の後ろの淡い光 */
  StoryScene.prototype._drawGlow = function (ctx, actor, size, p) {
    var cx = actor.x;
    var cy = actor.y - size / 2;
    var r = size * 0.9;
    var g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
    g.addColorStop(0, actor.glow);
    g.addColorStop(1, "rgba(0,0,0,0)");
    ctx.save();
    ctx.globalAlpha = 0.5 * p * (0.85 + 0.15 * Math.sin(this.game.clock / 400));
    ctx.fillStyle = g;
    ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
    ctx.restore();
  };

  /** 影だけを描く。作業用のキャンバスに描いてから、形の中だけを塗りつぶす */
  StoryScene.prototype._drawSilhouette = function (ctx, sprite, x, y, size, t, color) {
    var margin = Math.ceil(size * 0.5);
    var box = size + margin * 2;
    if (!this._work) {
      var canvas = document.createElement("canvas");
      this._work = { canvas: canvas, ctx: canvas.getContext("2d") };
      this._workSprites = new NS.SpriteRenderer(this._work.ctx, this.game.assets);
    }
    var work = this._work;
    if (work.canvas.width !== box || work.canvas.height !== box) {
      work.canvas.width = box;
      work.canvas.height = box;
    }
    work.ctx.imageSmoothingEnabled = false;
    work.ctx.clearRect(0, 0, box, box);

    var alpha = t.alpha;
    var solid = copy(t);
    solid.alpha = 1;
    this._workSprites.drawMotion(sprite, margin, margin, size, size, solid);

    work.ctx.save();
    work.ctx.globalCompositeOperation = "source-in";
    work.ctx.fillStyle = color;
    work.ctx.fillRect(0, 0, box, box);
    work.ctx.restore();

    ctx.save();
    ctx.imageSmoothingEnabled = false;
    ctx.globalAlpha = ctx.globalAlpha * (alpha === undefined ? 1 : alpha);
    ctx.drawImage(work.canvas, x - margin, y - margin);
    ctx.restore();
  };

  /** 画面の四隅を暗くする。背景と文字の境目をなじませる */
  StoryScene.prototype._renderVignette = function (ctx, w, h) {
    var V = this.layout.vignette;
    if (!V) return;
    var g = ctx.createRadialGradient(w / 2, h / 2, h * 0.35, w / 2, h / 2, w * 0.7);
    g.addColorStop(0, "rgba(0,0,0,0)");
    g.addColorStop(1, "rgba(0,0,0," + (V.alpha || 0.6) + ")");
    ctx.save();
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    ctx.restore();
  };

  /** 上下の黒い帯（場面の letterbox: true のときだけ）。始まりに外から滑り込む */
  StoryScene.prototype._renderLetterbox = function (ctx, w, h) {
    if (!this.story.letterbox) return;
    var B = this.layout.letterbox || {};
    var height = B.height || 48;
    var p = easeOut(Math.min(1, this.sceneElapsed / (B.time || 800)));
    var bar = height * p;
    ctx.save();
    ctx.fillStyle = B.color || "#000000";
    ctx.fillRect(0, 0, w, bar);
    ctx.fillRect(0, h - bar, w, bar);
    ctx.restore();
  };

  /** 光。一瞬で明るくなり、ゆっくり引いていく */
  StoryScene.prototype._renderFlash = function (ctx, w, h) {
    var f = this._flash;
    if (!f || f.left <= 0) return;
    ctx.save();
    ctx.globalAlpha = f.alpha * (f.left / f.time);
    ctx.fillStyle = f.color;
    ctx.fillRect(0, 0, w, h);
    ctx.restore();
  };

  /** 揺れのずれ。残り時間に合わせて小さくなる */
  StoryScene.prototype._shakeOffset = function () {
    var s = this._shake;
    if (!s || s.left <= 0) return { x: 0, y: 0 };
    var power = s.power * (s.left / s.time);
    var clock = this.game.clock;
    return { x: Math.sin(clock * 0.09) * power, y: Math.cos(clock * 0.113) * power * 0.7 };
  };

  /** 語り：真ん中にそろえて、行の塊ごと縦の中央に置く。背景の上でも読めるよう影を付ける */
  StoryScene.prototype._renderNarration = function (lines) {
    var N = this.layout.narration || {};
    var w = this.game.canvas.width;
    var lineHeight = N.lineHeight || 34;
    var top = (N.centerY || 280) - lineHeight * (lines.length - 1) / 2;
    var visible = this._visibleLines(lines);
    var ctx = this.panel.ctx;

    ctx.save();
    ctx.shadowColor = N.shadowColor || "rgba(0,0,0,0.9)";
    ctx.shadowBlur = N.shadowBlur || 8;
    for (var i = 0; i < visible.length; i++) {
      this.panel.drawText(visible[i], w / 2, top + lineHeight * i,
        { align: "center", font: N.font, color: N.color || this.theme.textColor });
    }
    ctx.restore();
    if (this._isPageShown()) {
      this._renderMore(w / 2, top + lineHeight * (lines.length - 1) + (N.moreGap || 30), "center");
    }
  };

  /**
   * 見出し：1文字ずつ並べ、字間を広いところから詰めながら浮かび上がらせる。
   * 上下の細い線は、真ん中から左右へ伸びる
   */
  StoryScene.prototype._renderTitle = function (lines) {
    var T = this.layout.title || {};
    var ctx = this.panel.ctx;
    var w = this.game.canvas.width;
    var duration = T.duration || 1600;
    var p = easeOut(Math.max(0, Math.min(1, (this.pageElapsed - this._delay()) / duration)));
    var lineHeight = T.lineHeight || 52;
    var top = (T.centerY || 280) - lineHeight * (lines.length - 1) / 2;

    ctx.save();
    ctx.font = T.font || "30px monospace";
    ctx.fillStyle = T.color || "#e6ecff";
    ctx.shadowColor = T.glow || "rgba(120,160,255,0.6)";
    ctx.shadowBlur = 12 * p;
    ctx.textAlign = "center";
    for (var i = 0; i < lines.length; i++) {
      var chars = lines[i].split("");
      var spacing = (T.spacing || 6) + (T.spacingFrom || 30) * (1 - p);
      var widths = [];
      var total = 0;
      for (var c = 0; c < chars.length; c++) {
        widths.push(ctx.measureText(chars[c]).width);
        total += widths[c] + (c > 0 ? spacing : 0);
      }
      var x = w / 2 - total / 2;
      ctx.globalAlpha = p;
      for (c = 0; c < chars.length; c++) {
        ctx.fillText(chars[c], x + widths[c] / 2, top + lineHeight * i);
        x += widths[c] + spacing;
      }
    }
    ctx.restore();

    // 上下の線
    var half = (T.lineWidth || 220) * p;
    var y1 = top - lineHeight * 0.9;
    var y2 = top + lineHeight * (lines.length - 1) + lineHeight * 0.5;
    ctx.save();
    ctx.strokeStyle = T.ruleColor || "#4a6ba8";
    ctx.globalAlpha = p;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(w / 2 - half, y1); ctx.lineTo(w / 2 + half, y1);
    ctx.moveTo(w / 2 - half, y2); ctx.lineTo(w / 2 + half, y2);
    ctx.stroke();
    ctx.restore();

    if (this._isPageShown()) this._renderMore(w / 2, y2 + 34, "center");
  };

  /**
   * 選択肢：下の窓に問いかけの文を出したまま、右上に選ぶ項目の枠を重ねる。
   * 問いかけの文はこのページに lines を書けばそれを、書かなければ前のページの台詞を使う
   */
  StoryScene.prototype._renderChoice = function (page, alpha) {
    var ctx = this.panel.ctx;
    var prompt = page;
    if (!page.lines || page.lines.length === 0) {
      var prev = this.pages[this.pageIndex - 1];
      prompt = prev ? { speaker: prev.speaker, lines: prev.lines } : { lines: [] };
    }
    this._renderDialogue(prompt, this._lines(prompt), true);

    var C = this.layout.choice || {};
    var choices = page.choices || [];
    var box = this._choiceRect(choices.length);
    var t = this.theme;

    ctx.save();
    ctx.globalAlpha = alpha;
    this.panel.drawBox(box);
    for (var i = 0; i < choices.length; i++) {
      var r = this._choiceItemRect(i, choices.length);
      var on = (i === this.choiceIndex);
      var baseY = r.y + r.h / 2 + 6;
      if (on) this.panel.drawText("▶", r.x + 14, baseY, { font: C.font, color: t.cursorColor });
      this.panel.drawText(this._fill(choices[i].label), r.x + 38, baseY,
        { font: C.font, color: on ? t.cursorColor : t.textColor });
    }
    ctx.restore();
  };

  /** 会話：下の窓。名前は窓の上の縁に乗せる。full を渡すと、文字を1文字ずつ出さずに全部出す */
  StoryScene.prototype._renderDialogue = function (page, lines, full) {
    var D = this.layout.dialogue || {};
    var box = D.box || { x: 40, y: 420, w: 720, h: 140 };
    var t = this.theme;

    this.panel.drawBox(box);

    var speaker = this._fill(page.speaker);
    if (speaker) {
      var tag = D.nameTag || { x: 56, y: 400, h: 30, padX: 14 };
      var ctx = this.panel.ctx;
      ctx.font = D.nameFont || t.font || "16px monospace";
      var tagW = ctx.measureText(speaker).width + (tag.padX || 14) * 2;
      this.panel.drawBox({ x: tag.x, y: tag.y, w: tagW, h: tag.h });
      this.panel.drawText(speaker, tag.x + (tag.padX || 14), tag.y + tag.h / 2 + 6,
        { font: D.nameFont, color: D.nameColor || t.cursorColor });
    }

    var visible = full ? lines : this._visibleLines(lines);
    var x = box.x + (D.padX || 24);
    var y = box.y + (D.padTop || 44);
    var lineHeight = D.lineHeight || 28;
    for (var i = 0; i < visible.length; i++) {
      this.panel.drawText(visible[i], x, y + lineHeight * i,
        { font: D.font, color: D.color || t.textColor });
    }
    if (!full && this._isPageShown()) {
      this._renderMore(box.x + box.w - (D.padX || 24), box.y + box.h - 16, "right");
    }
  };

  /** 「次へ」の印。出きったページにだけ、ゆっくり点滅させて出す */
  StoryScene.prototype._renderMore = function (x, y, align) {
    var M = this.layout.more || {};
    var period = M.blink || 900;
    if (Math.floor(this.game.clock / (period / 2)) % 2 === 1) return;
    this.panel.drawText(M.text || "▼", x, y,
      { align: align, font: M.font, color: M.color || this.theme.subTextColor });
  };

  /** 仮の文章の印（data/story.js の draft） */
  StoryScene.prototype._renderDraftBadge = function () {
    if (!this.story.draft) return;
    var B = this.layout.draftBadge || {};
    this.panel.drawText(this.texts.draft || "", B.x || 780, B.y || 30,
      { align: "right", font: B.font || this.theme.smallFont, color: B.color || this.theme.hintColor });
  };

  StoryScene.prototype._renderHint = function () {
    var H = this.layout.hint || {};
    var text = (this._skipTimer > 0) ? this.texts.skipConfirm
             : (this._isChoice() ? (this.texts.choiceHint || this.texts.hint) : this.texts.hint);
    var color = (this._skipTimer > 0) ? (H.warnColor || this.theme.cursorColor) : (H.color || this.theme.hintColor);
    this.panel.drawText(text || "", H.x || 780, H.y || 585,
      { align: "right", font: H.font || this.theme.smallFont, color: color });
  };

  // --- 小さな道具 ---

  function easeOut(p) {
    return 1 - Math.pow(1 - p, 3);
  }

  function isArray(value) {
    return Object.prototype.toString.call(value) === "[object Array]";
  }

  function copy(obj) {
    var result = {};
    for (var key in obj) result[key] = obj[key];
    return result;
  }

  /** 同じ立ち絵か（id を書けば id で、書かなければ中身で比べる） */
  function actorKey(actor) {
    return actor.id || actor.monster || actor.sprite || (actor.player ? "player" : "");
  }

  function containsActor(list, actor) {
    var key = actorKey(actor);
    for (var i = 0; i < list.length; i++) {
      if (actorKey(list[i]) === key) return true;
    }
    return false;
  }

  NS.StoryScene = StoryScene;
})(window.MyGame);
