const fs = require('fs');
const path = require('path');

// パラメータ範囲
const RANGES = {
    speed: { min: 2, max: 8, step: 0.5 },
    shootInterval: { min: 300, max: 1000, step: 50 },
    bulletCount: { min: 1, max: 12, step: 1 },
    bulletSpeed: { min: 3, max: 9, step: 0.5 },
    spreadAngle: { min: 0, max: 120, step: 15 },
    radius: { min: 20, max: 50, step: 5 }
};

// プリセットタイプ
const PERSONALITY_TYPES = {
    スピード型: {
        speed: { min: 6, max: 8 },
        shootInterval: { min: 300, max: 500 },
        bulletCount: { min: 1, max: 4 },
        bulletSpeed: { min: 6, max: 9 },
        spreadAngle: { min: 0, max: 30 },
        radius: { min: 20, max: 25 }
    },
    パワー型: {
        speed: { min: 2, max: 4 },
        shootInterval: { min: 700, max: 1000 },
        bulletCount: { min: 8, max: 12 },
        bulletSpeed: { min: 3, max: 5 },
        spreadAngle: { min: 75, max: 120 },
        radius: { min: 35, max: 50 }
    },
    バランス型: {
        speed: { min: 4, max: 6 },
        shootInterval: { min: 500, max: 700 },
        bulletCount: { min: 5, max: 7 },
        bulletSpeed: { min: 5, max: 7 },
        spreadAngle: { min: 30, max: 60 },
        radius: { min: 25, max: 35 }
    },
    スナイパー型: {
        speed: { min: 4, max: 6 },
        shootInterval: { min: 600, max: 900 },
        bulletCount: { min: 1, max: 2 },
        bulletSpeed: { min: 7, max: 9 },
        spreadAngle: { min: 0, max: 15 },
        radius: { min: 20, max: 30 }
    },
    ショットガン型: {
        speed: { min: 3.5, max: 5 },
        shootInterval: { min: 500, max: 700 },
        bulletCount: { min: 10, max: 12 },
        bulletSpeed: { min: 3, max: 5 },
        spreadAngle: { min: 90, max: 120 },
        radius: { min: 25, max: 35 }
    }
};

// ランダムな値を生成（範囲とステップに基づく）
function randomInRange(min, max, step) {
    const steps = Math.floor((max - min) / step);
    return min + Math.floor(Math.random() * (steps + 1)) * step;
}

// タイプに基づいてパラメータを生成
function generateParams(typeName) {
    const type = PERSONALITY_TYPES[typeName];
    return {
        type: typeName,
        speed: randomInRange(type.speed.min, type.speed.max, RANGES.speed.step),
        shootInterval: randomInRange(type.shootInterval.min, type.shootInterval.max, RANGES.shootInterval.step),
        bulletCount: randomInRange(type.bulletCount.min, type.bulletCount.max, RANGES.bulletCount.step),
        bulletSpeed: randomInRange(type.bulletSpeed.min, type.bulletSpeed.max, RANGES.bulletSpeed.step),
        spreadAngle: randomInRange(type.spreadAngle.min, type.spreadAngle.max, RANGES.spreadAngle.step),
        radius: randomInRange(type.radius.min, type.radius.max, RANGES.radius.step)
    };
}

// 戦闘力を計算
function calculatePower(params) {
    return (params.speed * 10) +
           (1000 / params.shootInterval * 5) +
           (params.bulletCount * 3) +
           (params.bulletSpeed * 8) -
           (params.spreadAngle * 0.2) -
           (params.radius * 0.5);
}

