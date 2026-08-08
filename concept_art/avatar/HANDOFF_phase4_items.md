# きせかえ フェーズ4 申し送り（アイテム量産・実行者向け）

> 確定カタログ（README「アイテムカタログ」）の14アセットを制作する。
> 作業前に `concept_art/avatar/README.md` と本ファイルを必ず Read。
> `IMPLEMENTATION_NOTES.md` も Read（過去の判断ログ引き継ぎ）。
> src/ 配下の変更はスコープ外（コード接続はフェーズ5）。

| 項目 | 内容 |
|---|---|
| 対応する仕様書 | concept_art/avatar/README.md（カタログ・品質基準・制作方針の節） |
| 実行担当 | Opus（implementer 役） |
| 前提アセット | public/avatar/body-*.png, outfit-cloth.png（完成済み・境界ink保証済み） |

---

## 1. 成果物（DoD）

1. **服4着**（マスク内加工。outfit-cloth のシルエット共有）：
   `outfit-rain`（#7c9ac7 へ3値写像）/ `outfit-sun`（#d2a34d へ3値写像）/
   `outfit-stripe`（白地＋オレンジの横しま3〜4本、クマノミ柄）/
   `outfit-scale`（青緑地＋うろこ模様＝半円の段々）/
   `outfit-deep`（濃紺地＋明るい襟ライン＋リベット風ドット2つ、しんかいスーツ）
2. **帽子・持ち物9点**（codex-image 生成→透過→量子化→アンカー配置焼き込み）：
   `head-leaf` `head-star` `head-shell` `head-diver` `head-lantern`
   `hand-net` `hand-bag` `hand-lantern` `hand-pen`
3. すべて 256×256 RGBA、public/avatar/ と concept_art/avatar/ の両配置、`validate-avatar.py` 全パス（境界inkチェック含む）
4. **アンカー実測値を README の「基準位置」節に記入**（頭頂y・頭中心x・目の行・手の位置。body-moss.png から実測）
5. **`scripts/avatar/compose-avatar-preview.py`**（恒久ツール）：
   全アイテムを基準体（moss）に単品装備したグリッド＋雑多なフル装備例4体のグリッドを
   `tmp/imagegen/avatar/preview-items.png` に出力
6. 生成原画は `tmp/imagegen/avatar/<item-id>-source.png` に残置

## 2. 制作仕様

### 服（マスク内加工・決定論的にPILで）

- outfit-cloth.png の可視領域をマスクとして流用。輪郭ink・シェード構造（shade/base/hi の3値関係）を保存して色写像
- パターン（しま・うろこ・リベット）はマスク内部のみに描く。輪郭色は変えない
- 論理ピクセル単位（2px=1論理px）で描くこと。1pxの奇数ずれ禁止

### 帽子・持ち物（生成→配置）

- codex-image での生成コマンド雛形（timeout 300000）：
  ```
  codex exec --sandbox workspace-write --skip-git-repo-check --cd /Users/kawachi/project/aquatyping/tmp/imagegen/avatar 'Codex組み込みのimage_genツール（gpt-image-2）を直接呼んで画像を1枚作成してください。
  プロンプト: 〔アイテム内容〕。ピクセルアート（ドット絵）、6〜8pxの論理ドット、1ドット黒輪郭、5色前後の限定パレット、面ごとの完全なフラット塗り。アイテム単体、正面〜やや斜め、中央配置、キャンバスの約60%サイズ。背景は完全に均一な〔キー色〕純色のみ。グラデーション・影・光彩・文字・枠は一切なし。
  サイズ: 1024x1024
  保存先: ./〔item-id〕-source.png'
  ```
- キー色の目安：緑系アイテム＝#ff00ff、青系＝#ff00ff 以外なら #00ff00、暖色系（ペン・ランタン）＝#0000ff
- 各アイテムの内容・配置：

| item-id | 内容 | サイズ目安（論理px） | 配置 |
|---|---|---|---|
| head-leaf | 緑の葉っぱ1枚がちょこんと載った帽子 | 幅28〜36 | 頭頂に2〜4px重ねて中央 |
| head-star | 濃紺のとんがり帽＋黄色い星1つ | 幅32〜40 | 同上 |
| head-shell | ホタテ貝の殻の帽子（ピンクベージュ） | 幅32〜40 | 同上 |
| head-diver | 水色レンズのダイバーマスク＋ベルト | 幅40〜48 | 目の行を覆う。ベルトは頭の両端まで |
| head-lantern | アンコウ提灯風の短い茎＋光る玉 | 高さ20〜28 | 頭頂中央から上へ。玉は暖色 |
| hand-net | 小さな魚とり網（柄＋網） | 高さ28〜40 | 右手（向かって右）に1〜2px重ねる |
| hand-bag | 貝がら形の小さな肩掛けバッグ | 高さ20〜28 | 右手横 |
| hand-lantern | 丸い手提げランタン（暖色の光） | 高さ24〜32 | 右手横 |
| hand-pen | 大きめのえんぴつ／ペン | 高さ32〜44 | 右手に斜め持ち |

- 量子化は素体と同じ 128 論理グリッド系（prepare-avatar.py の流儀）。**配置後、シルエット最外周がすべて ink 系であることを保証**（既存の境界処理を適用）
- 配置後は必ず Read で目視確認（基準体に重ねた状態で）。ズレ・過大・過小があれば配置数値を調整して再合成

## 3. エスカレーション条件（止まる基準）

- [ ] codex-image のレート制限・認証エラーで生成が継続不能
- [ ] 生成アイテムの品質が3回の再生成でも仕様（限定パレット・フラット塗り・単体）を満たさない → そのアイテムをスキップ一覧に入れて次へ進み、最後にまとめて報告
- [ ] 服のマスク内パターンで輪郭が崩れる／うろこ・しまの見た目が64px縮小で判読不能
- [ ] 仕様にない設計判断で2回迷った

## 4. 裁量範囲（確認不要）

- 各アイテムのプロンプト文言の調整・再生成（3回まで/アイテム）
- パターンの具体的なドット打ち（しまの本数±1、うろこの段数、リベット位置）
- 配置座標の±4論理px調整
- compose-avatar-preview.py のレイアウト

## 5. 判断ログの義務

仕様外の判断は IMPLEMENTATION_NOTES.md の判断ログへブロック形式で即時追記。

## 6. 完了報告に含めること

- DoD 各項目の達成状況、スキップしたアイテムと理由（ゼロを装わない）
- 全ファイルパス、validate 結果、判断ログ件数と要点
- preview-items.png のパス（オーナー確認用）
