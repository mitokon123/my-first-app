/**
 * BattleAnimator.js
 * 「見た目のHP」を管理する。
 *
 * 戦闘の計算は一瞬で終わるため、実際のHPはターン開始直後にもう最終値になっている。
 * そのままHPバーを描くと、まだ攻撃を見せていないのにバーが減ってしまう。
 *
 * そこでモンスターごとに2つの値を持つ。
 *   表示HP（display）… いま画面に描いているHP。目標へ向かって少しずつ動く
 *   目標HP（target） … 「ここまで減った」と見せてよいHP
 *
 * ターン開始時は両方をターン前のHPにしておき、
 * ダメージを見せる瞬間に目標HPだけを動かす。すると表示HPが後から追いつき、
 * 攻撃の演出に合わせてバーが減っていく。
 *
 * 速度などは data/ui.js の battle.animation で調整する。
 */
(function (NS) {
  "use strict";

  // 戦闘中だけ使う一時的な値なので、モンスター自身に持たせる
  var DISPLAY = "_displayHp";
  var TARGET = "_targetHp";

  /**
   * @param {object} params battle.animation の内容
   */
  function BattleAnimator(params) {
    this.params = params || {};
  }

  /**
   * 表示・目標とも実際のHPに合わせる（戦闘開始時や、演出を待たずに揃えたいとき）。
   * @param {object[]} monsters
   */
  BattleAnimator.prototype.snap = function (monsters) {
    for (var i = 0; i < (monsters || []).length; i++) {
      monsters[i][DISPLAY] = monsters[i].currentHp;
      monsters[i][TARGET] = monsters[i].currentHp;
    }
  };

  /**
   * 表示・目標を指定の値で止める（ターン開始前のHPに戻すときに使う）。
   */
  BattleAnimator.prototype.hold = function (monster, hp) {
    if (!monster) return;
    monster[DISPLAY] = hp;
    monster[TARGET] = hp;
  };

  /**
   * 「ここまで減った（回復した）」と見せてよいHPを設定する。
   * 表示HPがここへ向かって動き出す。
   */
  BattleAnimator.prototype.revealTo = function (monster, hp) {
    if (!monster || hp === undefined || hp === null) return;
    monster[TARGET] = hp;
  };

  /** いま画面に描くべきHP */
  BattleAnimator.prototype.getHp = function (monster) {
    if (!monster) return 0;
    return (monster[DISPLAY] === undefined) ? monster.currentHp : monster[DISPLAY];
  };

  /**
   * 表示HPを目標HPへ近づける。
   * @param {number} dt 経過ミリ秒
   * @param {object[]} monsters
   */
  BattleAnimator.prototype.update = function (dt, monsters) {
    var perSecond = this.params.hpDrainPerSecond || 40;
    var step = perSecond * (dt / 1000);

    for (var i = 0; i < (monsters || []).length; i++) {
      var monster = monsters[i];
      var shown = this.getHp(monster);
      var goal = (monster[TARGET] === undefined) ? monster.currentHp : monster[TARGET];

      if (shown === goal) continue;

      if (Math.abs(goal - shown) <= step) monster[DISPLAY] = goal;
      else monster[DISPLAY] = shown + (goal > shown ? step : -step);
    }
  };

  /**
   * 表示HPが目標に追いついたか（演出の待ち合わせに使う）。
   * @param {object[]} monsters
   */
  BattleAnimator.prototype.isSettled = function (monsters) {
    for (var i = 0; i < (monsters || []).length; i++) {
      var monster = monsters[i];
      var goal = (monster[TARGET] === undefined) ? monster.currentHp : monster[TARGET];
      if (this.getHp(monster) !== goal) return false;
    }
    return true;
  };

  /**
   * HPバーが動き切るのにかかる時間（ms）。
   * 少しのダメージでも一瞬で終わらないよう、最低時間を設けている。
   * @param {number} amount 変化量
   */
  BattleAnimator.prototype.drainTime = function (amount) {
    var perSecond = this.params.hpDrainPerSecond || 40;
    var minTime = this.params.hpMinDrainTime || 0;
    return Math.max(minTime, Math.abs(amount) / perSecond * 1000);
  };

  NS.BattleAnimator = BattleAnimator;
})(window.MyGame);
