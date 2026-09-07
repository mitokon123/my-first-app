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
   * @returns {{success:boolean, reason:string, amount:number, itemName:string}}
   *   reason: "used" | "noItem" | "noEffect" | "unknown"
   */
  ItemUsage.prototype.use = function (itemId, target, inventory) {
    var item = this.data.getItem(itemId);
    var itemName = item ? item.name : itemId;

    if (!item || !item.effect) {
      return { success: false, reason: "unknown", amount: 0, itemName: itemName };
    }
    if (inventory && !inventory.has(itemId, 1)) {
      return { success: false, reason: "noItem", amount: 0, itemName: itemName };
    }

    var handler = EFFECT_HANDLERS[item.effect.type];
    if (!handler) {
      return { success: false, reason: "unknown", amount: 0, itemName: itemName };
    }

    var result = handler(item.effect, target);
    if (!result.applied) {
      return { success: false, reason: "noEffect", amount: 0, itemName: itemName };
    }

    if (inventory) inventory.remove(itemId, 1);
    return { success: true, reason: "used", amount: result.amount, itemName: itemName };
  };

  NS.ItemUsage = ItemUsage;
})(window.MyGame);
