/**
 * Dungeon.js
 * マップデータ（タイル記号の配列）を保持し、タイル種別・当たり判定を提供する。
 * マップの「生成」は行わない（生成は DungeonGenerator の責務）。
 */
(function (NS) {
  "use strict";

  /**
   * @param {string[]} rows タイル記号の文字列配列（1文字=1タイル）
   * @param {object} tileDefs 記号ごとの定義（solid / color など）
   * @param {number} tileSize 1タイルのピクセルサイズ
   */
  function Dungeon(rows, tileDefs, tileSize) {
    this.rows = (rows || []).slice();
    this.tileDefs = tileDefs || {};
    this.tileSize = tileSize;
    this.height = this.rows.length;
    this.width = this.height > 0 ? this.rows[0].length : 0;
  }

  // 指定マスの記号を返す（範囲外は壁扱いの '#'）
  Dungeon.prototype.symbolAt = function (col, row) {
    if (row < 0 || row >= this.height || col < 0 || col >= this.width) return "#";
    return this.rows[row].charAt(col);
  };

  // 指定マスのタイル定義を返す（無ければ null）
  Dungeon.prototype.tileAt = function (col, row) {
    return this.tileDefs[this.symbolAt(col, row)] || null;
  };

  // 指定マスが通行不可か（未定義・範囲外は通行不可＝壁扱い）
  Dungeon.prototype.isSolid = function (col, row) {
    var t = this.tileAt(col, row);
    return t ? !!t.solid : true;
  };

  // 通行可能な最初の床マスを返す
  Dungeon.prototype.findFirstFloor = function () {
    for (var r = 0; r < this.height; r++) {
      for (var c = 0; c < this.width; c++) {
        if (!this.isSolid(c, r)) return { col: c, row: r };
      }
    }
    return { col: 0, row: 0 };
  };

  /**
   * ランダムな床マスを返す（プレイヤーや敵の配置に使用）。
   * @param {MyGame.Random} random
   */
  Dungeon.prototype.randomFloor = function (random) {
    var floors = [];
    for (var r = 0; r < this.height; r++) {
      for (var c = 0; c < this.width; c++) {
        if (!this.isSolid(c, r)) floors.push({ col: c, row: r });
      }
    }
    if (floors.length === 0) return { col: 0, row: 0 };
    return random ? random.pick(floors) : floors[0];
  };

  NS.Dungeon = Dungeon;
})(window.MyGame);
