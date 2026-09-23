/**
 * SceneManager.js
 * 現在のシーンを保持し、切り替えを行う。
 * シーンは { enter?(), exit?(), update(dt), render(ctx) } を実装したオブジェクト。
 *
 * ▼ 画面の切り替え
 * いきなり別の画面に変わると目が驚くので、いったん暗くしてから切り替える。
 *   今の画面を暗くする（out） → 中身を入れ替える → 明るく戻す（in）
 *
 * 暗くしている間はシーンの update を止める。
 * 押しっぱなしのキーが次の画面へ持ち越されて、いきなり反応してしまうのを防ぐため。
 * 止まっている時間はごく短いので、動きが固まったようには見えない。
 *
 * 設定（長さと色）は data/ui.js の transition。長さを0にすると今までどおり即座に切り替わる。
 *   duration … 演出全体の長さ（暗くする＋明るく戻す）
 *   outRatio … そのうち「暗くする」に使う割合（省略で 0.5 ＝ 行き帰り同じ）
 */
(function (NS) {
  "use strict";

  /**
   * @param {object} [params] { duration, color } 切り替えの設定（data/ui.js の transition）
   */
  function SceneManager(params) {
    this.current = null;
    this.params = params || {};

    this._next = null;       // 切り替え先（暗くしている間だけ持つ）
    this._phase = "idle";    // "idle" / "out"（暗くする）/ "in"（明るく戻す）
    this._timer = 0;
    this._effectParams = null;
    this._buffer = null;     // 画面を一度写し取るための作業用キャンバス
  }

  /**
   * シーンを切り替える。前シーンの exit と 新シーンの enter を呼ぶ。
   *
   * @param {object} scene
   * @param {string} [effectId] 切り替え方（data/ui.js の transition.effects のid）。
   *   省略すると、ふつうの暗転になる
   */
  SceneManager.prototype.change = function (scene, effectId) {
    var effect = this._effect(effectId);

    // 最初の1枚と、演出を切っている場合はすぐ切り替える
    if (!this.current || effect.duration <= 0) {
      this._swap(scene);
      return;
    }

    this._effectParams = effect;
    this._next = scene;
    this._phase = "out";
    this._timer = this._phaseLength("out");
  };

  /**
   * 切り替え方の設定を作る。
   * 書かれていない項目は、共通の設定（transition の直下）で埋める。
   */
  SceneManager.prototype._effect = function (effectId) {
    var effects = this.params.effects || {};
    var chosen = (effectId && effects[effectId]) || {};

    return {
      // 演出全体の長さ（暗くする＋明るく戻す）
      duration: (chosen.duration === undefined)
        ? (this.params.duration || 0) : chosen.duration,
      // そのうち「暗くする」に使う割合。残りが「明るく戻す」
      outRatio: (chosen.outRatio === undefined)
        ? (this.params.outRatio === undefined ? 0.5 : this.params.outRatio)
        : chosen.outRatio,
      color: chosen.color || this.params.color || "#000000",
      blockMax: chosen.blockMax || 0,   // 何倍まで粗くするか（1以下で無効）
      turns: chosen.turns || 0,         // 何回まわすか
      zoom: (chosen.zoom === undefined) ? 1 : chosen.zoom,
      // 暗幕の効き始めを遅らせる。大きいほど「暗くなるのは最後だけ」になる。
      // 歪みを見せたいときに上げる（1 でまっすぐ濃くなる）
      veilPower: chosen.veilPower || 1
    };
  };

  /** 切り替えの最中か（暗くしている・明るく戻している間） */
  SceneManager.prototype.isChanging = function () {
    return this._phase !== "idle";
  };

  /** 実際に中身を入れ替える */
  SceneManager.prototype._swap = function (scene) {
    if (this.current && this.current.exit) this.current.exit();
    this.current = scene;
    if (scene && scene.enter) scene.enter();
  };

  SceneManager.prototype.update = function (dt) {
    if (this._phase !== "idle") {
      this._updateTransition(dt);
      return;
    }
    if (this.current && this.current.update) this.current.update(dt);
  };

  SceneManager.prototype._updateTransition = function (dt) {
    this._timer -= dt;
    if (this._timer > 0) return;

    if (this._phase === "out") {
      // いちばん暗いところで入れ替える。切り替わる瞬間は見えない
      this._swap(this._next);
      this._next = null;
      this._phase = "in";
      this._timer = this._phaseLength("in");
      return;
    }
    this._phase = "idle";
    this._timer = 0;
    this._effectParams = null;
  };

  /**
   * 「暗くする」「明るく戻す」それぞれの長さ（ms）。
   * 全体の duration を outRatio で分ける。
   *   outRatio 0.5  … 行きと帰りが同じ長さ
   *   outRatio 0.75 … 行きにたっぷり使い、帰りは短く
   */
  SceneManager.prototype._phaseLength = function (phase) {
    var effect = this._current();
    var ratio = Math.max(0, Math.min(1, effect.outRatio));
    return effect.duration * (phase === "out" ? ratio : 1 - ratio);
  };

  SceneManager.prototype.render = function (ctx) {
    if (this.current && this.current.render) this.current.render(ctx);

    this._renderDistortion(ctx);
    this._renderVeil(ctx);
  };

  /** 今の切り替え方（切り替えていないときは共通の設定） */
  SceneManager.prototype._current = function () {
    return this._effectParams || this._effect(null);
  };

  /**
   * 画面そのものを歪ませる（粗くする・まわす）。
   *
   * 一度キャンバスの中身を写し取ってから、加工して描き直す。
   * シーンは自分が歪められていることを知らなくてよい。
   */
  SceneManager.prototype._renderDistortion = function (ctx) {
    if (this._phase === "idle") return;

    var effect = this._current();
    var strength = this._progress();   // 0（元のまま）〜1（いちばん歪む）
    if (strength <= 0) return;

    if (effect.blockMax > 1) this._renderMosaic(ctx, effect, strength);
    if (effect.turns || effect.zoom !== 1) this._renderSwirl(ctx, effect, strength);
  };

  /** 粗いブロックにする。小さく写し取って、そのまま引き伸ばす */
  SceneManager.prototype._renderMosaic = function (ctx, effect, strength) {
    var w = ctx.canvas.width;
    var h = ctx.canvas.height;

    var block = 1 + (effect.blockMax - 1) * strength;
    var sw = Math.max(1, Math.round(w / block));
    var sh = Math.max(1, Math.round(h / block));
    if (sw >= w && sh >= h) return;

    var buffer = this._getBuffer(sw, sh);
    buffer.ctx.clearRect(0, 0, sw, sh);
    buffer.ctx.drawImage(ctx.canvas, 0, 0, sw, sh);

    ctx.save();
    ctx.imageSmoothingEnabled = false;   // ぼかさずに四角いまま伸ばす
    ctx.clearRect(0, 0, w, h);
    ctx.drawImage(buffer.canvas, 0, 0, sw, sh, 0, 0, w, h);
    ctx.restore();
  };

  /** 中心を軸にまわしながら寄る */
  SceneManager.prototype._renderSwirl = function (ctx, effect, strength) {
    var w = ctx.canvas.width;
    var h = ctx.canvas.height;

    var buffer = this._getBuffer(w, h);
    buffer.ctx.clearRect(0, 0, w, h);
    buffer.ctx.drawImage(ctx.canvas, 0, 0);

    // まわすと四隅が空くので、先に暗幕の色で塗っておく
    ctx.save();
    ctx.fillStyle = effect.color;
    ctx.fillRect(0, 0, w, h);

    var zoom = 1 + (effect.zoom - 1) * strength;
    ctx.translate(w / 2, h / 2);
    ctx.rotate(effect.turns * Math.PI * 2 * strength);
    ctx.scale(zoom, zoom);
    ctx.drawImage(buffer.canvas, -w / 2, -h / 2);
    ctx.restore();
  };

  /** 作業用キャンバス。大きさが変わったときだけ作り直す */
  SceneManager.prototype._getBuffer = function (width, height) {
    if (!this._buffer) {
      var canvas = document.createElement("canvas");
      this._buffer = { canvas: canvas, ctx: canvas.getContext("2d") };
    }
    if (this._buffer.canvas.width !== width || this._buffer.canvas.height !== height) {
      this._buffer.canvas.width = width;
      this._buffer.canvas.height = height;
    }
    return this._buffer;
  };

  /** 画面全体にかぶせる暗幕。切り替えの最中だけ描く */
  SceneManager.prototype._renderVeil = function (ctx) {
    var alpha = this._veilAlpha();
    if (alpha <= 0) return;

    ctx.save();
    ctx.globalAlpha = Math.min(1, alpha);
    ctx.fillStyle = this._current().color;
    ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    ctx.restore();
  };

  /**
   * 切り替えの進み具合（0〜1）。
   * out では0から1へ、in では1から0へ戻る。歪みの強さもこれを使う。
   */
  SceneManager.prototype._progress = function () {
    if (this._phase === "idle") return 0;

    var length = this._phaseLength(this._phase);
    // 長さ0の側は、その瞬間だけいちばん暗い状態として扱う
    if (length <= 0) return (this._phase === "out") ? 1 : 0;

    var remain = Math.max(0, this._timer) / length;
    return (this._phase === "out") ? (1 - remain) : remain;
  };

  /**
   * 暗幕の濃さ。
   *
   * 進み具合をそのまま使うと、歪みを見せる前に真っ暗になってしまう。
   * veilPower で効き始めを遅らせ、歪みが見えてから暗くなるようにする。
   */
  SceneManager.prototype._veilAlpha = function () {
    var progress = this._progress();
    if (progress <= 0) return 0;

    var power = this._current().veilPower;
    return (power === 1) ? progress : Math.pow(progress, power);
  };

  NS.SceneManager = SceneManager;
})(window.MyGame);
