/**
 * categories.js
 * アイテムとモンスターの「分類」定義。図鑑や持ち物の並び・絞り込みに使う。
 *
 * item     : アイテムの分類（回復・素材など）
 * monster  : モンスターの分類（系統。属性とは別の軸）
 *
 * 共通の項目
 *   id    : 識別子
 *   name  : 表示名
 *   order : 並び順（小さいほど先）
 *   color : 見出しに使う色
 *
 * ★ 分類を増やすときは、このファイルに1エントリ足すだけでよい。
 *   アイテム側は items.js の category、モンスター側は monsters.js の family で参照する。
 */
(function (NS) {
  "use strict";

  NS.rawData.categories = {
    item: {
      heal:      { id: "heal",      name: "回復", order: 1, color: "#5fd18c" },
      equipment: { id: "equipment", name: "装備", order: 2, color: "#7fd9e8" },
      material:  { id: "material",  name: "素材", order: 3, color: "#c8a35e" },
      key:       { id: "key",       name: "重要", order: 4, color: "#e8b4ff" }
    },

    monster: {
      slimeKind:     { id: "slimeKind",     name: "スライム系", order: 1, color: "#5fd18c" },
      beastKind:     { id: "beastKind",     name: "獣系",       order: 2, color: "#c8a35e" },
      insectKind:    { id: "insectKind",    name: "虫系",       order: 3, color: "#a8d86f" },
      constructKind: { id: "constructKind", name: "造物系",     order: 4, color: "#7d7a72" },
      birdKind:      { id: "birdKind",      name: "鳥系",       order: 5, color: "#7fd9e8" },
      plantKind:     { id: "plantKind",     name: "植物系",     order: 6, color: "#8a5fb0" },
      dragonKind:    { id: "dragonKind",    name: "竜系",       order: 7, color: "#e8542a" },
      demonKind:     { id: "demonKind",     name: "魔族系",     order: 8, color: "#b06fd6" }
    },

    // 特性の分類（図鑑での並びと見出しに使う）
    ability: {
      stat:   { id: "stat",   name: "能力変化", order: 1, color: "#4fb0d1" },
      damage: { id: "damage", name: "ダメージ", order: 2, color: "#e8542a" }
    }
  };
})(window.MyGame);
