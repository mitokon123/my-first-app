/**
 * GameData.js
 * 読み込み済みデータの「管理・参照窓口」。
 * 各システム／エンティティは DataLoader ではなく、この GameData を参照する。
 *
 * 例: gameData.config, gameData.monsters, gameData.getMonsterData("slime")
 */
(function (NS) {
  "use strict";

  /**
   * @param {object} raw 生データ（MyGame.rawData 相当）
   */
  function GameData(raw) {
    raw = raw || {};
    // カテゴリごとに保持（未定義でも空オブジェクトで安全に扱えるようにする）
    this.config    = raw.config    || {};
    this.monsters  = raw.monsters  || {}; // MonsterData（種族/図鑑データ）
    this.skills    = raw.skills    || {};
    this.statuses  = raw.statuses  || {}; // 状態異常（毒・麻痺など）
    this.items     = raw.items     || {};
    this.abilities = raw.abilities || {}; // 特性・パッシブ
    this.categories = raw.categories || {}; // アイテム・モンスターの分類
    this.elements  = raw.elements  || {}; // 属性（現在は表示のみ）
    this.natures   = raw.natures   || {}; // 性格（個体の味付け）
    this.growth    = raw.growth    || {}; // 成長・経験値の計算パラメータ
    this.battle    = raw.battle    || {}; // 戦闘の計算パラメータ
    this.scout     = raw.scout     || {}; // スカウトの計算パラメータ
    this.naming    = raw.naming    || {}; // 名前をつける文字盤（文字表・最大文字数）
    this.run       = raw.run       || {}; // 1回の挑戦（ラン）の設定
    this.shop      = raw.shop      || {}; // ショップの品揃えと値段
    this.recipes   = raw.recipes   || {}; // 工房で作れるもの
    this.blessings = raw.blessings || {}; // 階を降りるたびに選ぶ加護
    this.patchnotes = raw.patchnotes || {}; // 更新履歴（タイトル画面で表示）
    this.home      = raw.home      || {}; // 拠点メニューの項目
    this.player    = raw.player    || {}; // プレイヤーの初期状態
    this.save      = raw.save      || {}; // セーブの設定
    this.keys      = raw.keys      || {}; // キー割り当て
    this.settings  = raw.settings  || {}; // プレイヤー設定の定義
    this.ui        = raw.ui        || {}; // UIの配置・配色
    this.messages  = raw.messages  || {}; // 表示文言
    this.enemies   = raw.enemies   || {};
    this.bosses    = raw.bosses    || {};
    this.dungeon   = raw.dungeon   || {}; // タイル定義とマップ生成の既定
    this.dungeonThemes = raw.dungeonThemes || {}; // ダンジョンごとの色と床の飾り
    this.features  = raw.features  || {}; // 仕掛けマス（宝箱・泉・罠）の定義
    this.dungeons  = raw.dungeons  || {}; // 挑めるダンジョンの一覧
    this.sprites   = raw.sprites   || {};
    this.motions   = raw.motions   || {}; // 絵の動かし方（浮く・呼吸する など）
    this.motionDefaults = raw.motionDefaults || {}; // 場面ごとの動きの既定（全種族共通）
    this.effects   = raw.effects   || {}; // 技を当てたときの演出の型
  }

  // --- アクセサ（存在しない id は null を返す） ---
  GameData.prototype.getMonsterData = function (id) { return this.monsters[id] || null; };
  GameData.prototype.getSkill       = function (id) { return this.skills[id]   || null; };
  GameData.prototype.getStatus      = function (id) { return this.statuses[id] || null; };
  GameData.prototype.getItem        = function (id) { return this.items[id]    || null; };
  GameData.prototype.getAbility     = function (id) { return this.abilities[id]|| null; };
  GameData.prototype.getNature      = function (id) { return this.natures[id]  || null; };
  GameData.prototype.getElement     = function (id) { return this.elements[id] || null; };
  GameData.prototype.getBoss        = function (id) { return this.bosses[id]   || null; };
  GameData.prototype.getSprite      = function (id) { return this.sprites[id]  || null; };

  NS.GameData = GameData;
})(window.MyGame);
