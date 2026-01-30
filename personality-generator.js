// プレイヤー個性ランダム生成スクリプト

// パラメータ範囲定義
const RANGES = {
    speed: { min: 2, max: 8, step: 0.5 },
    shootInterval: { min: 300, max: 1000, step: 50 },
    bulletCount: { min: 1, max: 12, step: 1 },
    bulletSpeed: { min: 3, max: 9, step: 0.5 },
    spreadAngle: { min: 0, max: 120, step: 15 },
    radius: { min: 20, max: 50, step: 5 },
    // 剣士タイプ用パラメータ
    swordLength: { min: 40, max: 80, step: 5 },
    swordDamage: { min: 3, max: 10, step: 1 },
    swordSwingSpeed: { min: 0.10, max: 0.25, step: 0.01 },
    swordHitCooldown: { min: 200, max: 500, step: 50 }
};

// プリセットタイプ定義
const PERSONALITY_TYPES = {
    'スピード型': {
        speed: { min: 6, max: 8 },
        shootInterval: { min: 300, max: 500 },
        bulletCount: { min: 1, max: 4 },
        bulletSpeed: { min: 6, max: 9 },
        spreadAngle: { min: 0, max: 30 },
        radius: { min: 20, max: 30 }
    },
    'パワー型': {
        speed: { min: 2, max: 4 },
        shootInterval: { min: 700, max: 1000 },
        bulletCount: { min: 8, max: 12 },
        bulletSpeed: { min: 3, max: 5 },
        spreadAngle: { min: 75, max: 120 },
        radius: { min: 35, max: 50 }
    },
    'バランス型': {
        speed: { min: 4, max: 6 },
        shootInterval: { min: 500, max: 700 },
        bulletCount: { min: 5, max: 7 },
        bulletSpeed: { min: 4, max: 6 },
        spreadAngle: { min: 30, max: 60 },
        radius: { min: 25, max: 40 }
    },
    'スナイパー型': {
        speed: { min: 4, max: 6 },
        shootInterval: { min: 600, max: 900 },
        bulletCount: { min: 1, max: 2 },
        bulletSpeed: { min: 7, max: 9 },
        spreadAngle: { min: 0, max: 15 },
        radius: { min: 20, max: 30 }
    },
    'ショットガン型': {
        speed: { min: 4, max: 6 },
        shootInterval: { min: 600, max: 800 },
        bulletCount: { min: 9, max: 12 },
        bulletSpeed: { min: 3, max: 5 },
        spreadAngle: { min: 90, max: 120 },
        radius: { min: 30, max: 40 }
    },
    '剣士型': {
        speed: { min: 5, max: 8 },           // 高速移動（接近戦のため）
        radius: { min: 25, max: 35 },
        isSwordsman: true,
        swordLength: { min: 45, max: 70 },   // 剣の長さ
        swordDamage: { min: 5, max: 8 },     // 剣のダメージ
        swordSwingSpeed: { min: 0.12, max: 0.20 },  // 回転速度
        swordHitCooldown: { min: 250, max: 400 }    // ヒットクールダウン
    }
};

// ランダム値生成（範囲とステップに従う）
function randomValue(min, max, step) {
    const steps = Math.floor((max - min) / step);
    return min + Math.floor(Math.random() * (steps + 1)) * step;
}

// タイプに基づいてパラメータを生成
function generatePersonality(type) {
    const preset = PERSONALITY_TYPES[type];

    // 剣士タイプの場合
    if (preset.isSwordsman) {
        return {
            type: type,
            isSwordsman: true,
            speed: randomValue(preset.speed.min, preset.speed.max, RANGES.speed.step),
            radius: randomValue(preset.radius.min, preset.radius.max, RANGES.radius.step),
            swordLength: randomValue(preset.swordLength.min, preset.swordLength.max, RANGES.swordLength.step),
            swordDamage: randomValue(preset.swordDamage.min, preset.swordDamage.max, RANGES.swordDamage.step),
            swordSwingSpeed: randomValue(preset.swordSwingSpeed.min, preset.swordSwingSpeed.max, RANGES.swordSwingSpeed.step),
            swordHitCooldown: randomValue(preset.swordHitCooldown.min, preset.swordHitCooldown.max, RANGES.swordHitCooldown.step)
        };
    }

    // 通常タイプ
    return {
        type: type,
        speed: randomValue(preset.speed.min, preset.speed.max, RANGES.speed.step),
        shootInterval: randomValue(preset.shootInterval.min, preset.shootInterval.max, RANGES.shootInterval.step),
        bulletCount: randomValue(preset.bulletCount.min, preset.bulletCount.max, RANGES.bulletCount.step),
        bulletSpeed: randomValue(preset.bulletSpeed.min, preset.bulletSpeed.max, RANGES.bulletSpeed.step),
        spreadAngle: randomValue(preset.spreadAngle.min, preset.spreadAngle.max, RANGES.spreadAngle.step),
        radius: randomValue(preset.radius.min, preset.radius.max, RANGES.radius.step)
    };
}

