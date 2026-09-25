/**
 * StorySystem.js
 * どの物語の場面をもう見たかを覚えておき、まだ見ていないものを渡す。
 *
 * 場面の中身は data/story.js が持つ。ここは「流す・流さない」の判断だけ。
 * 画面は js/scenes/StoryScene.js、流す場所は各シーン（Game.playStory から）。
 *
 * ★ 作りは TutorialSystem と同じ。違うのは、設定で止められないこと
 *   （物語は飛ばせるが、出す・出さないの切り替えは持たない）。
 *
 * ▼ 見た記録はセーブに含まれる
 * ▼ 古いセーブ（記録が無い）を読んだ場合は、全部もう見た扱い（Game.applyLoadedState）
 */
(function (NS) {
  "use strict";

  /** @param {MyGame.GameData} gameData */
  function StorySystem(gameData) {
    this.data = gameData;
    this.config = gameData.story || {};
    this.seen = {};   // { id: true }
  }

  /**
   * その場面で流す物語を1つ取り出す（取り出した時点で「見た」印をつける）。
   *
   * 1つだけ返すのは、場面を流し終えてから次の画面へ移るため。
   * 同じ trigger に2つ以上あるときは、order の小さいものから1回に1つずつ
   * （流し終えた StoryScene が、続きを探しにまたここへ来る）。
   *
   * @param {string} trigger data/story.js の trigger
   * @param {MyGame.Game} [game] 条件（when）を確かめるのに使う
   * @returns {object|null}
   */
  StorySystem.prototype.take = function (trigger, game) {
    var scenes = this.config.scenes || {};
    var found = null;

    for (var id in scenes) {
      var scene = scenes[id];
      if (scene.trigger !== trigger || this.seen[scene.id]) continue;
      if (!this.isConditionMet(scene.when, game)) continue;
      if (!found || (scene.order || 999) < (found.order || 999)) found = scene;
    }

    if (found) this.seen[found.id] = true;
    return found;
  };

  /**
   * 流す条件（data/story.js の when）。書いていなければいつでも流れる。
   *   cleared : そのダンジョンをクリアしている
   *   event   : その一度きりの出来事（data/dungeons.js の events）を済ませている
   *   result  : event の戦いの結果がこれ（"win" / "lose" / "flee" / "scouted"。配列で複数も可）。
   *             null を入れると「結果が残っていない」（結果を残す前のセーブ）も含む
   *   caught  : その種族を仲間にしたことがある（図鑑の「仲間にした」）
   *   seenAny : 並べた場面のどれかをもう見た
   *   notSeen : 並べた場面をどれもまだ見ていない
   * 2つ以上書いたら、全部を満たしたときだけ
   */
  StorySystem.prototype.isConditionMet = function (when, game) {
    if (!when) return true;
    if (!game) return false;
    if (when.cleared && !game.isDungeonCleared(when.cleared)) return false;
    if (when.event && !game.isEventDone(when.event)) return false;
    if (when.result !== undefined) {
      if (asList(when.result).indexOf(game.getEventResult(when.event)) < 0) return false;
    }
    if (when.caught) {
      if (!game.discovery || !game.discovery.isMonsterCaught(when.caught)) return false;
    }
    if (when.seenAny) {
      var any = false;
      var ids = asList(when.seenAny);
      for (var i = 0; i < ids.length; i++) if (this.seen[ids[i]]) any = true;
      if (!any) return false;
    }
    if (when.notSeen) {
      var not = asList(when.notSeen);
      for (var j = 0; j < not.length; j++) if (this.seen[not[j]]) return false;
    }
    return true;
  };

  /**
   * 見た印を付ける。場面の途中のページが、別の場面の代わりを務めたときに使う
   * （初めての全滅がヨミリュウ戦だったとき、場面8のページを場面4に差し込む など）
   */
  StorySystem.prototype.markSeen = function (id) {
    if (id) this.seen[id] = true;
  };

  function asList(value) {
    return (Object.prototype.toString.call(value) === "[object Array]") ? value : [value];
  }

  /** 全部もう見たことにする（古いセーブを読んだとき） */
  StorySystem.prototype.markAllSeen = function () {
    var scenes = this.config.scenes || {};
    for (var id in scenes) this.seen[scenes[id].id] = true;
  };

  StorySystem.prototype.hasSeen = function (id) {
    return !!this.seen[id];
  };

  // --- セーブ ---

  StorySystem.prototype.toSaveData = function () {
    return { seen: Object.keys(this.seen) };
  };

  /**
   * 保存データから戻す。
   * @param {object|null} saved
   * @param {boolean} allSeenWhenMissing saved が無いとき全部見た扱いにするか。
   *   古いセーブを読んだときは true。新しく始めたときは false
   */
  StorySystem.prototype.loadSaveData = function (saved, allSeenWhenMissing) {
    this.seen = {};

    if (!saved || !saved.seen) {
      if (allSeenWhenMissing) this.markAllSeen();
      return;
    }
    for (var i = 0; i < saved.seen.length; i++) this.seen[saved.seen[i]] = true;
  };

  NS.StorySystem = StorySystem;
})(window.MyGame);
