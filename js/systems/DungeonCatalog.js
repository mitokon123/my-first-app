/**
 * DungeonCatalog.js
 * ダンジョン一覧の取り出しと、解放されているかの判定をまとめる。
 *
 * 「どのダンジョンがあるか」は data/dungeons.js、
 * 「どれをクリアしたか」は Game が持つ。ここはその2つを突き合わせるだけ。
 */
(function (NS) {
  "use strict";

  var DungeonCatalog = {
    /**
     * ダンジョンを order 順に並べて返す。
     * @param {MyGame.GameData} gameData
     * @returns {object[]}
     */
    list: function (gameData) {
      var dungeons = (gameData && gameData.dungeons) || {};
      var result = [];

      for (var id in dungeons) {
        if (!Object.prototype.hasOwnProperty.call(dungeons, id)) continue;
        result.push(dungeons[id]);
      }
      result.sort(function (a, b) {
        return (a.order || 999) - (b.order || 999);
      });
      return result;
    },

    get: function (gameData, id) {
      return ((gameData && gameData.dungeons) || {})[id] || null;
    },

    /** その地方に属するダンジョンのidを並べて返す */
    idsInRegion: function (gameData, regionId) {
      var list = this.list(gameData);
      var ids = [];

      for (var i = 0; i < list.length; i++) {
        if (list[i].region === regionId) ids.push(list[i].id);
      }
      return ids;
    },

    /**
     * そのダンジョンに挑めるか。
     *
     * unlockedBy には次の書き方ができる（data/dungeons.js の説明を参照）。
     *   "id" / ["id","id"] / { dungeons:[...], count:n } / { region:"...", count:n }
     * 地方を条件にする場合だけ gameData が要る。
     *
     * @param {object} dungeon
     * @param {object} cleared クリア済みid の一覧（{ id: true }）
     * @param {MyGame.GameData} [gameData] 地方を条件にするときに渡す
     */
    isUnlocked: function (dungeon, cleared, gameData) {
      if (!dungeon) return false;
      return this.isConditionMet(dungeon.unlockedBy, cleared, gameData);
    },

    /**
     * 「クリア状況にもとづく解放条件」を満たしているか。
     * 条件が無ければ最初から開いている。
     *
     * ダンジョンだけでなく、店（data/shop.js の unlockedBy）など
     * 「どこかをクリアしたら開く」ものすべてがこれを使う。
     * 書き方を1か所にまとめておくことで、条件の形が増えても全部に効く。
     */
    isConditionMet: function (condition, cleared, gameData) {
      if (!condition) return true;

      var ids = this._conditionIds(condition, gameData);
      if (ids.length === 0) return true;

      var need = this._requiredCount(condition, ids.length);
      return this._countCleared(ids, cleared) >= need;
    },

    /** 条件が指しているダンジョンidを並べる */
    _conditionIds: function (condition, gameData) {
      if (typeof condition === "string") return [condition];
      if (isArray(condition)) return condition.slice();

      var ids = (condition.dungeons || []).slice();
      if (condition.region) {
        ids = ids.concat(this.idsInRegion(gameData, condition.region));
      }
      return ids;
    },

    /** いくつクリアしていれば満たすか（count 未指定なら全部） */
    _requiredCount: function (condition, total) {
      if (condition && typeof condition.count === "number") {
        return Math.max(1, Math.min(condition.count, total));
      }
      return total;
    },

    _countCleared: function (ids, cleared) {
      var count = 0;
      for (var i = 0; i < ids.length; i++) {
        if (cleared && cleared[ids[i]]) count++;
      }
      return count;
    },

    /**
     * 解放に必要なダンジョンの名前（無ければ null）。
     * 複数あるときは、まだクリアしていないものだけを「、」でつないで返す。
     *
     * ※ count を使った条件（「どれか2つ」など）では、残り全部の名前が並ぶ。
     *   「あと1つ」という言い方にしたくなったら、ここで残り必要数も返して
     *   data/messages.js の lockedHint を差し替える。
     */
    requiredName: function (gameData, dungeon, cleared) {
      return this.conditionName(gameData, dungeon && dungeon.unlockedBy, cleared);
    },

    /**
     * 解放条件が指している場所の名前（無ければ null）。
     * 店の「まだ開いていない」案内にも使う。
     */
    conditionName: function (gameData, condition, cleared) {
      if (!condition) return null;

      var ids = this._conditionIds(condition, gameData);
      var names = [];

      for (var i = 0; i < ids.length; i++) {
        if (cleared && cleared[ids[i]]) continue;   // 済んだものは出さない
        var required = this.get(gameData, ids[i]);
        names.push(required ? required.name : ids[i]);
      }

      if (names.length === 0) return null;
      return names.join("、");
    },

    /**
     * そのダンジョンに出るモンスターの種族データを、出現テーブルの順で返す。
     * データに無い種族idは黙って飛ばす（データの書き間違いで画面が壊れないように）。
     *
     * 階ごとの出現表（perFloor の table）も必ず見る。
     * 上の表だけを見ていると、その階にしか出ない種族（深層のヨミリュウなど）が
     * ダンジョン選択の一覧からも、手に入る素材の一覧からも消えてしまう。
     *
     * @param {MyGame.GameData} gameData
     * @param {object} dungeon
     * @returns {object[]} monsters.js のエントリの配列
     */
    getSpecies: function (gameData, dungeon) {
      var encounter = (dungeon && dungeon.encounter) || {};
      var monsters = (gameData && gameData.monsters) || {};
      var result = [];
      var seen = {};

      collect(encounter.table);

      var perFloor = encounter.perFloor || {};
      for (var key in perFloor) {
        if (Object.prototype.hasOwnProperty.call(perFloor, key)) {
          collect(perFloor[key].table);
        }
      }
      return result;

      function collect(table) {
        for (var i = 0; i < (table || []).length; i++) {
          var id = table[i].species;
          if (seen[id]) continue;
          seen[id] = true;
          if (monsters[id]) result.push(monsters[id]);
        }
      }
    },

    /**
     * そのダンジョンで手に入るアイテムの定義を返す（重複は1つにまとめる）。
     * ボスの落とすものは、クリアするまで伏せておきたいので既定では含めない。
     * @param {MyGame.GameData} gameData
     * @param {object} dungeon
     * @param {boolean} includeBoss ボスの落とすものも含めるか
     * @returns {object[]} items.js のエントリの配列
     */
    getDropItems: function (gameData, dungeon, includeBoss) {
      var species = this.getSpecies(gameData, dungeon);

      if (includeBoss) {
        var boss = ((gameData && gameData.bosses) || {})[dungeon && dungeon.boss];
        var bossSpecies = boss && ((gameData.monsters || {})[boss.species]);
        if (bossSpecies) species = species.concat([bossSpecies]);
      }

      var items = (gameData && gameData.items) || {};
      var seen = {};
      var result = [];

      for (var i = 0; i < species.length; i++) {
        var drops = species[i].drops || [];
        for (var j = 0; j < drops.length; j++) {
          var id = drops[j].item;
          if (seen[id] || !items[id]) continue;
          seen[id] = true;
          result.push(items[id]);
        }
      }
      return result;
    }
  };

  /** 配列かどうか（古い環境でも動くように自前で見る） */
  function isArray(value) {
    return Object.prototype.toString.call(value) === "[object Array]";
  }

  NS.DungeonCatalog = DungeonCatalog;
})(window.MyGame);
