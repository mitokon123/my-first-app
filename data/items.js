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
 *   type  : "healHp" … HPを回復する（value で効果量）
 *           "escape" … その場から拠点へ帰る（相手を選ばない）
 *   value : 効果量
 * usableIn    : 使える場面。
 *     "home"    … 拠点の持ち物画面
 *     "dungeon" … 探索中の持ち物画面（I キー）
 *     "battle"  … 戦闘中
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
      usableIn: ["home", "dungeon", "battle"]
    },

    potion: {
      id: "potion",
      name: "回復薬",
      category: "heal",
      description: "よく効く薬。HPをそれなりに回復する。",
      maxStack: 99,
      price: 50,
      effect: { type: "healHp", value: 50 },
      usableIn: ["home", "dungeon", "battle"]
    },

    elixir: {
      id: "elixir",
      name: "深淵の雫",
      category: "heal",
      description: "深き穴の底で採れる雫。HPを全回復する。",
      maxStack: 9,
      price: 300,
      effect: { type: "healHp", value: 9999 },
      usableIn: ["home", "dungeon", "battle"]
    },

    // 技を出すためのPPを戻す。回復薬（HP）に対する、もう一方の回復
    spiritBerry: {
      id: "spiritBerry",
      name: "精気の実",
      category: "heal",
      description: "淡く光る木の実。かじると、技を出す力が少し戻る。",
      maxStack: 9,
      price: 70,
      effect: { type: "healPp", value: 5 },
      usableIn: ["home", "dungeon", "battle"]
    },

    // --- 道具 ---

    // 帰り道の保険。持っていれば、階段まで戻らなくても引き返せる
    returnStone: {
      id: "returnStone",
      name: "帰還の石",
      category: "tool",
      description: "淡く光る石。砕くと拠点へ引き戻される。使うとなくなる。",
      maxStack: 9,
      price: 80,
      effect: { type: "escape" },
      usableIn: ["dungeon"]
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
      price: 70,
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
      price: 180,
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

    // 苔の護符が守りの装備なのに対して、こちらは攻めの装備。
    // 攻撃が大きく上がるかわりに、受けるダメージも少し増える
    blazeCharm: {
      id: "blazeCharm",
      name: "灼牙の戦刃",
      category: "equipment",
      description: "獣の牙を研ぎ上げた刃。持つ者の攻める力を大きく引き上げる。",
      maxStack: 9,
      price: 300,
      effect: null,
      usableIn: [],
      // 見返りの代償は付けていない。素材のほうが十分に重いため
      // （焼けた殻は、いちばん出にくいマグマガニから20%でしか落ちない）
      equip: {
        effects: [
          { type: "statBonus", stat: "attack", value: 11 }
        ]
      }
    },

    // ゲーム中で初めて素早さが上がる装備。石の腕輪（守り重視で鈍くなる）の対
    swiftPlume: {
      id: "swiftPlume",
      name: "風切りの羽根",
      category: "equipment",
      description: "灰の羽根を束ねた飾り。体が軽くなり、動きが速くなる。",
      maxStack: 9,
      price: 200,
      effect: null,
      usableIn: [],
      equip: {
        effects: [
          { type: "statBonus", stat: "speed", value: 7 }
        ]
      }
    },

    // 火が主役の場所に潜り直すときのための装備。
    // 灼熱の亀裂を周回する（主を仲間に誘うなど）ときに効く
    emberWard: {
      id: "emberWard",
      name: "炎よけの札",
      category: "equipment",
      description: "焼けた殻を貼り合わせた札。火に対する強さそのものが増す。",
      maxStack: 9,
      price: 150,
      effect: null,
      usableIn: [],
      // 倍率ではなく「耐性の数値」を上げる。
      // 元から火に強い仲間はさらに強くなり、火が弱点の仲間は弱点が和らぐ
      equip: {
        effects: [
          { type: "resistBonus", element: "fire", value: 3 }
        ]
      }
    },

    // --- 静寂の深層で作る装備 ---

    // 炎よけの札（火）の対。深層は闇の技が多いので、ここでは闇を防ぐ
    duskWard: {
      id: "duskWard",
      name: "宵よけの札",
      category: "equipment",
      description: "宵の露を染み込ませた札。闇に対する強さそのものが増す。",
      maxStack: 9,
      price: 170,
      effect: null,
      usableIn: [],
      equip: {
        effects: [
          { type: "resistBonus", element: "dark", value: 3 }
        ]
      }
    },

    // ゲーム中で初めて、技を出す回数そのものを増やす装備。
    // 加算ではなく倍率にしてある。加算だと元のPPが少ない仲間ほど得をして、
    // 重い技を抱える仲間には効きにくい（狙いと逆）ため
    stormVeil: {
      id: "stormVeil",
      name: "雷光の羽衣",
      category: "equipment",
      description: "ビリムシの翅を編んだ薄衣。まとうと体が軽く、力の巡りが速くなる。",
      maxStack: 9,
      price: 240,
      effect: null,
      usableIn: [],
      equip: {
        effects: [
          { type: "statMultiplier", stat: "pp", value: 1.25 },
          { type: "statBonus", stat: "speed", value: 4 }
        ]
      }
    },

    // 苔の護符（HP+8 / 被ダメ0.9）の上位。今のところ最も硬くなる装備
    dragonGuard: {
      id: "dragonGuard",
      name: "竜鱗の護",
      category: "equipment",
      description: "ヨミリュウの鱗を綴じ合わせた守り。並の一撃では傷ひとつ付かない。",
      maxStack: 9,
      price: 420,
      effect: null,
      usableIn: [],
      equip: {
        effects: [
          { type: "statBonus", stat: "hp", value: 15 },
          { type: "damageTaken", value: 0.85 }
        ]
      }
    },

    // 深淵の王を倒さないと作れない、今のところ最後の装備。
    // 苔の護符＝守り、灼牙の戦刃＝攻め、に対して「どちらも少しずつ」の形にしてある
    crownCircle: {
      id: "crownCircle",
      name: "王冠の輪",
      category: "equipment",
      description: "王の冠を打ち直した輪。身につけた者の全てをわずかに押し上げる。",
      maxStack: 9,
      price: 500,
      effect: null,
      usableIn: [],
      equip: {
        effects: [
          { type: "statBonus", stat: "hp", value: 8 },
          { type: "statBonus", stat: "attack", value: 5 },
          { type: "statBonus", stat: "defense", value: 5 },
          { type: "statBonus", stat: "speed", value: 3 }
        ]
      }
    },

    /**
     * --- 倒してしか手に入らない装備 ---
     *
     * ショップにも工房にも並べない。特定のモンスターが低確率で落とすだけなので、
     * 「あの相手を狩りに行く」という理由になる。
     * どれも買える装備の完全上位にはせず、方向が違うものにしてある。
     */

    stoneMail: {
      id: "stoneMail",
      name: "岩鎧の欠片",
      category: "equipment",
      description: "イワゴローの体の一部。抱えていると重いが、驚くほど頑丈だ。",
      maxStack: 9,
      price: 160,
      effect: null,
      usableIn: [],
      // 石の腕輪（防+3 / 速×0.8）より硬く、鈍さは少しましになっている
      equip: {
        effects: [
          { type: "statBonus", stat: "defense", value: 5 },
          { type: "statMultiplier", stat: "speed", value: 0.85 }
        ]
      }
    },

    windCrest: {
      id: "windCrest",
      name: "風乗りの羽飾り",
      category: "equipment",
      description: "ハイバネの風切り羽を挿した飾り。身につけると足が軽くなる。",
      maxStack: 9,
      price: 220,
      effect: null,
      usableIn: [],
      // ゲーム中で初めての風属性の装備。風切りの羽根（速+7）より遅いが、風の技が伸びる
      equip: {
        effects: [
          { type: "statBonus", stat: "speed", value: 4 },
          { type: "damageDealt", value: 1.20, element: "wind" }
        ]
      }
    },

    chargedCore: {
      id: "chargedCore",
      name: "帯電の芯",
      category: "equipment",
      description: "ビリムシの体内で電気をためていた芯。握ると指先がしびれる。",
      maxStack: 9,
      price: 280,
      effect: null,
      usableIn: [],
      // 雷の使い手はビリムシだけなので、これは実質ビリムシ専用の装備になる
      equip: {
        effects: [
          { type: "damageDealt", value: 1.20, element: "thunder" },
          { type: "statBonus", stat: "pp", value: 2 }
        ]
      }
    },

    fangRing: {
      id: "fangRing",
      name: "竜牙の指輪",
      category: "equipment",
      description: "ヨミリュウの牙を削って作られた指輪。持つ者に闇を纏わせる。",
      maxStack: 9,
      price: 380,
      effect: null,
      usableIn: [],
      // 灼牙の戦刃（攻+11）より攻撃は低いが、闇の技を使う仲間なら上回る
      equip: {
        effects: [
          { type: "statBonus", stat: "attack", value: 8 },
          { type: "damageDealt", value: 1.15, element: "dark" }
        ]
      }
    },

    oreShard: {
      id: "oreShard",
      name: "鉱石のかけら",
      category: "material",
      description: "坑道で拾える鈍く光る石。何かの素材になりそうだ。",
      maxStack: 99,
      price: 25,
      effect: null,
      usableIn: []
    },

    glowDust: {
      id: "glowDust",
      name: "光る鱗粉",
      category: "material",
      description: "暗がりでほのかに光る粉。虫が落としていった。",
      maxStack: 99,
      price: 50,
      effect: null,
      usableIn: []
    },

    // --- 灼熱の亀裂の素材 ---

    blazingFang: {
      id: "blazingFang",
      name: "灼熱の牙",
      category: "material",
      description: "灼熱の獣の牙。折れてなお、芯が赤く灯っている。",
      maxStack: 99,
      price: 200,
      effect: null,
      usableIn: []
    },

    emberAsh: {
      id: "emberAsh",
      name: "燃え殻",
      category: "material",
      description: "スミビが落としていった燃えかす。まだほのかに温かい。",
      maxStack: 99,
      price: 18,
      effect: null,
      usableIn: []
    },

    ashFeather: {
      id: "ashFeather",
      name: "灰の羽根",
      category: "material",
      description: "灰をまとった軽い羽根。手に取ると、そのまま風に乗って飛んでいきそうだ。",
      maxStack: 99,
      price: 45,
      effect: null,
      usableIn: []
    },

    scorchedShell: {
      id: "scorchedShell",
      name: "焼けた殻",
      category: "material",
      description: "マグマの熱で焼き締まった殻のかけら。火をよく弾く。",
      maxStack: 99,
      price: 60,
      effect: null,
      usableIn: []
    },

    // --- 静寂の深層の素材 ---

    duskDew: {
      id: "duskDew",
      name: "宵の露",
      category: "material",
      description: "ヨドミが残していった黒い雫。触れるとひやりと重い。",
      maxStack: 99,
      price: 22,
      effect: null,
      usableIn: []
    },

    crownShard: {
      id: "crownShard",
      name: "王冠のかけら",
      category: "material",
      description: "深淵の王がかぶっていた冠のかけら。芯に澄んだ水を宿している。",
      maxStack: 99,
      price: 260,
      effect: null,
      usableIn: []
    },

    dragonScale: {
      id: "dragonScale",
      name: "竜の鱗",
      category: "material",
      description: "ヨミリュウの鱗。光にかざしても、向こう側が透けることはない。",
      maxStack: 99,
      price: 120,
      effect: null,
      usableIn: []
    },

    stormWing: {
      id: "stormWing",
      name: "雷光の翅",
      category: "material",
      description: "ビリムシの翅。ちぎれてもなお、指先に軽くしびれを残す。",
      maxStack: 99,
      price: 70,
      effect: null,
      usableIn: []
    },

    twistedVine: {
      id: "twistedVine",
      name: "ねじれ蔦",
      category: "material",
      description: "カゲヅタの蔦を切り取ったもの。乾いてもまだ何かに絡みつこうとする。",
      maxStack: 99,
      price: 45,
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
