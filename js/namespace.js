/**
 * namespace.js
 * このゲームで使用する唯一のグローバル名前空間を定義する。
 * 以降のすべてのファイルは、この `MyGame` の下に IIFE で登録し、
 * グローバル変数の汚染を避ける。
 *
 * - MyGame        : クラス・システムの登録先
 * - MyGame.rawData: data/*.js が登録する生データ（JSONと同等のオブジェクト）
 * - MyGame.extend : 同じ種類のデータを複数ファイルに分けて書くための追加関数
 */
window.MyGame = window.MyGame || {};
window.MyGame.rawData = window.MyGame.rawData || {};

/**
 * rawData の1カテゴリへ、まとめて項目を追加する。
 *
 * スプライトやモンスターのように数が増えていくデータは、
 * 1ファイルに全部書くと読めなくなるので、地方や用途ごとにファイルを分ける。
 * その分けたファイルから、同じカテゴリへ追加していくために使う。
 *
 *   MyGame.extend("sprites", { chest: {...}, spring: {...} });
 *
 * 読み込む順番はどうでもよい（先に呼ばれた方が入れ物を作る）。
 * ただし同じidを2つのファイルに書くと、あとから読み込んだ方で上書きされる。
 *
 * @param {string} category rawData のキー（"sprites" など）
 * @param {object} entries 追加する項目（{ id: 定義 }）
 */
window.MyGame.extend = function (category, entries) {
  var raw = window.MyGame.rawData;
  var target = raw[category] || (raw[category] = {});

  for (var id in entries) {
    if (!Object.prototype.hasOwnProperty.call(entries, id)) continue;
    target[id] = entries[id];
  }
  return target;
};
