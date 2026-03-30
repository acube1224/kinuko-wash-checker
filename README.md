# 長襦袢セルフ判定アプリ

> 「日々、絹子さん。」ブランドの長襦袢専用セルフチェックツール

---

## 🔗 アクセス情報

| 項目 | URL |
|---|---|
| **本番URL（最新）** | https://kinuko-wash-checker.pages.dev/ |
| **GitHub リポジトリ** | https://github.com/acube1224/kinuko-wash-checker |
| **Cloudflare Pages 管理** | https://dash.cloudflare.com/ → Pages → kinuko-wash-checker |

---

## 📦 バージョン履歴

| バージョン | タグ | 主な内容 |
|---|---|---|
| **Ver 1.1**（現行） | `v1.1` | 素材推定フロー・仕立て選択肢拡充・各種バグ修正 |
| Ver 0.2 | `v0.2` | スタイル調整・ボタン色追加 |
| Ver 0.1 | `v0.1` | 初期リリース |

過去バージョンの復元：
```
git checkout v0.2   # Ver 0.2 に戻す場合
git checkout v1.1   # Ver 1.1（最新安定版）
```

---

## 🖼️ WordPress への iframe 埋め込み

### 埋め込みコード（HTMLブロックにそのまま貼る）

```html
<!-- 長襦袢セルフ判定 埋め込みコード Ver 1.1 -->
<iframe
  id="kinuko-iframe"
  src="https://kinuko-wash-checker.pages.dev/"
  width="100%"
  height="800"
  style="border:none; width:100%; display:block;"
  scrolling="no"
  title="長襦袢セルフ判定"
></iframe>

<script>
window.addEventListener('message', function(e) {
  // iframeの高さを自動調整
  if (e.data && e.data.type === 'kinuko-resize') {
    var iframe = document.getElementById('kinuko-iframe');
    if (iframe) {
      iframe.style.height = (e.data.height + 20) + 'px';
    }
  }
  // 画面遷移時にページ最上部へスクロール
  if (e.data && e.data.type === 'kinuko-scroll-top') {
    var iframe = document.getElementById('kinuko-iframe');
    if (iframe) {
      iframe.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }
});
</script>
```

### 手順
1. WordPressの固定ページを編集
2. **「カスタムHTML」ブロック**を追加
3. 上記コードをそのまま貼り付け
4. 「更新」して確認

### レスポンシブ対応
| 端末 | 表示幅 | 動作 |
|---|---|---|
| スマホ | ~480px | 全幅・シンプルレイアウト |
| タブレット | 481~768px | カード風・余白あり |
| PC | 769px~ | 最大幅600px・中央寄せ |

### テーマ干渉が起きる場合
```html
style="border:none; width:100% !important; display:block;"
```
のように `!important` を追加してください。

---

## 📋 アプリ概要

長襦袢を自宅で洗ってよいかどうかを、質問に答えることで3段階で判定するセルフチェックWebアプリです。

### 画面構成
1. **トップ画面** - サービス紹介・診断開始
2. **案内画面** - 診断前の説明
3. **質問画面** - 1画面1問・進捗バー付き
4. **ローディング画面** - 判定演出
5. **判定結果画面** - 3段階バッジ・理由チップ・行動ボタン
6. **判定理由の詳細画面** - 回答ごとの影響をリスト表示
7. **洗う前の注意点画面** - 注意チェックリスト
8. **次の行動画面** - 相談・商品導線・再診断

### 質問フロー（Ver 1.1）

```
Q1 素材選択
├─ 正絹       → Q2s 正絹の生地種類
│               ├─ 縮緬/綸子/絽など → Q3 仕立て → ...
│               └─ わからない       → Q2 生地の特徴 → Q3 仕立て → ...
├─ 混紡・綿・麻・ウール → Q2 生地の特徴 → Q3 仕立て → ...
├─ 化繊       → 即 A判定
└─ わからない → 素材推定4問（光沢・手触り・シワ・音）
                → 推定結果確認画面（はい/いいえ）
                  ├─ 正絹寄り → Q2s へ
                  ├─ 化繊寄り → 即 A判定
                  └─ 混紡寄り → Q2 へ
```

### 判定ロジック

**スコア閾値**
- A判定（洗える候補）: スコア ≦ 2
- B判定（慎重に検討）: スコア 3〜7
- C判定（自宅洗い非推奨）: スコア ≧ 8

**強制ルール**
| 条件 | 判定 |
|---|---|
| 素材：化繊 | 即 A |
| 正絹生地：縮緬 | 即 C |
| 正絹以外の生地特徴：ちりめん凹凸 | 即 C |
| 過去に生地が裂けた | 即 C |
| 過去に大きく縮んだ / 色にじみ | 最低 B |
| 繊細な加工あり | 最低 B |

---

## 🗂️ ファイル構成

```
wash-checker/
├── index.html        メインHTML
├── css/
│   └── style.css     スタイルシート（和色・スマホファースト）
├── js/
│   ├── data.js       質問データ・理由チップ・詳細注記
│   ├── logic.js      判定ロジック・結果コンテンツ定義
│   ├── ui.js         各画面のHTML描画関数
│   └── main.js       状態管理・画面遷移コントローラー
└── README.md
```

---

## 🎨 デザイン仕様

| 項目 | 内容 |
|---|---|
| 配色 | 生成り・灰桜・藍鼠・深緑（萌黄）・臙脂・金茶 |
| フォント | Noto Serif JP（見出し）/ Noto Sans JP（本文） |
| レイアウト | スマホファースト・max-width 480px |
| A判定色 | 緑系 `#4a7c6f` |
| B判定色 | 金茶系 `#a0764b` |
| C判定色 | 臙脂系 `#8b3a3a` |

---

## 🚀 今後の推奨開発ステップ

1. 相談フォームの接続（C判定ユーザーを専門家相談へ誘導）
2. 商品導線の強化（A判定に「洗う絹子さん」購入ページリンク追加）
3. 判定ログの収集（回答データ蓄積→精度改善）
4. SNSシェア機能（「洗える候補でした！」等）
5. 正規取扱店一覧との連携（C判定ユーザーを近隣呉服店へ誘導）

---

## 📌 参考情報

- 商品「洗う絹子さん」: 正絹対応・ちりめんNG・無香料・無着色・柔軟剤フリー
- ブランド: 日々、絹子さん。（着物愛好家向け和装ケアブランド）
- 主なユーザー層: 45歳以上女性・スマホユーザー中心