// 戦闘力計算
function calculatePower(personality) {
    // 剣士タイプの戦闘力計算
    if (personality.isSwordsman) {
        // DPS = ダメージ / (クールダウン / 1000)
        const dps = personality.swordDamage / (personality.swordHitCooldown / 1000);
        return (personality.speed * 12) +    // 速度重視（接近が必要）
               (dps * 3) +                   // DPS
               (personality.swordLength * 0.5) +  // リーチ
               (personality.swordSwingSpeed * 50) -  // 回転速度
               (personality.radius * 0.3);   // サイズ（当たりやすさ）
    }

    // 通常タイプの戦闘力計算
    return (personality.speed * 10) +
           (1000 / personality.shootInterval * 5) +
           (personality.bulletCount * 3) +
           (personality.bulletSpeed * 8) -
           (personality.spreadAngle * 0.2) -
           (personality.radius * 0.5);
}

// 新しいペアを生成
function generateNewPair() {
    const types = Object.keys(PERSONALITY_TYPES);

    // ランダムに2つのタイプを選択
    const type1 = types[Math.floor(Math.random() * types.length)];
    let type2 = types[Math.floor(Math.random() * types.length)];

    // 同じタイプにならないようにする（50%の確率で変更）
    if (type1 === type2 && Math.random() > 0.5) {
        const otherTypes = types.filter(t => t !== type1);
        type2 = otherTypes[Math.floor(Math.random() * otherTypes.length)];
    }

    const player1 = generatePersonality(type1);
    const player2 = generatePersonality(type2);

    const power1 = calculatePower(player1);
    const power2 = calculatePower(player2);

    return {
        player1,
        player2,
        power1,
        power2,
        powerDiff: Math.abs(power1 - power2),
        powerDiffPercent: Math.abs(power1 - power2) / Math.max(power1, power2) * 100
    };
}

