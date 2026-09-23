/**
 * monsters.js
 * MonsterData（種族データ／図鑑データ）の定義。
 * 「実際に所持する個体」は MonsterInstance が別に持つ（ここは不変の種族情報）。
 *
 * family      : 分類id（categories.js の monster を参照）
 * element     : 属性id（elements.js を参照）。このモンスター自身の属性
 * resistances : 属性ごとの耐性（-5〜10）。書かない属性は 0（等倍）
 *   高いほどその属性のダメージを受けにくい。マイナスは受けるダメージが増える
 *   倍率 = 1 - 耐性 × 0.10（data/battle.js の resistance.resistStep）
 *   マイナスのときは 倍率 = 1 + |耐性| × 0.20（同 weaknessStep）。-5 で2倍
 * immunities  : 完全に無効化する属性idの配列（耐性の値にかかわらずダメージ0）
 *
 * ▼ statusResist : 状態異常ごとの耐性。**式は属性耐性とまったく同じ**
 *   （data/battle.js の resistance）。覚える仕組みを2つにしないため。
 *     10 … 完全に効かない    5 … 通る確率が半分    0 … そのまま
 *   足りないぶんは装備の resistBonus で足す（属性耐性と同じ書き方）。
 *
 *   ★ 全23種すべてに、7つの状態異常ぶんを書いてある。書き忘れを0にするため。
 *     0（＝そのまま通る）も使う。書き忘れとの区別は
 *     「全種そろっているか」を data の検査で見ればよい（早見表と突き合わせる）。
 *
 *   ★ 値は制作者が早見表（早見表/状態異常耐性.txt）で決めている。
 *     このファイルとその表は必ず同じ値にしておくこと。
 *
 *   ★ α-8 で大幅に下げた。**ほとんどの種族・ほとんどの状態異常は 0**。
 *     耐性が高いままだと、装備（毒よけの護符 +7 など）で足しても効きが変わらず、
 *     装備を着ける理由そのものが無くなるため。
 *     耐性を持たせるのは「その状態異常を受ける理由が無い」相手だけにする。
 *       例：コウモリ・ハイバネ 盲目10（目に頼らない）／ビリムシ 麻痺10（雷そのもの）
 *           イワゴロー・ヒビイワ 毒10（岩）／カゲヅタ 眠り10（植物）
 *           ヌマボネ 即死10（もう死んでいる）
 *
 *   ★ 主（ボス）として立ちはだかっているあいだは、
 *     data/battle.js の bossImmuneToStatus が 即死・封印・盲目 を無効にする（全ボス共通）。
 *     いまの主4体は data/bosses.js で毒も個別に無効にしてある。
 *     ここの値が効くのは、スカウトして仲間にしたあと。
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
 * evasion     : 攻撃をかわす確率（0〜1）。書かなければ 0
 *   命中率（技の当たりやすさ）とは別で、受け手が持つ「よけやすさ」。
 *   かわすと 0ダメージで MISS と出る。素早い種族にだけ持たせる
 * attackEffect: 通常攻撃の演出の型（data/effects.js の shapes のid）。
 *   書かなければ技側の effect（impact）。噛みつく相手は "slash"、
 *   硬い体でぶつかる相手は "shards" のように、見た目を種族ごとに変えられる
 * scoutRate   : スカウト成功率の基準値（0〜1）
 * spawnRate   : 出現の重み（相対値）
 * learnset    : 覚える技 [{ level, skill }]
 * evolvesTo   : 進化情報（例 { to:"kingSlime", level:12 }）未進化は null
 * abilities   : 特性id（abilities.js を参照）。
 *   1体が持てる数は config.js の abilityMax まで（現在は1つ）
 *
 * ▼ 基礎値の決め方 —— 上げすぎないこと
 *   ステータスは 基礎値 × (1 + (Lv-1) × 成長率) なので、基礎値の差はレベルで増幅される。
 *     基礎HP20 → Lv15で 62
 *     基礎HP30 → Lv15で 93
 *   つまり基礎値を10上げると、Lv15では31上がる（3.1倍になって効く）。
 *   「深いステージだから少し高めに」とやると、後半で手がつけられなくなる。
 *
 *   強いステージの相手は、基礎値ではなく次のどれかで格を出すこと。
 *     ・成長率の配分を尖らせる（速いか硬いか、どれか1つを伸ばす）
 *     ・出現レベルを上げる（data/dungeons.js の levelRange）
 *     ・技・特性・耐性で役割を作る
 *     ・ボスなら data/bosses.js の statMultiplier
 *
 *   目安：在来種の基礎値は HP30 / 攻10 / 防12 / 速12 を超えない。
 *   （現在の最大は HP30ミズダマリ・攻9キノコン&ビリムシ・防11ヒビイワ・速11ビリムシ）
 *
 * sizeScale   : 画面に出るときの大きさの倍率（省略すると 1.0）。
 *   竜のように「大きい相手」を、実際に大きく見せるためのもの。
 *   絵そのものの解像度（16×16 / 32×32 / 48×48）とは別で、
 *   解像度を上げても表示の大きさは変わらない。両方を組み合わせて使う。
 *
 *   ★ 絵は「下端をそろえて上へ伸びる」ように描かれる。
 *     大きくしても足元の位置は動かず、状態表示（名前・HP）にもかぶらない。
 *   ★ 上げすぎると枠からはみ出す。戦闘の枠は縦106pxなので、
 *     1.4（134px）くらいまでが目安。
 *
 * skillRate   : 敵として出たとき、通常攻撃ではなく技を選ぶ確率（0〜1）。
 *   書かなければ data/battle.js の enemyAi.skillRate（全体の既定）を使う。
 *   妨害役のように「技を出してこそ意味がある」相手だけ上げる
 * expReward   : 倒したときに得られる経験値（Lv1のときの量。レベルに応じて増える）
 * goldReward  : 倒したときに得られるゴールド（同上）
 * drops       : 倒したときに落とすアイテム（複数指定でき、それぞれ独立して判定する）
 *   item : アイテムid（items.js を参照）
 *   rate : 落とす確率（0〜1）
 *   min / max : 落とす個数の範囲（省略時は1個）
 * sprite      : スプライトid（data/sprites_〇〇.js を参照）
 * motion      : ふだんの絵の動かし方（data/motions.js のid）。省略すると動かない
 * motions     : 場面ごとの動き（data/motions.js のid）。書いた場面だけ動く
 *     attack  … 技を出すとき      hit     … 攻撃を受けたとき
 *     faint   … 倒れるとき        heal    … 回復したとき
 *     guard   … 防御しているあいだ（ずっと続く動き）
 *     levelUp … レベルが上がったとき
 *   省略した場面では動かない。同じidを別の種族で使い回してもよい
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
      resistances: { water: 5, thunder: -2, dark: -1 },
      immunities: [],
      // 体が液体なので毒は薄まり、神経が無いので麻痺・眠りも通りにくい。目も持たない
      statusResist: { poison: 8, paralysis: 5, sleep: 0, seal: 0,
                      blind: 0, curse: 0, instantDeath: 5 },
      // 上限99の3種のうちの1体。強さで抜けるのではなく、長く付き合える枠
      maxLevel: 99,
      growthRate: { hp: 0.16, attack: 0.16, defense: 0.18, speed: 0.13, pp: 0.10 },
      description: "最も基本的なモンスター。素直で扱いやすい。",
      baseHp: 22,
      baseAttack: 5,
      baseDefense: 4,
      baseSpeed: 3,
      basePp: 4,
      scoutRate: 0.45,
      evasion: 0,
      spawnRate: 1.0,
      learnset: [
        { level: 1, skill: "tackle" },
        // ゲーム中で唯一の水属性。灼熱の亀裂に入るころに間に合う位置に置いてある。
        // ステージ1のあいだは体当たりだけなので、そこの難易度は変わらない
        { level: 8, skill: "aqua" },
        // 最初の1体が、育てると回復役にもなる。
        // 深層（推奨Lv16）に入るより手前で覚えるので、潜る前に頼れる
        { level: 11, skill: "cure" }
      ],
      evolvesTo: null,
      abilities: ["tough"],
      expReward: 8,
      goldReward: 4,
      drops: [
        { item: "herb", rate: 0.12, min: 1, max: 1 }
      ],
      // コマ絵の見本。ふつうの姿を使い回すので、描き足したのは2枚だけ
      sprite: ["slimeStretch", "slime", "slimeStretch", "slimeSquash"],
      motion: "slimeIdle",
      // 場面ごとの動き（見本）。書かない種族はその場面で動かない
      motions: {
        attack:  "lunge",
        hit:     "recoil",
        faint:   "fall",
        heal:    "recover",
        guard:   "guard",
        levelUp: "cheerHop"
      }
    },
    batty: {
      id: "batty",
      name: "コウモリ",
      family: "beastKind",
      element: "dark",
      resistances: { dark: 3, earth: 3, fire: -2, thunder: -2 },
      immunities: [],
      // 超音波で「見て」いるので盲目がほとんど効かない。闇の眷属なので呪いにも強い
      statusResist: { poison: 0, paralysis: 0, sleep: 5, seal: 0,
                      blind: 10, curse: 0, instantDeath: 5 },
      // 上限99の3種のうちの1体。育て切ると素早さが全種で最も高くなる
      maxLevel: 99,
      // ステータスごとに成長率を変える例：素早さだけ伸びやすい
      growthRate: { hp: 0.12, attack: 0.18, defense: 0.14, speed: 0.18, pp: 0.12 },
      description: "暗がりを好む小さな獣。素早く飛び回る。",
      baseHp: 16,
      baseAttack: 8,
      baseDefense: 2,
      baseSpeed: 8,
      basePp: 4,
      // ひらひら飛ぶのでよくかわす
      evasion: 0.10,
      attackEffect: "slash",
      scoutRate: 0.35,
      spawnRate: 0.8,
      learnset: [
        { level: 1, skill: "tackle" },
        { level: 3, skill: "bite" },
        // 打たれ弱さ（防御2）を、自分で回復して補えるようにする
        { level: 9, skill: "drainBite" }
      ],
      evolvesTo: null,
      abilities: ["swiftFoot"],
      expReward: 8,
      goldReward: 5,
      drops: [],
      sprite: "batty",
      motion: "batFlutter",
      // 飛んでいるので、喜ぶときは跳ねずに一回転し、倒れるときは傾いて落ちる
      motions: { faint: "tumble", levelUp: "cheerSpin" }
    },
    // --- 苔むす坑道のモンスター ---

    mossRat: {
      id: "mossRat",
      name: "コケネズミ",
      family: "beastKind",
      element: "earth",
      resistances: { earth: 5, wind: -1, fire: -2 },
      immunities: [],
      // ただの獣なので、どれもあまり効かない。特性「ど根性」ぶん即死だけ少し高い
      statusResist: { poison: 0, paralysis: 2, sleep: 2, seal: 0,
                      blind: 0, curse: 0, instantDeath: 0 },
      maxLevel: 60,
      growthRate: { hp: 0.14, attack: 0.16, defense: 0.15, speed: 0.15, pp: 0.10 },
      description: "背中に苔を生やした小さなネズミ。坑道の壁を素早く走り回る。",
      baseHp: 17,
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
      expReward: 11,
      goldReward: 5,
      drops: [
        { item: "herb", rate: 0.14, min: 1, max: 1 }
      ],
      sprite: "mossRat",
      motion: "ratHop",
      motions: { faint: "fall" }
    },

    rocky: {
      id: "rocky",
      name: "イワゴロー",
      family: "constructKind",
      element: "earth",
      resistances: { earth: 4, water: -2 },
      immunities: [],
      // 岩なので毒がまったく通らない。技を組み立てる頭は無いので封印は半分効く
      statusResist: { poison: 10, paralysis: 0, sleep: 0, seal: 5,
                      blind: 0, curse: 0, instantDeath: 0 },
      maxLevel: 60,
      growthRate: { hp: 0.18, attack: 0.15, defense: 0.20, speed: 0.06, pp: 0.10 },
      description: "岩そのものが動き出したような魔物。硬いが、とにかく足が遅い。",
      baseHp: 25,
      baseAttack: 6,
      baseDefense: 9,
      baseSpeed: 2,
      basePp: 4,
      // 岩の体でぶつかるので、当たると砕けた音がする見た目にする
      attackEffect: "shards",
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
        { item: "oreShard", rate: 0.25, min: 1, max: 2 },
        // 買えない装備。イワゴローは坑道の6種のうちの1体なので、
        // 出現率で薄まるぶんを見込んで確率は高めにしてある
        { item: "stoneMail", rate: 0.19, min: 1, max: 1 }
      ],
      sprite: "rocky",
      motion: "rockIdle",
      // 岩なので、倒れるというより崩れる
      motions: { faint: "crumble" }
    },

    glowBug: {
      id: "glowBug",
      name: "ヒカリムシ",
      family: "insectKind",
      element: "light",
      // 闇はもともと -3 だった。深層のヨミリュウ（闇の範囲技持ち）への答えが
      // この1種しかいないのに、その息で一撃で落ちてしまうため -2 に緩めた
      resistances: { light: 7, dark: -2 },
      immunities: [],
      // 自ら光るので盲目が効かず、光は呪いを弾く。虫なので体そのものは脆い
      statusResist: { poison: 0, paralysis: 0, sleep: 0, seal: 5,
                      blind: 0, curse: 0, instantDeath: 5 },
      // 深層のヨミリュウへの答えを担うので、坑道の雑魚だが上限は高くしてある
      maxLevel: 80,
      growthRate: { hp: 0.14, attack: 0.16, defense: 0.16, speed: 0.18, pp: 0.15 },
      description: "尾を光らせて飛ぶ虫。暗い坑道では道しるべにもなる。",
      baseHp: 18,
      baseAttack: 8,
      baseDefense: 3,
      baseSpeed: 8,
      basePp: 6,
      // 小さく速く飛ぶのでかわしやすい
      evasion: 0.10,
      scoutRate: 0.35,
      spawnRate: 0.7,
      learnset: [
        { level: 1, skill: "tackle" },
        { level: 4, skill: "glimmer" },
        // 攻撃の伸びが低いので、技の威力で仕事をさせる。
        // 深層のヨミリュウ（闇に完全耐性・光が弱点）への答えがこれ
        { level: 13, skill: "shine" }
      ],
      evolvesTo: null,
      abilities: ["glowing"],
      expReward: 14,
      goldReward: 7,
      drops: [
        { item: "glowDust", rate: 0.25, min: 1, max: 1 }
      ],
      sprite: "glowBug",
      motion: "bugGlow",
      // 飛んでいるので落ちる
      motions: { faint: "tumble" }
    },

    sporin: {
      id: "sporin",
      name: "キノコン",
      family: "plantKind",
      element: "dark",
      resistances: { earth: 4, dark: 2, light: -1 },
      immunities: [],
      // 自分が闇の胞子（毒）を撒く側なので毒に強い。目を持たず、闇にも近い
      statusResist: { poison: 10, paralysis: 0, sleep: 0, seal: 0,
                      blind: 0, curse: 0, instantDeath: 3 },
      maxLevel: 70,
      growthRate: { hp: 0.15, attack: 0.16, defense: 0.14, speed: 0.12, pp: 0.14 },
      description: "坑道の湿った隅に生えるキノコの魔物。近づくと胞子を撒き散らす。",
      baseHp: 24,
      baseAttack: 9,
      baseDefense: 6,
      baseSpeed: 5,
      basePp: 5,
      scoutRate: 0.25,
      spawnRate: 0.6,
      learnset: [
        { level: 1, skill: "tackle" },
        { level: 5, skill: "darkSpore" }
      ],
      evolvesTo: null,
      abilities: ["wildInstinct"],
      expReward: 16,
      goldReward: 8,
      drops: [
        { item: "herb", rate: 0.15, min: 1, max: 1 }
      ],
      sprite: "sporin",
      motion: "sporeSway",
      // きのこなので、しぼむように崩れる
      motions: { faint: "crumble" }
    },

    // ボス用の種族。通常のモンスターと同じ形式なので、
    // 出現テーブル(dungeons.js)に入れれば通常敵としても使える。
    mossGolem: {
      id: "mossGolem",
      name: "モスゴーレム",
      family: "constructKind",
      element: "earth",
      // 全身が苔に覆われているぶん、火と光に弱い
      resistances: { earth: 5, water: 2, fire: -2, light: -2 },
      immunities: [],
      // 石の体なので毒・麻痺・眠りが通らない。主なので即死にも強い
      //   ※ 主として立ちはだかっているあいだは即死・封印・盲目が効かず（data/battle.js）、
      //     毒も bosses.js で無効にしてある。この値が効くのは、スカウトして仲間にしたあと
      statusResist: { poison: 8, paralysis: 7, sleep: 8, seal: 0,
                      blind: 7, curse: 0, instantDeath: 9 },
      maxLevel: 50,
      // 守りとHPが伸び、足は止まったまま。ヒビイワ（構造体の在来種）の上位版という形
      growthRate: { hp: 0.17, attack: 0.14, defense: 0.19, speed: 0.07, pp: 0.10 },
      description: "苔に覆われた石の巨人。坑道の奥で、長いあいだ眠っていた。",
      // 基礎値は「仲間にしたとき」の強さ。在来種の最強格（ヒビイワ 28/8/11/3）と
      // 並ぶ程度に抑えてある。主として立ちはだかるときの強さは
      // data/bosses.js の statMultiplier で足す
      baseHp: 30,
      baseAttack: 8,
      baseDefense: 11,
      baseSpeed: 3,
      basePp: 4,
      // ボスなので渋い。瀕死まで削って5%（満タンでは2%）
      scoutRate: 0.02,
      spawnRate: 0,      // 通常のエンカウントでは出ない
      learnset: [
        { level: 1, skill: "tackle" },
        { level: 5, skill: "rockThrow" }
      ],
      evolvesTo: null,
      abilities: ["thickSkin"],
      expReward: 90,
      goldReward: 55,
      drops: [
        { item: "mossyCore", rate: 1.0, min: 1, max: 1 }
      ],
      sprite: "mossGolem",
      // 主は雑魚より一回り大きく画面に出す。奥のステージほど大きくしてある
      // （坑道1.15 → 亀裂1.25 → 深層1.4）。表示だけで、ステータスには効かない
      sizeScale: 1.15,
      motion: "golemBreathe",
      motions: { faint: "crumble" }
    },

    // 灼熱の亀裂の主。フレイミンが雑魚として出るので、専用の種族を用意した
    magmaBeast: {
      id: "magmaBeast",
      name: "マグマウルフ",
      family: "beastKind",
      element: "fire",
      // 火は完全に無効（data/battle.js の immuneAt が10）。水は最大の弱点のまま
      resistances: { fire: 10, water: -4, wind: -1 },
      immunities: [],
      // 主なので即死に強い。獣なので目は効く
      statusResist: { poison: 0, paralysis: 10, sleep: 0, seal: 9,
                      blind: 9, curse: 0, instantDeath: 9 },
      maxLevel: 50,
      // 攻めと速さが伸び、守りが置いていかれる。育てるほど「殴られる前に殴る」形になる
      growthRate: { hp: 0.16, attack: 0.19, defense: 0.11, speed: 0.17, pp: 0.13 },
      description: "亀裂の底で眠っていた獣。たてがみが燃え、通る道すべてを焼いていく。",
      // 基礎値は「仲間にしたとき」の強さ。在来種より少し上、という程度に抑えてある。
      // 主として立ちはだかるときの強さは data/bosses.js の statMultiplier で足す
      baseHp: 35,
      baseAttack: 16,
      // 防御はダメージ式で「×0.25 を引く」形なので、上げすぎると誰も削れなくなる。
      // 補正込みで29（坑道の主と同じ）に収まる値にしてある
      baseDefense: 8,
      baseSpeed: 7,
      basePp: 6,
      // 牙で噛みつく
      attackEffect: "slash",
      scoutRate: 0.03,
      spawnRate: 0,      // 通常のエンカウントでは出ない
      learnset: [
        { level: 1, skill: "tackle" },
        { level: 4, skill: "bite" },
        { level: 8, skill: "ember" },
        // この獣だけが使う範囲技。仲間にすると、育てて初めて手に入る
        { level: 10, skill: "fireBreath" }
      ],
      evolvesTo: null,
      abilities: ["fireSoul"],
      expReward: 115,
      goldReward: 80,
      drops: [
        { item: "blazingFang", rate: 1.0, min: 1, max: 1 }
      ],
      sprite: "magmaBeast",
      sizeScale: 1.25,
      motion: "beastBreathe",
      // 炎なので、燃え尽きるように崩れる
      motions: { faint: "crumble" }
    },

    kingSlime: {
      id: "kingSlime",
      name: "キングスライム",
      family: "slimeKind",
      element: "water",
      resistances: { water: 9, thunder: -3, dark: -1 },
      immunities: [],
      // 最後の主。スライムの性質（液体・神経なし・目なし）に、王としての格が乗る
      statusResist: { poison: 10, paralysis: 10, sleep: 0, seal: 0,
                      blind: 5, curse: 2, instantDeath: 9 },
      // 王なので上限はいちばん高い。ヨミリュウ(75)より上に置いてある
      maxLevel: 85,
      // 王らしくHPと守りに寄せ、足は捨てる。
      // 立ちはだかるときの強さは data/bosses.js の statMultiplier で足す
      growthRate: { hp: 0.19, attack: 0.15, defense: 0.17, speed: 0.07, pp: 0.13 },
      basePp: 7,
      description: "スライムたちの王。大きな体と王冠が特徴。",
      // 基礎値は「仲間にしたとき」の強さ。在来種の目安（HP30/攻10/防12/速12）内に収めてある。
      // 以前は 60/12/8/5 だったので、仲間にするとLv1で在来種を大きく超えていた
      baseHp: 28,
      baseAttack: 10,
      baseDefense: 10,
      baseSpeed: 4,
      // 最後のボスなので、ゴーレムより少しだけ渋くない。瀕死で7.5%
      scoutRate: 0.03,
      spawnRate: 0,      // 通常のエンカウントでは出ない
      learnset: [
        { level: 1, skill: "tackle" },
        // 王だけが使う重い一撃。ローテーションの軸になる
        { level: 2, skill: "bodyPress" },
        { level: 6, skill: "bite" },
        // 水の王なので水も使う。ローテーションで撃つので、必ず覚えている必要がある
        { level: 8, skill: "aqua" }
      ],
      evolvesTo: null,
      abilities: ["thickSkin"],
      expReward: 80,
      goldReward: 50,
      // 他の2体の主と同じく、専用の素材を必ず落とす
      drops: [
        { item: "crownShard", rate: 1.0, min: 1, max: 1 }
      ],
      sprite: "kingSlime",
      // 最後の主なので、ヨミリュウ（1.35）より大きい
      sizeScale: 1.4,
      motion: "kingWobble",
      motions: { faint: "fall" }
    },
    // --- 灼熱の亀裂のモンスター ---

    ashWing: {
      id: "ashWing",
      name: "ハイバネ",
      family: "birdKind",
      element: "wind",
      // 空を行くので地の技が届きにくい。熱の中で暮らすぶん火にも強いが、
      // 濡れた羽と、雷を受け止める体の軽さが弱点
      resistances: { fire: 5, earth: 4, thunder: -2, water: -2 },
      immunities: [],
      // 体がひどく軽い鳥。空を見ているので盲目が効かないが、打たれ弱い
      statusResist: { poison: 0, paralysis: 0, sleep: 0, seal: 0,
                      blind: 10, curse: 0, instantDeath: 0 },
      maxLevel: 70,
      // 素早さだけ突出させる。そのぶん打たれ弱い
      growthRate: { hp: 0.12, attack: 0.18, defense: 0.11, speed: 0.20, pp: 0.13 },
      description: "灰をまとって舞う鳥。亀裂の熱に乗って昇っていく。体はひどく軽く、脆い。",
      baseHp: 14,
      baseAttack: 7,
      baseDefense: 3,
      baseSpeed: 10,
      basePp: 5,
      // いちばん速いので、いちばんよくかわす
      evasion: 0.10,
      attackEffect: "slash",
      scoutRate: 0.30,
      spawnRate: 0.8,
      learnset: [
        { level: 1, skill: "tackle" },
        // 出現レベルが4〜8なので、ほとんどの個体がウィンドを持って出てくる。
        // プレイヤーがこの場所で初めて風の技に出会う
        { level: 4, skill: "gust" }
      ],
      evolvesTo: null,
      abilities: ["swiftFoot"],
      expReward: 15,
      goldReward: 8,
      drops: [
        { item: "ashFeather", rate: 0.28, min: 1, max: 1 },
        // 買えない装備。ゲーム中で唯一、風の技が伸びる
        { item: "windCrest", rate: 0.13, min: 1, max: 1 }
      ],
      sprite: "ashWing",
      // 体がひどく軽いので、羽ばたきは速いが体は熱に乗ってゆっくり漂う
      motion: "ashDrift",
      motions: { faint: "tumble", levelUp: "cheerSpin" }
    },

    crackRock: {
      id: "crackRock",
      name: "ヒビイワ",
      family: "constructKind",
      element: "earth",
      // 熱で焼かれてひびだらけ。火は効きにくいが、石を打ちつけられると砕ける。
      // ゲーム中で初めての「地の弱点」を持つモンスター
      resistances: { fire: 8, earth: -3, water: -2 },
      immunities: [],
      // イワゴローと同じ岩なので、耐性もそろえてある
      statusResist: { poison: 10, paralysis: 0, sleep: 0, seal: 5,
                      blind: 0, curse: 0, instantDeath: 0 },
      maxLevel: 60,
      growthRate: { hp: 0.16, attack: 0.15, defense: 0.18, speed: 0.08, pp: 0.10 },
      description: "熱で焼けてひび割れた岩の魔物。守りは固いが、同じ石をぶつけられると脆い。",
      baseHp: 25,
      baseAttack: 8,
      baseDefense: 11,
      baseSpeed: 3,
      basePp: 4,
      attackEffect: "shards",
      scoutRate: 0.27,
      spawnRate: 0.6,
      learnset: [
        { level: 1, skill: "tackle" },
        { level: 5, skill: "rockThrow" }
      ],
      evolvesTo: null,
      abilities: ["brittleShell"],
      // 硬くて時間がかかるぶんゴールドは多いが、経験値は控えめ。
      // 「稼ぎ相手ではあるが、育成相手ではない」位置づけ
      expReward: 12,
      goldReward: 12,
      drops: [
        { item: "oreShard", rate: 0.28, min: 1, max: 2 }
      ],
      sprite: "crackRock",
      motion: "crackPulse",
      // 岩なので、倒れるというより崩れる
      motions: { faint: "crumble" }
    },

    magmaCrab: {
      id: "magmaCrab",
      name: "マグマガニ",
      family: "insectKind",
      element: "fire",
      // マグマの中で暮らすので火はほとんど効かない。水をかけられると固まる
      resistances: { fire: 9, water: -4, thunder: -1, light: -1 },
      immunities: [],
      // 硬い殻に覆われているので毒が回らない。封印と呪いは完全に弾く
      statusResist: { poison: 0, paralysis: 5, sleep: 5, seal: 0,
                      blind: 0, curse: 0, instantDeath: 0 },
      maxLevel: 65,
      growthRate: { hp: 0.18, attack: 0.16, defense: 0.15, speed: 0.10, pp: 0.12 },
      description: "マグマの中で暮らす大きなカニ。硬い殻をさらに固めて、じっと動かない。",
      baseHp: 22,
      baseAttack: 10,
      baseDefense: 10,
      baseSpeed: 4,
      basePp: 5,
      // 硬い爪で挟む
      attackEffect: "shards",
      scoutRate: 0.22,
      spawnRate: 0.5,
      learnset: [
        { level: 1, skill: "tackle" },
        // この場所で初めて「守りを固める敵」に出会う
        { level: 4, skill: "harden" },
        { level: 7, skill: "ember" }
      ],
      evolvesTo: null,
      abilities: ["thickSkin"],
      // 硬くて時間がかかるわりに実入りは薄い。稼ぎ相手はヒビイワのほう
      expReward: 20,
      goldReward: 3,
      // ゴールドが渋いぶん、素材で報われる
      drops: [
        { item: "scorchedShell", rate: 0.28, min: 1, max: 1 },
        { item: "oreShard", rate: 0.22, min: 1, max: 1 }
      ],
      sprite: "magmaCrab",
      motion: "crabIdle",
      // 殻なので、倒れるというより砕ける
      motions: { faint: "crumble" }
    },

    cinderling: {
      id: "cinderling",
      name: "スミビ",
      // ゲーム中で初めての魔族系（炭に火が宿ったもの）
      family: "demonKind",
      element: "fire",
      // 亀裂の在来種なので火には強いが、火が消える水にはとても弱い
      resistances: { fire: 6, water: -3, earth: -1 },
      immunities: [],
      // 燃えさしなので、どれもそこそこ通る。消されやすい（即死0）
      statusResist: { poison: 0, paralysis: 0, sleep: 0, seal: 0,
                      blind: 0, curse: 2, instantDeath: 0 },
      maxLevel: 50,
      growthRate: { hp: 0.13, attack: 0.16, defense: 0.14, speed: 0.16, pp: 0.11 },
      description: "燃えさしの炭が起き上がったもの。一体ずつは弱いが、群れで湧いてくる。",
      baseHp: 15,
      baseAttack: 7,
      baseDefense: 3,
      baseSpeed: 6,
      basePp: 4,
      // 小さくてちょろちょろしている
      evasion: 0.05,
      // 数が多く、いちばん仲間にしやすい
      scoutRate: 0.40,
      spawnRate: 1.1,
      learnset: [
        { level: 1, skill: "tackle" },
        { level: 3, skill: "ember" }
      ],
      evolvesTo: null,
      abilities: ["fireSoul"],
      expReward: 12,
      goldReward: 6,
      // いちばん多く出るので、いちばん安い素材を配る役
      drops: [
        { item: "emberAsh", rate: 0.32, min: 1, max: 2 }
      ],
      sprite: "cinderling",
      // 燃えさしの炭なので、火の勢いが安定せず小刻みに揺れる
      motion: "emberIdle",
      motions: { faint: "crumble" }
    },

    flamin: {
      id: "flamin",
      name: "フレイミン",
      family: "beastKind",
      element: "fire",
      resistances: { fire: 8, water: -3 },
      immunities: [],
      // 気性が荒く、しびれにくい。ただし目と呪いには無防備
      statusResist: { poison: 0, paralysis: 5, sleep: 0, seal: 0,
                      blind: 5, curse: 0, instantDeath: 5 },
      // 上限99の3種のうちの1体。序盤で捕まえても最後まで通用する
      maxLevel: 99,
      growthRate: { hp: 0.14, attack: 0.18, defense: 0.15, speed: 0.15, pp: 0.12 },
      description: "体に炎をまとう獣。気性が荒く捕まえにくい。",
      baseHp: 19,
      baseAttack: 8,
      baseDefense: 5,
      baseSpeed: 8,
      basePp: 5,
      evasion: 0.05,
      attackEffect: "slash",
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
      sprite: "flamin",
      // 気性が荒いので、落ち着かず細かく跳ねる
      motion: "flameHop",
      // 炎なので、燃え尽きるようにその場で小さくなる
      motions: { faint: "crumble" }
    },

    // --- 静寂の深層の在来種 ---

    // 深層の雑魚。スミビ（亀裂の雑魚）にあたる位置づけで、数で押してくる
    murkling: {
      id: "murkling",
      name: "ヨドミ",
      family: "demonKind",
      element: "dark",
      // 闇そのものなので光に灼かれる。
      // 深層の在来種は雷に弱くしてある（雷はまだ耐性持ちが0体で、誰にでも通る属性）
      resistances: { dark: 6, light: -3, thunder: -2 },
      immunities: [],
      // 澱みそのもの。目を持たず、闇に近いので呪いも効きにくい
      statusResist: { poison: 0, paralysis: 0, sleep: 2, seal: 0,
                      blind: 0, curse: 4, instantDeath: 0 },
      maxLevel: 60,
      growthRate: { hp: 0.15, attack: 0.15, defense: 0.13, speed: 0.13, pp: 0.11 },
      description: "底に溜まった闇が、ひとりでに形を持ったもの。一体では頼りないが、静かに数を増やす。",
      baseHp: 18,
      baseAttack: 8,
      baseDefense: 5,
      baseSpeed: 7,
      basePp: 4,
      // 数がいちばん多いので、この階でもっとも仲間にしやすい
      scoutRate: 0.38,
      spawnRate: 1.0,
      learnset: [
        { level: 1, skill: "tackle" },
        { level: 5, skill: "darkSpore" }
      ],
      evolvesTo: null,
      abilities: ["duskborn"],
      expReward: 17,
      goldReward: 5,
      // いちばん多く出るので、いちばん安い素材を配る役（スミビと同じ役回り）。
      // 深淵の欠片は宝箱でしか手に入らなかったので、こことヨミリュウにも持たせた
      drops: [
        { item: "duskDew", rate: 0.30, min: 1, max: 2 },
        { item: "abyssFragment", rate: 0.28, min: 1, max: 1 }
      ],
      sprite: "murkling",
      motion: "murkFloat",
      // 闇なので、崩れるというより沈んで消える
      motions: { faint: "fall" }
    },

    // 深層の妨害役。キノコン（坑道の闇・植物系）の深層版にあたる。
    // ゲーム中で初めて「相手を弱くする技」を使ってくる相手
    kageZuta: {
      id: "kageZuta",
      name: "カゲヅタ",
      family: "plantKind",
      element: "dark",
      // 植物なので火に灼かれる。ここまでに火のモンスターを育てていれば刺さる
      resistances: { dark: 5, earth: 3, fire: -4, light: -2, thunder: -1 },
      immunities: [],
      // 目を持たず、植物なので眠らない。ただし毒は素通りする
      statusResist: { poison: 0, paralysis: 0, sleep: 10, seal: 0,
                      blind: 7, curse: 0, instantDeath: 0 },
      maxLevel: 60,
      growthRate: { hp: 0.17, attack: 0.12, defense: 0.16, speed: 0.11, pp: 0.13 },
      description: "闇の底で根を張る蔦。獲物にからみついて、少しずつ力を吸い取る。",
      baseHp: 23,
      baseAttack: 5,
      baseDefense: 7,
      baseSpeed: 4,
      basePp: 6,
      // 妨害役なので、技を出してこそ意味がある。全体の既定（25%）より高くしてある
      skillRate: 0.35,
      // 数は多くない。倒すより先に「ちからぬき」を撃ってくる厄介役
      scoutRate: 0.30,
      spawnRate: 0.6,
      learnset: [
        { level: 1, skill: "tackle" },
        { level: 3, skill: "sapStrength" },
        { level: 8, skill: "darkSpore" }
      ],
      evolvesTo: null,
      abilities: ["tough"],
      expReward: 22,
      goldReward: 9,
      drops: [
        { item: "twistedVine", rate: 0.26, min: 1, max: 1 }
      ],
      sprite: "kageZuta",
      // 天井の裂け目からぶら下がっているので、蔦が伸び縮みして亜空間へ出入りする
      motion: "riftIdle",
      motions: { faint: "fall" }
    },

    // ゲーム中で唯一、雷を扱うモンスター。
    // 敵としては「速くて痛いが脆い」相手、仲間にすれば雷の使い手になる。
    //
    // ★ 出現率が低いかわりに危険、という立ち位置。強さは意図したもの。
    //   先手を取ってサンダーで40〜47削ってくるが、こちらもLv13でHP41しかない。
    //   「見かけたら先に倒す」判断をさせるための相手なので、
    //   ダメージが大きいことを理由に弱めないこと。
    boltBug: {
      id: "boltBug",
      name: "ビリムシ",
      family: "insectKind",
      element: "thunder",
      // 雷を身に宿しているので雷には強い。地に落とされると電気が抜ける
      resistances: { thunder: 6, wind: 3, earth: -3 },
      immunities: [],
      // ★ 雷を身に宿しているので、しびれることが無い（10＝完全に効かない）。
      //   マグマウルフの火10と同じ「一点だけ突き抜けている」形。
      //   そのかわり虫なので、体そのものは脆いまま
      statusResist: { poison: 0, paralysis: 10, sleep: 0, seal: 2,
                      blind: 0, curse: 0, instantDeath: 0 },
      // 仲間にする価値を持たせたいので、上限は高めにしてある
      maxLevel: 70,
      growthRate: { hp: 0.12, attack: 0.17, defense: 0.12, speed: 0.16, pp: 0.14 },
      description: "小さな体に電気をためこんだ虫。触れると弾ける。",
      baseHp: 16,
      baseAttack: 8,
      baseDefense: 4,
      baseSpeed: 12,
      basePp: 5,
      evasion: 0.05,
      // 渋め。この階でいちばん仲間にする価値がある相手なので、簡単には応じない
      scoutRate: 0.18,
      spawnRate: 0.5,
      learnset: [
        { level: 1, skill: "tackle" },
        { level: 6, skill: "thunderBolt" }
      ],
      evolvesTo: null,
      abilities: ["charged"],
      expReward: 25,
      goldReward: 14,
      drops: [
        { item: "stormWing", rate: 0.24, min: 1, max: 1 },
        // 買えない装備。雷を扱えるのはビリムシだけなので、実質この種族専用になる
        { item: "chargedCore", rate: 0.15, min: 1, max: 1 }
      ],
      sprite: "boltBug",
      motion: "boltFlit",
      // 飛んでいるので、傾きながら落ちる
      motions: { faint: "tumble" }
    },

    // 深層の壁役。マグマガニ（亀裂の壁役）にあたる位置づけで、こうかで固めてくる。
    // 主（キングスライム）と同じスライム系にして、この階の主属性が水だと先に見せておく
    puddling: {
      id: "puddling",
      name: "ミズダマリ",
      family: "slimeKind",
      element: "water",
      // 水そのものなので火は通らない。電気を流されるといちばん効く
      resistances: { water: 7, fire: 2, thunder: -4, earth: -2 },
      immunities: [],
      // 水そのもの。形が決まっていないので、どの状態異常もほどほどに効きにくい
      //
      // ☆ 麻痺10（完全に効かない）は、属性の雷 -4（2倍のダメージ）と向きが逆。
      //   「電気は通すが、しびれる神経が無い」と読めば通る。意図した組み合わせ
      statusResist: { poison: 3, paralysis: 10, sleep: 0, seal: 0,
                      blind: 0, curse: 0, instantDeath: 0 },
      maxLevel: 70,
      growthRate: { hp: 0.18, attack: 0.16, defense: 0.14, speed: 0.08, pp: 0.14 },
      description: "底の水が集まって形を取ったもの。近づいたものを、重い水塊で叩き潰す。",
      // 攻撃特化。壁役ではないので、HP・防御・PPは低く抑えてある。
      // 速さも捨ててあるので「先に殴られてから殴り返す」形になる
      baseHp: 16,
      baseAttack: 12,
      baseDefense: 5,
      baseSpeed: 6,
      basePp: 4,
      scoutRate: 0.25,
      spawnRate: 0.7,
      // こうかは持たせない。使われると殴りでは17発かかり、戦闘がだれてしまう。
      // 硬さはHPと防御だけで表し、崩し方は「雷を通す」に一本化した
      learnset: [
        { level: 1, skill: "tackle" },
        { level: 9, skill: "aqua" }
      ],
      evolvesTo: null,
      abilities: ["thickSkin"],
      expReward: 20,
      goldReward: 10,
      // 定義だけあって入手経路の無かった「スライムのかけら」を、ここで配る
      drops: [
        { item: "slimeShard", rate: 0.30, min: 1, max: 2 }
      ],
      // 水の腕で叩くので、砕けるような当たり方にする
      attackEffect: "shards",
      sprite: "puddling",
      // 上が重い水の塊なので、縦横が入れ替わるように波打つ
      motion: "waterWobble",
      motions: { faint: "fall" }
    },

    // ゲーム中で初めての竜系。深層のB3F・B4Fにしか出ない（dungeons.js の minFloor）。
    //
    // ★「初見殺し」として作ってある。
    //   ・ほとんどの属性が通らず、殴っても防御に弾かれる
    //   ・全体をまとめて焼く「奈落の息」を持つ
    //   ・ただし光だけは2倍で通る（耐性 光-5）。
    //     答えはステージ1のヒカリムシ（フラッシュ）で、知っていれば半分の手数で倒せる。
    //   知らないと詰み、知っていれば勝てる、という形にするための配置なので、
    //   耐性と光の弱点はセットで扱うこと。片方だけ動かさない
    abyssDragon: {
      id: "abyssDragon",
      name: "ヨミリュウ",
      family: "dragonKind",
      element: "dark",
      // 闇+10 は battle.js の immuneAt に達するので、闇の技は完全に効かない。
      // 光だけが2倍で通る、という一点突破の形にしてある
      resistances: { dark: 10, earth: 5, fire: 3, water: 3, light: -5 },
      immunities: [],
      // 闇の頂点。麻痺と即死は完全に効かない。
      // 通るのは眠りと呪い ——「眠らせてから殴る」が搦め手になる。
      // ★ 出るときの倍率と行動手順は data/dungeons.js のエントリに書いてある
      //   （HP×2.25・攻×0.9・防×1.25／闇の息→噛みつく→通常攻撃）。
      //   ここの値は「仲間にしたとき」の素の強さ
      statusResist: { poison: 5, paralysis: 10, sleep: 0, seal: 5,
                      blind: 3, curse: 0, instantDeath: 10 },
      // 上限まで育てると全種で最も強くなる（攻撃・防御・PPが1位）。
      // 上限99の3種より低いのは、そちらが「長く付き合う枠」で格とは別軸だから
      maxLevel: 75,
      // 基礎値は在来種の目安内に収め、格は成長率の配分と耐性で出している
      growthRate: { hp: 0.16, attack: 0.17, defense: 0.16, speed: 0.12, pp: 0.14 },
      description: "深層の底でとぐろを巻く竜。鱗は光を通さず、吐く息は闇そのものだという。",
      baseHp: 26,
      baseAttack: 12,
      baseDefense: 12,
      baseSpeed: 10,
      basePp: 8,
      // 牙と爪で裂く
      attackEffect: "slash",
      // この階でいちばん渋い。倒すこと自体が目的になる相手
      scoutRate: 0.10,
      spawnRate: 0.25,
      learnset: [
        { level: 1, skill: "tackle" },
        { level: 5, skill: "bite" },
        // 出現下限がLv10なので、出会う個体は必ず持っている
        { level: 10, skill: "abyssBreath" }
      ],
      evolvesTo: null,
      abilities: ["duskborn"],
      expReward: 40,
      goldReward: 30,
      drops: [
        { item: "dragonScale", rate: 0.35, min: 1, max: 1 },
        { item: "abyssFragment", rate: 0.28, min: 1, max: 1 },
        // 買えない装備。
        //
        // ★ ここだけ極端に高いのは、竜そのものが出ないから。
        //   B4Fにしか出ず、しかも単体出現。
        //   「レアな相手」×「レアなドロップ」で二重に薄まるので、
        //   5%にしていたころは実測417戦＝27回の挑戦に1つだった
        //   （他の買えない装備は4〜8回）。竜を約20体倒す計算になる。
        //   20%にして、竜を5体倒せば1つ ＝ 約7回の挑戦に落ち着かせた。
        //
        // ☆ この率を触るときは、必ず「戦闘あたり」ではなく
        //   「挑戦（ラン）あたり」で見ること。竜の出現率を通すと3倍以上変わる
        { item: "fangRing", rate: 0.20, min: 1, max: 1 }
      ],
      sprite: "abyssDragon",
      // 竜なので、他のモンスターより一回り大きく画面に出す
      sizeScale: 1.35,
      // 大きいものほどゆっくり深く息をする。縦と横をずらして、体と翼を別々に動かす
      motion: "dragonBreathe",
      motions: { faint: "crumble" }
    },

    /**
     * --- 腐食の毒沼の在来種（ステージ4・推奨Lv20） ---
     *
     * ★ 基礎値はステージ3とほぼ同じ帯に置いてある。
     *   基礎値を上げて格を出すと、仲間にしたときにレベル差以上に強くなる
     *   （基礎値+10はLv15で+31になる）。格はレベルと成長率と技で出す。
     *
     * ★ 強さは「回復なしで何戦もつか」で合わせてある。
     *   1戦ごとの勝率で見ると、満タンから始まるのでどれも100%になり、
     *   きつさが測れない。実際の挑戦では回復せずに連戦するので、そちらで測った。
     *     ステージ3 B1F 7戦 / B4F 3戦（味方Lv16）
     *     ステージ4 B1F 7戦 / B4F 3戦（味方Lv20）  ← 同じ手応えにそろえた
     *   最初に置いた案では B4F が2戦しかもたず、ステージ3より厳しくなっていた。
     *   ドクバチとヌマボネの攻撃を1段下げて合わせてある。
     */

    // 沼の雑魚。速いが脆い。毒を入れてくる相手。
    // ステージ3のビリムシと同じ「先に動いて削る」役だが、こちらは毒を持つ
    venomBee: {
      id: "venomBee",
      name: "ドクバチ",
      family: "insectKind",
      element: "dark",
      resistances: { dark: 5, wind: 2, fire: -1, light: -2 },
      immunities: [],
      // 自分が毒を使う側なので毒は完全に効かない。羽音で眠らないが、体は脆い
      statusResist: { poison: 10, paralysis: 0, sleep: 0, seal: 2,
                      blind: 2, curse: 6, instantDeath: 0 },
      maxLevel: 65,
      growthRate: { hp: 0.13, attack: 0.18, defense: 0.11, speed: 0.17, pp: 0.12 },
      description: "毒沼の上を群れで飛ぶ蜂。刺されると傷そのものより、あとに残る毒が長く効く。",
      baseHp: 17,
      baseAttack: 8,
      baseDefense: 5,
      baseSpeed: 12,
      basePp: 5,
      // 小さく速いのでかわしやすい（ビリムシと同じ0.05〜0.06の帯）
      evasion: 0.06,
      scoutRate: 0.36,
      spawnRate: 1.0,
      learnset: [
        { level: 1, skill: "tackle" },
        // 出現下限がLv14なので、出会う個体は必ず毒を持っている
        { level: 4, skill: "venomSting" },
        { level: 12, skill: "bite" }
      ],
      evolvesTo: null,
      abilities: ["swiftFoot"],
      expReward: 28,
      goldReward: 10,
      drops: [
        { item: "venomStinger", rate: 0.30, min: 1, max: 2 }
      ],
      sprite: "venomBee",
      motion: "beeHover",
      // 飛んでいるので、傾きながら落ちる
      motions: { faint: "tumble", levelUp: "cheerSpin" }
    },

    // 沼の壁役。カゲヅタ（深層の壁役）の一段上。
    // 硬いだけでなく、甲羅の泥から毒の息を吐くので放置もできない
    mudTurtle: {
      id: "mudTurtle",
      name: "ドロガメ",
      family: "beastKind",
      element: "earth",
      resistances: { earth: 7, water: 2, thunder: -2 },
      immunities: [],
      // 甲羅に覆われているので毒と麻痺が通りにくい。ただし呪いと即死には無防備
      statusResist: { poison: 8, paralysis: 0, sleep: 0, seal: 5,
                      blind: 5, curse: 0, instantDeath: 0 },
      maxLevel: 65,
      growthRate: { hp: 0.18, attack: 0.13, defense: 0.17, speed: 0.08, pp: 0.12 },
      description: "沼底の泥をかぶった亀。甲羅に溜めた泥から、たえず毒の息を漏らしている。",
      baseHp: 25,
      baseAttack: 6,
      baseDefense: 10,
      baseSpeed: 3,
      basePp: 5,
      scoutRate: 0.28,
      spawnRate: 0.8,
      // こうかは持たせない（ミズダマリと同じ理由。硬い相手をさらに硬くすると戦闘がだれる）
      learnset: [
        { level: 1, skill: "tackle" },
        { level: 10, skill: "venomBreath" }
      ],
      evolvesTo: null,
      abilities: ["thickSkin"],
      expReward: 32,
      goldReward: 14,
      drops: [
        { item: "muddyShell", rate: 0.28, min: 1, max: 1 },
        { item: "oreShard", rate: 0.20, min: 1, max: 1 }
      ],
      sprite: "mudTurtle",
      motion: "turtleBreathe",
      // 甲羅なので、倒れるというより崩れる
      motions: { faint: "crumble" }
    },

    // 沼に沈んだ者の骨。搦め手の役。
    // 骨なので毒と眠りがほとんど効かず、毒で押す戦い方の「答えにならない相手」になる
    marshBone: {
      id: "marshBone",
      name: "ヌマボネ",
      family: "demonKind",
      element: "dark",
      resistances: { dark: 7, earth: 2, fire: -1, light: -2 },
      immunities: [],
      // ★ 骨なので毒・麻痺・眠りが通りにくく、**即死は完全に効かない**（もう死んでいる）。
      //   毒だけで押す戦い方に、この階で一度ブレーキをかける相手
      statusResist: { poison: 8, paralysis: 0, sleep: 0, seal: 0,
                      blind: 0, curse: 5, instantDeath: 10 },
      maxLevel: 70,
      growthRate: { hp: 0.16, attack: 0.15, defense: 0.13, speed: 0.13, pp: 0.15 },
      description: "沼に沈んだ者の骨が、泥に浮いたまま動いている。眼窩の奥だけが青く光る。",
      baseHp: 20,
      baseAttack: 11,
      baseDefense: 6,
      baseSpeed: 8,
      basePp: 7,
      scoutRate: 0.24,
      spawnRate: 0.7,
      learnset: [
        { level: 1, skill: "tackle" },
        { level: 6, skill: "sapStrength" },
        { level: 12, skill: "darkSpore" }
      ],
      evolvesTo: null,
      abilities: ["duskborn"],
      expReward: 36,
      goldReward: 17,
      drops: [
        { item: "rustedBone", rate: 0.28, min: 1, max: 1 },
        { item: "abyssFragment", rate: 0.20, min: 1, max: 1 },
        // 買えない装備。ゲーム中で初めての即死耐性。
        //   ☆ 率は必ず「戦闘あたり」ではなく「挑戦（ラン）あたり」で見ること。
        //     ヌマボネは毒沼の25%を占めるので、同じ率でも他の種族より早く集まる
        { item: "boneCharm", rate: 0.16, min: 1, max: 1 }
      ],
      sprite: "marshBone",
      motion: "boneSway",
      // 骨なので崩れ落ちる
      motions: { faint: "crumble" }
    },

    // 腐食の毒沼の主（data/bosses.js の swampLord が使う種族）。
    // 主として出るときだけ倍率が掛かる。仲間にすればこの素の値に戻る
    marshLord: {
      id: "marshLord",
      name: "ヌシガエル",
      family: "beastKind",
      element: "water",
      resistances: { water: 5, earth: 3, dark: 3, light: -2, thunder: -3 },
      immunities: [],
      // この沼の毒はこいつが出しているので、毒は完全に効かない（10）。
      // 大きく鈍いので麻痺・眠りは意外と通る
      statusResist: { poison: 10, paralysis: 0, sleep: 0, seal: 10,
                      blind: 0, curse: 0, instantDeath: 9 },
      maxLevel: 80,
      growthRate: { hp: 0.18, attack: 0.17, defense: 0.14, speed: 0.08, pp: 0.13 },
      description: "沼の主。動かずに口だけを開けて待ち、近づいたものを丸ごと呑む。",
      baseHp: 30,
      baseAttack: 11,
      baseDefense: 8,
      baseSpeed: 5,
      basePp: 7,
      scoutRate: 0.12,
      // 主なので、ふつうの遭遇には出ない
      spawnRate: 0,
      learnset: [
        { level: 1, skill: "tackle" },
        { level: 3, skill: "bodyPress" },
        { level: 6, skill: "bubble" },
        { level: 8, skill: "venomBreath" },
        { level: 14, skill: "bite" }
      ],
      evolvesTo: null,
      abilities: ["thickSkin"],
      expReward: 140,
      goldReward: 95,
      drops: [
        { item: "venomSac", rate: 1.0, min: 1, max: 1 }
      ],
      sprite: "marshLord",
      // 横に広い主。他の3体（1.15 / 1.25 / 1.4）の間に置いてある
      sizeScale: 1.3,
      motion: "lordBreathe",
      motions: { faint: "fall" }
    }
  };
})(window.MyGame);
