/**
 * player.js
 * プレイヤーの初期状態。
 *
 * starterMonsters : 最初から連れているモンスター（種族idとレベル）
 * starterItems    : 最初から持っているアイテム（アイテムidと個数）
 * startingGold    : 最初から持っているゴールド
 * appearance      : 地図の上での見た目（絵と動き）
 *
 * ★ 開始時の内容を変えたいときは、このファイルを編集するだけでよい。
 *
 * ▼ 持ち物の種類数に上限は無い
 *   以前は inventoryMax（20種類）があったが、素材が増えるほど
 *   「店で素材が買えない」「拾ったものが入らない」が起きるだけで、
 *   遊びとして面白くなる場面が無かったのでやめた。
 *   1種類あたりの持てる数（data/items.js の maxStack）だけが上限。
 */
(function (NS) {
  "use strict";

  NS.rawData.player = {
    starterMonsters: [
      { species: "slime", level: 5 }
    ],

    starterItems: [
      { item: "herb", count: 3 },
      { item: "potion", count: 1 }
    ],

    startingGold: 50,

    /**
     * 地図の上での見た目。
     *
     * sprite     : 絵。**並べて書くとコマ絵になる**（data/sprites.js）
     * walkMotion : 歩いているあいだの動き（data/motions.js）
     * idleMotion : 立ち止まっているあいだの動き
     *
     * ▼ 向きは持たない（カニ歩き）
     *   どちらへ動いても正面を向いたまま。4方向ぶん描かなくて済む。
     *
     * ▼ 立ち止まると1コマ目で止まる
     *   idleMotion にはコマ絵の指定が無いので、frame は 0 のまま。
     *   ずっと足を動かし続けさせたいときは、ここを "playerWalk" にすればよい
     *   （そのぶん、止まっているのか動いているのかは分かりにくくなる）。
     */
    appearance: {
      sprite: ["playerWalk1", "playerWalk2"],
      walkMotion: "playerWalk",
      idleMotion: "breathe",

      /**
       * 服の色を選べるようにする仕掛け。
       *
       * colorKeys … 絵のパレットの、どの記号を差し替えるか。
       *   base / light / shadow の3つで1組。3つとも替えないと、
       *   影だけ前の色のまま残って濁る。
       *
       * colors … 選べる色。**1色につき絵が2枚（コマ数ぶん）作られる**ので、
       *   増やすと起動時に作る絵も増える。6色 × 2枚 = 12枚。
       *
       * ★ 色を増やすときは、この配列に1つ足すだけでよい。
       *   絵を描き足す必要はない（js/systems/PlayerLook.js がパレットを差し替えて作る）。
       */
      colorKeys: { base: "A", light: "H", shadow: "D" },
      colors: [
        { id: "blue",   name: "青",     base: "#4a7fe0", light: "#6f9ff0", shadow: "#2f4f96" },
        { id: "red",    name: "赤",     base: "#d94f43", light: "#ec7a6d", shadow: "#8f2f26" },
        { id: "green",  name: "緑",     base: "#4aa85e", light: "#6fd183", shadow: "#2c6b3a" },
        { id: "purple", name: "紫",     base: "#8a5fd1", light: "#a985e8", shadow: "#573a8c" },
        { id: "orange", name: "だいだい", base: "#e08a3a", light: "#f0ad6a", shadow: "#96551e" },
        { id: "black",  name: "黒",     base: "#3c4152", light: "#5a6070", shadow: "#23262f" }
      ],
      defaultColor: "blue"
    },

    /**
     * 名前を決めていないときに使う呼び名。
     * 文字盤（data/naming.js）で決めるので、最大文字数もそちらに従う。
     */
    defaultName: "あなた",

    /**
     * 性別と一人称。名前と見た目を決める画面で選ぶ（あとから設定でも変えられる）。
     *
     * ★ どちらも**ゲームの進み方には何も影響しない**（ストーリー構成.md の 2）。
     *   性別と一人称は別々に選べる（組み合わせは自由）。
     *   一人称は物語の台詞に {me} と書いたところへ差し込まれる（data/story.js）。
     *
     * 選択肢を増やすときは、配列に1つ足すだけでよい。
     * 画面の1行に並ぶのは6つまで（data/ui.js の playerSetup.chip の幅で決まる）。
     */
    genders: [
      { id: "male",   name: "男性" },
      { id: "female", name: "女性" }
    ],
    defaultGender: "male",

    firstPersons: ["私", "僕", "俺", "あたし", "うち", "自分"],
    defaultFirstPerson: "私"
  };
})(window.MyGame);
