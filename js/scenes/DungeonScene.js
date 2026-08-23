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

    // どのダンジョンに挑んでいるか。指定が無ければ最初の1つ
    this.definition = dungeonDef || firstDungeon(game.data);

    this.random = new NS.Random();
    this.player = new NS.Player(0, 0);
    this.floor = 1; // 現在の階層

    this.encounters = new NS.EncounterSystem(game.data, this.random, this.definition);
    this.features = new NS.FeatureSystem(game.data, this.random, this.definition);
    this.blessings = new NS.BlessingSystem(game.data, this.random);
    this.saveManager = new NS.SaveManager(game.data);

    this.placedFeatures = []; // この階層に置かれた仕掛け（宝箱・泉・罠）

    this._moveTimer = 0;  // 次に動けるまでの残り時間（ms）
    this._notice = null;  // 画面に一時表示する通知（セーブ結果など）
    this._noticeTimer = 0;

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

  /** このダンジョンの最深階（ボスがいる階） */
  DungeonScene.prototype.getFinalFloor = function () {
    return (this.definition && this.definition.floors) || 1;
  };

  /** セーブデータから状態を復元する */
  DungeonScene.prototype._restore = function (state) {
    this.game.party = state.party;
    if (state.inventory) this.game.inventory = state.inventory;
    if (state.discovery) this.game.discovery = state.discovery;
    this.game.ensureProgress();   // 足りないものがあれば補う
    this.floor = state.floor || 1;

    var def = this.game.data.dungeon;
    if (state.dungeon && state.dungeon.rows) {
      this.dungeon = new NS.Dungeon(state.dungeon.rows, def.tiles, this.game.data.config.tileSize);
      this.rooms = [];
      this.player.setPosition(state.dungeon.playerCol, state.dungeon.playerRow);
    } else {
      // マップが保存されていない場合は生成し直す
      this._generate();
    }
    this.encounters.setFloor(this.floor);
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

    // 敵の出方は階ごとに変わる（data/dungeons.js の perFloor）
    this.encounters.setFloor(this.floor);
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

  DungeonScene.prototype.enter = function () {};

  /** 現在の状態をセーブし、結果を画面に通知する */
  DungeonScene.prototype._save = function () {
    var result = this.saveManager.save({
      floor: this.floor,
      party: this.game.party,
      storage: this.game.storage,
      inventory: this.game.inventory,
      gold: this.game.gold,
      discovery: this.game.discovery,
      clearedDungeons: this.game.clearedDungeons,
      dungeon: {
        rows: this.dungeon.rows,
        playerCol: this.player.col,
        playerRow: this.player.row
      }
    });

    var texts = (this.game.data.messages || {}).save || {};
    this._showNotice(texts[result.reason] || result.reason);
  };

  /** 画面下部に一定時間だけ通知を表示する */
  DungeonScene.prototype._showNotice = function (text) {
    this._notice = text;
    this._noticeTimer = NOTICE_DURATION;
  };

  DungeonScene.prototype.update = function (dt) {
    var input = this.game.input;

    // 通知の表示時間を減らす
    if (this._noticeTimer > 0) {
      this._noticeTimer -= dt;
      if (this._noticeTimer <= 0) this._notice = null;
    }

    // F でセーブ
    if (input.isPressed("save")) {
      this._save();
      return;
    }

    // P / Tab でパーティ編成画面へ
    if (input.isPressed("party")) {
      this.game.scenes.change(new NS.PartyScene(this.game, this));
      return;
    }

    // Esc / X で拠点へ戻る（自分の足で帰るので、拾ったものは持ち帰れる）
    if (input.isPressed("cancel")) {
      this._returnToHome(true);
      return;
    }

    // R でマップを作り直す（生成の確認用。階層移動は今後の実装で置き換える）
    if (input.isPressed("regenerate")) {
      this._generate();
      return;
    }

    this._updateMovement(dt, input);
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

      // 仕掛けマス（宝箱・泉・罠）。踏んだターンは敵と遭遇しない
      if (this._checkFeature()) return;

      // 実際に1歩進んだときだけ遭遇判定を行う（壁にぶつかった場合は判定しない）
      var enemies = this.encounters.onStep();
      if (enemies) this._startBattle(enemies);
    }
  };

  /**
   * 今いるマスに仕掛けがあれば実行する。
   * @returns {boolean} 仕掛けを踏んだか
   */
  DungeonScene.prototype._checkFeature = function () {
    var feature = this.features.findAt(this.placedFeatures, this.player.col, this.player.row);
    if (!feature) return false;

    var messages = this.features.resolve(feature, this.game);
    if (messages.length > 0) this._showNotice(messages.join("　"));
    return true;
  };

  /**
   * 階段を踏んだときの処理。
   * ボスがいる階層ならボス戦、いなければ次の階層へ進む。
   */
  DungeonScene.prototype._onStairs = function () {
    var boss = this._getBossForFloor(this.floor);
    if (boss) {
      this._startBossBattle(boss);
      return;
    }
    this._descend();
  };

  /** 次の階層へ進む */
  DungeonScene.prototype._descend = function () {
    this.floor++;
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

    var choices = this.blessings.pickChoices(this.game.run);
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
    this.game.scenes.change(battle);
  };

  /** ボス戦を開始する。捕獲・逃走の可否はボス定義（data/bosses.js）に従う */
  DungeonScene.prototype._startBossBattle = function (boss) {
    var self = this;
    var enemy = NS.MonsterInstance.create(boss.species, boss.level, this.game.data, this.random);
    if (!enemy) return;

    var texts = (this.game.data.messages || {}).boss || {};
    var name = boss.title || enemy.getName();

    var battle = new NS.BattleScene(
      this.game,
      this.game.party,
      [enemy],
      this,
      function (result) { return self._onBossBattleFinished(result, boss); },
      {
        allowScout: boss.canScout === true,
        allowFlee: boss.canFlee === true,
        introMessage: texts.appear ? texts.appear.replace("{name}", name) : null
      }
    );
    this.game.scenes.change(battle);
  };

  /**
   * ボス戦終了後の処理。
   * 勝てばそのダンジョンはクリア扱いになり、次のダンジョンが解放される。
   * @returns {boolean} 遷移を自前で行った場合 true
   */
  DungeonScene.prototype._onBossBattleFinished = function (result, boss) {
    if (result !== "win") return this._onBattleFinished(result);

    this.game.markDungeonCleared(this.definition && this.definition.id);

    // 最後のボスならエンディングへ、そうでなければ拠点へ帰還する
    if (boss.isFinal) {
      this.game.endRun(true);
      this.game.scenes.change(new NS.EndingScene(this.game));
    } else {
      this._returnToHome(true);
    }
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
   * 挑戦を終えて拠点へ戻る。
   * @param {boolean} survived 無事に帰れたか（false なら拾ったものを失う）
   */
  DungeonScene.prototype._returnToHome = function (survived) {
    var lost = this.game.endRun(survived);
    var notice = survived ? null : this._formatLostItems(lost.items);

    this.game.scenes.change(new NS.HomeScene(this.game, notice));
  };

  /** 失ったものを1行の文章にする（何も失っていなければ、その旨を返す） */
  DungeonScene.prototype._formatLostItems = function (items) {
    var texts = (this.game.data.messages || {}).run || {};
    if (!items || items.length === 0) return texts.lostNothing || null;

    var parts = [];
    for (var i = 0; i < items.length; i++) {
      var item = this.game.data.getItem(items[i].itemId);
      parts.push((texts.lostEntry || "{name}×{count}")
        .replace("{name}", (item && item.name) || items[i].itemId)
        .replace("{count}", items[i].count));
    }
    return (texts.lostItems || "{list}")
      .replace("{list}", parts.join(texts.separator || "、"));
  };

  DungeonScene.prototype.render = function (ctx) {
    var w = this.game.canvas.width;
    var h = this.game.canvas.height;
    var ts = this.dungeon.tileSize;

    var L = (this.game.data.ui || {}).dungeon || {};
    this.renderer.clear(L.background || "#05070d", w, h);

    // タイル描画
    var mark = L.stairsMark || {};
    for (var r = 0; r < this.dungeon.height; r++) {
      for (var c = 0; c < this.dungeon.width; c++) {
        var tile = this.dungeon.tileAt(c, r);
        if (!tile) continue;

        this.renderer.rect(c * ts, r * ts, ts, ts, tile.color);

        // 階段はひと目で分かるように記号を重ねる
        if (tile.stairs) {
          this.renderer.text(mark.text || "▼", c * ts + ts / 2, r * ts + ts / 2 + 7,
            { color: mark.color || "#ffd75e", font: mark.font || "20px monospace", align: "center" });
        }
      }
    }

    this._renderFeatures(ts, L.featureMark || {});

    // プレイヤー描画（グリッド座標→ピクセル座標への変換はここでのみ行う）
    var px = this.player.col * ts;
    var py = this.player.row * ts;
    this.sprites.draw(this.player.spriteId, px, py, ts, ts);

    this._renderInfoBar(w, h, L.infoBar || {});
    this._renderPartyStatus(w, L.statusBar || {});
    this._renderNotice(w, h, L.notice || {});
  };

  /**
   * 仕掛けマスの記号を重ねて描く。
   * 隠されているもの（罠）は踏むまで描かない。
   */
  DungeonScene.prototype._renderFeatures = function (ts, style) {
    for (var i = 0; i < this.placedFeatures.length; i++) {
      var feature = this.placedFeatures[i];
      var definition = feature.definition || {};

      if (feature.used) continue;
      if (definition.hidden) continue;

      this.renderer.text(definition.mark || "?",
        feature.col * ts + ts / 2, feature.row * ts + ts / 2 + 6,
        {
          color: definition.color || style.color || "#ffd75e",
          font: style.font || "16px monospace",
          align: "center"
        });
    }
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

  /** 画面上部に先頭モンスターの状態を表示 */
  DungeonScene.prototype._renderPartyStatus = function (w, style) {
    var party = this.game.party;
    if (!party || party.isEmpty()) return;

    var barHeight = style.height || 22;
    var lead = party.getLead() || party.get(0);
    this.renderer.rect(0, 0, w, barHeight, style.bg || "rgba(0,0,0,0.6)");
    this.renderer.text(
      lead.getName() + "  Lv" + lead.level +
      "  HP " + lead.currentHp + "/" + lead.getMaxHp() +
      "   仲間 " + party.size() + "/" + party.maxSize,
      10, barHeight - 6,
      { color: style.color || "#c8d0e8", font: style.font || "13px monospace" }
    );
  };

  /** セーブ結果などの通知（画面中央） */
  DungeonScene.prototype._renderNotice = function (w, h, style) {
    if (!this._notice) return;

    var noticeHeight = style.height || 40;
    this.renderer.rect(0, (h - noticeHeight) / 2, w, noticeHeight, style.bg || "rgba(8,10,20,0.92)");
    this.renderer.text(this._notice, w / 2, h / 2 + 6,
      { color: style.color || "#ffd75e", font: style.font || "15px monospace", align: "center" });
  };

  NS.DungeonScene = DungeonScene;
})(window.MyGame);