// メイン実行
function main() {
    let bestPair = null;
    let attempts = 0;
    const maxAttempts = 100;

    // バランスの良いペアを探す（戦闘力差30%以内）
    while (attempts < maxAttempts) {
        const pair = generateNewPair();

        if (!bestPair || pair.powerDiffPercent < bestPair.powerDiffPercent) {
            bestPair = pair;
        }

        // 十分バランスが取れていたら採用
        if (pair.powerDiffPercent < 30) {
            bestPair = pair;
            break;
        }

        attempts++;
    }

    console.log('=== 生成された新しいプレイヤー個性 ===\n');

    // Player 1の情報を表示
    console.log(`【Player 1 - ${bestPair.player1.type}】`);
    console.log(`- 移動速度: ${bestPair.player1.speed}`);
    if (bestPair.player1.isSwordsman) {
        console.log(`- 剣の長さ: ${bestPair.player1.swordLength}`);
        console.log(`- 剣ダメージ: ${bestPair.player1.swordDamage}`);
        console.log(`- 回転速度: ${bestPair.player1.swordSwingSpeed.toFixed(2)}`);
        console.log(`- ヒットCD: ${bestPair.player1.swordHitCooldown}ms`);
    } else {
        console.log(`- 連射間隔: ${bestPair.player1.shootInterval}ms`);
        console.log(`- 同時発射数: ${bestPair.player1.bulletCount}発`);
        console.log(`- 弾速: ${bestPair.player1.bulletSpeed}`);
        console.log(`- 拡散角度: ${bestPair.player1.spreadAngle}°`);
    }
    console.log(`- サイズ: ${bestPair.player1.radius}`);
    console.log(`- 戦闘力: ${bestPair.power1.toFixed(2)}\n`);

    // Player 2の情報を表示
    console.log(`【Player 2 - ${bestPair.player2.type}】`);
    console.log(`- 移動速度: ${bestPair.player2.speed}`);
    if (bestPair.player2.isSwordsman) {
        console.log(`- 剣の長さ: ${bestPair.player2.swordLength}`);
        console.log(`- 剣ダメージ: ${bestPair.player2.swordDamage}`);
        console.log(`- 回転速度: ${bestPair.player2.swordSwingSpeed.toFixed(2)}`);
        console.log(`- ヒットCD: ${bestPair.player2.swordHitCooldown}ms`);
    } else {
        console.log(`- 連射間隔: ${bestPair.player2.shootInterval}ms`);
        console.log(`- 同時発射数: ${bestPair.player2.bulletCount}発`);
        console.log(`- 弾速: ${bestPair.player2.bulletSpeed}`);
        console.log(`- 拡散角度: ${bestPair.player2.spreadAngle}°`);
    }
    console.log(`- サイズ: ${bestPair.player2.radius}`);
    console.log(`- 戦闘力: ${bestPair.power2.toFixed(2)}\n`);

    console.log(`戦闘力差: ${bestPair.powerDiff.toFixed(2)} (${bestPair.powerDiffPercent.toFixed(1)}%)`);
    console.log(`試行回数: ${attempts + 1}回\n`);

    // タイムスタンプ
    const timestamp = new Date().toISOString();

    // CSV行データ
    const csvLine = `${timestamp},${bestPair.player1.type},${bestPair.player1.speed},${bestPair.player1.shootInterval},${bestPair.player1.bulletCount},${bestPair.player1.bulletSpeed},${bestPair.player1.spreadAngle},${bestPair.player1.radius},${bestPair.player2.type},${bestPair.player2.speed},${bestPair.player2.shootInterval},${bestPair.player2.bulletCount},${bestPair.player2.bulletSpeed},${bestPair.player2.spreadAngle},${bestPair.player2.radius}`;

    console.log('=== CSV追記データ ===');
    console.log(csvLine);
    console.log('\n=== game.js更新用コード ===');

    // game.js用のコード生成
    const p1 = bestPair.player1;
    const p2 = bestPair.player2;

    // Player 1のコード生成
    let p1Code;
    if (p1.isSwordsman) {
        p1Code = `    player1: {
        // ${p1.type} - 戦闘力: ${bestPair.power1.toFixed(2)}
        speed: ${p1.speed},
        radius: ${p1.radius},
        isSwordsman: true,
        swordLength: ${p1.swordLength},
        swordDamage: ${p1.swordDamage},
        swordSwingSpeed: ${p1.swordSwingSpeed.toFixed(2)},
        swordHitCooldown: ${p1.swordHitCooldown},
    }`;
    } else {
        const p1SpreadAngle = p1.spreadAngle === 0 ? '0' : `Math.PI / ${(180 / p1.spreadAngle).toFixed(2)}`;
        p1Code = `    player1: {
        // ${p1.type} - 戦闘力: ${bestPair.power1.toFixed(2)}
        speed: ${p1.speed},
        shootInterval: ${p1.shootInterval},
        bulletsPerShot: ${p1.bulletCount},
        bulletSpeed: ${p1.bulletSpeed},
        spreadAngle: ${p1SpreadAngle}, // ${p1.spreadAngle}度
        radius: ${p1.radius},
    }`;
    }

    // Player 2のコード生成
    let p2Code;
    if (p2.isSwordsman) {
        p2Code = `    player2: {
        // ${p2.type} - 戦闘力: ${bestPair.power2.toFixed(2)}
        speed: ${p2.speed},
        radius: ${p2.radius},
        isSwordsman: true,
        swordLength: ${p2.swordLength},
        swordDamage: ${p2.swordDamage},
        swordSwingSpeed: ${p2.swordSwingSpeed.toFixed(2)},
        swordHitCooldown: ${p2.swordHitCooldown},
    }`;
    } else {
        const p2SpreadAngle = p2.spreadAngle === 0 ? '0' : `Math.PI / ${(180 / p2.spreadAngle).toFixed(2)}`;
        p2Code = `    player2: {
        // ${p2.type} - 戦闘力: ${bestPair.power2.toFixed(2)}
        speed: ${p2.speed},
        shootInterval: ${p2.shootInterval},
        bulletsPerShot: ${p2.bulletCount},
        bulletSpeed: ${p2.bulletSpeed},
        spreadAngle: ${p2SpreadAngle}, // ${p2.spreadAngle}度
        radius: ${p2.radius},
    }`;
    }

    console.log(`const PLAYER_CONFIGS = {
${p1Code},
${p2Code},
};`);

    return {
        csvLine,
        player1: p1,
        player2: p2
    };
}

// 実行
const result = main();
