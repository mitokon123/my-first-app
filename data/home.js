/**
 * home.js
 * 拠点のメニューに並ぶ項目。
 *
 * key        : data/messages.js の home から表示名を引くためのキー
 * value      : 選ばれたときの識別子（js/scenes/HomeScene.js の _openFeature が見る）
 * icon       : 項目の左に出す絵（data/sprites_ui.js を参照）
 * unlockedBy : 使えるようになる条件。省略すると最初から使える
 *              書き方は data/dungeons.js の unlockedBy と同じ
 *              （"id" / ["id","id"] / {dungeons,count} / {region,count}）
 * ready      : false にすると「準備中」と出るだけになる（作りかけの機能用）
 *
 * ★ 並び順はこの配列の順番。項目を増やすときは、ここに1つ足したうえで
 *   HomeScene の _openFeature に開き先を書く。
 */
(function (NS) {
  "use strict";

  NS.rawData.home = {
    menu: [
      { key: "dungeon",  value: "dungeon",  icon: "iconDungeon" },
      { key: "party",    value: "party",    icon: "iconParty" },
      { key: "shop",     value: "shop",     icon: "iconShop" },
      // 工房は素材を持ち帰れるようになってから開く
      { key: "craft",    value: "craft",    icon: "iconCraft", unlockedBy: "mossyMine" },
      // 加護の編成。謎の商人が来るのと同じタイミングで開く
      // （買った加護を入れ替えられないと意味がないため）
      { key: "blessing", value: "blessing", icon: "iconBlessing", unlockedBy: "silentDepths" },
      { key: "items",    value: "items",    icon: "iconItems" },
      { key: "dex",      value: "dex",      icon: "iconDex" },
      { key: "save",     value: "save",     icon: "iconSave" },
      { key: "settings", value: "settings", icon: "iconSettings" }
    ]
  };
})(window.MyGame);
