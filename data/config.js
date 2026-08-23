/**
 * config.js
 * ゲーム全体の基本設定。数値はコードに直接書かず、ここで管理する。
 * （中身は JSON と同じ構造。将来 config.json へ移行しやすい形にしてある）
 */
(function (NS) {
  "use strict";

  NS.rawData.config = {
    gameTitle: "ABYSS CHRONICLE", // ゲーム名
    worldName: "Monstoria",       // 世界名
    version: "α-1",     // バージョン表記（履歴は data/patchnotes.js）
    canvasWidth: 800,   // 画面の横幅（px）
    canvasHeight: 600,  // 画面の縦幅（px）
    tileSize: 32,       // 1タイルの大きさ（px）
    partyMax: 6,        // 連れていける最大数
    storageMax: 30,     // 拠点の預かり所に預けられる数
    battleFieldSize: 3, // 戦闘盤面に同時に出せる数（味方・敵とも）
    abilityMax: 1,      // モンスター1体が持てる特性の数（超えた分は無視される）
    equipMax: 1         // モンスター1体が身につけられる装備の数
  };
})(window.MyGame);
