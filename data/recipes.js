/**
 * recipes.js
 * 工房で作れるものの一覧（レシピ）。
 *
 * id         : 識別子
 * result     : 作れるもの { item, count }（アイテムid と個数）
 * materials  : 必要な素材 [{ item, count }]
 * gold       : 作るのに必要なゴールド。書かなければ無料（素材だけで作れる）
 * unlockedBy : このダンジョンをクリアするまで並ばない（省略で最初から作れる）
 * order      : 一覧での並び順（小さいほど先）
 *
 * ★ 作れるものを増やすときは、このファイルに1エントリ足すだけでよい。
 *   装備もアイテムの一種なので、回復薬と同じ書き方で作れる。
 */
(function (NS) {
  "use strict";

  NS.rawData.recipes = {
    potion: {
      id: "potion",
      order: 1,
      result: { item: "potion", count: 1 },
      materials: [ { item: "herb", count: 2 } ]
    },

    stoneBand: {
      id: "stoneBand",
      order: 2,
      result: { item: "stoneBand", count: 1 },
      materials: [ { item: "oreShard", count: 3 } ]
    },

    glowLantern: {
      id: "glowLantern",
      order: 3,
      result: { item: "glowLantern", count: 1 },
      materials: [
        { item: "glowDust", count: 2 },
        { item: "oreShard", count: 2 }
      ],
      unlockedBy: "mossyMine"
    },

    // ボスの落とすものを使う。倒す理由になるレシピ
    mossCharm: {
      id: "mossCharm",
      order: 4,
      result: { item: "mossCharm", count: 1 },
      materials: [
        { item: "mossyCore", count: 1 },
        { item: "oreShard", count: 6 }
      ],
      unlockedBy: "mossyMine"
    },

    /**
     * --- 灼熱の亀裂で集まる素材で作るもの ---
     *
     * 解放は「亀裂をクリア」ではなく「坑道をクリア」。
     * 素材は亀裂に潜っている最中に集まるので、クリアを待たせると
     * 素材を持っているのに作れない時間ができてしまう。
     * 灼牙の戦刃だけは主を倒さないと素材がそろわないので、
     * 一覧に出しておいても先に作られる心配はない。
     */

    swiftPlume: {
      id: "swiftPlume",
      order: 5,
      result: { item: "swiftPlume", count: 1 },
      materials: [
        { item: "ashFeather", count: 3 },
        { item: "emberAsh", count: 3 }
      ],
      unlockedBy: "mossyMine"
    },

    emberWard: {
      id: "emberWard",
      order: 6,
      result: { item: "emberWard", count: 1 },
      materials: [
        { item: "emberAsh", count: 3 },
        { item: "ashFeather", count: 2 }
      ],
      unlockedBy: "mossyMine"
    },

    // 亀裂の素材で作る武器。火の技を使う仲間向け
    emberBlade: {
      id: "emberBlade",
      order: 7,
      result: { item: "emberBlade", count: 1 },
      materials: [
        { item: "emberAsh", count: 2 },
        { item: "scorchedShell", count: 1 },
        { item: "oreShard", count: 2 }
      ],
      unlockedBy: "mossyMine"
    },

    // 灼熱の獣の落とすものを使う。苔の外套（守り）に対する、攻めの装備
    blazeCharm: {
      id: "blazeCharm",
      order: 8,
      result: { item: "blazeCharm", count: 1 },
      materials: [
        { item: "blazingFang", count: 1 },
        { item: "scorchedShell", count: 2 },
        { item: "ashFeather", count: 1 }
      ],
      unlockedBy: "mossyMine"
    },

    /**
     * --- 静寂の深層で集まる素材で作るもの ---
     *
     * 亀裂のときと同じで、解放は「深層をクリア」ではなく「亀裂をクリア」。
     * 素材は深層に潜っている最中に集まるので、クリアを待たせると
     * 素材を持っているのに作れない時間ができてしまう。
     * 黄泉鱗の鎧だけはヨミリュウ（B4Fのみ・出現16%）を倒さないと素材がそろわないので、
     * 一覧に出しておいても先に作られる心配はない。
     */

    duskWard: {
      id: "duskWard",
      order: 9,
      result: { item: "duskWard", count: 1 },
      materials: [
        { item: "duskDew", count: 3 },
        { item: "slimeShard", count: 2 }
      ],
      unlockedBy: "scorchingFissure"
    },

    stormVeil: {
      id: "stormVeil",
      order: 10,
      result: { item: "stormVeil", count: 1 },
      materials: [
        { item: "stormWing", count: 2 },
        { item: "twistedVine", count: 2 }
      ],
      unlockedBy: "scorchingFissure"
    },

    // 深層の素材で作る武器。攻撃は戦刃に届かないが速さも付く
    abyssFang: {
      id: "abyssFang",
      order: 11,
      result: { item: "abyssFang", count: 1 },
      materials: [
        { item: "abyssFragment", count: 2 },
        { item: "slimeShard", count: 2 },
        { item: "duskDew", count: 1 }
      ],
      unlockedBy: "scorchingFissure"
    },

    // 黄泉竜の鱗を使う。ヨミリュウを狩る理由になるレシピ
    dragonGuard: {
      id: "dragonGuard",
      order: 12,
      result: { item: "dragonGuard", count: 1 },
      materials: [
        { item: "dragonScale", count: 1 },
        { item: "twistedVine", count: 3 },
        { item: "abyssFragment", count: 2 }
      ],
      unlockedBy: "scorchingFissure"
    },

    // 深層の主の落とすものを使う。ステージ3を締めくくる装備
    crownCircle: {
      id: "crownCircle",
      order: 13,
      result: { item: "crownCircle", count: 1 },
      materials: [
        { item: "crownShard", count: 1 },
        { item: "dragonScale", count: 1 },
        { item: "abyssFragment", count: 3 }
      ],
      unlockedBy: "scorchingFissure"
    },

    /**
     * --- 腐食の毒沼で集まる素材で作るもの ---
     *
     * 亀裂・深層と同じで、解放は「毒沼をクリア」ではなく「深層をクリア」。
     * 素材は沼に潜っている最中に集まるので、クリアを待たせると
     * 素材を持っているのに作れない時間ができてしまう。
     *
     * ★ 毒よけの護符は**主の素材を使わない**。
     *   毒沼は歩くだけで削られる場所なので、その答えは
     *   主を倒す前に手に入らないと意味がない。
     *   毒嚢を使う「毒沼の冠」だけが、主を倒してから作れる。
     */

    // 毒沼の答え。毒耐性 +7（通る確率が3割になる）
    venomWard: {
      id: "venomWard",
      order: 14,
      result: { item: "venomWard", count: 1 },
      materials: [
        { item: "venomStinger", count: 2 },
        { item: "muddyShell", count: 2 }
      ],
      unlockedBy: "silentDepths"
    },

    // 石の帽子（防+4）の上位。深層の素材で作る中堅の防具
    mireArmor: {
      id: "mireArmor",
      order: 15,
      result: { item: "mireArmor", count: 1 },
      materials: [
        { item: "muddyShell", count: 3 },
        { item: "rustedBone", count: 2 }
      ],
      unlockedBy: "silentDepths"
    },

    // 毒沼の素材で作る武器。闇の技を使う仲間向け
    marshSpear: {
      id: "marshSpear",
      order: 16,
      result: { item: "marshSpear", count: 1 },
      materials: [
        { item: "rustedBone", count: 2 },
        { item: "abyssFragment", count: 2 }
      ],
      unlockedBy: "silentDepths"
    },

    // 沼の主の毒嚢を使う。毒沼を抜けた証になる装備
    venomCrown: {
      id: "venomCrown",
      order: 17,
      result: { item: "venomCrown", count: 1 },
      materials: [
        { item: "venomSac", count: 1 },
        { item: "rustedBone", count: 2 },
        { item: "abyssFragment", count: 2 }
      ],
      unlockedBy: "silentDepths"
    }
  };
})(window.MyGame);
