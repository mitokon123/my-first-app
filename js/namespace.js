/**
 * namespace.js
 * このゲームで使用する唯一のグローバル名前空間を定義する。
 * 以降のすべてのファイルは、この `MyGame` の下に IIFE で登録し、
 * グローバル変数の汚染を避ける。
 *
 * - MyGame        : クラス・システムの登録先
 * - MyGame.rawData: data/*.js が登録する生データ（JSONと同等のオブジェクト）
 */
window.MyGame = window.MyGame || {};
window.MyGame.rawData = window.MyGame.rawData || {};
