/**
 * BattleMessageFormatter.js
 * BattleSystem が返すイベントを、表示用の文字列へ変換する。
 *
 * 文言そのものは data/messages.js のテンプレートを使うため、
 * 文章を変えたいときはデータファイルを編集するだけでよい（このコードは変更不要）。
 */
(function (NS) {
  "use strict";

  /**
   * @param {object} messages data/messages.js の messages
   */
  function BattleMessageFormatter(messages) {
    this.templates = (messages || {}).battle || {};
  }

  /**
   * イベント配列を文字列配列へ変換する。
   * 表示不要なイベントは読み飛ばす。
   * @param {object[]} events
   * @returns {string[]}
   */
  BattleMessageFormatter.prototype.format = function (events) {
    var lines = [];
    for (var i = 0; i < (events || []).length; i++) {
      var line = this.formatOne(events[i]);
      if (line) lines.push(line);
    }
    return lines;
  };

  /**
   * 行動した側の表示名。敵なら「敵の」を付けて味方と区別できるようにする。
   * （味方にも敵にも同じ名前のモンスターが並ぶことがあるため）
   */
  BattleMessageFormatter.prototype._actorName = function (event) {
    return this._decorate(event.actorName, event.side === "enemy");
  };

  /**
   * 対象の表示名。対象は行動した側の反対にいるので、side を反転して判断する。
   */
  BattleMessageFormatter.prototype._targetName = function (event) {
    // targetSide が書かれていればそれに従う。
    // 自分にかける技のように、対象が行動した側と同じこともあるため
    if (event.targetSide) return this._decorate(event.targetName, event.targetSide === "enemy");
    return this._decorate(event.targetName, event.side === "ally");
  };

  BattleMessageFormatter.prototype._decorate = function (name, isEnemy) {
    if (!isEnemy || !name) return name;
    return (this.templates.enemyNamePrefix || "") + name;
  };

  /**
   * イベント1件を文字列へ変換する（対応しないものは null）。
   */
  BattleMessageFormatter.prototype.formatOne = function (event) {
    var t = this.templates;

    switch (event.type) {
      // 呼び出し側が文章を組み立て済みのもの（道具・スカウトなど）
      case "custom":
        return event.text || null;
      case "enterField":
        return fill(t.enterField, { name: event.actorName });
      case "defend":
        return fill(t.defend, { actor: this._actorName(event) });
      case "wait":
        return fill(t.wait, { actor: this._actorName(event) });
      case "useSkill":
        return fill(t.useSkill, { actor: this._actorName(event), skill: event.skillName });
      case "miss":
        return fill(t.miss, { target: this._targetName(event) });
      case "critical":
        return t.critical || null;
      case "effective":
        return t.effective || null;
      case "resisted":
        return t.resisted || null;
      case "immune":
        return fill(t.immune, { target: this._targetName(event) });
      case "damage":
        return fill(t.damage, { target: this._targetName(event), amount: event.amount });
      case "faint":
        return fill(t.faint, { target: this._targetName(event) });
      case "modifier":
        // 技ごとの言い回しがあればそれを使い、無ければ上がり／下がりの既定文
        return fill(event.message ||
                    (event.renewed ? t.modifierAgain
                                   : (event.raised ? t.modifierUp : t.modifierDown)),
                    { target: this._targetName(event), skill: event.skillName });
      case "drain":
        return fill(t.drained, { target: this._targetName(event), amount: event.healAmount });
      case "heal":
        return fill(t.healed, { target: this._targetName(event), amount: event.healAmount });
      case "healFull":
        return fill(t.healFull, { target: this._targetName(event) });
      case "modifierEnd":
        return fill(t.modifierEnd,
                    { target: this._targetName(event), skill: event.skillName });
      case "expGained":
        return fill(t.expGained, { amount: event.amount });
      case "levelUp":
        return fill(t.levelUp, { actor: event.actorName, level: event.toLevel });
      case "skillLearned":
        return fill(t.skillLearned, { actor: event.actorName, skill: event.skillName });
      case "fleeSuccess":
        return t.fleeSuccess || null;
      case "fleeFailed":
        return t.fleeFailed || null;
      case "noSkill":
        return fill(t.noSkill, { actor: event.actorName });
      case "battleEnd":
        if (event.result === "win") return t.win || null;
        if (event.result === "lose") return t.lose || null;
        return null; // 逃走時は fleeSuccess で既に表示済み
      default:
        return null;
    }
  };

  /** テンプレートの {key} を values の値で置き換える */
  function fill(template, values) {
    if (!template) return null;
    return template.replace(/\{(\w+)\}/g, function (match, key) {
      return (values[key] !== undefined) ? values[key] : match;
    });
  }

  NS.BattleMessageFormatter = BattleMessageFormatter;
})(window.MyGame);
