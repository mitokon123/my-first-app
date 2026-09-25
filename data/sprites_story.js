/**
 * sprites_story.js
 * 物語の場面に立つ人物の絵（data/story.js の actors から sprite で参照する）。
 *
 * ★ 見た目はこの絵で確定（ストーリー構成.md の「導入で話す人物」）。
 *   描き直すときは id を変えなければ、場面の側（data/story.js）は触らなくてよい。
 *
 * 大きさは主人公（playerWalk1）と同じ 32×32。並べたときに背丈がそろうようにしてある。
 * 書き方（パレット・pixels）は data/sprites.js を参照。
 */
(function (NS) {
  "use strict";

  NS.extend("sprites", {

    /**
     * オルド（試験官）。ベテランの探索者。
     * 灰色の髪と髭、膝まである茶色の外套。主人公より肩幅を広くしてある
     */
    npcOrd: {
      palette: {
        ".": null,
        "K": "#101425",   // 輪郭・目
        "G": "#8e949e",   // 髪
        "W": "#c4c8d0",   // 髭
        "S": "#e0b48c",   // 肌
        "T": "#b88a66",   // 肌の影
        "L": "#8a6440",   // 外套の光が当たる面
        "C": "#6b4a2e",   // 外套
        "c": "#4a321e",   // 外套の影
        "M": "#2a1e14",   // ベルト
        "P": "#34343e",   // ズボン
        "N": "#1e1a16"    // 靴
      },
      pixels: [
        "................................",
        "................................",
        "................................",
        "................................",
        "............KKKKKKKK............",
        "...........KGGGGGGGGK...........",
        "..........KGGGGGGGGGGK..........",
        "..........KGGSSSSSSGGK..........",
        "..........KGSSSSSSSSGK..........",
        "..........KGSKKSSKKSGK..........",
        "..........KGSSSSSSSSGK..........",
        "..........KSWWWTTWWWSK..........",
        "..........KSWWWWWWWWSK..........",
        "...........KWWWWWWWWK...........",
        "........KLLLLLLLLLLLLLLK........",
        "........KLLCCCCcCCCCCccK........",
        "........KLLCCCCcCCCCCccK........",
        "......KLLLLCCCCcCCCCCccccK......",
        "......KLLLLCCCCcCCCCCccccK......",
        "......KSSLLCCCCcCCCCCccSSK......",
        "........KLLCCCCcCCCCCccK........",
        "........KMMMMMMMMMMMMMMK........",
        "........KLLCCCCcCCCCCccK........",
        "........KLLCCCCcCCCCCccK........",
        "........KLLCCCCcCCCCCccK........",
        "........KKKKKKKKKKKKKKKK........",
        "..........KPPK...KPPK...........",
        "..........KPPK...KPPK...........",
        ".........KNNNK...KNNNK..........",
        ".........KKKKK...KKKKK..........",
        "................................",
        "................................"
      ]
    },

    /**
     * イレーネ（探索者協会の支部長）。
     * 肩まで届く暗い髪、金の縁取りのある紺の長衣
     */
    npcIrene: {
      palette: {
        ".": null,
        "K": "#101425",   // 輪郭・目
        "H": "#3a2a4a",   // 髪
        "h": "#5a4470",   // 髪の光
        "S": "#f2d0b0",   // 肌
        "T": "#d4a88a",   // 肌の影・口
        "R": "#2e3f7a",   // 長衣
        "r": "#1f2b58",   // 長衣の影
        "O": "#d8b24a",   // 金の縁取り
        "N": "#1a1a26"    // 靴
      },
      pixels: [
        "................................",
        "................................",
        "................................",
        "................................",
        "............KKKKKKKK............",
        "...........KhHHHHHHHK...........",
        "..........KhHHHHHHHHHK..........",
        "..........KHHSSSSSSHHK..........",
        "..........KHSSSSSSSSHK..........",
        "..........KHSKKSSKKSHK..........",
        "..........KHSSSSSSSSHK..........",
        "..........KHSSSTTSSSHK..........",
        ".........KHHKSSSSSSKHHK.........",
        ".........KHHHKSSSSKHHHK.........",
        ".........KHHOOOOOOOOHHK.........",
        ".........KHRRRROORRRrHK.........",
        ".........KHRRRROORRRrHK.........",
        ".......KRRRRRRROORRRRrrrK.......",
        ".......KRRRRRRROORRRRrrrK.......",
        ".......KSSRRRRROORRRRrSSK.......",
        ".........KRRRRROORRRrrK.........",
        ".........KOOOOOOOOOOOOK.........",
        ".........KRRRRROORRRrrK.........",
        "........KRRRRRROORRRRrrK........",
        "........KRRRRRROORRRRrrK........",
        ".......KRRRRRRROORRRRrrrK.......",
        ".......KRRRRRRROORRRRrrrK.......",
        ".......KOOOOOOOOOOOOOOOOK.......",
        "..........KNNK....KNNK..........",
        "..........KKKK....KKKK..........",
        "................................",
        "................................"
      ]
    }
  });

  /**
   * 探索者（場面6で知らせを持ってくる人。名前なし）。
   * 形は主人公と同じで、髪と服の色だけ変える（名前の無い人物なので、描き分けまではしない）
   */
  var base = (NS.rawData.sprites || {}).playerWalk1;
  if (base) {
    var palette = {};
    for (var key in base.palette) palette[key] = base.palette[key];
    palette.Y = "#6a4a2a";   // 髪（茶）
    palette.D = "#3e5a36";   // 服の影
    palette.A = "#5a7a4a";   // 服
    palette.H = "#7a9a64";   // 服の光

    NS.extend("sprites", {
      npcScout: { pixels: base.pixels, palette: palette }
    });
  }
})(window.MyGame);
