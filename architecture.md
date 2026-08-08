# システム設計

## 原則

学習ロジック、ゲーム進行、表示を分離する。タイピングの正誤が UI や報酬の都合で変わらず、問題生成・分析を単体テストできる構成にする。

## レイヤー

```text
UI
  ├─ タイピング画面 / 海図 / 水槽 / 釣果 / 設定
  ↓ Action
Application
  ├─ SessionService / ProgressService / RewardService
  ↓ Domain ports
Domain
  ├─ matcher / curriculum / generator / learning / economy / fish / world
  ↓ Repository
Infrastructure
  ├─ localStorage or IndexedDB / content JSON / asset loader
```

`Domain` はブラウザ API、DOM、音、画像を参照しない。`UI` は問題の正解ルールや報酬額を直接計算しない。

## ディレクトリ案

```text
src/
  domain/
    typing/          # romaji table, matcher, keyboard layout
    curriculum/      # stage definitions, mastery rules
    generator/       # selector, validator, fallback problems
    learning/        # key skill aggregation
    economy/         # coins, xp, reward rules
    fish/            # species catalog, catch variants, collection statistics
    world/           # seas, nodes, unlocks
  application/
    startSession.ts
    submitKey.ts
    finishProblem.ts
  ui/
    screens/
    components/
    state/
  content/
    stages.json
    vocabulary/
    items.json
    regions.json
  infrastructure/
    repositories/
    analytics/
  tests/
```

## 永続データ

```ts
type SaveData = {
  schemaVersion: 1;
  curriculum: { currentStageId: string; unlockedStageIds: string[] };
  skills: Record<string, KeySkill>;
  progress: { completedNodeIds: string[]; regionStates: Record<string, string> };
  economy: { coins: number; xp: number };
  caughtFish: Array<{ id: string; speciesId: string; stageId: string; regionId: string; variant: string; size: string }>;
  discoveredFishSpeciesIds: string[];
  releasedFishCounts: Record<string, number>;
  settings: {
    keyboardLayout: "jis" | "us" | "unknown";
    sound: boolean;
    reducedMotion: boolean;
    keyboardGuide: "full" | "compact" | "off";
  };
};
```

保存は初期版で IndexedDB を推奨する。読み込みに失敗した場合は、破損データを上書きせずバックアップして初期状態で開始する。スキーマ移行は `schemaVersion` ごとに明示する。

## 主要ユースケース

### 問題開始

1. 現在ノード・ステージ・学習プロファイルを読む。
2. `ProblemGenerator` が検証済みの問題を返す。
3. `TypingSession` を生成し、UI が表示する。

### 打鍵

1. UI が正規化したキーを `TypingSession.submitKey` に渡す。
2. マッチャーが正誤・進捗を返す。
3. UI が進捗を描画し、分析用の最小イベントを蓄積する。
4. 完了時だけ `finishProblem` を呼ぶ。

### 問題完了

1. 試行結果を `LearningService` へ渡し、キー技能を更新する。
2. `CatchService` が海域・プレイ回数・メダルから釣果を1匹確定する。
3. `ProgressService` がノード・地域の状態を更新する。
4. 一つのトランザクションとして保存し、結果画面に渡す。

### 魚を海へ返す

1. UI が確認を表示する。
2. `TankService` が水槽にいる個体だけを取り除く。
3. 発見済みの種と海域別のリリース数は保持する。

## コンテンツの検証

ビルド時または CI で以下を実行する。

- 全 `kana` をローマ字マッチャーが処理できる。
- 問題の使用キーが対象ステージの上限内にある。
- 問題・ノード ID が一意で、参照が切れていない。
- フォールバック問題が各ステージに存在する。

## テスト優先順位

1. ローマ字マッチャー、問題検証、報酬二重付与防止。
2. 進捗・セーブ移行・中断復帰。
3. 問題選択の苦手キー重みと重複回避。
4. 主要画面のキーボード操作・小画面表示。

## 初期リリースの範囲

- S00〜S03、はじまりの庭、問題セット20〜30件。
- ローマ字マッチャーの移植と、キー別の最小分析。
- 水槽、海域ごとの魚、内部報酬として保存するコインと経験値。
- ローカルセーブ、音・動き・配列の基本設定。

アカウント、同期、保護者ダッシュボード、自由入力保存、ガチャ、通知、ランキングは初期範囲から外す。
