/**
 * ParticleField.js
 * ゆっくり降る粒子の演出。タイトル画面やエンディングなど、
 * 背景に奥行きを出したい場面で使い回せるようにしている。
 *
 * 粒子の数・速さ・色などは data/ui.js から受け取る（このファイルに数値を書かない）。
 */
(function (NS) {
  "use strict";

  /**
   * @param {object} params { count, color, minSize, maxSize, minSpeed, maxSpeed, minAlpha, maxAlpha }
   * @param {number} width 表示領域の幅
   * @param {number} height 表示領域の高さ
   * @param {MyGame.Random} [random]
   */
  function ParticleField(params, width, height, random) {
    this.params = params || {};
    this.width = width;
    this.height = height;
    this.random = random || new NS.Random();
    this.particles = [];
    this._spawnAll();
  }

  ParticleField.prototype._spawnAll = function () {
    var count = this.params.count || 0;
    for (var i = 0; i < count; i++) {
      // 最初は画面全体にばらけさせる
      this.particles.push(this._createParticle(true));
    }
  };

  /**
   * 粒子を1つ作る。
   * speed が正なら下へ落ち、負なら上へ昇る（拠点の火の粉など）。
   * @param {boolean} scatter true なら画面のどこかに、false なら進行方向の手前の端に置く
   */
  ParticleField.prototype._createParticle = function (scatter) {
    var p = this.params;
    var r = this.random;
    var speed = range(r, p.minSpeed, p.maxSpeed);

    var y;
    if (scatter) {
      y = r.next() * this.height;
    } else if (speed >= 0) {
      y = -r.next() * 20;                       // 上端の外から落ちてくる
    } else {
      y = this.height + r.next() * 20;          // 下端の外から昇ってくる
    }

    return {
      x: r.next() * this.width,
      y: y,
      size: range(r, p.minSize, p.maxSize),
      speed: speed,
      alpha: range(r, p.minAlpha, p.maxAlpha)
    };
  };

  /**
   * 位置を更新する。画面の外へ抜けた粒子は反対側から出し直す。
   * @param {number} dt 経過ミリ秒
   */
  ParticleField.prototype.update = function (dt) {
    var seconds = dt / 1000;
    for (var i = 0; i < this.particles.length; i++) {
      var particle = this.particles[i];
      particle.y += particle.speed * seconds;

      var goneDown = particle.speed >= 0 && particle.y > this.height;
      var goneUp = particle.speed < 0 && particle.y < 0;
      if (goneDown || goneUp) {
        this.particles[i] = this._createParticle(false);
      }
    }
  };

  ParticleField.prototype.render = function (ctx) {
    var color = this.params.color || "#ffffff";
    ctx.save();
    ctx.fillStyle = color;
    for (var i = 0; i < this.particles.length; i++) {
      var particle = this.particles[i];
      ctx.globalAlpha = particle.alpha;
      ctx.fillRect(particle.x, particle.y, particle.size, particle.size);
    }
    ctx.restore();
  };

  function range(random, min, max) {
    var lo = min === undefined ? 0 : min;
    var hi = max === undefined ? lo : max;
    return lo + random.next() * (hi - lo);
  }

  NS.ParticleField = ParticleField;
})(window.MyGame);
