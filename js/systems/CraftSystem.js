/**
 * CraftSystem.js
 * 工房での「作れるか」の判断と、実際の作成を担当する。
 *
 * ▼ 役割
 * 画面には関与しない。素材とゴールドが足りているかを調べ、足りていれば作るだけ。
 * 持ち物への反映は Game のメソッド（giveItem / spendGold）に任せる。
 */
(function (NS) {
  "use strict";

  /**
   * @param {MyGame.GameData} gameData
   */
  function CraftSystem(gameData) {
    this.data = gameData;
  }

  /**
   * 作れるものを order 順に並べて返す。
   * unlockedBy が書かれているものは、そのダンジョンをクリアするまで並ばない。
   *
   * @param {object} cleared クリア済みダンジョンの一覧（{ id: true }）
   * @returns {object[]} recipes.js のエントリ
   */
  CraftSystem.prototype.getRecipes = function (cleared) {
    var recipes = this.data.recipes || {};
    var result = [];

    for (var id in recipes) {
      if (!Object.prototype.hasOwnProperty.call(recipes, id)) continue;
      var recipe = recipes[id];

      if (recipe.unlockedBy && !(cleared && cleared[recipe.unlockedBy])) continue;
      if (!this.data.getItem(recipe.result && recipe.result.item)) continue;

      result.push(recipe);
    }

    result.sort(function (a, b) { return (a.order || 999) - (b.order || 999); });
    return result;
  };

  /**
   * 素材の過不足を調べる。画面でそのまま並べられる形で返す。
   * @returns {Array<{item:object, need:number, owned:number, enough:boolean}>}
   */
  CraftSystem.prototype.getMaterialStatus = function (game, recipe) {
    var materials = (recipe && recipe.materials) || [];
    var result = [];

    for (var i = 0; i < materials.length; i++) {
      var item = this.data.getItem(materials[i].item);
      if (!item) continue;

      var owned = game.inventory.getCount(item.id);
      result.push({
        item: item,
        need: materials[i].count,
        owned: owned,
        enough: owned >= materials[i].count
      });
    }
    return result;
  };

  /**
   * 作れるか。
   * @returns {{ok:boolean, reason:string}}
   *   reason: "ok" | "notEnoughMaterial" | "notEnoughGold" | "inventoryFull" | "unknown"
   */
  CraftSystem.prototype.canCraft = function (game, recipe) {
    if (!recipe || !recipe.result) return { ok: false, reason: "unknown" };

    var status = this.getMaterialStatus(game, recipe);
    for (var i = 0; i < status.length; i++) {
      if (!status[i].enough) return { ok: false, reason: "notEnoughMaterial" };
    }

    if (!game.canAfford(recipe.gold || 0)) return { ok: false, reason: "notEnoughGold" };

    // 素材を消したあとの空きで判断する（素材の枠が空くこともあるため）
    if (!this._hasRoomForResult(game, recipe)) {
      return { ok: false, reason: "inventoryFull" };
    }
    return { ok: true, reason: "ok" };
  };

  /**
   * 作ったものを持ち物へ入れられるか。
   * 「素材を使い切って枠が空く」場合も入れられる扱いにする。
   */
  CraftSystem.prototype._hasRoomForResult = function (game, recipe) {
    var resultItem = this.data.getItem(recipe.result.item);
    if (!resultItem) return false;

    var owned = game.inventory.getCount(resultItem.id);
    var maxStack = (resultItem.maxStack === undefined) ? 99 : resultItem.maxStack;

    // 所持上限を超えるなら作れない
    if (owned + (recipe.result.count || 1) > maxStack) return false;

    // 既に持っているものなら、新しい枠は要らない
    if (owned > 0) return true;
    if (!game.inventory.isFull()) return true;

    // 枠が埋まっている場合でも、使い切る素材があれば1枠空く
    var status = this.getMaterialStatus(game, recipe);
    for (var i = 0; i < status.length; i++) {
      if (status[i].owned === status[i].need) return true;
    }
    return false;
  };

  /**
   * 作る。素材とゴールドを消費して、できたものを持ち物へ入れる。
   * @returns {{success:boolean, reason:string, count:number}}
   */
  CraftSystem.prototype.craft = function (game, recipe) {
    var check = this.canCraft(game, recipe);
    if (!check.ok) return { success: false, reason: check.reason, count: 0 };

    // 素材とゴールドを先に消費する（ここまでで足りることは確認済み）
    var materials = recipe.materials || [];
    for (var i = 0; i < materials.length; i++) {
      game.inventory.remove(materials[i].item, materials[i].count);
    }
    game.spendGold(recipe.gold || 0);

    var count = recipe.result.count || 1;
    var added = game.giveItem(recipe.result.item, count);

    return { success: true, reason: "crafted", count: added };
  };

  NS.CraftSystem = CraftSystem;
})(window.MyGame);
