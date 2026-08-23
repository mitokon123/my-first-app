/**
 * items.js
 * アイテムの定義。
 *
 * id          : 識別子
 * name        : 表示名
 * category    : 分類id（categories.js の item を参照）
 * description : 図鑑・持ち物画面での説明文
 * maxStack    : 1種類あたりの所持上限
 * price       : ショップでの買値。0 にすると売り買いできない（重要アイテムなど）
 *   売値は data/shop.js の sellRate を掛けた額になる
 * effect      : 使ったときの効果（無い場合は使用できない）
 *   type  : "healHp" … HPを回復する
 *   value : 効果量
 * usableIn    : 使える場面。"home"（拠点の持ち物画面）/ "battle"（戦闘中）
 * equip       : 装備品ならここに効果を書く（持ち物・ドロップ・ショップは共通の仕組みで扱える）
 *   effects : 特性と同じ形式の配列（data/abilities.js の説明を参照）
 *     statMultiplier … ステータスに倍率
 *     statBonus      … ステータスに加算（装備でよく使う）
 *     damageDealt / damageTaken … 与える／受けるダメージに倍率
 *   身につけられる数は config.js の equipMax まで（現在は1つ）
 *
 * ★ 新しいアイテムの追加は、このファイルに1エントリ足すだけでよい。
 */
(function (NS) {
  "use strict";

  NS.rawData.items = {
    herb: {
      id: "herb",
      name: "薬草",
      category: "heal",
      description: "そのへんに生えている草。HPを少し回復する。",
      maxStack: 99,
      price: 20,
      effect: { type: "healHp", value: 20 },
      usableIn: ["home", "battle"]
    },

    potion: {
      id: "potion",
      name: "回復薬",
      category: "heal",
      description: "よく効く薬。HPをそれなりに回復する。",
      maxStack: 99,
      price: 60,
      effect: { type: "healHp", value: 50 },
      usableIn: ["home", "battle"]
    },

    elixir: {
      id: "elixir",
      name: "深淵の雫",
      category: "heal",
      description: "深き穴の底で採れる雫。HPを全回復する。",
      maxStack: 9,
      price: 300,
      effect: { type: "healHp", value: 9999 },
      usableIn: ["home", "battle"]
    },

    // --- 装備 ---

    stoneBand: {
      id: "stoneBand",
      name: "石の腕輪",
      category: "equipment",
      description: "ずしりと重い腕輪。守りが上がるが、少し鈍くなる。",
      maxStack: 9,
      price: 120,
      effect: null,
      usableIn: [],
      equip: {
        effects: [
          { type: "statBonus", stat: "defense", value: 3 },
          { type: "statMultiplier", stat: "speed", value: 0.8 }
        ]
      }
    },

    fangCharm: {
      id: "fangCharm",
      name: "牙のお守り",
      category: "equipment",
      description: "魔物の牙で作ったお守り。攻める力がわずかに増す。",
      maxStack: 9,
      price: 100,
      effect: null,
      usableIn: [],
      equip: {
        effects: [
          { type: "statBonus", stat: "attack", value: 2 }
        ]
      }
    },

    glowLantern: {
      id: "glowLantern",
      name: "光る提灯",
      category: "equipment",
      description: "鱗粉を詰めた小さな提灯。光をよく通す。",
      maxStack: 9,
      price: 150,
      effect: null,
      usableIn: [],
      equip: {
        effects: [
          { type: "damageDealt", value: 1.15, element: "light" },
          { type: "statBonus", stat: "pp", value: 1 }
        ]
      }
    },

    mossCharm: {
      id: "mossCharm",
      name: "苔の護符",
      category: "equipment",
      description: "坑道の主の核を埋め込んだ護符。体が丈夫になる。",
      maxStack: 9,
      price: 260,
      effect: null,
      usableIn: [],
      equip: {
        effects: [
          { type: "statBonus", stat: "hp", value: 8 },
          { type: "damageTaken", value: 0.9 }
        ]
      }
    },

    oreShard: {
      id: "oreShard",
      name: "鉱石のかけら",
      category: "material",
      description: "坑道で拾える鈍く光る石。何かの素材になりそうだ。",
      maxStack: 99,
      price: 16,
      effect: null,
      usableIn: []
    },

    glowDust: {
      id: "glowDust",
      name: "光る鱗粉",
      category: "material",
      description: "暗がりでほのかに光る粉。虫が落としていった。",
      maxStack: 99,
      price: 24,
      effect: null,
      usableIn: []
    },

    mossyCore: {
      id: "mossyCore",
      name: "苔むした核",
      category: "material",
      description: "坑道の主を動かしていた石の核。まだ温かい。",
      maxStack: 99,
      price: 100,
      effect: null,
      usableIn: []
    },

    slimeShard: {
      id: "slimeShard",
      name: "スライムのかけら",
      category: "material",
      description: "ぷるぷるした欠片。何かの素材になりそうだ。",
      maxStack: 99,
      price: 12,
      effect: null,
      usableIn: []
    },

    abyssFragment: {
      id: "abyssFragment",
      name: "深淵の欠片",
      category: "material",
      description: "深部でまれに見つかる黒い欠片。強い力を感じる。",
      maxStack: 99,
      price: 80,
      effect: null,
      usableIn: []
    },

    oldKey: {
      id: "oldKey",
      name: "古びた鍵",
      category: "key",
      description: "どこかの扉を開ける鍵らしい。使い道はまだ分からない。",
      maxStack: 1,
      price: 0,        // 0 なら売れない（重要アイテム）
      effect: null,
      usableIn: []
    }
  };
})(window.MyGame);
