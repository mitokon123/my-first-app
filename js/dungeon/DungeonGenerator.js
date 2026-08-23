/**
 * DungeonGenerator.js
 * ランダムなダンジョンマップを生成する（生成のみが責務）。
 * 方式：ランダムに矩形の部屋を配置し、部屋どうしをL字の通路でつなぐ。
 *
 * 生成結果は Dungeon がそのまま扱える「タイル記号の文字列配列」で返す。
 * 数値（部屋数・サイズ等）はすべて data/dungeon.js の generation から受け取る。
 */
(function (NS) {
  "use strict";

  var WALL = "#";
  var FLOOR = ".";
  var STAIRS = ">";

  function DungeonGenerator(params, random) {
    this.params = params || {};
    this.random = random || new NS.Random();
  }

  /**
   * マップを生成する。
   * @returns {{ rows: string[], rooms: Array, stairs: {col:number,row:number}|null }}
   */
  DungeonGenerator.prototype.generate = function () {
    var p = this.params;
    var width = p.width || 20;
    var height = p.height || 15;

    var grid = this._createFilledGrid(width, height);
    var rooms = this._placeRooms(grid, width, height);
    this._connectRooms(grid, rooms);
    var stairs = this._placeStairs(grid, rooms);

    return { rows: gridToRows(grid), rooms: rooms, stairs: stairs };
  };

  /**
   * 階段を置く。最初の部屋（プレイヤーの出現位置に近い）を避け、
   * できるだけ最後の部屋の中心に置く。
   */
  DungeonGenerator.prototype._placeStairs = function (grid, rooms) {
    if (rooms.length === 0) return null;

    var room = rooms[rooms.length - 1];
    var center = roomCenter(room);
    grid[center.y][center.x] = STAIRS;
    return { col: center.x, row: center.y };
  };

  // 全面を壁で埋めた2次元配列を作る
  DungeonGenerator.prototype._createFilledGrid = function (width, height) {
    var grid = [];
    for (var y = 0; y < height; y++) {
      var row = [];
      for (var x = 0; x < width; x++) row.push(WALL);
      grid.push(row);
    }
    return grid;
  };

  // 重ならないように部屋を配置し、床を掘る
  DungeonGenerator.prototype._placeRooms = function (grid, width, height) {
    var p = this.params;
    var roomMin = p.roomMin || 3;
    var roomMax = p.roomMax || 6;
    var roomCount = p.roomCount || 6;
    var attempts = p.attempts || 40;

    var rooms = [];
    for (var i = 0; i < attempts && rooms.length < roomCount; i++) {
      var w = this.random.nextInt(roomMin, roomMax);
      var h = this.random.nextInt(roomMin, roomMax);
      // 外周は壁として残すため 1..(width-w-1) の範囲に置く
      var x = this.random.nextInt(1, Math.max(1, width - w - 1));
      var y = this.random.nextInt(1, Math.max(1, height - h - 1));

      var room = { x: x, y: y, w: w, h: h };
      if (overlapsAny(room, rooms)) continue;

      carveRoom(grid, room);
      rooms.push(room);
    }
    return rooms;
  };

  // 部屋どうしをL字の通路で順につなぐ
  DungeonGenerator.prototype._connectRooms = function (grid, rooms) {
    for (var i = 1; i < rooms.length; i++) {
      var a = roomCenter(rooms[i - 1]);
      var b = roomCenter(rooms[i]);

      // 横→縦 か 縦→横 をランダムに選ぶ
      if (this.random.next() < 0.5) {
        carveHCorridor(grid, a.x, b.x, a.y);
        carveVCorridor(grid, a.y, b.y, b.x);
      } else {
        carveVCorridor(grid, a.y, b.y, a.x);
        carveHCorridor(grid, a.x, b.x, b.y);
      }
    }
  };

  // --- 内部ヘルパ ---

  function carveRoom(grid, room) {
    for (var y = room.y; y < room.y + room.h; y++) {
      for (var x = room.x; x < room.x + room.w; x++) {
        grid[y][x] = FLOOR;
      }
    }
  }

  function carveHCorridor(grid, x1, x2, y) {
    var from = Math.min(x1, x2), to = Math.max(x1, x2);
    for (var x = from; x <= to; x++) grid[y][x] = FLOOR;
  }

  function carveVCorridor(grid, y1, y2, x) {
    var from = Math.min(y1, y2), to = Math.max(y1, y2);
    for (var y = from; y <= to; y++) grid[y][x] = FLOOR;
  }

  // 部屋どうしが隣接しないよう1マス余裕を持って判定する
  function overlapsAny(room, rooms) {
    for (var i = 0; i < rooms.length; i++) {
      var o = rooms[i];
      if (room.x - 1 < o.x + o.w && room.x + room.w + 1 > o.x &&
          room.y - 1 < o.y + o.h && room.y + room.h + 1 > o.y) {
        return true;
      }
    }
    return false;
  }

  function roomCenter(room) {
    return {
      x: room.x + Math.floor(room.w / 2),
      y: room.y + Math.floor(room.h / 2)
    };
  }

  function gridToRows(grid) {
    var rows = [];
    for (var y = 0; y < grid.length; y++) rows.push(grid[y].join(""));
    return rows;
  }

  NS.DungeonGenerator = DungeonGenerator;
})(window.MyGame);
