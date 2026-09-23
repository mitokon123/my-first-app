/**
 * shop.js
 * 拠点の店の設定。
 *
 * sellRate : 売値の割合。売値 = items.js の price × sellRate（切り捨て）。全店で共通
 *
 * shops    : 店の一覧。画面上部のタブで切り替える
 *   id         : 識別子
 *   name       : タブと見出しに出す名前
 *   subtitle   : 見出しの下に出す一言
 *   keeper     : 店主の絵（data/sprites_ui.js を参照）。省略すると誰もいない
 *   keeperMotion : 店主の動き（data/motions.js のid）。省略すると動かない
 *   type       : 何を売る店か。省略すると "item"（ふつうの品物）
 *                "blessing" … 加護を売る店。品物は data/blessings.js の
 *                  locked: true が付いたものが自動的に並ぶ（stock は使わない）。
 *                  買った加護は恒久的に残り、売ることはできない
 *   unlockedBy : 店そのものが開く条件。省略すると最初から開いている
 *                書き方は data/dungeons.js の unlockedBy と同じ
 *                （"id" / ["id","id"] / {dungeons,count} / {region,count}）
 *   stock      : 店に並ぶ品物
 *     item       : アイテムid（data/items.js を参照）
 *     price      : 買値。省略すると items.js の price をそのまま使う
 *     unlockedBy : この品だけが後から並ぶ条件。省略すると最初から並ぶ
 *
 * ★ 店を増やすときは shops に1エントリ足すだけでよい。
 *   品揃えを変えるときは、その店の stock を編集するだけ。
 *
 * ▼ 品揃えが増える店・増えない店
 *   よろず屋は品ごとに unlockedBy を書いてあるので、進むほど並ぶ品が増える。
 *   あとから増やす店は、品揃えを固定にしてもよい（品に unlockedBy を書かないだけ）。
 *
 * ▼ 店で買えないもの
 *   苔の外套は工房でしか作れない（data/recipes.js）。
 *   「素材を集めて作る」ことに意味を持たせたいものは、ここに並べない。
 *
 * ▼ 並ぶ順番
 *   stock に書いた順ではなく、画面では次の順に並べ替えて見出しを挟む。
 *     1. 分類（data/categories.js の item.order）… 回復 → 装備 → 素材 → 重要
 *     2. 値段の安い順 … 手が届くものから目に入る
 *     3. ここに書いた順 … 上の2つが同じときだけ
 *   並びを変えたいときは categories.js の order を入れ替えるのが手軽。
 *   売る側も同じ分類の順に並ぶ（持ち物の画面と行き来しても迷わないように）。
 */
(function (NS) {
  "use strict";

  NS.rawData.shop = {
    sellRate: 0.5,

    shops: [
      {
        id: "general",
        name: "よろず屋",
        subtitle: "深き穴のほとりの行商",
        keeper: "keeperGeneral",
        keeperMotion: "breathe",
        unlockedBy: null,
        // 進むほど品が増える店。苔の外套だけは工房でしか手に入らない
        stock: [
          { item: "herb" },
          { item: "potion" },
          // 帰り道の保険。最初から買えるようにして、無理をするかどうかを選ばせる
          { item: "returnStone" },
          { item: "fangCharm" },
          // PPの回復。技を使う戦い方を選べるようにするため、早めに置く
          { item: "spiritBerry", unlockedBy: "mossyMine" },
          { item: "stoneBand", unlockedBy: "mossyMine" },
          { item: "glowLantern", unlockedBy: "mossyMine" },
          // 工房で使う素材。坑道をクリアすると取り扱いが始まる
          { item: "oreShard", unlockedBy: "mossyMine" },
          { item: "glowDust", unlockedBy: "mossyMine" },
          // 亀裂の素材。クリアしてから取り扱いが始まる。
          // 灼熱の牙（主のドロップ）は並べない —— 主を倒すこと自体に意味を残すため
          { item: "emberAsh", unlockedBy: "scorchingFissure" },
          { item: "ashFeather", unlockedBy: "scorchingFissure" },
          { item: "scorchedShell", unlockedBy: "scorchingFissure" },

          // 毒を治す薬。深層をクリアすると取り扱いが始まる。
          //   毒が出てくるのはステージ4からなので、それまで並べても使い道が無い
          { item: "antidote", unlockedBy: "silentDepths" },

          // 深層の素材。クリアしてから取り扱いが始まる。
          // 黄泉竜の鱗（ヨミリュウのドロップ）は並べない —— 竜を狩ること自体に意味を残すため
          { item: "slimeShard", unlockedBy: "silentDepths" },
          { item: "duskDew", unlockedBy: "silentDepths" },
          { item: "twistedVine", unlockedBy: "silentDepths" },
          { item: "stormWing", unlockedBy: "silentDepths" },

          // 大きく回復する薬。毒沼をクリアしてから並ぶ。
          //   毒沼までは回復薬（50G / 50回復）で足りる。
          //   ここで初めて「1ターンで100戻す」選択肢を出す
          { item: "elixir", unlockedBy: "venomMarsh" }
        ]
      },

      // 加護を売る店。品物がアイテムではなく加護なので type: "blessing" を付ける。
      // 何を売るかは data/blessings.js の locked: true / price が決めるので、
      // ここに stock は書かない（加護を増やせば自動的に並ぶ）
      {
        id: "mystic",
        name: "謎の商人",
        subtitle: "深淵の底から来たという",
        keeper: "keeperMystic",
        keeperMotion: "breathe",
        type: "blessing",
        unlockedBy: "silentDepths",
        stock: []
      }

      // ★ 店を増やすときは、ここに1エントリ足すだけでよい。
      //   unlockedBy には data/dungeons.js と同じ書き方が使える
      //   （"id" / ["id","id"] / {dungeons,count} / {region,count}）。
    ]
  };
})(window.MyGame);
