/**
 * bosses.js
 * ボスの定義。どのダンジョンに出るかは data/dungeons.js の boss で指定する。
 *
 * species     : 種族id（monsters.js を参照。ボス専用の種族を作ってもよい）
 * level       : レベル
 * title       : 表示名（省略時は種族名）
 * canFlee     : 逃げられるか
 * isFinal     : 倒すとエンディングになるか
 *
 * ▼ scoutableWhen : 誘えるようになる条件。書かなければ一生誘えない。
 *   data/dungeons.js の unlockedBy と同じ書き方ができる（判定も同じ仕組み）。
 *     "mossyMine"          … そのダンジョンをクリアしていれば誘える
 *                             ＝ 一度倒してから、2度目の挑戦で仲間にできる
 *     { region: "abyss" }  … その地方を全部クリアしてから（＝地方解放後）
 *     true                 … 最初から誘える
 *   いまは全ボスを「2度目の挑戦から」にしてある。
 *   あとから「地方解放後」に変えたいボスは、その1行を書き換えるだけでよい。
 *
 * ▼ statMultiplier : 主として立ちはだかっているあいだだけ掛かる倍率。
 *   { hp, attack, defense, speed, pp } のうち書いたものだけが効く（省略で等倍）。
 *
 *   ボスを強くするのに基礎値を上げると、仲間にしたときまで強くなってしまう。
 *   レベルを上げて強くすると、経験値とゴールドが
 *   「基準 × (1 + (Lv-1) × 0.15)」で一緒に膨らみ、レベルが走りすぎる。
 *   だから「立ちはだかる相手としての強さ」だけをここで足す。
 *   スカウトして仲間になった個体には引き継がれない。
 *
 * ▼ immuneToStatus : 主として立ちはだかっているあいだだけ効かない状態異常。
 *   statMultiplier と同じで、仲間に迎えたときはその種族そのままの耐性に戻る。
 *
 *   ★ 毒は全ボスに入れてある。
 *     毒は「最大HPの1/8」なので、HPの大きい相手ほど強くなりすぎる。
 *     深淵の王（HP370）だと46/ターンで、味方3体の1ターン火力59の8割に届く。
 *     倍率と行動パターンで詰めた戦いが、毒1つで別物になってしまう。
 *
 *   ★ 即死も全ボスに入れてある。
 *     15%の抽選1回で主が消えると、そこまでの設計がすべて無意味になる。
 *
 * ▼ actionPattern : 決まった順番で行動させる手順。書かなければ今までどおり、
 *   data/battle.js の enemyAi.skillRate に従って確率で技を選ぶ。
 *
 *   技idを並べる。"wait" と書くと、そのターンは何もしない。
 *   最後まで行くと先頭に戻る。戦闘のたびに先頭から始まる。
 *
 *   動きが読めるようになるので、覚えれば対処できる相手にできる。
 *   何もしないターンを混ぜると、こちらが立て直す隙にもなる。
 *   PPが足りない技に当たったターンは通常攻撃に落ちるが、順番は進む。
 *
 * ▼ scoutLevel : 仲間になったときのレベル。
 *   省略すると data/scout.js の bossJoinLevel（現在は1）。
 *   ボスは高いレベルで戦うので、そのまま仲間にすると強すぎる。育て直す形にする。
 *   性格と個体値は戦った個体のものを引き継ぐ（レベルだけ下がる）。
 *
 * ★ ボスを増やすときは、ここに1エントリ足して
 *   dungeons.js の boss からそのidを指すだけでよい。
 */
(function (NS) {
  "use strict";

  NS.rawData.bosses = {
    mineKeeper: {
      id: "mineKeeper",
      species: "mossGolem",
      level: 8,
      // 基礎値（HP30 攻8 防11 速3 PP4）に掛けて、Lv8で HP104 攻27 防28 速7 PP8 になる。
      // 以前は基礎値だけで 102/28/28/8 にしていたので、
      // 仲間にするとLv1でHP50・防御14という格外の強さになっていた。
      //
      // 端数の多い数字なのは、種族の成長率を項目ごとに分けた（守り重視・足は遅い）ぶんを
      // ここで吸い直して、Lv8の主だけは以前と同じ強さに保っているため。
      // 主の強さを変えたいときは、この倍率だけを触ればよい
      statMultiplier: { hp: 1.59, attack: 1.71, defense: 1.10, speed: 1.57, pp: 1.18 },
      immuneToStatus: ["poison", "instantDeath"],
      title: "坑道の主",
      scoutableWhen: "mossyMine",
      canFlee: true,
      isFinal: false
    },

    blazeBeast: {
      id: "blazeBeast",
      species: "magmaBeast",
      // 亀裂の敵はLv5〜10。主だけ極端に高くすると、報酬（レベルで増える）も
      // 一気に膨らんでレベルが走りすぎるので、少し上に置くだけにしてある
      level: 12,
      // 基礎値（HP35 攻16 防8 速7 PP6）に掛けて、Lv12で HP208 攻42 防29 速14 PP31 になる。
      // 速さを落としてあるのは、大きく重い獣らしくするため。
      //
      // 攻撃だけ1を下回っているのは弱体化ではない。この種族は攻撃の成長率が高い（0.19）ので、
      // 素のままだとLv12で47まで伸びてしまう。調整済みの42に戻すための打ち消しで、
      // 主の強さそのものは以前と同じ。仲間にしたときの伸びには影響しない
      statMultiplier: { hp: 2.16, attack: 0.85, defense: 1.65, speed: 0.70, pp: 2.13 },
      immuneToStatus: ["poison", "instantDeath"],
      // 5ターンで一巡する。息を吐いた直後に殴ってくるので、
      // 立て直せるのは3手目の1回だけ
      actionPattern: [
        "fireBreath",    // 全体を焼く
        "normalAttack",
        "wait",
        "ember",         // 1体を強く焼く
        "normalAttack"
      ],
      title: "灼熱の獣",
      scoutableWhen: "scorchingFissure",
      canFlee: true,
      isFinal: false
    },

    abyssKing: {
      id: "abyssKing",
      species: "kingSlime",
      // 深層の敵はLv10〜15、推奨レベルは16。主はその少し上に置く。
      // 以前は28で、階の敵とも推奨レベルとも噛み合っていなかった
      // （レベルを上げると報酬まで膨らむので、強さは倍率で作る）
      level: 18,
      // 基礎値（HP28 攻10 防10 速4 PP7）に掛けて、
      // Lv18で HP370 攻52 防40 速14 PP36 になる。
      // HPの倍率だけ極端に大きいのは、王を「長く殴り続ける相手」にするため
      statMultiplier: { hp: 3.13, attack: 1.47, defense: 1.03, speed: 1.60, pp: 1.61 },
      immuneToStatus: ["poison", "instantDeath"],
      // 5ターンで一巡する。重い一撃が2回来るが、そのあいだに通常攻撃が挟まる。
      // 読み切れば「ボディプレスの番だけ防御する」という戦い方ができる
      actionPattern: [
        "bodyPress",     // 重い一撃
        "normalAttack",
        "aqua",          // 水の王らしい一手
        "bodyPress",
        "normalAttack"
      ],
      title: "深淵の王",
      scoutableWhen: "silentDepths",
      canFlee: false,
      isFinal: true
    }
  };
})(window.MyGame);