// 重複チェック（パラメータが近すぎないか）
function isDuplicate(newP1, newP2, history) {
    const threshold = 0.15; // 15%以内の差は重複とみなす

    for (const old of history) {
        // 各パラメータの差をチェック
        const p1Diff = Math.abs(newP1.speed - old.player1_speed) / old.player1_speed < threshold &&
                       Math.abs(newP1.shootInterval - old.player1_shootInterval) / old.player1_shootInterval < threshold &&
                       Math.abs(newP1.bulletCount - old.player1_bulletCount) / old.player1_bulletCount < threshold &&
                       Math.abs(newP1.bulletSpeed - old.player1_bulletSpeed) / old.player1_bulletSpeed < threshold;

        const p2Diff = Math.abs(newP2.speed - old.player2_speed) / old.player2_speed < threshold &&
                       Math.abs(newP2.shootInterval - old.player2_shootInterval) / old.player2_shootInterval < threshold &&
                       Math.abs(newP2.bulletCount - old.player2_bulletCount) / old.player2_bulletCount < threshold &&
                       Math.abs(newP2.bulletSpeed - old.player2_bulletSpeed) / old.player2_bulletSpeed < threshold;

        if (p1Diff && p2Diff) {
            return true;
        }
    }
    return false;
}

// CSVから履歴を読み込む
function loadHistory(csvPath) {
    if (!fs.existsSync(csvPath)) {
        return [];
    }

    const content = fs.readFileSync(csvPath, 'utf-8');
    const lines = content.trim().split('\n');

    if (lines.length <= 1) return []; // ヘッダーのみ

    return lines.slice(1).map(line => {
        const parts = line.split(',');
        return {
            timestamp: parts[0],
            player1_type: parts[1],
            player1_speed: parseFloat(parts[2]),
            player1_shootInterval: parseInt(parts[3]),
            player1_bulletCount: parseInt(parts[4]),
            player1_bulletSpeed: parseFloat(parts[5]),
            player1_spreadAngle: parseInt(parts[6]),
            player1_radius: parseInt(parts[7]),
            player2_type: parts[8],
            player2_speed: parseFloat(parts[9]),
            player2_shootInterval: parseInt(parts[10]),
            player2_bulletCount: parseInt(parts[11]),
            player2_bulletSpeed: parseFloat(parts[12]),
            player2_spreadAngle: parseInt(parts[13]),
            player2_radius: parseInt(parts[14])
        };
    });
}

// CSVに追記
function appendToCSV(csvPath, player1, player2) {
    const timestamp = new Date().toISOString().replace(/\.\d{3}Z$/, 'Z');
    const line = `${timestamp},${player1.type},${player1.speed},${player1.shootInterval},${player1.bulletCount},${player1.bulletSpeed},${player1.spreadAngle},${player1.radius},${player2.type},${player2.speed},${player2.shootInterval},${player2.bulletCount},${player2.bulletSpeed},${player2.spreadAngle},${player2.radius}\n`;

    fs.appendFileSync(csvPath, line, 'utf-8');
}

// 新しい個性を生成
function generateNewPersonality(maxAttempts = 10) {
    const csvPath = path.join(__dirname, 'player-configs.csv');
    const history = loadHistory(csvPath);

    const typeNames = Object.keys(PERSONALITY_TYPES);

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
        // ランダムにタイプを選択（異なるタイプを推奨）
        const type1 = typeNames[Math.floor(Math.random() * typeNames.length)];
        let type2 = typeNames[Math.floor(Math.random() * typeNames.length)];

        // 50%の確率で異なるタイプを選ぶ
        if (Math.random() < 0.7) {
            const otherTypes = typeNames.filter(t => t !== type1);
            type2 = otherTypes[Math.floor(Math.random() * otherTypes.length)];
        }

        const player1 = generateParams(type1);
        const player2 = generateParams(type2);

        // バランスチェック（戦闘力の差が30%以内）
        const power1 = calculatePower(player1);
        const power2 = calculatePower(player2);
        const powerDiff = Math.abs(power1 - power2) / Math.max(power1, power2);

        if (powerDiff > 0.30) {
            continue; // バランスが悪いので再生成
        }

        // 重複チェック
        if (isDuplicate(player1, player2, history)) {
            continue; // 重複しているので再生成
        }

        // 生成成功
        return { player1, player2, power1, power2, attempt: attempt + 1 };
    }

    throw new Error(`${maxAttempts}回試行しましたが、重複を避けられませんでした。パラメータ範囲の拡大を検討してください。`);
}

