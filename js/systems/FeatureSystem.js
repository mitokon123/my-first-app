/**
 * FeatureSystem.js
 * 階層に置かれる仕掛けマス（宝箱・泉・罠など）の配置と、踏んだときの処理。
 *
 * 「どこに何個置くか」は data/dungeons.js の features、
 * 「踏むと何が起きるか」は data/features.js が持つ。ここはその2つを実行するだけ。
 *
 * 効果の種類ごとの処理は EFFECT_HANDLERS にまとめてある。
 * 新しい効果を足すときは、ここに関数を1つ追加する（他は変更不要）。
 */
(function (NS) {
  "use strict";

  /**
   * 効果の種類ごとの処理。
   * @param {object} effect data/features.js の effect
   * @param {MyGame.Game} game
   * @param {MyGame.Random} random
   * @param {object} texts data/messages.js の feature
   * @returns {string[]} 画面に出す文章
   */
  var EFFECT_HANDLERS = {
    /** 中身を1つ抽選して渡す */
    giveItem: function (effect, game, random, texts) {
      var entry = pickWeighted(effect.table || [], random);
      if (!entry) return [];

      var count = randomRange(random, entry.min, entry.max);
      var added = game.giveItem(entry.item, count);
      var item = game.data.getItem(entry.item);
      var name = (item && item.name) || entry.item;

      if (added <= 0) {
        return [format(texts.chestFull, { name: name })];
      }
      return [format(texts.chestGot, { name: name, count: added })];
    },

    /** 仲間のHP・PPを割合で回復する */
    heal: function (effect, game, random, texts) {
      var members = game.party.getMembers();
      var healed = false;

      for (var i = 0; i < members.length; i++) {
        var monster = members[i];
        if (effect.hpRatio) {
          var hp = Math.max(1, Math.floor(monster.getMaxHp() * effect.hpRatio));
          if (monster.currentHp < monster.getMaxHp()) healed = true;
          monster.currentHp = Math.min(monster.getMaxHp(), monster.currentHp + hp);
        }
        if (effect.ppRatio && monster.getMaxPp) {
          var pp = Math.max(1, Math.floor(monster.getMaxPp() * effect.ppRatio));
          if (monster.currentPp < monster.getMaxPp()) healed = true;
          monster.currentPp = Math.min(monster.getMaxPp(), monster.currentPp + pp);
        }
      }
      return [healed ? texts.springHealed : texts.springFull];
    },

    /**
     * 仲間全員にダメージ。
     * leaveAtLeast のぶんは必ず残すので、罠だけで全滅することはない。
     */
    damage: function (effect, game, random, texts) {
      var members = game.party.getMembers();
      var floor = effect.leaveAtLeast === undefined ? 1 : effect.leaveAtLeast;
      var total = 0;

      for (var i = 0; i < members.length; i++) {
        var monster = members[i];
        if (monster.isFainted()) continue;

        var damage = Math.max(1, Math.floor(monster.getMaxHp() * (effect.hpRatio || 0)));
        var allowed = Math.max(0, monster.currentHp - floor);
        damage = Math.min(damage, allowed);

        monster.currentHp -= damage;
        total += damage;
      }
      return [total > 0 ? texts.trapHit : texts.trapNoEffect];
    }
  };

  /**
   * @param {MyGame.GameData} gameData
   * @param {MyGame.Random} random
   * @param {object} dungeonDef 挑んでいるダンジョンの定義
   */
  function FeatureSystem(gameData, random, dungeonDef) {
    this.data = gameData;
    this.random = random;
    this.dungeon = dungeonDef || {};
    this.texts = (gameData.messages || {}).feature || {};
  }

  /**
   * その階層に置く仕掛けの個数を返す。
   * ダンジョン側の指定 → data/dungeon.js の既定 の順に探す。
   * @returns {object} { 種類id: { min, max } }
   */
  FeatureSystem.prototype.getCounts = function () {
    var perDungeon = this.dungeon.features;
    if (perDungeon) return perDungeon;
    return ((this.data.dungeon || {}).featureCounts) || {};
  };

  /**
   * 仕掛けをマップ上に置く。
   * @param {MyGame.Dungeon} map
   * @param {Array<{col:number,row:number}>} [avoid] 置きたくないマス（開始位置など）
   * @returns {object[]} [{ col, row, type, definition, used }]
   */
  FeatureSystem.prototype.place = function (map, avoid) {
    var definitions = this.data.features || {};
    var counts = this.getCounts();
    var spots = this._collectSpots(map, avoid);
    var placed = [];

    for (var id in counts) {
      if (!Object.prototype.hasOwnProperty.call(counts, id)) continue;
      var definition = definitions[id];
      if (!definition) continue;   // 定義が無い種類は黙って飛ばす

      var range = counts[id] || {};
      var n = randomRange(this.random, range.min, range.max);

      for (var i = 0; i < n && spots.length > 0; i++) {
        var index = this.random.nextInt(0, spots.length - 1);
        var spot = spots.splice(index, 1)[0];
        placed.push({
          col: spot.col, row: spot.row,
          type: id, definition: definition, used: false
        });
      }
    }
    return placed;
  };

  /** 置ける床マスを集める（階段と avoid のマスは除く） */
  FeatureSystem.prototype._collectSpots = function (map, avoid) {
    var spots = [];

    for (var r = 0; r < map.height; r++) {
      for (var c = 0; c < map.width; c++) {
        if (map.isSolid(c, r)) continue;

        var tile = map.tileAt(c, r);
        if (tile && tile.stairs) continue;
        if (contains(avoid, c, r)) continue;

        spots.push({ col: c, row: r });
      }
    }
    return spots;
  };

  /**
   * 踏んだときに「使うか」を聞く仕掛けか。
   * data/features.js の confirm で決める。
   */
  FeatureSystem.prototype.needsConfirm = function (feature) {
    return !!(feature && feature.definition && feature.definition.confirm);
  };

  /** 聞くときの文（data/messages.js の feature.〇〇Prompt） */
  FeatureSystem.prototype.getPrompt = function (feature) {
    if (!feature) return "";
    return this.texts[feature.type + "Prompt"] || "";
  };

  /** 使わずにおいたときの文（無ければ null） */
  FeatureSystem.prototype.getSkipMessage = function (feature) {
    if (!feature) return null;
    return this.texts[feature.type + "Skipped"] || null;
  };

  /** 「使う / やめておく」の選択肢 */
  FeatureSystem.prototype.getConfirmChoices = function () {
    return [
      { label: this.texts.confirmYes || "使う",       value: true },
      { label: this.texts.confirmNo  || "やめておく", value: false }
    ];
  };

  /**
   * その仕掛けの効果を返す。
   *
   * 中身を配る仕掛け（giveItem）だけは、data/features.js の「どこでも出る中身」に
   * data/dungeons.js の featureTables に書いた「その場所でしか出ない中身」を足す。
   * 上書きではなく追加なので、共通の中身はどのダンジョンでも出続ける。
   *
   * ★ 新しいステージの宝箱に素材を入れたいときは、
   *   dungeons.js の featureTables に足すだけでよい（このファイルは変更不要）。
   */
  FeatureSystem.prototype._effectFor = function (definition, type) {
    var effect = definition.effect || {};
    var extra = (this.dungeon.featureTables || {})[type];
    if (!extra || !extra.length || !effect.table) return effect;

    // 元の effect は共有物なので、書き換えずに複製してから足す
    var merged = {};
    for (var key in effect) {
      if (Object.prototype.hasOwnProperty.call(effect, key)) merged[key] = effect[key];
    }
    merged.table = effect.table.concat(extra);
    return merged;
  };

  /** 指定マスにある、まだ使っていない仕掛けを返す */
  FeatureSystem.prototype.findAt = function (features, col, row) {
    for (var i = 0; i < (features || []).length; i++) {
      var f = features[i];
      if (f.col === col && f.row === row && !f.used) return f;
    }
    return null;
  };

  /**
   * 仕掛けを踏んだときの処理を行う。
   * @param {object} feature place() が返した1件
   * @param {MyGame.Game} game
   * @returns {string[]} 画面に出す文章
   */
  FeatureSystem.prototype.resolve = function (feature, game) {
    if (!feature || feature.used) return [];

    var definition = feature.definition || {};
    var effect = this._effectFor(definition, feature.type);
    var messages = [];

    // 踏んだこと自体の知らせ（「宝箱を見つけた!」など）
    var intro = this.texts[feature.type];
    if (intro) messages.push(intro);

    var handler = EFFECT_HANDLERS[effect.type];
    if (handler) {
      messages = messages.concat(handler(effect, game, this.random, this.texts));
    }

    if (definition.once !== false) feature.used = true;
    else feature.revealed = true;

    return messages.filter(function (m) { return !!m; });
  };

  // --- 補助 ---

  /** 重み付きで1つ選ぶ */
  function pickWeighted(entries, random) {
    var total = 0, i;
    for (i = 0; i < entries.length; i++) total += (entries[i].weight || 0);
    if (total <= 0) return entries[0] || null;

    var roll = random.next() * total;
    for (i = 0; i < entries.length; i++) {
      roll -= (entries[i].weight || 0);
      if (roll <= 0) return entries[i];
    }
    return entries[entries.length - 1];
  }

  /** min〜max の整数（省略時は 1） */
  function randomRange(random, min, max) {
    var lo = (min === undefined) ? 1 : min;
    var hi = (max === undefined) ? lo : max;
    if (hi < lo) hi = lo;
    return random.nextInt(lo, hi);
  }

  function contains(list, col, row) {
    for (var i = 0; i < (list || []).length; i++) {
      if (list[i] && list[i].col === col && list[i].row === row) return true;
    }
    return false;
  }

  function format(template, values) {
    var text = template || "";
    for (var key in values) {
      if (!Object.prototype.hasOwnProperty.call(values, key)) continue;
      text = text.replace("{" + key + "}", values[key]);
    }
    return text;
  }

  NS.FeatureSystem = FeatureSystem;
})(window.MyGame);
