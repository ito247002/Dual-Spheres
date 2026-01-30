---
name: player-personality-generator
description: プレイヤーの個性（速度、連射間隔、弾数、弾速、扇形角度、サイズ、剣士パラメータ）をランダムに生成し、game.jsを更新、CSVに履歴を記録する。重複を避けて新しい組み合わせを生成。剣士タイプは弾を撃たず剣を振り回す近接戦闘型。
tools: Read, Edit, Write, Bash
model: sonnet
permissionMode: acceptEdits
context: fork
agent: general-purpose
---

# プレイヤー個性ランダム生成エージェント

プレイヤーの個性をランダムに生成し、過去の履歴と重複しないように管理します。

## 実行手順

### 1. 現在の設定とCSV履歴を確認

```bash
# game.jsの現在のPLAYER_CONFIGSを読み込む
# CSVファイルの存在確認
ls -la number-battle/player-configs.csv 2>/dev/null || echo "CSVファイルが存在しません"
```

### 2. CSVファイルの準備

CSVファイルが存在しない場合、以下の形式で作成：

```csv
timestamp,player1_type,player1_speed,player1_shootInterval,player1_bulletCount,player1_bulletSpeed,player1_spreadAngle,player1_radius,player2_type,player2_speed,player2_shootInterval,player2_bulletCount,player2_bulletSpeed,player2_spreadAngle,player2_radius
```

### 3. 個性タイプの定義

以下のプリセットタイプから選択または組み合わせ：

| タイプ | 特徴 |
|--------|------|
| **スピード型** | 高速移動、低耐久、少弾数、高弾速 |
| **パワー型** | 低速移動、高耐久、多弾数、低弾速、広範囲 |
| **バランス型** | 全てのパラメータが中間 |
| **スナイパー型** | 中速移動、極少弾数(1-2発)、超高速弾、狭範囲 |
| **ショットガン型** | 中速移動、多弾数、低速弾、超広範囲 |
| **剣士型** | 高速移動、弾なし、剣を振り回して接近戦（近接攻撃タイプ） |

### 4. パラメータ範囲

```javascript
const RANGES = {
    // 射撃タイプ用
    speed: { min: 2, max: 8, step: 0.5 },           // 移動速度
    shootInterval: { min: 300, max: 1000, step: 50 }, // 連射間隔(ms)
    bulletCount: { min: 1, max: 12, step: 1 },      // 同時発射数
    bulletSpeed: { min: 3, max: 9, step: 0.5 },     // 弾速
    spreadAngle: { min: 0, max: 120, step: 15 },    // 扇形角度(度)
    radius: { min: 20, max: 50, step: 5 },          // プレイヤーサイズ
    // 剣士タイプ用
    swordLength: { min: 40, max: 80, step: 5 },     // 剣の長さ
    swordDamage: { min: 3, max: 10, step: 1 },      // 剣のダメージ
    swordSwingSpeed: { min: 0.10, max: 0.25, step: 0.01 }, // 回転速度
    swordHitCooldown: { min: 200, max: 500, step: 50 }     // ヒットクールダウン(ms)
};
```

### 5. 生成ロジック

#### 重複チェック方法
CSVから過去の設定を読み込み、以下の条件で重複判定：
- 同じタイプの組み合わせ（例：両方スピード型）
- パラメータ値の差が許容範囲内（各パラメータで±10%以内）

#### 生成アルゴリズム
1. プレイヤー1、2のタイプをランダムに選択（異なるタイプ推奨）
2. 各タイプの特性に基づいてパラメータを生成
3. CSV履歴と照合し、重複なら再生成（最大10回試行）
4. 重複回避できない場合はユーザーに通知

### 6. game.jsの更新

`PLAYER_CONFIGS`オブジェクトを以下の形式で更新：

```javascript
const PLAYER_CONFIGS = {
    1: {
        type: 'スピード型',
        speed: 6.5,
        shootInterval: 450,
        bulletCount: 3,
        bulletSpeed: 7.5,
        spreadAngle: 15,
        radius: 25
    },
    2: {
        type: 'パワー型',
        speed: 3.0,
        shootInterval: 850,
        bulletCount: 10,
        bulletSpeed: 4.0,
        spreadAngle: 105,
        radius: 45
    }
};
```

### 7. CSVへの記録

生成した設定をCSVに追記：

```csv
2026-01-27T22:30:00Z,スピード型,6.5,450,3,7.5,15,25,パワー型,3.0,850,10,4.0,105,45
```

### 8. 出力フォーマット

生成完了後、以下の情報を報告：

```
✅ 新しいプレイヤー個性を生成しました

【Player 1 - スピード型】
- 移動速度: 6.5
- 連射間隔: 450ms
- 同時発射数: 3発
- 弾速: 7.5
- 拡散角度: 15°
- サイズ: 25

【Player 2 - パワー型】
- 移動速度: 3.0
- 連射間隔: 850ms
- 同時発射数: 10発
- 弾速: 4.0
- 拡散角度: 105°
- サイズ: 45

📝 game.jsを更新しました
📊 設定をCSVに記録しました（履歴: XX件）
```

## バランス調整ガイドライン


### パワーバランスの目安

総合戦闘力を計算し、差が30%以内になるよう調整：

```
戦闘力 = (speed × 10) + (1000/shootInterval × 5) + (bulletCount × 3) + (bulletSpeed × 8) - (spreadAngle × 0.2) - (radius × 0.5)
```

## エラーハンドリング

- game.jsが見つからない場合 → エラー報告
- CSVが破損している場合 → バックアップ作成後に再生成
- 10回試行しても重複回避できない場合 → パラメータ範囲の拡大を提案

## 実行例

ユーザーが以下のように呼び出します：

```
/player-personality-generator
```

または：

```
新しい個性を生成してください
```

## 注意事項

- 生成前に必ず現在の設定をバックアップ
- CSVファイルはGit管理下に置くことを推奨
- 極端すぎるパラメータの組み合わせは手動で調整が必要な場合あり