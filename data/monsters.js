/**
 * monsters.js
 * MonsterData（種族データ／図鑑データ）の定義。
 * 「実際に所持する個体」は MonsterInstance が別に持つ（ここは不変の種族情報）。
 *
 * family      : 分類id（categories.js の monster を参照）
 * element     : 属性id（elements.js を参照）。このモンスター自身の属性
 * resistances : 属性ごとの耐性（-5〜10）。書かない属性は 0（等倍）
 *   高いほどその属性のダメージを受けにくい。マイナスは受けるダメージが増える
 *   倍率 = 1 - 耐性 × 0.07（data/battle.js の resistance.step）
 * immunities  : 完全に無効化する属性idの配列（耐性の値にかかわらずダメージ0）
 * maxLevel    : このモンスターのレベル上限（省略時は growth.js の defaultMaxLevel）
 *   growth.js の levelCap（99）を超えることはできない
 * growthRate  : 1レベルごとのステータス上昇率（0.01〜0.55。範囲外は丸められる）
 *   数値で書くと全ステータス共通：
 *     growthRate: 0.08
 *   オブジェクトで書くとステータスごとに指定できる（書かない項目は default を使う）：
 *     growthRate: { hp: 0.12, attack: 0.06, default: 0.08 }
 * description : 図鑑での説明文
 * baseHp/baseAttack/baseDefense/baseSpeed : 基本ステータス
 *   baseSpeed … 素早さ。大きいほど戦闘で先に行動する
 * basePp      : PPの基本値。技を使うと減る（通常攻撃はPPを使わない）
 * scoutRate   : スカウト成功率の基準値（0〜1）
 * spawnRate   : 出現の重み（相対値）
 * learnset    : 覚える技 [{ level, skill }]
 * evolvesTo   : 進化情報（例 { to:"kingSlime", level:12 }）未進化は null
 * abilities   : 特性id（abilities.js を参照）。
 *   1体が持てる数は config.js の abilityMax まで（現在は1つ）
 * expReward   : 倒したときに得られる経験値（Lv1のときの量。レベルに応じて増える）
 * goldReward  : 倒したときに得られるゴールド（同上）
 * drops       : 倒したときに落とすアイテム（複数指定でき、それぞれ独立して判定する）
 *   item : アイテムid（items.js を参照）
 *   rate : 落とす確率（0〜1）
 *   min / max : 落とす個数の範囲（省略時は1個）
 * sprite      : スプライトid（sprites.js を参照）
 *
 * ★ 新しいモンスターの追加は、このファイルに1エントリ足すだけでよい。
 */
