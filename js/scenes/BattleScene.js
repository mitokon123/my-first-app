/**
 * BattleScene.js
 * 戦闘画面（3対3）。状態の進行だけを担当し、描画はすべて ui/ の部品に任せる。
 * 戦闘のルール・計算は BattleSystem、文言は BattleMessageFormatter が担当する。
 *
 * ▼ 流れ
 *   盤面の味方ぜんいんの行動を決める → 素早さの大きい順に全員が行動 → 結果を表示
 *
 * ▼ 状態（this.phase）
 *   "command" … 何をするか選ぶ
 *   "skill"   … 技を選ぶ
 *   "item"    … 道具を選ぶ
 *   "target"  … 相手を選ぶ
 *   "message" … メッセージ送り待ち
 *   "done"    … 戦闘終了
 */
(function (NS) {
  "use strict";

  /**
   * @param {MyGame.Game} game
   * @param {MyGame.Party|object[]} allySource 味方。Party でも配列でも受け取れる
   * @param {object[]} enemies 敵
   * @param {object} returnScene 戦闘終了後に戻るシーン
   * @param {function(string):boolean} [onFinish] 結果を受け取るコールバック
   * @param {object} [options] { allowScout, allowFlee, introMessage }
   */
  function BattleScene(game, allySource, enemies, returnScene, onFinish, options) {
    options = options || {};
    this.game = game;
    this.allySource = allySource;
    this.allies = (allySource && typeof allySource.getMembers === "function")
      ? allySource.getMembers()
      : allySource;
    this.enemies = enemies;
    this.returnScene = returnScene;
    this.onFinish = onFinish;

    this.allowScout = options.allowScout !== false;
    this.allowFlee = options.allowFlee !== false;
    this.introMessage = options.introMessage || null;

    var ui = game.data.ui || {};
    this.theme = ui.theme || {};
    this.layout = ui.battle || {};
    this.texts = (game.data.messages || {}).battleUi || {};

    // 描画部品
    this.panel = new NS.Panel(game.ctx, this.theme);
    this.hpBar = new NS.HpBar(game.ctx, this.theme);
    this.spriteRenderer = new NS.SpriteRenderer(game.ctx, game.assets);
    this.renderer = new NS.Renderer(game.ctx);

    this.messageLog = new NS.MessageLog(this.panel, this.layout.message, this.layout.messageLines);
    this.commandMenu = new NS.CommandMenu(this.panel, this.layout.command);
    this.subMenu = new NS.ScrollList(this.panel, this.layout.subMenu);

    // 演出（HPバーの動き・ダメージ表示・画面効果）
    var animation = this.layout.animation || {};
    this.animation = animation;
    this.styles = animation.styles || {};
    this.animator = new NS.BattleAnimator(animation);
    this.floatingText = new NS.FloatingText(animation.popup);
    this.screenEffects = new NS.ScreenEffects(animation);

    // 1ターン分の出来事を1つずつ見せるための状態
    this.playbackEvents = [];
    this.playbackIndex = 0;
    this.playbackTimer = 0;
    // 演出中に「今どの並びで表示していたか」を保つ（倒れた相手もその場に残す）
    this.viewAllies = null;
    this.viewEnemies = null;

    // ロジック
    var random = new NS.Random();
    this.system = new NS.BattleSystem(game.data, random);
    this.scoutSystem = new NS.ScoutSystem(game.data, random);
    this.dropSystem = new NS.DropSystem(game.data, random);
    this.itemUsage = new NS.ItemUsage(game.data);
    this.formatter = new NS.BattleMessageFormatter(game.data.messages);

    this.phase = "message";
    this.commandIndex = 0;   // いま行動を決めている味方（盤面の番号）
    this.actions = [];       // 決まった行動
    this.pending = null;     // 決めかけの行動（対象選択中）
    this.targetIndex = 0;
    this.targetSide = "enemy";

    // 仲間になったが、パーティがいっぱいで行き先が決まっていない個体
    this.pendingScout = null;
    this._scoutError = null;  // 行き先へ入れられなかった理由

    // 技以外の行動は、正しい行動順のタイミングでここに処理が回ってくる
    var self = this;
    this.system.onNonSkillAction = function (step, events) {
      self._performNonSkillAction(step, events);
    };
  }

  BattleScene.prototype.enter = function () {
    this.system.start(this.allies, this.enemies);
    this._assignEnemyLabels();
    this._recordEnemiesSeen();

    // 開始時はHPバーを実際の値に合わせておく
    this.animator.snap(this.allies);
    this.animator.snap(this.enemies);

    var messages = (this.game.data.messages || {}).battle || {};
    if (this.introMessage) {
      this.messageLog.push(this.introMessage);
    } else if (messages.encounter) {
      this.messageLog.push(messages.encounter.replace("{name}", this._enemyGroupName()));
    }
    this._showNextMessage();
  };

  /** 「スライム たち」のように、出てきた敵をひとまとめに呼ぶ */
  BattleScene.prototype._enemyGroupName = function () {
    var field = this.system.getFieldEnemies();
    if (field.length === 0) return "";
    if (field.length === 1) return field[0].getName();
    return field[0].getName() + " たち";
  };

  /**
   * 同じ名前の敵が複数いる場合に、A・B・C…の印をつける。
   * これが無いと「スライム の 攻撃!」がどちらのスライムか分からなくなる。
   */
  BattleScene.prototype._assignEnemyLabels = function () {
    var suffixes = ((this.game.data.messages || {}).battle || {}).enemySuffixes
                || ["A", "B", "C", "D", "E", "F"];
    var counts = {};
    var i, id;

    // まず同じ種族が何体いるか数える
    for (i = 0; i < this.enemies.length; i++) {
      id = this.enemies[i].speciesId;
      counts[id] = (counts[id] || 0) + 1;
    }

    var used = {};
    for (i = 0; i < this.enemies.length; i++) {
      id = this.enemies[i].speciesId;
      if (counts[id] <= 1) {
        this.enemies[i].displaySuffix = null;   // 1体だけなら印は不要
        continue;
      }
      used[id] = (used[id] || 0);
      this.enemies[i].displaySuffix = suffixes[used[id]] || String(used[id] + 1);
      used[id]++;
    }
  };

  /** 出会った敵を図鑑に「発見」として記録する */
  BattleScene.prototype._recordEnemiesSeen = function () {
    var discovery = this.game.discovery;
    if (!discovery) return;
    for (var i = 0; i < this.enemies.length; i++) {
      discovery.markMonsterSeen(this.enemies[i].speciesId);
    }
  };

  // --- メニュー構築 ---

  BattleScene.prototype._buildCommandMenu = function () {
    var labels = (this.game.data.messages || {}).command || {};
    var items = [
      { label: labels.attack || "attack", value: "attack" },  // 通常攻撃（技を選ばず即対象選択）
      { label: labels.fight  || "fight",  value: "fight" },   // 技を選ぶ
      { label: labels.defend || "defend", value: "defend" }   // 受けるダメージを減らす
    ];

    if (this.allowScout) items.push({ label: labels.scout || "scout", value: "scout" });
    items.push({ label: labels.item || "item", value: "item" });
    if (this.allowFlee) items.push({ label: labels.flee || "flee", value: "flee" });

    this.commandMenu.setItems(items);
  };

  /** 「攻撃」コマンドで使う技id（data/battle.js） */
  BattleScene.prototype._normalAttackId = function () {
    return (this.game.data.battle || {}).normalAttackSkill || "normalAttack";
  };

  BattleScene.prototype._buildSkillMenu = function () {
    var actor = this._currentActor();
    var rows = [];
    var skills = (actor && actor.skills) || [];
    var theme = this.theme;

    for (var i = 0; i < skills.length; i++) {
      var skill = this.game.data.getSkill(skills[i]);
      if (!skill) continue;

      // PPが足りない技は薄く表示して、使えないことを分かるようにする
      var affordable = this._canAfford(actor, skill);
      rows.push({
        type: "entry",
        label: skill.name,
        right: "PP" + (skill.pp || 0),
        color: affordable ? theme.textColor : theme.hintColor,
        value: skills[i]
      });
    }
    this.subMenu.setRows(rows);
  };

  /** その技のPPを今払えるか */
  BattleScene.prototype._canAfford = function (actor, skill) {
    var cost = skill.pp || 0;
    if (cost <= 0) return true;
    return !!(actor && actor.canPayPp && actor.canPayPp(cost));
  };

  /** 戦闘中に使える道具だけを並べる */
  BattleScene.prototype._buildItemMenu = function () {
    var inventory = this.game.inventory;
    var rows = [];

    if (inventory) {
      var slots = inventory.getSlots();
      for (var i = 0; i < slots.length; i++) {
        if (!this.itemUsage.isUsableIn(slots[i].itemId, "battle")) continue;
        var item = this.game.data.getItem(slots[i].itemId);
        rows.push({
          type: "entry",
          label: item ? item.name : slots[i].itemId,
          right: "x" + slots[i].count,
          value: slots[i].itemId
        });
      }
    }
    this.subMenu.setRows(rows);
  };

  // --- 更新 ---

  BattleScene.prototype.update = function (dt) {
    var input = this.game.input;

    // 設定の戦闘速度に応じて、演出全体の進み方を変える
    var scaled = dt * this._speedMultiplier();

    // 演出は常に進める（HPバーの動き・浮かぶ数字・画面効果）
    this.animator.update(scaled, this.allies);
    this.animator.update(scaled, this.enemies);
    this.floatingText.update(scaled);
    this.screenEffects.update(scaled);

    switch (this.phase) {
      case "playback": this._updatePlayback(scaled, input); break;
      case "message":  this._updateMessage(input); break;
      case "command":  this._updateCommand(input); break;
      case "skill":    this._updateSkill(input); break;
      case "item":     this._updateItem(input); break;
      case "target":   this._updateTarget(input); break;
      case "scoutChoice": this._updateScoutChoice(input); break;
      case "scoutSwap":   this._updateScoutSwap(input); break;
      case "done":     this._updateDone(); break;
    }
  };

  // --- 1ターン分の再生 ---

  /**
   * 設定の「戦闘速度」に対応する倍率。
   * 大きいほど演出が速く進む。設定が無ければ等倍。
   */
  BattleScene.prototype._speedMultiplier = function () {
    var table = this.animation.speedTable;
    var settings = this.game.settings;
    if (!table || !settings) return 1;

    var level = settings.get("battleSpeed");
    if (typeof level !== "number") return 1;

    return table[level - 1] || 1;
  };

  /** 戦っている全員の現在HPを控える */
  BattleScene.prototype._captureHp = function () {
    var list = [];
    var i;
    for (i = 0; i < this.allies.length; i++) {
      list.push({ monster: this.allies[i], hp: this.allies[i].currentHp });
    }
    for (i = 0; i < this.enemies.length; i++) {
      list.push({ monster: this.enemies[i], hp: this.enemies[i].currentHp });
    }
    return list;
  };

  /** 出来事を1つずつ見せる状態に入る */
  BattleScene.prototype._startPlayback = function (events) {
    // 倒れた相手も演出が終わるまでその場に残すため、開始時の並びを覚えておく
    this.viewAllies = this.snapshotAllies;
    this.viewEnemies = this.snapshotEnemies;

    // HPバーをターン開始前の状態に戻す（減るのは攻撃を見せる瞬間）
    var snapshot = this.snapshotHp || [];
    for (var i = 0; i < snapshot.length; i++) {
      this.animator.hold(snapshot[i].monster, snapshot[i].hp);
    }

    this.playbackEvents = events || [];
    this.playbackIndex = 0;
    this.playbackTimer = 0;
    this.playbackWaiting = false;
    this.messageLog.clear();
    this.phase = "playback";
  };

  BattleScene.prototype._updatePlayback = function (dt, input) {
    // メッセージ欄がいっぱいのときは、読み終わるまで待つ
    if (this.playbackWaiting) {
      if (input.isPressed("confirm") || input.isPressed("cancel")
          || this._clickedScreen(input)) {
        this.messageLog.clearPage();
        this.playbackWaiting = false;
      }
      return;
    }

    // 決定キーを押している間は早送りする
    var quick = input.isDown("confirm");
    this.playbackTimer -= dt * (quick ? 3 : 1);
    if (this.playbackTimer > 0) return;

    // まだ出来事が残っていれば次を見せる
    if (this.playbackIndex < this.playbackEvents.length) {
      var event = this.playbackEvents[this.playbackIndex];

      // 表示欄が埋まっていたら、古い行を消さずに送り待ちにする
      // （そうしないと味方の行動が流れて消えてしまう）
      if (this.messageLog.isFull() && this.formatter.formatOne(event)) {
        this.playbackWaiting = true;
        return;
      }

      this._playEvent(event, quick);
      this.playbackIndex++;
      return;
    }

    // すべて見せ終わっても、HPバーが動き切るまでは待つ
    if (!this._animationSettled()) return;

    this._endPlayback();
  };

  BattleScene.prototype._animationSettled = function () {
    return this.animator.isSettled(this.allies)
        && this.animator.isSettled(this.enemies)
        && !this.floatingText.isActive();
  };

  /** 出来事を1つ見せて、次までの待ち時間を決める */
  BattleScene.prototype._playEvent = function (event, quick) {
    this.messageLog.stream(this.formatter.formatOne(event));

    var wait = quick
      ? (this.animation.quickDelay || 90)
      : (this.animation.eventDelay || 400);

    // 「ここまで減った」と見せてよいHPを、この瞬間に反映する
    if (event.revealTarget) {
      this.animator.revealTo(event.revealTarget, event.revealHp);
    }

    switch (event.type) {
      case "damage":
        this.animator.revealTo(event.target, event.currentHp);
        // 会心のときは会心用の見た目にする
        this._applyStyle(event.critical ? "critical" : "damage",
          event.target, String(event.amount));
        // HPバーが動き切るまでは次の出来事へ進まない
        wait = Math.max(wait, this.animator.drainTime(event.amount));
        break;
      case "miss":
        this._applyStyle("miss", event.target, "MISS");
        break;
      case "effective":
        this._applyStyle("effective", event.target, null);
        break;
      case "resisted":
        this._applyStyle("resisted", event.target, null);
        break;
      case "immune":
        this._applyStyle("immune", event.target, "0");
        break;
      case "faint":
        this._applyStyle("faint", event.target, null);
        break;
      default:
        // 道具などによる回復
        if (event.healAmount) {
          this._applyStyle("heal", event.revealTarget, "+" + event.healAmount);
          wait = Math.max(wait, this.animator.drainTime(event.healAmount));
        }
        break;
    }

    this.playbackTimer = wait;
  };

  /**
   * 場面ごとの見た目を適用する。
   * 数字の色と大きさ・画面の揺れ・発光をまとめて data/ui.js の styles から決める。
   *
   * @param {string} styleId styles のキー
   * @param {object} monster 対象（数字を出す位置に使う）
   * @param {string} [text] 浮かべる文字。null なら文字は出さない
   */
  BattleScene.prototype._applyStyle = function (styleId, monster, text) {
    var style = this.styles[styleId] || {};

    if (text) {
      var pos = this._monsterScreenPos(monster);
      if (pos) {
        this.floatingText.spawn(pos.x, pos.y, text,
          { color: style.color, font: style.font });
      }
    }

    if (style.shake) this.screenEffects.shake(style.shake);
    if (style.flash) this.screenEffects.flash(style.flash, style.flashAlpha);
  };

  /** 演出を終えて、次の状態へ移る */
  BattleScene.prototype._endPlayback = function () {
    this.viewAllies = null;
    this.viewEnemies = null;

    // 見せ終わったので、表示HPを実際の値に揃えておく
    this.animator.snap(this.allies);
    this.animator.snap(this.enemies);

    this.phase = "message";   // 決定キーで次のターンへ進む
  };

  /** 画面をマウスで押したか（メッセージ送りに使う） */
  BattleScene.prototype._clickedScreen = function (input) {
    return !!(input.getPointer && input.getPointer().clicked);
  };

  /** メッセージ送り。読み終えたら次の状態へ */
  BattleScene.prototype._updateMessage = function (input) {
    // メッセージはどこを押しても進められる
    if (!input.isPressed("confirm") && !input.isPressed("cancel")
        && !this._clickedScreen(input)) return;

    if (this.messageLog.hasPending()) {
      this.messageLog.advance();
      return;
    }
    this.messageLog.clear();

    // パーティがいっぱいのままスカウトに成功していたら、行き先を選んでもらう
    if (this.pendingScout) {
      this._beginScoutChoice();
      return;
    }

    if (this.system.isOver()) {
      this.phase = "done";
      return;
    }
    this._beginCommandPhase();
  };

  // --- パーティがいっぱいのときのスカウト ---

  /** 仲間になった相手をどう扱うか選ぶ */
  BattleScene.prototype._beginScoutChoice = function () {
    var texts = (this.game.data.messages || {}).scout || {};

    this.commandMenu.setItems([
      { label: texts.choiceSwap    || "swap",    value: "swap" },
      { label: texts.choiceRelease || "release", value: "release" },
      { label: texts.choiceStore   || "store",   value: "store" }
    ]);

    // 見出しは _renderScoutChoice が直接描くので、メッセージ欄は空にしておく
    this.messageLog.clear();
    this.phase = "scoutChoice";
  };

  BattleScene.prototype._updateScoutChoice = function (input) {
    var result = this.commandMenu.handleInput(input);
    // ここは取り消せない（誘いに応じた相手の行き先を必ず決める）
    if (!result || result.type !== "confirm") return;
    if (!this.pendingScout) return;

    this._scoutError = null;  // 選び直したので前回の理由は消す

    switch (result.value) {
      case "swap":    this._beginScoutSwap(); break;
      case "release": this._releaseScout(); break;
      case "store":   this._storeScout(); break;
    }
  };

  /** どの仲間と入れ替えるかを選ぶ */
  BattleScene.prototype._beginScoutSwap = function () {
    var members = this._partyMembers();
    var rows = [];

    for (var i = 0; i < members.length; i++) {
      rows.push({
        type: "entry",
        label: members[i].getName() + "  Lv" + members[i].level,
        right: "HP" + members[i].currentHp + "/" + members[i].getMaxHp(),
        // 番号ではなく個体そのものを覚える（並びがずれても選んだ相手を預けられる）
        value: members[i]
      });
    }

    this.subMenu.setRows(rows);
    this.messageLog.clear();
    this.phase = "scoutSwap";
  };

  BattleScene.prototype._updateScoutSwap = function (input) {
    // ScrollList が扱うのは上下移動だけ。決定・取消はここで見る（技・道具の選択と同じ形）
    this.subMenu.handleInput(input);

    if (input.isPressed("cancel")) {
      this._beginScoutChoice();
      return;
    }
    if (!input.isPressed("confirm") && !this.subMenu.clickedEntry(input)) return;

    var selected = this.subMenu.getSelected();
    if (!selected) return;

    this._swapScout(selected.value);
  };

  /**
   * 選んだ仲間を預かり所へ送り、新しい仲間を迎える。
   * @param {object} member 預けるパーティの個体
   */
  BattleScene.prototype._swapScout = function (member) {
    var texts = (this.game.data.messages || {}).scout || {};
    var monster = this.pendingScout;
    if (!monster || !member) return;

    var index = this.game.party.getMembers().indexOf(member);
    var deposited = (index >= 0) ? this.game.depositToStorage(index) : null;
    if (!deposited) {
      // 預けられないので、まだ行き先は決まっていない。選び直してもらう
      this._scoutChoiceFailed(texts.storageFull);
      return;
    }

    this.scoutSystem.join(this.allySource, monster);
    this._recordJoined(monster);

    this._finishScoutChoice(
      fill(texts.swapped, { out: deposited.getName(), "in": monster.getName() }) + "　" +
      fill(texts.swappedNote, { out: deposited.getName() })
    );
  };

  /** 仲間にせず逃がす */
  BattleScene.prototype._releaseScout = function () {
    var texts = (this.game.data.messages || {}).scout || {};
    var monster = this.pendingScout;
    if (!monster) return;

    // 一度は応じてくれたので、図鑑には記録しておく
    if (this.game.discovery) this.game.discovery.markMonsterCaught(monster.speciesId);
    this._finishScoutChoice(fill(texts.released, { name: monster.getName() }));
  };

  /** そのまま拠点の預かり所へ送る */
  BattleScene.prototype._storeScout = function () {
    var texts = (this.game.data.messages || {}).scout || {};
    var monster = this.pendingScout;
    if (!monster) return;

    if (!this.game.storeMonster(monster)) {
      this._scoutChoiceFailed(texts.storageFull);
      return;
    }
    if (this.game.run) this.game.run.recordMonster(monster);
    this._finishScoutChoice(fill(texts.stored, { name: monster.getName() }));
  };

  /**
   * 選んだ行き先へ入れられなかったとき。
   * 相手はまだ宙に浮いたままなので、理由を出して選び直してもらう。
   */
  BattleScene.prototype._scoutChoiceFailed = function (message) {
    this._scoutError = message || null;
    this._beginScoutChoice();
  };

  /** 行き先が決まったので、結果を見せて戦闘を終える */
  BattleScene.prototype._finishScoutChoice = function (message) {
    this.pendingScout = null;
    this._scoutError = null;

    this.messageLog.clear();
    if (message) this.messageLog.push(message);
    this.messageLog.advance();
    this.phase = "message";
  };

  /** 図鑑と挑戦（ラン）へ、仲間になったことを記録する */
  BattleScene.prototype._recordJoined = function (monster) {
    if (this.game.discovery) this.game.discovery.markMonsterCaught(monster.speciesId);
    if (this.game.run) this.game.run.recordMonster(monster);
  };

  /** 味方の一覧（Party でも配列でも扱えるようにする） */
  BattleScene.prototype._partyMembers = function () {
    var source = this.allySource;
    if (source && typeof source.getMembers === "function") return source.getMembers();
    return source || [];
  };

  /** ターンの初めに、盤面の味方の行動を順に決めていく */
  BattleScene.prototype._beginCommandPhase = function () {
    this.commandIndex = 0;
    this.actions = [];
    this._buildCommandMenu();
    this.phase = "command";
  };

  /** いま行動を決めている味方 */
  BattleScene.prototype._currentActor = function () {
    return this.system.getFieldAllies()[this.commandIndex] || null;
  };

  BattleScene.prototype._updateCommand = function (input) {
    var result = this.commandMenu.handleInput(input);
    if (!result) return;

    // 取り消しで前の仲間の選択に戻る
    if (result.type === "cancel") {
      if (this.commandIndex > 0) {
        this.commandIndex--;
        this.actions.pop();
      }
      return;
    }
    if (result.type !== "confirm") return;

    switch (result.value) {
      case "attack":
        // 通常攻撃は技を選ばず、そのまま相手を選ぶ
        this.pending = { type: "skill", skillId: this._normalAttackId() };
        this._beginTargetSelect("enemy");
        break;
      case "fight":
        this._buildSkillMenu();
        this.phase = "skill";
        break;
      case "defend":
        // 相手を選ぶ必要がないので、そのまま確定する
        this._commitAction({ type: "defend" });
        break;
      case "scout":
        this.pending = { type: "scout" };
        this._beginTargetSelect("enemy");
        break;
      case "item":
        this._buildItemMenu();
        if (!this.subMenu.hasEntries()) {
          this._flashMessage(this.texts.noItems);
          return;
        }
        this.phase = "item";
        break;
      case "flee":
        this._commitAction({ type: "flee" });
        break;
    }
  };

  BattleScene.prototype._updateSkill = function (input) {
    this.subMenu.handleInput(input);

    if (input.isPressed("cancel")) {
      this.phase = "command";
      return;
    }
    if (!input.isPressed("confirm") && !this.subMenu.clickedEntry(input)) return;

    var selected = this.subMenu.getSelected();
    if (!selected) return;

    // PPが足りない技は選べない
    var skill = this.game.data.getSkill(selected.value);
    if (skill && !this._canAfford(this._currentActor(), skill)) {
      this._flashMessage(this.texts.notEnoughPp);
      return;
    }

    this.pending = { type: "skill", skillId: selected.value };
    this._beginTargetSelect("enemy", "skill");
  };

  BattleScene.prototype._updateItem = function (input) {
    this.subMenu.handleInput(input);

    if (input.isPressed("cancel")) {
      this.phase = "command";
      return;
    }
    if (!input.isPressed("confirm") && !this.subMenu.clickedEntry(input)) return;

    var selected = this.subMenu.getSelected();
    if (!selected) return;

    var item = this.game.data.getItem(selected.value);
    this.pending = { type: "item", itemId: selected.value,
                     itemName: item ? item.name : selected.value };
    this._beginTargetSelect("ally", "item");   // 回復なので味方を選ぶ
  };

  /**
   * カーソルが乗っている盤面の相手（乗っていなければ -1）。
   * 絵と状態表示のどちらに重ねても選べるようにしてある。
   *
   * @param {string} side "enemy" / "ally"
   * @param {number} count その側に並んでいる数
   */
  BattleScene.prototype._hoveredMember = function (input, side, count) {
    if (!input.getPointer || count <= 0) return -1;

    var pointer = input.getPointer();
    if (!pointer.inside) return -1;
    if (!pointer.moved && !pointer.clicked) return -1;

    var row = (side === "enemy") ? this.layout.enemyRow : this.layout.allyRow;
    if (!row) return -1;

    for (var i = 0; i < count; i++) {
      if (NS.Panel.containsPoint(this._memberRect(i, count, row), pointer)) return i;
    }
    return -1;
  };

  /**
   * 盤面の1体分の当たり判定（絵の上端から状態表示の下端まで）。
   * 位置の求め方は _renderSide と同じにしてある。
   */
  BattleScene.prototype._memberRect = function (index, count, row) {
    var canvasWidth = this.game.canvas.width;
    var startX = (canvasWidth - row.slotGap * count) / 2;
    var centerX = startX + row.slotGap * index + row.slotGap / 2;

    var width = Math.max(row.statusW, row.spriteSize);
    return {
      x: centerX - width / 2,
      y: row.y,
      w: width,
      h: (row.statusY + row.statusH) - row.y
    };
  };

  /**
   * 相手を選ぶ状態に入る。
   * @param {string} side "enemy" / "ally"
   * @param {string} [returnPhase] 取り消したときに戻る状態（省略時はコマンド選択）
   */
  BattleScene.prototype._beginTargetSelect = function (side, returnPhase) {
    this.targetSide = side;
    this.targetIndex = 0;
    this.targetReturnPhase = returnPhase || "command";
    this.phase = "target";
  };

  BattleScene.prototype._updateTarget = function (input) {
    var candidates = (this.targetSide === "enemy")
      ? this.system.getFieldEnemies()
      : this.system.getFieldAllies();

    if (candidates.length > 0) {
      if (input.isPressed("up")) {
        this.targetIndex = (this.targetIndex - 1 + candidates.length) % candidates.length;
      }
      if (input.isPressed("down")) {
        this.targetIndex = (this.targetIndex + 1) % candidates.length;
      }
    }

    // マウス：相手に重ねると狙いが移り、押すとその相手に決まる
    var hovered = this._hoveredMember(input, this.targetSide, candidates.length);
    if (hovered >= 0) this.targetIndex = hovered;

    if (input.isPressed("cancel")) {
      this.phase = this.targetReturnPhase || "command";
      return;
    }

    var clicked = hovered >= 0 && input.getPointer && input.getPointer().clicked;
    if (!input.isPressed("confirm") && !clicked) return;

    var action = this.pending || {};
    action.targetIndex = this.targetIndex;
    action.targetSide = this.targetSide;
    // 並びがずれても狙った相手を攻撃できるよう、個体そのものも覚えておく
    action.target = candidates[this.targetIndex] || null;
    this._commitAction(action);
  };

  /** 1体分の行動を確定し、全員決まったらターンを解決する */
  BattleScene.prototype._commitAction = function (action) {
    this.actions.push(action);
    this.pending = null;
    this.commandIndex++;

    // スカウトは他の仲間の指示を待たず、すぐその1体だけで動く
    if (action.type === "scout") {
      this._resolveTurn();
      return;
    }

    if (this.commandIndex < this.system.getFieldAllies().length) {
      this.phase = "command";
      return;
    }
    this._resolveTurn();
  };

  /** 全員の行動を素早さ順に解決し、その結果を1つずつ見せる */
  BattleScene.prototype._resolveTurn = function () {
    // 計算前の並びを控えておく（倒れた相手も演出中はその場に残すため）
    this.snapshotAllies = this.system.getFieldAllies();
    this.snapshotEnemies = this.system.getFieldEnemies();

    // 計算前のHPも控えておく。計算はここで一気に終わるので、
    // これが無いと攻撃を見せる前にHPバーが減ってしまう
    this.snapshotHp = this._captureHp();

    var events = this.system.takeTurn(this.actions);

    // 勝ったときだけ、報酬（ゴールド・ドロップ）を渡す
    if (this.system.isOver() && this.system.getResult() === "win") {
      this._awardGold(events);
      this._awardDrops(events);
    }

    this._startPlayback(events);
  };

  /**
   * 倒した敵のゴールドを渡す。
   * 量は個体が計算する（レベルが高い相手ほど多い）。
   */
  BattleScene.prototype._awardGold = function (events) {
    var texts = (this.game.data.messages || {}).battle || {};
    var total = 0;

    for (var i = 0; i < this.enemies.length; i++) {
      var enemy = this.enemies[i];
      if (typeof enemy.getGoldReward === "function") total += enemy.getGoldReward();
    }
    if (total <= 0) return;

    var gained = this.game.giveGold(total);
    events.push({ type: "custom", text: fill(texts.goldGained, { amount: gained }) });
  };

  /**
   * 倒した敵のドロップを持ち物へ加える。
   * 判定は DropSystem、持ち物と図鑑への反映は game.giveItem に任せる。
   */
  BattleScene.prototype._awardDrops = function (events) {
    var texts = (this.game.data.messages || {}).battle || {};
    var drops = this.dropSystem.rollForGroup(this.enemies);

    for (var i = 0; i < drops.length; i++) {
      var item = this.game.data.getItem(drops[i].itemId);
      var name = item ? item.name : drops[i].itemId;

      var added = this.game.giveItem(drops[i].itemId, drops[i].count);
      if (added > 0) {
        events.push({ type: "custom", text: fill(texts.itemDropped,
          { name: name, count: added }) });
      } else {
        // 持ち物がいっぱいで入らなかった場合も、拾えなかったことを知らせる
        events.push({ type: "custom", text: fill(texts.dropLost, { name: name }) });
      }
    }
  };

  /**
   * 技以外の行動（道具・スカウト）を、行動順が回ってきたときに処理する。
   * BattleSystem から呼ばれる。
   */
  BattleScene.prototype._performNonSkillAction = function (step, events) {
    var action = step.action;
    if (action.type === "item") this._resolveItemAction(step, events);
    else if (action.type === "scout") this._resolveScoutAction(step, events);
  };

  BattleScene.prototype._resolveItemAction = function (step, events) {
    var action = step.action;
    var target = this.system.getFieldAllies()[action.targetIndex]
              || this.system.getFieldAllies()[0];
    if (!target) return;

    events.push({ type: "custom", text: fill(this.texts.itemUsed,
      { actor: step.actor.getName(), item: action.itemName }) });

    var result = this.itemUsage.use(action.itemId, target, this.game.inventory);
    if (result.success) {
      events.push({
        type: "custom",
        text: fill(this.texts.itemHealed, { name: target.getName(), amount: result.amount }),
        // 回復もこのメッセージの瞬間にHPバーへ反映する
        revealTarget: target, revealHp: target.currentHp,
        healAmount: result.amount
      });
    } else {
      events.push({ type: "custom", text: this.texts.itemNoEffect });
    }
  };

  BattleScene.prototype._resolveScoutAction = function (step, events) {
    var action = step.action;
    var texts = (this.game.data.messages || {}).scout || {};
    var target = this.system.getFieldEnemies()[action.targetIndex]
              || this.system.getFieldEnemies()[0];
    if (!target) return;

    var party = this.allySource;

    events.push({ type: "custom", text: fill(texts.attempt,
      { actor: step.actor.getName(), name: target.getName() }) });

    // 応じてくれるかどうかは、パーティの空きに関係なく判定する。
    // いっぱいだった場合は、どう扱うかを演出のあとで選んでもらう。
    var result = this.scoutSystem.roll(target);
    if (!result.success) {
      events.push({ type: "custom", text: fill(texts.refused, { name: target.getName() }) });
      return;
    }

    events.push({ type: "custom", text: fill(texts.success, { name: target.getName() }) });

    if (this.scoutSystem.isFull(party)) {
      // 加える先は選んでもらうので、ここではまだパーティに入れない
      this.pendingScout = target;
      events.push({ type: "custom", text: texts.partyFull });
    } else {
      this.scoutSystem.join(party, target);
      this._recordJoined(target);
    }

    // 仲間になった相手は敵ではなくなり、その場で戦闘が終わる
    this.system.removeEnemy(target);

    // 戦闘中だけの印を消しておく。
    // 特に _removed を残すと、この仲間は次の戦闘から行動しなくなる
    target.displaySuffix = null;
    target._removed = false;
    target._defending = false;
    target._onField = false;
    this.system.finishWith("scouted");
    if (texts.battleEnd) events.push({ type: "custom", text: texts.battleEnd });
  };

  /** 選択中に一時的なメッセージだけ出す（行動は決めない） */
  BattleScene.prototype._flashMessage = function (text) {
    if (!text) return;
    this.messageLog.push(text);
    this.messageLog.advance();
  };

  BattleScene.prototype._showNextMessage = function () {
    this.messageLog.advance();
    this.phase = "message";
  };

  /**
   * 戦闘終了後の遷移。
   * onFinish が true を返した場合は「呼び出し側が遷移を処理した」とみなす。
   */
  BattleScene.prototype._updateDone = function () {
    var handled = this.onFinish ? this.onFinish(this.system.getResult()) : false;
    if (!handled) this.game.scenes.change(this.returnScene);
  };

  // --- 描画 ---

  BattleScene.prototype.render = function (ctx) {
    var w = this.game.canvas.width;
    var h = this.game.canvas.height;
    var L = this.layout;

    this.renderer.clear(L.background || "#000000", w, h);

    // 揺れは盤面だけに掛ける（メッセージ欄まで揺れると読みにくいため）
    this.screenEffects.begin(ctx);
    this._renderSide(this._viewEnemies(), L.enemyRow, w, "enemy");
    this._renderSide(this._viewAllies(), L.allyRow, w, "ally");
    this.screenEffects.end(ctx);

    if (this.phase === "command") this._renderCommand();
    else if (this.phase === "skill" || this.phase === "item") this._renderSubMenu();
    else if (this.phase === "scoutChoice") this._renderScoutChoice();
    else if (this.phase === "scoutSwap") this._renderScoutSwap();
    else {
      // 送り待ちのときは「▼」を出す
      this.messageLog.waiting = this.playbackWaiting;
      this.messageLog.render();
    }

    // 浮かぶ数字は一番手前に描く
    this.floatingText.render(ctx);

    // 発光は画面全体に重ねる
    this.screenEffects.renderOverlay(ctx, w, h);
  };

  /**
   * 画面に並べる顔ぶれ。
   * 演出中は開始時の並びを使い、倒れた相手もその場に残して見せる。
   */
  BattleScene.prototype._viewAllies = function () {
    return this.viewAllies || this.system.getFieldAllies();
  };
  BattleScene.prototype._viewEnemies = function () {
    return this.viewEnemies || this.system.getFieldEnemies();
  };

  /**
   * 指定モンスターの画面上の位置（スプライトの中央あたり）。
   * ダメージ表示を出す場所に使う。
   */
  BattleScene.prototype._monsterScreenPos = function (monster) {
    if (!monster) return null;
    var w = this.game.canvas.width;

    var enemies = this._viewEnemies();
    var index = enemies.indexOf(monster);
    if (index >= 0) return this._slotPos(this.layout.enemyRow, enemies.length, index, w);

    var allies = this._viewAllies();
    index = allies.indexOf(monster);
    if (index >= 0) return this._slotPos(this.layout.allyRow, allies.length, index, w);

    return null;
  };

  /**
   * 並びの中の1体分の位置を求める。
   * 数字はスプライトに重ならないよう、頭のすぐ上から出す
   * （離れすぎると誰への表示か分からなくなるため、少しだけ上）。
   */
  BattleScene.prototype._slotPos = function (row, count, index, canvasWidth) {
    if (!row || count <= 0) return null;

    var popup = this.animation.popup || {};
    var startX = (canvasWidth - row.slotGap * count) / 2;

    return {
      x: startX + row.slotGap * index + row.slotGap / 2,
      y: row.y + (popup.spawnOffsetY || 0)
    };
  };

  /**
   * 片側の並びを描く。人数に応じて中央に寄せる。
   */
  BattleScene.prototype._renderSide = function (members, row, canvasWidth, side) {
    if (!row) return;

    var count = members.length;
    if (count === 0) return;

    var totalWidth = row.slotGap * count;
    var startX = (canvasWidth - totalWidth) / 2;

    for (var i = 0; i < count; i++) {
      var centerX = startX + row.slotGap * i + row.slotGap / 2;
      this._renderMember(members[i], centerX, row, side, i);
    }
  };

  BattleScene.prototype._renderMember = function (monster, centerX, row, side, index) {
    var t = this.theme;
    var size = row.spriteSize;

    // HPバーは実際の値ではなく「見た目のHP」で描くので、少しずつ減っていく
    var shownHp = Math.max(0, Math.round(this.animator.getHp(monster)));

    // 見た目のHPが0になった相手は姿を消す
    if (shownHp > 0) {
      this.spriteRenderer.draw(monster.getSpriteId(), centerX - size / 2, row.y, size, size);
    }

    // 状態表示（名前・Lv・HP）
    var rect = { x: centerX - row.statusW / 2, y: row.statusY,
                 w: row.statusW, h: row.statusH };
    this.panel.drawBox(rect);

    var origin = this.panel.innerOrigin(rect);
    this.panel.drawText(monster.getName(), origin.x, origin.y + 10, { font: t.smallFont });

    // 敵のレベルは伏せる（味方だけ表示する）
    if (side === "ally") {
      this.panel.drawText("Lv" + monster.level,
        rect.x + rect.w - (t.padding || 8), origin.y + 10,
        { align: "right", font: t.smallFont, color: t.subTextColor });
    }

    var barW = rect.w - (t.padding || 8) * 2;
    this.hpBar.draw(origin.x, origin.y + 18, barW, 6, shownHp, monster.getMaxHp());

    if (side === "ally") {
      // 味方はPPもバーで出す（HPと同じ見方ができるように）
      this.hpBar.drawPp(origin.x, origin.y + 30, barW, 5,
        monster.currentPp, monster.getMaxPp());

      // 数値は1行にまとめる（左がPP、右がHP）
      this.panel.drawText("PP " + monster.currentPp + "/" + monster.getMaxPp(),
        origin.x, origin.y + 46,
        { font: t.smallFont, color: t.subTextColor });
      this.panel.drawText(shownHp + "/" + monster.getMaxHp(),
        rect.x + rect.w - (t.padding || 8), origin.y + 46,
        { align: "right", font: t.smallFont, color: t.subTextColor });
    }

    this._renderMemberMarkers(monster, rect, side, index);
  };

  /** 行動を決めている味方や、選択中の対象に印をつける */
  BattleScene.prototype._renderMemberMarkers = function (monster, rect, side, index) {
    var t = this.theme;

    // いま行動を決めている味方
    var choosing = (side === "ally")
      && this.phase !== "message" && this.phase !== "done"
      && index === this.commandIndex;
    if (choosing) {
      this.panel.drawText("▼", rect.x + rect.w / 2, rect.y - 6,
        { align: "center", color: t.cursorColor });
    }

    // 選択中の対象
    if (this.phase === "target" && side === this.targetSide && index === this.targetIndex) {
      this.panel.ctx.strokeStyle = t.cursorColor || "#ffd75e";
      this.panel.ctx.lineWidth = 2;
      this.panel.ctx.strokeRect(rect.x - 2, rect.y - 2, rect.w + 4, rect.h + 4);
    }
  };

  /** コマンド欄。だれの行動を決めているかも表示する */
  BattleScene.prototype._renderCommand = function () {
    var actor = this._currentActor();
    var rect = this.layout.message;

    // 左側にメッセージ枠を出して「だれが」を示す
    this.panel.drawBox(rect);
    var origin = this.panel.innerOrigin(rect);
    if (actor) {
      this.panel.drawText(fill(this.texts.commandFor, { name: actor.getName() }),
        origin.x, origin.y + 20);
    }
    this.panel.drawText(this.texts.hintCommand || "", origin.x, rect.y + rect.h - 14,
      { font: this.theme.smallFont, color: this.theme.hintColor });

    this.commandMenu.render();
  };

  BattleScene.prototype._renderSubMenu = function () {
    var rect = this.layout.message;
    this.panel.drawBox(rect);

    var origin = this.panel.innerOrigin(rect);
    var label = (this.phase === "skill") ? this.texts.selectSkill : this.texts.selectItem;
    this.panel.drawText(label || "", origin.x, origin.y + 20);

    // 選んでいるものの中身を左側に出す
    if (this.phase === "skill") this._renderSkillInfo(origin, rect);
    else this._renderItemInfo(origin, rect);

    this.subMenu.render();
  };

  /**
   * 選んでいる技の内容（属性・威力・命中・PP・説明）。
   * 数値も説明も data/skills.js のものをそのまま出す。
   */
  BattleScene.prototype._renderSkillInfo = function (origin, rect) {
    var selected = this.subMenu.getSelected();
    if (!selected) return;

    var skill = this.game.data.getSkill(selected.value);
    if (!skill) return;

    var t = this.theme;
    var info = this.layout.skillInfo || {};
    var lh = t.lineHeight || 18;
    var y = origin.y + 20 + lh + 6;

    // 技名と属性
    var element = (this.game.data.elements || {})[skill.element];
    this.panel.drawText(skill.name, origin.x, y);
    if (element) {
      this.panel.drawText("[" + element.name + "]",
        origin.x + (info.elementOffsetX || 110), y,
        { font: t.smallFont, color: element.color });
    }
    y += lh;

    // 威力・命中・PP
    var accuracy = (skill.accuracy === undefined)
      ? ((this.game.data.battle || {}).defaultAccuracy || 1)
      : skill.accuracy;
    this.panel.drawText(
      fill(this.texts.skillStats, {
        power: skill.power || 0,
        accuracy: Math.round(accuracy * 100),
        pp: skill.pp || 0
      }),
      origin.x, y, { font: t.smallFont, color: t.subTextColor });
    y += lh + 4;

    // 説明
    var lines = wrapText(skill.description || "", info.charsPerLine || 20);
    for (var i = 0; i < lines.length; i++) {
      this.panel.drawText(lines[i], origin.x, y, { font: t.smallFont, color: t.subTextColor });
      y += lh;
    }
  };

  /** 選んでいる道具の説明 */
  BattleScene.prototype._renderItemInfo = function (origin, rect) {
    var selected = this.subMenu.getSelected();
    if (!selected) return;

    var item = this.game.data.getItem(selected.value);
    if (!item) return;

    var t = this.theme;
    var info = this.layout.skillInfo || {};
    var lh = t.lineHeight || 18;
    var y = origin.y + 20 + lh + 6;

    this.panel.drawText(item.name, origin.x, y);
    y += lh + 4;

    var lines = wrapText(item.description || "", info.charsPerLine || 20);
    for (var i = 0; i < lines.length; i++) {
      this.panel.drawText(lines[i], origin.x, y, { font: t.smallFont, color: t.subTextColor });
      y += lh;
    }
  };

  /** 仲間になった相手の行き先を選ぶ画面（コマンド欄を流用する） */
  BattleScene.prototype._renderScoutChoice = function () {
    var texts = (this.game.data.messages || {}).scout || {};
    var rect = this.layout.message;

    this.panel.drawBox(rect);
    var origin = this.panel.innerOrigin(rect);

    if (this.pendingScout) {
      this.panel.drawText(fill(texts.choiceTitle, { name: this.pendingScout.getName() }),
        origin.x, origin.y + 20);
    }
    // 入れられなかった理由（預かり所がいっぱい など）
    if (this._scoutError) {
      this.panel.drawText(this._scoutError, origin.x, origin.y + 44,
        { font: this.theme.smallFont, color: this.theme.hpBarLow || "#e8542a" });
    }
    this.panel.drawText(texts.choiceHint || "", origin.x, rect.y + rect.h - 14,
      { font: this.theme.smallFont, color: this.theme.hintColor });

    this.commandMenu.render();
  };

  /** どの仲間と入れ替えるかを選ぶ画面 */
  BattleScene.prototype._renderScoutSwap = function () {
    var texts = (this.game.data.messages || {}).scout || {};
    var rect = this.layout.message;

    this.panel.drawBox(rect);
    var origin = this.panel.innerOrigin(rect);
    this.panel.drawText(texts.selectMember || "", origin.x, origin.y + 20);
    this.panel.drawText(texts.selectHint || "", origin.x, rect.y + rect.h - 14,
      { font: this.theme.smallFont, color: this.theme.hintColor });

    this.subMenu.render();
  };

  /** 文字数で折り返す（等幅フォント前提の簡易処理） */
  function wrapText(text, charsPerLine) {
    var lines = [];
    for (var i = 0; i < text.length; i += charsPerLine) {
      lines.push(text.substr(i, charsPerLine));
    }
    return lines;
  }

  /** テンプレートの {key} を置き換える */
  function fill(template, values) {
    if (!template) return "";
    return template.replace(/\{(\w+)\}/g, function (match, key) {
      return (values[key] !== undefined) ? values[key] : match;
    });
  }

  NS.BattleScene = BattleScene;
})(window.MyGame);
