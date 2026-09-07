/**
 * Motion.js
 * 「今この瞬間、絵をどれだけずらして／伸縮させて／薄くして描くか」を求める。
 *
 * 状態を持たない計算だけの部品。時間を渡すと結果が返るので、
 * 誰がいつ呼んでも同じ答えになり、シーンごとに動きを覚えておく必要がない。
 *
 * 動きの定義そのものは data/motions.js。ここに数値は書かない。
 *
 * 使い方
 *   var m = MyGame.Motion.of(gameData, "float", game.clock, phase);
 *   spriteRenderer.drawMotion(spriteId, x, y, w, h, m);
 */
(function (NS) {
  "use strict";

  /** 何も動かさないときの値 */
  var STILL = { offsetX: 0, offsetY: 0, scale: 1, alpha: 1, frame: 0 };

  var Motion = {
    /** 止まっている状態を返す（毎回同じものを配らないよう複製する） */
    still: function () {
      return {
        offsetX: 0, offsetY: 0,
        scale: 1, scaleX: 1, scaleY: 1,
        alpha: 1, rotate: 0, frame: 0, anchor: null
      };
    },

    /** 動きの定義を取り出す（無ければ null） */
    get: function (gameData, motionId) {
      if (!motionId) return null;
      return ((gameData && gameData.motions) || {})[motionId] || null;
    },

    /**
     * 動きの名前から、今の描画のずれを求める。よく使う入口。
     * @param {MyGame.GameData} gameData
     * @param {string} motionId data/motions.js のid
     * @param {number} clock 起動からの経過ミリ秒（game.clock）
     * @param {number} [phase] 位相のずらし（0〜1）。同じ動きを揃わせないために使う
     */
    of: function (gameData, motionId, clock, phase, frameCount) {
      return this.resolve(this.get(gameData, motionId), clock, phase, frameCount);
    },

    /**
     * 絵を描くとき用の入口。コマ数を絵の枚数から読み取るので、
     * data/motions.js に count を書かなくてよい（枚数の書き間違いが起きない）。
     *
     * @param {MyGame.GameData} gameData
     * @param {string|string[]} spriteId 絵のid。配列ならコマ絵
     * @param {string} motionId data/motions.js のid
     * @param {number} clock 経過ミリ秒（game.clock）
     * @param {number} [phase] 位相のずらし（0〜1）
     */
    forSprite: function (gameData, spriteId, motionId, clock, phase) {
      return this.resolve(this.get(gameData, motionId), clock, phase,
        isArray(spriteId) ? spriteId.length : 1);
    },

    /**
     * チャンネル1つ分の値だけを求める。
     *
     * 絵の動き以外（光の強さ、円の大きさ、文字の濃さなど）にも
     * 同じ波の書き方を使えるようにするための入口。
     *
     * @param {object} spec { amplitude, speed, wave, phase }
     * @param {number} clock 経過ミリ秒
     * @param {number} [phase] 位相のずらし（0〜1）
     * @param {number} [center] 動かないときの値（既定は0）
     */
    value: function (spec, clock, phase, center) {
      return channel(spec, clock || 0, phase || 0, center === undefined ? 0 : center);
    },

    /**
     * 動きの定義から、今の描画のずれを求める。
     * @param {object} definition data/motions.js の1件
     * @param {number} clock 経過ミリ秒
     * @param {number} [phase] 位相のずらし（0〜1）
     * @param {number} [frameCount] コマ数。省略時は定義の count を使う
     * @returns {{offsetX:number, offsetY:number, scale:number, scaleX:number,
     *            scaleY:number, alpha:number, frame:number, anchor:?string}}
     */
    resolve: function (definition, clock, phase, frameCount) {
      if (!definition) return this.still();

      var elapsed = clock || 0;
      var base = phase || 0;

      return {
        offsetX: channel(definition.offsetX, elapsed, base, 0),
        offsetY: channel(definition.offsetY, elapsed, base, 0),
        scale: Math.max(0, channel(definition.scale, elapsed, base, 1)),
        scaleX: Math.max(0, channel(definition.scaleX, elapsed, base, 1)),
        scaleY: Math.max(0, channel(definition.scaleY, elapsed, base, 1)),
        alpha: clamp01(channel(definition.alpha, elapsed, base, 1)),
        rotate: channel(definition.rotate, elapsed, base, 0),
        frame: frameIndex(definition.frames, elapsed, base, frameCount),
        anchor: definition.anchor || null
      };
    },

    /**
     * 1回だけ流れる動き（攻撃・被弾など）の、今のずれを求める。
     *
     * ずっと続く動きと違い、始まりと終わりがある。
     * duration を持つ定義だけがこれで再生できる（data/motions.js の lunge / recoil）。
     * 終わったあとは「止まっている状態」を返すので、呼び出し側で場合分けしなくてよい。
     *
     * @param {object} definition data/motions.js の1件（duration を持つもの）
     * @param {number} elapsed 始まってからの経過ミリ秒
     * @param {number} [facing] 上下の向き。相手のいる方向へ +1 / -1 を渡す
     */
    playback: function (definition, elapsed, facing) {
      if (!definition || !definition.duration) return this.still();

      var t = (elapsed || 0) / definition.duration;
      if (t < 0) t = 0;
      if (t >= 1) return this.still();

      var dir = (facing === undefined) ? 1 : facing;

      return {
        offsetX: shot(definition.offsetX, t, 0, dir),
        offsetY: shot(definition.offsetY, t, 0, dir),
        scale: Math.max(0, shot(definition.scale, t, 1, 1)),
        scaleX: Math.max(0, shot(definition.scaleX, t, 1, 1)),
        scaleY: Math.max(0, shot(definition.scaleY, t, 1, 1)),
        alpha: clamp01(shot(definition.alpha, t, 1, 1)),
        // 回転は向きに関係なく、いつも同じ方向へまわす
        rotate: shot(definition.rotate, t, 0, 1),
        frame: 0,
        anchor: definition.anchor || null
      };
    },

    /**
     * 2つの動きを重ねる。
     *
     * ずっと続く動き（浮く・呼吸する）の上に、
     * 1回だけの動き（踏み込む・のけぞる）を乗せるために使う。
     * ずれは足し算、大きさと濃さは掛け算。
     *
     * コマ絵の番号は base（ずっと続く方）のものを使う。
     * 攻撃の絵を別に用意したくなったら、ここを見直す。
     */
    combine: function (base, extra) {
      if (!extra) return base || this.still();
      if (!base) return extra;

      return {
        offsetX: base.offsetX + extra.offsetX,
        offsetY: base.offsetY + extra.offsetY,
        scale: base.scale * extra.scale,
        scaleX: one(base.scaleX) * one(extra.scaleX),
        scaleY: one(base.scaleY) * one(extra.scaleY),
        alpha: clamp01(base.alpha * extra.alpha),
        rotate: (base.rotate || 0) + (extra.rotate || 0),
        frame: base.frame,
        // 伸縮の基準は、ふだんの動き（base）が決めたものを優先する。
        // 攻撃の一瞬だけ基準が入れ替わると、絵が飛んで見えるため
        anchor: base.anchor || extra.anchor || null
      };
    },

    /**
     * 文字列から 0〜1 の位相を作る。
     *
     * 同じ種族が並んだときに全員が同じ動きで揃うと不自然なので、
     * 個体ごとに違う値を渡してずらす。同じ文字列なら必ず同じ値になるので、
     * 画面を開き直しても動きが飛ばない。
     *
     * 個体値が1違うだけ、というような似た文字列でも結果がばらけるよう、
     * 最後にビットを混ぜている（単純な足し込みだけだと値が固まってしまう）。
     *
     * @param {*} seed 個体を見分けられる値（種族id＋性格＋個体値など）
     */
    phaseFromSeed: function (seed) {
      var text = (seed === undefined || seed === null) ? "" : String(seed);
      var hash = 2166136261;

      for (var i = 0; i < text.length; i++) {
        hash ^= text.charCodeAt(i);
        hash = Math.imul(hash, 16777619);
      }

      // 混ぜる（似た入力が近い値にならないように）
      hash ^= hash >>> 15;
      hash = Math.imul(hash, 2246822507);
      hash ^= hash >>> 13;

      return (hash >>> 0) / 4294967296;
    }
  };

  // --- 内部 ---

  /**
   * 1チャンネル分の値を求める。
   * @param {object} spec { amplitude, speed, wave, phase }
   * @param {number} elapsed 経過ミリ秒
   * @param {number} basePhase 呼び出し側から渡された位相（0〜1）
   * @param {number} center 動かないときの値（ずれなら0、倍率なら1）
   */
  function channel(spec, elapsed, basePhase, center) {
    if (!spec) return center;

    var turns = basePhase + (spec.phase || 0);
    var t = elapsed * channelSpeed(spec) + turns * Math.PI * 2;

    // offset は「揺れの中心そのものをずらす」量。
    // 防御中に縮こまったまま小刻みに震える、といった書き方ができる
    return center + (spec.offset || 0) + (spec.amplitude || 0) * wave(spec.wave, t);
  }

  /**
   * 速さ。period（1往復にかかるミリ秒）で書かれていればそちらを使う。
   *
   * コマ絵と揺れを合わせたいときは period で書く方が確実。
   * speed に 2π÷周期 を手で計算して書くと、丸めた誤差でだんだんずれていく。
   */
  function channelSpeed(spec) {
    if (spec.speed !== undefined) return spec.speed;
    if (spec.period) return (Math.PI * 2) / spec.period;
    return 0;
  }

  /** 波の形。既定は行き来する sin */
  function wave(name, t) {
    if (name === "bounce") return Math.abs(Math.sin(t));
    if (name === "blink") return Math.sin(t) >= 0 ? 1 : 0;
    return Math.sin(t);
  }

  /**
   * 今が何コマ目か。コマ絵を使わない場合は常に0。
   * 位相のぶんだけ開始コマをずらすので、同じ種族が並んでも揃わない。
   *
   * コマ数は「絵の枚数」を優先し、書かれていなければ定義の count を使う。
   * こうしておくと、絵を1枚足したときに数を直し忘れることがない。
   *
   * 位相は「コマ何個ぶん進めるか」として足し込む（丸めない）。
   * こうすると位相のずらしが、上下の揺れと同じ時間のずれになるので、
   * コマ絵と揺れを合わせた動き（跳ねるなど）が個体ごとにずれない。
   */
  function frameIndex(spec, elapsed, basePhase, frameCount) {
    if (!spec) return 0;

    var count = (frameCount && frameCount > 1) ? frameCount : spec.count;
    if (!count || count <= 1) return 0;

    var interval = spec.interval || 500;
    return Math.floor(elapsed / interval + basePhase * count) % count;
  }

  /**
   * 1回だけ流れる動きの、1チャンネル分の値。
   * @param {object} spec { amount, shape, outRatio?, cycles? }
   * @param {number} t 進み具合（0〜1）
   * @param {number} center 動かないときの値
   * @param {number} dir 向き（上下のずれにだけ掛ける。大きさや濃さには1を渡す）
   */
  function shot(spec, t, center, dir) {
    if (!spec) return center;
    return center + (spec.amount || 0) * dir * shotShape(spec, t);
  }

  /**
   * 出て戻るときの形。0で始まり0で終わる（fade と decay は1で始まる）。
   *
   *   outBack … 素早く出て、ゆっくり戻る。踏み込みらしく見える（既定）
   *   pulse  … なめらかに出て、なめらかに戻る
   *   decay  … 大きく始まり、揺れながら収まる。当たった衝撃らしく見える
   *   windup … 先に逆へ引いてから、勢いよく出て戻る。技を放つ動きに使う
   *   fade   … 最大から、まっすぐ元へ戻るだけ
   *   rise   … 0から最大へ向かい、戻らない。倒れて消えるなど「元に戻らない」動き
   *             ※ 戻らないので、終わったあとも描き続けると元の姿に飛ぶ。
   *               呼び出し側で「終わったら描かない」ようにすること
   */
  function shotShape(spec, t) {
    var name = spec.shape || "outBack";

    if (name === "pulse") return Math.sin(Math.PI * t);
    if (name === "fade") return 1 - t;
    if (name === "rise") return t * t;
    if (name === "decay") {
      var cycles = spec.cycles || 2;
      return Math.cos(Math.PI * 2 * cycles * t) * (1 - t);
    }
    if (name === "windup") {
      // 先に逆へ引いてから、勢いよく出て戻る。
      // backRatio までが「溜め」で、そこから先が「放つ」。
      // 溜めは控えめ（出る量の 45%）にしないと、後ろへ跳んだように見える
      var back = spec.backRatio || 0.4;
      if (t < back) return -0.45 * Math.sin(Math.PI * (t / back));
      return Math.sin(Math.PI * (t - back) / (1 - back));
    }

    // outBack：outRatio までで出きって、残りで戻る
    var out = spec.outRatio || 0.3;
    if (t < out) return easeOut(t / out);
    return 1 - easeIn((t - out) / (1 - out));
  }

  function easeOut(x) { return 1 - (1 - x) * (1 - x); }
  function easeIn(x) { return x * x; }

  /** 配列かどうか（コマ絵かどうかの判定に使う） */
  function isArray(value) {
    return Object.prototype.toString.call(value) === "[object Array]";
  }

  function clamp01(value) {
    if (value < 0) return 0;
    if (value > 1) return 1;
    return value;
  }

  /** 倍率の既定は1。古い形の transform（scaleX を持たない）と混ぜても壊れないように */
  function one(value) {
    return (value === undefined || value === null) ? 1 : value;
  }

  Motion.STILL = STILL;
  NS.Motion = Motion;
})(window.MyGame);
