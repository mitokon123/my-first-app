/**
 * main.js
 * 起動・初期化のみを担当する。
 * データ読み込み(DataLoader) → GameData 生成 → Game 起動、の流れを組み立てる。
 */
(function (NS) {
  "use strict";

  function boot() {
    var canvas = document.getElementById("game");

    // 読み込み専用の DataLoader から参照窓口 GameData を作る
    var gameData = NS.DataLoader.build(NS.rawData);

    // スプライト（コード生成のドット絵など）を用意
    var assets = new NS.AssetLoader();
    assets.build(gameData.sprites);

    // 画面サイズはデータ(config)で管理
    var cfg = gameData.config;
    canvas.width = cfg.canvasWidth || 640;
    canvas.height = cfg.canvasHeight || 480;

    var game = new NS.Game(canvas, gameData, assets);
    game.start();
  }

  window.addEventListener("load", boot);
})(window.MyGame);
