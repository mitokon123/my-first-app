/**
 * BlessingSystem.js
 * 階を降りたときに出す「加護」の候補を選ぶ。
 *
 * ▼ 役割
 * 候補を重み付きで抜き出すだけ。効果の適用も画面の表示も行わない。
 * 何を持っているかは RunSession、効果の集計は EffectSystem が担当する。
 */
(function (NS) {
  "use strict";

  /**
   * @param {MyGame.GameData} gameData
   * @param {MyGame.Random} random
   */
  function BlessingSystem(gameData, random) {
    this.data = gameData;
    this.random = random;
    this.config = (gameData.run || {}).blessing || {};
  }

  /** 加護の仕組みを使うか */
  BlessingSystem.prototype.isEnabled = function () {
    return this.config.enabled !== false;
  };

  /**
   * 選択肢を作る。
   * 同じものは1回の選択肢の中に重複して出ない。
   *
   * @param {MyGame.RunSession} run いま挑戦中のラン（既に持っている加護を除くために使う）
   * @returns {object[]} data/blessings.js の定義。候補が無ければ空
   */
  BlessingSystem.prototype.pickChoices = function (run) {
    if (!this.isEnabled()) return [];

    var pool = this._availablePool(run);
    var count = Math.min(this.config.choiceCount || 3, pool.length);
    var choices = [];

    for (var i = 0; i < count; i++) {
      var picked = this._pickWeighted(pool);
      if (!picked) break;

      choices.push(picked);
      pool.splice(pool.indexOf(picked), 1);   // 同じ選択肢が並ばないように取り除く
    }
    return choices;
  };

  /**
   * 候補になりうる加護。
   * allowRepeat が false なら、既に持っているものは出ない。
   */
  BlessingSystem.prototype._availablePool = function (run) {
    var blessings = this.data.blessings || {};
    var allowRepeat = (this.config.allowRepeat === true);
    var pool = [];

    for (var id in blessings) {
      if (!Object.prototype.hasOwnProperty.call(blessings, id)) continue;
      if (!allowRepeat && run && run.hasBlessing(id)) continue;
      pool.push(blessings[id]);
    }
    return pool;
  };

  /** 重み付きで1つ選ぶ */
  BlessingSystem.prototype._pickWeighted = function (pool) {
    var total = 0, i;
    for (i = 0; i < pool.length; i++) total += (pool[i].weight === undefined ? 1 : pool[i].weight);
    if (total <= 0) return pool[0] || null;

    var roll = this.random.next() * total;
    for (i = 0; i < pool.length; i++) {
      roll -= (pool[i].weight === undefined ? 1 : pool[i].weight);
      if (roll <= 0) return pool[i];
    }
    return pool[pool.length - 1] || null;
  };

  /**
   * 出やすさ（weight）を言葉で表す。
   * 数字のままでは分かりにくいので、画面にはこちらを出す。
   *
   * 対応表は data/run.js の blessing.rarityLabels。
   * 抽選の仕組みを持たない場面（図鑑など）でも使えるよう、
   * インスタンスを作らずに呼べる形にしてある。
   *
   * @param {MyGame.GameData} gameData
   * @param {object} blessing data/blessings.js の1件
   * @returns {{label:string, color:string}}
   */
  BlessingSystem.getRarity = function (gameData, blessing) {
    var labels = (((gameData.run || {}).blessing) || {}).rarityLabels || [];
    var weight = (blessing && blessing.weight !== undefined) ? blessing.weight : 1;

    for (var i = 0; i < labels.length; i++) {
      if (weight >= labels[i].min) return labels[i];
    }
    return { label: "", color: null };
  };

  NS.BlessingSystem = BlessingSystem;
})(window.MyGame);
