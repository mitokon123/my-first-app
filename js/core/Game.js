/**
 * Game.js
 * ゲーム全体の統括。各マネージャ（入力・シーン・ループ）を保持し、
 * データ(GameData)への参照を各シーンへ橋渡しする。
 */
(function (NS) {
  "use strict";

  /**
   * @param {HTMLCanvasElement} canvas
   * @param {MyGame.GameData} gameData
   * @param {MyGame.AssetLoader} assets スプライト等の描画物
   */
  function Game(canvas, gameData, assets) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.data = gameData;
    this.assets = assets;

    // プレイヤー設定。画面をまたいで保持し、中身はセーブファイルごとに切り替わる
    // （ファイルを選ぶまでは、最後に遊んだファイルの設定）
    this.settings = new NS.SettingsManager(gameData);
    // キャンバスを渡すことで、マウス操作も受け取れるようにする。
    // 設定も渡すことで、ホイールの速さが設定画面の値に従う
    this.input = new NS.Input(gameData.keys, canvas, this.settings);
    // 画面の切り替えを暗転でつなぐ（長さと色は data/ui.js の transition）
    this.scenes = new NS.SceneManager((gameData.ui || {}).transition);
    this.loop = new NS.GameLoop(this._update.bind(this), this._render.bind(this));

    // セーブの窓口。どの画面からでも同じ中身で書き出せるよう、ここで1つだけ持つ
    // （画面ごとに保存する項目を書き並べていたころは、項目を増やすと入れ忘れが起きた）
    this.saveManager = new NS.SaveManager(gameData);
    this._migrateSettings();

    // 初めての場面で出す説明。どの画面からも同じ記録を見るので、ここで1つだけ持つ
    this.tutorial = new NS.TutorialSystem(gameData, this.settings);
    // 物語の場面。見た記録はチュートリアルと同じくセーブファイルごと
    this.story = new NS.StorySystem(gameData);

    // 音。画面をまたいでBGMを流し続けるので、ここで1つだけ持つ
    this.audio = new NS.AudioManager(gameData, this.settings);

    // 起動からの経過ミリ秒。絵の動き（MyGame.Motion）が参照する共通の時計。
    // シーンごとに時間を数えなくて済むよう、ここで1つだけ持つ。
    this.clock = 0;

    // そのセーブファイルの合計プレイ時間（ミリ秒）。セーブファイル選択の一覧に出す。
    //   clock と分けてあるのは、clock が「起動してからの時間」で
    //   ファイルをまたいで進み続けるため。こちらは読み込むとその値に戻る。
    //   新しく始めたときは 0 から（Game.startNewGame）
    this.playTime = 0;

    // ドット絵をぼかさずに描画する
    this.ctx.imageSmoothingEnabled = false;
  }

  /**
   * いま遊んでいるセーブファイルを決める。
   *
   * ★ 保存の入口は saveProgress() ひとつなので、ここで向き先を変えておけば、
   *   拠点のセーブも探索中のセーブも初クリアの自動セーブも、
   *   すべて同じファイルへ書かれる。呼び出し側は何も知らなくてよい。
   *
   * @param {number} slot 1〜（data/save.js の slotCount）
   */
  Game.prototype.setSaveSlot = function (slot) {
    var n = this.saveManager.setSlot(slot);
    // 設定の書き先も同じファイルへ向ける。値は変えない
    // （拠点で別のファイルへセーブしたら、いまの設定ごとそちらへ移る）
    this.settings.bindFile(this.saveManager.settingsKeyFor(n));
    return n;
  };

  // --- 設定はセーブファイルごと（SettingsManager の冒頭を参照） ---

  /** いまのファイルの設定を読む（続きから・中断から） */
  Game.prototype.loadFileSettings = function () {
    this.settings.useFile(this.saveManager.settingsKeyFor(this.saveManager.slot));
    this.audio.applyVolume();
  };

  /** 新しく始めたファイルの設定。既定値から（書くのは最初のセーブのとき） */
  Game.prototype.resetFileSettings = function () {
    this.settings.useNewFile(this.saveManager.settingsKeyFor(this.saveManager.slot));
    this.audio.applyVolume();
  };

  /** タイトルに戻ったとき。最後に遊んだファイルの設定にする */
  Game.prototype.useTitleSettings = function () {
    this.settings.useShared();
    this.audio.applyVolume();
  };

  /**
   * ファイルごとに分ける前の共通の設定を、中身のあるファイルへ写す（起動時に1回）。
   * 写さないと、分ける前から遊んでいたファイルの音量などが既定値に戻ってしまう
   */
  Game.prototype._migrateSettings = function () {
    var keys = [];
    for (var i = 1; i <= this.saveManager.slotCount; i++) {
      if (this.saveManager.hasSave(i) || this.saveManager.hasSuspend(i)) {
        keys.push(this.saveManager.settingsKeyFor(i));
      }
    }
    this.settings.migrateShared(keys);
  };

  /** いま遊んでいるセーブファイルの番号 */
  Game.prototype.getSaveSlot = function () {
    return this.saveManager.slot;
  };

  /**
   * 進行データ（パーティ・持ち物・発見記録）が無ければ初期状態を用意する。
   * 拠点・探索のどちらから始めても同じ状態になるよう、ここに集約している。
   * 既にあるものはそのまま残す（セーブから復元した場合など）。
   */
  /**
   * 主人公の名前。決めていなければ data/player.js の defaultName。
   *
   * ★ セーブファイルごとに別々。設定（SettingsManager）に持たせていないのは、
   *   3つのファイルで別の冒険をしているのに、名前だけ共通になってしまうため。
   */
  Game.prototype.getPlayerName = function () {
    return this.playerName || (this.data.player || {}).defaultName || "";
  };

  /** 主人公の服の色。無い色を指していたら既定の色に落とす */
  Game.prototype.getPlayerColor = function () {
    if (!NS.PlayerLook) return this.playerColor || null;
    return NS.PlayerLook.resolveColorId(this.data, this.playerColor);
  };

  /**
   * 主人公の性別（data/player.js の genders の id）。無い id なら既定に落とす。
   * ★ ゲームの進み方には何も影響しない。選んだものを覚えておくだけ
   */
  Game.prototype.getPlayerGender = function () {
    var player = this.data.player || {};
    var list = player.genders || [];
    for (var i = 0; i < list.length; i++) {
      if (list[i].id === this.playerGender) return this.playerGender;
    }
    return player.defaultGender || (list[0] ? list[0].id : null);
  };

  /** 主人公の一人称。物語の台詞の {me} に差し込まれる */
  Game.prototype.getPlayerFirstPerson = function () {
    var player = this.data.player || {};
    var list = player.firstPersons || [];
    if (this.playerFirstPerson && list.indexOf(this.playerFirstPerson) >= 0) return this.playerFirstPerson;
    return player.defaultFirstPerson || list[0] || "";
  };

  Game.prototype.ensureProgress = function () {
    var random = new NS.Random();

    if (!this.party || this.party.isEmpty()) {
      this.party = NS.Party.createStarting(this.data, random);
    }
    if (!this.inventory) {
      this.inventory = NS.Inventory.createStarting(this.data);
    }
    if (!this.storage) {
      this.storage = new NS.MonsterStorage((this.data.config || {}).storageMax);
    }
    if (!this.discovery) {
      this.discovery = new NS.Discovery();
    }
    if (!this.clearedDungeons) {
      this.clearedDungeons = {};
    }
    if (!this.boughtBlessings) {
      this.boughtBlessings = {};
    }
    if (!this.offBlessings) {
      this.offBlessings = {};
    }
    if (!this.doneEvents) {
      this.doneEvents = {};
    }
    if (typeof this.gold !== "number") {
      this.gold = (this.data.player || {}).startingGold || 0;
    }
    this._recordInitialDiscoveries();
  };

  /**
   * いまの進行状況を書き出す。
   *
   * 保存する中身をここ1か所にまとめてあるので、
   * 持ち物や加護のように「挑戦をまたいで残るもの」を増やしても、
   * 画面ごとに書き足す必要がない。
   *
   * @param {object} [dungeonState] 探索中に呼ぶときだけ渡す。
   *   { dungeonId, floor, rows, playerCol, playerRow } —— 同じ場所から再開するために使う。
   *   dungeonId は再開には要らないが、セーブファイルの一覧に
   *   「苔むす坑道 B2F」と出すために持っておく。
   *   省略すると「拠点にいる」状態として保存する（マップは持たない）
   * @returns {{success:boolean, reason:string}}
   */
  Game.prototype.saveProgress = function (dungeonState) {
    var result = this.saveManager.save({
      floor: (dungeonState && dungeonState.floor) || 1,
      party: this.party,
      storage: this.storage,
      inventory: this.inventory,
      gold: this.gold,
      discovery: this.discovery,
      tutorial: this.tutorial,
      story: this.story,
      // 主人公の名前・服の色・性別・一人称。冒険ごとに違うのでセーブに入れる
      playerName: this.playerName,
      playerColor: this.playerColor,
      playerGender: this.playerGender,
      playerFirstPerson: this.playerFirstPerson,
      // 一度きりの出来事（ヨミリュウの待ち伏せなど）を済ませたか
      doneEvents: this.doneEvents,
      clearedDungeons: this.clearedDungeons,
      boughtBlessings: this.boughtBlessings,
      offBlessings: this.offBlessings,
      playTime: this.playTime,
      dungeon: dungeonState ? {
        dungeonId: dungeonState.dungeonId || null,
        rows: dungeonState.rows,
        playerCol: dungeonState.playerCol,
        playerRow: dungeonState.playerRow
      } : null
    });
    // 設定も一緒に書く。チュートリアルを Esc で止めたときのように、
    // 設定画面を通らずに変わった値も、セーブすればそのファイルに残る
    if (result.success) this.settings.save();
    return result;
  };

  /**
   * 探索を中断する。いまの状態を「中断データ」に書く（セーブ本体は書き換えない）。
   *
   * セーブと違って、挑戦の記録（選んだ加護・拾ったもの）と
   * その階の仕掛け（開けた宝箱など）まで書く。
   * 再開したときに、加護が消えていたり宝箱が復活していたりしないように。
   *
   * @param {object} dungeonState saveProgress と同じ { dungeonId, floor, rows, playerCol, playerRow }
   * @param {object[]} features その階の仕掛け（DungeonScene.placedFeatures）
   * @returns {{success:boolean, reason:string}}
   */
  Game.prototype.suspendRun = function (dungeonState, features) {
    var run = this.run;
    var members = this.party ? this.party.getMembers() : [];
    var runData = null;

    if (run) {
      var blessingIds = [];
      for (var i = 0; i < run.blessings.length; i++) blessingIds.push(run.blessings[i].id);

      // そのランで仲間になった個体は、パーティの何番目かで覚える
      var gainedIndexes = [];
      for (var j = 0; j < run.gainedMonsters.length; j++) {
        var index = members.indexOf(run.gainedMonsters[j]);
        if (index >= 0) gainedIndexes.push(index);
      }

      runData = {
        gainedItems: run.gainedItems,
        gainedMonsters: gainedIndexes,
        gainedGold: run.gainedGold,
        blessings: blessingIds,
        deepestFloor: run.deepestFloor
      };
    }

    var featureData = [];
    for (var k = 0; k < (features || []).length; k++) {
      var f = features[k];
      featureData.push({ col: f.col, row: f.row, type: f.type, used: !!f.used, revealed: !!f.revealed });
    }

    var result = this.saveManager.saveSuspend({
      floor: dungeonState.floor,
      party: this.party,
      storage: this.storage,
      inventory: this.inventory,
      gold: this.gold,
      discovery: this.discovery,
      tutorial: this.tutorial,
      story: this.story,
      playerName: this.playerName,
      playerColor: this.playerColor,
      playerGender: this.playerGender,
      playerFirstPerson: this.playerFirstPerson,
      doneEvents: this.doneEvents,
      clearedDungeons: this.clearedDungeons,
      boughtBlessings: this.boughtBlessings,
      offBlessings: this.offBlessings,
      playTime: this.playTime,
      dungeon: {
        dungeonId: dungeonState.dungeonId || null,
        rows: dungeonState.rows,
        playerCol: dungeonState.playerCol,
        playerRow: dungeonState.playerRow
      },
      run: runData,
      features: featureData
    });
    if (result.success) this.settings.save();   // saveProgress と同じ
    return result;
  };

  /**
   * 読み込んだ状態を、遊べる形でこの Game に入れる。
   * 「続きから」と「中断したところから」の両方がここを通る。
   * @param {object} state SaveManager.load / loadSuspend の state
   */
  Game.prototype.applyLoadedState = function (state) {
    this.party = state.party;
    this.storage = state.storage;
    this.inventory = state.inventory;
    this.gold = state.gold || 0;
    this.discovery = state.discovery;
    // 名前と色。古いセーブには無いので、その場合は既定のまま
    this.playerName = state.playerName || null;
    this.playerColor = state.playerColor || null;
    // 性別・一人称。古いセーブには無いので、その場合は既定（data/player.js）
    this.playerGender = state.playerGender || null;
    this.playerFirstPerson = state.playerFirstPerson || null;
    this.doneEvents = state.doneEvents || {};
    // この仕組みより前のセーブは「全部もう見た」扱いにする
    this.tutorial.loadSaveData(state.tutorial, true);
    // 物語も同じ。この仕組みより前のセーブにオープニングを見せない
    this.story.loadSaveData(state.story, true);
    this.clearedDungeons = state.clearedDungeons || {};
    this.boughtBlessings = state.boughtBlessings || {};
    this.offBlessings = state.offBlessings || {};
    // 合計プレイ時間は、そのファイルに書いてあった値から続ける（古いセーブには無いので0）
    this.playTime = state.playTime || 0;
    this.run = null;
  };

  /**
   * 中断したところから再開する。
   *
   * 読めたら中断データを消してから探索画面へ移る（同じところから何度もやり直せない）。
   * 読めなかったときは何も変えず、理由を返す。
   *
   * @param {number} slot
   * @returns {{success:boolean, reason:string}}
   */
  Game.prototype.resumeSuspended = function (slot) {
    this.setSaveSlot(slot);
    var result = this.saveManager.loadSuspend();
    if (!result.success) return { success: false, reason: result.reason };

    var state = result.state;
    var dungeonId = state.dungeon && state.dungeon.dungeonId;
    var def = dungeonId ? (this.data.dungeons || {})[dungeonId] : null;
    if (!def) return { success: false, reason: "broken" };

    this.applyLoadedState(state);
    this.loadFileSettings();
    this.beginRun(def);

    // 挑戦の記録を戻す。加護は id から定義を引き直す
    var saved = state.run || {};
    var run = this.run;
    var blessings = this.data.blessings || {};
    for (var i = 0; i < (saved.blessings || []).length; i++) {
      if (blessings[saved.blessings[i]]) run.addBlessing(blessings[saved.blessings[i]]);
    }
    run.gainedItems = saved.gainedItems || {};
    run.gainedGold = saved.gainedGold || 0;
    run.deepestFloor = saved.deepestFloor || state.floor || 1;
    var members = this.party.getMembers();
    for (var j = 0; j < (saved.gainedMonsters || []).length; j++) {
      if (members[saved.gainedMonsters[j]]) run.recordMonster(members[saved.gainedMonsters[j]]);
    }
    this._refreshRunEffects();

    this.saveManager.clearSuspend(slot);
    this.scenes.change(new NS.DungeonScene(this, def, state));
    return { success: true, reason: "resumed" };
  };

  /**
   * ダンジョンをクリア済みとして記録する。
   * 次のダンジョンの解放条件に使う。
   * @param {string} dungeonId
   * @returns {boolean} 今回はじめてクリアしたか（すでにクリア済みなら false）
   */
  Game.prototype.markDungeonCleared = function (dungeonId) {
    if (!dungeonId) return false;
    if (!this.clearedDungeons) this.clearedDungeons = {};
    if (this.clearedDungeons[dungeonId]) return false;

    this.clearedDungeons[dungeonId] = true;
    return true;
  };

  Game.prototype.isDungeonCleared = function (dungeonId) {
    return !!(this.clearedDungeons && this.clearedDungeons[dungeonId]);
  };

  // --- 一度きりの出来事（data/dungeons.js の events）---

  Game.prototype.isEventDone = function (eventId) {
    return !!(this.doneEvents && this.doneEvents[eventId]);
  };

  /** 済ませた印を付ける。起きた瞬間に付けるので、逃げても負けても二度は起きない */
  Game.prototype.markEventDone = function (eventId) {
    if (!eventId) return;
    if (!this.doneEvents) this.doneEvents = {};
    this.doneEvents[eventId] = true;
  };

  /**
   * 出来事の戦いの結果を残す（"win" / "lose" / "flee" / "scouted"。BattleSystem の結果そのまま）。
   * 物語の場面を結果で分けるのに使う（data/story.js の when.result）。
   * 印は true のかわりに結果の文字が入るだけなので、「済ませたか」の判定はそのまま効く
   */
  Game.prototype.setEventResult = function (eventId, result) {
    if (!eventId || !result) return;
    if (!this.doneEvents) this.doneEvents = {};
    this.doneEvents[eventId] = result;
  };

  /** 出来事の戦いの結果（残っていなければ null） */
  Game.prototype.getEventResult = function (eventId) {
    var value = this.doneEvents && this.doneEvents[eventId];
    return (typeof value === "string") ? value : null;
  };

  // --- 加護の持ち物（挑戦をまたいで残る） ---
  //
  // data/blessings.js に locked: true と書いた加護は、最初は選択肢に出ない。
  // 謎の商人から買うと恒久的に解放される（boughtBlessings）。
  // 解放済みの加護は、拠点の画面で1つずつ外せる（offBlessings）。
  // どちらも「持っているダンジョン」と同じく { id: true } の形で保存する。

  /** 加護を買った（恒久解放）ものとして記録する */
  Game.prototype.markBlessingBought = function (blessingId) {
    if (!blessingId) return;
    if (!this.boughtBlessings) this.boughtBlessings = {};
    this.boughtBlessings[blessingId] = true;
  };

  Game.prototype.hasBoughtBlessing = function (blessingId) {
    return !!(this.boughtBlessings && this.boughtBlessings[blessingId]);
  };

  /**
   * その加護を持っているか（選択肢に出しうるか）。
   * 最初から使えるものは買わなくても持っている扱い。
   */
  Game.prototype.ownsBlessing = function (blessingId) {
    var blessing = (this.data.blessings || {})[blessingId];
    if (!blessing) return false;
    return blessing.locked ? this.hasBoughtBlessing(blessingId) : true;
  };

  /** 持っている加護のid一覧（買ったものと、最初から使えるもの） */
  Game.prototype.getOwnedBlessingIds = function () {
    var blessings = this.data.blessings || {};
    var ids = [];

    for (var id in blessings) {
      if (!Object.prototype.hasOwnProperty.call(blessings, id)) continue;
      if (this.ownsBlessing(id)) ids.push(id);
    }
    return ids;
  };

  /** いま選択肢に入れている加護の数 */
  Game.prototype.countActiveBlessings = function () {
    var ids = this.getOwnedBlessingIds();
    var count = 0;

    for (var i = 0; i < ids.length; i++) {
      if (this.isBlessingActive(ids[i])) count++;
    }
    return count;
  };

  /** 選択肢に入れておける数の上限（data/run.js の blessing.activeMax） */
  Game.prototype.getBlessingActiveMax = function () {
    var max = (((this.data.run || {}).blessing) || {}).activeMax;
    return (typeof max === "number") ? max : Infinity;
  };

  /**
   * 選択肢に出す／出さないを切り替える。
   *
   * 入れられるのは上限まで。いっぱいのときに入れようとしても何も起きない
   * （どれかを外してから入れ直す）。
   *
   * @returns {{changed:boolean, active:boolean, reason:string}}
   *   reason: "on" | "off" | "full"
   */
  Game.prototype.toggleBlessing = function (blessingId) {
    if (!this.ownsBlessing(blessingId)) {
      return { changed: false, active: false, reason: "notOwned" };
    }
    if (!this.offBlessings) this.offBlessings = {};

    if (this.offBlessings[blessingId]) {
      if (this.countActiveBlessings() >= this.getBlessingActiveMax()) {
        return { changed: false, active: false, reason: "full" };
      }
      delete this.offBlessings[blessingId];
      return { changed: true, active: true, reason: "on" };
    }

    this.offBlessings[blessingId] = true;
    return { changed: true, active: false, reason: "off" };
  };

  /**
   * 加護を買う。買った加護は自動では選択肢に入れない
   * （上限があるので、入れ替えは拠点の画面で選ばせる）。
   * @returns {{success:boolean, reason:string}}
   *   reason: "bought" | "already" | "notForSale" | "notEnoughGold"
   */
  Game.prototype.buyBlessing = function (blessingId) {
    var blessing = (this.data.blessings || {})[blessingId];
    if (!blessing || !blessing.locked) return { success: false, reason: "notForSale" };
    if (this.hasBoughtBlessing(blessingId)) return { success: false, reason: "already" };

    var price = blessing.price || 0;
    if (this.gold < price) return { success: false, reason: "notEnoughGold" };

    this.gold -= price;
    this.markBlessingBought(blessingId);

    // 空きがあるうちは、買ってすぐ使えるように入れておく
    if (this.countActiveBlessings() > this.getBlessingActiveMax()) {
      if (!this.offBlessings) this.offBlessings = {};
      this.offBlessings[blessingId] = true;
    }
    return { success: true, reason: "bought" };
  };

  /** いま選択肢に出る加護か（持っていて、かつ外していない） */
  Game.prototype.isBlessingActive = function (blessingId) {
    if (!this.ownsBlessing(blessingId)) return false;
    return !(this.offBlessings && this.offBlessings[blessingId]);
  };

  // --- 挑戦（ラン） ---

  /**
   * ダンジョンへ入るときに呼ぶ。ここから拠点へ戻るまでが1回のラン。
   * @param {object} dungeonDef data/dungeons.js の1件
   */
  Game.prototype.beginRun = function (dungeonDef) {
    this.run = new NS.RunSession(dungeonDef);
  };

  /**
   * ランを終える。
   * 無事に帰った場合は拾ったものをそのまま持ち帰り、
   * 全滅した場合は data/run.js の設定に従って失う。
   *
   * @param {boolean} survived 無事に帰れたか
   * @returns {{items:Array, monsters:Array}} 失ったもの（何も失わなければ空）
   */
  Game.prototype.endRun = function (survived) {
    var lost = { items: [], monsters: [] };
    var run = this.run;
    this.run = null;

    if (run && !survived) {
      var rules = this.data.run || {};
      if (rules.loseItemsOnDefeat) lost.items = this._loseRunItems(run);
      if (rules.loseMonstersOnDefeat) lost.monsters = this._loseRunMonsters(run);
    }

    // 加護はそのラン限り。拠点へ着いた時点で消える
    this._clearRunEffects();

    // 拠点に着いた時点で立て直せるようにする（ラン中は道具でしか回復できない）
    if ((this.data.run || {}).healOnReturn && this.party) this.party.healAll();

    // 状態異常は拠点で全部消える。
    // 毒だけは戦闘が終わっても残る（persists）ので、ここで落とさないと
    // 拠点で全快したのに毒だけ付いたまま、という状態になってしまう。
    // 回復と同じ条件（healOnReturn）で扱う —— 「拠点で立て直す」ひとまとまりの処理
    if ((this.data.run || {}).healOnReturn) this._clearAllStatuses();

    return lost;
  };

  /**
   * 加護（そのラン限りの強化）を得る。
   * パーティ全員に掛かるので、いま連れている全員へ効果を配る。
   * @param {object} blessing data/blessings.js の1件
   */
  Game.prototype.addBlessing = function (blessing) {
    if (!blessing || !this.run) return false;

    this.run.addBlessing(blessing);
    this._refreshRunEffects();
    return true;
  };

  /**
   * いま連れている全員へ、加護の効果を配り直す。
   * 仲間が増えたとき（スカウト）にも呼ぶ。
   */
  Game.prototype._refreshRunEffects = function () {
    var effects = this.run ? this.run.getBlessingEffects() : [];
    var members = this.party.getMembers();

    for (var i = 0; i < members.length; i++) {
      members[i].runEffects = effects.slice();
    }
  };

  /** 状態異常を全員から取り除く（拠点に帰ったとき）。預かり所の仲間も含む */
  Game.prototype._clearAllStatuses = function () {
    var lists = [this.party.getMembers(), this.storage.getMembers()];

    for (var i = 0; i < lists.length; i++) {
      for (var j = 0; j < lists[i].length; j++) {
        if (lists[i][j].clearAllStatuses) lists[i][j].clearAllStatuses();
      }
    }
  };

  /** 加護の効果を全員から取り除く（ランが終わったとき） */
  Game.prototype._clearRunEffects = function () {
    var lists = [this.party.getMembers(), this.storage.getMembers()];

    for (var i = 0; i < lists.length; i++) {
      for (var j = 0; j < lists[i].length; j++) lists[i][j].runEffects = [];
    }
  };

  /** そのランで拾った分だけを持ち物から取り除く（持ち込んだ分は残る） */
  Game.prototype._loseRunItems = function (run) {
    var gained = run.getGainedItems();
    var lost = [];

    for (var i = 0; i < gained.length; i++) {
      var removed = this.inventory.remove(gained[i].itemId, gained[i].count);
      if (removed > 0) lost.push({ itemId: gained[i].itemId, count: removed });
    }
    return lost;
  };

  /** そのランで仲間になった個体だけをパーティから外す */
  Game.prototype._loseRunMonsters = function (run) {
    var gained = run.getGainedMonsters();
    var lost = [];

    for (var i = 0; i < gained.length; i++) {
      var index = this.party.getMembers().indexOf(gained[i]);
      if (index >= 0) lost.push(this.party.remove(index));
    }
    return lost;
  };

  // --- ゴールド ---

  /**
   * ゴールドを渡す。
   * 全滅しても失わないので、挑戦（ラン）の記録には入れない。
   * @returns {number} 実際に増えた量
   */
  Game.prototype.giveGold = function (amount) {
    if (!amount || amount <= 0) return 0;
    this.gold += amount;
    // 結果画面で「いくら稼いだか」を出せるよう、挑戦中は記録しておく
    if (this.run) this.run.recordGold(amount);
    return amount;
  };

  /** 支払えるか */
  Game.prototype.canAfford = function (amount) {
    return this.gold >= (amount || 0);
  };

  /**
   * ゴールドを支払う。足りなければ何もしない。
   * @returns {boolean} 支払えたか
   */
  Game.prototype.spendGold = function (amount) {
    if (!this.canAfford(amount)) return false;
    this.gold -= (amount || 0);
    return true;
  };

  /**
   * アイテムを渡す。持ち物へ加えると同時に図鑑へも記録する。
   * アイテムを入手させるときは必ずこれを通すこと
   * （持ち物・図鑑・ランの記録がずれないようにするため）。
   * @returns {number} 実際に加えられた個数
   */
  Game.prototype.giveItem = function (itemId, count) {
    var added = this.inventory.add(itemId, count);
    if (added > 0) {
      this.discovery.markItemObtained(itemId);
      if (this.run) this.run.recordItem(itemId, added);
    }
    return added;
  };

  /**
   * 仲間を加える。パーティへ加えると同時に図鑑へも記録する。
   * @returns {boolean} 加えられたか
   */
  Game.prototype.addMonster = function (monster) {
    if (!monster) return false;
    var added = this.party.add(monster);
    if (added) {
      this.discovery.markMonsterCaught(monster.speciesId);
      this.recordLearnedSkills(monster);
      if (this.run) {
        this.run.recordMonster(monster);
        this._refreshRunEffects();   // 途中で仲間になった相手にも加護を配る
      }
    }
    return added;
  };

  /**
   * 仲間を拠点の預かり所へ送る。図鑑への記録も行う。
   * パーティがいっぱいのときのスカウトなどで使う。
   * @returns {boolean} 預けられたか
   */
  Game.prototype.storeMonster = function (monster) {
    if (!monster) return false;
    var stored = this.storage.add(monster);
    if (stored) {
      this.discovery.markMonsterCaught(monster.speciesId);
      this.recordLearnedSkills(monster);
    }
    return stored;
  };

  /**
   * パーティの1体を預かり所へ送る。
   * @param {number} index パーティの位置
   * @returns {object|null} 預けた個体
   */
  Game.prototype.depositToStorage = function (index) {
    if (this.storage.isFull()) return null;

    var monster = this.party.get(index);
    if (!monster) return null;

    this.party.remove(index);
    this.storage.add(monster);
    return monster;
  };

  /**
   * 預かり所から引き取ってパーティへ加える。
   * @returns {boolean} 引き取れたか（パーティがいっぱいなら false）
   */
  Game.prototype.takeFromStorage = function (index) {
    if (this.party.isFull()) return false;

    var monster = this.storage.get(index);
    if (!monster) return false;

    this.storage.remove(index);
    return this.addMonster(monster);
  };

  // --- 装備 ---

  /**
   * 装備を身につける。持ち物から1つ取り出して個体へ移す。
   *
   * 枠は data/config.js の equipSlots（武器・防具・アクセサリー×2）。
   * その装備の枠（items.js の equip.slot）が埋まっていれば、
   * その枠で**いちばん古いもの**を外して持ち物へ戻してから着ける。
   *
   * ★ 同じ装備は2つ着けられない。アクセサリー枠が2つあっても、
   *   同じ指輪を2つ重ねて効果を倍にすることはできない。
   *
   * @param {object} monster 装備させる個体
   * @param {string} itemId data/items.js の id（equip を持つもの）
   * @returns {{success:boolean, reason?:string, replaced?:string}}
   *   reason … "duplicate"（もう着けている）/ "stackFull"（外したものを持ち物へ戻せない）
   *   replaced … 入れ替えで外した装備の id
   */
  Game.prototype.equipItem = function (monster, itemId) {
    var item = this.data.getItem(itemId);
    if (!monster || !item || !item.equip) return { success: false };

    if (!monster.equipment) monster.equipment = [];
    if (monster.equipment.indexOf(itemId) >= 0) return { success: false, reason: "duplicate" };
    if (!this.inventory.has(itemId, 1)) return { success: false };

    var slot = NS.EffectSystem.slotOf(item);
    var capacity = NS.EffectSystem.slotCapacity(this.data, slot);
    if (capacity <= 0) return { success: false, reason: "noSlot" };   // 枠が無い種類

    // その枠が埋まっていれば、いちばん古いものを外す
    var replaced = null;
    var worn = this._equippedOfSlot(monster, slot);
    if (worn.length >= capacity && worn.length > 0) {
      replaced = this.unequipItem(monster, monster.equipment.indexOf(worn[0]));
      if (!replaced) return { success: false, reason: "stackFull" };
    }

    this.inventory.remove(itemId, 1);
    monster.equipment.push(itemId);
    return { success: true, replaced: replaced };
  };

  /** その枠に着けている装備の id（着けた順） */
  Game.prototype._equippedOfSlot = function (monster, slot) {
    var result = [];
    var list = (monster && monster.equipment) || [];
    for (var i = 0; i < list.length; i++) {
      var item = this.data.getItem(list[i]);
      if (item && item.equip && NS.EffectSystem.slotOf(item) === slot) result.push(list[i]);
    }
    return result;
  };

  /**
   * 装備を外して持ち物へ戻す。
   * 戻せない場合は外さない（装備が消えないようにする）。
   * 種類数に上限は無いので、戻せないのは同じ装備を maxStack まで持っているときだけ。
   *
   * @param {object} monster
   * @param {number} index 外す装備の位置
   * @returns {string|null} 外した装備のid
   */
  Game.prototype.unequipItem = function (monster, index) {
    var list = (monster && monster.equipment) || [];
    var itemId = list[index];
    if (!itemId) return null;

    if (this.inventory.add(itemId, 1) <= 0) return null;

    list.splice(index, 1);
    return itemId;
  };

  /**
   * いま持っている仲間・アイテムを図鑑に記録する。
   *
   * 最初の仲間だけでなく、**セーブから読み込んだときにも通る**。
   * 技の記録（skillsLearned）は後から足した項目なので、
   * ここで拾い直さないと、古いセーブでは覚えている技まで「???」に戻ってしまう。
   * 預かり所にいる仲間も同じように見る。
   */
  Game.prototype._recordInitialDiscoveries = function () {
    var lists = [this.party.getMembers(), this.storage.getMembers()];
    var i, j;

    for (i = 0; i < lists.length; i++) {
      for (j = 0; j < lists[i].length; j++) {
        this.discovery.markMonsterCaught(lists[i][j].speciesId);
        this.recordLearnedSkills(lists[i][j]);
        // 愛情度の段階も拾い直す（図鑑の記録をどこまで読めるか）
        if (lists[i][j].getAffectionStageIndex && this.discovery.markAffectionStage) {
          this.discovery.markAffectionStage(lists[i][j].speciesId, lists[i][j].getAffectionStageIndex());
        }
      }
    }

    var slots = this.inventory.getSlots();
    for (i = 0; i < slots.length; i++) {
      this.discovery.markItemObtained(slots[i].itemId);
    }
  };

  /**
   * その個体が「いま覚えている技」を図鑑に記録する。
   *
   * ★ 図鑑の技は、覚える種族を捕まえたかどうかではなく
   *   **実際に覚えたかどうか**で判明する。
   *   技はレベルで覚えるので、捕獲だけを条件にすると、
   *   Lv1のスライムを1体捕まえた時点で Lv11 の「キュア」まで出てしまう。
   *
   * 仲間に加わったとき・預けたとき・レベルアップで覚えたときに呼ぶ。
   */
  Game.prototype.recordLearnedSkills = function (monster) {
    var skills = (monster && monster.skills) || [];
    for (var i = 0; i < skills.length; i++) {
      this.discovery.markSkillLearned(skills[i]);
    }
  };

  /**
   * その場面の物語がまだなら流してから、次の画面へ移る。無ければそのまま次の画面へ。
   *
   * ★ 物語を足したい場面では、scenes.change(次) の代わりにこれを呼ぶだけでよい。
   *   どの物語が流れるかは data/story.js の trigger で決まる。
   *
   * @param {string} trigger data/story.js の trigger
   * @param {object} nextScene 物語のあと（または物語が無いとき）に移る画面
   * @returns {boolean} 物語を流したか
   */
  Game.prototype.playStory = function (trigger, nextScene) {
    var story = this.story.take(trigger, this);
    if (!story) {
      this.scenes.change(nextScene);
      return false;
    }
    // trigger も渡すと、流し終えたときに同じきっかけの続きを探してくれる
    this.scenes.change(new NS.StoryScene(this, story, nextScene, trigger));
    return true;
  };

  Game.prototype.start = function () {
    // 最初はタイトル画面から
    this.scenes.change(new NS.TitleScene(this));
    this.loop.start();
  };

  Game.prototype._update = function (dt) {
    this.clock += dt;
    // 合計プレイ時間。読み込んだ値に足していくので、セーブするとそのファイルに残る
    this.playTime += dt;
    this.input.update();

    // ★ 最初の操作で音を鳴らせるようにする。
    //   どのブラウザも、画面を一度も触っていないうちは音を鳴らさない決まりがある。
    //   場面ごとに書くと入れ忘れるので、入力を見ている**ここ1か所**で解除する
    if (!this.audio.unlocked && this.input.isAnyPressed()) this.audio.unlock();

    // どの音を鳴らすかは画面を動かす**前**に決め、鳴らすのは**後**。
    // 前に決めるのは、決定で画面が切り替わると「切り替え中」になって鳴らせなくなるため。
    // 後に鳴らすのは、設定で音量を変えた直後のカーソル音を、変えた後の大きさにするため
    var uiSound = this._pickUiSound();

    this._uiSoundOverride = null;
    this.scenes.update(dt);
    // 画面が「できなかった」と言った操作は、決定音の代わりにその音を鳴らす（playError）
    var se = this._uiSoundOverride || uiSound;
    if (se) this.audio.playSe(se);

    this.input.lateUpdate();
  };

  /**
   * この操作は「できなかった」と知らせる音を鳴らす（お金が足りない・使えない など）。
   *
   * 画面の update の中から呼ぶ。決定音と重ならないよう、その操作ぶんの決定音を
   * **置き換えて**鳴る（同じフレームの _update が拾う）。どの音かは data/audio.js の ui.error。
   */
  Game.prototype.playError = function () {
    var ui = (this.data.audio || {}).ui || {};
    this._uiSoundOverride = ui.error || ui.cancel || null;
  };

  /**
   * 決定・キャンセル・カーソルの音を、この操作で鳴らすなら、その id。
   *
   * ★ 画面ごとに書かず、入力を見ている**ここ1か所**で決める。
   *   メニューの部品は多く（CommandMenu・ScrollList・各画面の直書き）、
   *   ひとつずつ足すと必ず鳴らない場所が残る。
   *   どのキーがどの音かは data/audio.js の ui に書く。
   *
   * カーソル音だけは、画面が「鳴らさない」と言えば止める（scene.silentCursor）。
   * 探索中の移動は矢印キーなので、そのまま鳴らすと一歩ごとに鳴ってしまう。
   * 画面の切り替え中はどの音も鳴らさない（押しても何も起きない間だから）。
   *
   * @returns {string|null}
   */
  Game.prototype._pickUiSound = function () {
    var ui = (this.data.audio || {}).ui;
    if (!ui || this.scenes.isChanging()) return null;

    var input = this.input;
    var pointer = input.getPointer ? input.getPointer() : null;

    if (input.isPressed("confirm") || (pointer && pointer.clicked)) return ui.confirm;
    if (input.isPressed("cancel")) return ui.cancel;

    var scene = this.scenes.current;
    if (scene && scene.silentCursor) return null;

    var keys = ui.cursorKeys || [];
    for (var i = 0; i < keys.length; i++) {
      if (input.isPressed(keys[i])) return ui.cursor;
    }
    return null;
  };

  Game.prototype._render = function () {
    this.scenes.render(this.ctx);
  };

  NS.Game = Game;
})(window.MyGame);
