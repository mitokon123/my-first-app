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

    // プレイヤー設定はゲーム全体で共有する（画面をまたいでも保持される）
    this.settings = new NS.SettingsManager(gameData);
    // キャンバスを渡すことで、マウス操作も受け取れるようにする。
    // 設定も渡すことで、ホイールの速さが設定画面の値に従う
    this.input = new NS.Input(gameData.keys, canvas, this.settings);
    // 画面の切り替えを暗転でつなぐ（長さと色は data/ui.js の transition）
    this.scenes = new NS.SceneManager((gameData.ui || {}).transition);
    this.loop = new NS.GameLoop(this._update.bind(this), this._render.bind(this));

    // 起動からの経過ミリ秒。絵の動き（MyGame.Motion）が参照する共通の時計。
    // シーンごとに時間を数えなくて済むよう、ここで1つだけ持つ。
    this.clock = 0;

    // ドット絵をぼかさずに描画する
    this.ctx.imageSmoothingEnabled = false;
  }

  /**
   * 進行データ（パーティ・持ち物・発見記録）が無ければ初期状態を用意する。
   * 拠点・探索のどちらから始めても同じ状態になるよう、ここに集約している。
   * 既にあるものはそのまま残す（セーブから復元した場合など）。
   */
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
    if (typeof this.gold !== "number") {
      this.gold = (this.data.player || {}).startingGold || 0;
    }
    this._recordInitialDiscoveries();
  };

  /**
   * ダンジョンをクリア済みとして記録する。
   * 次のダンジョンの解放条件に使う。
   * @param {string} dungeonId
   */
  Game.prototype.markDungeonCleared = function (dungeonId) {
    if (!dungeonId) return;
    if (!this.clearedDungeons) this.clearedDungeons = {};
    this.clearedDungeons[dungeonId] = true;
  };

  Game.prototype.isDungeonCleared = function (dungeonId) {
    return !!(this.clearedDungeons && this.clearedDungeons[dungeonId]);
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
    if (stored) this.discovery.markMonsterCaught(monster.speciesId);
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
   * 上限（config.equipMax）に達している場合は、先に着けていたものを持ち物へ戻す。
   *
   * @param {object} monster 装備させる個体
   * @param {string} itemId data/items.js の id（equip を持つもの）
   * @returns {boolean} 装備できたか
   */
  Game.prototype.equipItem = function (monster, itemId) {
    var item = this.data.getItem(itemId);
    if (!monster || !item || !item.equip) return false;
    if (!this.inventory.has(itemId, 1)) return false;

    if (!monster.equipment) monster.equipment = [];

    var limit = (this.data.config || {}).equipMax;
    if (typeof limit !== "number") limit = 1;

    // 枠が埋まっていれば、いちばん古いものを外して持ち物へ戻す
    while (monster.equipment.length >= limit && monster.equipment.length > 0) {
      this.unequipItem(monster, 0);
    }

    this.inventory.remove(itemId, 1);
    monster.equipment.push(itemId);
    return true;
  };

  /**
   * 装備を外して持ち物へ戻す。
   * 持ち物がいっぱいで戻せない場合は外さない（装備が消えないようにする）。
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

  /** 最初から持っている仲間・アイテムを図鑑に記録する */
  Game.prototype._recordInitialDiscoveries = function () {
    var i;
    var members = this.party.getMembers();
    for (i = 0; i < members.length; i++) {
      this.discovery.markMonsterCaught(members[i].speciesId);
    }

    var slots = this.inventory.getSlots();
    for (i = 0; i < slots.length; i++) {
      this.discovery.markItemObtained(slots[i].itemId);
    }
  };

  Game.prototype.start = function () {
    // 最初はタイトル画面から
    this.scenes.change(new NS.TitleScene(this));
    this.loop.start();
  };

  Game.prototype._update = function (dt) {
    this.clock += dt;
    this.input.update();
    this.scenes.update(dt);
    this.input.lateUpdate();
  };

  Game.prototype._render = function () {
    this.scenes.render(this.ctx);
  };

  NS.Game = Game;
})(window.MyGame);
