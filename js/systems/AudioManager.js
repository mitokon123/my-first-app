/**
 * AudioManager.js
 * BGMと効果音を鳴らす係。
 *
 * 鳴らすものの一覧は data/audio.js、音量は data/settings.js。
 * ここには「どの音を」「どれくらいの大きさで」といった数値は書かない。
 *
 * ─────────────────────────────────────────────
 * ▼ 音源が無くても止まらない
 *
 * ファイルを置いていない・読み込めなかった音は**黙って無音になる**。
 * 一度失敗した音は覚えておき、二度と読みに行かない
 * （毎フレーム読みに行って、そのたびに失敗が積み上がるのを防ぐ）。
 *
 * ▼ 最初の操作まで鳴らせない（ブラウザの決まり）
 *
 * どのブラウザも、**画面を一度も触っていないうちは音を鳴らさない**。
 * タイトルでいきなり playBgm しても、そこでは鳴らない。
 * そこで、鳴らせなかったBGMを覚えておき、
 * 最初のクリックかキー入力（unlock）のときに鳴らし直す。
 *
 * ▼ 同じBGMは鳴らし直さない
 *
 * 拠点 → ショップ → 拠点 と移っても、同じ曲なら流れたまま。
 * 場面が変わるたびに頭から鳴り直すと、落ち着かない。
 *
 * ▼ 効果音は数個ずつ用意して使い回す
 *
 * 1つの Audio は、鳴っている最中にもう一度鳴らすと頭に戻ってしまう。
 * 同じ音が重なる場面（複数体が同時に殴られる）があるので、
 * 1種類につき数個持っておき、空いているものを使う。
 * 逆にメニュー音は重ねたくないので、data/audio.js で solo を付けた音は
 * 1つだけ持ち、頭から鳴り直す。
 * ─────────────────────────────────────────────
 */
