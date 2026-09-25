/**
 * StoryBackdrop.js
 * 物語の場面の背景を描く。
 *
 * ▼ 状態を持たない
 *   経過時間を渡すと、その瞬間の絵を描くだけ。粒子の位置も時間から計算するので、
 *   毎フレームの更新処理が要らず、ページを行き来しても絵が飛ばない。
 *
 * ▼ 背景の種類（kind）
 *   void    … 一色の闇
 *   abyss   … 奥へ広がり続ける同心円と、降ってくる粒（タイトルと同じ「深淵」の絵）
 *   embers  … 燃える夜。赤い空、下からの炎の明かり、家並みの影、舞い上がる火の粉
 *   camp    … 拠点の夜。地面・穴・たき火（拠点の画面と同じ配置 data/ui.js の home.scenery）
 *   stars   … 星の瞬く夜空。ときどき流れ星
 *   cave    … ダンジョンの中。岩壁の影と、漂う塵。色はダンジョンの色（data/dungeonThemes.js）
 *
 * 背景の中身（色・数）は data/ui.js の story.backdrops。ここに数値は書かない。
 */
(function (NS) {
  "use strict";

  var StoryBackdrop = {
    /**
     * @param {CanvasRenderingContext2D} ctx
     * @param {object} def data/ui.js の story.backdrops の1件
     * @param {number} t この背景を出してからの経過ミリ秒（粒子や円の動きに使う）
     * @param {object} env { game, sprites, w, h }
     */
    draw: function (ctx, def, t, env) {
      if (!def) { fill(ctx, "#000000", env.w, env.h); return; }
      var painter = PAINTERS[def.kind] || PAINTERS.void;
      ctx.save();
      painter(ctx, def, t, env);
      ctx.restore();
    }
  };

  var PAINTERS = {
    void: function (ctx, def, t, env) {
      fill(ctx, def.color || "#05070d", env.w, env.h);
    },

    /** タイトルと同じ深淵。円は外へ広がり続け、外ほど薄い */
    abyss: function (ctx, def, t, env) {
      gradient(ctx, def.top, def.bottom, env.w, env.h);

      var cx = def.centerX || env.w / 2;
      var cy = def.centerY || env.h / 2;
      var gap = def.ringGap || 46;
      var count = def.rings || 6;
      var shift = (t * (def.ringSpeed || 0.012)) % gap;

      ctx.strokeStyle = def.ringColor || "#4a6ba8";
      ctx.lineWidth = def.ringWidth || 1.5;
      for (var i = 0; i < count; i++) {
        var r = (def.baseRadius || 40) + gap * i + shift;
        ctx.globalAlpha = Math.max(0, 0.55 * (1 - r / ((def.baseRadius || 40) + gap * count)));
        ctx.beginPath();
        ctx.ellipse(cx, cy, r, r * (def.squash || 0.42), 0, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
      particles(ctx, def.particles, t, env, "fall");
    },

    /** 燃える夜。空の赤み → 下からの炎の明かり → 家並みの影 → 火の粉 */
    embers: function (ctx, def, t, env) {
      gradient(ctx, def.top, def.bottom, env.w, env.h);

      // 炎の明かりは画面の下から。ゆっくり強弱させて、燃えている感じを出す
      var flicker = 0.75 + 0.25 * Math.sin(t / 170) * Math.sin(t / 430 + 1.3);
      var glowY = env.h + (def.glowOffset || 60);
      var radius = (def.glowRadius || 420) * (0.95 + 0.05 * flicker);
      var glow = ctx.createRadialGradient(env.w / 2, glowY, 0, env.w / 2, glowY, radius);
      glow.addColorStop(0, def.glowColor || "#ff6a2a");
      glow.addColorStop(1, "rgba(0,0,0,0)");
      ctx.globalAlpha = (def.glowAlpha || 0.6) * flicker;
      ctx.fillStyle = glow;
      ctx.fillRect(0, 0, env.w, env.h);
      ctx.globalAlpha = 1;

      flames(ctx, def.flames, def.skyline, t, env);
      skyline(ctx, def.skyline, env);
      particles(ctx, def.particles, t, env, "rise");
    },

    /**
     * 拠点の夜。拠点の画面と同じ配置で、地面・穴・たき火を描く。
     * shiftY で景色ごと上へずらせる（下に会話の窓が出ても、たき火が隠れないように）
     */
    camp: function (ctx, def, t, env) {
      var home = ((env.game.data.ui || {}).home) || {};
      gradient(ctx, def.top || home.gradientTop, def.bottom || home.gradientBottom, env.w, env.h);
      particles(ctx, def.stars, t, env, "twinkle");
      ctx.translate(0, def.shiftY || 0);

      var S = home.scenery || {};
      var ground = S.ground;
      if (ground) {
        ctx.fillStyle = ground.color || "#000000";
        // 上へずらしたぶん、地面を画面の下まで伸ばす
        ctx.fillRect(0, ground.y, env.w, env.h - ground.y - (def.shiftY || 0));
        if (ground.edgeColor) {
          ctx.fillStyle = ground.edgeColor;
          ctx.fillRect(0, ground.y, env.w, 1);
        }
      }
      var hole = S.hole;
      if (hole) {
        ctx.beginPath();
        ctx.ellipse(hole.cx, hole.cy, hole.rx, hole.ry, 0, 0, Math.PI * 2);
        ctx.fillStyle = hole.color || "#000000";
        ctx.fill();
        if (hole.rimColor) {
          ctx.strokeStyle = hole.rimColor;
          ctx.lineWidth = hole.rimWidth || 2;
          ctx.stroke();
        }
      }
      campfire(ctx, S.campfire, env);
      particles(ctx, def.particles, t, env, "rise");
    },

    /** 星の瞬く夜空。流れ星は period ごとに1本だけ */
    stars: function (ctx, def, t, env) {
      gradient(ctx, def.top, def.bottom, env.w, env.h);
      particles(ctx, def.stars, t, env, "twinkle");

      var shoot = def.shootingStar;
      if (shoot) {
        var period = shoot.period || 5200;
        var p = (t % period) / (shoot.duration || 700);
        if (p < 1) {
          var n = Math.floor(t / period);
          var sx = env.w * (0.2 + 0.6 * rand(n, 1));
          var sy = env.h * (0.08 + 0.2 * rand(n, 2));
          var len = shoot.length || 120;
          var x = sx + len * 1.4 * p;
          var y = sy + len * 0.6 * p;
          var tail = ctx.createLinearGradient(x - len, y - len * 0.43, x, y);
          tail.addColorStop(0, "rgba(0,0,0,0)");
          tail.addColorStop(1, shoot.color || "#e6ecff");
          ctx.globalAlpha = 1 - p;
          ctx.strokeStyle = tail;
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.moveTo(x - len, y - len * 0.43);
          ctx.lineTo(x, y);
          ctx.stroke();
          ctx.globalAlpha = 1;
        }
      }
      if (def.horizon) {
        ctx.fillStyle = def.horizon.color || "#000000";
        ctx.fillRect(0, def.horizon.y, env.w, env.h - def.horizon.y);
      }
    },

    /** ダンジョンの中。上下の岩壁をぎざぎざの影で描き、塵を漂わせる */
    cave: function (ctx, def, t, env) {
      var theme = ((env.game.data.dungeonThemes || {})[def.theme]) || {};
      var tiles = theme.tiles || {};
      var bg = theme.background || "#05070d";
      gradient(ctx, def.top || bg, def.bottom || tiles.floor || bg, env.w, env.h);

      var wall = tiles.wall || "#343a5e";
      rockEdge(ctx, wall, env, def.ceiling || 90, false, 7);
      rockEdge(ctx, wall, env, def.floorHeight || 110, true, 13);

      // 奥の暗がり。真ん中ほど暗くして、奥行きを出す
      var dark = ctx.createRadialGradient(env.w / 2, env.h / 2, 40, env.w / 2, env.h / 2, env.w * 0.6);
      dark.addColorStop(0, "rgba(0,0,0," + (def.depthAlpha || 0.55) + ")");
      dark.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = dark;
      ctx.fillRect(0, 0, env.w, env.h);

      // 塵の色を書いていなければ、壁の色にする
      var dust = def.particles || null;
      if (dust && !dust.color) dust = withColor(dust, wall);
      particles(ctx, dust, t, env, "drift");
    }
  };

  // --- 部品 ---

  function withColor(spec, color) {
    var copy = {};
    for (var key in spec) copy[key] = spec[key];
    copy.color = color;
    return copy;
  }

  function fill(ctx, color, w, h) {
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, w, h);
  }

  function gradient(ctx, top, bottom, w, h) {
    var g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, top || "#000000");
    g.addColorStop(1, bottom || top || "#000000");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
  }

  /**
   * 0〜1 の決まった乱数。同じ (i, k) なら毎回同じ値になる。
   * 粒子を毎フレーム覚えておかなくても、同じ粒が同じ動きを続けられる
   */
  function rand(i, k) {
    var s = Math.sin(i * 12.9898 + k * 78.233) * 43758.5453;
    return s - Math.floor(s);
  }

  /**
   * 粒子を描く。動き方（mode）は4通り。
   *   fall    … 上から降る
   *   rise    … 下から昇り、揺れながら消える（火の粉）
   *   twinkle … その場で瞬く（星）
   *   drift   … ゆっくり横へ漂う（塵）
   * spec: { count, color, minSize, maxSize, speed, alpha }
   */
  function particles(ctx, spec, t, env, mode) {
    if (!spec || !spec.count) return;
    var w = env.w, h = env.h;
    var minSize = spec.minSize || 1, maxSize = spec.maxSize || 2.5;
    var speed = spec.speed || 0.03;
    var top = spec.top || 0, bottom = spec.bottom || h;
    var span = bottom - top;
    // 横の範囲（たき火の上だけに火の粉を出す など）。書かなければ画面の横幅いっぱい
    var left = spec.left || 0, right = (spec.right === undefined) ? w : spec.right;

    ctx.fillStyle = spec.color || "#ffffff";
    for (var i = 0; i < spec.count; i++) {
      var size = minSize + (maxSize - minSize) * rand(i, 3);
      var baseX = left + (right - left) * rand(i, 1);
      var baseY = span * rand(i, 2);
      var v = speed * (0.5 + rand(i, 4));
      var x, y, alpha = (spec.alpha || 0.7) * (0.4 + 0.6 * rand(i, 5));

      if (mode === "fall") {
        y = top + (baseY + t * v) % span;
        x = baseX + Math.sin(t / 900 + i) * 6;
      } else if (mode === "rise") {
        var life = (baseY + t * v) % span;
        y = bottom - life;
        x = baseX + Math.sin(t / 400 + i * 1.7) * 10;
        alpha *= 1 - life / span;                 // 昇るほど消えていく
        alpha *= 0.6 + 0.4 * Math.sin(t / 90 + i); // 火の粉のちらつき
      } else if (mode === "twinkle") {
        x = baseX;
        y = top + baseY;
        alpha *= 0.55 + 0.45 * Math.sin(t / (500 + 700 * rand(i, 6)) + i);
      } else {
        x = left + (baseX - left + t * v) % (right - left);
        y = top + baseY + Math.sin(t / 1500 + i) * 8;
      }
      if (alpha <= 0) continue;
      ctx.globalAlpha = Math.min(1, alpha);
      ctx.fillRect(x, y, size, size);
    }
    ctx.globalAlpha = 1;
  }

  /**
   * 家並みの向こうで揺れる炎。家の影より先に描くので、屋根の上に先だけが覗く。
   * 高さは時間でゆらぎ、炎ごとに位相をずらしてある（全部が同時に揺れないように）
   */
  function flames(ctx, spec, sky, t, env) {
    if (!spec || !spec.count) return;
    var baseY = (sky && sky.y) || env.h - 90;
    for (var i = 0; i < spec.count; i++) {
      var x = env.w * (i + 0.2 + 0.6 * rand(i, 11)) / spec.count;
      var width = (spec.width || 60) * (0.7 + 0.6 * rand(i, 12));
      var sway = Math.sin(t / 130 + i * 2.1) * Math.sin(t / 310 + i);
      var height = (spec.height || 110) * (0.6 + 0.4 * rand(i, 13)) * (0.8 + 0.2 * sway);
      var tip = x + sway * width * 0.25;

      var g = ctx.createLinearGradient(0, baseY - height, 0, baseY);
      g.addColorStop(0, "rgba(0,0,0,0)");
      g.addColorStop(0.35, spec.tipColor || "#ffb04a");
      g.addColorStop(1, spec.color || "#ff5a1a");
      ctx.globalAlpha = spec.alpha || 0.85;
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.moveTo(x - width / 2, baseY);
      ctx.quadraticCurveTo(x - width * 0.45, baseY - height * 0.55, tip, baseY - height);
      ctx.quadraticCurveTo(x + width * 0.45, baseY - height * 0.55, x + width / 2, baseY);
      ctx.closePath();
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  /** 家並みの影。屋根つきの家を横に並べる（幅と高さは決まった乱数） */
  function skyline(ctx, spec, env) {
    if (!spec) return;
    var baseY = spec.y || env.h - 90;
    ctx.fillStyle = spec.color || "#050204";
    ctx.fillRect(0, baseY, env.w, env.h - baseY);

    var x = -10;
    var i = 0;
    while (x < env.w + 10) {
      var bw = (spec.minWidth || 40) + ((spec.maxWidth || 90) - (spec.minWidth || 40)) * rand(i, 7);
      var bh = (spec.minHeight || 20) + ((spec.maxHeight || 60) - (spec.minHeight || 20)) * rand(i, 8);
      var roof = bh * 0.5;
      ctx.beginPath();
      ctx.moveTo(x, baseY);
      ctx.lineTo(x, baseY - bh);
      ctx.lineTo(x + bw / 2, baseY - bh - roof);
      ctx.lineTo(x + bw, baseY - bh);
      ctx.lineTo(x + bw, baseY);
      ctx.closePath();
      ctx.fill();
      x += bw + (spec.gap || 6) * rand(i, 9);
      i++;
    }
  }

  /** 上か下の岩壁。ぎざぎざは決まった乱数で作る */
  function rockEdge(ctx, color, env, depth, fromBottom, seed) {
    var step = 24;
    ctx.fillStyle = color;
    ctx.globalAlpha = 0.55;
    ctx.beginPath();
    var edge = fromBottom ? env.h : 0;
    ctx.moveTo(0, edge);
    for (var x = 0; x <= env.w + step; x += step) {
      var d = depth * (0.55 + 0.45 * rand(x / step, seed));
      ctx.lineTo(x, fromBottom ? env.h - d : d);
    }
    ctx.lineTo(env.w + step, edge);
    ctx.closePath();
    ctx.fill();
    ctx.globalAlpha = 1;
  }

  /** たき火。拠点の画面と同じ絵・同じ揺れ */
  function campfire(ctx, fire, env) {
    if (!fire) return;
    var clock = env.game.clock;
    var size = fire.size || 32;
    var cx = fire.x + size / 2;
    var cy = fire.y + size / 2;

    if (fire.glowRadius) {
      var radius = Math.max(1, NS.Motion.value(fire.glowPulse, clock, 0, fire.glowRadius));
      var glow = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius);
      glow.addColorStop(0, fire.glowColor || "#ffffff");
      glow.addColorStop(1, "rgba(0,0,0,0)");
      ctx.globalAlpha = (fire.glowAlpha === undefined) ? 0.15 : fire.glowAlpha;
      ctx.fillStyle = glow;
      ctx.fillRect(cx - radius, cy - radius, radius * 2, radius * 2);
      ctx.globalAlpha = 1;
    }
    env.sprites.drawMotion("campfire", fire.x, fire.y, size, size,
      NS.Motion.of(env.game.data, fire.motion, clock, 0));
  }

  NS.StoryBackdrop = StoryBackdrop;
})(window.MyGame);
