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
