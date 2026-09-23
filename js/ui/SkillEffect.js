/**
 * SkillEffect.js
 * 技の演出を1つ描く。状態を持たない描画だけの部品。
 *
 * 「いつ・どこで・何色で」は呼び出し側（EffectPlayer）が持ち、
 * ここは「進み具合 0〜1 を渡されたら、その瞬間の絵を描く」だけを行う。
 *
 * 形の種類は data/effects.js の shapes、色は属性の色。
 * 乱数は使わない。粒の向きは番号から決めるので、
 * 何度描いても同じ形になり、ちらつかない。
 *
 * ★ 型を増やすときは SHAPES に関数を1つ足す（他は変更不要）。
 */
(function (NS) {
  "use strict";

  /**
   * 形ごとの描き方。
   * @param {CanvasRenderingContext2D} ctx
   * @param {object} d data/effects.js の1件
   * @param {number} t 進み具合（0〜1）
   * @param {object} p { x, y, color, coreColor, phase }
   *   phase … 0〜1。同じ技を続けて出しても同じ向きにならないためのずらし
   */
  var SHAPES = {
    /** 打つ：輪が広がり、短い線が四方へ散る */
    impact: function (ctx, d, t, p) {
      var alpha = fadeOut(t);
      var radius = (d.radius || 40) * easeOut(t);

      setAlpha(ctx, alpha);
      ctx.strokeStyle = p.color;
      ctx.lineWidth = Math.max(1, (d.lineWidth || 3) * (1 - t));
      ctx.beginPath();
      ctx.arc(p.x, p.y, radius, 0, Math.PI * 2);
      ctx.stroke();

      var rays = d.rays || 6;
      var length = d.rayLength || 18;
      for (var i = 0; i < rays; i++) {
        var angle = turns(i / rays + p.phase);
        var inner = radius * 0.7;
        ctx.beginPath();
        ctx.moveTo(p.x + Math.cos(angle) * inner, p.y + Math.sin(angle) * inner);
        ctx.lineTo(p.x + Math.cos(angle) * (inner + length * (1 - t)),
                   p.y + Math.sin(angle) * (inner + length * (1 - t)));
        ctx.stroke();
      }

      // 当たった瞬間の芯
      if (t < 0.35) {
        setAlpha(ctx, 1 - t / 0.35);
        ctx.fillStyle = p.coreColor;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 6 * (1 - t / 0.35), 0, Math.PI * 2);
        ctx.fill();
      }
    },

    /** 斬る：太い筋が少しずつ遅れて走る */
    slash: function (ctx, d, t, p) {
      var streaks = d.streaks || 3;
      var length = d.length || 90;
      var angle = turns(d.tilt || -0.1);
      var dx = Math.cos(angle);
      var dy = Math.sin(angle);
      // 筋を並べる向き（走る向きと直角）
      var nx = -dy;
      var ny = dx;

      ctx.lineCap = "round";

      for (var i = 0; i < streaks; i++) {
        // 順番に遅れて走らせる
        var sub = span(t, i * 0.16, 0.55);
        if (sub <= 0) continue;

        var offset = (i - (streaks - 1) / 2) * (d.spread || 20);
        var cx = p.x + nx * offset;
        var cy = p.y + ny * offset;

        setAlpha(ctx, fadeOut(sub));
        ctx.strokeStyle = (sub < 0.4) ? p.coreColor : p.color;
        ctx.lineWidth = (d.thickness || 5) * (1 - sub * 0.5);

        // 端から端へ走らせる。前半は伸び、後半は根元が消えていく
        var head = easeOut(Math.min(1, sub * 1.6));
        var tail = Math.max(0, (sub - 0.45) / 0.55);
        ctx.beginPath();
        ctx.moveTo(cx + dx * length * (tail - 0.5), cy + dy * length * (tail - 0.5));
        ctx.lineTo(cx + dx * length * (head - 0.5), cy + dy * length * (head - 0.5));
        ctx.stroke();
      }
      ctx.lineCap = "butt";
    },

    /** 弾ける：中心から粒が放射状に飛ぶ */
    burst: function (ctx, d, t, p) {
      var count = d.count || 12;
      var radius = d.radius || 50;
      var reach = radius * easeOut(t);

      setAlpha(ctx, fadeOut(t));
      ctx.fillStyle = p.color;

      for (var i = 0; i < count; i++) {
        var angle = turns(i / count + p.phase);
        // 粒ごとに飛ぶ距離を変える（そろって見えないように）
        var scatter = 0.65 + wobble(i) * 0.35;
        var size = sizeOf(d, i) * (1 - t * 0.6);
        if (size <= 0) continue;

        ctx.fillRect(p.x + Math.cos(angle) * reach * scatter - size / 2,
                     p.y + Math.sin(angle) * reach * scatter - size / 2,
                     size, size);
      }

      if (t < 0.3) {
        setAlpha(ctx, 1 - t / 0.3);
        ctx.fillStyle = p.coreColor;
        var core = 8 * (1 - t / 0.3);
        ctx.fillRect(p.x - core / 2, p.y - core / 2, core, core);
      }
    },

    /**
     * 閃光：円が一気に広がって、すぐ消える。
     *
     * 他の型と違い、最初から薄れ始める（fadeOut を使わない）。
     * 消えるのが遅いと、ただの濁った円になって相手が見えなくなるため。
     */
    flash: function (ctx, d, t, p) {
      var radius = (d.radius || 60) * easeOut(t);
      var decay = (1 - t) * (1 - t);   // 最初から一気に薄れる

      setAlpha(ctx, decay * (d.alpha === undefined ? 0.45 : d.alpha));
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, radius, 0, Math.PI * 2);
      ctx.fill();

      // 内側の芯。ここだけは強く光らせて「閃いた」感じを出す
      setAlpha(ctx, Math.max(0, 1 - t * 3));
      ctx.fillStyle = p.coreColor;
      ctx.beginPath();
      ctx.arc(p.x, p.y, radius * 0.4, 0, Math.PI * 2);
      ctx.fill();
    },

    /**
     * 光芒：閃光の一段上。大きく閃いたあと、光の筋が四方へ伸び、輪が外へ抜ける。
     *
     * 閃光（flash）と同じ「最初から薄れる」考え方だが、
     *   ・筋が伸びる（0〜0.7）
     *   ・輪が広がる（0.15〜1）
     *   ・少し遅れてもう一度小さく光る（0.35〜0.65）
     * の3つを重ねて「一発で終わらない」重さを出す。大技の中間くらいの見せ方。
     *   radius / rays / rayLength / ringRadius / alpha は data/effects.js
     */
    radiance: function (ctx, d, t, p) {
      var radius = d.radius || 90;
      var alpha = (d.alpha === undefined) ? 0.5 : d.alpha;

      // 1. 最初の閃き（flash より大きく、少しだけ長く残す）
      var decay = (1 - t) * (1 - t);
      setAlpha(ctx, decay * alpha);
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, radius * easeOut(Math.min(1, t * 1.4)), 0, Math.PI * 2);
      ctx.fill();

      setAlpha(ctx, Math.max(0, 1 - t * 2.5));
      ctx.fillStyle = p.coreColor;
      ctx.beginPath();
      ctx.arc(p.x, p.y, radius * 0.38 * (1 - t * 0.5), 0, Math.PI * 2);
      ctx.fill();

      // 2. 光の筋。ゆっくり回りながら伸び、細くなって消える
      var rays = d.rays || 8;
      var length = d.rayLength || 120;
      var raySub = span(t, 0, 0.7);
      if (raySub > 0) {
        ctx.lineCap = "round";
        for (var i = 0; i < rays; i++) {
          var angle = turns(i / rays + p.phase + t * 0.04);
          // 1本おきに長さを変えて、単調な放射に見せない
          var scale = (i % 2 === 0) ? 1 : 0.62;
          var reach = length * scale * easeOut(raySub);
          setAlpha(ctx, fadeOut(raySub) * 0.9);
          ctx.strokeStyle = (raySub < 0.25) ? p.coreColor : p.color;
          ctx.lineWidth = Math.max(1, (d.rayWidth || 5) * (1 - raySub * 0.7));
          ctx.beginPath();
          ctx.moveTo(p.x + Math.cos(angle) * radius * 0.2, p.y + Math.sin(angle) * radius * 0.2);
          ctx.lineTo(p.x + Math.cos(angle) * reach, p.y + Math.sin(angle) * reach);
          ctx.stroke();
        }
        ctx.lineCap = "butt";
      }

      // 3. 外へ抜ける輪
      var ringSub = span(t, 0.15, 0.85);
      if (ringSub > 0) {
        setAlpha(ctx, fadeOut(ringSub) * 0.8);
        ctx.strokeStyle = p.color;
        ctx.lineWidth = Math.max(1, (d.ringWidth || 4) * (1 - ringSub));
        ctx.beginPath();
        ctx.arc(p.x, p.y, (d.ringRadius || 130) * easeOut(ringSub), 0, Math.PI * 2);
        ctx.stroke();
      }

      // 4. 遅れてもう一度、小さく光る（余韻）
      var echo = span(t, 0.35, 0.3);
      if (echo > 0) {
        setAlpha(ctx, (1 - echo) * (1 - echo) * alpha * 0.7);
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, radius * 0.55 * easeOut(echo), 0, Math.PI * 2);
        ctx.fill();
      }
    },

    /** 降りそそぐ：上から粒が落ちてくる */
    rain: function (ctx, d, t, p) {
      var count = d.count || 14;
      var spread = d.spread || 60;
      var height = d.height || 80;

      ctx.fillStyle = p.color;

      for (var i = 0; i < count; i++) {
        // 1粒ずつ落ち始めをずらす
        var sub = span(t, wobble(i) * 0.45, 0.55);
        if (sub <= 0) continue;

        var lane = (i / (count - 1 || 1)) - 0.5;
        var x = p.x + lane * spread * 2 + wobble(i + 7) * 10 - 5;
        var y = p.y - height + height * easeIn(sub) * 1.6;
        var size = sizeOf(d, i);

        setAlpha(ctx, fadeOut(sub));
        // 落ちるものは少し縦に伸ばす
        ctx.fillRect(x - size / 2, y - size, size, size * 2.2);
      }
    },

    /**
     * 高まる（弱体では 沈む）：輪が流れ、粒が一緒に動く。
     * 当てる技と違って中心で弾けず、上下へ抜けていく形にしてある。
     *
     * direction が 1 なら下から上へ（強化）、-1 なら上から下へ（弱体）。
     * すぼまり方も向きに合わせるので、逆さにしても「沈んでいく」ように見える。
     */
    aura: function (ctx, d, t, p) {
      var rings = d.rings || 3;
      var radius = d.radius || 30;
      var rise = d.rise || 40;
      var dir = (p.direction === -1) ? -1 : 1;
      var i;

      // 流れる輪。少しずつ遅れて始まり、進むほど細くなる
      for (i = 0; i < rings; i++) {
        var sub = span(t, i * 0.18, 0.62);
        if (sub <= 0) continue;

        var y = p.y + dir * (rise * 0.5 - rise * easeOut(sub));
        // 進む先ほど小さくすぼまる
        var r = radius * (1 - sub * 0.55);

        setAlpha(ctx, fadeOut(sub) * (1 - sub * 0.4));
        ctx.strokeStyle = (sub < 0.3) ? p.coreColor : p.color;
        ctx.lineWidth = Math.max(1, (d.lineWidth || 3) * (1 - sub * 0.5));
        ctx.beginPath();
        // 平たい輪にして「面が流れていく」ように見せる
        ctx.ellipse(p.x, y, r, r * 0.34, 0, 0, Math.PI * 2);
        ctx.stroke();
      }

      // 一緒に流れる粒
      var count = d.count || 10;
      ctx.fillStyle = p.color;
      for (i = 0; i < count; i++) {
        var ps = span(t, wobble(i) * 0.5, 0.5);
        if (ps <= 0) continue;

        var lane = (wobble(i + 11) - 0.5) * radius * 1.8;
        var py = p.y + dir * (rise * 0.5 - rise * 1.2 * easeOut(ps));
        var size = sizeOf(d, i);

        setAlpha(ctx, fadeOut(ps));
        ctx.fillRect(p.x + lane - size / 2, py - size / 2, size, size);
      }
    },

    /** 砕ける：粒が横へ飛び、落ちていく */
    shards: function (ctx, d, t, p) {
      var count = d.count || 12;
      var radius = d.radius || 46;
      var gravity = d.gravity || 90;

      setAlpha(ctx, fadeOut(t));
      ctx.fillStyle = p.color;

      for (var i = 0; i < count; i++) {
        var angle = turns(i / count + p.phase);
        var speed = 0.6 + wobble(i) * 0.4;
        var x = p.x + Math.cos(angle) * radius * speed * easeOut(t);
        // 横に飛びながら落ちる
        var y = p.y + Math.sin(angle) * radius * speed * easeOut(t) * 0.5
                    + gravity * t * t;
        var size = sizeOf(d, i);

        ctx.fillRect(x - size / 2, y - size / 2, size, size);
      }
    }
  };

  var SkillEffect = {
    /**
     * 演出を1つ描く。
     * @param {CanvasRenderingContext2D} ctx
     * @param {object} definition data/effects.js の shapes の1件
     * @param {number} progress 進み具合（0〜1）。範囲外なら何も描かない
     * @param {object} params { x, y, color, coreColor, phase }
     */
    draw: function (ctx, definition, progress, params) {
      if (!definition || progress < 0 || progress >= 1) return;

      var shape = SHAPES[definition.shape];
      if (!shape) return;

      // 設定「エフェクトの濃さ」。0 なら何も描かない
      intensity = (params.intensity === undefined) ? 1 : params.intensity;
      if (intensity <= 0) return;

      ctx.save();

      // にじみ。暗い背景では、これが無いと色つきの粒が沈んで見えない。
      // 色は演出の色そのものなので、属性ごとにその色で光る
      if (definition.glow) {
        ctx.shadowColor = params.color || "#ffffff";
        ctx.shadowBlur = definition.glow * intensity;
      }

      shape(ctx, definition, progress, {
        x: params.x,
        y: params.y,
        color: params.color || "#ffffff",
        coreColor: params.coreColor || "#ffffff",
        phase: params.phase || 0,
        // 上下の向き。1 が既定で、-1 なら逆さまに出す（弱体の演出に使う）
        direction: (params.direction === -1) ? -1 : 1
      });
      ctx.restore();
    },

    /** その形が描けるか（データの書き間違いを早く気づけるように） */
    has: function (shapeName) {
      return !!SHAPES[shapeName];
    }
  };

  // --- 補助（すべて決まった値を返す。乱数は使わない） ---

  /**
   * いま描いている演出の濃さ（設定の effectLevel）。
   *
   * 形の関数はどれも ctx.globalAlpha を自分で設定するので、
   * 外から掛けても上書きされてしまう。そこで setAlpha を通し、
   * ここで濃さを掛けてから設定する。draw のあいだだけ使う値。
   */
  var intensity = 1;

  /** 濃さの設定を掛けてから、描く濃さを決める */
  function setAlpha(ctx, value) {
    ctx.globalAlpha = Math.max(0, Math.min(1, value * intensity));
  }

  /** 回転数をラジアンに直す */
  function turns(value) { return value * Math.PI * 2; }

  /** だんだん遅くなる */
  function easeOut(x) { return 1 - (1 - x) * (1 - x); }

  /** だんだん速くなる */
  function easeIn(x) { return x * x; }

  /** 終わりに向かって薄くなる（後半だけ効かせる） */
  function fadeOut(t) {
    if (t < 0.55) return 1;
    return Math.max(0, 1 - (t - 0.55) / 0.45);
  }

  /**
   * 全体の進み具合から、1本ぶんの進み具合を切り出す。
   * @param {number} t 全体（0〜1）
   * @param {number} start 始まる時点（0〜1）
   * @param {number} length 長さ（0〜1）
   * @returns {number} 0以下ならまだ始まっていない
   */
  function span(t, start, length) {
    if (length <= 0) return 0;
    var sub = (t - start) / length;
    if (sub <= 0) return 0;
    return Math.min(1, sub);
  }

  /** 番号から 0〜1 のばらつきを作る（同じ番号なら必ず同じ値） */
  function wobble(index) {
    var value = Math.sin(index * 12.9898) * 43758.5453;
    return value - Math.floor(value);
  }

  /** 粒の大きさ。番号ごとに変える */
  function sizeOf(d, index) {
    var min = (d.minSize === undefined) ? 2 : d.minSize;
    var max = (d.maxSize === undefined) ? min : d.maxSize;
    return min + (max - min) * wobble(index + 3);
  }

  NS.SkillEffect = SkillEffect;
})(window.MyGame);
