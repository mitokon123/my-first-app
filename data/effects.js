/**
 * effects.js
 * 技を当てたときに出す演出の「型」。
 *
 * ▼ 考え方
 * 技ごとに絵を用意しない。形の型をいくつか用意し、
 * 色は data/elements.js の属性色をそのまま使う。
 * こうすると、同じ「弾ける」が火なら赤く、水なら青く出る。
 * 技が増えても、増えるのは data/skills.js の effect 1行だけ。
 *
 * ▼ 書き方
 * shape    : どんな形で描くか（描き方は js/ui/SkillEffect.js が持つ）
 * duration : 出てから消えるまでの時間（ms）
 * glow     : にじみの強さ。暗い背景で色が沈まないようにする。0で無し
 * hitSe    : この型で当たったときの音（data/audio.js の se のid）。
 *            書かなければ hit（打撃音）。斬る型だけ slash（斬撃音）にしてある。
 *            通常攻撃は種族の attackEffect（data/monsters.js）で型が決まるので、
 *            爪や翼で斬る種族は自然と斬撃音になる
 * 残りの項目は shape ごとに意味が変わる（下のコメントを参照）
 *
 * 色は指定しない。使う技の属性から決まる。
 * どうしても固定したいときだけ color を書く。
 *
 * ★ 型を増やすときは、ここに1エントリ足して
 *   js/ui/SkillEffect.js に描き方を1つ足す（他は変更不要）。
 */
(function (NS) {
  "use strict";

  NS.rawData.effects = {
    // 属性が無いときに使う色（data/elements.js の none と同じ）
    defaultColor: "#9aa4c0",
    // どの型でも中心に置く明るい芯の色
    coreColor: "#ffffff",

    /**
     * 強化・弱体（data/skills.js の modifier）の演出の色。
     *
     * これらの技は属性ではなく「何が変わるか」で色を決める。
     * そのほうが、守りが上がったのか攻撃が上がったのかが目で分かるため。
     * 上がるときも下がるときも同じ色で、向きは名前の横の印（↑↓）で伝える。
     */
    statColors: {
      hp:      "#5fd18c",   // 緑
      attack:  "#e8542a",   // 赤
      defense: "#4fb0d1",   // 青
      speed:   "#7fd9a8",   // 明るい緑
      pp:      "#8b6fd6"    // 紫
    },

    shapes: {
      /**
       * 打つ。中心から輪が広がり、短い線が四方へ散る。
       *   radius … 輪がどこまで広がるか
       *   rays / rayLength … 散る線の本数と長さ
       */
      impact: {
        shape: "impact",
        duration: 420,
        glow: 8,
        radius: 54,
        lineWidth: 4,
        rays: 7,
        rayLength: 26
      },

      /**
       * 斬る。太い筋が斜めに走る。
       *   streaks … 筋の本数（少しずつ遅れて走る）
       *   length / thickness … 筋の長さと太さ
       *   tilt … 傾き（回転数。0.125 で45度）
       */
      slash: {
        shape: "slash",
        hitSe: "slash",
        duration: 460,
        glow: 10,
        streaks: 3,
        length: 108,
        thickness: 9,
        tilt: -0.1,
        spread: 24
      },

      /**
       * 弾ける。中心から粒が放射状に飛ぶ。
       *   count / radius … 粒の数と飛ぶ距離
       */
      burst: {
        shape: "burst",
        duration: 580,
        glow: 12,
        count: 22,
        radius: 66,
        minSize: 4,
        maxSize: 9
      },

      /**
       * 閃光。円が一気に広がって、すぐ消える。
       *   radius … どこまで広がるか
       *   alpha  … いちばん濃いときの薄さ。上げすぎると相手が見えなくなる
       */
      flash: {
        shape: "flash",
        duration: 440,
        glow: 18,
        radius: 76,
        alpha: 0.55
      },

      /**
       * 光芒。閃光の一段上（シャインなど、属性の基本技より強い技に）。
       * 大きく閃いたあと、光の筋が四方へ伸び、輪が外へ抜け、少し遅れてもう一度光る。
       *   radius     … 最初の閃きの大きさ（flash の 76 より大きい）
       *   rays / rayLength / rayWidth … 筋の本数・長さ・太さ（1本おきに短くなる）
       *   ringRadius / ringWidth      … 外へ抜ける輪
       *   alpha      … 閃きの濃さ。flash と同じく上げすぎると相手が見えなくなる
       * ★ さらに上の技を作るときは、この数値を上げるより新しい型を足すほうがよい
       *   （「最終奥義」に見せるための型はまだ無い）
       */
      radiance: {
        shape: "radiance",
        duration: 640,
        glow: 22,
        radius: 96,
        rays: 8,
        rayLength: 126,
        rayWidth: 5,
        ringRadius: 136,
        ringWidth: 4,
        alpha: 0.55
      },

      /**
       * 降りそそぐ。上から粒が落ちてくる。
       *   spread … 左右の広がり   height … どこから落ちてくるか
       */
      rain: {
        shape: "rain",
        duration: 680,
        glow: 10,
        count: 26,
        spread: 56,
        height: 78,
        minSize: 4,
        maxSize: 7
      },

      /**
       * 高まる。輪が足元から立ち上がり、粒がゆっくり昇る。
       * 強化・弱体の技に使う（当てるのではなく「まとう」感じにしてある）。
       *   rings … 立ち上がる輪の数   rise … どこまで昇るか
       */
      aura: {
        shape: "aura",
        duration: 620,
        glow: 12,
        rings: 3,
        radius: 34,
        rise: 46,
        lineWidth: 3,
        count: 10,
        minSize: 3,
        maxSize: 5
      },

      /**
       * 砕ける。粒が横へ飛び、落ちていく。
       *   gravity … 落ちる強さ
       */
      shards: {
        shape: "shards",
        duration: 620,
        glow: 10,
        count: 18,
        radius: 58,
        gravity: 100,
        minSize: 4,
        maxSize: 8
      }
    }
  };
})(window.MyGame);
