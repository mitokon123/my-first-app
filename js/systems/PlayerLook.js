/**
 * PlayerLook.js
 * 主人公の服の色ちがいの絵を、起動時に作る。
 *
 * ▼ 絵を描き足さずに色を増やす
 *   もとの絵（playerWalk1 / playerWalk2）のパレットのうち、
 *   服にあたる3つの記号（地の色・光の面・影）だけを差し替えた写しを作る。
 *   形はまったく同じなので、色を増やしても描く手間は増えない。
 *
 *   playerWalk1 ＋ 赤 → playerWalk1_red
 *
 * ▼ どこで呼ぶか
 *   js/main.js で、AssetLoader.build の**前**に1回だけ呼ぶ。
 *   絵ができあがったあとに足しても、描画物が作られない。
 *
 * ▼ 影も一緒に替える理由
 *   地の色だけ替えると、影と光の面が青いまま残る。
 *   赤い服に青い影がつくので、汚れて見える。3つで1組にしてある。
 *
 * 色そのものは data/player.js の appearance.colors。ここに色は書かない。
 */
(function (NS) {
  "use strict";

  var PlayerLook = {

    /** その色の絵のid（もとのid + "_" + 色のid） */
    variantId: function (spriteId, colorId) {
      return spriteId + "_" + colorId;
    },

    /** data/player.js の appearance */
    appearanceOf: function (gameData) {
      return (gameData.player || {}).appearance || {};
    },

    /** 選べる色の一覧 */
    colorsOf: function (gameData) {
      return this.appearanceOf(gameData).colors || [];
    },

    /** 既定の色のid（書かれていなければ最初の色） */
    defaultColorId: function (gameData) {
      var look = this.appearanceOf(gameData);
      if (look.defaultColor) return look.defaultColor;

      var colors = look.colors || [];
      return colors.length > 0 ? colors[0].id : null;
    },

    /** その色があるか。無ければ既定の色に落とす */
    resolveColorId: function (gameData, colorId) {
      var colors = this.colorsOf(gameData);
      for (var i = 0; i < colors.length; i++) {
        if (colors[i].id === colorId) return colorId;
      }
      return this.defaultColorId(gameData);
    },

    /** 色の定義（名前や色コードを出すのに使う） */
    colorDef: function (gameData, colorId) {
      var colors = this.colorsOf(gameData);
      for (var i = 0; i < colors.length; i++) {
        if (colors[i].id === colorId) return colors[i];
      }
      return null;
    },

    /**
     * その色で歩かせるときの絵のid（コマ数ぶんの配列）。
     * 色が見つからない場合は、もとの絵をそのまま返す（絵が出ないよりはよい）。
     */
    spritesFor: function (gameData, colorId) {
      var look = this.appearanceOf(gameData);
      var base = look.sprite || [];
      var list = isArray(base) ? base : [base];

      var id = this.resolveColorId(gameData, colorId);
      if (!id) return list;

      var out = [];
      for (var i = 0; i < list.length; i++) {
        var variant = this.variantId(list[i], id);
        // 作られていない場合に備えて、無ければもとの絵で描く
        out.push(gameData.sprites[variant] ? variant : list[i]);
      }
      return out;
    },

    /**
     * 色ちがいの絵をまとめて作り、gameData.sprites へ登録する。
     * @returns {number} 作った絵の枚数
     */
    buildVariants: function (gameData) {
      var look = this.appearanceOf(gameData);
      var base = look.sprite || [];
      var list = isArray(base) ? base : [base];
      var keys = look.colorKeys || {};
      var colors = look.colors || [];

      var made = 0;
      for (var c = 0; c < colors.length; c++) {
        for (var s = 0; s < list.length; s++) {
          if (this._makeOne(gameData, list[s], colors[c], keys)) made++;
        }
      }
      return made;
    },

    /** 1枚ぶん作る。もとの絵が無ければ何もしない */
    _makeOne: function (gameData, spriteId, color, keys) {
      var source = gameData.sprites[spriteId];
      if (!source || !source.pixels || !source.palette) return false;

      var palette = {};
      for (var key in source.palette) palette[key] = source.palette[key];

      // 服の3色だけ差し替える。輪郭・肌・髪はもとのまま
      if (keys.base   && color.base)   palette[keys.base]   = color.base;
      if (keys.light  && color.light)  palette[keys.light]  = color.light;
      if (keys.shadow && color.shadow) palette[keys.shadow] = color.shadow;

      // 形は共有する（同じ配列を指すだけ。写しは作らない）
      gameData.sprites[this.variantId(spriteId, color.id)] = {
        pixels: source.pixels,
        palette: palette
      };
      return true;
    }
  };

  function isArray(value) {
    return Object.prototype.toString.call(value) === "[object Array]";
  }

  NS.PlayerLook = PlayerLook;
})(window.MyGame);
