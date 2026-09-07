/**
 * EffectPlayer.js
 * 技の演出を「いつ・どこで・何色で」出しているかを覚えておく。
 *
 * 描き方は SkillEffect（状態を持たない）、形と時間は data/effects.js。
 * ここは MotionPlayer と同じ役目で、再生中のものを持つだけ。
 *
 * 使い方
 *   this.effects = new MyGame.EffectPlayer(game.data);
 *   this.effects.play("burst", clock, x, y, "#e8542a");
 *   update: this.effects.update(clock);
 *   render: this.effects.render(ctx, clock);
 */
(function (NS) {
  "use strict";

  /**
   * @param {MyGame.GameData} gameData
   */
  function EffectPlayer(gameData) {
    this.data = gameData;
    this.config = gameData.effects || {};
    this.entries = [];   // [{ definition, startedAt, x, y, color, phase }]
  }

  /** 形の定義を取り出す（無ければ null） */
  EffectPlayer.prototype.get = function (effectId) {
    if (!effectId) return null;
    return (this.config.shapes || {})[effectId] || null;
  };

  /**
   * 演出を始める。
   *
   * @param {string} effectId data/effects.js の shapes のid
   * @param {number} clock 今の時刻（game.clock）
   * @param {number} x 出す位置（絵の中心）
   * @param {number} y
   * @param {string} [color] 属性の色。省略すると既定の色
   * @param {number} [direction] 向き。1 が既定で、-1 にすると上下が逆になる
   *   （強化は下から上へ、弱体は上から下へ、のように使う。
   *    向きを見ない形では何も変わらない）
   * @returns {boolean} 始められたか
   */
  EffectPlayer.prototype.play = function (effectId, clock, x, y, color, direction) {
    var definition = this.get(effectId);
    if (!definition || !definition.duration) return false;

    this.entries.push({
      definition: definition,
      startedAt: clock || 0,
      x: x,
      y: y,
      color: color || definition.color || this.config.defaultColor || "#ffffff",
      direction: (direction === -1) ? -1 : 1,
      // 続けて同じ技を出しても同じ向きにならないよう、始めた時刻からずらす
      phase: ((clock || 0) % 997) / 997
    });
    return true;
  };

  /** 終わったものを片づける */
  EffectPlayer.prototype.update = function (clock) {
    var alive = [];
    for (var i = 0; i < this.entries.length; i++) {
      if (this._progress(this.entries[i], clock) < 1) alive.push(this.entries[i]);
    }
    this.entries = alive;
  };

  /** 再生中のものがあるか（演出の待ち合わせに使う） */
  EffectPlayer.prototype.isBusy = function (clock) {
    for (var i = 0; i < this.entries.length; i++) {
      if (this._progress(this.entries[i], clock) < 1) return true;
    }
    return false;
  };

  EffectPlayer.prototype.clear = function () {
    this.entries = [];
  };

  /**
   * 演出の濃さ（設定の effectLevel）。1 が標準、0 で何も出さない。
   * 使う側が毎フレーム渡す必要が無いよう、ここに覚えておく。
   */
  EffectPlayer.prototype.setIntensity = function (value) {
    this.intensity = (typeof value === "number") ? value : 1;
  };

  EffectPlayer.prototype.render = function (ctx, clock) {
    if (!NS.SkillEffect) return;

    var intensity = (this.intensity === undefined) ? 1 : this.intensity;
    if (intensity <= 0) return;

    var core = this.config.coreColor;
    for (var i = 0; i < this.entries.length; i++) {
      var entry = this.entries[i];
      NS.SkillEffect.draw(ctx, entry.definition, this._progress(entry, clock), {
        x: entry.x, y: entry.y,
        color: entry.color, coreColor: core, phase: entry.phase,
        direction: entry.direction, intensity: intensity
      });
    }
  };

  EffectPlayer.prototype._progress = function (entry, clock) {
    return ((clock || 0) - entry.startedAt) / entry.definition.duration;
  };

  NS.EffectPlayer = EffectPlayer;
})(window.MyGame);
