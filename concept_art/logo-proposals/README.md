# タイトルロゴ提案

生成日: 2026-07-31

これらは方向性を比較するためのグラフィック・カンプであり、タイトル画面への組み込み用データではない。
採用後に文字形の精密化、余分な小文字要素の整理、透過マスター、横長・小サイズ・単色版を制作する。

## 01 Key Splash

- 主役: キーキャップと大きな水しぶきを組み込んだ、太く跳ねる日本語ロゴ
- 印象: ゲームらしい、元気、入口として強い
- 生成プロンプトの要点: Exact title `アクアタイピング`; playful custom Japanese letterforms; keycap shapes integrated into the lettering; one bold water-splash arc and a tiny fish silhouette; premium 2D illustrated logotype; aqua, cyan, coral-orange, yellow, and white on midnight navy; no UI or mockup.

## 02 Living Aquarium

- 主役: 文字そのものが小さな水槽になり、魚が文字間を泳ぐロゴ
- 印象: 生き物収集、親しみ、アクアリウム感
- 生成プロンプトの要点: Exact title `アクアタイピング`; chunky custom Japanese lettering treated as a living aquarium; waterlines through the strokes; two or three fish and bubble accents; creamy white and turquoise with coral, tangerine, and lemon accents; no UI or product mockup.

### 02a All Pixel

- 文字、外周、水面、泡、生き物、海草を同一のピクセルグリッドで描き直した案
- 魚は粗く、面積の大きい文字は少し細かいピクセル密度にして読みやすさを保つ
- 生成プロンプトの要点: Image 1 の構図・文字・水槽構造を維持し、すべてを hard square pixels、no antialiasing、limited color ramps のゲームタイトル用ドット絵へ変換。既存のカクレクマノミと潮だまり背景をスタイル参照に使用。

### 02b Pixel Motifs

- 滑らかなクリーム色の文字と外周を維持し、内部の魚、水面、泡、海草、珊瑚、石だけをドット絵にした案
- 現在の「読みやすい現代的UI＋ドット絵の魚」に最も近い構造
- 生成プロンプトの要点: Change only the internal aquarium motifs and creatures to pixel art; preserve smooth anti-aliased typography and outline; use the existing clownfish, moon-jelly, and tidepool art as pixel-style references.

### 02c G/U Keycaps

- 02bを基に、「グ」の濁点を `G` と `U` の小さな2キーへ置き換えた案
- 先に濁点として読め、後からローマ字入力の仕掛けに気づく二重の意味を狙う
- 生成プロンプトの要点: Change only the dakuten/splash motif of the final `グ`; replace it with exactly two small pixel-art keycaps, legends `G` and `U`, styled after the existing keycap barnacle; preserve every other element.

### 02d F/J Keycaps

- 02bを基に、ホームポジションの `F` と `J` を左右の下端へ追加した案
- 象牙色の上面、砂色の側面、濃紺の輪郭を持つ立体的なドット絵キーキャップ
- 左右で逆方向へ傾け、水槽枠を約3分の1またいで、魚と同じようにロゴから泳ぎ出す配置
- 生成プロンプトの要点: Add exactly two 2.5D pixel-art keycaps with legends `F` and `J`; place them near the lower-left and lower-right aquarium edges; opposing 12-degree angles; preserve every existing logo element.

### 02e A/T Keycaps

- 02dと同じ造形・配置ルールで、`Aqua Typing` の頭文字 `A` と `T` を使用した案
- 生成プロンプトの要点: Add exactly two 2.5D pixel-art keycaps with legends `A` and `T`; place them near the lower-left and lower-right aquarium edges; opposing 12-degree angles; preserve every existing logo element.

### 02f F/J Keycaps Inside

- 02bを基に、`F` と `J` を文字内部の水槽へ収めた案
- `F` は中央左の空いた水槽へ配置し、`J` は右側の黄色い魚と置き換える
- ピンクの魚と中央のカクレクマノミを残し、左から「魚 → F → 魚 → J」のリズムに整理
- キー上端だけを水面へ少しかけ、文字全体の外周からは出さない
- 生成プロンプトの要点: Integrate exactly two 2.5D pixel-art keycaps inside the water-filled lettering; F replaces only local coral/rocks in the third `ア`; J replaces only the yellow fish near `ン／グ`; preserve the pink and orange fish and every unaffected element.

### 02g Blue Starfish

- 02fの左側のピンク色の魚を、ゲームに登場するアオヒトデへ置き換えた案
- ヒトデの重複を避けるため、下にあった小さな橙色のヒトデは小石へ変更
- アオヒトデは少し時計回りへ傾け、右上の腕で右方向の流れを示す
- 生成プロンプトの要点: Replace only the left pink fish with the supplied blue starfish sprite; remove the small orange starfish below; preserve the clownfish, F/J keycaps and every unaffected element.

### 02h Boxer Shrimp

- 02fの左側のピンク色の魚を、ゲームに登場する右向きのオトヒメエビへ置き換えた案
- 赤白の体と長い触角により、魚以外の生き物と生物多様性を示す
- 生成プロンプトの要点: Replace only the left pink fish with one right-facing banded coral shrimp matching the supplied game sprite; simplify legs and antennae for logo-size readability; preserve all other elements.

### 02i Right-facing Creatures

- 02hを基に、クマノミも種・位置・大きさを維持したまま右向きへ変更した案
- オトヒメエビとクマノミの両方を右向きに揃え、左から右への進行感を作る
- 生成プロンプトの要点: Change only the central clownfish orientation; redraw it right-facing from the supplied sprite; preserve the right-facing shrimp, F/J keycaps and every other motif.

## 03 Pixel Quest

- 主役: 現代的な太字とドット絵、キーの飛び石を合わせた英字ロゴ
- 印象: タイピング冒険、ゲーム性、海外展開にも向く
- 生成プロンプトの要点: Exact title `AQUA TYPING`; bold contemporary rounded lettering contrasted with selective pixel geometry; keyboard keys as stepping stones; a jumping pixel fish and cursor/lighthouse accent; turquoise, cobalt, lime-yellow, coral-orange, and white on navy; not an all-pixel font.

## 04 Ocean Current

- 主役: 潮流に押されて駆け上がるような文字造形
- 印象: スピード、上達、ダイナミック
- 生成プロンプトの要点: Exact title `アクアタイピング`; slanted springy letterforms; a single current ribbon through the word; three fish reduced to speed marks; dakuten and handakuten treated as bubbles or key-press ripples; typography occupies at least 85 percent of the visual; no literal keyboard illustration.

## 共通方針

- Web UI ではなく、ゲームパッケージにも耐える独立したグラフィックとして制作
- キッズが直感的に楽しさを感じる、太い輪郭と明るいアクセント
- 深い海色の背景でも読める強いシルエット
- 既存の静かな海の世界観を残しつつ、タイトルだけは冒険の入口として一段ポップにする
- オリジナルデザイン、透かしなし
