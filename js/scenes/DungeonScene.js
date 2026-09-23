/**
 * DungeonScene.js
 * ダンジョン探索シーン。ランダム生成したマップの描画＋プレイヤー移動（当たり判定つき）。
 *
 * プレイヤー位置はグリッド座標(col,row)で保持し、ピクセル変換は render 内でのみ行う。
 */
(function (NS) {
  "use strict";

  var MOVE_DELAY = 130;      // キー押しっぱなし時の1歩あたりの間隔（ms）
  var NOTICE_DURATION = 1800; // 通知を表示しておく時間（ms）

  /**
   * @param {MyGame.Game} game
   * @param {object} dungeonDef 挑むダンジョンの定義（data/dungeons.js の1件）
   * @param {object} [savedState] セーブから復元する場合の状態
   */
  function DungeonScene(game, dungeonDef, savedState) {
    this.game = game;
    this.renderer = new NS.Renderer(game.ctx);
    this.sprites = new NS.SpriteRenderer(game.ctx, game.assets);
    this.panel = new NS.Panel(game.ctx, (game.data.ui || {}).theme || {});

    // どのダンジョンに挑んでいるか。指定が無ければ最初の1つ
    this.definition = dungeonDef || firstDungeon(game.data);

    // 見た目（色と床の飾り）。theme を書いていないダンジョンは既定の色になる
    this.theme = ((game.data.dungeonThemes || {})[this.definition && this.definition.theme]) || {};

    this.random = new NS.Random();
    this.player = new NS.Player(0, 0);
    this.floor = 1; // 現在の階層

    // 矢印キーは歩く操作なので、カーソル音は鳴らさない（Game._playUiSounds）
    this.silentCursor = true;

    this.encounters = new NS.EncounterSystem(game.data, this.random, this.definition);
    this.features = new NS.FeatureSystem(game.data, this.random, this.definition);
    this.blessings = new NS.BlessingSystem(game.data, this.random);

    this.placedFeatures = []; // この階層に置かれた仕掛け（宝箱・泉・罠）
    this.decorations = [];    // この階層の床の飾り（見た目だけ。当たり判定なし）

    this._moveTimer = 0;  // 次に動けるまでの残り時間（ms）
    // 画面に一時表示する知らせ（セーブ結果・拾ったものなど）
    this.notice = new NS.Notice(((game.data.ui || {}).theme || {}).notice);
    // 初めての場面で出る説明（出ているあいだは歩けない）
    this.tutorial = new NS.TutorialBox(this.panel, game);
    // 階を降りるときの暗転（画面は変わらないので自分で行う）
    this.fade = new NS.Fade(((game.data.ui || {}).dungeon || {}).stairFade);

    // マウスだけでも仲間と持ち物を開けるようにする（キーの P / I と同じ）
    var dungeonUi = (game.data.ui || {}).dungeon || {};
    var dungeonTexts = (game.data.messages || {}).dungeon || {};
    var buttons = dungeonUi.buttons || {};
    this.partyButton = new NS.TextButton(this.panel, buttons.party,
      dungeonTexts.buttonParty || "仲間");
    this.itemsButton = new NS.TextButton(this.panel, buttons.items,
      dungeonTexts.buttonItems || "持ち物");

    // 出している問いかけ（聞いている間は移動できない）。
    // 仕掛けを使うか・階段で降りるかなど、その場で決めることに使い回す
    this._prompt = null;

    if (savedState) this._restore(savedState);
    else {
      this._ensureParty();
      this._generate();
    }
  }

  /** 一番はじめのダンジョン定義を返す（指定が無いときの保険） */
  function firstDungeon(gameData) {
    var list = NS.DungeonCatalog ? NS.DungeonCatalog.list(gameData) : [];
    return list[0] || null;
  }

  /** 重み付きで1つ選ぶ（床の飾りの抽選に使う） */
  function pickWeighted(entries, random) {
    var total = 0, i;
    for (i = 0; i < entries.length; i++) total += (entries[i].weight || 0);
    if (total <= 0) return entries[0] || null;

    var roll = random.next() * total;
    for (i = 0; i < entries.length; i++) {
      roll -= (entries[i].weight || 0);
      if (roll <= 0) return entries[i];
    }
    return entries[entries.length - 1];
  }

  /** base に override の項目をかぶせた新しいオブジェクトを返す */
  function merge(base, override) {
    var result = {};
    var key;
    for (key in base) {
      if (Object.prototype.hasOwnProperty.call(base, key)) result[key] = base[key];
    }
    for (key in override) {
      if (Object.prototype.hasOwnProperty.call(override, key)) result[key] = override[key];
    }
    return result;
  }

  /** テンプレートの {key} を values の値で置き換える（他の画面と同じ書き方） */
  function fill(template, values) {
    if (!template) return "";
    return template.replace(/\{(\w+)\}/g, function (match, key) {
      return (values[key] !== undefined) ? values[key] : match;
    });
  }

  /** そのマスが一覧に含まれているか */
  function occupied(list, col, row) {
    for (var i = 0; i < (list || []).length; i++) {
      if (list[i] && list[i].col === col && list[i].row === row) return true;
    }
    return false;
  }

  /** このダンジョンの最深階（ボスがいる階） */
  DungeonScene.prototype.getFinalFloor = function () {
    return (this.definition && this.definition.floors) || 1;
  };

  /**
   * 中断データから状態を復元する（Game.resumeSuspended から）。
   * パーティや持ち物は Game 側で入れ終わっているので、ここは地図と仕掛けだけ。
   */
  DungeonScene.prototype._restore = function (state) {
    this.game.ensureProgress();   // 足りないものがあれば補う
    this.floor = state.floor || 1;

    var def = this.game.data.dungeon;
    if (state.dungeon && state.dungeon.rows) {
      this.dungeon = new NS.Dungeon(state.dungeon.rows, def.tiles, this.game.data.config.tileSize);
      this.rooms = [];
      this.player.setPosition(state.dungeon.playerCol, state.dungeon.playerRow);
      this.placedFeatures = this._restoreFeatures(state.features);
      // 飾りは見た目だけなので保存しない。開いたときに撒き直す
      this._placeDecorations([{ col: this.player.col, row: this.player.row }].concat(this.placedFeatures));
    } else {
      // マップが保存されていない場合は生成し直す
      this._generate();
    }
    this.encounters.setFloor(this.floor);
  };

  /**
   * 仕掛けを保存した形（{ col, row, type, used, revealed }）から戻す。
   * 開けた宝箱が復活しないよう、used もそのまま戻す
   */
  DungeonScene.prototype._restoreFeatures = function (saved) {
    var definitions = this.game.data.features || {};
    var result = [];
    for (var i = 0; i < (saved || []).length; i++) {
      var f = saved[i];
      if (!definitions[f.type]) continue;
      result.push({ col: f.col, row: f.row, type: f.type, definition: definitions[f.type],
                    used: !!f.used, revealed: !!f.revealed });
    }
    return result;
  };

  /**
   * プレイヤーのパーティを用意する（無ければ data/player.js の初期値から生成）。
   * パーティは Game に持たせ、戦闘や階層をまたいでも維持されるようにする。
   */
  DungeonScene.prototype._ensureParty = function () {
    this.game.ensureProgress();
  };

  // ダンジョンを新規生成し、プレイヤーを床へ配置する
  DungeonScene.prototype._generate = function () {
    var def = this.game.data.dungeon;
    // マップの形はダンジョンごとに変えられる（書かれていなければ共通設定）
    var params = (this.definition && this.definition.generation) || def.generation;
    var generator = new NS.DungeonGenerator(params, this.random);
    var result = generator.generate();

    this.dungeon = new NS.Dungeon(result.rows, def.tiles, this.game.data.config.tileSize);
    this.rooms = result.rooms;

    // 階段の上から始まらないよう、階段以外の床に配置する
    var start = this._findStartPosition(result.stairs);
    this.player.setPosition(start.col, start.row);

    // 仕掛けは開始位置と階段を避けて置く（いきなり罠を踏まないように）
    this.placedFeatures = this.features.place(this.dungeon, [start]);

    // 飾りは仕掛けの上に重ならないように置く（宝箱を隠してしまわないため）
    this._placeDecorations([start].concat(this.placedFeatures));

    // 敵の出方は階ごとに変わる（data/dungeons.js の perFloor）
    this.encounters.setFloor(this.floor);
  };

  /**
   * 床の飾りを撒く。効果も当たり判定も持たない、見た目だけのもの。
   * 何をいくつ置くかは data/dungeonThemes.js の decorations が決める。
   * @param {Array<{col:number,row:number}>} avoid 置きたくないマス
   */
  DungeonScene.prototype._placeDecorations = function (avoid) {
    this.decorations = [];

    var settings = this.theme.decorations;
    var table = (settings && settings.table) || [];
    if (table.length === 0) return;

    var count = (settings.count || {});
    var lo = (count.min === undefined) ? 0 : count.min;
    var hi = (count.max === undefined) ? lo : count.max;
    var n = this.random.nextInt(lo, Math.max(lo, hi));

    // 階段のマスにも置かない（記号が読めなくなるため）
    for (var i = 0; i < n; i++) {
      var spot = this._findDecorationSpot(avoid);
      if (!spot) break;

      var entry = pickWeighted(table, this.random);
      if (!entry || !entry.sprite) continue;

      this.decorations.push({ col: spot.col, row: spot.row, sprite: entry.sprite });
      avoid = avoid.concat([spot]);   // 同じマスに重ねない
    }
  };

  /** 飾りを置ける床マスを1つ探す（見つからなければ null） */
  DungeonScene.prototype._findDecorationSpot = function (avoid) {
    for (var i = 0; i < 30; i++) {
      var spot = this.dungeon.randomFloor(this.random);
      if (!spot) return null;

      var tile = this.dungeon.tileAt(spot.col, spot.row);
      if (tile && tile.stairs) continue;
      if (occupied(avoid, spot.col, spot.row)) continue;

      return spot;
    }
    return null;
  };

  /** 開始位置を決める（階段のマスは避ける） */
  DungeonScene.prototype._findStartPosition = function (stairs) {
    for (var i = 0; i < 50; i++) {
      var spot = this.dungeon.randomFloor(this.random);
      if (!stairs || spot.col !== stairs.col || spot.row !== stairs.row) return spot;
    }
    return this.dungeon.findFirstFloor();
  };

  /**
   * その階層のボス定義を返す（無ければ null）。
   * ボスはダンジョンの最深階にだけ出る。
   */
  DungeonScene.prototype._getBossForFloor = function (floor) {
    if (!this.definition || floor < this.getFinalFloor()) return null;
    return (this.game.data.bosses || {})[this.definition.boss] || null;
  };

  /**
   * 初めてダンジョンに入ったときだけ、歩き方の説明を出す。
   * 続きから再開した場合も enter は呼ばれるが、
   * 一度見た説明は TutorialSystem の側で弾かれるので二度は出ない。
   */
  DungeonScene.prototype.enter = function () {
    // ダンジョンごとに曲を変えられる（data/dungeonThemes.js の bgm）。
    // 書いていない場所は共通の dungeon が流れる
    this.game.audio.playBgm(this.theme.bgm || "dungeon");

    if (this.game.tutorial) this.tutorial.show(this.game.tutorial.take("dungeonEnter"));
  };

  /**
   * 探索を中断する（問いかけ → 中断データを書いてタイトルへ）。
   *
   * ★ 探索中に「セーブ」は無い。
   *   セーブは拠点でだけ行い、探索の途中は「中断」で置いておく形にした。
   *   再開すると中断データは消えるので、同じところから何度もやり直せない。
   */
  DungeonScene.prototype._beginSuspend = function () {
    var self = this;
    var texts = (this.game.data.messages || {}).dungeon || {};

    this._openPrompt(texts.suspendPrompt || "",
      [
        { label: texts.suspendNo  || "やめる", value: false },
        { label: texts.suspendYes || "中断する", value: true }
      ],
      function (choice) {
        if (choice === true) self._suspend();
      });
  };

  DungeonScene.prototype._suspend = function () {
    var result = this.game.suspendRun({
      dungeonId: this.definition && this.definition.id,
      floor: this.floor,
      rows: this.dungeon.rows,
      playerCol: this.player.col,
      playerRow: this.player.row
    }, this.placedFeatures);

    var texts = (this.game.data.messages || {}).save || {};
    if (!result.success) {
      this._showNotice(texts[result.reason] || result.reason);
      this.game.playError();
      return;
    }

    this.game.audio.playSe("save");
    this.game.run = null;
    this.game.scenes.change(new NS.TitleScene(this.game));
  };

  /** 画面下部に一定時間だけ通知を表示する */
  DungeonScene.prototype._showNotice = function (text) {
    this.notice.show(text, NOTICE_DURATION);
  };

  DungeonScene.prototype.update = function (dt) {
    var input = this.game.input;

    this.notice.update(dt);

    // 見た目の位置を、本当の位置へ近づける（マス間を滑らせる）
    var L = (this.game.data.ui || {}).dungeon || {};
    this.player.updateView(dt, L.playerMoveDuration);

    // 階を降りている最中は操作を受け付けない
    this.fade.update(dt);
    if (this.fade.isActive()) return;

    // 説明を出している間は歩けない。読んでいる裏で敵に出会わないように
    if (this.tutorial.isActive()) {
      this.tutorial.handleInput(input);
      return;
    }

    // 問いかけを出している間は、それだけを操作する
    if (this._prompt) {
      this._updatePrompt(input);
      return;
    }

    // 地図に重ねたボタン。キーと同じ働きをする
    if (this.partyButton.handleInput(input)) {
      this._openParty();
      return;
    }
    if (this.itemsButton.handleInput(input)) {
      this._openItems();
      return;
    }

    // F で中断（問いかけを出す）
    if (input.isPressed("save")) {
      this._beginSuspend();
      return;
    }

    if (input.isPressed("party")) { this._openParty(); return; }
    if (input.isPressed("items")) { this._openItems(); return; }

    // 帰れるのは階段の上か、帰還の石を使ったときだけ。
    // どこからでも帰れると、危なくなったら必ず逃げ切れてしまう
    if (input.isPressed("cancel")) {
      this._showNotice(((this.game.data.messages || {}).dungeon || {}).cannotLeave);
      return;
    }

    this._updateMovement(dt, input);
  };

  /**
   * 仲間の画面へ。
   * 探索中は拠点の預かり所へ手が届かないので、その表は出さない。
   */
  DungeonScene.prototype._openParty = function () {
    this.game.scenes.change(new NS.PartyScene(this.game, this, { allowStorage: false }));
  };

  /**
   * 持ち物の画面へ。ここで使えるのは usableIn に "dungeon" を書いたものだけ。
   * 帰還の石を使ったときは、そのまま拠点へ引き上げる。
   */
  DungeonScene.prototype._openItems = function () {
    var self = this;
    this.game.scenes.change(new NS.ItemScene(this.game, this, "dungeon", function () {
      self._returnToHome(true);
    }));
  };

  // 入力から移動方向を決め、間隔(MOVE_DELAY)ごとに1歩進める
  DungeonScene.prototype._updateMovement = function (dt, input) {
    if (this._moveTimer > 0) this._moveTimer -= dt;

    // 上下左右のいずれか（同時押しは縦優先）
    var dCol = 0, dRow = 0;
    if (input.isDown("up")) dRow = -1;
    else if (input.isDown("down")) dRow = 1;
    else if (input.isDown("left")) dCol = -1;
    else if (input.isDown("right")) dCol = 1;

    if (dCol === 0 && dRow === 0) {
      this._moveTimer = 0; // 手を離したら次の入力に即反応できるようにする
      return;
    }

    if (this._moveTimer <= 0) {
      var moved = this.player.tryMove(dCol, dRow, this.dungeon);
      this._moveTimer = MOVE_DELAY;

      if (!moved) return;

      // 階段を踏んだら次へ進む（遭遇判定より優先する）
      var tile = this.dungeon.tileAt(this.player.col, this.player.row);
      if (tile && tile.stairs) {
        this._onStairs();
        return;
      }

      // 毒などで歩くたびに削れる（1歩進めたときだけ）
      this._applyWalkDamage();

      // 仕掛けマス（宝箱・泉・罠）。踏んだターンは敵と遭遇しない
      if (this._checkFeature()) return;

      // 実際に1歩進んだときだけ遭遇判定を行う（壁にぶつかった場合は判定しない）
      var enemies = this.encounters.onStep();
      if (enemies) this._startBattle(enemies);
    }
  };

  /**
   * 歩くたびに削れる状態異常（毒）を、仲間全員に適用する。
   * 削るのは個体（MonsterInstance.walkStep）。HPは1で止まる。
   *
   * ★ 知らせは出さない。
   *   5歩ごとに画面中央へ知らせが出ると、歩いている最中ずっと視界を遮る。
   *   左上のパーティ表示に「毒」の印とHPが常に出ているので、
   *   減っていることはそちらで分かる。
   */
  DungeonScene.prototype._applyWalkDamage = function () {
    var members = this.game.party.getMembers();

    for (var i = 0; i < members.length; i++) {
      if (members[i].walkStep) members[i].walkStep();
    }
  };

  /**
   * 今いるマスに仕掛けがあれば実行する。
   * @returns {boolean} 仕掛けを踏んだか
   */
  DungeonScene.prototype._checkFeature = function () {
    var feature = this.features.findAt(this.placedFeatures, this.player.col, this.player.row);
    if (!feature) return false;

    // 泉のように「使うか」を選べる仕掛けは、ここでは実行せず問いかけだけ出す
    if (this.features.needsConfirm(feature)) {
      this._beginFeatureConfirm(feature);
      return true;
    }

    this._resolveFeature(feature);
    return true;
  };

  /** 仕掛けを実行し、結果を通知する */
  DungeonScene.prototype._resolveFeature = function (feature) {
    var messages = this.features.resolve(feature, this.game);
    if (messages.length > 0) this._showNotice(messages.join("　"));

    // 仕掛けごとの音（data/features.js の se）。書いていない仕掛けは無音
    var se = (feature.definition || {}).se;
    if (se) this.game.audio.playSe(se);
  };

  /**
   * 「使うか / やめておくか」を聞き始める。
   * やめておいた仕掛けは使われないまま残るので、あとで戻ってくれば使える。
   */
  DungeonScene.prototype._beginFeatureConfirm = function (feature) {
    var self = this;

    this._openPrompt(this.features.getPrompt(feature),
      this.features.getConfirmChoices(),
      function (choice) {
        if (choice === true) self._resolveFeature(feature);
        else self._showNotice(self.features.getSkipMessage(feature));
      });
  };

  // --- その場で決めてもらう問いかけ ---

  /**
   * 問いかけを出す。返事があるまで移動できない。
   *
   * 仕掛けを使うか、階段で降りるか、といった「その場の判断」に使い回す。
   *
   * @param {string} text 問いかけ（"\n" で改行できる）
   * @param {Array<{label:string, value:*}>} items 選択肢
   * @param {function} onChoose 選ばれた value を受け取る。取り消しなら null
   */
  DungeonScene.prototype._openPrompt = function (text, items, onChoose) {
    var lines = (text || "").split("\n");
    var rects = this._promptRects(lines.length, items.length);

    var menu = new NS.CommandMenu(this.panel, rects.menu);
    menu.setItems(items);

    this._prompt = { lines: lines, rect: rects.text, menu: menu, onChoose: onChoose };

    // 問いかけが読めるように、出しっぱなしの知らせは消しておく
    this.notice.clear();
  };

  /**
   * 問いかけの窓の大きさを、中身の量から決める。
   *
   * 高さを決め打ちにすると、選択肢が増えたときに文字がはみ出す。
   * 行数から計算しておけば、選択肢がいくつでも収まる。
   */
  DungeonScene.prototype._promptRects = function (lineCount, itemCount) {
    var P = ((this.game.data.ui || {}).dungeon || {}).prompt || {};
    var x = (P.x === undefined) ? 236 : P.x;
    var y = (P.y === undefined) ? 168 : P.y;
    var w = P.w || 330;
    var lineHeight = P.lineHeight || 20;
    var menuLineHeight = P.menuLineHeight || 26;
    var padding = this._panelPadding();

    var textHeight = padding * 2 + lineHeight * Math.max(1, lineCount);
    var menuTop = y + textHeight + (P.gap || 10);

    return {
      text: { x: x, y: y, w: w, h: textHeight, lineHeight: lineHeight },
      menu: { x: x, y: menuTop, w: w, lineHeight: menuLineHeight,
              h: padding * 2 + menuLineHeight * Math.max(1, itemCount) }
    };
  };

  /** 枠の内側の余白（Panel と同じ値を使う） */
  DungeonScene.prototype._panelPadding = function () {
    var theme = ((this.game.data.ui || {}).theme) || {};
    return theme.padding || 10;
  };

  /**
   * 問いかけへの返事を処理する。
   * キャンセル（Esc / 右クリック）は「決めなかった」扱いで null を渡す。
   */
  DungeonScene.prototype._updatePrompt = function (input) {
    var action = this._prompt.menu.handleInput(input);
    if (!action) return;

    var onChoose = this._prompt.onChoose;
    this._prompt = null;   // 先に閉じる（呼び先が画面を切り替えても壊れない）

    if (onChoose) onChoose(action.type === "confirm" ? action.value : null);
  };

  /**
   * 階段を踏んだときの処理。
   *
   * 階段は「ここまでで切り上げる」ことを決められる唯一の場所なので、
   * 降りるか帰るかをその場で選ばせる。最深階では、主に挑むかどうかになる。
   */
  DungeonScene.prototype._onStairs = function () {
    var self = this;
    var boss = this._getBossForFloor(this.floor);
    var texts = (this.game.data.messages || {}).dungeon || {};

    if (boss) {
      this._openPrompt(texts.bossPrompt, [
        { label: texts.choiceFight || "挑む", value: "go" },
        { label: texts.choiceReturn || "戻る", value: "home" },
        { label: texts.choiceStay || "やめる", value: "stay" }
      ], function (choice) {
        if (choice === "go") self._startBossBattle(boss);
        else if (choice === "home") self._returnToHome(true);
      });
      return;
    }

    this._openPrompt(texts.stairsPrompt, [
      { label: texts.choiceDescend || "降りる", value: "go" },
      { label: texts.choiceReturn || "戻る", value: "home" },
      { label: texts.choiceStay || "やめる", value: "stay" }
    ], function (choice) {
      // いったん暗くしてから次の階を作る。作り替わる瞬間は見えない
      if (choice === "go") self.fade.start(function () { self._descend(); });
      else if (choice === "home") self._returnToHome(true);
    });
  };

  /** 次の階層へ進む */
  DungeonScene.prototype._descend = function () {
    this.game.audio.playSe("stairs");
    this.floor++;
    if (this.game.run) this.game.run.recordFloor(this.floor);
    this._generate();
    this.encounters.resetGrace();

    var texts = (this.game.data.messages || {}).dungeon || {};
    var notice = texts.descend
      ? texts.descend.replace("{floor}", this.floor)
      : null;

    // 次がボス階なら知らせる
    if (this._getBossForFloor(this.floor) && texts.bossAhead) {
      notice = notice ? (notice + "   " + texts.bossAhead) : texts.bossAhead;
    }
    this._showNotice(notice);

    // 降りるたびに加護を1つ選ぶ（そのラン限りの強化）
    this._offerBlessing();
  };

  /**
   * 加護の選択画面へ。
   * 候補が無い（すべて取り終えた・無効にしている）場合は何もしない。
   */
  DungeonScene.prototype._offerBlessing = function () {
    if (!this.game.run) return;

    // game を渡すことで、買っていない加護と、外している加護が候補から抜ける
    var choices = this.blessings.pickChoices(this.game.run, this.game);
    if (choices.length === 0) return;

    this.game.scenes.change(new NS.BlessingScene(this.game, choices, this));
  };

  /**
   * 戦闘シーンへ切り替える。終了後はこのシーンへ戻る。
   * @param {MyGame.MonsterInstance|MyGame.MonsterInstance[]} enemies 敵（1体でも配列でも可）
   */
  DungeonScene.prototype._startBattle = function (enemies) {
    var self = this;
    var group = Array.isArray(enemies) ? enemies : [enemies];

    var battle = new NS.BattleScene(
      this.game,
      this.game.party,
      group,
      this,                 // 戦闘後に戻るシーン
      // 戻り値をそのまま返すことで、遷移を自前で行ったかどうかを BattleScene へ伝える
      function (result) { return self._onBattleFinished(result); }
    );
    this._enterBattle(battle);
  };

  /**
   * 出会いの演出をはさんで戦闘へ移る。
   *
   * ★ 曲は演出が始まるこの瞬間に鳴らし始める。
   *   戦闘画面が出てからでは、渦を巻いて寄っていく間が無音になり、
   *   「出会った」感じが弱い。演出の頭で鳴ると、音と絵が同時に切り替わる
   */
  DungeonScene.prototype._enterBattle = function (battle) {
    this.game.audio.playBgm(battle.getBgmId());
    // 演出の中身は data/ui.js の transition.effects.encounter
    this.game.scenes.change(battle, "encounter");
  };

  /** ボス戦を開始する。捕獲・逃走の可否はボス定義（data/bosses.js）に従う */
  DungeonScene.prototype._startBossBattle = function (boss) {
    var self = this;
    var enemy = NS.MonsterInstance.create(boss.species, boss.level, this.game.data, this.random);
    if (!enemy) return;

    // 主としての補正。仲間にすると外れるので、基礎値を上げずに強くできる
    if (enemy.setEncounterMultipliers) enemy.setEncounterMultipliers(boss.statMultiplier);
    // 決まった順番で動く主は、ここで手順を渡す
    if (enemy.setActionPattern) enemy.setActionPattern(boss.actionPattern);
    // 主として立ちはだかるあいだだけ効かない状態異常。
    // 全ボス共通のぶん（data/battle.js の bossImmuneToStatus）に、その主だけのぶんを足す
    if (enemy.setBossStatusImmunity) {
      enemy.setBossStatusImmunity(this._bossImmunities(boss));
    }

    var texts = (this.game.data.messages || {}).boss || {};
    var name = boss.title || enemy.getName();

    var battle = new NS.BattleScene(
      this.game,
      this.game.party,
      [enemy],
      this,
      function (result) { return self._onBossBattleFinished(result, boss); },
      {
        allowScout: this._canScoutBoss(boss),
        // 主からは共通して逃げられない（data/battle.js の bossCanFlee）。
        // ボスごとの設定にはしていない —— 足すたびの書き忘れを防ぐため
        allowFlee: (this.game.data.battle || {}).bossCanFlee === true,
        // ボスは高いレベルで戦うので、仲間になるときはレベルを下げる
        scoutLevel: this._bossJoinLevel(boss),
        introMessage: texts.appear ? texts.appear.replace("{name}", name) : null,
        // 主ごとの曲（data/bosses.js の bgm）。書いていなければ主の共通曲
        bgm: boss.bgm || null
      }
    );
    this._enterBattle(battle);
  };

  /**
   * 主として立ちはだかるあいだ効かない状態異常。
   *
   * 全ボス共通のぶん（data/battle.js の bossImmuneToStatus）と、
   * その主だけのぶん（data/bosses.js の immuneToStatus）を足したもの。
   * 共通のほうを1か所に置いてあるのは、逃走（bossCanFlee）と同じで、
   * ボスを足すときの書き忘れを防ぐため。
   * @returns {string[]}
   */
  DungeonScene.prototype._bossImmunities = function (boss) {
    var shared = (this.game.data.battle || {}).bossImmuneToStatus || [];
    var own = (boss && boss.immuneToStatus) || [];
    var list = shared.slice();

    for (var i = 0; i < own.length; i++) {
      if (list.indexOf(own[i]) < 0) list.push(own[i]);
    }
    return list;
  };

  /**
   * そのボスを誘えるか。
   * 条件（scoutableWhen）はダンジョンや店の解放条件と同じ仕組みで判定する。
   * 条件が書かれていないボスは誘えない。
   */
  DungeonScene.prototype._canScoutBoss = function (boss) {
    if (!boss || !boss.scoutableWhen) return false;
    if (!NS.DungeonCatalog) return false;

    return NS.DungeonCatalog.isConditionMet(
      boss.scoutableWhen, this.game.clearedDungeons, this.game.data);
  };

  /** ボスが仲間になったときのレベル（ボス個別の指定 → data/scout.js の既定） */
  DungeonScene.prototype._bossJoinLevel = function (boss) {
    if (boss && boss.scoutLevel !== undefined) return boss.scoutLevel;
    return (this.game.data.scout || {}).bossJoinLevel;
  };

  /**
   * ボス戦終了後の処理。
   * 勝てばそのダンジョンはクリア扱いになり、次のダンジョンが解放される。
   * @returns {boolean} 遷移を自前で行った場合 true
   */
  DungeonScene.prototype._onBossBattleFinished = function (result, boss) {
    // 誘いに応じてもらえたら、その挑戦はそこで終わる。
    // ボス戦が終わったことに変わりはないので、勝ったときと同じように拠点へ帰る
    // （その場に残れると、主を何体でも狩れてしまう）
    if (result === "scouted") {
      this._returnToHome(true, "scouted");
      return true;
    }

    if (result !== "win") return this._onBattleFinished(result);

    var newlyCleared = this.game.markDungeonCleared(this.definition && this.definition.id);

    // 最後のボスならエンディングへ、そうでなければ結果を見せてから拠点へ
    if (boss.isFinal) {
      this.game.endRun(true);
      this.game.scenes.change(new NS.EndingScene(this.game));
      return true;
    }

    // はじめてのクリアなら、その場でセーブする（第3引数）
    this._returnToHome(true, "cleared", newlyCleared);
    return true;
  };

  /**
   * 戦闘終了後の処理。
   * @returns {boolean} 遷移を自前で行った場合 true（BattleScene 側の復帰処理を抑止する）
   */
  DungeonScene.prototype._onBattleFinished = function (result) {
    this.encounters.resetGrace();

    // 全滅したら拠点へ送り返される。このランで拾ったものは持ち帰れない
    if (result === "lose") {
      this._returnToHome(false);
      return true;
    }
    return false;
  };

  /**
   * 挑戦を終えて結果画面へ。拠点へはそこから戻る。
   *
   * 何を持ち帰れたかは endRun の前に控えておく（endRun で記録が消えるため）。
   *
   * @param {boolean} survived 無事に帰れたか（false なら拾ったものを失う）
   * @param {string} [outcome] "escaped" / "cleared" / "defeated"。省略時は生死から決める
   * @param {boolean} [autoSave] 帰り着いた時点でセーブするか（はじめてのクリアのとき）
   */
  DungeonScene.prototype._returnToHome = function (survived, outcome, autoSave) {
    if (this.game.run) this.game.run.recordFloor(this.floor);

    var summary = this.game.run ? this.game.run.getSummary() : null;
    var lost = this.game.endRun(survived);

    // ★ クリア記録だけは、この場で書き出す。
    //   このゲームは手動セーブだが、クリアは「1回の挑戦の成果」ではなく
    //   次のダンジョン・店・工房が開くという恒久的な変化なので、
    //   セーブし忘れて消えると、もう一度主を倒しに行くことになる。
    //   endRun のあとなので、保存されるのは拠点に着いた状態（全快後）。
    var saved = autoSave ? this.game.saveProgress().success : false;
    if (saved) this.game.audio.playSe("save");

    this.game.scenes.change(new NS.ResultScene(this.game, {
      outcome: outcome || (survived ? "escaped" : "defeated"),
      dungeon: (summary && summary.dungeon) || this.definition,
      floor: (summary && summary.floor) || this.floor,
      gold: (summary && summary.gold) || 0,
      items: (summary && summary.items) || [],
      lostItems: (lost && lost.items) || [],
      saved: saved
    }));
  };


  DungeonScene.prototype.render = function (ctx) {
    var w = this.game.canvas.width;
    var h = this.game.canvas.height;
    var ts = this.dungeon.tileSize;

    var L = (this.game.data.ui || {}).dungeon || {};

    // 色はダンジョンごとのテーマが優先。書かれていなければ既定の色を使う
    var tileColors = this.theme.tiles || {};
    var mark = merge(L.stairsMark || {}, this.theme.stairsMark);

    this.renderer.clear(this.theme.background || L.background || "#05070d", w, h);

    // タイル描画
    for (var r = 0; r < this.dungeon.height; r++) {
      for (var c = 0; c < this.dungeon.width; c++) {
        var tile = this.dungeon.tileAt(c, r);
        if (!tile) continue;

        this.renderer.rect(c * ts, r * ts, ts, ts, tileColors[tile.name] || tile.color);

        // 階段はひと目で分かるように重ねて描く。
        // 絵が用意されていれば絵、無ければ今までどおり記号
        if (tile.stairs) this._drawStairs(c, r, ts, mark);
      }
    }

    this._renderDecorations(ts);
    this._renderFeatures(ts, L.featureMark || {});

    this._renderPlayer(ts);

    this._renderInfoBar(w, h, L.infoBar || {});
    this._renderPartyStatus(L.partyStatus || {});
    // マウス用のボタンは地図の上に重ねる
    this.partyButton.render();
    this.itemsButton.render();

    this._renderNotice(w, h, L.notice || {});
    this._renderPrompt();
    this.tutorial.render();   // 説明は地図の上に重ねる
    this.fade.render(ctx);    // 階の切り替えの暗幕は、すべての上に重ねる
  };

  /**
   * 階段を1マス分描く。
   *
   * ★ 絵（sprite）と記号（text）の両方に対応させてある。
   *   ダンジョンのテーマ（data/dungeonThemes.js）が stairsMark を
   *   上書きできる作りなので、場所によって別の絵にすることもできる。
   */
  DungeonScene.prototype._drawStairs = function (col, row, ts, mark) {
    if (mark.sprite && this.game.assets.get(mark.sprite)) {
      this.sprites.draw(mark.sprite, col * ts, row * ts, ts, ts);
      return;
    }

    this.renderer.text(mark.text || "▼", col * ts + ts / 2, row * ts + ts / 2 + 7,
      { color: mark.color || "#ffd75e", font: mark.font || "20px monospace", align: "center" });
  };

  /**
   * プレイヤーを描く。
   * グリッド座標からピクセル座標への変換は、ここでのみ行う。
   *
   * ★ 描くのは「見た目の位置」（viewCol / viewRow）。
   *   判定に使う col/row を少し遅れて追いかけるので、マス間を滑って見える。
   *
   * ★ 歩いているあいだだけコマ絵の動きに切り替える。
   *   「見た目の位置が本当の位置に追いついていない＝まだ歩いている」で判定する。
   *   歩数を数えたりタイマーを持ったりしなくてよい。
   */
  DungeonScene.prototype._renderPlayer = function (ts) {
    var look = (this.game.data.player || {}).appearance || {};
    // 選んだ服の色の絵を使う（決めていなければ既定の色になる）
    var sprite = NS.PlayerLook
      ? NS.PlayerLook.spritesFor(this.game.data, this.game.getPlayerColor())
      : (look.sprite || "playerWalk1");

    var motionId = this.player.isSettled()
      ? (look.idleMotion || "breathe")
      : (look.walkMotion || "playerWalk");

    var px = this.player.viewCol * ts;
    var py = this.player.viewRow * ts;

    this.sprites.drawMotion(sprite, px, py, ts, ts,
      NS.Motion.forSprite(this.game.data, sprite, motionId, this.game.clock, 0));
  };

  /**
   * 床の飾りを描く。
   * タイルの上・仕掛けの下に置くので、宝箱などを隠すことはない。
   */
  DungeonScene.prototype._renderDecorations = function (ts) {
    for (var i = 0; i < this.decorations.length; i++) {
      var deco = this.decorations[i];
      this.sprites.draw(deco.sprite, deco.col * ts, deco.row * ts, ts, ts);
    }
  };

  /** 出している問いかけ（聞いている間だけ出す） */
  DungeonScene.prototype._renderPrompt = function () {
    if (!this._prompt) return;

    var rect = this._prompt.rect;
    var lineHeight = rect.lineHeight || 20;
    var origin = this.panel.innerOrigin(rect);
    var lines = this._prompt.lines;

    this.panel.drawBox(rect);
    for (var i = 0; i < lines.length; i++) {
      this.panel.drawText(lines[i], origin.x, origin.y + lineHeight * (i + 1) - 4);
    }
    this._prompt.menu.render(this.game.clock);
  };

  /**
   * 仕掛けマスを描く。
   *
   * ・隠されているもの（罠）は踏むまで描かない
   * ・使い終わったものは、usedSprite が指定されているときだけ跡を残す
   *   （開いた宝箱・水の引いた泉・作動した罠。通った場所が分かるように）
   * ・スプライトが無い仕掛けは、今までどおり記号で描く
   */
  DungeonScene.prototype._renderFeatures = function (ts, style) {
    for (var i = 0; i < this.placedFeatures.length; i++) {
      var feature = this.placedFeatures[i];
      var definition = feature.definition || {};

      if (feature.used) {
        if (!definition.usedSprite) continue;
        this._drawFeatureSprite(definition.usedSprite, feature, ts);
        continue;
      }

      if (definition.hidden) continue;

      if (definition.sprite) {
        this._drawFeatureSprite(definition.sprite, feature, ts);
        continue;
      }

      // 絵が用意されていない仕掛けは記号で示す
      this.renderer.text(definition.mark || "?",
        feature.col * ts + ts / 2, feature.row * ts + ts / 2 + 6,
        {
          color: definition.color || style.color || "#ffd75e",
          font: style.font || "16px monospace",
          align: "center"
        });
    }
  };

  /** 仕掛けの絵を1マス分描く */
  DungeonScene.prototype._drawFeatureSprite = function (spriteId, feature, ts) {
    this.sprites.draw(spriteId, feature.col * ts, feature.row * ts, ts, ts);
  };

  /** 画面下部の情報帯（階層・操作説明）。文言は data/messages.js */
  DungeonScene.prototype._renderInfoBar = function (w, h, style) {
    var texts = (this.game.data.messages || {}).dungeon || {};
    var template = texts.infoBar || "B{floor}F";
    var text = template
      .replace("{name}", (this.definition && this.definition.name) || "")
      .replace("{floor}", this.floor)
      .replace("{floors}", this.getFinalFloor())
      .replace("{rooms}", this.rooms.length);

    var barHeight = style.height || 24;
    this.renderer.rect(0, h - barHeight, w, barHeight, style.bg || "rgba(0,0,0,0.7)");
    this.renderer.text(text, 10, h - barHeight + 16,
      { color: style.color || "#c8d0e8", font: style.font || "13px monospace" });
  };

  /**
   * 画面左上のパーティ表示。仲間全員の「名前とHP」を並べる。
   *
   * ▼ なぜ全員ぶんを出すのか
   * 以前は先頭の1体だけを横帯で出していたが、それだと
   * 控えのHPを見るのに、そのつど仲間画面を開かなければならなかった。
   *
   * ▼ 状態異常の印
   * 名前のうしろに出す。文字と色は data/statuses.js の short / color で、
   * 戦闘中の印（BattleScene._renderModifierMarks）とまったく同じものが並ぶ。
   * ダンジョンでは毒が歩くたびに削ってくるので、
   * 「いま誰が毒か」がここで分からないと、解毒草を使う判断ができない。
   *
   * 枠の高さは人数から決める（data/ui.js に高さは書かない）。
   */
  DungeonScene.prototype._renderPartyStatus = function (style) {
    var party = this.game.party;
    if (!party || party.isEmpty()) return;

    var members = party.getMembers();
    var t = this.panel.theme;
    var ctx = this.game.ctx;

    var x0 = style.x || 0;
    var y0 = style.y || 0;
    var pad = style.padding || 8;
    var rowHeight = style.rowHeight || 16;
    var boxW = style.width || 190;
    var font = style.font || t.smallFont || "12px monospace";

    this.renderer.rect(x0, y0, boxW, pad * 2 + rowHeight * members.length,
      style.bg || "rgba(0,0,0,0.6)");

    // HPの数値を右端に置くので、名前と印はその手前までしか使えない
    ctx.font = font;
    var hpRight = x0 + boxW - pad;
    var nameLimit = hpRight - ctx.measureText("000/000").width - 8;

    for (var i = 0; i < members.length; i++) {
      var m = members[i];
      var y = y0 + pad + rowHeight * (i + 1) - 4;
      var fainted = m.isFainted();

      ctx.font = font;
      var name = clipText(ctx, m.getName(), nameLimit - (x0 + pad));
      this.renderer.text(name, x0 + pad, y, {
        font: font,
        color: fainted ? (style.faintColor || t.hpBarLow) : (style.color || t.textColor)
      });

      ctx.font = font;
      NS.StatusMarks.draw(this.panel, NS.StatusMarks.defsOf(m),
        x0 + pad + ctx.measureText(name).width + 6, y,
        { font: font, gap: 2, maxX: nameLimit, sprites: this.sprites, data: this.game.data, size: 12 });

      // HPは右寄せ。残りが少ないほど色が変わる（戦闘のHPバーと同じしきい値）
      this.renderer.text(m.currentHp + "/" + m.getMaxHp(), hpRight, y,
        { font: font, color: this._hpColor(m), align: "right" });
    }
  };

  /** 残りHPの割合で決まる文字色。しきい値も色も data/ui.js の theme から取る */
  DungeonScene.prototype._hpColor = function (monster) {
    var t = this.panel.theme;
    var max = monster.getMaxHp();
    var ratio = (max > 0) ? (monster.currentHp / max) : 0;

    if (ratio <= (t.hpLowThreshold || 0.25)) return t.hpBarLow;
    if (ratio <= (t.hpMidThreshold || 0.5)) return t.hpBarMid;
    return t.hpBarHigh;
  };

  /**
   * 幅に収まらない文字列を切り詰めて「…」を付ける。
   * 名前は自分で付けられるので、長い名前で枠からはみ出さないようにする。
   * ※ 呼ぶ前に ctx.font を設定しておくこと
   */
  function clipText(ctx, text, maxWidth) {
    if (maxWidth <= 0 || ctx.measureText(text).width <= maxWidth) return text;

    for (var len = text.length - 1; len > 0; len--) {
      var cut = text.slice(0, len) + "…";
      if (ctx.measureText(cut).width <= maxWidth) return cut;
    }
    return "…";
  }

  /** セーブ結果などの通知（画面中央） */
  DungeonScene.prototype._renderNotice = function (w, h, style) {
    if (!this.notice.isActive()) return;

    var ctx = this.game.ctx;
    var noticeHeight = style.height || 40;

    // 帯と文字をまとめて薄くする（別々にすると帯だけ残って見える）
    ctx.save();
    ctx.globalAlpha = this.notice.getAlpha();
    this.renderer.rect(0, (h - noticeHeight) / 2, w, noticeHeight, style.bg || "rgba(8,10,20,0.92)");
    this.renderer.text(this.notice.getText(), w / 2, h / 2 + 6,
      { color: style.color || "#ffd75e", font: style.font || "15px monospace", align: "center" });
    ctx.restore();
  };

  NS.DungeonScene = DungeonScene;
})(window.MyGame);
