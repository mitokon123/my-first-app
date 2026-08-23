/**
 * MonsterInstance.js
 * プレイヤーが実際に所持する（または戦闘に出てくる）モンスターの個体。
 * 種族は speciesId で MonsterData（data/monsters.js）を参照する。
 *
 * 個体が持つもの：レベル / 現在HP / 経験値 / 覚えている技 / 性格 / 個体値 / 装備 / 状態異常
 * ステータスの計算式・数値はすべて data/growth.js で管理する。
 */
(function (NS) {
  "use strict";

  /**
   * @param {string} speciesId 種族id
   * @param {number} level レベル
   * @param {MyGame.GameData} gameData データ参照窓口
   * @param {object} [options] { nature, ivs, skills }
   */
  function MonsterInstance(speciesId, level, gameData, options) {
    options = options || {};

    this.speciesId = speciesId;
    this.level = level;
    this.exp = 0;

    this._data = gameData;
    this._species = gameData.getMonsterData(speciesId);

    this.natureId = options.nature || "balanced";
    // 個体値（同じ種族・同じレベルでも個体ごとに差が出る）
    this.ivs = options.ivs || { hp: 0, attack: 0, defense: 0, speed: 0 };

    // 覚えている技（省略時はレベルまでの習得技）
    this.skills = options.skills ||
      NS.MonsterData.skillsUpToLevel(this._species, level);

    // 身につけている装備（data/items.js の id の配列）。上限は config.equipMax
    this.equipment = options.equipment || [];
    this.statusEffects = []; // 状態異常（将来実装）

    this.currentHp = this.getMaxHp();
    this.currentPp = this.getMaxPp();
  }

  /**
   * ランダムな個体を生成する（野生モンスターなどに使用）。
   * @param {string} speciesId
   * @param {number} level
   * @param {MyGame.GameData} gameData
   * @param {MyGame.Random} random
   */
  MonsterInstance.create = function (speciesId, level, gameData, random) {
    var growth = gameData.growth || {};
    var ivMax = growth.ivMax || 0;
    var natureIds = Object.keys(gameData.natures || {});

    return new MonsterInstance(speciesId, level, gameData, {
      nature: random ? random.pick(natureIds) : natureIds[0],
      ivs: {
        hp: random ? random.nextInt(0, ivMax) : 0,
        attack: random ? random.nextInt(0, ivMax) : 0,
        defense: random ? random.nextInt(0, ivMax) : 0,
        speed: random ? random.nextInt(0, ivMax) : 0
      }
    });
  };

  // --- 参照 ---

  MonsterInstance.prototype.getSpecies = function () { return this._species; };
  /**
   * 表示名。
   * 同じ名前の相手が同時に出たときは displaySuffix（"A" など）が付き、
   * ログ上で見分けられるようになる。
   */
  MonsterInstance.prototype.getName = function () {
    var base = this._species ? this._species.name : this.speciesId;
    return this.displaySuffix ? (base + this.displaySuffix) : base;
  };
  MonsterInstance.prototype.getSpriteId = function () {
    return this._species ? this._species.sprite : null;
  };
  MonsterInstance.prototype.getNature = function () {
    return (this._data.natures || {})[this.natureId] || null;
  };

  /**
   * この個体のレベル上限。
   * 種族の maxLevel を使い、無ければ既定値。どちらも levelCap は超えない。
   */
  MonsterInstance.prototype.getMaxLevel = function () {
    var growth = this._data.growth || {};
    var cap = growth.levelCap || 99;
    var speciesMax = this._species && this._species.maxLevel;
    var max = speciesMax || growth.defaultMaxLevel || cap;
    return Math.min(cap, max);
  };

  /**
   * 指定属性に対する耐性（-5〜10 想定。書かれていなければ 0）。
   * @param {string} elementId
   */
  MonsterInstance.prototype.getResistance = function (elementId) {
    var resistances = (this._species && this._species.resistances) || {};
    var value = resistances[elementId];
    return (value === undefined) ? 0 : value;
  };

  /** 指定属性を完全に無効化するか */
  MonsterInstance.prototype.isImmuneTo = function (elementId) {
    var immunities = (this._species && this._species.immunities) || [];
    return immunities.indexOf(elementId) >= 0;
  };

  // --- ステータス計算（式・数値は data/growth.js） ---

  /**
   * 指定ステータスの成長率を返す。
   *
   * monsters.js の growthRate は数値でもオブジェクトでも書ける。
   *   growthRate: 0.08                      … 全ステータス共通
   *   growthRate: { hp: 0.12, attack: 0.06 } … ステータスごと
   * 書かれていない項目は default → growth.js の defaultGrowthRate の順に使い、
   * 最後に minGrowthRate〜maxGrowthRate の範囲へ収める。
   *
   * @param {string} statKey "hp" / "attack" / "defense" / "speed"
   */
  MonsterInstance.prototype.getGrowthRate = function (statKey) {
    var growth = this._data.growth || {};
    var fallback = numberOr(growth.defaultGrowthRate, 0);
    var defined = this._species && this._species.growthRate;

    var rate;
    if (typeof defined === "number") {
      rate = defined;
    } else if (defined && typeof defined === "object") {
      rate = numberOr(defined[statKey], numberOr(defined.default, fallback));
    } else {
      rate = fallback;
    }

    var min = numberOr(growth.minGrowthRate, rate);
    var max = numberOr(growth.maxGrowthRate, rate);
    return Math.max(min, Math.min(max, rate));
  };

  /** 効果（特性・装備）の集計係。必要になったときだけ作る */
  MonsterInstance.prototype._getEffects = function () {
    if (!NS.EffectSystem) return null;
    if (!this._effectSystem) this._effectSystem = new NS.EffectSystem(this._data);
    return this._effectSystem;
  };

  /**
   * 特性・装備によるステータス倍率を返す。
   * 仕組みが読み込まれていない場合でも動くよう、無ければ 1 を返す。
   * @param {string} stat "hp" / "attack" / "defense" / "speed" / "pp"
   */
  MonsterInstance.prototype.getEffectStatMultiplier = function (stat) {
    var effects = this._getEffects();
    if (!effects) return 1;

    // 「HPが少ないとき」のような条件は最大HPを見る。
    // その最大HP自体に効果が掛かっていると堂々巡りになるため、
    // 計算中にもう一度呼ばれたら倍率なしとして扱う。
    if (this._calculatingEffects) return 1;

    this._calculatingEffects = true;
    try {
      return effects.getStatMultiplier(this, stat);
    } finally {
      this._calculatingEffects = false;
    }
  };

  /** 特性・装備によるステータスへの加算（無ければ 0） */
  MonsterInstance.prototype.getEffectStatBonus = function (stat) {
    var effects = this._getEffects();
    if (!effects) return 0;
    if (this._calculatingEffects) return 0;

    this._calculatingEffects = true;
    try {
      return effects.getStatBonus(this, stat);
    } finally {
      this._calculatingEffects = false;
    }
  };

  /**
   * 実効ステータスを計算する。
   * 式: floor( 基礎値 × (1 + (Lv-1) × 成長率) × 性格補正 × 効果倍率 ) + 個体値 + 効果加算
   *   効果倍率／効果加算 … 特性と装備（EffectSystem がまとめて集計する）
   */
  MonsterInstance.prototype._calcStat = function (baseKey, ivKey, natureKey) {
    if (!this._species) return 1;
    var rate = this.getGrowthRate(ivKey);
    var nature = this.getNature();
    var natureMul = nature ? (nature[natureKey] || 1) : 1;
    var effectMul = this.getEffectStatMultiplier(ivKey);

    var base = this._species[baseKey] || 0;
    var value = base * (1 + (this.level - 1) * rate) * natureMul * effectMul;

    // 加算はマイナスの装備でも0未満にならないようにする
    var total = Math.floor(value) + (this.ivs[ivKey] || 0) + this.getEffectStatBonus(ivKey);
    return Math.max(1, total);
  };

  MonsterInstance.prototype.getMaxHp = function () {
    return this._calcStat("baseHp", "hp", "hp");
  };
  MonsterInstance.prototype.getAttack = function () {
    return this._calcStat("baseAttack", "attack", "attack");
  };
  MonsterInstance.prototype.getDefense = function () {
    return this._calcStat("baseDefense", "defense", "defense");
  };
  /** 素早さ。大きいほど戦闘で先に行動する */
  MonsterInstance.prototype.getSpeed = function () {
    return this._calcStat("baseSpeed", "speed", "speed");
  };

  /**
   * PPの最大値。技を使うのに必要な資源で、通常攻撃には使わない。
   * 式はステータスと同じだが、性格補正と個体値は掛からない。
   */
  MonsterInstance.prototype.getMaxPp = function () {
    if (!this._species) return 0;

    var base = this._species.basePp || 0;
    var value = base * (1 + (this.level - 1) * this.getGrowthRate("pp"))
              * this.getEffectStatMultiplier("pp");

    return Math.max(1, Math.floor(value) + this.getEffectStatBonus("pp"));
  };

  // --- PP 操作 ---

  /** その消費量を払えるか */
  MonsterInstance.prototype.canPayPp = function (cost) {
    return this.currentPp >= (cost || 0);
  };

  /**
   * PPを支払う。足りなければ何もせず false。
   * @returns {boolean} 支払えたか
   */
  MonsterInstance.prototype.payPp = function (cost) {
    cost = cost || 0;
    if (!this.canPayPp(cost)) return false;
    this.currentPp -= cost;
    return true;
  };

  MonsterInstance.prototype.restorePp = function (amount) {
    this.currentPp = Math.min(this.getMaxPp(), this.currentPp + (amount || 0));
    return this.currentPp;
  };

  MonsterInstance.prototype.restorePpFull = function () {
    this.currentPp = this.getMaxPp();
  };

  // --- HP 操作 ---

  MonsterInstance.prototype.isFainted = function () { return this.currentHp <= 0; };

  MonsterInstance.prototype.takeDamage = function (amount) {
    this.currentHp = Math.max(0, this.currentHp - amount);
    return this.currentHp;
  };

  MonsterInstance.prototype.heal = function (amount) {
    this.currentHp = Math.min(this.getMaxHp(), this.currentHp + amount);
    return this.currentHp;
  };

  /** 全回復（HPとPPの両方を戻す） */
  MonsterInstance.prototype.healFull = function () {
    this.currentHp = this.getMaxHp();
    this.currentPp = this.getMaxPp();
  };

  // --- 経験値・レベルアップ ---

  /**
   * この個体を倒したときに相手が得る経験値。
   * レベルが高い相手ほど多くもらえる。
   *   floor( expReward × (1 + (Lv - 1) × expRewardPerLevel) )
   */
  MonsterInstance.prototype.getExpReward = function () {
    if (!this._species) return 0;

    var base = this._species.expReward || 0;
    var perLevel = (this._data.growth || {}).expRewardPerLevel;
    if (!perLevel) return base;

    return Math.floor(base * (1 + (this.level - 1) * perLevel));
  };

  /**
   * この個体を倒したときに得られるゴールド。
   * 経験値と同じく、レベルが高い相手ほど多い。
   */
  MonsterInstance.prototype.getGoldReward = function () {
    if (!this._species) return 0;

    var base = this._species.goldReward || 0;
    var perLevel = (this._data.growth || {}).goldRewardPerLevel;
    if (!perLevel) return base;

    return Math.floor(base * (1 + (this.level - 1) * perLevel));
  };

  /** 次のレベルに必要な経験値: floor( expBase * level ^ expExponent ) */
  MonsterInstance.prototype.getExpToNextLevel = function () {
    var growth = this._data.growth || {};
    var base = growth.expBase || 10;
    var exponent = growth.expExponent || 1.5;
    return Math.floor(base * Math.pow(this.level, exponent));
  };

  /**
   * 経験値を加算し、必要ならレベルアップする。
   * @returns {{levels:number, learned:string[]}} 上がったレベル数と新しく覚えた技
   */
  MonsterInstance.prototype.gainExp = function (amount) {
    var maxLevel = this.getMaxLevel();
    var result = { levels: 0, learned: [] };

    this.exp += amount;
    while (this.level < maxLevel && this.exp >= this.getExpToNextLevel()) {
      this.exp -= this.getExpToNextLevel();
      this.level++;
      result.levels++;

      // レベルアップで覚える技を習得
      var newSkills = NS.MonsterData.skillsLearnedAtLevel(this._species, this.level);
      for (var i = 0; i < newSkills.length; i++) {
        if (this.skills.indexOf(newSkills[i]) === -1) {
          this.skills.push(newSkills[i]);
          result.learned.push(newSkills[i]);
        }
      }
    }
    // 最大HPを超えないよう補正
    this.currentHp = Math.min(this.currentHp, this.getMaxHp());
    return result;
  };

  // --- セーブ・ロード ---

  /**
   * 保存用のデータへ変換する。
   * 種族データ（不変）は保存せず、種族idだけを持つ。
   * こうしておけば data/monsters.js を調整しても、既存のセーブがそのまま使える。
   */
  MonsterInstance.prototype.toSaveData = function () {
    return {
      speciesId: this.speciesId,
      level: this.level,
      exp: this.exp,
      currentHp: this.currentHp,
      currentPp: this.currentPp,
      natureId: this.natureId,
      ivs: { hp: this.ivs.hp, attack: this.ivs.attack,
             defense: this.ivs.defense, speed: this.ivs.speed || 0 },
      skills: this.skills.slice(),
      equipment: (this.equipment || []).slice()
    };
  };

  /**
   * 保存用データから個体を復元する。
   * @param {object} saved toSaveData() が返した内容
   * @param {MyGame.GameData} gameData
   * @returns {MonsterInstance|null} 種族が見つからない場合は null
   */
  MonsterInstance.fromSaveData = function (saved, gameData) {
    if (!saved || !gameData.getMonsterData(saved.speciesId)) return null;

    // 定義が消えた装備は読み飛ばす（データを変更しても安全に読めるように）
    var equipment = [];
    var saved_equipment = saved.equipment || [];
    for (var i = 0; i < saved_equipment.length; i++) {
      var item = gameData.getItem(saved_equipment[i]);
      if (item && item.equip) equipment.push(saved_equipment[i]);
    }

    var instance = new MonsterInstance(saved.speciesId, saved.level, gameData, {
      nature: saved.natureId,
      ivs: saved.ivs,
      skills: (saved.skills || []).slice(),
      equipment: equipment
    });
    instance.exp = saved.exp || 0;
    // 最大値を超えないように補正してから戻す
    instance.currentHp = Math.max(0, Math.min(instance.getMaxHp(), saved.currentHp));
    // 古いセーブには PP が無いので、その場合は満タンにする
    instance.currentPp = (saved.currentPp === undefined)
      ? instance.getMaxPp()
      : Math.max(0, Math.min(instance.getMaxPp(), saved.currentPp));
    return instance;
  };

  /** 数値として使える値ならそれを、そうでなければ既定値を返す */
  function numberOr(value, fallback) {
    return (typeof value === "number") ? value : fallback;
  }

  NS.MonsterInstance = MonsterInstance;
})(window.MyGame);