(function (NS) {
  "use strict";

  var SE_POOL_SIZE = 4;   // 1種類の効果音を何個まで重ねられるか
  var FADE_STEP_MS = 30;  // フェードで音量を動かす間隔。長さは data/audio.js の fadeMs

  /**
   * @param {MyGame.GameData} gameData
   * @param {MyGame.SettingsManager} settings
   */
  function AudioManager(gameData, settings) {
    this.data = gameData;
    this.settings = settings || null;
    this.config = gameData.audio || {};

    this.unlocked = false;    // 一度でも操作されたか
    this.currentBgmId = null; // いま流れているBGMのid
    this.pendingBgmId = null; // 操作待ちで鳴らせなかったBGM

    this._bgm = null;         // いま鳴っている Audio
    this._sePools = {};       // id → Audio の配列
    this._failed = {};        // 読み込めなかった id（二度と読みに行かない）
  }

  // --- 設定から音量を作る ---

  AudioManager.prototype._setting = function (id, fallback) {
    if (!this.settings) return fallback;

    var value = this.settings.get(id);
    return (typeof value === "number") ? value / 100 : fallback;
  };

  /** BGMの実際の音量（0〜1） */
  AudioManager.prototype._bgmVolume = function (defVolume) {
    return clamp01((defVolume === undefined ? 1 : defVolume)
      * this._setting("masterVolume", 0.7) * this._setting("bgmVolume", 0.7));
  };

  /** 効果音の実際の音量（0〜1） */
  AudioManager.prototype._seVolume = function (defVolume) {
    return clamp01((defVolume === undefined ? 1 : defVolume)
      * this._setting("masterVolume", 0.7) * this._setting("seVolume", 0.8));
  };

  // --- 音源を用意する ---

  /** 定義を引く。file が無ければ null（＝無音） */
  AudioManager.prototype._defOf = function (kind, id) {
    var group = this.config[kind] || {};
    var def = group[id];
    if (!def || !def.file) return null;
    if (isArray(def.file) && def.file.length === 0) return null;
    return def;
  };

  /**
   * 鳴らすファイル名を1つ決める。
   *
   * ★ file に配列を書くと、そのどれかを毎回ランダムに選ぶ。
   *   同じ攻撃音が毎回まったく同じだと機械的に聞こえるので、
   *   2〜3種類を用意して散らすための仕組み。
   *     hit: { file: ["hit1.wav", "hit2.wav", "hit3.wav"] }
   */
  AudioManager.prototype._pickFile = function (def) {
    if (!isArray(def.file)) return def.file;
    return def.file[Math.floor(Math.random() * def.file.length)];
  };

  /**
   * Audio を1つ作る。作れなければ null。
   * 読み込みに失敗した音は _failed に覚えて、次からは作らない。
   */
  AudioManager.prototype._create = function (kind, id, def) {
    var file = this._pickFile(def);
    var key = kind + ":" + file;   // 配列のときはファイルごとに失敗を覚える
    if (this._failed[key]) return null;

    var self = this;
    var audio = new window.Audio((this.config.basePath || "") + file);
    audio.preload = "auto";
    audio.dataset.file = file;

    // 置き忘れ・名前違いはここで拾う。以後この音は鳴らさない
    audio.addEventListener("error", function () { self._failed[key] = true; });
    return audio;
  };

  // --- BGM ---

  /**
   * BGMを流す。同じidが既に流れていれば何もしない。
   * @param {string|null} id data/audio.js の bgm のid。null で止める
   */
  AudioManager.prototype.playBgm = function (id) {
    if (id === this.currentBgmId) return;

    // いま鳴っている曲は消え際をつけて止める（ぶつ切りにしない）
    var fadeMs = this.config.fadeMs || 0;
    var previous = this._bgm;
    this._bgm = null;
    this.pendingBgmId = null;
    if (previous) this._fadeOut(previous, fadeMs);

    this.currentBgmId = id;
    if (!id) return;

    var def = this._defOf("bgm", id);
    if (!def) return;   // 音源が無い場面は無音のまま進む

    var audio = this._create("bgm", id, def);
    if (!audio) return;

    audio.loop = (def.loop === undefined) ? true : !!def.loop;
    this._bgmTarget = this._bgmVolume(def.volume);
    // 出はじめも少しずつ上げる。0 から始めて目標の音量へ
    audio.volume = fadeMs > 0 ? 0 : this._bgmTarget;

    this._bgm = audio;
    this._tryPlay(audio, id);
    if (fadeMs > 0) this._fadeIn(audio, fadeMs);
  };

  /**
   * 音量を少しずつ下げて止める。
   * 止め終わるまでは別の Audio として鳴り続けるので、次の曲と少し重なる（クロスフェード）。
   */
  AudioManager.prototype._fadeOut = function (audio, ms) {
    if (ms <= 0) {
      try { audio.pause(); } catch (e) { /* 鳴っていなければ何もしなくてよい */ }
      return;
    }
    var start = audio.volume;
    var steps = Math.max(1, Math.round(ms / FADE_STEP_MS));
    var done = 0;
    var timer = setInterval(function () {
      done++;
      audio.volume = Math.max(0, start * (1 - done / steps));
      if (done >= steps) {
        clearInterval(timer);
        try { audio.pause(); } catch (e) { /* 同上 */ }
      }
    }, FADE_STEP_MS);
  };

  /**
   * 音量を 0 から目標（_bgmTarget）へ少しずつ上げる。
   * 途中で設定の音量が変わっても、目標を毎回読むので追いつく。
   * 途中で別の曲に変わったら（_bgm が別物になったら）そこでやめる。
   */
  AudioManager.prototype._fadeIn = function (audio, ms) {
    var self = this;
    var steps = Math.max(1, Math.round(ms / FADE_STEP_MS));
    var done = 0;
    this._fadingIn = audio;
    var timer = setInterval(function () {
      if (self._bgm !== audio) { clearInterval(timer); return; }
      done++;
      audio.volume = clamp01(self._bgmTarget * Math.min(1, done / steps));
      if (done >= steps) {
        clearInterval(timer);
        if (self._fadingIn === audio) self._fadingIn = null;
      }
    }, FADE_STEP_MS);
  };

  /**
   * 鳴らしてみる。ブラウザに止められたら、最初の操作まで待つ。
   * @param {HTMLAudioElement} audio
   * @param {string} id
   */
  AudioManager.prototype._tryPlay = function (audio, id) {
    var self = this;
    var promise = audio.play();

    // 古いブラウザは play() が何も返さない
    if (!promise || !promise.catch) return;

    promise.catch(function () {
      // まだ操作されていないだけなら、あとで鳴らし直す。
      // それ以外（ファイルが無い等）は _failed 側で拾われる
      if (!self.unlocked) self.pendingBgmId = id;
    });
  };

  AudioManager.prototype.stopBgm = function () {
    if (this._bgm) {
      try { this._bgm.pause(); } catch (e) { /* 鳴っていなければ何もしなくてよい */ }
      this._bgm = null;
    }
    this.currentBgmId = null;
    this.pendingBgmId = null;
  };

  // --- 効果音 ---

  /**
   * 効果音を鳴らす。
   * 音源が無い・まだ操作されていない場合は、何も起きない（エラーにしない）。
   */
  AudioManager.prototype.playSe = function (id) {
    if (!this.unlocked) return;   // 操作前は鳴らせない。溜めても意味がないので捨てる

    var raw = (this.config.se || {})[id];
    // ファイルが無く、合成の指定（synth）があれば、その場で音を作って鳴らす
    if (raw && !raw.file && raw.synth) {
      this._playSynth(raw);
      return;
    }

    var def = this._defOf("se", id);
    if (!def) return;

    var audio = this._takeFromPool(id, def);
    if (!audio) return;

    audio.volume = this._seVolume(def.volume);
    try {
      audio.currentTime = 0;
      var promise = audio.play();
      if (promise && promise.catch) promise.catch(function () { /* 鳴らなくても進む */ });
    } catch (e) { /* 同上 */ }
  };

  /** 空いている Audio を1つ借りる。無ければ作る */
  AudioManager.prototype._takeFromPool = function (id, def) {
    var pool = this._sePools[id];
    if (!pool) pool = this._sePools[id] = [];

    // 重ねない音（solo）は1つだけ持ち、鳴っていても頭から鳴り直す。
    // カーソルを連打すると同じ音が4つ重なって膨らむのを防ぐ
    if (def.solo && !isArray(def.file)) {
      if (pool.length > 0) return pool[0];
      var single = this._create("se", id, def);
      if (single) pool.push(single);
      return single;
    }

    // 複数ファイルの音は、毎回違うものを引きたいので使い回さず作り直す。
    // 1つだけの音は今までどおり使い回す（作り直すと読み込みが毎回走る）
    var random = isArray(def.file) && def.file.length > 1;

    if (!random) {
      for (var i = 0; i < pool.length; i++) {
        if (pool[i].paused || pool[i].ended) return pool[i];
      }
    }
    if (pool.length >= SE_POOL_SIZE) {
      var oldest = pool.shift();   // 全部鳴っていたら古いものを奪う
      if (!random) { pool.push(oldest); return oldest; }
    }

    var audio = this._create("se", id, def);
    if (!audio) return null;

    pool.push(audio);
    return audio;
  };

  // --- 合成の効果音（ファイルを置かずに、波形の指定から作る） ---

  /**
   * Web Audio の入口。最初に鳴らすときに作る（操作前に作ると止められる）。
   * 使えない環境では null（合成の音は黙って鳴らない）
   */
  AudioManager.prototype._audioContext = function () {
    if (this._ctx) return this._ctx;
    var Ctor = window.AudioContext || window.webkitAudioContext;
    if (!Ctor) return null;
    try {
      this._ctx = new Ctor();
    } catch (e) {
      this._ctx = null;
    }
    return this._ctx;
  };

  /**
   * data/audio.js の synth（層の配列）を鳴らす。
   *
   * 1つの音は「層（layer）」を重ねて作る。層は2種類：
   *   { kind: "tone",  wave: "square"|"triangle"|"sawtooth"|"sine",
   *     from: 440, to: 220,        … 周波数。to を書くと from から滑らかに動く
   *     start: 0, duration: 0.15,  … 何秒後に鳴り始めて、何秒鳴るか
   *     gain: 0.5 }                … この層の大きさ（0〜1）
   *   { kind: "noise", filterFrom: 1200, filterTo: 200, start, duration, gain }
   *     … ざらざらした音。ローパスの周波数を動かすと「バシッ」「シュッ」になる
   *     filterType: "lowpass"（既定）| "highpass" | "bandpass"
   *       highpass は「シャー」（高い成分だけ）、bandpass は「ヒュー」（一帯だけ）
   * どちらの層にも書けるもの：
   *   attack … 何秒かけて膨らむか（省略で 0＝いきなり最大）。炎や風の「ゴォ」に使う
   *   hold   … 最大のまま何秒保つか（省略で 0＝すぐ落ち始める）。落ち方は速いので、伸ばしたいときに
   * どの層も、鳴り終わりに向けて音量が 0 へ落ちる（ぶつ切りにならない）。
   */
  AudioManager.prototype._playSynth = function (def) {
    var ctx = this._audioContext();
    if (!ctx) return;
    if (ctx.state === "suspended" && ctx.resume) ctx.resume();

    var master = ctx.createGain();
    master.gain.value = this._seVolume(def.volume);
    master.connect(ctx.destination);

    var now = ctx.currentTime;
    var layers = def.synth || [];
    for (var i = 0; i < layers.length; i++) {
      var layer = layers[i];
      var start = now + (layer.start || 0);
      var duration = layer.duration || 0.1;
      var peak = (layer.gain === undefined) ? 0.5 : layer.gain;
      var attack = Math.min(layer.attack || 0, duration);
      var hold = Math.min(layer.hold || 0, duration - attack);
      var gain = ctx.createGain();
      if (attack > 0) {
        // 膨らむ音：0 から attack 秒で最大へ
        gain.gain.setValueAtTime(0.001, start);
        gain.gain.linearRampToValueAtTime(peak, start + attack);
      } else {
        gain.gain.setValueAtTime(peak, start);
      }
      // hold 秒は最大のまま保ち、そのあと鳴り終わりへ向けて落ちる
      if (hold > 0) gain.gain.setValueAtTime(peak, start + attack + hold);
      gain.gain.exponentialRampToValueAtTime(0.001, start + duration);
      gain.connect(master);

      if (layer.kind === "noise") {
        var source = ctx.createBufferSource();
        source.buffer = this._noiseBuffer(ctx, duration);
        var filter = ctx.createBiquadFilter();
        filter.type = layer.filterType || "lowpass";
        filter.frequency.setValueAtTime(layer.filterFrom || 1000, start);
        if (layer.filterTo) filter.frequency.exponentialRampToValueAtTime(layer.filterTo, start + duration);
        source.connect(filter);
        filter.connect(gain);
        source.start(start);
        source.stop(start + duration);
      } else {
        var osc = ctx.createOscillator();
        osc.type = layer.wave || "square";
        osc.frequency.setValueAtTime(layer.from || 440, start);
        if (layer.to) osc.frequency.exponentialRampToValueAtTime(layer.to, start + duration);
        osc.connect(gain);
        osc.start(start);
        osc.stop(start + duration);
      }
    }
  };

  /** ホワイトノイズの波形。長さごとに作って使い回す */
  AudioManager.prototype._noiseBuffer = function (ctx, seconds) {
    this._noiseCache = this._noiseCache || {};
    var key = Math.ceil(seconds * 10);
    if (this._noiseCache[key]) return this._noiseCache[key];

    var length = Math.max(1, Math.floor(ctx.sampleRate * (key / 10)));
    var buffer = ctx.createBuffer(1, length, ctx.sampleRate);
    var channel = buffer.getChannelData(0);
    for (var i = 0; i < length; i++) channel[i] = Math.random() * 2 - 1;

    this._noiseCache[key] = buffer;
    return buffer;
  };

  // --- 操作待ちの解除・音量の反映 ---

  /**
   * 最初のクリック／キー入力で呼ぶ。
   * ここで初めて音を鳴らせるようになる。
   */
  AudioManager.prototype.unlock = function () {
    if (this.unlocked) return;
    this.unlocked = true;

    // 鳴らせずに待っていたBGMがあれば、ここで鳴らす
    if (this.pendingBgmId && this._bgm) {
      var audio = this._bgm;
      var promise = audio.play();
      if (promise && promise.catch) promise.catch(function () {});
    }
    this.pendingBgmId = null;
  };

  /**
   * 設定を変えたときに呼ぶ。いま鳴っているBGMの音量をその場で合わせる。
   * 効果音は鳴らすたびに音量を決めるので、ここでは何もしなくてよい。
   */
  AudioManager.prototype.applyVolume = function () {
    if (!this._bgm || !this.currentBgmId) return;

    var def = this._defOf("bgm", this.currentBgmId);
    this._bgmTarget = this._bgmVolume(def ? def.volume : 1);
    // 出はじめの途中なら _fadeIn が目標へ追いつく。そうでなければその場で合わせる
    if (this._fadingIn !== this._bgm) this._bgm.volume = this._bgmTarget;
  };

  function clamp01(value) {
    return Math.max(0, Math.min(1, value));
  }

  function isArray(value) {
    return Object.prototype.toString.call(value) === "[object Array]";
  }

  NS.AudioManager = AudioManager;
})(window.MyGame);
