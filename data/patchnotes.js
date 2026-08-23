/**
 * patchnotes.js
 * バージョンごとの更新履歴。タイトル画面の「パッチノート」から見られる。
 *
 * ▼ types … 項目の種類。色分けはここで決める
 *   id / label / color
 *
 * ▼ versions … 新しいものを先頭に置く（画面もこの順に並ぶ）
 *   version : バージョン名
 *   date    : 日付（表示用の文字列）
 *   summary : そのバージョンをひと言で表したもの
 *   entries : [{ type, text }] 変更の一覧。type は types のid
 *
 * ★ 更新履歴を足すときは versions の先頭に1エントリ足すだけでよい。
 */
(function (NS) {
  "use strict";

  NS.rawData.patchnotes = {
    types: {
      added:    { id: "added",    label: "追加", color: "#5fd18c" },
      balance:  { id: "balance",  label: "調整", color: "#ffd75e" },
      changed:  { id: "changed",  label: "変更", color: "#7fd9e8" },
      fixed:    { id: "fixed",    label: "修正", color: "#e8542a" },
      removed:  { id: "removed",  label: "削除", color: "#9aa4c0" }
    },

    versions: [
      {
        version: "α-1",
        date: "2026-08-07",
        summary: "ローグライク要素と、お金・装備まわりの追加",
        entries: [
          { type: "added", text: "ゴールドを追加した。敵を倒すと手に入り、全滅しても失わない。" },
          { type: "added", text: "装備を追加した。1体につき1つ着けられ、着ける前にステータスの変化を確認できる。" },
          { type: "added", text: "ショップを追加した。道具と装備を売り買いでき、ダンジョンをクリアすると品揃えが増える。" },
          { type: "added", text: "工房を追加した。拾った素材から道具や装備を作れる。ゴールドは要らない。" },
          { type: "added", text: "加護を追加した。階を降りるたびに3つの候補から1つ選び、その挑戦のあいだだけ仲間全員に効く。" },
          { type: "added", text: "挑戦（ラン）制を追加した。全滅すると、その挑戦で拾ったアイテムを失う。" },
          { type: "added", text: "仕掛けマスを追加した。階層に宝箱・泉・罠が置かれる。" },
          { type: "added", text: "拠点に預かり所を追加した。連れていかない仲間を預けられる。" },
          { type: "added", text: "マウス操作に対応した。重ねて選び、押して決定し、右クリックで戻れる。" },
          { type: "added", text: "各画面の右下に「戻る」ボタンを追加した。" },
          { type: "added", text: "図鑑に「性格」と「加護」を追加した。" },
          { type: "added", text: "技を選ぶときに、属性・威力・命中・説明を表示するようにした。" },
          { type: "added", text: "設定に「スクロール速度」を追加した。" },
          { type: "changed", text: "戦闘中のPPを、HPと同じようにバーで表示するようにした。" },
          { type: "changed", text: "図鑑の説明が長いときに、スクロールして読めるようにした。" },
          { type: "changed", text: "倒した相手のレベルが高いほど、得られる経験値とゴールドが増えるようにした。" },
          { type: "balance", text: "苔むす坑道の出現を階ごとに変えた。B1FはLv1、B2FはLv1〜3、B3FはLv2〜4になる。" },
          { type: "balance", text: "坑道の主をモスゴーレムのLv8に変更した。" },
          { type: "balance", text: "回復薬の回復量を60から50に下げ、工房で必要な薬草を2個に減らした。" },
          { type: "balance", text: "石の腕輪の素早さを×0.9から×0.8に、苔の護符の被ダメージを×0.95から×0.9に変更した。" },
          { type: "balance", text: "加護の倍率をおおむね×1.1にそろえた。" },
          { type: "fixed", text: "パーティが満員のときのスカウトで、入れ替え画面から操作できなくなる問題を修正した。" },
          { type: "fixed", text: "図鑑でホイールを回すと、いちばん下で先頭に戻ってしまう問題を修正した。" },
          { type: "fixed", text: "装備を持っていないときに、装備画面が開かない問題を修正した。" }
        ]
      },

      {
        version: "β",
        date: "2026-08-06",
        summary: "遊べる形になるまでの土台づくり",
        entries: [
          { type: "added", text: "タイトル・拠点・ダンジョン・戦闘という基本の流れを作った。" },
          { type: "added", text: "ランダム生成のダンジョンと、挑む場所を選ぶステージ選択を追加した。" },
          { type: "added", text: "3対3の戦闘を追加した。素早さ順に行動し、倒れると控えが繰り上がる。" },
          { type: "added", text: "スカウト・持ち物・図鑑・パーティ編成・セーブを追加した。" },
          { type: "added", text: "属性と耐性、会心、PP、特性、モンスターごとの成長率を追加した。" },
          { type: "added", text: "戦闘の演出と、その速さを変える設定を追加した。" }
        ]
      }
    ]
  };
})(window.MyGame);
