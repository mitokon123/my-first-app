/**
 * MotionPlayer.js
 * 「誰が・いつから・どの動きを再生しているか」だけを覚えておく。
 *
 * Motion は状態を持たない計算だけの部品なので、
 * 1回だけ流れる動き（踏み込む・のけぞる）には「いつ始まったか」を持つ相手が要る。
 * それがこれ。動きの中身は data/motions.js、計算は Motion に任せる。
 *
 * 使い方
 *   this.motions = new MyGame.MotionPlayer(game.data);
 *   this.motions.play(attacker, "lunge", clock, -1);   // 上へ踏み込む
 *   render: var shot = this.motions.get(monster, clock);
 *           spriteRenderer.drawMotion(id, x, y, w, h, MyGame.Motion.combine(idle, shot));
 */
(function (NS) {
  "use strict";

  /**
   * @param {MyGame.GameData} gameData
   */
  function MotionPlayer(gameData) {
    this.data = gameData;
    this.entries = [];   // [{ target, definition, startedAt, facing }]
  }

  /**
   * 動きを始める。同じ相手が既に何か再生していれば、それを上書きする
   * （攻撃した直後に反撃で被弾する、といった場合は新しい方を見せる）。
   *
   * @param {object} target 動かす相手（モンスターの個体など。同一性だけを見る）
   * @param {string} motionId data/motions.js のid。duration を持つものだけ再生できる
   * @param {number} clock 今の時刻（game.clock）
   * @param {number} [facing] 上下の向き。相手のいる方向へ +1 / -1
   * @returns {boolean} 始められたか
   */
  MotionPlayer.prototype.play = function (target, motionId, clock, facing) {
    var definition = NS.Motion.get(this.data, motionId);
    if (!target || !definition || !definition.duration) return false;

    this._remove(target);
    this.entries.push({
      target: target,
      definition: definition,
      startedAt: clock || 0,
      facing: (facing === undefined) ? 1 : facing
    });
    return true;
  };

  /**
   * その相手の今のずれ。何も再生していなければ null。
   * @returns {object|null} Motion.combine にそのまま渡せる
   */
  MotionPlayer.prototype.get = function (target, clock) {
    var entry = this._find(target);
    if (!entry) return null;

    var elapsed = (clock || 0) - entry.startedAt;
    if (elapsed >= entry.definition.duration) {
      this._remove(target);
      return null;
    }
    return NS.Motion.playback(entry.definition, elapsed, entry.facing);
  };

  MotionPlayer.prototype.isPlaying = function (target, clock) {
    var entry = this._find(target);
    if (!entry) return false;
    return ((clock || 0) - entry.startedAt) < entry.definition.duration;
  };

  /** 何か再生中のものがあるか（演出の待ち合わせに使える） */
  MotionPlayer.prototype.isBusy = function (clock) {
    for (var i = 0; i < this.entries.length; i++) {
      var elapsed = (clock || 0) - this.entries[i].startedAt;
      if (elapsed < this.entries[i].definition.duration) return true;
    }
    return false;
  };

  /**
   * 終わったものを片づける。
   * 画面から消えた相手（倒れたなど）の分が残り続けないよう、毎フレーム呼ぶ。
   */
  MotionPlayer.prototype.update = function (clock) {
    var alive = [];
    for (var i = 0; i < this.entries.length; i++) {
      var elapsed = (clock || 0) - this.entries[i].startedAt;
      if (elapsed < this.entries[i].definition.duration) alive.push(this.entries[i]);
    }
    this.entries = alive;
  };

  MotionPlayer.prototype.clear = function () {
    this.entries = [];
  };

  MotionPlayer.prototype._find = function (target) {
    for (var i = 0; i < this.entries.length; i++) {
      if (this.entries[i].target === target) return this.entries[i];
    }
    return null;
  };

  MotionPlayer.prototype._remove = function (target) {
    for (var i = this.entries.length - 1; i >= 0; i--) {
      if (this.entries[i].target === target) this.entries.splice(i, 1);
    }
  };

  NS.MotionPlayer = MotionPlayer;
})(window.MyGame);
