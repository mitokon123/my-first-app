/**
 * TutorialSystem.js
 * どの説明をもう見たかを覚えておき、まだ見ていないものを渡す。
 *
 * 説明の中身は data/tutorial.js が持つ。ここは「出す・出さない」の判断だけ。
 * 画面の描き方は js/ui/TutorialBox.js、出す場所は各シーン。
 *
 * ▼ 見た記録はセーブに含まれる
 *   含めないと、再開のたびに同じ説明が出てしまう。
 *
 * ▼ 古いセーブ（この仕組みが無かったころ）を読んだ場合
 *   Game 側が markAllSeen() を呼び、**全部もう見た扱い**にする。
 *   途中まで進めた人に、いまさら「戦い方」を出しても邪魔なだけなので。
 */
(function (NS) {
  "use strict";

  /**
   * @param {MyGame.GameData} gameData
   * @param {MyGame.SettingsManager} settings 出す/出さないの設定を読む
   */
  function TutorialSystem(gameData, settings) {
    this.data = gameData;
    this.settings = settings || null;
    this.config = gameData.tutorial || {};
    this.seen = {};   // { id: true }
  }

  /** 設定で「出す」になっているか */
  TutorialSystem.prototype.isEnabled = function () {
    if (!this.settings) return true;

    var id = this.config.settingId;
    if (!id) return true;

    return this.settings.get(id) !== 0;
  };

  /** これ以降ぜんぶ出さない（ふきだしの Esc から呼ばれる） */
  TutorialSystem.prototype.disable = function () {
    var id = this.config.settingId;
    if (this.settings && id) this.settings.set(id, 0);
  };

  /**
   * その場面で出す説明をすべて取り出す（取り出した時点で「見た」印をつける）。
   *
   * まとめて返すのは、1つの場面に2つ以上の説明を置けるようにするため
   * （戦闘の始まりでは「戦い方」と「並び順」が続けて出る）。
   *
   * @param {string} trigger data/tutorial.js の trigger
   * @returns {object[]} 出す説明。無ければ空の配列
   */
  TutorialSystem.prototype.take = function (trigger) {
    if (!this.isEnabled()) return [];

    var steps = this.config.steps || {};
    var found = [];

    for (var id in steps) {
      var step = steps[id];
      if (step.trigger !== trigger) continue;
      if (this.seen[step.id]) continue;
      found.push(step);
    }

    found.sort(function (a, b) { return (a.order || 999) - (b.order || 999); });

    for (var i = 0; i < found.length; i++) this.seen[found[i].id] = true;
    return found;
  };

  /** 全部もう見たことにする（古いセーブを読んだとき） */
  TutorialSystem.prototype.markAllSeen = function () {
    var steps = this.config.steps || {};
    for (var id in steps) this.seen[steps[id].id] = true;
  };

  TutorialSystem.prototype.countSeen = function () {
    var n = 0;
    for (var id in this.seen) if (this.seen[id]) n++;
    return n;
  };

  // --- セーブ ---

  TutorialSystem.prototype.toSaveData = function () {
    return { seen: Object.keys(this.seen) };
  };

  /**
   * 保存データから戻す。
   * 無くなった説明のidが残っていても、そのまま持っておくだけで害はない。
   *
   * @param {object|null} saved
   * @param {boolean} allSeenWhenMissing saved が無いとき全部見た扱いにするか。
   *   古いセーブを読んだときは true。新しく始めたときは false
   */
  TutorialSystem.prototype.loadSaveData = function (saved, allSeenWhenMissing) {
    this.seen = {};

    if (!saved || !saved.seen) {
      if (allSeenWhenMissing) this.markAllSeen();
      return;
    }
    for (var i = 0; i < saved.seen.length; i++) this.seen[saved.seen[i]] = true;
  };

  NS.TutorialSystem = TutorialSystem;
})(window.MyGame);
