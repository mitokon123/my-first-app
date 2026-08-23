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
 *   dungeon   : マップとプレイヤー位置（続きから同じ場所で再開するため）
 */
(function (NS) {
  "use strict";

  /**
   * @param {MyGame.GameData} gameData
   */
  function SaveManager(gameData) {
    this.data = gameData;
    var config = gameData.save || {};
    this.storageKey = config.storageKey || "game.save";
    this.saveVersion = config.saveVersion || 1;
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
    if (!this.isAvailable()) return { success: false, reason: "unavailable" };

    var payload = {
      version: this.saveVersion,
      savedAt: new Date().toISOString(),
      floor: state.floor,
      party: state.party ? state.party.toSaveData() : null,
      storage: state.storage ? state.storage.toSaveData() : null,
      inventory: state.inventory ? state.inventory.toSaveData() : null,
      gold: state.gold || 0,
      discovery: state.discovery ? state.discovery.toSaveData() : null,
      clearedDungeons: state.clearedDungeons || null,
      dungeon: state.dungeon || null
    };

    try {
      window.localStorage.setItem(this.storageKey, JSON.stringify(payload));
      return { success: true, reason: "saved" };
    } catch (e) {
      return { success: false, reason: "error" };
    }
  };

  // --- 読み込み ---

  /**
   * 保存された状態を読み込む。
   * @returns {{success:boolean, reason:string, state:object|null}}
   *   reason: "loaded" | "empty" | "unavailable" | "broken" | "versionMismatch"
   */
  SaveManager.prototype.load = function () {
    if (!this.isAvailable()) return fail("unavailable");

    var raw;
    try {
      raw = window.localStorage.getItem(this.storageKey);
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
        // 古いセーブには無いので、その場合は「何もクリアしていない」扱い
        clearedDungeons: payload.clearedDungeons || {},
        dungeon: payload.dungeon || null,
        savedAt: payload.savedAt || null
      }
    };
  };

  // --- 補助 ---

  /** セーブデータが存在するか（中身の正しさまでは見ない） */
  SaveManager.prototype.hasSave = function () {
    if (!this.isAvailable()) return false;
    try {
      return !!window.localStorage.getItem(this.storageKey);
    } catch (e) {
      return false;
    }
  };

  /** セーブデータを削除する */
  SaveManager.prototype.clear = function () {
    if (!this.isAvailable()) return false;
    try {
      window.localStorage.removeItem(this.storageKey);
      return true;
    } catch (e) {
      return false;
    }
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
