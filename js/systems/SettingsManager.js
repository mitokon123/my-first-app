/**
 * SettingsManager.js
 * プレイヤー設定の保持と、localStorage への保存・読み込みを担当する。
 *
 * 設定項目そのものは data/settings.js が持つ。
 * このクラスは「今の値」を管理するだけで、項目が増えても変更不要。
 *
 * 保存に失敗しても例外は投げず、結果を返すだけにしている（セーブと同じ方針）。
 *
 * ▼ 設定はセーブファイルごと
 *   保存先は2つある。
 *     fileKey   … いま遊んでいるファイルの設定（SaveManager.settingsKeyFor が決める）
 *     sharedKey … 最後に保存した設定の写し（data/settings.js の storageKey）
 *   ファイルを選ぶまで（タイトル）は sharedKey を使う。
 *   ファイルを選んだら、そのファイルの設定に切り替える（Game.loadFileSettings）。
 *   保存するときは両方へ書くので、タイトルでは「最後に遊んだファイルの音量」になる。
 *
 *   ★ sharedKey は、ファイルごとに分ける前の保存先そのもの。
 *     分ける前から遊んでいたファイルは、起動時にここから写してもらう（Game._migrateSettings）
 */
(function (NS) {
  "use strict";

  /**
   * @param {MyGame.GameData} gameData
   */
  function SettingsManager(gameData) {
    var config = gameData.settings || {};
    this.items = config.items || [];
    this.sharedKey = config.storageKey || "game.settings";
    this.fileKey = null;   // ファイルを選ぶまでは無い

    this.values = {};
    this.resetToDefaults();
    this.load();
  }

  // --- どの保存先を使うか ---

  /** タイトルに戻ったとき。最後に保存した設定を読む */
  SettingsManager.prototype.useShared = function () {
    this.fileKey = null;
    this.resetToDefaults();
    return this._loadFrom(this.sharedKey);
  };

  /**
   * そのファイルの設定を読む（続きから・中断から）。
   * ファイルに設定が無ければ、最後に保存した設定を使う。
   * @returns {boolean} そのファイルの設定を読めたか
   */
  SettingsManager.prototype.useFile = function (key) {
    this.fileKey = key || null;
    this.resetToDefaults();
    if (this._loadFrom(this.fileKey)) return true;
    this._loadFrom(this.sharedKey);
    return false;
  };

  /**
   * 保存先だけ変える。いまの値はそのまま。
   * 拠点で別のファイルへセーブしたとき、いまの設定ごとそのファイルへ移るため
   */
  SettingsManager.prototype.bindFile = function (key) {
    this.fileKey = key || null;
  };

  /** 新しく始めたファイル。既定値から（前のファイルの設定を持ち越さない） */
  SettingsManager.prototype.useNewFile = function (key) {
    this.fileKey = key || null;
    this.resetToDefaults();
  };

  /** すべての項目を既定値に戻す */
  SettingsManager.prototype.resetToDefaults = function () {
    for (var i = 0; i < this.items.length; i++) {
      var item = this.items[i];
      this.values[item.id] = item.default;
    }
  };

  SettingsManager.prototype.get = function (id) {
    return this.values[id];
  };

  /**
   * 値を設定する（範囲外は範囲内へ丸める）。
   * @returns {*} 実際に設定された値
   */
  SettingsManager.prototype.set = function (id, value) {
    var item = this.getItem(id);
    if (!item) return undefined;

    if (item.type === "range") {
      var min = item.min === undefined ? 0 : item.min;
      var max = item.max === undefined ? 100 : item.max;
      value = Math.max(min, Math.min(max, value));
    }
    this.values[id] = value;
    return value;
  };

  /**
   * range 項目を1段階ずらす。
   * @param {string} id
   * @param {number} direction +1 で増加、-1 で減少
   */
  SettingsManager.prototype.step = function (id, direction) {
    var item = this.getItem(id);
    if (!item || item.type !== "range") return undefined;

    var step = item.step || 1;
    return this.set(id, (this.values[id] || 0) + step * direction);
  };

  SettingsManager.prototype.getItem = function (id) {
    for (var i = 0; i < this.items.length; i++) {
      if (this.items[i].id === id) return this.items[i];
    }
    return null;
  };

  /**
   * 表示用の文字列（例: "70%"）。
   * valueLabels が指定されている項目は、数値の代わりにその名前を出す。
   */
  SettingsManager.prototype.formatValue = function (id) {
    var item = this.getItem(id);
    if (!item) return "";

    if (item.valueLabels) {
      var index = this.values[id] - (item.min === undefined ? 0 : item.min);
      if (item.valueLabels[index]) return item.valueLabels[index];
    }
    return String(this.values[id]) + (item.unit || "");
  };

  // --- 保存・読み込み ---

  /**
   * いまのファイルの保存先と、最後に保存した設定の写しの両方へ書く。
   * @returns {{success:boolean, reason:string}}
   */
  SettingsManager.prototype.save = function () {
    if (!isAvailable()) return { success: false, reason: "unavailable" };
    try {
      var text = JSON.stringify(this.values);
      if (this.fileKey) window.localStorage.setItem(this.fileKey, text);
      window.localStorage.setItem(this.sharedKey, text);
      return { success: true, reason: "saved" };
    } catch (e) {
      return { success: false, reason: "error" };
    }
  };

  /** いまの保存先から読み込む */
  SettingsManager.prototype.load = function () {
    return this._loadFrom(this.fileKey || this.sharedKey);
  };

  /**
   * ファイルごとに分ける前から遊んでいたファイルへ、共通の設定を写す。
   * すでに設定を持っているファイルには触らない。
   * @param {string[]} keys 写す先（中身のあるファイルの設定キー）
   */
  SettingsManager.prototype.migrateShared = function (keys) {
    if (!isAvailable()) return;
    try {
      var raw = window.localStorage.getItem(this.sharedKey);
      if (!raw) return;
      for (var i = 0; i < keys.length; i++) {
        if (!window.localStorage.getItem(keys[i])) window.localStorage.setItem(keys[i], raw);
      }
    } catch (e) {
      // 写せなくても遊べる（そのファイルは最後に保存した設定を使う）
    }
  };

  /**
   * 保存済みの設定を読み込む。
   * 定義に無い項目は無視し、値は範囲内へ丸める（データ変更後も安全に読める）。
   * @returns {boolean} 読み込めたか
   */
  SettingsManager.prototype._loadFrom = function (key) {
    if (!key || !isAvailable()) return false;

    var raw;
    try {
      raw = window.localStorage.getItem(key);
    } catch (e) {
      return false;
    }
    if (!raw) return false;

    var saved;
    try {
      saved = JSON.parse(raw);
    } catch (e) {
      return false;
    }
    if (!saved || typeof saved !== "object") return false;

    for (var i = 0; i < this.items.length; i++) {
      var id = this.items[i].id;
      if (saved[id] !== undefined) this.set(id, saved[id]);
    }
    return true;
  };

  function isAvailable() {
    try {
      return typeof window !== "undefined" && !!window.localStorage;
    } catch (e) {
      return false;
    }
  }

  NS.SettingsManager = SettingsManager;
})(window.MyGame);