(function (NS) {
  "use strict";

  NS.rawData.monsters = {
    slime: {
      id: "slime",
      name: "スライム",
      family: "slimeKind",
      element: "water",
      resistances: { water: 3, fire: 0 },
      immunities: [],
      maxLevel: 40,
      growthRate: { hp: 0.15, attack: 0.15, defense: 0.17, speed: 0.14, pp: 0.10 },
      description: "最も基本的なモンスター。素直で扱いやすい。",
      baseHp: 22,
      baseAttack: 5,
      baseDefense: 4,
      baseSpeed: 3,
      basePp: 4,
      scoutRate: 0.45,
      spawnRate: 1.0,
      learnset: [
        { level: 1, skill: "tackle" }
      ],
      evolvesTo: null,
      abilities: ["tough"],
      expReward: 8,
      goldReward: 4,
      drops: [
        { item: "herb", rate: 0.07, min: 1, max: 1 }
      ],
      sprite: "slime"
    },
    batty: {
      id: "batty",
      name: "コウモリ",
      family: "beastKind",
      element: "dark",
      resistances: { dark: 2, wind: 2 },
      immunities: [],
      maxLevel: 45,
      // ステータスごとに成長率を変える例：素早さだけ伸びやすい
      growthRate: { hp: 0.12, attack: 0.18, defense: 0.14, speed: 0.18, pp: 0.12 },
      description: "暗がりを好む小さな獣。素早く飛び回る。",
      baseHp: 16,
      baseAttack: 7,
      baseDefense: 2,
      baseSpeed: 8,
      basePp: 4,
      scoutRate: 0.35,
      spawnRate: 0.8,
      learnset: [
        { level: 1, skill: "tackle" },
        { level: 3, skill: "bite" }
      ],
      evolvesTo: null,
      abilities: ["swiftFoot"],
      expReward: 12,
      goldReward: 6,
      drops: [],
      sprite: "batty"
    },
    // --- 苔むす坑道のモンスター ---

    mossRat: {
      id: "mossRat",
      name: "コケネズミ",
      family: "beastKind",
      element: "earth",
      resistances: { earth: 2, wind: -1 },
      immunities: [],
      maxLevel: 30,
      growthRate: { hp: 0.14, attack: 0.16, defense: 0.13, speed: 0.16, pp: 0.11 },
      description: "背中に苔を生やした小さなネズミ。坑道の壁を素早く走り回る。",
      baseHp: 16,
      baseAttack: 7,
      baseDefense: 3,
      baseSpeed: 8,
      basePp: 4,
      scoutRate: 0.40,
      spawnRate: 0.9,
      learnset: [
        { level: 1, skill: "tackle" },
        { level: 4, skill: "bite" }
      ],
      evolvesTo: null,
      abilities: ["guts"],
      expReward: 13,
      goldReward: 6,
      drops: [
        { item: "herb", rate: 0.085, min: 1, max: 1 }
      ],
      sprite: "mossRat"
    },

    rocky: {
      id: "rocky",
      name: "イワゴロー",
      family: "constructKind",
      element: "earth",
      resistances: { earth: 3, water: -2 },
      immunities: [],
      maxLevel: 30,
      growthRate: { hp: 0.18, attack: 0.15, defense: 0.20, speed: 0.06, pp: 0.10 },
      description: "岩そのものが動き出したような魔物。硬いが、とにかく足が遅い。",
      baseHp: 26,
      baseAttack: 6,
      baseDefense: 9,
      baseSpeed: 2,
      basePp: 4,
      scoutRate: 0.35,
      spawnRate: 0.6,
      learnset: [
        { level: 1, skill: "tackle" },
        { level: 5, skill: "rockThrow" }
      ],
      evolvesTo: null,
      abilities: ["thickSkin"],
      expReward: 12,
      goldReward: 8,
      drops: [
        { item: "oreShard", rate: 0.15, min: 1, max: 2 }
      ],
      sprite: "rocky"
    },

    glowBug: {
      id: "glowBug",
      name: "ヒカリムシ",
      family: "insectKind",
      element: "light",
      resistances: { light: 3, dark: -2 },
      immunities: [],
      maxLevel: 30,
      growthRate: { hp: 0.13, attack: 0.10, defense: 0.16, speed: 0.18, pp: 0.15 },
      description: "尾を光らせて飛ぶ虫。暗い坑道では道しるべにもなる。",
      baseHp: 17,
      baseAttack: 6,
      baseDefense: 3,
      baseSpeed: 8,
      basePp: 5,
      scoutRate: 0.35,
      spawnRate: 0.7,
      learnset: [
        { level: 1, skill: "tackle" },
        { level: 4, skill: "glimmer" }
      ],
      evolvesTo: null,
      abilities: ["glowing"],
      expReward: 14,
      goldReward: 7,
      drops: [
        { item: "glowDust", rate: 0.1667, min: 1, max: 1 }
      ],
      sprite: "glowBug"
    },

    sporin: {
      id: "sporin",
      name: "キノコン",
      family: "plantKind",
      element: "dark",
      resistances: { earth: 2, dark: 1 },
      immunities: [],
      maxLevel: 30,
      growthRate: { hp: 0.16, attack: 0.17, defense: 0.14, speed: 0.10, pp: 0.13 },
      description: "坑道の湿った隅に生えるキノコの魔物。近づくと胞子を撒き散らす。",
      baseHp: 24,
      baseAttack: 9,
      baseDefense: 6,
      baseSpeed: 5,
      basePp: 6,
      scoutRate: 0.25,
      spawnRate: 0.6,
      learnset: [
        { level: 1, skill: "tackle" },
        { level: 5, skill: "darkSpore" }
      ],
      evolvesTo: null,
      abilities: ["wildInstinct"],
      expReward: 17,
      goldReward: 9,
      drops: [
        { item: "herb", rate: 0.10, min: 1, max: 1 }
      ],
      sprite: "sporin"
    },

    // ボス用の種族。通常のモンスターと同じ形式なので、
    // 出現テーブル(dungeons.js)に入れれば通常敵としても使える。
    mossGolem: {
      id: "mossGolem",
      name: "モスゴーレム",
      family: "constructKind",
      element: "earth",
      // 全身が苔に覆われているぶん、火と光に弱い
      resistances: { earth: 3, water: 1, fire: -2, light: -2 },
      immunities: [],
      maxLevel: 50,
      growthRate: 0.15,
      description: "苔に覆われた石の巨人。坑道の奥で、長いあいだ眠っていた。",
      baseHp: 50,
      baseAttack: 14,
      baseDefense: 14,
      baseSpeed: 4,
      basePp: 4,
      scoutRate: 0.03,
      spawnRate: 0,      // 通常のエンカウントでは出ない
      learnset: [
        { level: 1, skill: "tackle" },
        { level: 5, skill: "rockThrow" }
      ],
      evolvesTo: null,
      abilities: ["thickSkin"],
      expReward: 100,
      goldReward: 60,
      drops: [
        { item: "mossyCore", rate: 1.0, min: 1, max: 1 }
      ],
      sprite: "mossGolem"
    },

    kingSlime: {
      id: "kingSlime",
      name: "キングスライム",
      family: "slimeKind",
      element: "water",
      resistances: { water: 6, fire: -1, thunder: -3 },
      immunities: [],
      maxLevel: 60,
      growthRate: 0.10,
      basePp: 8,
      description: "スライムたちの王。大きな体と王冠が特徴。",
      baseHp: 60,
      baseAttack: 12,
      baseDefense: 8,
      baseSpeed: 5,
      scoutRate: 0.05,
      spawnRate: 0,      // 通常のエンカウントでは出ない
      learnset: [
        { level: 1, skill: "tackle" },
        { level: 6, skill: "bite" }
      ],
      evolvesTo: null,
      abilities: ["thickSkin"],
      expReward: 80,
      goldReward: 50,
      drops: [],
      sprite: "kingSlime"
    },
    flamin: {
      id: "flamin",
      name: "フレイミン",
      family: "beastKind",
      element: "fire",
      resistances: { fire: 8, water: -4 },
      immunities: [],
      maxLevel: 50,
      growthRate: { hp: 0.14, attack: 0.19, defense: 0.15, speed: 0.16, pp: 0.12 },
      description: "体に炎をまとう獣。気性が荒く捕まえにくい。",
      baseHp: 20,
      baseAttack: 8,
      baseDefense: 4,
      baseSpeed: 7,
      basePp: 5,
      scoutRate: 0.25,
      spawnRate: 0.5,
      learnset: [
        { level: 1, skill: "tackle" },
        { level: 3, skill: "ember" }
      ],
      evolvesTo: null,
      abilities: ["fireSoul"],
      expReward: 15,
      goldReward: 8,
      drops: [],
      sprite: "flamin"
    }
  };
})(window.MyGame);
