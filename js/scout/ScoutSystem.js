/**
 * ScoutSystem.js
 * モンスターを仲間に誘う「スカウト」の判定を担当する。
 *
 * ▼ BattleSystem からは独立している
 * 戦闘中のスカウトだけでなく、将来のフィールドでの勧誘・イベントでの加入にも
 * 使えるよう、戦闘の状態には一切依存しない。
 * 「誘う相手」と「受け取り先」を渡せば、どこからでも呼べる。
 *
 * ▼ 相手に必要なインターフェース（MonsterInstance 互換）
 *   getSpecies() : 種族データ（scoutRate を持つ）
 *   getMaxHp()   : number
 *   currentHp    : number
 *
 * ▼ 数値はすべて data/scout.js から取得する。
 */
(function (NS) {
  "use strict";

  /**
   * @param {MyGame.GameData} gameData
   * @param {MyGame.Random} random
   */
  function ScoutSystem(gameData, random) {
    this.data = gameData;
    this.random = random;
  }

  /**
   * スカウト成功率を計算する（判定は行わない。UI表示にも使える）。
   * @param {object} target 誘う相手
   * @param {object} [item] 使用する道具（scoutMultiplier を持つ）
   * @returns {number} 0〜1 の成功率
   */
  ScoutSystem.prototype.calcRate = function (target, item) {
    var config = this.data.scout || {};
    var species = target.getSpecies ? target.getSpecies() : null;
    if (!species) return 0;

    var baseRate = species.scoutRate || 0;
    var maxHp = target.getMaxHp();
    var hpRatio = maxHp > 0 ? Math.max(0, Math.min(1, target.currentHp / maxHp)) : 0;

    var hpBonusMax = config.hpBonusMax === undefined ? 0 : config.hpBonusMax;
    var itemMultiplier = (item && item.scoutMultiplier !== undefined)
      ? item.scoutMultiplier
      : (config.defaultItemMultiplier === undefined ? 1 : config.defaultItemMultiplier);

    var rate = baseRate * (1 + (1 - hpRatio) * hpBonusMax) * itemMultiplier;

    var minRate = config.minRate === undefined ? 0 : config.minRate;
    var maxRate = config.maxRate === undefined ? 1 : config.maxRate;
    return Math.max(minRate, Math.min(maxRate, rate));
  };

  /**
   * 応じてくれるかどうかの判定だけを行う（どこにも加えない）。
   * 受け取り先がいっぱいで、加える先を呼び出し側で決めたい場合に使う。
   * @param {object} target 誘う相手
   * @param {object} [options] { item }
   * @returns {{success:boolean, reason:string, rate:number, target:object}}
   */
  ScoutSystem.prototype.roll = function (target, options) {
    var rate = this.calcRate(target, (options || {}).item);
    var success = this.random.next() < rate;

    return {
      success: success,
      reason: success ? "joined" : "refused",
      rate: rate,
      target: target
    };
  };

  /**
   * スカウトを試み、成功したら受け取り先へ加える。
   * @param {object} target 誘う相手
   * @param {object[]|MyGame.Party} receiver 受け取り先。
   *   add()/isFull() を持つもの（Party）でも、素の配列でも受け取れる。
   * @param {object} [options] { item, capacity }
   * @returns {{success:boolean, reason:string, rate:number, target:object}}
   *   reason: "joined" | "refused" | "full"
   */
  ScoutSystem.prototype.tryScout = function (target, receiver, options) {
    options = options || {};

    // 受け取り先がいっぱいなら判定せず失敗
    if (this.isFull(receiver, options.capacity)) {
      return {
        success: false, reason: "full",
        rate: this.calcRate(target, options.item), target: target
      };
    }

    var result = this.roll(target, options);
    if (result.success) this._addTo(receiver, target);
    return result;
  };

  /**
   * 受け取り先が上限に達しているか。
   * @param {object[]|MyGame.Party} receiver
   * @param {number} [capacity] 配列を渡した場合の上限（省略時は config.partyMax）
   */
  ScoutSystem.prototype.isFull = function (receiver, capacity) {
    if (!receiver) return false;

    // 上限を自分で判断できる相手（Party など）はそれに任せる
    if (typeof receiver.isFull === "function") return receiver.isFull();

    var max = (capacity === undefined || capacity === null)
      ? (this.data.config || {}).partyMax
      : capacity;
    if (max === undefined || max === null) return false;
    return receiver.length >= max;
  };

  /**
   * 判定を行わずに受け取り先へ加える。
   * 「応じてくれたが、どこへ入れるかは呼び出し側で決める」場合に使う。
   */
  ScoutSystem.prototype.join = function (receiver, target) {
    this._addTo(receiver, target);
  };

  /** 受け取り先へ加える（Party なら add、配列なら push） */
  ScoutSystem.prototype._addTo = function (receiver, target) {
    if (!receiver) return;
    if (typeof receiver.add === "function") receiver.add(target);
    else if (typeof receiver.push === "function") receiver.push(target);
  };

  NS.ScoutSystem = ScoutSystem;
})(window.MyGame);
