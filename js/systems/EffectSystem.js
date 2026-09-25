/**
 * EffectSystem.js
 * モンスターに掛かっている効果を、すべての出どころからまとめて集計する。
 *
 * ▼ 出どころ
 *   特性（アビリティ）… 種族が持つもの。AbilitySystem が「どれが効くか」を決める
 *   装備             … 個体が身につけているもの（data/items.js の equip）
 *   愛情度           … 個体の段階ごとの能力の上がり（data/affection.js）
 *   加護（ラン限定）  … 階を降りるたびに選んだもの。個体の runEffects に入っている
 *   その戦いの補正     … 敵として出ているあいだだけ。個体の encounterEffects に入っている
 *                      （主の statMultiplier と、特殊な出方をする在来種の両方）
 *   バフ／デバフ      … 技でかかるもの。個体の modifiers に入っている（戦闘のあいだだけ）
 *
 * 出どころが増えても collectEffects に1つ足すだけでよく、
 * ステータス計算も戦闘のダメージ計算も変更しなくてよい。
 *
 * ▼ 効果の書き方は出どころによらず共通（data/abilities.js の説明を参照）
 *   { type:"statMultiplier", stat:"attack", value:1.2 }
 *   { type:"statBonus",      stat:"defense", value:3 }
 *   { type:"damageDealt",    value:1.25, element:"fire" }
 *   { type:"damageTaken",    value:0.9 }
 *   { type:"resistBonus",    element:"fire", value:3 }  … 耐性の数値そのものを上げる
 *
 * ▼ 倍率と加算の違い
 *   statMultiplier は掛け算、statBonus は足し算。
 *   ステータスは floor(基礎 × 倍率) のあとに加算する（個体値と同じ扱い）。
 */
