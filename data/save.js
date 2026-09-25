/**
 * save.js
 * セーブに関する設定。
 *
 * storageKey  : localStorage に保存するときのキー名（スロット1がこれをそのまま使う）
 * slotCount   : セーブファイルの数
 * slotSuffix  : スロット2以降のキーにつける文字。キーは storageKey + slotSuffix + 番号
 * saveVersion : セーブデータの形式バージョン。
 *   将来データ構造を変えたとき、この番号で「古いセーブか」を判別して
 *   読み込みを拒否したり変換したりできるようにしている。
 *
 * ▼ スロット1だけキーが違う理由
 *   ここでスロット1にも ".slot1" を付けると、**それまで遊んでいたセーブが
 *   どのスロットからも見えなくなる**。
 *   スロット1は昔からのキーをそのまま使い、増えたぶんだけ新しいキーにしてある。
 *   （SaveManager.keyFor を参照）
 *
 * ★ スロットを増やすときは slotCount を変えるだけでよい。
 *   ただし選択画面の高さは data/ui.js の saveSlot で決めているので、
 *   4つ以上にするときはそちらも合わせること。
 *
 * ▼ 中断（suspendSuffix）
 *   探索の途中で「中断」すると、そのスロットのキーに suspendSuffix を足したキーへ
 *   いまの状態（マップ・位置・加護・拾ったもの）を書く。セーブ本体は書き換えない。
 *   再開すると中断データは消える（続きの続き、はできない。ローグライクの中断と同じ）。
 *   拠点でセーブするまでは、途中で閉じると最後のセーブ（拠点）に戻る。
 *
 * ▼ 設定（settingsSuffix）
 *   音量・戦闘速度・チュートリアルなどの設定も、ファイルごとに持つ。
 *   キーはそのスロットのキーに settingsSuffix を足したもの。
 *   書くのは設定画面を閉じたときと、セーブ・中断したとき。
 *   コピー・移動・削除ではセーブと一緒に運ぶ（SaveManager.copySlot / clear）。
 */
(function (NS) {
  "use strict";

  NS.rawData.save = {
    storageKey: "my-first-app.save",
    slotCount: 3,
    slotSuffix: ".slot",
    suspendSuffix: ".suspend",
    settingsSuffix: ".settings",
    saveVersion: 1
  };
})(window.MyGame);
