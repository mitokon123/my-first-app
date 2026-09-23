/**
 * tutorial.js
 * 初めてその場面に来たときだけ出る、短い説明。
 *
 * settingId : 出す/出さないを切り替える設定項目のid（data/settings.js）
 * steps     : 説明のひとつひとつ
 *   id      : 識別子。**見たかどうかをこのidでセーブに残す**ので、
 *             一度出した説明のidは変えないこと（変えるともう一度出る）
 *   trigger : どの場面で出るか。場面の側が TutorialSystem.take(trigger) を呼ぶ
 *   order   : 同じ trigger に複数あるときの順番（小さいほど先）
 *   title   : 見出し
 *   lines   : 本文。1要素が1行。**折り返さないので、長すぎる行は自分で分ける**
 *   pointAt : 画面のどこを指すか（省略すると指さない）。
 *             いまは戦闘のコマンドだけに対応していて、コマンドの value を書く
 *             （ターンの頭：go / flee、仲間ごと：attack / fight / defend / item / inspect / scout / swap）。
 *             指し先が画面に無いときは、矢印が出ないだけで説明は出る
 *
 * ★ 説明を増やすときは steps に1つ足す。既にある trigger を使うならコードは触らない。
 *   新しい場面で出したいときだけ、その場面に take() の呼び出しを1行足す。
 *
 * ▼ 出る場面（trigger）の一覧
 *   homeReturn   … 初めて拠点の画面を開いた（帰還の知らせが出ている間は次に回す）
 *   dungeonEnter … 初めてダンジョンに入った
 *   turnMenu     … 初めてターンの頭「戦う／逃げる」が出た
 *   battleStart  … 初めて仲間のコマンドを決める（「戦う」を選んだ直後。数枚続けて出る）
 *   enemyWeak    … 敵のHPが半分以下になった（スカウトできる戦いのみ）
 *   battleWon    … 初めて戦闘に勝った
 *   levelUp      … 初めてレベルが上がった
 *   poisoned     … 初めて状態異常を受けた
 *
 * ▼ 書き方の方針
 *   **1画面に5行まで。** それ以上は読まれない。
 *   操作を1つだけ教えて、理由は最小限にする。
 *   詳しい話は拠点の「遊び方」（data/help.js）に置く。
 */
