/**
 * ItemUsage.js
 * アイテムを使ったときの効果を適用する。
 *
 * 効果の種類ごとに処理を分けてあるので、新しい効果を足すときは
 * EFFECT_HANDLERS に1つ関数を追加し、items.js の effect.type から呼べるようにする。
 * （アイテムの数値や効果量はすべて data/items.js が持つ）
 */
(function (NS) {
  "use strict";

  /**
   * 効果の種類ごとの処理。
   * 各関数は { applied: boolean, amount: number } を返す。
   *   applied … 実際に効果があったか（満タンに回復薬を使った場合などは false）
   */
  var EFFECT_HANDLERS = {
    /** HPを回復する */
    healHp: function (effect, target) {
      if (!target || target.isFainted === undefined) return { applied: false, amount: 0 };

      var before = target.currentHp;
      target.heal(effect.value || 0);
      var healed = target.currentHp - before;
      return { applied: healed > 0, amount: healed };
    },

    /** PPを回復する。満タンのときは使えない（回復薬と同じ扱い） */
    healPp: function (effect, target) {
      if (!target || target.getMaxPp === undefined) return { applied: false, amount: 0 };

      var before = target.currentPp;
      target.currentPp = Math.min(target.getMaxPp(), before + (effect.value || 0));
      var healed = target.currentPp - before;
      return { applied: healed > 0, amount: healed };
    },

    /**
     * 状態異常を治す。
     *
     * どれを治すかは data/items.js の effect が決める。
     *   statuses: ["poison"] … 書いた状態異常だけを治す
     *   statuses を省略      … curable: true のものを全部治す（万能薬を作るとき）
     *
     * 治せる状態異常が1つも掛かっていなければ「効果が無かった」となり、
     * 持ち物も減らない（満タンに回復薬を使ったときと同じ扱い）。
     *
     * @returns amount は治した数
     */
    cureStatus: function (effect, target, gameData) {
      if (!target || !target.getStatusDefs) return { applied: false, amount: 0 };

      var defs = target.getStatusDefs();
      var only = effect.statuses || null;
      var cured = 0;

      // 治しながら配列が縮むので、先に「治すもの」を決めてから外す
      var ids = [];
      for (var i = 0; i < defs.length; i++) {
        if (only) {
          if (only.indexOf(defs[i].id) < 0) continue;
        } else if (!defs[i].curable) {
          continue;   // 封印・即死のように治せないものは対象にしない
        }
        ids.push(defs[i].id);
      }

      for (var j = 0; j < ids.length; j++) {
        if (target.removeStatus(ids[j])) cured++;
      }
      return { applied: cured > 0, amount: cured };
    },

    /**
     * その場から拠点へ帰る。
     * ここでは「使えた」と返すだけで、実際に帰るのは画面側が行う
     * （ItemUsage は場面を知らないままにしておく）。
     */
    escape: function () {
      return { applied: true, amount: 0 };
    }
  };

  /**
   * @param {MyGame.GameData} gameData
   */
  function ItemUsage(gameData) {
    this.data = gameData;
  }

  /**
   * そのアイテムが指定の場面で使えるか。
   * @param {string} itemId
   * @param {string} scene "home" など
   */
  ItemUsage.prototype.isUsableIn = function (itemId, scene) {
    var item = this.data.getItem(itemId);
    if (!item || !item.effect) return false;
    return (item.usableIn || []).indexOf(scene) >= 0;
  };

  /**
   * 相手を選ばずに使うアイテムか（帰還の石など）。
   * true なら、画面側は対象選びを飛ばしてそのまま使う。
   */
  ItemUsage.prototype.needsTarget = function (itemId) {
    var item = this.data.getItem(itemId);
    var type = item && item.effect && item.effect.type;
    return type !== "escape";
  };

  /** そのアイテムを使うと拠点へ帰るか */
  ItemUsage.prototype.isEscape = function (itemId) {
    var item = this.data.getItem(itemId);
    return !!(item && item.effect && item.effect.type === "escape");
  };

  /**
   * アイテムを使う。効果があった場合のみ持ち物から1つ減らす。
   * @param {string} itemId
   * @param {object} target 効果の対象（MonsterInstance互換）
   * @param {MyGame.Inventory} inventory
   * @returns {{success:boolean, reason:string, amount:number, itemName:string,
   *            effectType:string}}
   *   reason: "used" | "noItem" | "noEffect" | "unknown"
   *   effectType … 効果の種類。画面側が「HPが回復した」「毒が抜けた」を出し分けるのに使う
   */
  ItemUsage.prototype.use = function (itemId, target, inventory) {
    var item = this.data.getItem(itemId);
    var itemName = item ? item.name : itemId;
    var type = (item && item.effect) ? item.effect.type : null;

    function fail(reason) {
      return { success: false, reason: reason, amount: 0,
               itemName: itemName, effectType: type };
    }

    if (!item || !item.effect) return fail("unknown");
    if (inventory && !inventory.has(itemId, 1)) return fail("noItem");

    var handler = EFFECT_HANDLERS[type];
    if (!handler) return fail("unknown");

    // 状態異常の定義を引く必要がある効果もあるので、データも渡す
    var result = handler(item.effect, target, this.data);
    if (!result.applied) return fail("noEffect");

    if (inventory) inventory.remove(itemId, 1);
    return { success: true, reason: "used", amount: result.amount,
             itemName: itemName, effectType: type };
  };

  /** その効果はHPを回復するものか（画面側が回復の演出を出すかの判断に使う） */
  ItemUsage.healsHp = function (effectType) {
    return effectType === "healHp";
  };

  NS.ItemUsage = ItemUsage;
})(window.MyGame);
