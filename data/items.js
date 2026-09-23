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
 *   slot    : 枠。"weapon"（武器）/ "armor"（防具）/ "accessory"（アクセサリー）
 *             枠の数は config.js の equipSlots（武器1・防具1・アクセサリー2）。
 *             書かなければアクセサリー扱い
 *   effects : 特性と同じ形式の配列（data/abilities.js の説明を参照）
 *     statMultiplier … ステータスに倍率
 *     statBonus      … ステータスに加算（装備でよく使う）
 *     damageDealt / damageTaken … 与える／受けるダメージに倍率
 *
 * ★ 数値は「4枠を同時に着ける」前提で決めてある（α-7 で1枠→4枠にしたときに下げた）。
 *   statBonus はレベルで増えないので、序盤ほど効きが大きい。
 *   攻撃の加算は 武器＋アクセサリー2つ で足し合わさることを忘れないこと。
 *   同じ装備は2つ着けられない（Game.equipItem）。
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

    /**
     * 回復薬（50G / 50回復）の上位。毒沼をクリアすると店に並ぶ。
     *
     * ★ 1回復あたりの値段は回復薬より高い（1G → 2.5G）。
     *   それでも要るのは、**1ターンで100戻せる**から。
     *   回復薬2本と同じ量を、半分の手数で入れられることに払う値段。
     */
    elixir: {
      id: "elixir",
      name: "深淵の雫",
      category: "heal",
      description: "深き穴の底で採れる雫。HPを大きく回復する。",
      maxStack: 9,
      price: 250,
      effect: { type: "healHp", value: 100 },
      usableIn: ["home", "dungeon", "battle"]
    },

    /**
     * 毒を治す。
     *
     * ★ 毒は戦闘が終わっても消えず、ダンジョンを歩くあいだも5歩ごとに削ってくる。
     *   拠点へ帰れば消えるので、これは「帰るまで持たせる」ための薬。
     *   帰還の石（80G）より安くしてあるのは、
     *   「毒を治す」と「引き返す」が同じ値段だと、常に引き返すほうが得になるため。
     *
     * ★ 治せる状態異常は effect.statuses で決める。
     *   麻痺・眠り・盲目・呪いの薬は、それらを実際に出すステージ5以降で足す。
     *   すべてを治す万能薬を作るときは statuses を書かなければよい
     *   （data/statuses.js の curable: true が対象になる）。
     */
    antidote: {
      id: "antidote",
      name: "解毒草",
      category: "heal",
      description: "苦い葉。噛むと毒が抜ける。",
      maxStack: 99,
      price: 40,
      effect: { type: "cureStatus", statuses: ["poison"] },
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

    /**
     * --- 武器 ---
     * 攻める力の中心。攻撃の加算はここに集め、アクセサリーの加算は小さめにしてある。
     *   魔物の牙(+2) → 燃え殻の剣(+4・火) → 灼牙の戦刃(+10) → 深淵の牙(+7・速×1.1) → 沼骨の槍(+7・闇)
     */

    // 最初から買える武器。ショップに並ぶ
    fangCharm: {
      id: "fangCharm",
      name: "魔物の牙",
      category: "equipment",
      description: "魔物の牙を握りに据えた小さな刃。攻める力がわずかに増す。",
      maxStack: 9,
      price: 70,
      effect: null,
      usableIn: [],
      equip: {
        slot: "weapon",
        effects: [
          { type: "statBonus", stat: "attack", value: 2 }
        ]
      }
    },

    // 亀裂の素材で作る武器。火の技を使う仲間（フレイミン・スミビ）が持つと伸びる
    emberBlade: {
      id: "emberBlade",
      name: "燃え殻の剣",
      category: "equipment",
      description: "燃え殻を鍛え直した剣。振るうと刃先に火が宿る。",
      maxStack: 9,
      price: 160,
      effect: null,
      usableIn: [],
      equip: {
        slot: "weapon",
        effects: [
          { type: "statBonus", stat: "attack", value: 4 },
          { type: "damageDealt", value: 1.10, element: "fire" }
        ]
      }
    },

    // 灼熱の獣を倒さないと作れない。攻撃の加算では最大
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
        slot: "weapon",
        effects: [
          { type: "statBonus", stat: "attack", value: 10 }
        ]
      }
    },

    // 深層の素材で作る武器。攻撃は戦刃に届かないが、速さが伸びる（加算ではなく倍率）
    abyssFang: {
      id: "abyssFang",
      name: "深淵の牙",
      category: "equipment",
      description: "深淵の欠片を牙の形に削り出した刃。軽く、振りが速い。",
      maxStack: 9,
      price: 320,
      effect: null,
      usableIn: [],
      equip: {
        slot: "weapon",
        effects: [
          { type: "statBonus", stat: "attack", value: 7 },
          { type: "statMultiplier", stat: "speed", value: 1.1 }
        ]
      }
    },

    // 毒沼の素材で作る武器。闇の技を使う仲間（ヌマボネ・ヨドミ）向け
    marshSpear: {
      id: "marshSpear",
      name: "沼骨の槍",
      category: "equipment",
      description: "錆びた骨を束ねて穂先にした槍。突くたびに闇がにじむ。",
      maxStack: 9,
      price: 360,
      effect: null,
      usableIn: [],
      equip: {
        slot: "weapon",
        effects: [
          { type: "statBonus", stat: "attack", value: 7 },
          { type: "damageDealt", value: 1.10, element: "dark" }
        ]
      }
    },

    /**
     * --- 防具 ---
     * 防御を上げるのが役目。
     *   石の帽子(防+4) → 岩鎧の欠片(防+5) → 苔の外套(防+3/HP+10)
     *   → 雷光の羽衣(防+5/PP×1.2/雷+2) → 泥重の甲(防+12/地+3) → 黄泉鱗の鎧(防+17/闇+2)
     *
     * ★ 「受けるダメージを下げる」（damageTaken）効果は強すぎるので、防具には入れない。
     *   いまこれを持つのは毒沼の冠（×0.95）だけ。
     * ★ 素早さを下げる代償も入れない。鈍くする効果は装備から全部外してある
     *   （残っている statMultiplier の速さは、上げる側の深淵の牙 ×1.1 だけ）。
     */

    stoneBand: {
      id: "stoneBand",
      name: "石の帽子",
      category: "equipment",
      description: "ずしりと重い石の帽子。かぶると守りが上がる。",
      maxStack: 9,
      price: 120,
      effect: null,
      usableIn: [],
      equip: {
        slot: "armor",
        effects: [
          { type: "statBonus", stat: "defense", value: 4 }
        ]
      }
    },

    // 坑道の主の核で作る。石の帽子と違って鈍くならず、HPも伸びる「軽い防具」
    mossCharm: {
      id: "mossCharm",
      name: "苔の外套",
      category: "equipment",
      description: "坑道の主の核を縫い込んだ外套。体が丈夫になる。",
      maxStack: 9,
      price: 260,
      effect: null,
      usableIn: [],
      equip: {
        slot: "armor",
        effects: [
          { type: "statBonus", stat: "defense", value: 3 },
          { type: "statBonus", stat: "hp", value: 10 }
        ]
      }
    },

    /**
     * --- アクセサリー ---
     * 2つ着けられる。属性・耐性・速さなど、方向を足す装備。
     * ステータスの加算は武器・防具より小さくしてある（2つ重なるため）。
     */

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
        slot: "accessory",
        effects: [
          { type: "damageDealt", value: 1.15, element: "light" },
          { type: "statBonus", stat: "pp", value: 1 }
        ]
      }
    },

    // ゲーム中で初めて素早さが上がる装備。守りに寄せる石の帽子の対
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
        slot: "accessory",
        effects: [
          { type: "statBonus", stat: "speed", value: 5 }
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
        slot: "accessory",
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
        slot: "accessory",
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
      description: "ビリムシの翅を編んだ薄衣。まとうと力の巡りが速くなり、雷を弾く。",
      maxStack: 9,
      price: 240,
      effect: null,
      usableIn: [],
      // 技を撃つ回数を増やす唯一の防具。雷への耐性も付く
      equip: {
        slot: "armor",
        effects: [
          { type: "statMultiplier", stat: "pp", value: 1.2 },
          { type: "statBonus", stat: "defense", value: 5 },
          { type: "resistBonus", element: "thunder", value: 2 }
        ]
      }
    },

    // 防具の頂点。泥重の甲（防+12／速×0.85）より硬く、鈍くもならない。
    // そのぶん素材が重い（ヨミリュウを倒さないと作れない）
    dragonGuard: {
      id: "dragonGuard",
      name: "黄泉鱗の鎧",
      category: "equipment",
      description: "ヨミリュウの鱗を綴じ合わせた鎧。並の一撃では傷ひとつ付かない。",
      maxStack: 9,
      price: 420,
      effect: null,
      usableIn: [],
      equip: {
        slot: "armor",
        effects: [
          { type: "statBonus", stat: "defense", value: 17 },
          { type: "resistBonus", element: "dark", value: 2 }
        ]
      }
    },

    // 深淵の王を倒さないと作れない。
    // 苔の外套＝守り、灼牙の戦刃＝攻め、に対して「どちらも少しずつ」の形にしてある
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
        slot: "accessory",
        effects: [
          { type: "statBonus", stat: "hp", value: 5 },
          { type: "statBonus", stat: "attack", value: 3 },
          { type: "statBonus", stat: "defense", value: 3 },
          { type: "statBonus", stat: "speed", value: 2 }
        ]
      }
    },

    /**
     * --- 腐食の毒沼で作れる装備 ---
     *
     * ★ ゲーム中で初めて「状態異常への耐性」を上げる装備。
     *   書き方は属性の耐性（炎よけの札）と同じ resistBonus で、
     *   element のかわりに status を書く。
     *   element と status は混ざらない（EffectSystem.getResistBonus を参照）。
     */

    // 毒沼の答え。毒耐性 +7 は「通る確率が3割になる」という重さ。
    // 沼を歩くあいだの削りも、主のどくのいきも、これ1つでほぼ止まる
    venomWard: {
      id: "venomWard",
      name: "毒よけの護符",
      category: "equipment",
      description: "毒の針をより合わせた護符。毒そのものを寄せつけなくなる。",
      maxStack: 9,
      price: 200,
      effect: null,
      usableIn: [],
      equip: {
        slot: "accessory",
        effects: [
          { type: "resistBonus", status: "poison", value: 7 }
        ]
      }
    },

    // 泥甲羅と骨で組んだ重い鎧。重いが速さは落ちない。
    // 黄泉鱗の鎧（防+17 / 闇耐性+2）より防御は低いかわりに、地への耐性が厚い
    mireArmor: {
      id: "mireArmor",
      name: "泥重の甲",
      category: "equipment",
      description: "泥を吸った甲羅を骨で綴じた鎧。重いが、並の攻撃はまるで通らない。",
      maxStack: 9,
      price: 260,
      effect: null,
      usableIn: [],
      equip: {
        slot: "armor",
        effects: [
          { type: "statBonus", stat: "defense", value: 12 },
          { type: "resistBonus", element: "earth", value: 3 }
        ]
      }
    },

    // 沼の主を倒さないと作れない。毒を「受けない」のではなく「返す」方向。
    // 王冠の輪（全部わずかに上げる）に対して、こちらは尖らせてある
    venomCrown: {
      id: "venomCrown",
      name: "毒沼の冠",
      category: "equipment",
      description: "主の毒嚢を包んで戴く冠。毒を宿したまま、その力だけを借りる。",
      maxStack: 9,
      price: 540,
      effect: null,
      usableIn: [],
      equip: {
        slot: "accessory",
        effects: [
          { type: "resistBonus", status: "poison", value: 10 },
          { type: "statBonus", stat: "attack", value: 5 },
          { type: "damageTaken", value: 0.95 }
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
      // 石の帽子（防+4）より硬い。買えないぶんの取り柄がこの1点
      equip: {
        slot: "armor",
        effects: [
          { type: "statBonus", stat: "defense", value: 5 }
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
      // ゲーム中で初めての風属性の装備。速さは風切りの羽根と同じで、風の技も伸びる
      equip: {
        slot: "accessory",
        effects: [
          { type: "statBonus", stat: "speed", value: 5 },
          { type: "damageDealt", value: 1.10, element: "wind" }
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
        slot: "accessory",
        effects: [
          { type: "damageDealt", value: 1.10, element: "thunder" },
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
      // アクセサリーなので攻撃の加算は控えめ。闇の技を使う仲間なら武器と重ねて伸びる
      equip: {
        slot: "accessory",
        effects: [
          { type: "statBonus", stat: "attack", value: 4 },
          { type: "damageDealt", value: 1.15, element: "dark" }
        ]
      }
    },

    /**
     * ヌマボネが落とす。ゲーム中で初めての即死耐性の装備。
     *
     * ★ 即死は「最後の1体でも容赦なく効く」ようにしてある（守りを入れていない）。
     *   だからこそ備える手段が要る、という設計だったので、その答えがこれ。
     *   +7 は通る確率が3割になる重さ。種族の耐性と足せば10（完全無効）に届く。
     *
     * ★ 落とす相手が「もう死んでいる骨」なのは意図してある。
     *   ヌマボネ自身が即死耐性10（完全に効かない）を持っているので、
     *   その骨を持ち歩けば同じ守りが得られる、という筋になる。
     */
    boneCharm: {
      id: "boneCharm",
      name: "髑髏の護符",
      category: "equipment",
      description: "ヌマボネの頭骨を削って作った護符。死そのものを一度だけ弾く。",
      maxStack: 9,
      price: 400,
      effect: null,
      usableIn: [],
      equip: {
        slot: "accessory",
        effects: [
          { type: "resistBonus", status: "instantDeath", value: 7 },
          { type: "statBonus", stat: "hp", value: 9 }
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
      name: "黄泉竜の鱗",
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

    // --- 腐食の毒沼の素材 ---
    // 値段は深層の素材（22〜120G）より一段上に置いてある

    venomStinger: {
      id: "venomStinger",
      name: "毒の針",
      category: "material",
      description: "ドクバチの針。抜けても先から雫が落ちつづける。",
      maxStack: 99,
      price: 35,
      effect: null,
      usableIn: []
    },

    muddyShell: {
      id: "muddyShell",
      name: "泥甲羅",
      category: "material",
      description: "ドロガメの甲羅のかけら。沼の泥が染み込んで、もう洗っても落ちない。",
      maxStack: 99,
      price: 60,
      effect: null,
      usableIn: []
    },

    rustedBone: {
      id: "rustedBone",
      name: "錆びた骨",
      category: "material",
      description: "沼に沈んでいた骨。長く浸かっていたせいで、赤茶けて脆い。",
      maxStack: 99,
      price: 50,
      effect: null,
      usableIn: []
    },

    // 主のドロップ。他の主の素材と同じく、必ず1つ落ちる
    venomSac: {
      id: "venomSac",
      name: "毒嚢",
      category: "material",
      description: "ヌシガエルの体内にあった袋。この沼の毒は、すべてここから出ていた。",
      maxStack: 99,
      price: 280,
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
