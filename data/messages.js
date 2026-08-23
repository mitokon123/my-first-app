/**
 * messages.js
 * 画面に表示する文言のテンプレート。文言の変更・翻訳はこのファイルだけで行える。
 *
 * {name} のような波括弧の部分が、実行時に実際の値へ置き換わる。
 * 使用できる差し込み名は各行のコメントを参照。
 */
(function (NS) {
  "use strict";

  NS.rawData.messages = {
    /** 画面をまたいで使う文言 */
    common: {
      back: "戻る"
    },

    battle: {
      encounter:    "野生の {name} が現れた!",              // name
      useSkill:     "{actor} の {skill}!",                  // actor, skill
      miss:         "しかし {target} には当たらなかった!",  // target
      critical:     "会心の一撃!",
      effective:    "効果は抜群だ!",
      resisted:     "効果はいまひとつだ...",
      immune:       "{target} には効かない!",               // target
      damage:       "{target} に {amount} のダメージ!",     // target, amount
      faint:        "{target} は倒れた!",                   // target
      expGained:    "{amount} の経験値を獲得!",             // amount
      goldGained:   "{amount}G を手に入れた!",              // amount
      levelUp:      "{actor} はレベル {level} に上がった!", // actor, level
      skillLearned: "{actor} は {skill} を覚えた!",          // actor, skill
      fleeSuccess:  "うまく逃げ切れた!",
      fleeFailed:   "逃げられない!",
      win:          "戦いに勝った!",
      lose:         "目の前が真っ暗になった...",
      noSkill:      "{actor} は何もできない!",              // actor
      enterField:   "{name} が前に出た!",                   // name
      defend:       "{actor} は身を守っている!",            // actor
      itemDropped:  "{name} を {count}個 手に入れた!",      // name, count
      dropLost:     "{name} を持ちきれなかった...",         // name

      // 味方と敵を見分けるための表示
      enemyNamePrefix: "敵の ",        // ログ上で敵の名前の前に付く
      enemySuffixes: ["A","B","C","D","E","F"]  // 同名の敵が並んだときの印
    },

    scout: {
      attempt:   "{actor} は {name} を仲間に誘った!",        // actor, name
      success:   "やった! {name} が仲間になった!",           // name
      battleEnd: "スカウトに成功し、戦いは終わった。",
      refused:   "しかし {name} は 応じてくれなかった...",   // name
      partyFull: "しかし これ以上連れていけない!",

      // パーティがいっぱいのときに選ぶ行き先
      choiceTitle:  "{name} をどうする?",                    // name
      choiceSwap:   "入れ替える",
      choiceRelease:"逃がす",
      choiceStore:  "拠点に送る",
      choiceHint:   "↑↓: 選択    決定: 決定",
      selectMember: "だれと入れ替える?",
      selectHint:   "↑↓: 選択    決定: 決定    Esc: 戻る",

      swapped:      "{out} と入れ替えて {in} が仲間になった!", // out, in
      swappedNote:  "{out} は拠点へ送られた",                  // out
      released:     "{name} を逃がした。",                     // name
      stored:       "{name} は拠点へ送られた。",               // name
      storageFull:  "拠点がいっぱいで預けられない!"
    },

    command: {
      attack:  "攻撃",
      fight:   "技",
      defend:  "防御",
      scout:   "スカウト",
      item:    "道具",
      flee:    "逃げる",
      back:    "戻る"
    },

    /** 戦闘画面（3対3・素早さ順） */
    battleUi: {
      commandFor:  "{name} は どうする?",                    // name
      selectTarget:"だれに?",
      selectSkill: "どの技?",
      skillStats:  "威力{power}　命中{accuracy}%　PP{pp}",   // power, accuracy, pp
      selectItem:  "どの道具?",
      noItems:     "使える道具がない",
      notEnoughPp: "PPが足りない!",
      itemUsed:    "{actor} は {item} を使った!",            // actor, item
      itemHealed:  "{name} の HPが {amount} 回復した!",      // name, amount
      itemNoEffect:"しかし 効果がなかった",
      enterField:  "{name} が 前に出た!",                    // name
      speedOrder:  "素早さ順に行動!",
      hintCommand: "↑↓: 選択    決定: 決定    Esc: 前の仲間へ",
      hintTarget:  "↑↓: 相手を選ぶ    決定: 決定    Esc: 戻る",
      hintMessage: "決定キーで進む"
    },

    title: {
      subtitle: "モンスター育成 × ローグライク",
      newGame:  "新しく始める",
      continue: "続きから",
      patchNote:"パッチノート",
      noSave:   "セーブデータがありません",
      hint:     "↑↓: 選択    決定: Enter / Space / Z",

      // セーブデータがある状態で「新しく始める」を選んだときの確認
      confirmNewTitle: "セーブデータがあります",
      confirmNewBody:  "新しく始めますか?",
      confirmNewNote:  "※ 次にセーブするまで、続きからは残ります",
      yes:             "はい",
      no:              "いいえ",
      confirmHint:     "↑↓: 選択    決定: 決定    Esc: やめる"
    },

    /** パッチノート（更新履歴） */
    patchNote: {
      title:     "パッチノート",
      subtitle:  "これまでの更新",
      hintList:  "↑↓: バージョン    →/決定: 内容を読む    Esc: 戻る",
      hintNotes: "↑↓: 読み進める    ←: バージョン一覧へ    Esc: 戻る"
    },

    save: {
      saved:           "セーブしました",
      unavailable:     "このブラウザではセーブできません",
      error:           "セーブに失敗しました",
      loaded:          "セーブデータを読み込みました",
      empty:           "セーブデータがありません",
      broken:          "セーブデータが壊れています",
      versionMismatch: "セーブデータの形式が古いです"
    },

    /**
     * 拠点（ホーム）画面。
     * comingSoon は、まだ実装していない項目を選んだときの表示。
     */
    home: {
      title:      "拠点",
      subtitle:   "深き穴のほとり",
      gold:       "所持金 {amount}G",                       // amount
      dungeon:    "ダンジョンへ潜る",
      party:      "仲間",
      shop:       "ショップ",
      craft:      "工房",
      items:      "持ち物",
      dex:        "図鑑",
      save:       "セーブ",
      settings:   "設定",
      comingSoon: "{name} は準備中",                        // name
      statusTitle:"パーティ",
      emptyParty: "仲間がいない",
      hint:       "↑↓: 選択    決定: 決定    Esc: タイトルへ"
    },

    /** ショップ */
    shop: {
      title:        "ショップ",
      subtitle:     "深き穴のほとりの行商",
      tabBuy:       "買う",
      tabSell:      "売る",
      owned:        "所持 {count}",                         // count
      effectLabel:  "効果",

      // 買うときの確認（個数 → はい／いいえ）
      countLabel:   "個数",
      maxCount:     "最大 {max}個まで",                      // max
      unitPrice:    "1個 {price}G",                          // price
      unitSellPrice:"1個 {price}Gで売れる",                  // price
      totalLabel:   "合計",
      afterGold:    "買うと残り {amount}G",                  // amount
      afterGoldSell:"売ると {amount}G になる",               // amount
      confirmBuy:   "{name} を{count}個 {price}Gで買いますか?", // name, count, price
      confirmSell:  "{name} を{count}個 {price}Gで売りますか?", // name, count, price
      yes:          "はい",
      no:           "いいえ",

      bought:       "{name} を{count}個 {price}Gで買った",    // name, count, price
      sold:         "{name} を{count}個 {price}Gで売った",    // name, count, price
      notEnoughGold:"お金が足りない",
      inventoryFull:"持ち物がいっぱいだ",
      cannotSell:   "これは売れない",
      notOwned:     "持っていない",
      noStock:      "並んでいる品物がない",
      nothingToSell:"売れるものがない",
      hint:         "↑↓: 選択    ←→: 買う / 売る    決定: 決定    Esc: 戻る",
      hintQuantity: "↑↓: 1個ずつ    ←→: 10個ずつ    決定: 確認へ    Esc: やめる",
      hintConfirm:  "↑↓: 選択    決定: 決定    Esc: 個数へ戻る"
    },

    /** 工房（素材から作る） */
    craft: {
      title:        "工房",
      subtitle:     "拾った素材から道具を作る",
      materialLabel:"必要な素材",
      costLabel:    "費用",
      effectLabel:  "効果",
      empty:        "まだ作れるものがない",
      crafted:      "{name} を{count}個 作った!",            // name, count
      notEnoughMaterial:"素材が足りない",
      notEnoughGold:"お金が足りない",
      inventoryFull:"持ち物がいっぱいだ",
      yes:          "はい",
      no:           "いいえ",
      hint:         "↑↓: 選択    決定: 作る    Esc: 戻る",
      hintConfirm:  "↑↓: 選択    決定: 決定    Esc: やめる"
    },

    /** 設定画面 */
    settings: {
      title:        "設定",
      subtitle:     "ゲームの設定と操作キーの確認",
      volumeTitle:  "ゲーム設定",
      keysTitle:    "操作キー",
      audioNote:    "※ 音量は音声が未実装のため、保存のみ行われます",
      hint:         "↑↓: 選択    ←→: 変更    Esc: 戻る",
      saved:        "設定を保存しました",
      saveFailed:   "設定を保存できませんでした"
    },

    /** 持ち物画面 */
    items: {
      title:       "持ち物",
      subtitle:    "所持しているアイテム",
      empty:       "何も持っていない",
      countLabel:  "所持数",
      slotsLabel:  "種類 {used}/{max}",              // used, max
      selectTarget:"だれに使う?",
      used:        "{name} の HPが {amount} 回復した!", // name, amount
      noEffect:    "しかし 効果がなかった",
      cannotUse:   "ここでは使えない",
      hintList:    "↑↓: 選択    決定: 使う    Esc: 戻る",
      hintTarget:  "↑↓: 相手を選ぶ    決定: 決定    Esc: やめる"
    },

    /** 図鑑画面 */
    dex: {
      title:        "図鑑",
      subtitle:     "出会ったモンスターと手に入れたアイテム",
      tabMonsters:  "モンスター",
      tabItems:     "アイテム",
      tabAbilities: "特性",
      tabNatures:   "性格",
      tabBlessings: "加護",
      totalLabel:   "全",
      rarityLabel:  "出やすさ: ",
      effectLabel:  "効果",
      natureNote:   "性格は仲間になったときに決まり、あとから変わらない。",
      blessingNote: "加護はダンジョンで階を降りるたびに選ぶ。その挑戦のあいだだけ効く。",
      unknownAbility: "まだ見たことがない特性。",
      ownerLabel:   "持っているモンスター",
      knownLabel:   "判明",
      unknownName:  "???",
      unknownDesc:  "まだ出会っていない。",
      unknownItem:  "まだ手に入れていない。",
      seenLabel:    "発見",
      caughtLabel:  "仲間",
      obtainedLabel:"入手",
      familyLabel:  "分類",
      elementLabel: "属性",
      scoutLabel:   "スカウト率",
      resistanceLabel: "耐性",
      notCaught:    "（未加入）",
      hint:          "↑↓: 選択    ←→: 切替    Esc: 戻る",
      hintScrollable:"↑↓: 選択    ←→: 切替    決定: 説明を読む    Esc: 戻る",
      hintDetail:    "↑↓: 説明をスクロール    決定/Esc: 一覧へ戻る"
    },

    /** ダンジョン選択画面 */
    dungeonSelect: {
      title:      "ダンジョン",
      subtitle:   "挑む場所を選ぶ",
      floorsLabel:"最深 B{floors}F",           // floors
      cleared:    "クリア済",
      locked:     "未開放",
      lockedHint: "{name} をクリアすると挑める", // name
      monstersLabel:"出現するモンスター",
      dropsLabel: "手に入るもの",
      noDrops:    "まだ分かっていない",
      bossLabel:  "主",
      unknownBoss:"？？？",
      hint:       "↑↓: 選択    決定: 挑む    Esc: 戻る"
    },

    /** 仕掛けマス（data/features.js）を踏んだときの文言 */
    feature: {
      chest:        "宝箱を見つけた!",
      chestGot:     "{name} を {count}個 手に入れた!",     // name, count
      chestFull:    "しかし {name} を持ちきれなかった...", // name
      spring:       "澄んだ泉がわいている。",
      springHealed: "仲間のHPとPPが回復した!",
      springFull:   "しかし 誰も疲れていなかった",
      trap:         "罠を踏んでしまった!",
      trapHit:      "仲間はダメージを受けた!",
      trapNoEffect: "しかし 誰にも当たらなかった"
    },

    /** 階を降りたときに選ぶ加護 */
    blessing: {
      title:      "深淵の加護",
      subtitle:   "1つ選ぶ。この挑戦のあいだだけ、仲間全員に効く",
      ownedLabel: "受けている加護:",
      hint:       "↑↓: 選択    決定: 決める"
    },

    /** 1回の挑戦（ラン）の結果 */
    run: {
      lostItems:  "拾ったものを落としてしまった... {list}",  // list
      lostEntry:  "{name}×{count}",                          // name, count
      lostNothing:"拾ったものは何もなかった...",
      separator:  "、"
    },

    dungeon: {
      descend:   "B{floor}F へ降りた",                      // floor
      bossAhead: "強い気配がする...",
      returned:  "拠点へ戻った",
      // 画面下部の情報欄
      infoBar:   "{name} B{floor}F/{floors}F   移動:WASD/矢印   仲間:P   セーブ:F   拠点:Esc"
    },

    boss: {
      appear: "{name} が立ちふさがった!"                    // name
    },

    // エンディングは今は簡素な内容。ボスを増やしたら差し替える想定。
    ending: {
      title:    "クリア!",
      body:     "深淵の王を倒した!",
      thanks:   "遊んでくれてありがとう",
      hint:     "決定キーでタイトルへ"
    },

    party: {
      title:       "仲間",
      empty:       "仲間がいない",
      fainted:     "瀕死",
      leadMark:    "先頭",

      // 預かり所（拠点にいる仲間）
      tabParty:    "連れていく",
      tabStorage:  "預かり所",
      storageEmpty:"預けている仲間はいない",
      // 決定を押したときに出る項目
      actionDeposit:"預かり所へ預ける",
      actionTake:   "パーティに加える",
      actionReorder:"並び替える",
      actionEquip:  "装備",
      actionCancel: "やめる",

      stored:      "{name} を預かり所へ預けた",       // name
      tookOut:     "{name} をパーティに加えた",       // name
      storageFull: "預かり所がいっぱいだ",
      partyFull:   "パーティがいっぱい（先に誰かを預ける）",
      cannotStoreLast: "最後の1体は預けられない",

      // 装備
      equipLabel:   "装備",
      noEquip:      "なし",
      equipTitle:   "{name} に着けるもの",              // name
      unequipLabel: "外す",
      equipped:     "{name} に {item} を着けた",        // name, item
      unequipped:   "{name} を外した",                  // name
      noEquipment:  "着けられる装備がない",
      noEquipmentHint:"ショップや工房で手に入る",
      inventoryFull:"持ち物がいっぱいで外せない",
      allElements:  "全",

      hintNormal:  "↑↓: 選択    ←→: 表の切替    決定: この仲間を選ぶ    Esc: 閉じる",
      hintAction:  "↑↓: 選択    決定: 決定    Esc: やめる",
      hintReorder: "↑↓: 移動先を選ぶ    決定: そこへ入れ替え    Esc: やめる",
      hintStorageEmpty: "預けている仲間はいない    ←→: パーティへ",
      hintEquip:   "↑↓: 選択   決定: 着ける / 外す   Esc: 戻る",
      natureLabel: "性格",
      attackLabel: "攻撃",
      defenseLabel:"防御",
      speedLabel:  "素早さ",
      expLabel:    "次のLvまで",
      skillLabel:  "技",
      abilityLabel:"特性"
    }
  };
})(window.MyGame);
