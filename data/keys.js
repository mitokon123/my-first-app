/**
 * keys.js
 * キー割り当ての定義。Input が参照し、設定画面の「操作キー」一覧にも使われる。
 *
 * bindings       : アクション名 → キーコードの配列（複数キーを割り当てられる）
 * preventDefault : ブラウザの既定動作（スクロール等）を止めたいキーコード
 * order          : 設定画面に表示する順番
 * actionLabels   : アクションの表示名
 * keyLabels      : キーコードの表示名（省略時はキーコードをそのまま表示）
 *
 * ★ キーを増やす・変えるときは、このファイルを編集するだけでよい。
 */
(function (NS) {
  "use strict";

  NS.rawData.keys = {
    bindings: {
      up:         ["ArrowUp", "KeyW"],
      down:       ["ArrowDown", "KeyS"],
      left:       ["ArrowLeft", "KeyA"],
      right:      ["ArrowRight", "KeyD"],
      confirm:    ["Enter", "Space", "KeyZ"],
      cancel:     ["Escape", "KeyX"],
      party:      ["KeyP", "Tab"],
      store:      ["KeyQ"],
      equip:      ["KeyE"],
      save:       ["KeyF"],
      regenerate: ["KeyR"]
    },

    preventDefault: ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Space", "Tab"],

    order: ["up", "down", "left", "right", "confirm", "cancel",
            "party", "store", "equip", "save", "regenerate"],

    actionLabels: {
      up:         "上へ移動",
      down:       "下へ移動",
      left:       "左へ移動",
      right:      "右へ移動",
      confirm:    "決定",
      cancel:     "取消 / 戻る",
      party:      "仲間（編成）",
      store:      "預かり所へ預ける",
      equip:      "装備を着け替える",
      save:       "セーブ",
      regenerate: "ダンジョン再生成"
    },

    keyLabels: {
      ArrowUp: "↑", ArrowDown: "↓", ArrowLeft: "←", ArrowRight: "→",
      KeyW: "W", KeyA: "A", KeyS: "S", KeyD: "D",
      KeyZ: "Z", KeyX: "X", KeyP: "P", KeyQ: "Q", KeyE: "E", KeyF: "F", KeyR: "R",
      Enter: "Enter", Space: "Space", Escape: "Esc", Tab: "Tab"
    }
  };
})(window.MyGame);