(function (NS) {
  "use strict";

  /**
   * @param {MyGame.GameData} gameData
   */
  function EffectSystem(gameData) {
    this.data = gameData;
    this.abilitySystem = NS.AbilitySystem ? new NS.AbilitySystem(gameData) : null;
  }

  /**
   * そのモンスターに掛かっている効果をすべて並べて返す。
   * @param {object} monster
   * @returns {object[]}
   */
  EffectSystem.prototype.collectEffects = function (monster) {
    if (!monster) return [];
    var effects = [];
    var i;

    // 特性
    var abilities = this.abilitySystem ? this.abilitySystem.getAbilities(monster) : [];
    for (i = 0; i < abilities.length; i++) {
      effects = effects.concat(abilities[i].effects || []);
    }

    // 装備
    var equipments = this.getEquipments(monster);
    for (i = 0; i < equipments.length; i++) {
      effects = effects.concat((equipments[i].equip || {}).effects || []);
    }

    // 愛情度（段階ごとに全能力が少し上がる。data/affection.js）
    if (monster.getAffectionEffects) {
      effects = effects.concat(monster.getAffectionEffects());
    }

    // 加護（そのラン限り）。拠点へ戻ると Game が消す
    if (monster.runEffects && monster.runEffects.length > 0) {
      effects = effects.concat(monster.runEffects);
    }

    // その戦いのあいだだけの補正。
    // 主の statMultiplier と、特殊な出方をする在来種（竜など）の両方がここに入る。
    // 敵として立ちはだかっている個体にだけ付いていて、仲間にすると外れる
    if (monster.encounterEffects && monster.encounterEffects.length > 0) {
      effects = effects.concat(monster.encounterEffects);
    }

    // バフ／デバフ（その戦闘のあいだだけ）。ターン数で切れ、戦闘終了で消える
    var modifiers = monster.modifiers || [];
    for (i = 0; i < modifiers.length; i++) {
      effects = effects.concat(modifiers[i].effects || []);
    }

    // 状態異常。data/statuses.js に effects を書いたものだけが効く（いまは呪いだけ）。
    // 書き方はバフ／デバフとまったく同じなので、ダメージ計算側は何も変えなくてよい
    var statuses = monster.getStatusDefs ? monster.getStatusDefs() : [];
    for (i = 0; i < statuses.length; i++) {
      effects = effects.concat(statuses[i].effects || []);
    }

    return effects;
  };

  /**
   * 身につけている装備の定義を並べて返す。
   *
   * 枠は data/config.js の equipSlots。枠ごとの数を超えたぶんと、
   * 同じ装備の2つ目は効かない（着ける側の Game.equipItem でも止めているが、
   * データを直に触られても壊れないよう、ここでも守る）。
   *
   * @param {object} monster
   * @returns {object[]} data/items.js のエントリ
   */
  EffectSystem.prototype.getEquipments = function (monster) {
    var ids = (monster && monster.equipment) || [];
    if (typeof ids === "string") ids = [ids];   // 1つだけ持たせた場合も扱えるように

    var used = {};    // 枠id → 使った数
    var seen = {};    // 装備id → 既に数えたか
    var result = [];

    for (var i = 0; i < ids.length; i++) {
      var item = this.data.getItem(ids[i]);
      if (!item || !item.equip || seen[ids[i]]) continue;

      var slot = EffectSystem.slotOf(item);
      var count = used[slot] || 0;
      if (count >= EffectSystem.slotCapacity(this.data, slot)) continue;

      used[slot] = count + 1;
      seen[ids[i]] = true;
      result.push(item);
    }
    return result;
  };

  /** その装備の枠id。書いていない装備はアクセサリー扱い */
  EffectSystem.slotOf = function (item) {
    return (item && item.equip && item.equip.slot) || "accessory";
  };

  /** その装備の枠の表示名（data/categories.js の equipSlot）。無ければ id のまま */
  EffectSystem.slotName = function (item, gameData) {
    return EffectSystem.slotNameOf(EffectSystem.slotOf(item), gameData);
  };

  /** 枠id → 表示名 */
  EffectSystem.slotNameOf = function (slot, gameData) {
    var defs = ((gameData.categories || {}).equipSlot) || {};
    return (defs[slot] && defs[slot].name) || slot;
  };

  /** その枠が何個あるか（data/config.js の equipSlots を数える） */
  EffectSystem.slotCapacity = function (gameData, slot) {
    var slots = (gameData.config || {}).equipSlots || [];
    var count = 0;
    for (var i = 0; i < slots.length; i++) {
      if (slots[i] === slot) count++;
    }
    return count;
  };

  // --- 集計 ---

  /**
   * ステータスに掛かる倍率（何も無ければ 1）。
   * @param {string} stat "hp" / "attack" / "defense" / "speed" / "pp"
   */
  EffectSystem.prototype.getStatMultiplier = function (monster, stat) {
    var self = this;
    return this._multiply(monster, function (effect) {
      if (effect.type !== "statMultiplier" || effect.stat !== stat) return null;
      if (!self._matchCondition(monster, effect.condition)) return null;
      return effect.value;
    });
  };

  /** ステータスへの加算（何も無ければ 0） */
  EffectSystem.prototype.getStatBonus = function (monster, stat) {
    var self = this;
    return this._sum(monster, function (effect) {
      if (effect.type !== "statBonus" || effect.stat !== stat) return null;
      if (!self._matchCondition(monster, effect.condition)) return null;
      return effect.value;
    });
  };

  /** 自分が与えるダメージに掛かる倍率 */
  EffectSystem.prototype.getDamageDealtMultiplier = function (monster, elementId) {
    var self = this;
    return this._multiply(monster, function (effect) {
      if (effect.type !== "damageDealt") return null;
      if (effect.element && effect.element !== elementId) return null;
      if (!self._matchCondition(monster, effect.condition)) return null;
      return effect.value;
    });
  };

  /**
   * 耐性そのものへの加算（何も無ければ 0）。
   * 倍率ではなく「耐性の数値」を動かすので、
   * data/monsters.js の resistances / statusResist に書いたのと同じ重みで効く。
   *
   * ▼ 属性と状態異常を1つの効果型で扱う
   *   { type:"resistBonus", element:"fire",  value:3 }  … 火への耐性 +3
   *   { type:"resistBonus", status:"poison", value:7 }  … 毒への耐性 +7
   *
   *   ★ どちらを書いたかで効く先が決まる。
   *     element を書いた効果は状態異常には効かず、status を書いた効果は属性に効かない。
   *     これを分けないと、炎よけの札が毒にも効いてしまう。
   *   ★ どちらも書かない resistBonus は、その種類すべてに効く（全属性・全状態異常）。
   *
   * @param {object} monster
   * @param {string} id 属性id または 状態異常id
   * @param {string} [kind] "status" なら状態異常として引く（省略時は属性）
   */
  EffectSystem.prototype.getResistBonus = function (monster, id, kind) {
    var self = this;
    var wantStatus = (kind === "status");

    return this._sum(monster, function (effect) {
      if (effect.type !== "resistBonus") return null;

      // 種類違いを弾く（炎よけの札が毒に効かないように）
      if (wantStatus && effect.element) return null;
      if (!wantStatus && effect.status) return null;

      var key = wantStatus ? effect.status : effect.element;
      if (key && key !== id) return null;

      if (!self._matchCondition(monster, effect.condition)) return null;
      return effect.value;
    });
  };

  /** 自分が受けるダメージに掛かる倍率 */
  EffectSystem.prototype.getDamageTakenMultiplier = function (monster, elementId) {
    var self = this;
    return this._multiply(monster, function (effect) {
      if (effect.type !== "damageTaken") return null;
      if (effect.element && effect.element !== elementId) return null;
      if (!self._matchCondition(monster, effect.condition)) return null;
      return effect.value;
    });
  };

  /** 条件を満たしているか。condition が無ければ常に true */
  EffectSystem.prototype._matchCondition = function (monster, condition) {
    if (!condition) return true;

    var maxHp = monster.getMaxHp ? monster.getMaxHp() : 0;
    var ratio = maxHp > 0 ? (monster.currentHp / maxHp) : 0;

    if (condition.hpBelow !== undefined && ratio > condition.hpBelow) return false;
    if (condition.hpAbove !== undefined && ratio < condition.hpAbove) return false;
    return true;
  };

  /** 当てはまる効果の値をすべて掛け合わせる */
  EffectSystem.prototype._multiply = function (monster, pick) {
    var effects = this.collectEffects(monster);
    var total = 1;

    for (var i = 0; i < effects.length; i++) {
      var value = pick(effects[i]);
      if (typeof value === "number") total *= value;
    }
    return total;
  };

  /** 当てはまる効果の値をすべて足し合わせる */
  EffectSystem.prototype._sum = function (monster, pick) {
    var effects = this.collectEffects(monster);
    var total = 0;

    for (var i = 0; i < effects.length; i++) {
      var value = pick(effects[i]);
      if (typeof value === "number") total += value;
    }
    return total;
  };

  /**
   * 効果1つを日本語の1行にする（画面に出すため）。
   *
   * 装備・加護・特性のどこから来た効果でも同じ書き方になるよう、
   * 文章の組み立てはここ1か所にまとめてある。
   *
   * @param {object} effect 効果1件
   * @param {MyGame.GameData} gameData 属性名やラベルを引くために使う
   * @returns {string} 表せない種類なら空文字
   */
  EffectSystem.describeEffect = function (effect, gameData) {
    if (!effect) return "";

    var party = ((gameData.messages || {}).party) || {};
    var labels = {
      hp: "HP", pp: "PP",
      attack: party.attackLabel || "攻撃",
      defense: party.defenseLabel || "防御",
      speed: party.speedLabel || "素早さ"
    };
    var stat = labels[effect.stat] || effect.stat;
    var text = "";

    if (effect.type === "statBonus") {
      text = stat + " " + (effect.value >= 0 ? "+" : "") + effect.value;
    } else if (effect.type === "statMultiplier") {
      text = stat + " ×" + effect.value;
    } else if (effect.type === "damageDealt" || effect.type === "damageTaken") {
      var element = (gameData.elements || {})[effect.element];
      var kind = (effect.type === "damageDealt") ? "与ダメージ" : "被ダメージ";
      // 属性を書いたものだけ「火の与ダメージ」。書いていなければ全部に効くので、属性は付けない
      text = (element ? element.name + "の" : "") + kind + " ×" + effect.value;
    } else if (effect.type === "resistBonus") {
      // 属性の耐性（炎よけの札）と、状態異常の耐性（毒よけの護符）の両方。
      // ここが無かったころは、工房や仲間画面の効果欄に**空の行**が出ていた
      var target;
      if (effect.status) {
        var status = (gameData.statuses || {})[effect.status];
        target = status ? status.name : effect.status;
      } else if (effect.element) {
        var el = (gameData.elements || {})[effect.element];
        target = el ? el.name : effect.element;
      } else {
        target = party.allElements || "全";
      }
      text = target + "への耐性 " + (effect.value >= 0 ? "+" : "") + effect.value;
    }

    if (text && effect.condition) text += describeCondition(effect.condition);
    return text;
  };

  /** 条件つきの効果に「（HP25%以下のとき）」のようなただし書きを足す */
  function describeCondition(condition) {
    if (condition.hpBelow !== undefined) {
      return "（HP" + Math.round(condition.hpBelow * 100) + "%以下のとき）";
    }
    if (condition.hpAbove !== undefined) {
      return "（HP" + Math.round(condition.hpAbove * 100) + "%以上のとき）";
    }
    return "";
  }

  NS.EffectSystem = EffectSystem;
})(window.MyGame);
