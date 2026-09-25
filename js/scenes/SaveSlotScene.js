/**
 * SaveSlotScene.js
 * セーブファイル（スロット）を選ぶ画面。
 *
 * 「新しく始める」と「続きから」の両方がここを通る。
 * 見た目は同じで、選べる相手と選んだあとの動きだけが違う。
 *
 * ▼ mode
 *   "new"      … 新しく始める。**空きでも埋まっていても選べる**。
 *                埋まっているスロットを選んだときは「上書きします」と出す
 *   "continue" … 続きから。**中身のあるスロットしか選べない**。
 *                中断データのあるファイルは、そちら（新しいほう）から再開する
 *   "save"     … 拠点のセーブ。書き込む先を選ぶ。どれでも選べる。
 *                いま遊んでいるファイルが最初に選ばれ、別の中身入りを選ぶと上書きの文になる
 *   "resume"   … 中断したところから。**中断データのあるスロットしか選べない**
 *
 * ▼ 選んだあとは必ず「はい / いいえ」を挟む
 *   上書きも読み込みも取り返しがつかないため。
 *   既定は「いいえ」に置いてある（誤って決定を連打しても消えない）。
 *
 * 配置は data/ui.js の saveSlot、文言は data/messages.js の saveSlot。
 */
(function (NS) {
  "use strict";

  /**
   * @param {MyGame.Game} game
   * @param {object} returnScene 戻り先（タイトル）
   * @param {string} mode "new" | "continue"
   */
  function SaveSlotScene(game, returnScene, mode) {
    this.game = game;
    this.returnScene = returnScene;
    this.mode = (["continue", "save", "resume"].indexOf(mode) >= 0) ? mode : "new";
    // セーブしたあと、少し見せてから戻るための残り時間（ms）
    this._returnTimer = 0;

    var ui = game.data.ui || {};
    this.theme = ui.theme || {};
    this.layout = ui.saveSlot || {};
    this.texts = (game.data.messages || {}).saveSlot || {};
    this.saveTexts = (game.data.messages || {}).save || {};

    this.panel = new NS.Panel(game.ctx, this.theme);
    this.sprites = new NS.SpriteRenderer(game.ctx, game.assets);
    this.renderer = new NS.Renderer(game.ctx);
    this.backButton = new NS.BackButton(this.panel, game.data);
    this.confirmMenu = new NS.CommandMenu(this.panel, (this.layout.confirm || {}).menu);
    this.notice = new NS.Notice(this.theme.notice);

    this.saveManager = new NS.SaveManager(game.data);
    this.slots = this.saveManager.peekAll();

    /**
     * 整理（コピー・移動・削除）のときに使う小さなメニュー。
     * 一覧の上に重ねて出す。
     */
    this.actionMenu = new NS.CommandMenu(this.panel, (this.layout.action || {}).menu);

    // 整理モードの出入り口。キー（Q/E）だけだとマウスの人が入れない
    this.manageButton = new NS.TextButton(
      this.panel, this.layout.manageButton, this.texts.manageButton || "整理");

    /**
     * phase
     *   "list"    … スロットを選ぶ
     *   "action"  … そのファイルに何をするか選ぶ（整理モードのみ）
     *   "pick"    … コピー／移動の行き先を選ぶ
     *   "confirm" … はい／いいえ
     */
    this.phase = "list";
    this.index = this._firstSelectable();
    // 拠点のセーブは、いま遊んでいるファイルから始める（そこに書くのがふつう）
    if (this.mode === "save") this.index = Math.max(0, game.getSaveSlot() - 1);

    // 整理モードかどうか。続きからの一覧からだけ入れる
    this.managing = false;
    this.pending = null;   // { action, from } 整理の途中で覚えておくもの

    this.confirmMenu.setItems([
      { label: this.texts.no  || "いいえ", value: "no" },
      { label: this.texts.yes || "はい",   value: "yes" }
    ]);
  }

  /** 整理モードに入れるか（続きから の一覧で、中身が1つ以上あるとき） */
  SaveSlotScene.prototype._canManage = function () {
    if (this.mode !== "continue") return false;

    for (var i = 0; i < this.slots.length; i++) {
      if (this.slots[i].exists) return true;
    }
    return false;
  };

  SaveSlotScene.prototype.enter = function () {
    // 戻ってきたときに中身が変わっている場合があるので読み直す
    this.slots = this.saveManager.peekAll();
    this.phase = "list";
  };

  /** 選べる最初のスロット（続きからで全部空なら -1） */
  SaveSlotScene.prototype._firstSelectable = function () {
    for (var i = 0; i < this.slots.length; i++) {
      if (this._canSelect(this.slots[i])) return i;
    }
    return -1;
  };

  /**
   * そのスロットを選べるか。
   * 新規はどれでも選べる。続きからは、中身があって壊れていないものだけ。
   */
  SaveSlotScene.prototype._canSelect = function (slot) {
    if (!slot) return false;

    // ★ 行き先を選んでいる最中の判定を先に置くこと。
    //   整理モードの判定（中身のあるものだけ）を先に見てしまうと、
    //   空きスロットへコピー・移動できなくなる
    if (this.phase === "pick") return true;

    // 整理モードでは、読めないファイルも選べる（消す・移すのは中身を読まなくてできる）
    if (this.managing) return !!slot.exists;

    if (this.mode === "new" || this.mode === "save") return true;
    if (this.mode === "resume") return !!slot.suspended;
    return slot.exists && !slot.broken;
  };

  // --- 更新 ---

  SaveSlotScene.prototype.update = function (dt) {
    this.notice.update(dt);

    // セーブし終えたあと。知らせを見せてから戻る（その間は操作を受けない）
    if (this._returnTimer > 0) {
      this._returnTimer -= dt;
      if (this._returnTimer <= 0) this.game.scenes.change(this.returnScene);
      return;
    }

    if (this.phase === "confirm") this._updateConfirm();
    else if (this.phase === "action") this._updateAction();
    else this._updateList();
  };

  SaveSlotScene.prototype._updateList = function () {
    var input = this.game.input;

    if (this.backButton.handleInput(input) || input.isPressed("cancel")) {
      this._cancelList();
      return;
    }

    // 整理モードの出入り。続きからの一覧でだけ使える
    var wantsToggle = input.isPressed("prevTab") || input.isPressed("nextTab");
    if (this.phase === "list" && (this.managing || this._canManage())) {
      if (this.manageButton.handleInput(input)) wantsToggle = true;
    }
    if (wantsToggle) {
      this._toggleManaging();
      return;
    }

    if (input.isPressed("up")) this._move(-1);
    if (input.isPressed("down")) this._move(1);

    var hovered = this._hoveredIndex(input);
    if (hovered >= 0 && hovered !== this.index) this.index = hovered;

    var clicked = (hovered >= 0) && this._pointerClicked(input);
    if (input.isPressed("confirm") || clicked) this._requestSlot();
  };

  /** 一覧で取り消しを押したとき。段階をひとつ戻す */
  SaveSlotScene.prototype._cancelList = function () {
    // 行き先を選んでいる途中なら、何をするかの選択へ戻す
    if (this.phase === "pick") {
      this.phase = "action";
      return;
    }
    if (this.managing) {
      this._toggleManaging();
      return;
    }
    this.game.scenes.change(this.returnScene);
  };

  SaveSlotScene.prototype._toggleManaging = function () {
    if (!this.managing && !this._canManage()) return;

    this.managing = !this.managing;
    this.pending = null;
    this.phase = "list";
    this.index = this._firstSelectable();
  };

  /** 整理モードで、そのファイルに何をするか選ぶ */
  SaveSlotScene.prototype._updateAction = function () {
    var result = this.actionMenu.handleInput(this.game.input);
    if (!result) return;

    if (result.type === "cancel" || result.value === "back") {
      this.phase = "list";
      return;
    }
    if (result.type !== "confirm") return;

    this.pending = { action: result.value, from: this.slots[this.index].slot };

    if (result.value === "delete") {
      this.confirmMenu.index = 0;
      this.phase = "confirm";
      return;
    }

    // コピー・移動は行き先を選んでもらう
    this.phase = "pick";
    this.index = 0;
  };

  /** 次に選べるスロットへ動かす（選べないものは飛ばす） */
  SaveSlotScene.prototype._move = function (direction) {
    var count = this.slots.length;
    if (count === 0 || this.index < 0) return;

    for (var step = 0; step < count; step++) {
      var next = (this.index + direction * (step + 1) + count * (step + 1)) % count;
      if (this._canSelect(this.slots[next])) {
        this.index = next;
        return;
      }
    }
  };

  SaveSlotScene.prototype._pointerClicked = function (input) {
    if (!input.getPointer) return false;
    return !!input.getPointer().clicked;
  };

  /** マウスが乗っているスロット（選べるものだけ。無ければ -1） */
  SaveSlotScene.prototype._hoveredIndex = function (input) {
    if (!input.getPointer) return -1;

    var pointer = input.getPointer();
    if (!pointer.inside) return -1;
    if (!pointer.moved && !pointer.clicked) return -1;

    for (var i = 0; i < this.slots.length; i++) {
      if (!this._canSelect(this.slots[i])) continue;
      if (NS.Panel.containsPoint(this._rowRect(i), pointer)) return i;
    }
    return -1;
  };

  /** 選んだスロットについて「はい／いいえ」を聞く */
  SaveSlotScene.prototype._requestSlot = function () {
    var slot = this.slots[this.index];
    if (!slot) return;

    if (!this._canSelect(slot)) {
      this._showNotice(slot.broken ? (this.texts.brokenNote || "") : (this.texts.emptyNote || ""));
      this.game.playError();
      return;
    }

    // 行き先を選んでいる途中：同じファイルは選べない
    if (this.phase === "pick") {
      if (slot.slot === this.pending.from) {
        this._showNotice(this.texts.sameSlotNote || "");
        this.game.playError();
        return;
      }
      this.pending.to = slot.slot;
      this.confirmMenu.index = 0;
      this.phase = "confirm";
      return;
    }

    // 整理モード：何をするかを聞く
    if (this.managing) {
      this._openActionMenu();
      return;
    }

    this.confirmMenu.index = 0;   // 既定は「いいえ」
    this.phase = "confirm";
  };

  SaveSlotScene.prototype._openActionMenu = function () {
    this.actionMenu.setItems([
      { label: this.texts.actionCopy   || "コピーする", value: "copy" },
      { label: this.texts.actionMove   || "移動する",   value: "move" },
      { label: this.texts.actionDelete || "削除する",   value: "delete" },
      { label: this.texts.actionBack   || "やめる",     value: "back" }
    ]);
    this.actionMenu.index = 0;
    this.phase = "action";
  };

  SaveSlotScene.prototype._updateConfirm = function () {
    var result = this.confirmMenu.handleInput(this.game.input);
    if (!result) return;

    if (result.type === "cancel" || result.value === "no") {
      // 整理の途中なら、ひとつ前の段階へ戻す
      this.phase = this.pending
        ? (this.pending.action === "delete" ? "action" : "pick")
        : "list";
      return;
    }
    if (result.value !== "yes") return;

    if (this.pending) { this._runManageAction(); return; }
    if (this.mode === "new") this._startNewGame();
    else if (this.mode === "save") this._saveHere();
    else if (this.mode === "resume") this._resumeGame();
    else this._continueGame();
  };

  /**
   * 拠点のセーブ。選んだスロットへ書き、以後のセーブもそこへ向ける。
   * 書けたら音を鳴らし、知らせを見せてから拠点へ戻る。
   */
  SaveSlotScene.prototype._saveHere = function () {
    var game = this.game;
    var slot = this.slots[this.index].slot;

    game.setSaveSlot(slot);
    var result = game.saveProgress();
    this._showNotice(this.saveTexts[result.reason] || result.reason);

    this.phase = "list";

    if (!result.success) { this.slots = this.saveManager.peekAll(); game.playError(); return; }

    // 拠点で書いたら、そのファイルに残っていた古い中断は意味を失う
    // （新しく始め直したときの、前の冒険の中断など）
    this.saveManager.clearSuspend(slot);
    this.slots = this.saveManager.peekAll();
    game.audio.playSe("save");
    this._returnTimer = (this.layout.returnDelay === undefined) ? 900 : this.layout.returnDelay;
  };

  /** 中断したところから再開する */
  SaveSlotScene.prototype._resumeGame = function () {
    var slot = this.slots[this.index].slot;
    var result = this.game.resumeSuspended(slot);

    if (!result.success) {
      this._showNotice(this.saveTexts[result.reason] || result.reason);
      this.game.playError();
      this.phase = "list";
      this.slots = this.saveManager.peekAll();
    }
  };

  /** コピー・移動・削除を実際に行う */
  SaveSlotScene.prototype._runManageAction = function () {
    var p = this.pending;
    var result;

    if (p.action === "delete") result = this.saveManager.clear(p.from)
      ? { success: true, reason: "deleted" } : { success: false, reason: "error" };
    else if (p.action === "copy") result = this.saveManager.copySlot(p.from, p.to);
    else result = this.saveManager.moveSlot(p.from, p.to);

    this._showNotice(this.texts[result.reason] || result.reason);
    if (!result.success) this.game.playError();

    // 中身が変わったので読み直す。選び位置も入れ直す
    this.slots = this.saveManager.peekAll();
    this.pending = null;
    this.phase = "list";

    // 全部空になったら整理モードから出る（何もできることが無いため）
    if (!this._canManage()) this.managing = false;
    this.index = this._firstSelectable();
  };

  /**
   * そのスロットで新しく始める。
   *
   * ★ ここでは**まだ書き込まない**。
   *   書き込むのは拠点のセーブか、初クリアの自動セーブ。
   *   選んだ時点で消してしまうと、「間違えた」と思って
   *   タイトルへ戻ったときには手遅れになる。
   */
  SaveSlotScene.prototype._startNewGame = function () {
    var game = this.game;

    game.setSaveSlot(this.slots[this.index].slot);

    game.party = null;
    game.storage = null;
    game.inventory = null;
    game.gold = null;
    game.discovery = null;
    game.clearedDungeons = null;
    game.boughtBlessings = null;
    game.offBlessings = null;
    game.run = null;
    // 合計プレイ時間も0から数え直す（前の周回・前のファイルのぶんを持ち越さない）
    game.playTime = 0;
    // 名前と色も前の周回のものを持ち越さない（この画面で決め直す）
    game.playerName = null;
    game.playerColor = null;
    game.playerGender = null;
    game.playerFirstPerson = null;
    game.doneEvents = {};
    // 説明も最初から出す（前の周回で見た記録を持ち越さない）
    game.tutorial.loadSaveData(null, false);
    game.story.loadSaveData(null, false);
    // 設定も既定値から（別のファイルで「チュートリアルを出さない」にしていても、ここでは出す）
    game.resetFileSettings();

    // 拠点へ行く前に、名前と服の色を決めてもらう
    game.scenes.change(new NS.PlayerSetupScene(game, this, "new"));
  };

  /**
   * そのスロットから再開する。
   * 中断したところがあるファイルは、そちらのほうが新しいので中断から再開する。
   */
  SaveSlotScene.prototype._continueGame = function () {
    var game = this.game;
    var slot = this.slots[this.index];

    if (slot.suspended) {
      this._resumeGame();
      return;
    }

    this.saveManager.setSlot(slot.slot);
    var result = this.saveManager.load();

    if (!result.success) {
      this._showNotice(this.saveTexts[result.reason] || result.reason);
      game.playError();
      this.phase = "list";
      this.slots = this.saveManager.peekAll();
      return;
    }

    // これ以降のセーブは、読み込んだのと同じファイルへ書く
    game.setSaveSlot(slot.slot);
    game.applyLoadedState(result.state);
    game.loadFileSettings();
    // 見る前に閉じた物語（主を倒した直後にやめた など）があれば、ここで流す
    game.playStory("homeReturn", new NS.HomeScene(game));
  };

  SaveSlotScene.prototype._showNotice = function (text) {
    this.notice.show(text, 1800);
  };

  // --- 描画 ---

  /** スロット1つぶんの枠 */
  SaveSlotScene.prototype._rowRect = function (index) {
    var row = this.layout.row || { x: 110, y: 140, w: 580, h: 96, gap: 14 };
    return {
      x: row.x,
      y: row.y + (row.h + (row.gap || 0)) * index,
      w: row.w,
      h: row.h
    };
  };

  SaveSlotScene.prototype.render = function (ctx) {
    var L = this.layout;

    this.renderer.clear(L.background || "#0a0f1c",
      this.game.canvas.width, this.game.canvas.height);

    var title = L.title || {};
    var subtitle = L.subtitle || {};
    var heading, lead;
    if (this.phase === "pick") {
      // 行き先を選んでいる最中は、何をしているかを見出しに出す
      heading = (this.pending.action === "copy")
        ? this.texts.titleCopyTo : this.texts.titleMoveTo;
      lead = (this.texts.subtitlePick || "").replace("{n}", this.pending.from);
    } else if (this.managing) {
      heading = this.texts.titleManage;
      lead = this.texts.subtitleManage;
    } else if (this.mode === "new") {
      heading = this.texts.titleNew;
      lead = this.texts.subtitleNew;
    } else if (this.mode === "save") {
      heading = this.texts.titleSave;
      lead = (this.texts.subtitleSave || "").replace("{n}", this.game.getSaveSlot());
    } else if (this.mode === "resume") {
      heading = this.texts.titleResume;
      lead = this.texts.subtitleResume;
    } else {
      heading = this.texts.titleContinue;
      lead = this.texts.subtitleContinue;
    }

    this.panel.drawText(heading || "", title.x, title.y,
      { font: title.font, color: title.color });
    this.panel.drawText(lead || "", subtitle.x, subtitle.y,
      { font: subtitle.font, color: subtitle.color });

    for (var i = 0; i < this.slots.length; i++) this._renderSlot(i);

    this._renderNotice(ctx);
    this._renderHint();
    this.backButton.render();

    // 整理に入れるとき（と、整理中）だけボタンを出す
    if (this.phase === "list" && (this.managing || this._canManage())) {
      this.manageButton.label = this.managing
        ? (this.texts.manageButtonExit || "やめる")
        : (this.texts.manageButton || "整理");
      this.manageButton.render();
    }

    if (this.phase === "action") this._renderActionMenu(ctx);
    if (this.phase === "confirm") this._renderConfirm(ctx);
  };

  /** 整理モードで出す「コピー／移動／削除」の小さなメニュー */
  SaveSlotScene.prototype._renderActionMenu = function (ctx) {
    var A = this.layout.action;
    if (!A) return;

    var slot = this.slots[this.index];

    ctx.save();
    ctx.fillStyle = A.background || "#0d1220";
    ctx.fillRect(A.box.x, A.box.y, A.box.w, A.box.h);
    ctx.restore();
    this.panel.drawBox(A.box);

    this.panel.drawText(
      (this.texts.actionTitle || "スロット{n} をどうしますか").replace("{n}", slot.slot),
      A.title.x, A.title.y, { align: "center", color: this.theme.cursorColor });

    this.actionMenu.render(this.game.clock);
  };

  SaveSlotScene.prototype._renderSlot = function (index) {
    var t = this.theme;
    var L = this.layout;
    var slot = this.slots[index];
    var rect = this._rowRect(index);
    var selectable = this._canSelect(slot);
    // 行き先を選んでいるあいだも、どれを指しているかは見せる
    var selected = (index === this.index)
      && (this.phase === "list" || this.phase === "pick");

    this.panel.drawBox(rect);

    var origin = this.panel.innerOrigin(rect);
    var pad = L.textPadding || 8;
    var lh = L.lineHeight || 20;
    var x = origin.x + pad;
    var y = origin.y + lh;

    // 選択中は枠を光らせる。選べないスロットは全体を暗くする
    if (selected) {
      var ctx = this.panel.ctx;
      ctx.save();
      ctx.strokeStyle = t.cursorColor || "#ffd75e";
      ctx.lineWidth = 2;
      ctx.strokeRect(rect.x + 1, rect.y + 1, rect.w - 2, rect.h - 2);
      ctx.restore();
    }

    var nameColor = selected ? t.cursorColor : (selectable ? t.textColor : t.hintColor);
    var bodyColor = selectable ? t.subTextColor : t.hintColor;

    // 左：スロット番号と絵
    var icon = L.icon || {};
    if (icon.size && this.game.assets) {
      this.sprites.draw(L.iconName || "iconSave", x, rect.y + (icon.offsetY || 20),
        icon.size, icon.size);
    }
    var labelX = x + (icon.size ? icon.size + 10 : 0);

    this.panel.drawText(
      (this.texts.slotLabel || "スロット{n}").replace("{n}", slot.slot),
      labelX, y, { color: nameColor });

    // 名前と同じ行の右端に、そのファイルの合計プレイ時間
    if (slot.exists && !slot.broken) {
      this.panel.drawText(this._playTimeText(slot.playTime),
        rect.x + rect.w - pad, y,
        { align: "right", font: t.smallFont, color: t.hintColor });
    }

    // 右：中身
    if (!slot.exists) {
      // 本体は無いが中断だけある（拠点で一度もセーブせずに中断した）ときは、その場所を出す
      if (slot.suspended && slot.suspended.name) {
        this.panel.drawText(
          (this.texts.suspended || "中断中: {name} B{floor}F")
            .replace("{name}", slot.suspended.name).replace("{floor}", slot.suspended.floor),
          labelX, y + lh, { font: t.smallFont, color: selectable ? (t.cursorColor || "#ffd75e") : t.hintColor });
        return;
      }
      this.panel.drawText(this.texts.empty || "空き", labelX, y + lh,
        { font: t.smallFont, color: t.hintColor });
      return;
    }
    if (slot.broken) {
      this.panel.drawText(this.texts.broken || "読み込めません", labelX, y + lh,
        { font: t.smallFont, color: t.dangerColor || "#e8542a" });
      return;
    }

    var line1 = (this.texts.party || "{name} Lv{level}  ほか{rest}体")
      .replace("{name}", slot.leadName)
      .replace("{level}", slot.level)
      .replace("{rest}", Math.max(0, slot.partyCount - 1));

    var line2 = (this.texts.status || "{gold}G   クリア {cleared}")
      .replace("{gold}", slot.gold)
      .replace("{cleared}", slot.cleared);

    this.panel.drawText(line1, labelX, y + lh, { font: t.smallFont, color: bodyColor });
    this.panel.drawText(line2, labelX, y + lh * 2, { font: t.smallFont, color: bodyColor });

    // 右端：どこで保存したか・いつ保存したか。
    // 中断したところがあれば、そちらを優先して出す（そこから再開するため）
    var right = rect.x + rect.w - pad;
    var place;
    var placeColor = bodyColor;
    if (slot.suspended && slot.suspended.name) {
      place = (this.texts.suspended || "中断中: {name} B{floor}F")
        .replace("{name}", slot.suspended.name).replace("{floor}", slot.suspended.floor);
      placeColor = selectable ? (t.cursorColor || "#ffd75e") : t.hintColor;
    } else if (slot.place && slot.place.name) {
      place = (this.texts.place || "{name} B{floor}F")
        .replace("{name}", slot.place.name).replace("{floor}", slot.place.floor);
    } else {
      place = this.texts.atHome || "拠点";
    }

    this.panel.drawText(place, right, y + lh,
      { align: "right", font: t.smallFont, color: placeColor });
    this.panel.drawText(formatDate(slot.savedAt), right, y + lh * 2,
      { align: "right", font: t.smallFont, color: t.hintColor });
  };

  /** 「はい / いいえ」。上書きになる場合は、そう分かる文にする */
  SaveSlotScene.prototype._renderConfirm = function (ctx) {
    var C = this.layout.confirm;
    if (!C) return;

    var t = this.theme;
    var slot = this.slots[this.index];

    // 後ろを暗く落として、問いかけだけに目が行くようにする
    ctx.save();
    ctx.fillStyle = C.veil || "rgba(4,6,12,0.72)";
    ctx.fillRect(0, 0, this.game.canvas.width, this.game.canvas.height);
    ctx.restore();

    ctx.save();
    ctx.fillStyle = C.background || "#0d1220";
    ctx.fillRect(C.box.x, C.box.y, C.box.w, C.box.h);
    ctx.restore();
    this.panel.drawBox(C.box);

    // 整理の確認は、消えるものがあるかどうかで文と色を変える
    if (this.pending) {
      this._renderManageConfirm(ctx, C, t);
      this.confirmMenu.render(this.game.clock);
      return;
    }

    // 上書きになるのは、新規で中身入りを選んだときと、
    // 拠点のセーブで「いま遊んでいるのとは別の」中身入りを選んだとき
    var overwrite = slot.exists && (
      this.mode === "new" ||
      (this.mode === "save" && slot.slot !== this.game.getSaveSlot()));
    var resuming = (this.mode === "resume") || (this.mode === "continue" && !!slot.suspended);

    var headline = overwrite ? this.texts.confirmOverwrite
                 : (this.mode === "new") ? this.texts.confirmNew
                 : (this.mode === "save") ? this.texts.confirmSave
                 : resuming ? this.texts.confirmResume
                 : this.texts.confirmLoad;

    var note = overwrite ? this.texts.confirmNote
             : resuming ? this.texts.confirmResumeNote
             : "";

    ctx.save();
    ctx.textAlign = "center";

    ctx.font = t.font || "14px monospace";
    ctx.fillStyle = overwrite ? (t.dangerColor || "#e8542a") : (t.cursorColor || "#ffd75e");
    ctx.fillText((headline || "").replace("{n}", slot.slot), C.title.x, C.title.y);

    ctx.fillStyle = t.textColor || "#e8eaf0";
    ctx.font = t.smallFont || "12px monospace";
    ctx.fillText(this._confirmBody(slot, overwrite, resuming), C.body.x, C.body.y);

    ctx.fillStyle = t.hintColor || "#5b6688";
    ctx.fillText(note || "", C.note.x, C.note.y);
    ctx.restore();

    this.confirmMenu.render(this.game.clock);
  };

  /**
   * 整理（コピー・移動・削除）の確認。
   *
   * ★ 消えるものがあるときだけ赤くする。
   *   空きスロットへのコピーは何も失わないので、赤くすると
   *   「危ない操作」の重みが薄れる。
   */
  SaveSlotScene.prototype._renderManageConfirm = function (ctx, C, t) {
    var p = this.pending;
    var target = (p.to !== undefined) ? this._slotByNumber(p.to) : null;
    // 削除は必ず消える。コピー・移動は行き先に中身があるときだけ消える
    var destructive = (p.action === "delete") || (target && target.exists);

    var headline = (p.action === "delete") ? this.texts.confirmDelete
                 : (p.action === "copy") ? this.texts.confirmCopy
                 : this.texts.confirmMove;

    var body = (p.action === "delete")
      ? this.texts.confirmDeleteBody
      : (target && target.exists
          ? this.texts.confirmReplaceBody
          : this.texts.confirmPlainBody);

    ctx.save();
    ctx.textAlign = "center";

    ctx.font = t.font || "14px monospace";
    ctx.fillStyle = destructive ? (t.dangerColor || "#e8542a") : (t.cursorColor || "#ffd75e");
    ctx.fillText(fill(headline || "", p), C.title.x, C.title.y);

    ctx.fillStyle = t.textColor || "#e8eaf0";
    ctx.font = t.smallFont || "12px monospace";
    ctx.fillText(fill(body || "", p, target), C.body.x, C.body.y);

    ctx.fillStyle = t.hintColor || "#5b6688";
    ctx.fillText(destructive ? (this.texts.confirmNote || "") : "", C.note.x, C.note.y);
    ctx.restore();
  };

  SaveSlotScene.prototype._slotByNumber = function (n) {
    for (var i = 0; i < this.slots.length; i++) {
      if (this.slots[i].slot === n) return this.slots[i];
    }
    return null;
  };

  /** {from} {to} {name} {level} を埋める */
  function fill(template, pending, target) {
    var out = String(template)
      .replace("{from}", pending.from)
      .replace("{to}", pending.to);

    if (target) {
      out = out.replace("{name}", target.leadName || "")
               .replace("{level}", target.level || "");
    }
    return out;
  }

  /** 問いかけの2行目。何が起きるかを具体的に書く */
  SaveSlotScene.prototype._confirmBody = function (slot, overwrite, resuming) {
    if (overwrite) {
      return (this.texts.confirmOverwriteBody || "{name} Lv{level} のデータが消えます")
        .replace("{name}", slot.leadName)
        .replace("{level}", slot.level);
    }
    if (this.mode === "new") return this.texts.confirmNewBody || "";
    if (this.mode === "save") return this.texts.confirmSaveBody || "";

    if (resuming && slot.suspended) {
      var place = (this.texts.place || "{name} B{floor}F")
        .replace("{name}", slot.suspended.name).replace("{floor}", slot.suspended.floor);
      return (this.texts.confirmResumeBody || "{place} から再開します").replace("{place}", place);
    }

    return (this.texts.confirmLoadBody || "{name} Lv{level} から再開します")
      .replace("{name}", slot.leadName)
      .replace("{level}", slot.level);
  };

  SaveSlotScene.prototype._renderNotice = function (ctx) {
    if (!this.notice.isActive()) return;

    var pos = this.layout.notice || { x: 400, y: 526 };
    ctx.save();
    ctx.globalAlpha = this.notice.getAlpha();
    this.panel.drawText(this.notice.getText(), pos.x, pos.y,
      { align: "center", color: this.theme.cursorColor });
    ctx.restore();
  };

  SaveSlotScene.prototype._renderHint = function () {
    var hint = this.layout.hint;
    if (!hint) return;

    var text;
    if (this.phase === "confirm") text = this.texts.hintConfirm;
    else if (this.phase === "action") text = this.texts.hintAction;
    else if (this.phase === "pick") text = this.texts.hintPick;
    else if (this.managing) text = this.texts.hintManaging;
    else if (this._canManage()) text = this.texts.hintWithManage;
    else if (this.mode === "save") text = this.texts.hintSave;
    else text = this.texts.hint;

    this.panel.drawText(text, hint.x, hint.y,
      { font: this.theme.smallFont, color: this.theme.hintColor });
  };

  /** 保存日時を「9/07 15:53」の形にする */
  /**
   * 合計プレイ時間の表示。1時間未満は分だけ（「45分」）、それ以上は「3時間45分」。
   * 秒は出さない（一覧で見るのは「どれだけ進めたファイルか」なので、分で足りる）。
   * @param {number} ms
   */
  SaveSlotScene.prototype._playTimeText = function (ms) {
    var total = Math.max(0, Math.floor((ms || 0) / 60000));   // 分
    var hours = Math.floor(total / 60);
    var minutes = total % 60;

    if (hours <= 0) {
      return (this.texts.playTimeMin || "{m}分").replace("{m}", minutes);
    }
    return (this.texts.playTime || "{h}時間{m}分")
      .replace("{h}", hours).replace("{m}", minutes);
  };

  function formatDate(iso) {
    if (!iso) return "";
    var d = new Date(iso);
    if (isNaN(d.getTime())) return "";

    function pad(n) { return (n < 10 ? "0" : "") + n; }
    return (d.getMonth() + 1) + "/" + pad(d.getDate())
      + " " + pad(d.getHours()) + ":" + pad(d.getMinutes());
  }

  NS.SaveSlotScene = SaveSlotScene;
})(window.MyGame);
