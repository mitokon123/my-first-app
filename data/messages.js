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
      wait:         "{actor} は ようすを みている...",       // actor
      miss:         "しかし {target} には当たらなかった!",  // target
      critical:     "会心の一撃!",

      // 相性の良し悪しは文章では知らせない（空にすると、その行は出なくなる）。
      // 数字と画面の効果で伝える。
      //   抜群 … 橙に光って揺れる／いまひとつ … 数字が小さく灰色になる
      // 文章で出したくなったら、ここに文言を書き戻すだけでよい。
      effective:    "",
      resisted:     "",

      // 「効かない」はダメージ0の理由が分からなくなるため残す
      immune:       "{target} には効かない!",               // target
      damage:       "{target} に {amount} のダメージ!",     // target, amount
      faint:        "{target} は倒れた!",                   // target

      // バフ／デバフ（data/skills.js の modifier）。
      // 技ごとの言い回しは skills.js の modifier.message に書ける。
      // 書かなかった技は、ここの文がそのまま使われる
      modifierUp:   "{target} は {skill} で 力を高めた!",    // target, skill
      modifierDown: "{target} は {skill} で 力を そがれた!", // target, skill
      modifierAgain:"{target} の {skill} を かけ直した!",    // target, skill
      modifierEnd:  "{target} の {skill} の効果が切れた。",  // target, skill

      // 状態異常。ふつうは data/statuses.js に書いた言い回し
      // （message / tickMessage / cureMessage / blockMessage）が使われる。
      // ここの文は、statuses.js にその言い回しを書かなかったときの受け皿
      // 状態異常の文は「！」を付けない（statuses.js の言い回しと揃える）
      statusApplied: "{target} は {status} になった",         // target, status
      statusDamage:  "{target} は {status} で {amount} のダメージ", // target, status, amount
      statusEnd:     "{target} の {status} が治った。",        // target, status
      statusBlocked: "{target} は {status} で動けない",        // target, status
      statusMiss:    "しかし {target} には効かなかった",       // target, status
      statusImmune:  "{target} には {status} が効かない",      // target, status
      // 与えたダメージの一部を自分のHPに変える技（data/skills.js の drain）
      drained:      "{target} は {amount} 吸い取った!",      // target, amount
      // HPを回復する技（data/skills.js の heal）
      healed:       "{target} の HPが {amount} 回復した!",   // target, amount
      healFull:     "しかし {target} は 元気なままだ",       // target
      expGained:    "{amount} の経験値を獲得!",             // amount
      goldGained:   "{amount}G を手に入れた!",              // amount
      levelUp:      "{actor} はレベル {level} に上がった!", // actor, level
      skillLearned: "{actor} は {skill} を覚えた!",          // actor, skill
      fleeSuccess:  "うまく逃げ切れた!",
      fleeFailed:   "逃げられない!",
      win:          "戦いに勝った!",
      lose:         "目の前が真っ暗になった...",
      noSkill:      "{actor} は何もできない!",              // actor
      defend:      "{actor} は身を守っている!",            // actor
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
      // ターンの頭の「戦う／逃げる」
      go:      "戦う",
      flee:    "逃げる",
      // 仲間ごとのコマンド
      attack:  "攻撃",
      fight:   "技",
      defend:  "防御",
      scout:   "スカウト",
      swap:    "交代",
      item:    "道具",
      inspect: "状態を見る",
      // 倒れている仲間の枠で「交代しない」を選ぶとき（そのまま次の仲間の番へ）
      skip:    "そのまま",
      back:    "戻る"
    },

    /** 戦闘画面（3対3・素早さ順） */
    battleUi: {
      // ターンの頭
      turnPrompt:  "どうする?",
      hintTurn:    "↑↓: 選択    決定: 決定",
      cannotFlee:  "主からは逃げられない!",
      // 状態を見る
      inspectNone: "状態異常なし",
      turnsLeft:   "あと{n}ターン",                        // n
      turnsLasting:"治すまで続く",
      hintInspect: "←→: 別の相手を見る    決定/Esc: 戻る",

      commandFor:  "{name} は どうする?",                    // name
      selectTarget:"だれに?",
      selectSkill: "どの技?",
      skillStats:  "威力{power}　命中{accuracy}%　PP{pp}",   // power, accuracy, pp
      selectItem:  "どの道具?",
      noItems:     "使える道具がない",
      notEnoughPp: "PPが足りない!",

      // 掛かっている強化・弱体の印は絵で出す（data/ui.js の icons、data/sprites_icons.js）

      itemUsed:    "{actor} は {item} を使った!",            // actor, item
      // 効果の種類ごとに文を分ける（持ち物画面の used と同じ考え方）
      itemHealed: {
        healHp:     "{name} の HPが {amount} 回復した!",     // name, amount
        healPp:     "{name} の PPが {amount} 戻った!",       // name, amount
        cureStatus: "{name} の 状態異常が治った!",            // name
        default:    "{name} に効果があった"                  // name
      },
      itemNoEffect:"しかし 効果がなかった",
      // 交代（その仲間のこのターンの行動になる）。
      // 倒れた仲間は自動では下がらない。次のターンに交代だけ選べる
      commandFainted: "{name} は 倒れている",               // name
      selectSwap:  "だれと交代する?",
      noReserve:   "控えの仲間がいない",
      swapped:     "{out} は 下がり {in} が 前に出た!",       // out, in
      swapFailed:  "交代できなかった",
      hintSwap:    "↑↓: 選ぶ    決定: 交代    Esc: 戻る",
      hintCommand: "↑↓: 選択    決定: 決定    Esc: 前の仲間へ",
      // 相手は横一列に並んでいるので、左右で選ぶ
      hintTarget:  "←→: 相手を選ぶ    決定: 決定    Esc: 戻る"
    },

    title: {
      subtitle: "モンスター育成 × ローグライク",
      newGame:  "新しく始める",
      continue: "続きから",
      // 探索を中断したファイルがあるときだけ出る
      resume:   "中断したところから",
      // バージョン表記の隣のアイコン。カーソルを乗せたときだけ出す
      patchNote:"パッチノート",
      hint:     "↑↓: 選択    決定: Enter / Space / Z",
      // 左下のクレジット1件ぶん。{label} {name} {url} は data/audio.js の credits から
      credit:   "{label}：{name} {url}",

      // 「続きから」を選んだが、3つとも空だったとき。
      // 空の一覧を見せても選べるものが無いので、ここで止める
      noSaveAny: "セーブデータがありません"
    },

    /** パッチノート（更新履歴） */
    patchNote: {
      title:     "パッチノート",
      subtitle:  "これまでの更新",
      empty:     "このバージョンはまだ開発中です。",
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
      blessing:   "加護を選ぶ",
      items:      "持ち物",
      dex:        "図鑑",
      help:       "遊び方",
      save:       "セーブ",
      settings:   "設定",
      comingSoon: "{name} は準備中",                        // name
      locked:     "{name} は {required} をクリアすると使える", // name, required
      lockedShort:"{name} はまだ使えない",                   // name
      statusTitle:"パーティ",
      emptyParty: "仲間がいない",
      hint:       "↑↓: 選択    決定: 決定    Esc: タイトルへ"
    },

    /**
     * 主人公の名前と服の色を決める画面。
     * 新しく始めるときと、あとから設定で変えるときの両方で使う。
     */
    playerSetup: {
      titleNew:  "あなたのこと",
      titleEdit: "名前と見た目",
      subtitle:  "あとから設定でいつでも変えられます",

      nameLabel:  "なまえ",
      nameAction: "決定で変える",
      nameTitle:  "あなたの名前を決める",
      colorLabel: "ふくの色",

      start: "この姿で始める",
      apply: "この内容にする",

      hintNew:  "↑↓: 選択    ←→: 色を選ぶ    決定: 決定",
      hintEdit: "↑↓: 選択    ←→: 色を選ぶ    決定: 決定    Esc: 戻る"
    },

    /**
     * セーブファイルを選ぶ画面。
     * 「新しく始める」と「続きから」の両方がここを通るので、
     * 見出しと問いかけだけを場合ごとに分けている。
     */
    saveSlot: {
      titleNew:      "どこに記録しますか",
      subtitleNew:   "選んだファイルに、この冒険が記録されます",
      titleContinue: "つづきから",
      subtitleContinue: "遊ぶファイルを選んでください",
      // 拠点のセーブ。書き込む先を選ぶ（いま遊んでいるファイルが最初に選ばれている）
      titleSave:     "どこにセーブしますか",
      subtitleSave:  "いま遊んでいるのは スロット{n} です",   // n
      // 中断したところから再開する
      titleResume:    "中断したところから",
      subtitleResume: "再開するファイルを選んでください",

      slotLabel: "スロット{n}",                      // n
      empty:     "空き",
      broken:    "読み込めません（形式が違います）",
      party:     "{name} Lv{level}   ほか{rest}体",  // name, level, rest
      status:    "{gold}G   クリア {cleared}",       // gold, cleared
      place:     "{name} B{floor}F",                 // name, floor
      atHome:    "拠点",
      // 合計プレイ時間。1時間未満は「12分」、それ以上は「3時間45分」
      playTime:     "{h}時間{m}分",                  // h, m
      playTimeMin:  "{m}分",                         // m
      // 探索を中断したところがあるファイル
      suspended: "中断中: {name} B{floor}F",         // name, floor

      // 選べないスロットを選ぼうとしたとき
      emptyNote:  "このファイルにはデータがありません",
      brokenNote: "このファイルは読み込めません",

      // 確認（はい／いいえ）。上書きになるときだけ文を変える
      confirmNew:           "スロット{n} で始めますか?",            // n
      confirmNewBody:       "このファイルに記録していきます",
      confirmOverwrite:     "スロット{n} を上書きします",           // n
      confirmOverwriteBody: "{name} Lv{level} のデータが消えます",  // name, level
      confirmNote:          "※ 消したデータは戻せません",
      confirmLoad:          "スロット{n} で遊びますか?",            // n
      confirmLoadBody:      "{name} Lv{level} から再開します",      // name, level
      // 拠点のセーブ。別のファイルに中身があるときは「上書き」の文を使う
      confirmSave:          "スロット{n} にセーブしますか?",         // n
      confirmSaveBody:      "いまの状態を記録します",
      // 中断からの再開
      confirmResume:        "スロット{n} の続きを再開しますか?",     // n
      confirmResumeBody:    "{place} から再開します",                // place
      confirmResumeNote:    "※ 再開すると中断したところは消えます",
      // 中断したファイルを「つづきから」で選んだとき（中断のほうが新しいので、そこから）
      resumeNote:           "中断したところから再開します",
      yes: "はい",
      no:  "いいえ",

      /**
       * --- ファイルの整理（コピー・移動・削除）---
       * 「つづきから」の一覧で Q/E を押すと入る。
       */
      titleManage:    "ファイルの整理",
      subtitleManage: "コピー・移動・削除ができます",
      titleCopyTo:    "どこにコピーしますか",
      titleMoveTo:    "どこへ移しますか",
      subtitlePick:   "スロット{n} の行き先を選んでください",   // n

      // 画面右下のボタン（マウスだけの人のための出入り口）
      manageButton:     "整理する",
      manageButtonExit: "整理をやめる",

      actionTitle:  "スロット{n} をどうしますか",              // n
      actionCopy:   "コピーする",
      actionMove:   "移動する",
      actionDelete: "削除する",
      actionBack:   "やめる",

      sameSlotNote: "同じファイルは選べません",

      confirmDelete:      "スロット{from} を削除しますか?",           // from
      confirmDeleteBody:  "このファイルのデータが消えます",
      confirmCopy:        "スロット{from} をコピーしますか?",         // from
      confirmMove:        "スロット{from} を移しますか?",             // from
      // 行き先が空きのとき／中身があるとき
      confirmPlainBody:   "スロット{to} に入れます",                  // to
      confirmReplaceBody: "スロット{to} の {name} Lv{level} が消えます", // to, name, level

      // 結果の知らせ（SaveManager が返す reason をそのまま引く）
      copied:  "コピーしました",
      moved:   "移しました",
      deleted: "削除しました",
      empty2:  "",
      sameSlot:"同じファイルは選べません",
      error:   "うまくいきませんでした",

      hint:           "↑↓: 選択    決定: 決定    Esc: タイトルへ",
      hintSave:       "↑↓: 選択    決定: ここにセーブ    Esc: 拠点へ",
      hintWithManage: "↑↓: 選択    決定: 遊ぶ    Q/E: ファイルの整理    Esc: タイトルへ",
      hintManaging:   "↑↓: 選択    決定: このファイルを整理    Q/E: 整理をやめる",
      hintAction:     "↑↓: 選択    決定: 決定    Esc: やめる",
      hintPick:       "↑↓: 行き先を選ぶ    決定: 決定    Esc: 戻る",
      hintConfirm:    "↑↓: 選択    決定: 決定    Esc: やめる"
    },

    /**
     * 初めての場面で出る説明（ふきだし）。
     * 中身は data/tutorial.js。ここは操作の案内だけ。
     *
     * ★ Esc の案内を必ず出すこと。「いつでもやめられる」ことが分からないと、
     *   説明を邪魔だと感じた人の逃げ道が無くなる。
     */
    tutorial: {
      hintMore: "決定: 次へ（残り{count}）    Esc: これ以降は出さない",  // count
      hintLast: "決定: 閉じる    Esc: これ以降は出さない"
    },

    /**
     * 遊び方（よくある質問）。
     * 質問と答えそのものは data/help.js が持つ。ここは画面まわりだけ。
     */
    help: {
      title:    "遊び方",
      subtitle: "困ったときに読む",
      // 答えの送りは Q/E。↑↓ は質問を選ぶのに使っているため
      hint:     "↑↓: 質問を選ぶ    Q/E・ホイール: 答えを送る    Esc: 戻る"
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
      // ★ 持ち物の種類数に上限は無い（枠が埋まって買えないことは起きない）。
      //   出るのは「その品を持てる数（items.js の maxStack）」に達したときだけ
      stackFull:    "これ以上は持てない",
      cannotSell:   "これは売れない",
      notOwned:     "持っていない",
      noStock:      "並んでいる品物がない",
      nothingToSell:"売れるものがない",
      // 加護を売る店（data/shop.js の type: "blessing"）
      //   ★ ここは owned にしないこと。上の owned（"所持 {count}"）と
      //     同じ名前で二重に書いてあり、こちらが勝って
      //     品物の説明欄の「所持 3」から個数が消えていた
      blessingOwned:  "所持",
      blessingPrice:  "{price}G",                        // price
      // 買ったあと、いま選択肢に入っているかどうか（入れておける数に上限がある）
      blessingActive:   "選択肢に入っている",
      blessingInactive: "外している（拠点で入れ替える）",
      noBlessings:    "売り物がない",
      confirmBlessing:"{name} を {price}Gで買いますか?",   // name, price
      blessingBought: "{name} を {price}Gで手に入れた",   // name, price
      // 選択肢に入れておける数がいっぱいのとき、続けて出す
      blessingFull:   "（選択肢がいっぱい。拠点で入れ替える）",
      already:        "もう持っている",
      notForSale:     "これは売り物ではない",
      hint:         "↑↓: 選択    ←→: 買う / 売る    決定: 決定    Esc: 戻る",
      // 2軒以上開いているときだけ、店の移動を案内する
      hintShops:    "↑↓: 選択    ←→: 買う/売る    Q/E: 店を変える    決定: 決定    Esc: 戻る",
      // 数字の左右に ◀▶ が出ているので、左右が1個ずつ・上下がまとめて
      hintQuantity: "←→: 1個ずつ    ↑↓: 10個ずつ    決定: 確認へ    Esc: やめる",
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
      // 買うときと同じで、出るのは maxStack に達したときだけ
      stackFull:    "これ以上は持てない",
      yes:          "はい",
      no:           "いいえ",
      hint:         "↑↓: 選択    決定: 作る    Esc: 戻る",
      hintConfirm:  "↑↓: 選択    決定: 決定    Esc: やめる"
    },

    /** 加護を選ぶ画面（拠点） */
    blessingSelect: {
      title:      "加護を選ぶ",
      subtitle:   "潜ったときに選択肢へ出る加護を決める",
      count:      "編成 {active}/{max}",           // active, max
      markOn:     "◆ ",   // 入れている加護の印
      markOff:    "・ ",   // 外している加護の印
      rarityLabel:"出やすさ",
      stateOn:    "選択肢に入れている",
      stateOff:   "選択肢から外している",
      // 等級ごとの編成数。0個の等級があると、その枠は選択肢に出てこない
      tierLabel:  "等級ごとの編成",
      tierRow:    "{name}  {rate}%  {count}個",    // name, rate, count
      turnedOn:   "{name} を選択肢に入れた",       // name
      turnedOff:  "{name} を選択肢から外した",     // name
      // 上限に達しているとき。どれかを外してから、と伝える
      full:       "編成は{max}個まで。どれかを外してから入れる",  // max
      notOwned:   "まだ持っていない",
      empty:      "持っている加護がない",
      hint:       "↑↓: 選択    決定: 入れる / 外す    Esc: 戻る"
    },

    /** 設定画面 */
    settings: {
      // 別の画面を開く項目（type: "action"）を選んでいるときに出す案内
      openAction: "決定で開く",
      title:        "設定",
      subtitle:     "ゲームの設定と操作キーの確認",
      volumeTitle:  "ゲーム設定",
      keysTitle:    "操作キー",
      // ※ 音源ファイルを1つも置いていないうちは、音量を変えても何も鳴らない。
      //   その状態でも「壊れている」と思われないよう、一言添えてある
      audioNote:    "※ 音源を入れていない場合、音量を変えても音は鳴りません",
      hint:         "↑↓: 選択    ←→: 変更    Q/E・ホイール: 操作キーを送る    Esc: 戻る",
      saved:        "設定を保存しました",
      saveFailed:   "設定を保存できませんでした"
    },

    /** 持ち物画面 */
    items: {
      title:       "持ち物",
      subtitle:    "所持しているアイテム",
      empty:       "何も持っていない",
      countLabel:  "所持数",
      // 種類数に上限は無いので、持っている数だけを出す
      slotsLabel:  "{used}種類",                     // used
      selectTarget:"だれに使う?",
      /**
       * 使ったあとの知らせ。**効果の種類ごとに文を分ける**。
       * 種類は data/items.js の effect.type（js/systems/ItemUsage.js が処理する）。
       *
       * ★ 以前は1つの文しか無く、精気の実（PP回復）でも
       *   「HPが 5 回復した!」と出てしまっていた。
       * 新しい効果を足したら、ここにも1行足す。書かなければ default が使われる
       */
      used: {
        healHp:     "{name} の HPが {amount} 回復した!",  // name, amount
        healPp:     "{name} の PPが {amount} 戻った!",    // name, amount
        cureStatus: "{name} の 状態異常が治った!",         // name
        default:    "{name} に {item} を使った"           // name, item
      },
      usedAlone:   "{item} を使った",                   // item（相手を選ばないもの）
      noEffect:    "しかし 効果がなかった",
      cannotUse:   "ここでは使えない",
      hintList:    "↑↓: 選択    決定: 使う    Esc: 戻る",
      hintTarget:  "↑↓: 相手を選ぶ    決定: 決定    Esc: やめる"
    },

    /** 図鑑画面 */
    /** 名前をつける文字盤 */
    naming: {
      titleRename: "{name} の名前を決める",   // name（いまの名前・新規につけるときも同じ）
      hint:        "↑↓←→: 選ぶ    決定: 入れる    Q/E: かな切替    Esc: 1文字消す",
      renamed:     "{old} は {new} になった!", // old, new
      keptName:    "名前はそのままにした。"
    },

    dex: {
      title:        "図鑑",
      subtitle:     "出会ったモンスターと手に入れたアイテム",
      tabMonsters:  "モンスター",
      tabItems:     "アイテム",
      tabAbilities: "特性",
      tabSkills:    "技",
      tabNatures:   "性格",
      tabBlessings: "加護",
      totalLabel:   "全",
      rarityLabel:  "出やすさ: ",
      effectLabel:  "効果",
      natureNote:   "性格は仲間になったときに決まり、あとから変わらない。",
      blessingNote: "加護はダンジョンで階を降りるたびに選ぶ。その挑戦のあいだだけ効く。",
      // 謎の商人から買うまで伏せておく加護の説明
      blessingLockedNote: "まだ手にしていない加護。買えば選択肢に混ざるようになる。",
      unknownAbility: "まだ見たことがない特性。",
      unknownSkill: "まだ見たことがない技。",
      ownerLabel:   "持っているモンスター",
      learnerLabel: "覚えるモンスター",
      powerLabel:   "威力",
      powerNormal:  "通常攻撃と同じ",
      modifierLabel:"効果",
      durationLabel:"{n}ターン",       // n
      selfTarget:   "（自分にかける）",
      // 状態異常をあたえる技。確率は相手の耐性で下がるので、そのことも添える
      statusLabel:  "状態異常",
      statusNote:   "相手の耐性で通りにくくなる",
      ppLabel:      "消費PP",
      accuracyLabel:"命中",
      criticalLabel:"会心",
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
      // アイテムの出どころ（落とすモンスター・宝箱）。会っていない相手は名前と確率を伏せる
      sourceLabel:  "手に入る場所",
      sourceNone:   "落とす相手はいない（店か工房で）",
      sourceDrop:   "{name}  {rate}%",       // name, rate
      sourceChest:  "宝箱（どこでも）",
      sourceChestAt:"宝箱（{name}）",         // name
      // 落とすもの。一度仲間にすると、その種族から取れるものが全て見える
      dropLabel:    "落とすもの",
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
      // まだ開放されていない場所は、名前も雰囲気も伏せる
      unknownName: "？？？",
      monstersLabel:"出現するモンスター",
      dropsLabel: "手に入るもの",
      noDrops:    "まだ分かっていない",
      bossLabel:  "主",
      unknownBoss:"？？？",
      hint:       "↑↓: 選択    決定: 挑む    Esc: 戻る"
    },

    /**
     * 仕掛けマス（data/features.js）を踏んだときの文言。
     *
     * ★ ここのキーは**コードに名前が書かれていない**。
     *   FeatureSystem が仕掛けのidから組み立てて引く。
     *     texts[id]             … 踏んだときの文（chest / spring / trap）
     *     texts[id + "Prompt"]  … 使うか聞く文（confirm: true の仕掛けだけ）
     *     texts[id + "Skipped"] … 使わずにおいたときの文
     *   「どこからも呼ばれていない」と早合点して消さないこと。
     *   仕掛けを増やすときは、同じ並びでキーを足せばコードは触らなくてよい。
     */
    feature: {
      chest:        "宝箱を見つけた!",
      chestGot:     "{name} を {count}個 手に入れた!",     // name, count
      chestFull:    "しかし {name} を持ちきれなかった...", // name
      spring:       "澄んだ泉がわいている。",
      springHealed: "仲間のHPとPPが回復した!",
      springFull:   "しかし 誰も疲れていなかった",
      // 使うかどうかを聞くとき（data/features.js の confirm: true）
      //   〇〇Prompt の 〇〇 は仕掛けのid。新しい仕掛けにも同じ書き方で足せる
      springPrompt: "澄んだ泉がわいている。\n水を浴びますか?",
      springSkipped:"泉には手をつけなかった",
      confirmYes:   "使う",
      confirmNo:    "やめておく",
      trap:         "罠を踏んでしまった!",
      trapHit:      "仲間はダメージを受けた!",
      trapNoEffect: "しかし 誰にも当たらなかった"
    },

    /** 階を降りたときに選ぶ加護 */
    blessing: {
      title:      "深淵の加護",
      subtitle:   "1つ選ぶ。この挑戦のあいだだけ、仲間全員に効く",
      ownedLabel: "受けている加護:",
      // 選択肢が3つに満たなかったとき。理由を出さないと不具合に見える
      //   （等級を引いてから中身を選ぶので、その等級を編成していないと枠が空になる）
      fewChoices: "編成している加護が偏っているので、選択肢が減っている",
      hint:       "↑↓: 選択    決定: 決める"
    },

    /** 挑戦の結果画面（拠点へ戻る前に出る） */
    result: {
      escaped:     "帰還",
      cleared:     "討伐",
      scouted:     "勧誘",
      defeated:    "全滅",
      reached:     "{name}  B{floor}F まで",              // name, floor
      gold:        "手に入れたゴールド  {amount}G",       // amount
      gainedLabel: "持ち帰ったもの",
      lostLabel:   "落としてきたもの",
      nothing:     "何も持ち帰れなかった",
      // はじめてクリアしたときだけ出る。手動セーブのゲームなので、
      // 黙って書き換えると気づけない
      savedNote:   "クリアを記録しました（セーブ済み）",
      toHome:      "拠点へ",
      hint:        "↑↓・ホイール: 送る    決定/クリック: 拠点へ"
    },

    dungeon: {
      // 地図に重ねるボタン（キーボードの P / I と同じ）
      buttonParty: "仲間",
      buttonItems: "持ち物",

      // 階段で出す問いかけ（ここでしか引き返せない）
      stairsPrompt:  "下へ続く階段がある。\nどうする?",
      bossPrompt:    "この先に強い気配がする。\nどうする?",
      choiceDescend: "次の階へ降りる",
      choiceFight:   "主に挑む",
      choiceReturn:  "拠点へ戻る",
      choiceStay:    "まだ残る",
      cannotLeave:   "ここからは戻れない（階段か 帰還の石が要る）",
      descend:   "B{floor}F へ降りた",                      // floor
      bossAhead: "強い気配がする...",
      // ※ 毒の歩きダメージには知らせを出さない。
      //   5歩ごとに画面中央を遮ってしまうため。左上のパーティ表示で分かる
      // 中断（探索中にセーブは無い。中断して置いておき、タイトルから再開する）
      suspendPrompt: "ここで中断して タイトルへ戻りますか?\n再開すると 中断したところは消えます",
      suspendYes:    "中断する",
      suspendNo:     "やめる",
      // 画面下部の情報欄
      infoBar:   "{name} B{floor}F/{floors}F  移動:WASD/矢印  仲間:P  持ち物:I  中断:F"
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

      // 預かり所（拠点にいる仲間）
      tabParty:    "連れていく",
      tabStorage:  "預かり所",
      storageEmpty:"預けている仲間はいない",
      // 決定を押したときに出る項目
      actionInspect:"様子を見る",
      actionDeposit:"預かり所へ預ける",
      actionTake:   "パーティに加える",
      actionReorder:"並び替える",
      actionName:    "名前を変える",
      actionEquip:  "装備",
      actionCancel: "やめる",

      stored:      "{name} を預かり所へ預けた",       // name
      tookOut:     "{name} をパーティに加えた",       // name
      storageFull: "預かり所がいっぱいだ",
      partyFull:   "パーティがいっぱい（先に誰かを預ける）",
      cannotStoreLast: "最後の1体は預けられない",

      // 耐性（装備の分まで足したあとの値を全属性ぶん出す。装備で動いたぶんは「(+3)」と隣に出る）
      resistanceLabel: "属性への耐性",
      // 状態異常への耐性。狭い詳細欄には入らないので「様子を見る」でだけ出す
      statusResistLabel: "状態異常への耐性",
      // 特性と装備でいま効いている効果をまとめた欄（「様子を見る」の右下）。
      // ステータスや耐性の加算は数値の隣に「(+15)」と出ているので、ここには並べない
      effectLabel: "効果",

      // 装備
      equipLabel:   "装備",
      // 枠の名前は data/categories.js の equipSlot。
      // 一覧では「武器：灼牙の戦刃」「防具：-」のように枠ごとに出す
      slotEmpty:    "-",
      // 一覧の詳細欄（狭い）では、空いている枠を数でまとめる
      slotsEmpty:   "空き {n}",                         // n
      equipTitle:   "{name} に着けるもの",              // name
      unequipLabel: "外す",
      equipped:     "{name} に {item} を着けた",        // name, item
      // 枠が埋まっていたので、先に着けていたものと入れ替えた
      equipSwapped: "{out} を外して {item} を着けた",   // out, item
      unequipped:   "{name} を外した",                  // name
      // 同じ装備は2つ着けられない（アクセサリー枠が2つあっても）
      equipDuplicate: "{item} はもう着けている",        // item
      noEquipment:  "着けられる装備がない",
      noEquipmentHint:"ショップや工房で手に入る",
      // 同じ装備を maxStack いっぱいまで持っているときだけ出る（めったに無い）
      stackFull:    "これ以上は持てないので外せない",
      allElements:  "全",

      hintNormal:  "↑↓: 選択    ←→: 表の切替    決定: この仲間を選ぶ    Esc: 閉じる",
      // 探索中（預かり所へ手が届かないとき）
      hintNoStorage: "↑↓: 選択    決定: この仲間を選ぶ    Esc: 探索へ戻る",
      hintAction:  "↑↓: 選択    決定: 決定    Esc: やめる",
      hintReorder: "↑↓: 移動先を選ぶ    決定: そこへ入れ替え    Esc: やめる",
      hintStorageEmpty: "預けている仲間はいない    ←→: パーティへ",
      hintEquip:   "↑↓: 選択   決定: 着ける / 外す   Esc: 戻る",
      hintInspect: "↑↓: 別の仲間を見る    決定/Esc: 一覧へ戻る",
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
