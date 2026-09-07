/**
 * Player.js
 * プレイヤー。位置は「グリッド座標(col, row)」で管理する。
 * ピクセル座標への変換は描画側（シーン）が行い、ここでは保持しない。
 *
 * ▼ 見た目の位置
 * 当たり判定・遭遇判定・仕掛けの判定はすべて col/row（マス単位）で行う。
 * ただしそのまま描くとマスからマスへ瞬間移動して見えるので、
 * 「見た目の位置」を別に持ち、少し遅れて col/row を追いかけさせる。
 *
 *   col / row             … 本当の位置。ゲームの判定はすべてこちら
 *   viewCol / viewRow     … 描くための位置（小数）。追いかけるだけで判定には使わない
 *
 * こうすると、判定の仕組みには一切手を入れずに、動きだけ滑らかにできる。
 */
(function (NS) {
  "use strict";

  /**
   * @param {number} col 列（グリッドX）
   * @param {number} row 行（グリッドY）
   */
  function Player(col, row) {
    this.col = col;
    this.row = row;
    this.viewCol = col;
    this.viewRow = row;
    this.spriteId = "player";
  }

  /**
   * 位置を決める。見た目の位置もそこへ合わせる（間を滑らない）。
   * 階を移ったときなど、離れた場所へ移すときに使う。
   */
  Player.prototype.setPosition = function (col, row) {
    this.col = col;
    this.row = row;
    this.viewCol = col;
    this.viewRow = row;
  };

  /**
   * 相対移動を試みる。移動先が壁でなければ移動して true を返す。
   * 見た目の位置はここでは動かさず、updateView が追いかける。
   * @param {number} dCol
   * @param {number} dRow
   * @param {MyGame.Dungeon} dungeon 当たり判定に使用
   * @returns {boolean} 実際に移動したか
   */
  Player.prototype.tryMove = function (dCol, dRow, dungeon) {
    var nCol = this.col + dCol;
    var nRow = this.row + dRow;
    if (dungeon.isSolid(nCol, nRow)) return false;
    this.col = nCol;
    this.row = nRow;
    return true;
  };

  /**
   * 見た目の位置を、本当の位置へ近づける。
   *
   * 1マス進むのに duration ミリ秒かけて、一定の速さで動かす。
   * 追いつく前に次の一歩が来ても、速さは変わらないので歩き続けて見える。
   *
   * @param {number} dt 経過ミリ秒
   * @param {number} duration 1マスにかける時間（ms）。0以下なら瞬間移動
   */
  Player.prototype.updateView = function (dt, duration) {
    if (!duration || duration <= 0) {
      this.viewCol = this.col;
      this.viewRow = this.row;
      return;
    }

    var step = dt / duration;   // このフレームで進めるマス数
    this.viewCol = approach(this.viewCol, this.col, step);
    this.viewRow = approach(this.viewRow, this.row, step);
  };

  /** 見た目の位置が本当の位置に追いついているか */
  Player.prototype.isSettled = function () {
    return this.viewCol === this.col && this.viewRow === this.row;
  };

  /** current を target へ step だけ近づける（行き過ぎない） */
  function approach(current, target, step) {
    var diff = target - current;
    if (Math.abs(diff) <= step) return target;
    return current + (diff > 0 ? step : -step);
  }

  NS.Player = Player;
})(window.MyGame);
