/**
 * ui.js
 * UI の見た目とレイアウト。ここを編集するだけで画面の配置・色・文字サイズを変更できる。
 * （コード側に座標や色を直接書かないための設定ファイル）
 *
 * theme  : 共通の色・フォント
 * battle : 戦闘画面の各パーツの配置
 *   x, y, w, h はキャンバス左上からのピクセル座標。
 */
(function (NS) {
  "use strict";

  NS.rawData.ui = {
    theme: {
      panelBg: "rgba(8,10,20,0.92)",
      panelBorder: "#3a4266",
      borderWidth: 2,
      textColor: "#e8eaf0",
      subTextColor: "#9aa4c0",
      hintColor: "#5b6688",
      cursorColor: "#ffd75e",
      font: "14px monospace",
      smallFont: "12px monospace",
      largeFont: "16px monospace",
      lineHeight: 18,
      padding: 10,
      hpBarBg: "#2a3350",
      hpBarHigh: "#5fd18c",
      hpBarMid: "#ffd75e",
      hpBarLow: "#e8542a",
      hpMidThreshold: 0.5,   // この割合以下で色が変わる
      hpLowThreshold: 0.25,

      // PPバー。HPと見分けられるよう、残量で色を変えず常にこの色で描く
      ppBarBg: "#243048",
      ppBarColor: "#4fb0d1",

      // マウス用の「戻る」ボタン。全画面で同じ位置に出す
      backButton: { x: 688, y: 552, w: 84, h: 30 },
      buttonHoverBg: "rgba(74,107,168,0.45)"
    },

    /**
     * タイトル画面。
     * 深淵（Abyss）へ落ちていく雰囲気を、背景のグラデーションと
     * ゆっくり降る粒子で表現している。数値はすべてここで調整できる。
     */
    title: {
      // 背景のたてグラデーション（上から下へ）
      gradientTop: "#0a1020",
      gradientBottom: "#02040a",

      // 降ってくる粒子
      particles: {
        count: 70,
        color: "#6f86c9",
        minSize: 1,
        maxSize: 2.5,
        minSpeed: 6,      // 1秒あたりの落下px
        maxSpeed: 26,
        minAlpha: 0.15,
        maxAlpha: 0.65
      },

      // 深淵を表す同心円（奥行きの演出）
      abyss: {
        centerX: 400,
        centerY: 262,
        rings: 6,
        baseRadius: 56,
        ringGap: 46,
        color: "#4a6ba8",
        lineWidth: 1.5,
        minAlpha: 0.10,     // 明滅の下限
        maxAlpha: 0.45,     // 明滅の上限
        fadePerRing: 0.13,  // 外側の円ほど薄くする量
        pulseSpeed: 0.0012  // 明滅の速さ
      },

      // ゲーム名
      logo: { x: 400, y: 186, font: "50px monospace", color: "#e6ecff",
              glowColor: "#4a7fe0", glowBlur: 20, letterSpacing: 5 },
      // 世界名
      world: { x: 400, y: 228, font: "16px monospace", color: "#7f8db8" },
      // 副題
      subtitle: { x: 400, y: 258, font: "13px monospace", color: "#55638c" },

      menu: { x: 310, y: 346, w: 180, h: 78 },

      // 「新しく始める」の確認。メニューの位置に重ねて表示する
      confirm: {
        box:  { x: 250, y: 320, w: 300, h: 132 },
        title:{ x: 400, y: 348 },
        body: { x: 400, y: 372 },
        note: { x: 400, y: 394 },
        menu: { x: 340, y: 402, w: 120, h: 44 }
      },

      notice: { x: 400, y: 464 },
      hint: { x: 400, y: 566 },
      version: { x: 792, y: 590 }
    },

    /**
     * 戦闘画面（3対3）。
     * 敵は上段、味方は下段に、盤面の並び順で左から配置する。
     * slotGap は1体分の横幅。盤面の人数が変わっても中央に寄るよう、
     * 描画側が人数から開始位置を計算する。
     */
    battle: {
      background: "#0b0f1a",

      // 敵（上段）
      enemyRow:    { y: 62,  spriteSize: 96, slotGap: 210, statusY: 168, statusW: 190, statusH: 46 },
      // 味方（下段）。HPバーの下にPPバーを出すぶん、敵より縦に長い
      allyRow:     { y: 250, spriteSize: 96, slotGap: 210, statusY: 350, statusW: 190, statusH: 64 },

      // メッセージ欄
      message: { x: 20, y: 428, w: 760, h: 152 },
      messageLines: 6,  // 一度に表示する行数（超えると送り待ちになる）
      // コマンド欄（メッセージ欄に重ねて表示）
      command: { x: 540, y: 428, w: 240, h: 152 },
      // 技・道具の一覧
      subMenu: { x: 280, y: 428, w: 250, h: 152, visibleRows: 5, rowHeight: 26 },
      // 選んでいる技・道具の内容（メッセージ欄の左側に出す）
      skillInfo: { charsPerLine: 16, elementOffsetX: 110 },

      /**
       * 行動の再生（アニメーション）に関する設定。
       * 1ターン分の出来事を、この間隔で1つずつ見せていく。
       */
      animation: {
        eventDelay: 420,        // 出来事1つあたりの待ち時間（ms）
        quickDelay: 90,         // 決定キーを押している間の待ち時間（ms）
        hpDrainPerSecond: 45,   // HPバーが1秒に動く量。大きいほど速く減る
        hpMinDrainTime: 180,    // 少量のダメージでも最低これだけ時間をかける（ms）

        /**
         * 戦闘速度（設定の battleSpeed 1〜8）に対応する倍率。
         * 大きいほど速い。待ち時間はこの値で割り、HPバーの速さは掛ける。
         */
        speedTable: [0.6, 0.8, 1.0, 1.3, 1.7, 2.2, 3.0, 4.2],

        // ダメージなどの数字が浮かび上がる演出
        popup: {
          duration: 720,        // 表示時間（ms）
          rise: 46,             // 浮かび上がる高さ（px）
          spawnOffsetY: -2,     // スプライト上端からの位置（マイナスで少し上）
          spreadX: 16,          // 同じ相手に重ならないよう左右へ散らす幅（px）
          driftX: 10,           // 浮かびながら横へ流れる量（px）
          popScale: 1.5,        // 出た瞬間の大きさ（1.0で等倍）
          popTime: 0.18,        // 大きさが元に戻るまでの割合（0〜1）
          fadeStart: 0.65,      // 薄くなり始める割合（0〜1）
          outlineColor: "#0b0f1a"
        },

        /**
         * 場面ごとの見た目。
         *   color / font : 浮かぶ文字の色と大きさ
         *   shake        : 画面の揺れの強さ（0で揺れない）
         *   flash        : 画面全体を一瞬染める色（省略で光らない）
         *   flashAlpha   : 光の濃さ
         *
         * ★ 演出を変えたいときは、ここの数値と色を触るだけでよい。
         */
        styles: {
          damage:    { color: "#ffffff", font: "20px monospace", shake: 3 },
          critical:  { color: "#ffd75e", font: "30px monospace", shake: 12,
                       flash: "#ffd75e", flashAlpha: 0.28 },
          effective: { color: "#ff9c5e", font: "24px monospace", shake: 7,
                       flash: "#ff9c5e", flashAlpha: 0.18 },
          resisted:  { color: "#9aa4c0", font: "17px monospace", shake: 0 },
          heal:      { color: "#5fd18c", font: "20px monospace", shake: 0,
                       flash: "#5fd18c", flashAlpha: 0.12 },
          miss:      { color: "#9aa4c0", font: "18px monospace", shake: 0 },
          immune:    { color: "#8b6fd6", font: "18px monospace", shake: 0 },
          faint:     { shake: 6 }
        },

        // 画面の揺れ・光の持続時間（ms）
        shakeDuration: 260,
        flashDuration: 220
      }
    },

    /**
     * 拠点（ホーム）画面。
     * ダンジョンへ出発する前の準備場所。左にメニュー、右に手持ちの一覧を出す。
     * 将来ここに施設（回復・倉庫・強化など）を増やしていく想定。
     */
    home: {
      gradientTop: "#121a2e",
      gradientBottom: "#070b16",

      // 拠点のたき火のような、ゆっくり昇る光の粒
      particles: {
        count: 26,
        color: "#c8a35e",
        minSize: 1,
        maxSize: 2.5,
        minSpeed: -18,   // 負の値で上へ昇る
        maxSpeed: -5,
        minAlpha: 0.12,
        maxAlpha: 0.5
      },

      title:    { x: 48, y: 62, font: "26px monospace", color: "#e6ecff" },
      subtitle: { x: 48, y: 88, font: "13px monospace", color: "#7f8db8" },
      // 所持金（右寄せ）
      gold:     { x: 760, y: 66, font: "16px monospace", color: "#ffd75e" },

      // lineHeight で項目の間隔を広げ、拠点らしい落ち着いた見た目にする
      menu:   { x: 48, y: 122, w: 280, h: 372, lineHeight: 36 },
      // 右側の手持ち一覧（最大6体）
      status: { x: 360, y: 122, w: 400, h: 372, rowHeight: 52, spriteSize: 36, hpBarWidth: 190 },

      notice: { x: 400, y: 526 },
      hint:   { x: 48, y: 570 }
    },

    /**
     * 持ち物画面。左に一覧（分類ごとの見出しつき）、右に説明を出す。
     */
    items: {
      background: "#0a0f1c",
      title:    { x: 48, y: 62, font: "26px monospace", color: "#e6ecff" },
      subtitle: { x: 48, y: 88, font: "13px monospace", color: "#7f8db8" },

      list:   { x: 48, y: 122, w: 400, h: 372, rowHeight: 26, headerHeight: 26, visibleRows: 12 },
      detail: { x: 470, y: 122, w: 290, h: 372 },

      notice: { x: 400, y: 526 },
      hint:   { x: 48, y: 570 }
    },

    /**
     * 図鑑画面。上でタブ（モンスター／アイテム）を切り替え、
     * 左に一覧、右に詳細を出す。
     */
    dex: {
      background: "#0a0f1c",
      title:    { x: 48, y: 62, font: "26px monospace", color: "#e6ecff" },
      subtitle: { x: 48, y: 88, font: "13px monospace", color: "#7f8db8" },

      // タブは5つ（モンスター／アイテム／特性／性格／加護）
      tabs:   { x: 48, y: 108, w: 140, h: 30, gap: 6 },
      list:   { x: 48, y: 152, w: 400, h: 342, rowHeight: 26, headerHeight: 26, visibleRows: 11 },
      // 右の詳細欄。入りきらない説明は決定キーでスクロールして読む
      //   charsPerLine … 説明文を折り返す文字数
      detail: { x: 470, y: 152, w: 290, h: 342, spriteSize: 72, charsPerLine: 18 },

      // 収集数。タブが5つに増えて重なったため、タブの上（副題の行）へ移した
      progress: { x: 760, y: 88 },
      hint:     { x: 48, y: 570 }
    },

    /**
     * パッチノート。左にバージョンの一覧、右にその内容を出す。
     *   tag         … 種類（追加・調整など）を示す色つきの札の大きさ
     *   legend.gap  … 上部に並べる凡例の間隔
     */
    patchNote: {
      background: "#0a0f1c",
      title:    { x: 48, y: 62, font: "26px monospace", color: "#e6ecff" },
      subtitle: { x: 48, y: 88, font: "13px monospace", color: "#7f8db8" },

      legend: { x: 320, y: 86, gap: 74 },
      tag: { w: 34, h: 16 },
      tagTextColor: "#0a0f1c",

      list:  { x: 48, y: 122, w: 250, h: 372, rowHeight: 56 },
      selectedBg: "rgba(74,107,168,0.3)",
      notes: { x: 316, y: 112, w: 444, h: 382, charsPerLine: 30 },

      hint: { x: 48, y: 570 }
    },

    /**
     * 加護を選ぶ画面。候補を縦に並べる。
     * card.gap は2つ目以降の候補が下へずれる量。
     */
    blessing: {
      background: "#0a0f1c",
      title:    { y: 96,  font: "24px monospace", color: "#e6ecff" },
      subtitle: { y: 126, font: "13px monospace", color: "#7f8db8" },

      card:  { x: 150, y: 170, w: 500, h: 84, gap: 98 },
      owned: { x: 400, y: 500 },
      hint:  { x: 400, y: 560 }
    },

    /**
     * ショップ。左に品物の一覧、右に選んだ品物の説明を出す。
     */
    shop: {
      background: "#0a0f1c",
      title:    { x: 48, y: 62, font: "26px monospace", color: "#e6ecff" },
      subtitle: { x: 48, y: 88, font: "13px monospace", color: "#7f8db8" },
      gold:     { x: 760, y: 66, font: "16px monospace", color: "#ffd75e" },

      tabs:   { x: 48, y: 108, w: 160, h: 30, gap: 8 },
      list:   { x: 48, y: 152, w: 400, h: 342, rowHeight: 26, visibleRows: 11 },
      detail: { x: 470, y: 152, w: 290, h: 342, charsPerLine: 18 },

      // 買う個数を決めるとき
      quantityStep: 10,  // ←→ で一度に増減する数
      confirmMenu: { x: 560, y: 400, w: 190, h: 80, lineHeight: 26 },

      notice: { x: 400, y: 526 },
      hint:   { x: 48, y: 570 }
    },

    /**
     * 工房。左に作れるものの一覧、右に必要な素材と説明を出す。
     */
    craft: {
      background: "#0a0f1c",
      title:    { x: 48, y: 62, font: "26px monospace", color: "#e6ecff" },
      subtitle: { x: 48, y: 88, font: "13px monospace", color: "#7f8db8" },
      gold:     { x: 760, y: 66, font: "16px monospace", color: "#ffd75e" },

      list:   { x: 48, y: 122, w: 400, h: 372, rowHeight: 26, visibleRows: 12 },
      detail: { x: 470, y: 122, w: 290, h: 372, charsPerLine: 18 },

      confirmMenu: { x: 560, y: 400, w: 190, h: 80, lineHeight: 26 },
      notice: { x: 400, y: 526 },
      hint:   { x: 48, y: 570 }
    },

    /**
     * ダンジョン選択画面。左に一覧、右に選んだ場所の詳細を出す。
     */
    dungeonSelect: {
      background: "#0a0f1c",
      title:    { x: 48, y: 62, font: "26px monospace", color: "#e6ecff" },
      subtitle: { x: 48, y: 88, font: "13px monospace", color: "#7f8db8" },

      // 一覧の1件分。2件目以降は rowHeight ずつ下にずれる
      list:   { x: 48, y: 122, w: 400, h: 78, rowHeight: 90 },

      // 右の詳細欄。説明・出現モンスター・手に入るものを縦に並べる
      //   charsPerLine … 説明文を折り返す文字数
      //   columns / columnWidth … モンスター名などを何列で並べるか
      detail: { x: 470, y: 122, w: 290, h: 400,
                lineHeight: 18, charsPerLine: 20, columns: 2, columnWidth: 132 },

      hint: { x: 48, y: 570 }
    },

    /**
     * 設定画面。左に調整できる項目、右に操作キーの一覧を出す。
     */
    settings: {
      background: "#0a0f1c",
      title:    { x: 48, y: 62, font: "26px monospace", color: "#e6ecff" },
      subtitle: { x: 48, y: 88, font: "13px monospace", color: "#7f8db8" },

      // 左：音量などの調整項目
      items: { x: 48, y: 122, w: 340, h: 240, rowHeight: 44, barWidth: 150, barHeight: 8 },
      note:  { x: 48, y: 384 },

      // 右：操作キーの一覧
      keys:  { x: 412, y: 122, w: 348, h: 372, rowHeight: 36 },

      notice: { x: 400, y: 526 },
      hint:   { x: 48, y: 570 }
    },

    /**
     * 探索画面。マップは 25x18 タイル（=800x576px）で、
     * 上端の手持ち表示と下端の情報欄はその外側・内側に重ねて描く。
     */
    dungeon: {
      background: "#05070d",
      statusBar: { height: 22, bg: "rgba(0,0,0,0.6)", color: "#c8d0e8", font: "13px monospace" },
      infoBar:   { height: 24, bg: "rgba(0,0,0,0.7)", color: "#c8d0e8", font: "13px monospace" },
      notice:    { height: 40, bg: "rgba(8,10,20,0.92)", color: "#ffd75e", font: "15px monospace" },
      stairsMark: { text: "▼", color: "#ffd75e", font: "20px monospace" }
    },

    party: {
      background: "#0b0f1a",
      title: { x: 32, y: 42 },
      // 「連れていく / 預かり所」の切り替え表示（gap は2つ目の左へのずれ）
      tabs: { x: 200, y: 42, gap: 150 },
      // 一覧の1行分の配置。2体目以降は rowHeight ずつ下にずれる
      //   visible … 画面に同時に出す行数（預かり所はこれより多く入るので窓のようにずらす）
      list: { x: 32, y: 58, w: 480, h: 62, rowHeight: 70, visible: 6 },
      spriteSize: 48,
      hpBarWidth: 220,
      // 先頭から何体が戦闘に出るかを示す線
      fieldDivider: { color: "#ffd75e", label: "出撃" },
      // 選択中の個体の詳細
      detail: { x: 540, y: 58, w: 228, h: 424 },
      // 装備を選ぶときの一覧（詳細欄の位置に重ねて出す）
      //   下の余白にステータスの変化（着ける前 → 着けたあと）を出す
      equipList: { x: 540, y: 58, w: 228, h: 230, rowHeight: 26, visibleRows: 7 },
      // 「この仲間をどうするか」の項目
      actionMenu: { x: 300, y: 180, w: 220, h: 140, lineHeight: 28 },
      hint: { x: 32, y: 576 }
    }
  };
})(window.MyGame);
