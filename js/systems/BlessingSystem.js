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
   * ▼ 枠ごとに「等級 → その中の1つ」の順で引く
   * 先に等級を固定確率（data/run.js の rarityTiers の rate）で引き、
   * そのあと、その等級の加護の中から編成しているものを選ぶ。
   *
   * ★ こうしないとレア度が意味を持たない。
   *   編成した加護をまとめて weight で引くと、weight は
   *   「プールの中での比率」にしかならない。プールの中身はプレイヤーが決められるので、
   *   強いものだけ残せば「まれ」が毎回出るようになってしまう
   *   （実測で 6% → 32%、3個だけ残すと100%）。
   *
   * 引いた等級の加護を1つも出せないときは、**より出やすい等級へ順に落とす**。
   * いちばん出やすい等級まで落ちても出せなければ、その枠は作らない。
   * ＝ 絞り込むほど選択肢が減るので、「強いものだけ残す」が損になる。
   *
   * @param {MyGame.RunSession} run いま挑戦中のラン（既に持っている加護を除くために使う）
   * @param {MyGame.Game} [game] 買った加護・外している加護を見るために使う。
   *   省略すると、鍵の掛かっていない加護だけが候補になる
   * @returns {object[]} data/blessings.js の定義。候補が無ければ空（3つ未満のこともある）
   */
  BlessingSystem.prototype.pickChoices = function (run, game) {
    if (!this.isEnabled()) return [];

    var pool = this._availablePool(run, game);
    var count = this.config.choiceCount || 3;
    var choices = [];

    for (var i = 0; i < count; i++) {
      var picked = this._pickOneByTier(pool);
      if (!picked) continue;   // その等級の持ち合わせが無い枠。ここは空のままにする

      choices.push(picked);
      pool.splice(pool.indexOf(picked), 1);   // 同じ選択肢が並ばないように取り除く
    }
    return choices;
  };

  /**
   * 等級を引いてから、その等級の中の1つを選ぶ。
   * 出せる等級が1つも無ければ null（＝その枠は出ない）。
   */
  BlessingSystem.prototype._pickOneByTier = function (pool) {
    var tiers = this._tiers();
    if (tiers.length === 0) return this._pickWeighted(pool);   // 表が無ければ今までどおり

    var index = this._rollTierIndex(tiers);

    // 引いた等級から、より「出やすい」側（表の先頭側）へ順に落としていく
    for (var i = index; i >= 0; i--) {
      var inTier = [];
      for (var j = 0; j < pool.length; j++) {
        if (this._tierIndexOf(pool[j], tiers) === i) inTier.push(pool[j]);
      }
      if (inTier.length > 0) return this._pickWeighted(inTier);
    }
    return null;
  };

  /** 等級の表（data/run.js の rarityTiers）。出やすい順に並んでいる前提 */
  BlessingSystem.prototype._tiers = function () {
    return this.config.rarityTiers || [];
  };

  /** どの等級になったか。rate の合計が1に満たなくても、最後の等級で受け止める */
  BlessingSystem.prototype._rollTierIndex = function (tiers) {
    var roll = this.random.next();
    var acc = 0;

    for (var i = 0; i < tiers.length; i++) {
      acc += (tiers[i].rate === undefined ? 0 : tiers[i].rate);
      if (roll <= acc) return i;
    }
    return tiers.length - 1;
  };

  /** その加護がどの等級か（weight から決まる）。表の並び順での位置を返す */
  BlessingSystem.prototype._tierIndexOf = function (blessing, tiers) {
    var weight = (blessing && blessing.weight !== undefined) ? blessing.weight : 1;

    for (var i = 0; i < tiers.length; i++) {
      if (weight >= tiers[i].min) return i;
    }
    return tiers.length - 1;
  };

  /**
   * 候補になりうる加護。次の3つを満たすものだけが残る。
   *   1. このランでまだ取っていない（allowRepeat が true なら無視）
   *   2. 持っている（locked: true のものは、謎の商人から買っていること）
   *   3. 拠点の画面で選択肢から外していない
   *
   * game を渡さない場合は 2・3 を見ない（鍵の掛かった加護だけを弾く）。
   */
  BlessingSystem.prototype._availablePool = function (run, game) {
    var blessings = this.data.blessings || {};
    var allowRepeat = (this.config.allowRepeat === true);
    var pool = [];

    for (var id in blessings) {
      if (!Object.prototype.hasOwnProperty.call(blessings, id)) continue;
      if (!allowRepeat && run && run.hasBlessing(id)) continue;

      if (game && game.isBlessingActive) {
        if (!game.isBlessingActive(id)) continue;
      } else if (blessings[id].locked) {
        continue;   // 買ったかどうか分からないので、鍵の掛かったものは出さない
      }
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
   * その加護の等級（レア度）。
   * 数字のままでは分かりにくいので、画面にはこちらを出す。
   *
   * 表は data/run.js の blessing.rarityTiers。
   * 抽選の仕組みを持たない場面（図鑑など）でも使えるよう、
   * インスタンスを作らずに呼べる形にしてある。
   *
   * ★ ここで返す label は、抽選で使う等級とまったく同じもの。
   *   画面に「まれ」と出ていれば、その枠が実際に 6% で来るという意味になる。
   *
   * @param {MyGame.GameData} gameData
   * @param {object} blessing data/blessings.js の1件
   * @returns {{label:string, color:string, rate:number|undefined}}
   */
  BlessingSystem.getRarity = function (gameData, blessing) {
    var tiers = (((gameData.run || {}).blessing) || {}).rarityTiers || [];
    var weight = (blessing && blessing.weight !== undefined) ? blessing.weight : 1;

    for (var i = 0; i < tiers.length; i++) {
      if (weight >= tiers[i].min) return tiers[i];
    }
    return { label: "", color: null };
  };

  NS.BlessingSystem = BlessingSystem;
})(window.MyGame);
