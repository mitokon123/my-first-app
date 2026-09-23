/**
 * statuses.js
 * 状態異常の定義。数値はすべてここに置く。
 *
 * ▼ 使い方
 *   技に1行足すだけで付与できる。書き方はバフ／デバフ（modifier）と同じ考え方。
 *     data/skills.js
 *       venomFang: { ..., status: { id: "poison", chance: 0.45 } }
 *
 *   耐性は属性耐性とまったく同じ式で効く（data/battle.js の resistance）。
 *     data/monsters.js
 *       statusResist: { poison: 5, instantDeath: 8 }   // 10 で無効
 *     装備で足すときは、属性と同じ resistBonus を使う。
 *
 * ▼ 1件の中身
 *   name        : 表示名
 *   short       : 印に出す1文字（絵が無いときの代わり）
 *   icon        : 16×16 の絵（data/sprites_icons.js）。戦闘・探索・仲間画面の印はこれで出す
 *   color       : 印の色
 *   se          : 効果音のid（data/audio.js の se）。戦闘中に掛かった瞬間と、
 *                 ターン終了時のダメージ（毒）で鳴る。書かなければ無音。
 *                 ダンジョンを歩いているときの毒ダメージでは鳴らない
 *   duration    : { min, max } 自然に解ける残りターン数。書かなければ自然には解けない
 *   persists    : true なら戦闘が終わっても残る（毒だけ）
 *   curable     : 道具で治せるか
 *   blocksTurn  : "always"（必ず行動できない）／ 数値（その確率で行動できない）
 *   wakeOnDamage: ダメージを受けたときに解ける確率
 *   turnDamage  : 戦闘中、ターン終了時のダメージ
 *   walkDamage  : ダンジョンを歩いているときのダメージ
 *   accuracyMul : 命中率に掛ける倍率
 *   effects     : 特性・装備・加護とまったく同じ書き方の効果。EffectSystem がそのまま読む
 *   instantKill : true なら当たった時点で戦闘不能
 *
 * ▼ 決まりごと
 *   ・同じ状態異常を重ねてかけても、残りターン数が建て直されるだけ（バフ／デバフと同じ）
 *   ・種類の違うものは同時に掛かる（毒を受けている最中に眠りも入る）
 *   ・戦闘が終わると persists 以外は消える
 *   ・拠点に帰ると全部消える
 */
