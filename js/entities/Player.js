/**
 * Player.js
 * プレイヤー。位置は「グリッド座標(col, row)」で管理する。
 * ピクセル座標への変換は描画側（シーン）が行い、ここでは保持しない。
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
    this.spriteId = "player";
  }

  Player.prototype.setPosition = function (col, row) {
    this.col = col;
    this.row = row;
  };

  /**
   * 相対移動を試みる。移動先が壁でなければ移動して true を返す。
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

  NS.Player = Player;
})(window.MyGame);