// メイン処理
try {
    console.log('プレイヤー個性をランダム生成中...\n');

    const result = generateNewPersonality();
    const { player1, player2, power1, power2, attempt } = result;

    console.log('新しいプレイヤー個性を生成しました（試行回数: ' + attempt + '回）\n');

    console.log('【Player 1 - ' + player1.type + '】');
    console.log('- 移動速度: ' + player1.speed);
    console.log('- 連射間隔: ' + player1.shootInterval + 'ms');
    console.log('- 同時発射数: ' + player1.bulletCount + '発');
    console.log('- 弾速: ' + player1.bulletSpeed);
    console.log('- 拡散角度: ' + player1.spreadAngle + '°');
    console.log('- サイズ: ' + player1.radius);
    console.log('- 戦闘力: ' + power1.toFixed(2) + '\n');

    console.log('【Player 2 - ' + player2.type + '】');
    console.log('- 移動速度: ' + player2.speed);
    console.log('- 連射間隔: ' + player2.shootInterval + 'ms');
    console.log('- 同時発射数: ' + player2.bulletCount + '発');
    console.log('- 弾速: ' + player2.bulletSpeed);
    console.log('- 拡散角度: ' + player2.spreadAngle + '°');
    console.log('- サイズ: ' + player2.radius);
    console.log('- 戦闘力: ' + power2.toFixed(2) + '\n');

    const powerDiff = Math.abs(power1 - power2) / Math.max(power1, power2);
    console.log('戦闘力バランス: ' + (powerDiff * 100).toFixed(1) + '%の差 (30%以内が目標)\n');

    // CSVに追記
    const csvPath = path.join(__dirname, 'player-configs.csv');
    appendToCSV(csvPath, player1, player2);

    const history = loadHistory(csvPath);
    console.log('設定をCSVに記録しました（履歴: ' + history.length + '件）\n');

    // game.jsの更新用コードを出力
    console.log('=== game.js の PLAYER_CONFIGS を以下に更新してください ===\n');
    console.log('const PLAYER_CONFIGS = {');
    console.log('    player1: {');
    console.log('        // ' + player1.type + ' - 戦闘力: ' + power1.toFixed(2));
    console.log('        speed: ' + player1.speed + ',');
    console.log('        shootInterval: ' + player1.shootInterval + ',');
    console.log('        bulletsPerShot: ' + player1.bulletCount + ',');
    console.log('        bulletSpeed: ' + player1.bulletSpeed + ',');
    console.log('        spreadAngle: Math.PI / ' + (180 / player1.spreadAngle).toFixed(2) + ', // ' + player1.spreadAngle + '度');
    console.log('        radius: ' + player1.radius + ',');
    console.log('    },');
    console.log('    player2: {');
    console.log('        // ' + player2.type + ' - 戦闘力: ' + power2.toFixed(2));
    console.log('        speed: ' + player2.speed + ',');
    console.log('        shootInterval: ' + player2.shootInterval + ',');
    console.log('        bulletsPerShot: ' + player2.bulletCount + ',');
    console.log('        bulletSpeed: ' + player2.bulletSpeed + ',');
    console.log('        spreadAngle: Math.PI / ' + (180 / player2.spreadAngle).toFixed(2) + ', // ' + player2.spreadAngle + '度');
    console.log('        radius: ' + player2.radius + ',');
    console.log('    },');
    console.log('};\n');

    // 生成結果をJSONでも保存
    const outputData = { player1, player2, power1, power2 };
    fs.writeFileSync(path.join(__dirname, 'generated-config.json'), JSON.stringify(outputData, null, 2), 'utf-8');
    console.log('生成結果を generated-config.json にも保存しました');

} catch (error) {
    console.error('エラー:', error.message);
    process.exit(1);
}
