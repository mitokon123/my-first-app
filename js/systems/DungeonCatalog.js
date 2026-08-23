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

    /**
     * そのダンジョンに挑めるか。
     * unlockedBy に書かれたダンジョンをクリアしていれば挑める。
     * @param {object} dungeon
     * @param {object} cleared クリア済みid の一覧（{ id: true }）
     */
    isUnlocked: function (dungeon, cleared) {
      if (!dungeon) return false;
      if (!dungeon.unlockedBy) return true;
      return !!(cleared && cleared[dungeon.unlockedBy]);
    },

    /** 解放に必要なダンジョンの名前（無ければ null） */
    requiredName: function (gameData, dungeon) {
      if (!dungeon || !dungeon.unlockedBy) return null;
      var required = this.get(gameData, dungeon.unlockedBy);
      return required ? required.name : dungeon.unlockedBy;
    },

    /**
     * そのダンジョンに出るモンスターの種族データを、出現テーブルの順で返す。
     * データに無い種族idは黙って飛ばす（データの書き間違いで画面が壊れないように）。
     * @param {MyGame.GameData} gameData
     * @param {object} dungeon
     * @returns {object[]} monsters.js のエントリの配列
     */
    getSpecies: function (gameData, dungeon) {
      var table = (dungeon && dungeon.encounter && dungeon.encounter.table) || [];
      var monsters = (gameData && gameData.monsters) || {};
      var result = [];

      for (var i = 0; i < table.length; i++) {
        var species = monsters[table[i].species];
        if (species) result.push(species);
      }
      return result;
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

  NS.DungeonCatalog = DungeonCatalog;
})(window.MyGame);
