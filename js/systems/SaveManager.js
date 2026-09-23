/**
 * SaveManager.js
 * セーブデータの保存・読み込みを担当する。
 *
 * 保存先は localStorage。使えない環境（ブラウザの設定など）でも
 * ゲームが止まらないよう、失敗しても例外を投げず結果を返す形にしている。
 *
 * ▼ 保存する内容
 *   version   : セーブ形式のバージョン（data/save.js）
 *   savedAt   : 保存日時
 *   floor     : 現在の階層
 *   party     : 手持ちモンスター（並び順・レベル・HPなど）
 *   storage   : 拠点の預かり所に預けている仲間
 *   inventory : 持ち物
 *   gold      : 所持金
 *   discovery : 図鑑の発見記録
 *   playTime  : そのファイルの合計プレイ時間（ミリ秒）。ファイル選択の一覧に出す
 *   dungeon   : マップとプレイヤー位置（続きから同じ場所で再開するため）
 */
(function (NS) {
  "use strict";

  /**
   * @param {MyGame.GameData} gameData
   * @param {number} [slot] どのセーブファイルを扱うか（1〜slotCount）。省略すると1
   */
  function SaveManager(gameData, slot) {
    this.data = gameData;
    var config = gameData.save || {};
    this.storageKey = config.storageKey || "game.save";
    this.slotSuffix = config.slotSuffix || ".slot";
    this.suspendSuffix = config.suspendSuffix || ".suspend";
    this.slotCount = config.slotCount || 1;
    this.saveVersion = config.saveVersion || 1;

    this.slot = clampSlot(slot, this.slotCount);
  }

  /** 扱うセーブファイルを変える */
  SaveManager.prototype.setSlot = function (slot) {
    this.slot = clampSlot(slot, this.slotCount);
    return this.slot;
  };

  /**
   * そのスロットの保存先キー。
   *
   * ★ スロット1だけは昔からのキーをそのまま使う。
   *   ここで全スロットに番号を付けると、
   *   それまで遊んでいたセーブがどこからも見えなくなる。
   */
  SaveManager.prototype.keyFor = function (slot) {
    var n = clampSlot(slot, this.slotCount);
    return (n === 1) ? this.storageKey : (this.storageKey + this.slotSuffix + n);
  };

  /** そのスロットの中断データの保存先キー（セーブ本体とは別） */
  SaveManager.prototype.suspendKeyFor = function (slot) {
    return this.keyFor(slot) + this.suspendSuffix;
  };

  function clampSlot(slot, count) {
    var n = Math.floor(Number(slot));
    if (!isFinite(n) || n < 1) return 1;
    return Math.min(n, count || 1);
  }

  // --- 保存 ---

  /**
   * 現在の状態を保存する。
   * @param {object} state { floor, party, inventory, discovery, dungeon }
   *   dungeon は { rows, playerCol, playerRow } を想定（省略可）
   * @returns {{success:boolean, reason:string}}
   *   reason: "saved" | "unavailable" | "error"
   */
  SaveManager.prototype.save = function (state) {
    return this._write(this.keyFor(this.slot), state);
  };

  /**
   * 探索の途中の状態を「中断」として書く。セーブ本体には触らない。
   * @param {object} state save() と同じ ＋ run（Game.suspendRun が組む）
   */
  SaveManager.prototype.saveSuspend = function (state) {
    return this._write(this.suspendKeyFor(this.slot), state);
  };

  SaveManager.prototype._write = function (key, state) {
    if (!this.isAvailable()) return { success: false, reason: "unavailable" };

    var payload = this._buildPayload(state);
    try {
      window.localStorage.setItem(key, JSON.stringify(payload));
      return { success: true, reason: "saved" };
    } catch (e) {
      return { success: false, reason: "error" };
    }
  };

  /** 保存する中身。セーブ本体も中断も同じ形にしておく（読む側が1つで済む） */
  SaveManager.prototype._buildPayload = function (state) {
    return {
      version: this.saveVersion,
      savedAt: new Date().toISOString(),
      floor: state.floor,
      party: state.party ? state.party.toSaveData() : null,
      storage: state.storage ? state.storage.toSaveData() : null,
      inventory: state.inventory ? state.inventory.toSaveData() : null,
      gold: state.gold || 0,
      discovery: state.discovery ? state.discovery.toSaveData() : null,
      // どのチュートリアルを見たか。含めないと再開のたびに同じ説明が出る
      tutorial: state.tutorial ? state.tutorial.toSaveData() : null,
      // 主人公の名前と服の色（ファイルごとに違う）
      playerName: state.playerName || null,
      playerColor: state.playerColor || null,
      clearedDungeons: state.clearedDungeons || null,
      // そのファイルの合計プレイ時間（ミリ秒）。ファイル選択の一覧に出す
      playTime: state.playTime || 0,
      // 買った加護と、選択肢から外している加護（挑戦をまたいで残る）
      boughtBlessings: state.boughtBlessings || null,
      offBlessings: state.offBlessings || null,
      dungeon: state.dungeon || null,
      // 中断のときだけ。挑戦の記録（加護・拾ったもの）と、その階の仕掛け
      run: state.run || null,
      features: state.features || null
    };
  };

  // --- 読み込み ---

  /**
   * 保存された状態を読み込む。
   * @returns {{success:boolean, reason:string, state:object|null}}
   *   reason: "loaded" | "empty" | "unavailable" | "broken" | "versionMismatch"
   */
  SaveManager.prototype.load = function () {
    return this._read(this.keyFor(this.slot));
  };

  /** 中断データを読み込む（形は load と同じ。state.run / state.features が入る） */
  SaveManager.prototype.loadSuspend = function () {
    return this._read(this.suspendKeyFor(this.slot));
  };

  SaveManager.prototype._read = function (key) {
    if (!this.isAvailable()) return fail("unavailable");

    var raw;
    try {
      raw = window.localStorage.getItem(key);
    } catch (e) {
      return fail("unavailable");
    }
    if (!raw) return fail("empty");

    var payload;
    try {
      payload = JSON.parse(raw);
    } catch (e) {
      return fail("broken");
    }
    if (!payload || typeof payload !== "object") return fail("broken");

    // 形式が違うセーブは読み込まない（将来ここで変換処理を行う）
    if (payload.version !== this.saveVersion) return fail("versionMismatch");

    var party = NS.Party.fromSaveData(payload.party, this.data, this.data.config.partyMax);
    if (party.isEmpty()) return fail("broken");

    return {
      success: true,
      reason: "loaded",
      state: {
        floor: payload.floor || 1,
        party: party,
        // 預かり所・持ち物・発見記録は、古いセーブに無くても空の状態で復元できるようにする
        storage: NS.MonsterStorage.fromSaveData(
          payload.storage, this.data, this.data.config.storageMax),
        inventory: NS.Inventory.fromSaveData(payload.inventory, this.data),
        // 古いセーブには無いので、その場合は 0 から始める
        gold: payload.gold || 0,
        discovery: NS.Discovery.fromSaveData(payload.discovery),
        // チュートリアルの記録。**無い場合は「全部もう見た」扱いにする**
        //   （この仕組みができる前のセーブ。途中まで進めた人に
        //     いまさら「戦い方」を出しても邪魔なだけなので）
        //   その判断は Game 側で行うため、ここでは有無をそのまま渡す
        tutorial: payload.tutorial || null,
        // 古いセーブには無い。その場合は既定の名前と色になる
        playerName: payload.playerName || null,
        playerColor: payload.playerColor || null,
        // 古いセーブには無いので、その場合は「何もクリアしていない」扱い
        clearedDungeons: payload.clearedDungeons || {},
        // 合計プレイ時間（ミリ秒）。古いセーブには無いので0から数え直す
        playTime: payload.playTime || 0,
        // 古いセーブには無いので、その場合は「何も買っていない・何も外していない」扱い
        boughtBlessings: payload.boughtBlessings || {},
        offBlessings: payload.offBlessings || {},
        dungeon: payload.dungeon || null,
        run: payload.run || null,
        features: payload.features || null,
        savedAt: payload.savedAt || null
      }
    };
  };

  // --- 補助 ---

  /**
   * セーブデータが存在するか（中身の正しさまでは見ない）。
   * @param {number} [slot] 省略すると、いま扱っているスロット
   */
  SaveManager.prototype.hasSave = function (slot) {
    if (!this.isAvailable()) return false;
    try {
      return !!window.localStorage.getItem(this.keyFor(slot === undefined ? this.slot : slot));
    } catch (e) {
      return false;
    }
  };

  /**
   * セーブデータを削除する（中断データも一緒に消す）。
   * @param {number} [slot] 省略すると、いま扱っているスロット
   */
  SaveManager.prototype.clear = function (slot) {
    if (!this.isAvailable()) return false;
    var n = (slot === undefined) ? this.slot : slot;
    try {
      window.localStorage.removeItem(this.keyFor(n));
      window.localStorage.removeItem(this.suspendKeyFor(n));
      return true;
    } catch (e) {
      return false;
    }
  };

  /** そのスロットに中断データがあるか */
  SaveManager.prototype.hasSuspend = function (slot) {
    if (!this.isAvailable()) return false;
    try {
      return !!window.localStorage.getItem(this.suspendKeyFor(slot === undefined ? this.slot : slot));
    } catch (e) {
      return false;
    }
  };

  /** どこかのスロットに中断データがあるか（タイトルの「中断したところから」を出すか） */
  SaveManager.prototype.hasAnySuspend = function () {
    for (var i = 1; i <= this.slotCount; i++) {
      if (this.hasSuspend(i)) return true;
    }
    return false;
  };

  /** 中断データだけを消す（再開したときに呼ぶ。セーブ本体は残る） */
  SaveManager.prototype.clearSuspend = function (slot) {
    if (!this.isAvailable()) return false;
    try {
      window.localStorage.removeItem(this.suspendKeyFor(slot === undefined ? this.slot : slot));
      return true;
    } catch (e) {
      return false;
    }
  };

  /**
   * --- ファイルの整理（コピー・移動・削除）---
   *
   * ★ 中身は一切読まずに、保存されている文字列をそのまま移す。
   *   読み込んで組み立て直すと、いま遊べない形のデータ（古い形式など）を
   *   移そうとしたときに壊れる。文字列のまま移せば、
   *   読めないデータもそのまま運べる。
   */

  /** そのスロットに入っている文字列（無ければ null） */
  SaveManager.prototype.readRaw = function (slot) {
    if (!this.isAvailable()) return null;
    try {
      return window.localStorage.getItem(this.keyFor(slot));
    } catch (e) {
      return null;
    }
  };

  /**
   * ファイルを別のスロットへ写す（元は残る）。
   * @returns {{success:boolean, reason:string}}
   *   reason: "copied" | "empty" | "sameSlot" | "unavailable" | "error"
   */
  SaveManager.prototype.copySlot = function (from, to) {
    if (!this.isAvailable()) return { success: false, reason: "unavailable" };
    if (from === to) return { success: false, reason: "sameSlot" };

    var raw = this.readRaw(from);
    if (!raw) return { success: false, reason: "empty" };

    try {
      window.localStorage.setItem(this.keyFor(to), raw);

      // 中断データも一緒に運ぶ。行き先に古い中断が残っていれば消す
      // （本体だけ新しくなって、中断だけ別の冒険のもの、という食い違いを防ぐ）
      var suspend = window.localStorage.getItem(this.suspendKeyFor(from));
      if (suspend) window.localStorage.setItem(this.suspendKeyFor(to), suspend);
      else window.localStorage.removeItem(this.suspendKeyFor(to));

      return { success: true, reason: "copied" };
    } catch (e) {
      return { success: false, reason: "error" };
    }
  };

  /**
   * ファイルを別のスロットへ移す（元は空になる）。
   *
   * ★ 写してから消す順にすること。
   *   先に消すと、書き込みに失敗したときにデータが消えてなくなる。
   */
  SaveManager.prototype.moveSlot = function (from, to) {
    var result = this.copySlot(from, to);
    if (!result.success) return result;

    this.clear(from);
    return { success: true, reason: "moved" };
  };

  /**
   * スロットの中身を、選択画面に出せる形だけ読む（遊べる状態には戻さない）。
   *
   * ★ load() を使わないのは、選択画面に3つ並べるためだけに
   *   パーティ3体ぶんの個体を組み立てるのが無駄だから。
   *   ここでは保存された数値をそのまま読むだけにしてある。
   *
   * @param {number} slot
   * @returns {object} { slot, exists, broken, savedAt, leadName, level, partyCount,
   *                     gold, cleared, playTime, place }
   */
  SaveManager.prototype.peek = function (slot) {
    var n = clampSlot(slot, this.slotCount);
    if (!this.isAvailable()) return { slot: n, exists: false, broken: false, suspended: null };

    // 中断だけあって本体が無い（拠点で一度もセーブせずに中断した）こともあるので、
    // 本体の有無とは別に見る
    var suspended = this._suspendedPlace(n);
    var empty = { slot: n, exists: false, broken: false, suspended: suspended };

    var raw;
    try {
      raw = window.localStorage.getItem(this.keyFor(n));
    } catch (e) {
      return empty;
    }
    if (!raw) return empty;

    var payload;
    try {
      payload = JSON.parse(raw);
    } catch (e) {
      return { slot: n, exists: true, broken: true };
    }
    if (!payload || typeof payload !== "object") {
      return { slot: n, exists: true, broken: true };
    }
    // 形式が違うセーブは「あるが遊べない」として見せる（黙って空にしない）
    if (payload.version !== this.saveVersion) {
      return { slot: n, exists: true, broken: true };
    }

    // Party.toSaveData() は { members: [...] } の形。
    // 昔の形（配列そのまま）でも読めるようにしておく
    var party = (payload.party && payload.party.members) || payload.party || [];
    var lead = party[0] || null;
    var species = lead ? this.data.getMonsterData(lead.speciesId) : null;

    return {
      slot: n,
      exists: true,
      broken: false,
      // 探索を中断したところがあれば、その場所（無ければ null）
      suspended: suspended,
      savedAt: payload.savedAt || null,
      // 主人公の名前。決めていない古いセーブでは空になる
      playerName: payload.playerName || "",
      leadName: lead ? (lead.nickname || (species ? species.name : lead.speciesId)) : "",
      level: lead ? (lead.level || 1) : 0,
      partyCount: party.length,
      gold: payload.gold || 0,
      cleared: Object.keys(payload.clearedDungeons || {}).length,
      // 合計プレイ時間（ミリ秒）。古いセーブには無いので0
      playTime: payload.playTime || 0,
      place: this._placeOf(payload)
    };
  };

  /**
   * どこで保存したか。
   * ダンジョンの中で保存した場合だけ、その場所と階が入っている。
   */
  SaveManager.prototype._placeOf = function (payload) {
    var dungeon = payload.dungeon;
    if (!dungeon) return null;

    var def = dungeon.dungeonId ? this.data.dungeons[dungeon.dungeonId] : null;
    return {
      dungeonId: dungeon.dungeonId || null,
      name: def ? def.name : null,
      floor: payload.floor || 1
    };
  };

  /** 中断データがあれば、その場所（{ dungeonId, name, floor }）。無ければ null */
  SaveManager.prototype._suspendedPlace = function (slot) {
    var raw;
    try {
      raw = window.localStorage.getItem(this.suspendKeyFor(slot));
    } catch (e) {
      return null;
    }
    if (!raw) return null;

    try {
      var payload = JSON.parse(raw);
      if (!payload || payload.version !== this.saveVersion) return null;
      return this._placeOf(payload);
    } catch (e) {
      return null;
    }
  };

  /** 全スロットの要約を並べて返す（選択画面が使う） */
  SaveManager.prototype.peekAll = function () {
    var list = [];
    for (var i = 1; i <= this.slotCount; i++) list.push(this.peek(i));
    return list;
  };

  /** どこかのスロットにセーブがあるか */
  SaveManager.prototype.hasAnySave = function () {
    for (var i = 1; i <= this.slotCount; i++) {
      if (this.hasSave(i)) return true;
    }
    return false;
  };

  /** localStorage が使えるか（file:// やプライベートモードで使えない場合がある） */
  SaveManager.prototype.isAvailable = function () {
    try {
      if (typeof window === "undefined" || !window.localStorage) return false;
      // 実際に書き込めるかまで確認する
      var probe = "__save_probe__";
      window.localStorage.setItem(probe, "1");
      window.localStorage.removeItem(probe);
      return true;
    } catch (e) {
      return false;
    }
  };

  function fail(reason) {
    return { success: false, reason: reason, state: null };
  }

  NS.SaveManager = SaveManager;
})(window.MyGame);
