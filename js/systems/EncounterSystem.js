/**
 * EncounterSystem.js
 * 「敵と遭遇するか」の判定と、遭遇した敵の一団を作ることを担当する。
 *
 * どの敵が出るかはダンジョンごとに違うので、挑んでいるダンジョンの定義を受け取る。
 * さらに階ごとの上書き（perFloor）があれば、そちらを優先する。
 * 書かれていない項目は data/enemies.js の既定値を使う。
 *
 * ▼ 設定の探す順番
 *   出現レベル … 種族ごとの指定 → その階の指定 → その場所の指定 → 全体の既定
 *   敵の数     … その階の指定 → その場所の指定 → 全体の既定
 *   出現表     … その階の指定 → その場所の指定
 */
(function (NS) {
  "use strict";

  /**
   * @param {MyGame.GameData} gameData
   * @param {MyGame.Random} random
   * @param {object} [dungeon] 挑んでいるダンジョンの定義（data/dungeons.js の1件）
   */
  function EncounterSystem(gameData, random, dungeon) {
    this.data = gameData;
    this.random = random;
    this.dungeon = dungeon || null;
    this.floor = 1;             // 今いる階（perFloor の参照に使う）
    this._stepsSinceBattle = 0; // 戦闘後の経過歩数（連続遭遇の抑制に使用）
  }

  /** 挑んでいるダンジョンを切り替える */
  EncounterSystem.prototype.setDungeon = function (dungeon) {
    this.dungeon = dungeon || null;
  };

  /** 今いる階を伝える（階を降りるたびに呼ぶ） */
  EncounterSystem.prototype.setFloor = function (floor) {
    this.floor = floor || 1;
  };

  /** その階だけの上書き設定（無ければ空） */
  EncounterSystem.prototype.getFloorConfig = function () {
    var perFloor = this.getEncounterConfig().perFloor;
    return (perFloor && perFloor[String(this.floor)]) || {};
  };

  /** 戦闘が終わったときに呼ぶ（猶予歩数をリセット） */
  EncounterSystem.prototype.resetGrace = function () {
    this._stepsSinceBattle = 0;
  };

  /** そのダンジョンの出現設定（無ければ空） */
  EncounterSystem.prototype.getEncounterConfig = function () {
    return (this.dungeon && this.dungeon.encounter) || {};
  };

  /**
   * 今の階の出現表。
   *
   * 階ごとの表（perFloor の table）があればそちらを、無ければその場所の表を使う。
   * 階ごとに表を書くと、同じ種族の出やすさを階によって変えられる。
   *   例: ビリムシを B3F だけ多く出す
   * minFloor / maxFloor だけでは「出る・出ない」しか変えられないので、
   * 配分そのものを階ごとに決めたいときはこちらを使う。
   *
   * 階ごとの表を書いた階では、その場所の表は使われない（混ざらない）。
   * 書いていない階は今までどおり、その場所の表がそのまま使われる。
   */
  EncounterSystem.prototype.getTable = function () {
    var floorTable = this.getFloorConfig().table;
    if (floorTable && floorTable.length > 0) return floorTable;
    return this.getEncounterConfig().table || [];
  };

  /**
   * 1歩進んだときに呼ぶ。遭遇したら敵の一団（配列）を返し、しなければ null。
   * @returns {MyGame.MonsterInstance[]|null}
   */
  EncounterSystem.prototype.onStep = function () {
    var defaults = this.data.enemies || {};
    var config = this.getEncounterConfig();
    this._stepsSinceBattle++;

    // 戦闘直後の猶予中は遭遇しない
    if (this._stepsSinceBattle <= (defaults.gracePeriod || 0)) return null;

    var rate = numberOr(this.getFloorConfig().rate,
                        numberOr(config.rate, numberOr(defaults.encounterRate, 0)));
    if (this.random.next() >= rate) return null;

    return this.createEnemyGroup();
  };

  /**
   * 敵を groupSize に従って複数体つくる。
   * 盤面に出せる数（config.battleFieldSize）は超えない。
   * @returns {MyGame.MonsterInstance[]|null}
   */
  EncounterSystem.prototype.createEnemyGroup = function () {
    var config = this.getEncounterConfig();
    if (this.getTable().length === 0) return null;

    var defaults = this.data.enemies || {};
    var fieldSize = (this.data.config || {}).battleFieldSize || 3;
    var size = this.getFloorConfig().groupSize
            || config.groupSize || defaults.defaultGroupSize || { min: 1, max: 1 };

    var count = this.resolveGroupCount(size, fieldSize);
    var group = [];
    for (var i = 0; i < count; i++) {
      var enemy = this.createEnemy();
      if (enemy) group.push(enemy);
    }
    return group.length > 0 ? group : null;
  };

  /**
   * 出現テーブルから敵を1体つくる。
   * @returns {MyGame.MonsterInstance|null}
   */
  EncounterSystem.prototype.createEnemy = function () {
    var table = this.getTable();
    if (table.length === 0) return null;

    var entry = pickByWeight(this.tableForFloor(table), this.random);
    if (!entry) return null;

    var range = this.resolveLevelRange(entry);
    var level = this.random.nextInt(range.min, range.max);
    return NS.MonsterInstance.create(entry.species, level, this.data, this.random);
  };

  /**
   * 一度に出す敵の数を決める。
   *
   * data/dungeons.js の groupSize には2通りの書き方ができる。
   *   { min: 1, max: 3 }
   *     … min〜max から均等に選ぶ（1体・2体・3体が同じ割合）
   *   [ { count: 1, weight: 0.4 }, { count: 2, weight: 0.4 }, { count: 3, weight: 0.2 } ]
   *     … 体数ごとに出やすさを変える。「3体はたまにしか出ない」を作れる
   *
   * どちらの書き方でも、盤面に出せる数（config.battleFieldSize）は超えない。
   */
  EncounterSystem.prototype.resolveGroupCount = function (size, fieldSize) {
    if (Array.isArray(size)) {
      var entry = pickByWeight(size, this.random);
      var picked = entry ? numberOr(entry.count, 1) : 1;
      return Math.max(1, Math.min(fieldSize, picked));
    }

    var min = Math.max(1, numberOr(size.min, 1));
    var max = Math.min(fieldSize, Math.max(min, numberOr(size.max, min)));
    return this.random.nextInt(min, max);
  };

  /**
   * 今いる階に出てよいエントリだけを残す。
   *
   * data/dungeons.js の table に minFloor / maxFloor を書くと、
   * 「深い階にしか出ない」「浅い階にしか出ない」種族を作れる。
   * どちらも省略したエントリは、これまでどおり全階に出る。
   *   例: { species: "…", weight: 0.4, minFloor: 3 }  … B3F以降だけ
   *
   * ▼ 全部が消えてしまったときは、元の表をそのまま返す。
   *   その階だけ敵が一体も出なくなるより、書き間違いに気づけるまで
   *   遊べる状態を保つほうを優先している。
   */
  EncounterSystem.prototype.tableForFloor = function (table) {
    var allowed = [];

    for (var i = 0; i < table.length; i++) {
      var entry = table[i];
      if (entry.minFloor !== undefined && this.floor < entry.minFloor) continue;
      if (entry.maxFloor !== undefined && this.floor > entry.maxFloor) continue;
      allowed.push(entry);
    }
    return allowed.length > 0 ? allowed : table;
  };

  /**
   * 出現レベルの範囲を決める。
   * 「その種族の指定 → その階の指定 → その場所の指定 → 全体の既定」の順に探す。
   * @param {object} entry 出現テーブルの1エントリ
   * @returns {{min:number, max:number}}
   */
  EncounterSystem.prototype.resolveLevelRange = function (entry) {
    var defaults = this.data.enemies || {};
    var config = this.getEncounterConfig();
    var fallback = defaults.defaultLevel || { min: 1, max: 1 };
    var zoneRange = this.getFloorConfig().levelRange || config.levelRange || fallback;

    // 種族ごとの指定は片方だけでも書ける（もう片方はその階の既定を使う）
    var min = (entry && entry.minLevel !== undefined) ? entry.minLevel : zoneRange.min;
    var max = (entry && entry.maxLevel !== undefined) ? entry.maxLevel : zoneRange.max;

    min = numberOr(min, 1);
    max = numberOr(max, min);
    if (max < min) max = min;   // 逆に書かれていても壊れないようにする

    return { min: min, max: max };
  };

  /** 数値として使える値ならそれを、そうでなければ既定値を返す */
  function numberOr(value, fallback) {
    return (typeof value === "number") ? value : fallback;
  }

  // 重み付き抽選
  function pickByWeight(table, random) {
    var total = 0;
    for (var i = 0; i < table.length; i++) total += (table[i].weight || 0);
    if (total <= 0) return null;

    var r = random.next() * total;
    for (var j = 0; j < table.length; j++) {
      r -= (table[j].weight || 0);
      if (r < 0) return table[j];
    }
    return table[table.length - 1];
  }

  NS.EncounterSystem = EncounterSystem;
})(window.MyGame);