(function (NS) {
  "use strict";

  NS.rawData.tutorial = {
    settingId: "tutorial",

    steps: {

      // --- 拠点 ---

      home: {
        id: "home",
        trigger: "homeReturn",
        order: 1,
        title: "拠点でできること",
        lines: [
          "拠点へ帰ると全員が回復します。",
          "「ショップ」で道具を買うことができます。",
          "事前に準備しておきましょう。",
          "「仲間」で並び順と装備を変えられます。",
          "困ったときは「遊び方」を開いてください。"
        ]
      },

      // --- ダンジョン ---

      move: {
        id: "move",
        trigger: "dungeonEnter",
        order: 1,
        title: "ダンジョンの歩き方",
        lines: [
          "矢印キーまたはWASDで歩きます。",
          "階段に触れると階を降りたり、",
          "ダンジョンの主に挑むことができます。",
          "歩いているとモンスターに出会います。"
        ]
      },

      /**
       * --- 初めての戦闘 ---
       *
       * ★ コマンドを1つずつ、矢印で指しながら説明する。
       *   pointAt にコマンドの value を書くと、その項目が四角で囲まれ、
       *   ふきだしから矢印が伸びる（js/ui/TutorialBox.js）。
       *   場面によって並びが変わる（スカウトや交代が出たり出ない）ので、
       *   位置ではなく value で指している。
       *
       * ★ 出る場面はコマンドを選ぶ瞬間。
       *   戦闘の開始時に出すと、指す相手（コマンド欄）がまだ画面に無い。
       *
       * ★ 1枚は短くしてある（2〜3行）。
       *   指している項目を見ながら読むので、長いと目が往復して読めない。
       */

      battleBasics: {
        id: "battleBasics",
        trigger: "battleStart",
        order: 1,
        title: "戦い方",
        lines: [
          "仲間の行動をひとりずつ決めます。",
          "最大3体まで同時に戦闘に出せます。",
          "全員の選択を終えると、素早い順に行動します。"
        ]
      },

      cmdAttack: {
        id: "cmdAttack",
        trigger: "battleStart",
        order: 2,
        pointAt: "attack",
        title: "攻撃",
        lines: [
          "選ぶと、相手のモンスターを攻撃します。",
          "PPを使いません。何度でも使えます。"
        ]
      },

      cmdSkill: {
        id: "cmdSkill",
        trigger: "battleStart",
        order: 3,
        pointAt: "fight",
        title: "技",
        lines: [
          "PPを使って、覚えた技を使います。",
          "相手の弱点を突く技は大きく効きます。",
          "PPは拠点へ帰ると満タンに戻ります。"
        ]
      },

      cmdDefend: {
        id: "cmdDefend",
        trigger: "battleStart",
        order: 4,
        pointAt: "defend",
        title: "防御",
        lines: [
          "そのターンだけ、受けるダメージが",
          "半分になります。",
          "大技が来ると分かっているときに。"
        ]
      },

      cmdItem: {
        id: "cmdItem",
        trigger: "battleStart",
        order: 5,
        pointAt: "item",
        title: "道具",
        lines: [
          "持ち物を使います。",
          "薬草や回復薬は戦いの最中にも使えます。",
          "使った仲間は、そのターン他の行動ができません。"
        ]
      },

      cmdInspect: {
        id: "cmdInspect",
        trigger: "battleStart",
        order: 6,
        pointAt: "inspect",
        title: "状態を見る",
        lines: [
          "掛かっている状態異常や強化・弱体を、",
          "残りターンまでくわしく見られます。",
          "見るだけなので、行動は消費しません。"
        ]
      },

      /**
       * --- ターンの頭「戦う／逃げる」 ---
       * 毎ターンの最初に出るメニュー。仲間ごとのコマンドより先に見せる。
       */
      turnGo: {
        id: "turnGo",
        trigger: "turnMenu",
        order: 1,
        pointAt: "go",
        title: "戦う",
        lines: [
          "毎ターン、まず「戦う」か「逃げる」かを決めます。",
          "「戦う」を選ぶと、仲間ひとりずつの",
          "行動を決めていきます。"
        ]
      },

      cmdFlee: {
        id: "cmdFlee",
        trigger: "turnMenu",
        order: 2,
        pointAt: "flee",
        title: "逃げる",
        lines: [
          "戦闘をやめて逃げ出します。",
          "失敗することもあります。",
          "ダンジョンの主からは逃げられません。"
        ]
      },

      battleOrder: {
        id: "battleOrder",
        trigger: "battleStart",
        order: 7,
        title: "並び順",
        lines: [
          "前に置いた仲間ほど狙われます。",
          "硬い仲間を先頭に置くと、",
          "後ろの仲間が守られます。",
          "並び順は拠点の「仲間」で変えられます。"
        ]
      },

      scout: {
        id: "scout",
        trigger: "enemyWeak",
        order: 1,
        pointAt: "scout",
        title: "仲間に誘う",
        lines: [
          "相手が弱っています。",
          "「スカウト」でモンスターを仲間に誘えます。",
          "HPが低いほど応じてくれやすくなります。",
          "誘えるのは1ターンに1回だけです。",
          "成功すると、その場で戦闘が終わります。"
        ]
      },

      // --- 育成・状態異常 ---

      levelUp: {
        id: "levelUp",
        trigger: "levelUp",
        order: 1,
        title: "レベルが上がった",
        lines: [
          "戦うとレベルが上がり、強くなります。",
          "決まったレベルで新しい技を覚えます。",
          "覚えた技は図鑑にも記録されます。"
        ]
      },

      poisoned: {
        id: "poisoned",
        trigger: "poisoned",
        order: 1,
        title: "状態異常",
        lines: [
          "毒を受けました。",
          "毒は時間では消えません。",
          "ダンジョンでも歩いているとHPが削られます。",
          "解毒草を使うか、拠点へ帰ると解除されます。"
        ]
      },

      /**
       * --- 締めのひとこと ---
       *
       * ★ 初めて戦闘に勝ったときに出す。
       *   ここまでで、歩き方・戦い方・並び順・レベルアップを見ている。
       *   ひととおり分かったところで送り出す、という位置づけ。
       *   出す場面を変えたいときは trigger を書き替えるだけでよい。
       */
      closing: {
        id: "closing",
        trigger: "battleWon",
        order: 1,
        title: "行ってらっしゃい",
        lines: [
          "ダンジョンをクリアして、新しいモンスターを",
          "どんどんスカウトしていってください。",
          "奥には強力なモンスターたちが待っています。"
        ]
      }
    }
  };
})(window.MyGame);
