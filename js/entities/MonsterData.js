/**
 * MonsterData.js
 * 種族データ（図鑑データ）を扱うヘルパー。
 * 種族データそのものは data/monsters.js にあり、GameData 経由で取得する。
 * ここでは「種族データに対する問い合わせ」だけを提供し、個体の状態は持たない。
 */
(function (NS) {
  "use strict";

  var MonsterData = {
    /**
     * 指定レベルまでに覚える技のidリストを返す。
     * @param {object} species 種族データ
     * @param {number} level
     * @returns {string[]}
     */
    skillsUpToLevel: function (species, level) {
      var result = [];
      var learnset = (species && species.learnset) || [];
      for (var i = 0; i < learnset.length; i++) {
        var entry = learnset[i];
        if (entry.level <= level && result.indexOf(entry.skill) === -1) {
          result.push(entry.skill);
        }
      }
      return result;
    },

    /**
     * ちょうどそのレベルで覚える技のidリストを返す（レベルアップ時に使用）。
     */
    skillsLearnedAtLevel: function (species, level) {
      var result = [];
      var learnset = (species && species.learnset) || [];
      for (var i = 0; i < learnset.length; i++) {
        if (learnset[i].level === level) result.push(learnset[i].skill);
      }
      return result;
    },

    /**
     * 指定レベルで進化するかを判定し、進化先idを返す（しない場合 null）。
     */
    evolutionAtLevel: function (species, level) {
      var evo = species && species.evolvesTo;
      if (!evo) return null;
      return (level >= evo.level) ? evo.to : null;
    }
  };

  NS.MonsterData = MonsterData;
})(window.MyGame);
