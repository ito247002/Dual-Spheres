# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

**出力はすべて日本語**で出力してください

## プロジェクト概要

YouTube Shorts向けの東方Project風2D弾幕バトルシミュレーション。2つの数字オブジェクトが弾を撃ち合い、HP=0で爆発するバトル演出を行う。3ラウンド制（2本先取）。

## 開発サーバー起動

```bash
npx -y http-server . -p 8080 -c-1
```

ブラウザで http://127.0.0.1:8080/number-battle にアクセス

## アーキテクチャ

### ファイル構成
- `number-battle/index.html` - HTML構造（Canvas要素、HP表示、ラウンド勝敗、タイマー）
- `number-battle/style.css` - パステルテーマのスタイル（9:16縦長レイアウト）
- `number-battle/game.js` - ゲームロジック全体

### game.js の構造

**クラス構成:**
- `Player` - プレイヤーオブジェクト（位置、HP、壁反射、描画、爆発処理、アイテム効果）
- `Bullet` - 弾（軌跡描画、当たり判定、壁で消滅）
- `Item` - アイテム（効果、パルスアニメーション、取得判定）
- `Particle` - 爆発パーティクル

**設定オブジェクト:**
- `CONFIG` - ゲーム全体設定（ラウンド時間、HP、ダメージ、アイテム出現率など）
- `PLAYER_CONFIGS` - プレイヤーごとの個性（速度、連射間隔、弾数、弾速、扇形角度、サイズ）
- `ITEM_TYPES` - アイテム定義（拡張可能）
- `COLORS` - カラー定義（赤 vs 青）

**ゲームフロー:**
1. `initGame()` → Canvas初期化、`resetMatch()`呼び出し
2. `gameLoop()` → 毎フレーム更新（移動、射撃、アイテム、当たり判定、描画）
3. HP=0で`Player.explode()`、ラウンド終了後に次ラウンドへ（2本先取で終了）

### 3ラウンド制
- 各ラウンド15秒（`CONFIG.ROUND_DURATION`）
- 2本先取で勝利
- ラウンド間に2秒のインターバル
- ラウンド開始時にアイテム効果リセット

### アイテムシステム（拡張可能）

**現在のアイテム:**
| アイテム | アイコン | 色 | 効果 |
|---------|---------|-----|------|
| RAPID FIRE | ⚡ | ゴールド | 連射速度3倍 |
| SPEED UP | 💨 | スカイブルー | 移動速度2倍 |

**アイテム追加方法:**
`ITEM_TYPES`オブジェクトに新しいエントリを追加:
```javascript
newItem: {
    name: 'NEW ITEM',
    color: '#FF00FF',
    glowColor: '#FF00FF',
    icon: '★',
    effect: (player) => {
        // プレイヤーに効果を適用
    },
    duration: 8000,  // 効果持続時間（ms）
},
```




### プレイヤー個性（PLAYER_CONFIGS）
| 特性 | Player 1（赤） | Player 2（青） |
|------|-------------------|-------------------|
| タイプ | スピード型 | パワー型 |
| サイズ | 20（小さめ） | 30（大きめ） |
| 移動速度 | 6 | 2.5 |
| 連射間隔 | 500ms | 800ms |
| 同時発射数 | 3発 | 8発 |
| 弾速 | 7 | 4 |
| 扇形角度 | 22.5° | 90° |

### 無効化された機能
- `checkBulletCollisions()` - 弾同士の相殺（コメント解除で有効化）
