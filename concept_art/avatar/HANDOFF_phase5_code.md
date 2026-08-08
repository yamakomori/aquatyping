# きせかえ フェーズ5 申し送り（コード接続・実行者向け）

> アバター描画のドット絵化とデータ接続。作業前に `concept_art/avatar/README.md` と本ファイル、
> `IMPLEMENTATION_NOTES.md` を必ず Read。

| 項目 | 内容 |
|---|---|
| 対応する仕様書 | concept_art/avatar/README.md（カタログ・レイヤー構成の節） |
| 実行担当 | Opus（implementer 役） |
| 前提 | public/avatar/ に body4色＋outfit-cloth 配置済み（他アイテムはフェーズ4で追加） |

---

## 1. 成果物（DoD）

1. **`src/domain/economy.js`**：
   - ITEMS をカタログ21個へ拡張（README の表どおり。既存 id・名前・価格は不変）
   - 各アイテムに `asset` フィールド追加（例 `"/avatar/body-moss.png"`。head-none / hand-none は省略）
   - `color` フィールドは既存アイテムで維持（UIスウォッチ用）。新規 bodyColor（body-night #6f7fa6）にも付与
   - `STARTER_EQUIPPED` に `hand: "hand-none"` を追加、hand-none / head-none を初期所持に含める（既存の無料アイテムの扱いに合わせる）
   - **セーブ互換**：セーブロード／正規化の既存経路を特定し、`equipped.hand` 未定義なら `"hand-none"` を補完。`ownedItemIds` は追加式のため変更不要
2. **`Avatar` コンポーネント刷新**（GameShell.jsx 413-419 付近）：
   - CSS図形 → レイヤー `<img>` スタック（重ね順：body → outfit → head → hand。asset のないスロットは描画しない）
   - `image-rendering: pixelated`、alt は装飾画像として空
   - コンテナに CSS 浮遊アニメ（ゆっくり上下 translateY）。`prefers-reduced-motion` で停止（regions.css の魚アニメの既存流儀に合わせる）
3. **`WardrobeScreen` 刷新**（GameShell.jsx 1091-1110 付近）：
   - 記号プレビュー（★◆●）→ アイテムの asset サムネイル表示（256画像をそのまま縮小表示、pixelated）。asset のないアイテム（〜none）は現行同様のプレースホルダ表示
   - スロット表示名に「もちもの」を追加（現行の「あたま/ふく」区分を4スロット対応に）
   - からだの色は従来どおり色スウォッチ表示でもよい（裁量）
4. **`src/styles/components/avatar.css`** を画像レイヤー方式へ刷新
5. **`src/game/assets/preload.js`** にアバターアセットのプリロード追加（ITEMS の asset を列挙）
6. **`test/domain.test.js`**：hand スロットの購入/装備、旧セーブ（hand なし）補完のテスト追加
7. `npm test` / `npm run build` 成功

## 2. 実装上の注意

- フェーズ4のアセットが未配置の時点で着手する場合、asset パスはカタログどおり先に定義してよい
  （画像404はプリロード警告になるだけで致命ではないが、最終確認はフェーズ4完了後に行う）
- Header の縮小アバター等、Avatar を参照している他の描画箇所があれば同じレイヤー方式に追従させる（要 grep）
- economy.js の購入ロジック `purchase()` 自体は変更しない（スロット追加はデータ駆動で通るはず。通らなければ最小修正）

## 3. エスカレーション条件（止まる基準）

- [ ] セーブ正規化の経路が特定できない／複数箇所に分散していて補完の置き場が不明
- [ ] Avatar 刷新で既存レイアウト（ヘッダー・きせかえ画面）が崩れ、CSS 調整で±の判断に2回迷った
- [ ] purchase/装備ロジックに hand スロットを通すためロジック変更が必要になり、その影響が economy.js の外へ波及する
- [ ] テスト・ビルドが自分の変更起因以外で失敗している

## 4. 裁量範囲（確認不要）

- コンポーネント内部の分割・命名、CSS クラス設計
- サムネイルの表示サイズ・余白（±8px）
- 浮遊アニメの周期（2〜4s）・振幅（2〜4px）
- テストケースの構成

## 5. 判断ログの義務

仕様外の判断は IMPLEMENTATION_NOTES.md の判断ログへブロック形式で即時追記。

## 6. 完了報告に含めること

- DoD 各項目の達成状況、`npm test` / `npm run build` の実行結果（そのままの出力要約）
- 変更した全ファイルパス、判断ログ件数と要点、気になった点（ゼロを装わない）