(function (NS) {
  "use strict";

  NS.rawData.statuses = {

    /**
     * 毒。ステージ4で最初に出す1つ。
     *
     * 行動を奪わないので、初めて出会っても理不尽に感じない。
     * HPが減るだけなので、何が起きたか一目で分かる。
     *
     * ★ 戦闘が終わっても消えない唯一の状態異常。
     *   ダンジョンを歩くあいだも削られ続けるので、解毒草を持つ意味が生まれる。
     *
     * ★ 歩きダメージはHPを1より下げない。
     *   戦闘の外で戦闘不能になる経路は、このゲームにまだ1つも無い
     *   （罠も leaveAtLeast: 1 で必ず1残す）。毒だけ例外にはしない。
     */
    poison: {
      id: "poison",
      name: "毒",
      short: "毒",
      icon: "iconStatusPoison",
      color: "#7fd06a",
      se: "statusPoison",
      persists: true,
      curable: true,
      // 戦闘中：ターン終了時に最大HPの1/8。ただし上限あり
      //   上限は「最大HPが大きい相手ほど毒が強くなりすぎる」のを止めるためのもの。
      //   最大HP400で50に達する。いまの主では深淵の王(371→46)と沼の主(505→50)がここ。
      //
      // ★ 毒は主（ボス）の共通の無効リスト（data/battle.js）には入れていないが、
      //   いまの主4体は data/bosses.js の immuneToStatus で個別に無効にしてある。
      //   HPが111〜505なので、毒が入るだけで1ターンあたり10%以上削れてしまうため。
      //   HPが4桁まで伸びる相手（上限50なら5%以下）が出てきたら、そこでは書かなくてよい。
      //   ★ max を上げるときは、主4体の戦いが毒1つで別物にならないか必ず測ること
      turnDamage: { hpRatio: 0.125, max: 50, leaveAtLeast: 0 },
      // ダンジョン：5歩ごとに1、HPは1で止まる
      walkDamage: { everySteps: 5, amount: 1, leaveAtLeast: 1 },
      message: "{name} は毒に浸された",
      tickMessage: "{name} は毒のダメージを受けた",
      cureMessage: "{name} の毒が消えた。"
    },

    // --- ここから下はステージ5以降。定義だけ先に置いてある ---

    /**
     * 麻痺。半分の確率で行動できない。
     * 眠りと違って自分では解けないぶん、長く続く。
     */
    paralysis: {
      id: "paralysis",
      name: "麻痺",
      short: "痺",
      icon: "iconStatusParalysis",
      color: "#ffd75e",
      se: "statusParalysis",
      duration: { min: 3, max: 5 },
      curable: true,
      blocksTurn: 0.5,
      message: "{name} はしびれて動けなくなった",
      blockMessage: "{name} は身体が痺れている",
      cureMessage: "{name} のしびれが取れた。"
    },

    /**
     * 眠り。必ず行動できないが、殴られると起きる。
     * 「起こしてしまうので殴れない」という読み合いが生まれる。
     */
    sleep: {
      id: "sleep",
      name: "眠り",
      short: "眠",
      icon: "iconStatusSleep",
      color: "#a88ce0",
      se: "statusSleep",
      duration: { min: 2, max: 4 },
      curable: true,
      blocksTurn: "always",
      wakeOnDamage: 0.5,
      message: "{name} は眠ってしまった",
      blockMessage: "{name} は眠っている",
      cureMessage: "{name} は目を覚ました。"
    },

    /**
     * 封印。技が使えなくなる（通常攻撃はできる）。
     *
     * ★ いまは効きが弱い。「攻撃」コマンドは技とは別で、
     *   normalAttack は PP0・威力0 だが、序盤の技は威力10〜15しかない。
     *   本当に効くのはキュア持ちと奈落の息を持つ竜だけ。
     *   技が強くなるステージ5以降で出す前提の定義。
     */
    seal: {
      id: "seal",
      name: "封印",
      short: "封",
      icon: "iconStatusSeal",
      color: "#8a5fb0",
      se: "statusSeal",
      duration: { min: 2, max: 5 },
      curable: false,
      blocksSkills: true,
      message: "{name} は技をだせなくなった",
      blockMessage: "{name} は技が使えない",
      cureMessage: "{name} の封印が解けた。"
    },

    /**
     * 盲目。命中率が下がる。
     *
     * ★ 倍率で書いてある（引き算ではない）。属性耐性と同じ考え方に揃えるため。
     *   いまの技はすべて命中率1.0なので、0.65 なら 65% で当たる。
     *   命中判定を抜けたあとに回避判定がもう一度あることに注意。
     */
    blind: {
      id: "blind",
      name: "盲目",
      short: "盲",
      icon: "iconStatusBlind",
      color: "#5e5650",
      se: "statusBlind",
      duration: { min: 2, max: 4 },
      curable: true,
      accuracyMul: 0.65,
      message: "{name} は視界が遮られた",
      cureMessage: "{name} の目が見えるようになった。"
    },

    /**
     * 呪い。受けるダメージが増える。
     *
     * 行動を奪わない唯一の状態異常。
     * 効果の書き方は特性・装備・加護とまったく同じなので、
     * ダメージ計算側は何も変えなくてよい。
     */
    curse: {
      id: "curse",
      name: "呪い",
      short: "呪",
      icon: "iconStatusCurse",
      color: "#c04a7a",
      se: "statusCurse",
      duration: { min: 3, max: 5 },
      curable: true,
      effects: [{ type: "damageTaken", value: 1.3 }],
      message: "{name} は呪われてしまった",
      cureMessage: "{name} の呪いが解けた。"
    },

    /**
     * 即死。当たった時点で戦闘不能。
     *
     * ★ 主（ボス）には効かない。data/battle.js の bossImmuneToStatus（全ボス共通）。
     *
     * ★ 最後の1体でも容赦なく効く（守りは入れていない）。
     *   最後の味方に通れば、そこで挑戦が終わる。
     *   だからこそ耐性装備を積む意味が生まれる、という設計。
     *   耐性7で4.5%、10で無効になるので、備えれば実質防げる。
     *
     * 命中率が低く（15%前後）PPが重いので、味方が使っても手番を捨てるだけになりやすい。
     * 脅威になるのは敵が使ってきたときで、そこに耐性装備の意味が生まれる。
     */
    instantDeath: {
      id: "instantDeath",
      name: "即死",
      short: "死",
      icon: "iconStatusInstantDeath",
      color: "#e8542a",
      // この音が「倒れる」音を兼ねる（直後の faint の音は鳴らさない）
      se: "statusInstantDeath",
      curable: false,
      instantKill: true,
      // 受けた瞬間にHP0なので「掛かった」ではなく「死んだ」と言い切る。直後に倒れた文も続く
      message: "{name} は死んでしまった"
    }
  };
})(window.MyGame);
