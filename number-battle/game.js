// ===== Game Configuration =====
const CONFIG = {
    ROUND_ENABLED: false,    // ラウンド制を無効化
    ROUND_DURATION: 9999,    // 実質無限（ラウンド無効時）
    TOTAL_ROUNDS: 3,         // 全ラウンド数（無効時は使用しない）
    ROUND_INTERVAL: 2,       // ラウンド間のインターバル（秒）
    INITIAL_HP: 99,
    BULLET_DAMAGE: 1,
    BULLET_RADIUS: 8,
    PLAYER_RADIUS: 25,
    ITEM_SPAWN_INTERVAL: 3000,  // アイテム出現チェック間隔（ms）
    ITEM_SPAWN_CHANCE: 0.5,     // アイテム出現確率（30%）
    ITEM_RADIUS: 20,
    ITEM_DURATION: 2500,        // アイテム効果持続時間（ms）
    // AI動作設定
    AI_DODGE_DISTANCE: 100,     // 弾を回避し始める距離
    AI_ITEM_PRIORITY_DISTANCE: 500, // アイテムを優先する距離
    AI_DIRECTION_CHANGE_INTERVAL: 500, // 方向転換のインターバル（ms）
    // プレイヤー衝突設定
    PLAYER_COLLISION_DAMAGE: 5,       // 衝突時のダメージ
    PLAYER_COLLISION_COOLDOWN: 0,   // 衝突ダメージのクールダウン（ms）
};

// ===== Item Types (拡張可能) =====
const ITEM_TYPES = {
    rapidFire: {
        name: 'RAPID FIRE',
        color: '#FFD700',        // ゴールド
        glowColor: '#FFA500',
        icon: '⚡',
        effect: (player) => {
            player.shootIntervalMultiplier = 1 / 3;  // 連射速度3倍
        },
        duration: CONFIG.ITEM_DURATION,
    },
    speedUp: {
        name: 'SPEED UP',
        color: '#00BFFF',        // スカイブルー
        glowColor: '#1E90FF',
        icon: '💨',
        effect: (player) => {
            player.speedMultiplier = 2;  // 移動速度2倍
        },
        duration: CONFIG.ITEM_DURATION,
    },
    // 今後追加するアイテムはここに定義
    // example: {
    //     name: 'EXAMPLE',
    //     color: '#FF00FF',
    //     glowColor: '#FF00FF',
    //     icon: '★',
    //     effect: (player) => { ... },
    //     duration: 5000,
    // },
};

// ===== Player Configurations (個性) =====
const PLAYER_CONFIGS = {
    player1: {
        // 剣士型
        speed: 5.5,
        shootInterval: 0,  // 射撃しない
        bulletsPerShot: 0,
        bulletSpeed: 0,
        spreadAngle: 0,
        radius: 25,
        isSwordsman: true,
        swordLength: 60,
        swordDamage: 8,
        swordSwingSpeed: 0.2,
        swordHitCooldown: 250,
    },
    player2: {
        // スピード型
        speed: 7.5,
        shootInterval: 350,
        bulletsPerShot: 2,
        bulletSpeed: 7.5,
        spreadAngle: Math.PI / 12, // 15度
        radius: 20,
    },
};

// ===== Colors (Simple) =====
const COLORS = {
    player1: {
        main: '#E74C3C',  // 赤
        light: '#E74C3C',
        dark: '#C0392B',
        bullet: '#E74C3C',
    },
    player2: {
        main: '#3498DB',  // 青
        light: '#3498DB',
        dark: '#2980B9',
        bullet: '#3498DB',
    },
};

// ===== Audio System =====
let audioCtx = null;
let masterGain = null;
let audioDestination = null;  // 録画用のオーディオストリーム

function initAudio() {
    if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();

        // マスターゲインノード（すべての音声をここに集約）
        masterGain = audioCtx.createGain();
        masterGain.gain.value = 0.3;

        // スピーカー出力
        masterGain.connect(audioCtx.destination);

        // 録画用のオーディオストリーム
        audioDestination = audioCtx.createMediaStreamDestination();
        masterGain.connect(audioDestination);
    }
    if (audioCtx.state === 'suspended') {
        audioCtx.resume();
    }
}

// 音声出力先を取得（masterGainを使用）
function getAudioOutput() {
    return masterGain || audioCtx?.destination;
}

// 発射音 - ビームライフル風「ピュン」
function playShootSound(isPlayer1) {
    if (!audioCtx) return;
    const t = audioCtx.currentTime;

    // メイン音: 高周波から急降下するスイープ
    const osc1 = audioCtx.createOscillator();
    const gain1 = audioCtx.createGain();
    const filter1 = audioCtx.createBiquadFilter();

    osc1.connect(filter1);
    filter1.connect(gain1);
    gain1.connect(getAudioOutput());

    // プレイヤーごとに音程を変える
    const startFreq = isPlayer1 ? 2400 : 1800;
    osc1.frequency.setValueAtTime(startFreq, t);
    osc1.frequency.exponentialRampToValueAtTime(200, t + 0.08);

    osc1.type = 'sawtooth';
    filter1.type = 'lowpass';
    filter1.frequency.setValueAtTime(4000, t);
    filter1.frequency.exponentialRampToValueAtTime(500, t + 0.08);
    filter1.Q.value = 2;

    gain1.gain.setValueAtTime(0.12, t);
    gain1.gain.exponentialRampToValueAtTime(0.001, t + 0.08);

    osc1.start(t);
    osc1.stop(t + 0.08);

    // アタック音: 短いクリック
    const osc2 = audioCtx.createOscillator();
    const gain2 = audioCtx.createGain();

    osc2.connect(gain2);
    gain2.connect(getAudioOutput());

    osc2.frequency.setValueAtTime(isPlayer1 ? 3000 : 2500, t);
    osc2.type = 'square';
    gain2.gain.setValueAtTime(0.08, t);
    gain2.gain.exponentialRampToValueAtTime(0.001, t + 0.02);

    osc2.start(t);
    osc2.stop(t + 0.02);

    // ノイズバースト: シャープさを追加
    const bufferSize = audioCtx.sampleRate * 0.03;
    const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.3));
    }

    const noise = audioCtx.createBufferSource();
    const noiseGain = audioCtx.createGain();
    const noiseFilter = audioCtx.createBiquadFilter();

    noise.buffer = buffer;
    noiseFilter.type = 'bandpass';
    noiseFilter.frequency.value = 3000;
    noiseFilter.Q.value = 1;

    noise.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(getAudioOutput());

    noiseGain.gain.setValueAtTime(0.06, t);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, t + 0.03);

    noise.start(t);
}

// 被弾音 - 軽い「ポン」
function playHitSound() {
    if (!audioCtx) return;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();

    osc.connect(gain);
    gain.connect(getAudioOutput());

    osc.frequency.setValueAtTime(300, audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(100, audioCtx.currentTime + 0.15);

    osc.type = 'triangle';
    gain.gain.setValueAtTime(0.12, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.15);

    osc.start(audioCtx.currentTime);
    osc.stop(audioCtx.currentTime + 0.15);
}

// 弾相殺音 - 軽い「カキン」
function playBulletClashSound() {
    if (!audioCtx) return;
    const t = audioCtx.currentTime;

    // 金属的な高音
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();

    osc.connect(gain);
    gain.connect(getAudioOutput());

    osc.frequency.setValueAtTime(1800, t);
    osc.frequency.exponentialRampToValueAtTime(800, t + 0.05);
    osc.type = 'square';

    gain.gain.setValueAtTime(0.06, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.08);

    osc.start(t);
    osc.stop(t + 0.08);
}

// アイテム取得音 - キラキラした上昇音
function playItemPickupSound() {
    if (!audioCtx) return;
    const t = audioCtx.currentTime;

    const notes = [800, 1000, 1200, 1600];
    notes.forEach((freq, i) => {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();

        osc.connect(gain);
        gain.connect(getAudioOutput());

        osc.frequency.setValueAtTime(freq, t + i * 0.05);
        osc.type = 'sine';

        gain.gain.setValueAtTime(0.1, t + i * 0.05);
        gain.gain.exponentialRampToValueAtTime(0.001, t + i * 0.05 + 0.15);

        osc.start(t + i * 0.05);
        osc.stop(t + i * 0.05 + 0.15);
    });
}

// ラウンド開始音
function playRoundStartSound() {
    if (!audioCtx) return;
    const t = audioCtx.currentTime;

    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();

    osc.connect(gain);
    gain.connect(getAudioOutput());

    osc.frequency.setValueAtTime(440, t);
    osc.frequency.setValueAtTime(880, t + 0.1);
    osc.type = 'sine';

    gain.gain.setValueAtTime(0.15, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.3);

    osc.start(t);
    osc.stop(t + 0.3);
}

// 爆発音 - 重厚な「ドーン」
function playExplosionSound() {
    if (!audioCtx) return;

    // 低音のドーン
    const osc1 = audioCtx.createOscillator();
    const gain1 = audioCtx.createGain();
    osc1.connect(gain1);
    gain1.connect(getAudioOutput());

    osc1.frequency.setValueAtTime(150, audioCtx.currentTime);
    osc1.frequency.exponentialRampToValueAtTime(30, audioCtx.currentTime + 0.5);
    osc1.type = 'sine';
    gain1.gain.setValueAtTime(0.25, audioCtx.currentTime);
    gain1.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.5);

    osc1.start(audioCtx.currentTime);
    osc1.stop(audioCtx.currentTime + 0.5);

    // ノイズ成分（破裂音）
    const bufferSize = audioCtx.sampleRate * 0.3;
    const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.1));
    }

    const noise = audioCtx.createBufferSource();
    const noiseGain = audioCtx.createGain();
    const filter = audioCtx.createBiquadFilter();

    noise.buffer = buffer;
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(2000, audioCtx.currentTime);
    filter.frequency.exponentialRampToValueAtTime(200, audioCtx.currentTime + 0.3);

    noise.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(getAudioOutput());

    noiseGain.gain.setValueAtTime(0.15, audioCtx.currentTime);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.3);

    noise.start(audioCtx.currentTime);

    // 高音のキラキラ
    const osc2 = audioCtx.createOscillator();
    const gain2 = audioCtx.createGain();
    osc2.connect(gain2);
    gain2.connect(getAudioOutput());

    osc2.frequency.setValueAtTime(1200, audioCtx.currentTime);
    osc2.frequency.exponentialRampToValueAtTime(400, audioCtx.currentTime + 0.2);
    osc2.type = 'sine';
    gain2.gain.setValueAtTime(0.08, audioCtx.currentTime);
    gain2.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.2);

    osc2.start(audioCtx.currentTime);
    osc2.stop(audioCtx.currentTime + 0.2);
}

// 勝利音 - 明るいファンファーレ
function playWinSound() {
    if (!audioCtx) return;

    const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
    const times = [0, 0.15, 0.3, 0.45];

    notes.forEach((freq, i) => {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();

        osc.connect(gain);
        gain.connect(getAudioOutput());

        osc.frequency.setValueAtTime(freq, audioCtx.currentTime + times[i]);
        osc.type = 'sine';

        gain.gain.setValueAtTime(0, audioCtx.currentTime + times[i]);
        gain.gain.linearRampToValueAtTime(0.12, audioCtx.currentTime + times[i] + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + times[i] + 0.4);

        osc.start(audioCtx.currentTime + times[i]);
        osc.stop(audioCtx.currentTime + times[i] + 0.4);
    });
}

// 引き分け音 - つまらなそうな残念な音
function playDrawSound() {
    if (!audioCtx) return;
    const t = audioCtx.currentTime;

    // 下降する「ぼよよ〜ん」という音
    const osc1 = audioCtx.createOscillator();
    const gain1 = audioCtx.createGain();

    osc1.connect(gain1);
    gain1.connect(getAudioOutput());

    osc1.frequency.setValueAtTime(400, t);
    osc1.frequency.exponentialRampToValueAtTime(80, t + 0.8);
    osc1.type = 'triangle';

    gain1.gain.setValueAtTime(0.15, t);
    gain1.gain.exponentialRampToValueAtTime(0.001, t + 0.8);

    osc1.start(t);
    osc1.stop(t + 0.8);

    // 不協和音の「ブー」
    const osc2 = audioCtx.createOscillator();
    const gain2 = audioCtx.createGain();

    osc2.connect(gain2);
    gain2.connect(getAudioOutput());

    osc2.frequency.setValueAtTime(95, t + 0.1);
    osc2.type = 'sawtooth';

    gain2.gain.setValueAtTime(0.08, t + 0.1);
    gain2.gain.exponentialRampToValueAtTime(0.001, t + 0.6);

    osc2.start(t + 0.1);
    osc2.stop(t + 0.6);

    // 悲しい下降音階
    const sadNotes = [293.66, 261.63, 220.00]; // D4, C4, A3
    const sadTimes = [0.3, 0.5, 0.7];

    sadNotes.forEach((freq, i) => {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();

        osc.connect(gain);
        gain.connect(getAudioOutput());

        osc.frequency.setValueAtTime(freq, t + sadTimes[i]);
        osc.type = 'sine';

        gain.gain.setValueAtTime(0.1, t + sadTimes[i]);
        gain.gain.exponentialRampToValueAtTime(0.001, t + sadTimes[i] + 0.25);

        osc.start(t + sadTimes[i]);
        osc.stop(t + sadTimes[i] + 0.25);
    });
}

// 剣振り回し音 - シャキン・ヒュンという風切り音
function playSwordSwingSound(isPlayer1) {
    if (!audioCtx) return;
    const t = audioCtx.currentTime;

    // 風切り音（ノイズベース）
    const bufferSize = audioCtx.sampleRate * 0.15;
    const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
        // 最初は強く、徐々に減衰
        const envelope = Math.exp(-i / (bufferSize * 0.3)) * (1 - i / bufferSize);
        data[i] = (Math.random() * 2 - 1) * envelope;
    }

    const noise = audioCtx.createBufferSource();
    const noiseGain = audioCtx.createGain();
    const noiseFilter = audioCtx.createBiquadFilter();

    noise.buffer = buffer;
    noiseFilter.type = 'bandpass';
    noiseFilter.frequency.value = isPlayer1 ? 2500 : 2000;
    noiseFilter.Q.value = 2;

    noise.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(getAudioOutput());

    noiseGain.gain.setValueAtTime(0.08, t);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);

    noise.start(t);

    // 金属的な響き
    const osc = audioCtx.createOscillator();
    const oscGain = audioCtx.createGain();

    osc.connect(oscGain);
    oscGain.connect(getAudioOutput());

    const baseFreq = isPlayer1 ? 1200 : 1000;
    osc.frequency.setValueAtTime(baseFreq, t);
    osc.frequency.exponentialRampToValueAtTime(baseFreq * 0.5, t + 0.1);
    osc.type = 'triangle';

    oscGain.gain.setValueAtTime(0.04, t);
    oscGain.gain.exponentialRampToValueAtTime(0.001, t + 0.1);

    osc.start(t);
    osc.stop(t + 0.1);
}

// 剣ヒット音 - ザシュッという斬撃音
function playSwordHitSound() {
    if (!audioCtx) return;
    const t = audioCtx.currentTime;

    // インパクトノイズ
    const bufferSize = audioCtx.sampleRate * 0.1;
    const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
        const envelope = Math.exp(-i / (bufferSize * 0.1));
        data[i] = (Math.random() * 2 - 1) * envelope;
    }

    const noise = audioCtx.createBufferSource();
    const noiseGain = audioCtx.createGain();
    const noiseFilter = audioCtx.createBiquadFilter();

    noise.buffer = buffer;
    noiseFilter.type = 'highpass';
    noiseFilter.frequency.value = 1000;

    noise.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(getAudioOutput());

    noiseGain.gain.setValueAtTime(0.15, t);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, t + 0.08);

    noise.start(t);

    // 低音のインパクト
    const osc1 = audioCtx.createOscillator();
    const gain1 = audioCtx.createGain();

    osc1.connect(gain1);
    gain1.connect(getAudioOutput());

    osc1.frequency.setValueAtTime(200, t);
    osc1.frequency.exponentialRampToValueAtTime(80, t + 0.1);
    osc1.type = 'sine';

    gain1.gain.setValueAtTime(0.15, t);
    gain1.gain.exponentialRampToValueAtTime(0.001, t + 0.1);

    osc1.start(t);
    osc1.stop(t + 0.1);

    // 高音の金属音
    const osc2 = audioCtx.createOscillator();
    const gain2 = audioCtx.createGain();

    osc2.connect(gain2);
    gain2.connect(getAudioOutput());

    osc2.frequency.setValueAtTime(800, t);
    osc2.frequency.exponentialRampToValueAtTime(400, t + 0.05);
    osc2.type = 'sawtooth';

    gain2.gain.setValueAtTime(0.08, t);
    gain2.gain.exponentialRampToValueAtTime(0.001, t + 0.08);

    osc2.start(t);
    osc2.stop(t + 0.08);
}

// ===== Game State =====
let canvas, ctx;
let gameRunning = false;
let gamePaused = false;  // 開始前の待機状態
let roundTime = CONFIG.ROUND_DURATION;
let lastTime = 0;
let lastShootTime = { player1: 0, player2: 0 };
let winner = null;
let winnerDeclared = false;
let waitingForBulletsClear = false;
const START_DELAY = 1500;  // 開始前の待機時間（ms）

// ===== Round State =====
let currentRound = 1;
let roundWins = { player1: 0, player2: 0 };
let roundEnded = false;
let inRoundInterval = false;
let matchEnded = false;

// ===== Item State =====
let items = [];
let lastItemSpawnTime = 0;

// ===== Player Collision State =====
let lastPlayerCollisionTime = 0;

// ===== Recording State =====
let mediaRecorder = null;
let recordedChunks = [];
let isRecording = false;

// ===== Result Display State (Canvas内描画用) =====
let showResultOnCanvas = false;
let resultDisplayData = {
    text: '',
    color: '#FFFFFF',
    glowColor: '#FFFFFF',
    animationProgress: 0
};

// ===== Game Objects =====
let players = [];
let bullets = [];
let particles = [];
let explosionRings = [];
let screenFlash = { active: false, intensity: 0, color: '#FFFFFF' };
let screenShake = { active: false, intensity: 0 };

// ===== Player Class =====
class Player {
    constructor(id, x, y, color) {
        this.id = id;
        this.x = x;
        this.y = y;
        this.hp = CONFIG.INITIAL_HP;
        this.color = color;
        this.alive = true;

        // プレイヤーごとの個性設定（ベース値）
        const config = PLAYER_CONFIGS[id];
        this.radius = config.radius || CONFIG.PLAYER_RADIUS;  // 個別サイズ優先
        this.baseSpeed = config.speed;
        this.baseShootInterval = config.shootInterval;
        this.bulletsPerShot = config.bulletsPerShot;
        this.bulletSpeed = config.bulletSpeed;
        this.spreadAngle = config.spreadAngle;

        // 剣士タイプ用のプロパティ
        this.isSwordsman = config.isSwordsman || false;
        this.swordLength = config.swordLength || 50;
        this.swordDamage = config.swordDamage || 5;
        this.swordSwingSpeed = config.swordSwingSpeed || 0.15;  // ラジアン/フレーム
        this.swordAngle = Math.random() * Math.PI * 2;  // 現在の剣の角度
        this.lastSwordHitTime = 0;  // 最後にヒットした時間（クールダウン用）
        this.swordHitCooldown = config.swordHitCooldown || 300;  // ヒットのクールダウン(ms)
        this.lastSwordSwingSound = 0;  // 最後に振り回し音を再生した時間

        // アイテム効果用の倍率（デフォルト1倍）
        this.speedMultiplier = 1;
        this.shootIntervalMultiplier = 1;
        this.activeEffects = [];  // 現在有効なエフェクト

        // AI制御用（ランダムな初期方向）
        const angle = Math.random() * Math.PI * 2;
        this.vx = Math.cos(angle) * this.baseSpeed;
        this.vy = Math.sin(angle) * this.baseSpeed;
        this.lastDirectionChange = 0;
        this.targetAngle = angle;
    }

    // 現在の移動速度（アイテム効果込み）
    get speed() {
        return this.baseSpeed * this.speedMultiplier;
    }

    // 現在の発射間隔（アイテム効果込み）
    get shootInterval() {
        return this.baseShootInterval * this.shootIntervalMultiplier;
    }

    // アイテム効果をリセット
    resetEffects() {
        this.speedMultiplier = 1;
        this.shootIntervalMultiplier = 1;
        this.activeEffects = [];
    }

    // 近くの弾を検出して回避方向を計算
    calculateDodgeDirection(enemyBullets) {
        let dodgeX = 0;
        let dodgeY = 0;
        let dangerCount = 0;

        enemyBullets.forEach(bullet => {
            const dx = this.x - bullet.x;
            const dy = this.y - bullet.y;
            const distance = Math.sqrt(dx * dx + dy * dy);

            if (distance < CONFIG.AI_DODGE_DISTANCE && distance > 0) {
                // 弾の進行方向を考慮
                const bulletSpeed = Math.sqrt(bullet.vx * bullet.vx + bullet.vy * bullet.vy);
                const bulletDirX = bullet.vx / bulletSpeed;
                const bulletDirY = bullet.vy / bulletSpeed;

                // 弾がこちらに向かっているかチェック
                const toPlayerX = dx / distance;
                const toPlayerY = dy / distance;
                const dotProduct = bulletDirX * toPlayerX + bulletDirY * toPlayerY;

                if (dotProduct < 0) {  // 弾がこちらに向かっている
                    // 弾から垂直方向に回避（左右どちらかに避ける）
                    const perpX = -bulletDirY;
                    const perpY = bulletDirX;

                    // プレイヤーの位置に応じて左右を選択
                    const side = (perpX * dx + perpY * dy > 0) ? 1 : -1;

                    const urgency = 1 - (distance / CONFIG.AI_DODGE_DISTANCE);
                    dodgeX += perpX * side * urgency * 2;
                    dodgeY += perpY * side * urgency * 2;
                    dangerCount++;
                }
            }
        });

        if (dangerCount > 0) {
            return { x: dodgeX / dangerCount, y: dodgeY / dangerCount, danger: true };
        }
        return { x: 0, y: 0, danger: false };
    }

    // 最も近いアイテムを見つける
    findNearestItem(items) {
        let nearest = null;
        let nearestDistance = Infinity;

        items.forEach(item => {
            if (!item.alive) return;
            const dx = item.x - this.x;
            const dy = item.y - this.y;
            const distance = Math.sqrt(dx * dx + dy * dy);

            if (distance < nearestDistance) {
                nearestDistance = distance;
                nearest = { item, distance, dx, dy };
            }
        });

        return nearest;
    }

    // AI動作: アイテムが近くにある場合のみ取りに行く、それ以外は壁反射で移動
    updateAI(target, enemyBullets, gameItems, timestamp, canvasWidth, canvasHeight) {
        if (!this.alive) return;

        // アイテムをチェック（近くにあれば取りに行く）
        const nearestItem = this.findNearestItem(gameItems);
        if (nearestItem && nearestItem.distance < CONFIG.AI_ITEM_PRIORITY_DISTANCE) {
            const itemDir = nearestItem.distance;
            if (itemDir > 0) {
                const moveX = nearestItem.dx / itemDir;
                const moveY = nearestItem.dy / itemDir;
                this.vx = moveX * this.speed;
                this.vy = moveY * this.speed;
            }
        }
        // それ以外は何もしない（壁で反射するランダムな動きを継続）
    }

    update(canvasWidth, canvasHeight, timestamp) {
        if (!this.alive) return;

        // 速度を現在のspeedに合わせて正規化
        const currentSpeed = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
        if (currentSpeed > 0) {
            this.vx = (this.vx / currentSpeed) * this.speed;
            this.vy = (this.vy / currentSpeed) * this.speed;
        }

        // Move
        this.x += this.vx;
        this.y += this.vy;

        // Bounce off walls (上部はHP表示エリア80pxを避ける)
        const topBoundary = 80;
        if (this.x - this.radius <= 0 || this.x + this.radius >= canvasWidth) {
            this.vx *= -1;
            this.x = Math.max(this.radius, Math.min(canvasWidth - this.radius, this.x));
        }
        if (this.y - this.radius <= topBoundary || this.y + this.radius >= canvasHeight) {
            this.vy *= -1;
            this.y = Math.max(topBoundary + this.radius, Math.min(canvasHeight - this.radius, this.y));
        }

        // 剣士の場合、剣を回転
        if (this.isSwordsman) {
            this.swordAngle += this.swordSwingSpeed;
            if (this.swordAngle > Math.PI * 2) {
                this.swordAngle -= Math.PI * 2;
            }

            // 一定間隔で振り回し音を再生
            if (timestamp - this.lastSwordSwingSound > 400) {
                this.lastSwordSwingSound = timestamp;
                playSwordSwingSound(this.id === 'player1');
            }
        }
    }

    draw(ctx) {
        if (!this.alive) return;

        // 剣士の場合、剣を描画（プレイヤーの後ろに描画するため先に描く）
        if (this.isSwordsman) {
            this.drawSword(ctx);
        }

        // シンプルな単色円
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = this.color.main;
        ctx.fill();
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 2;
        ctx.stroke();

        // HP Text（サイズに応じたフォント）
        ctx.fillStyle = '#fff';
        const fontSize = Math.floor(this.radius * 1.1);
        ctx.font = `bold ${fontSize}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(this.hp.toString(), this.x, this.y);
    }

    // 剣を描画
    drawSword(ctx) {
        const swordStartX = this.x + Math.cos(this.swordAngle) * this.radius;
        const swordStartY = this.y + Math.sin(this.swordAngle) * this.radius;
        const swordEndX = this.x + Math.cos(this.swordAngle) * (this.radius + this.swordLength);
        const swordEndY = this.y + Math.sin(this.swordAngle) * (this.radius + this.swordLength);

        // 剣の軌跡エフェクト（残像）
        ctx.save();
        for (let i = 3; i >= 0; i--) {
            const trailAngle = this.swordAngle - this.swordSwingSpeed * (i + 1) * 2;
            const trailStartX = this.x + Math.cos(trailAngle) * this.radius;
            const trailStartY = this.y + Math.sin(trailAngle) * this.radius;
            const trailEndX = this.x + Math.cos(trailAngle) * (this.radius + this.swordLength);
            const trailEndY = this.y + Math.sin(trailAngle) * (this.radius + this.swordLength);

            ctx.globalAlpha = 0.1 * (3 - i);
            ctx.beginPath();
            ctx.moveTo(trailStartX, trailStartY);
            ctx.lineTo(trailEndX, trailEndY);
            ctx.strokeStyle = this.color.light;
            ctx.lineWidth = 4;
            ctx.lineCap = 'round';
            ctx.stroke();
        }
        ctx.restore();

        // 剣本体（刀身）
        ctx.beginPath();
        ctx.moveTo(swordStartX, swordStartY);
        ctx.lineTo(swordEndX, swordEndY);

        // グラデーションで刀身を表現
        const gradient = ctx.createLinearGradient(swordStartX, swordStartY, swordEndX, swordEndY);
        gradient.addColorStop(0, '#888888');
        gradient.addColorStop(0.3, '#FFFFFF');
        gradient.addColorStop(0.7, '#DDDDDD');
        gradient.addColorStop(1, '#AAAAAA');

        ctx.strokeStyle = gradient;
        ctx.lineWidth = 6;
        ctx.lineCap = 'round';
        ctx.stroke();

        // 刀身の輪郭
        ctx.strokeStyle = '#333333';
        ctx.lineWidth = 1;
        ctx.stroke();

        // 剣先のハイライト
        ctx.beginPath();
        ctx.arc(swordEndX, swordEndY, 4, 0, Math.PI * 2);
        ctx.fillStyle = '#FFFFFF';
        ctx.fill();
    }

    // 剣の当たり判定（敵プレイヤーとの衝突チェック）
    checkSwordCollision(enemy) {
        if (!this.isSwordsman || !this.alive || !enemy.alive) return false;

        // 剣の先端位置
        const swordEndX = this.x + Math.cos(this.swordAngle) * (this.radius + this.swordLength);
        const swordEndY = this.y + Math.sin(this.swordAngle) * (this.radius + this.swordLength);

        // 剣の線分と敵の円との衝突判定
        // 剣の始点
        const swordStartX = this.x + Math.cos(this.swordAngle) * this.radius;
        const swordStartY = this.y + Math.sin(this.swordAngle) * this.radius;

        // 線分と円の最近接点を計算
        const dx = swordEndX - swordStartX;
        const dy = swordEndY - swordStartY;
        const fx = swordStartX - enemy.x;
        const fy = swordStartY - enemy.y;

        const a = dx * dx + dy * dy;
        const b = 2 * (fx * dx + fy * dy);
        const c = (fx * fx + fy * fy) - enemy.radius * enemy.radius;

        let discriminant = b * b - 4 * a * c;

        if (discriminant >= 0) {
            discriminant = Math.sqrt(discriminant);
            const t1 = (-b - discriminant) / (2 * a);
            const t2 = (-b + discriminant) / (2 * a);

            // tが0～1の範囲内なら線分上で交差
            if ((t1 >= 0 && t1 <= 1) || (t2 >= 0 && t2 <= 1)) {
                return true;
            }
        }

        return false;
    }

    takeDamage(amount) {
        this.hp -= amount;
        if (this.hp <= 0 && this.alive) {
            this.hp = 0;
            this.alive = false;
            this.explode();

            // ゲーム終了処理
            if (!winnerDeclared) {
                winnerDeclared = true;
                gameRunning = false;
                bullets = []; // 残りの弾をクリア

                // 勝者を特定（自分が死んだので相手が勝者）
                const winnerId = this.id === 'player1' ? 'player2' : 'player1';
                const winnerPlayer = players.find(p => p.id === winnerId);

                // 爆発エフェクト終了後にWIN表示（約1.5秒後）
                setTimeout(() => {
                    if (winnerPlayer && winnerPlayer.alive) {
                        showWinner(winnerPlayer);
                    } else {
                        // 両方死んだ場合は引き分け
                        showDraw();
                    }
                }, 1500);
            }
        }
    }

    explode() {
        // 爆発音
        playExplosionSound();

        // 画面フラッシュ
        screenFlash = { active: true, intensity: 1, color: this.color.light };

        // 画面シェイク
        screenShake = { active: true, intensity: 30 };

        // 第1波: 中心から高速で飛ぶ大きなパーティクル（メインカラー）
        for (let i = 0; i < 100; i++) {
            const angle = (Math.PI * 2 / 100) * i + Math.random() * 0.3;
            const speed = 10 + Math.random() * 15;
            particles.push(new Particle(
                this.x,
                this.y,
                Math.cos(angle) * speed,
                Math.sin(angle) * speed,
                this.color.main,
                25 + Math.random() * 35,
                0.006 + Math.random() * 0.006
            ));
        }

        // 第2波: 白い閃光パーティクル（中心から）
        for (let i = 0; i < 80; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 6 + Math.random() * 10;
            particles.push(new Particle(
                this.x,
                this.y,
                Math.cos(angle) * speed,
                Math.sin(angle) * speed,
                '#FFFFFF',
                20 + Math.random() * 25,
                0.012 + Math.random() * 0.008
            ));
        }

        // 第3波: 遅い大きなパーティクル（煙・残光効果）
        for (let i = 0; i < 60; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 1 + Math.random() * 4;
            particles.push(new Particle(
                this.x + (Math.random() - 0.5) * 50,
                this.y + (Math.random() - 0.5) * 50,
                Math.cos(angle) * speed,
                Math.sin(angle) * speed,
                this.color.light,
                40 + Math.random() * 50,
                0.004 + Math.random() * 0.004
            ));
        }

        // 第4波: 小さな高速火花
        for (let i = 0; i < 150; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 3 + Math.random() * 20;
            particles.push(new Particle(
                this.x,
                this.y,
                Math.cos(angle) * speed,
                Math.sin(angle) * speed,
                this.color.dark,
                4 + Math.random() * 10,
                0.008 + Math.random() * 0.015
            ));
        }

        // 第5波: キラキラ光る粒子
        for (let i = 0; i < 50; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 2 + Math.random() * 8;
            particles.push(new Particle(
                this.x,
                this.y,
                Math.cos(angle) * speed,
                Math.sin(angle) * speed,
                '#FFFF00',
                3 + Math.random() * 6,
                0.01 + Math.random() * 0.01
            ));
        }

        // 爆発リング（複数）
        explosionRings.push({
            x: this.x,
            y: this.y,
            radius: 10,
            maxRadius: 400,
            color: this.color.main,
            lineWidth: 20,
            life: 1,
            speed: 12
        });

        // 少し遅れて2つ目のリング
        setTimeout(() => {
            explosionRings.push({
                x: this.x,
                y: this.y,
                radius: 5,
                maxRadius: 300,
                color: '#FFFFFF',
                lineWidth: 15,
                life: 1,
                speed: 10
            });
        }, 50);

        // さらに遅れて3つ目のリング
        setTimeout(() => {
            explosionRings.push({
                x: this.x,
                y: this.y,
                radius: 5,
                maxRadius: 250,
                color: this.color.light,
                lineWidth: 10,
                life: 1,
                speed: 8
            });
        }, 100);
    }
}

// ===== Bullet Class =====
class Bullet {
    constructor(x, y, vx, vy, color, ownerId) {
        this.x = x;
        this.y = y;
        this.vx = vx;
        this.vy = vy;
        this.radius = CONFIG.BULLET_RADIUS;
        this.color = color;
        this.ownerId = ownerId;
        this.alive = true;
        this.trail = [];
    }

    update(canvasWidth, canvasHeight) {
        // Store trail position
        this.trail.push({ x: this.x, y: this.y });
        if (this.trail.length > 5) this.trail.shift();

        // Move
        this.x += this.vx;
        this.y += this.vy;

        // 壁で消滅 (上部はHP表示エリア80pxを含む)
        const topBoundary = 80;
        if (this.x - this.radius <= 0 || this.x + this.radius >= canvasWidth) {
            this.alive = false;
        }
        if (this.y - this.radius <= topBoundary || this.y + this.radius >= canvasHeight) {
            this.alive = false;
        }
    }

    draw(ctx) {
        // シンプルな単色円
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = this.color;
        ctx.fill();
    }

    checkCollision(player) {
        if (player.id === this.ownerId || !player.alive) return false;

        const dx = this.x - player.x;
        const dy = this.y - player.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        return distance < this.radius + player.radius;
    }
}

// ===== Item Class =====
class Item {
    constructor(x, y, type) {
        this.x = x;
        this.y = y;
        this.type = type;
        this.config = ITEM_TYPES[type];
        this.radius = CONFIG.ITEM_RADIUS;
        this.alive = true;
        this.pulsePhase = 0;
        this.spawnTime = performance.now();
    }

    update() {
        this.pulsePhase += 0.1;
    }

    draw(ctx) {
        // シンプルな単色円
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = this.config.color;
        ctx.fill();
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 2;
        ctx.stroke();

        // アイコン
        ctx.fillStyle = '#000';
        ctx.font = `bold ${this.radius}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(this.config.icon, this.x, this.y);
    }

    checkCollision(player) {
        if (!player.alive) return false;
        const dx = this.x - player.x;
        const dy = this.y - player.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        return distance < this.radius + player.radius;
    }
}

// ===== Particle Class (for explosions) =====
class Particle {
    constructor(x, y, vx, vy, color, size, decay = null) {
        this.x = x;
        this.y = y;
        this.vx = vx;
        this.vy = vy;
        this.color = color;
        this.size = size;
        this.life = 1;
        this.decay = decay !== null ? decay : (0.02 + Math.random() * 0.02);
    }

    update() {
        this.x += this.vx;
        this.y += this.vy;
        this.vx *= 0.98;
        this.vy *= 0.98;
        this.life -= this.decay;
    }

    draw(ctx) {
        ctx.globalAlpha = this.life;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size * this.life, 0, Math.PI * 2);
        ctx.fillStyle = this.color;
        ctx.fill();
        ctx.globalAlpha = 1;
    }

    get alive() {
        return this.life > 0;
    }
}

// ===== Shooting Logic =====
function shoot(player, target, timestamp) {
    // 剣士タイプは弾を撃たない
    if (player.isSwordsman) return;

    const key = player.id;
    // プレイヤーごとの発射間隔を使用
    if (timestamp - lastShootTime[key] < player.shootInterval) return;
    lastShootTime[key] = timestamp;

    // 発射音
    playShootSound(player.id === 'player1');

    // 弾幕パターン: プレイヤーごとの設定で扇状に発射
    const baseAngle = Math.atan2(target.y - player.y, target.x - player.x);

    for (let i = 0; i < player.bulletsPerShot; i++) {
        const angle = baseAngle + (i - (player.bulletsPerShot - 1) / 2) * (player.spreadAngle / player.bulletsPerShot);
        const vx = Math.cos(angle) * player.bulletSpeed;
        const vy = Math.sin(angle) * player.bulletSpeed;

        bullets.push(new Bullet(
            player.x + Math.cos(angle) * player.radius,
            player.y + Math.sin(angle) * player.radius,
            vx,
            vy,
            player.color.bullet,
            player.id
        ));
    }
}

// ===== Recording Functions =====
function startRecording() {
    // ビデオストリーム（Canvas）
    const videoStream = canvas.captureStream(60); // 60fps

    // オーディオとビデオを結合したストリームを作成
    let combinedStream;
    if (audioDestination && audioDestination.stream) {
        // オーディオトラックを追加
        combinedStream = new MediaStream([
            ...videoStream.getVideoTracks(),
            ...audioDestination.stream.getAudioTracks()
        ]);
    } else {
        combinedStream = videoStream;
    }

    const options = {
        mimeType: 'video/webm;codecs=vp9,opus',  // VP9動画 + Opusオーディオ
        videoBitsPerSecond: 8000000,  // 8Mbps（高画質）
        audioBitsPerSecond: 128000    // 128kbps オーディオ
    };
    if (!MediaRecorder.isTypeSupported(options.mimeType)) {
        options.mimeType = 'video/webm';
    }

    mediaRecorder = new MediaRecorder(combinedStream, options);
    recordedChunks = [];

    mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
            recordedChunks.push(event.data);
        }
    };

    mediaRecorder.onstop = () => {
        downloadRecording();
    };

    mediaRecorder.start();
    isRecording = true;
    console.log('Recording started');
}

function stopRecording() {
    if (mediaRecorder && isRecording) {
        mediaRecorder.stop();
        isRecording = false;
        console.log('Recording stopped');
    }
}

function downloadRecording() {
    const blob = new Blob(recordedChunks, { type: 'video/webm' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    a.download = `DualSpheres_${timestamp}.webm`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    console.log('Recording downloaded');
}

// ===== Game Functions =====
function initGame() {
    canvas = document.getElementById('gameCanvas');
    ctx = canvas.getContext('2d');

    // オーディオ初期化（ユーザー操作後に有効化）
    document.addEventListener('click', initAudio, { once: true });
    document.addEventListener('keydown', initAudio, { once: true });

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // スタートボタンのクリックハンドラ
    const startButton = document.getElementById('startButton');
    const startOverlay = document.getElementById('startOverlay');
    if (startButton) {
        startButton.addEventListener('click', () => {
            startGameWithRecording();
            startOverlay.classList.add('hidden');
        });
    }
}

// ゲームと録画を同時に開始
function startGameWithRecording() {
    initAudio();
    resetGame();

    // 最初は一時停止状態で開始
    gameRunning = true;
    gamePaused = true;
    lastTime = performance.now();

    // 録画開始
    startRecording();

    // 1.5秒後にゲーム開始
    setTimeout(() => {
        gamePaused = false;
        playRoundStartSound();
    }, START_DELAY);

    requestAnimationFrame(gameLoop);
}

function resizeCanvas() {
    // 正方形フィールド
    canvas.width = 540;
    canvas.height = 540;
}

// マッチ全体のリセット（3ラウンド制の開始）
function resetMatch() {
    currentRound = 1;
    roundWins = { player1: 0, player2: 0 };
    matchEnded = false;
    resetRound();
}

// ラウンドのリセット
function resetRound() {
    roundTime = CONFIG.ROUND_DURATION;
    bullets = [];
    particles = [];
    explosionRings = [];
    items = [];
    screenFlash = { active: false, intensity: 0, color: '#FFFFFF' };
    screenShake = { active: false, intensity: 0 };
    winner = null;
    winnerDeclared = false;
    waitingForBulletsClear = false;
    roundEnded = false;
    inRoundInterval = false;
    lastItemSpawnTime = performance.now();
    lastPlayerCollisionTime = 0;
    showResultOnCanvas = false;
    resultDisplayData = { text: '', color: '#FFFFFF', glowColor: '#FFFFFF', animationProgress: 0 };
    gamePaused = false;

    const margin = CONFIG.PLAYER_RADIUS + 50;
    const topMargin = 100;  // HP表示エリアの下から開始

    players = [
        new Player(
            'player1',
            margin + Math.random() * (canvas.width / 4),
            topMargin + Math.random() * (canvas.height - topMargin - margin),
            COLORS.player1
        ),
        new Player(
            'player2',
            canvas.width - margin - Math.random() * (canvas.width / 4),
            topMargin + Math.random() * (canvas.height - topMargin - margin),
            COLORS.player2
        ),
    ];

    updateUI();
    document.getElementById('resultOverlay').classList.remove('show');
}

// 旧互換性のためのエイリアス
function resetGame() {
    resetMatch();
}

// ラウンド終了処理
function endRound(winnerId) {
    if (roundEnded) return;
    roundEnded = true;
    gameRunning = false;

    if (winnerId && winnerId !== 'draw') {
        roundWins[winnerId]++;
    }

    // 勝敗チェック（2本先取）
    if (roundWins.player1 >= 2 || roundWins.player2 >= 2) {
        matchEnded = true;
    }
}

// 次のラウンドへ
function startNextRound() {
    if (matchEnded) return;

    currentRound++;
    inRoundInterval = false;
    gameRunning = true;
    resetRound();
}

// アイテムをスポーン
function spawnItem() {
    const itemTypes = Object.keys(ITEM_TYPES);
    const randomType = itemTypes[Math.floor(Math.random() * itemTypes.length)];

    const margin = CONFIG.ITEM_RADIUS + 30;
    const x = margin + Math.random() * (canvas.width - margin * 2);
    const y = margin + Math.random() * (canvas.height - margin * 2);

    items.push(new Item(x, y, randomType));
}

// アイテム効果を適用
function applyItemEffect(player, item) {
    item.config.effect(player);
    player.activeEffects.push({
        type: item.type,
        name: item.config.name,
        startTime: performance.now(),
        duration: item.config.duration,
    });

    // 効果終了タイマー
    setTimeout(() => {
        removeItemEffect(player, item.type);
    }, item.config.duration);
}

// アイテム効果を解除
function removeItemEffect(player, itemType) {
    const config = ITEM_TYPES[itemType];

    // 効果をリセット（該当するもののみ）
    if (itemType === 'rapidFire') {
        player.shootIntervalMultiplier = 1;
    } else if (itemType === 'speedUp') {
        player.speedMultiplier = 1;
    }

    // activeEffectsから削除
    player.activeEffects = player.activeEffects.filter(e => e.type !== itemType);
}

function updateUI() {
    document.getElementById('hp1').textContent = players[0].hp;
    document.getElementById('hp2').textContent = players[1].hp;
    // タイマーとラウンド表示は非表示のため更新不要
}

function endGame(winnerId) {
    endRound(winnerId);
}

function showWinner(winnerPlayer) {
    // 勝利音
    playWinSound();

    // Canvas内に結果を表示（録画に含める）
    const playerName = winnerPlayer.id === 'player1' ? 'Player1' : 'Player2';
    showResultOnCanvas = true;
    resultDisplayData = {
        text: `${playerName}\nWIN!`,
        color: winnerPlayer.color.light,
        glowColor: winnerPlayer.color.main,
        animationProgress: 0
    };

    // 少し待ってから録画を停止（WIN表示を含めるため）
    setTimeout(() => {
        stopRecording();
    }, 2500);
}

// ===== Game Loop =====
function gameLoop(timestamp) {
    const deltaTime = (timestamp - lastTime) / 1000;
    lastTime = timestamp;

    // エフェクトの更新（ゲーム終了後も継続）
    updateEffects();

    // 一時停止中は描画のみ（ゲームロジックは更新しない）
    if (gamePaused) {
        draw();
        requestAnimationFrame(gameLoop);
        return;
    }

    if (gameRunning) {
        // Update timer（ラウンド制が有効な場合のみ）
        if (CONFIG.ROUND_ENABLED) {
            roundTime -= deltaTime;
            if (roundTime <= 0) {
                roundTime = 0;
                updateUI();

                // Determine winner by HP
                if (players[0].hp > players[1].hp) {
                    endGame('player1');
                } else if (players[1].hp > players[0].hp) {
                    endGame('player2');
                } else {
                    endGame('draw');
                }
            }
        }

        // AI動作: プレイヤーごとに敵の弾を取得して回避・追跡・アイテム取得
        const player1Bullets = bullets.filter(b => b.ownerId === 'player1');
        const player2Bullets = bullets.filter(b => b.ownerId === 'player2');

        if (players[0].alive && players[1].alive) {
            players[0].updateAI(players[1], player2Bullets, items, timestamp, canvas.width, canvas.height);
            players[1].updateAI(players[0], player1Bullets, items, timestamp, canvas.width, canvas.height);
        }

        // Update players
        players.forEach(player => player.update(canvas.width, canvas.height, timestamp));

        // 剣の当たり判定（剣士タイプの場合）
        players.forEach((player, index) => {
            if (player.isSwordsman && player.alive) {
                const enemy = players[1 - index];
                if (enemy.alive && player.checkSwordCollision(enemy)) {
                    // クールダウンチェック
                    if (timestamp - player.lastSwordHitTime > player.swordHitCooldown) {
                        player.lastSwordHitTime = timestamp;
                        enemy.takeDamage(player.swordDamage);
                        playSwordHitSound();

                        // ヒットエフェクト（斬撃パーティクル）
                        const hitAngle = player.swordAngle;
                        for (let i = 0; i < 8; i++) {
                            const particleAngle = hitAngle + (Math.random() - 0.5) * 1;
                            const speed = 3 + Math.random() * 5;
                            particles.push(new Particle(
                                enemy.x, enemy.y,
                                Math.cos(particleAngle) * speed,
                                Math.sin(particleAngle) * speed,
                                '#FFFFFF',
                                6 + Math.random() * 6,
                                0.04
                            ));
                        }
                        // 斬撃ラインエフェクト
                        for (let i = 0; i < 3; i++) {
                            const lineAngle = hitAngle + (Math.random() - 0.5) * 0.5;
                            particles.push(new Particle(
                                enemy.x, enemy.y,
                                Math.cos(lineAngle) * 8,
                                Math.sin(lineAngle) * 8,
                                player.color.light,
                                3,
                                0.06
                            ));
                        }
                    }
                }
            }
        });

        // プレイヤー同士の衝突判定
        if (players[0].alive && players[1].alive) {
            const dx = players[0].x - players[1].x;
            const dy = players[0].y - players[1].y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            const minDistance = players[0].radius + players[1].radius;

            if (distance < minDistance && timestamp - lastPlayerCollisionTime > CONFIG.PLAYER_COLLISION_COOLDOWN) {
                lastPlayerCollisionTime = timestamp;

                // 両者にダメージ
                players[0].takeDamage(CONFIG.PLAYER_COLLISION_DAMAGE);
                players[1].takeDamage(CONFIG.PLAYER_COLLISION_DAMAGE);

                // 衝突音
                playHitSound();

                // ノックバック（速度を反転して弾き飛ばす）
                if (distance > 0) {
                    const knockbackForce = 8;
                    const normalX = dx / distance;
                    const normalY = dy / distance;

                    // 速度を反転
                    players[0].vx = normalX * knockbackForce;
                    players[0].vy = normalY * knockbackForce;
                    players[1].vx = -normalX * knockbackForce;
                    players[1].vy = -normalY * knockbackForce;

                    // 重なりを解消
                    const overlap = minDistance - distance;
                    const pushX = normalX * overlap * 0.5;
                    const pushY = normalY * overlap * 0.5;
                    players[0].x += pushX;
                    players[0].y += pushY;
                    players[1].x -= pushX;
                    players[1].y -= pushY;
                }

                // 衝突パーティクル
                const midX = (players[0].x + players[1].x) / 2;
                const midY = (players[0].y + players[1].y) / 2;
                for (let i = 0; i < 10; i++) {
                    const angle = Math.random() * Math.PI * 2;
                    particles.push(new Particle(
                        midX, midY,
                        Math.cos(angle) * 5,
                        Math.sin(angle) * 5,
                        '#FFFFFF',
                        8,
                        0.04
                    ));
                }
            }
        }

        // Shooting
        if (players[0].alive && players[1].alive) {
            shoot(players[0], players[1], timestamp);
            shoot(players[1], players[0], timestamp);
        }

        // Update bullets and check collision
        processBullets();

        // Remove dead bullets
        bullets = bullets.filter(b => b.alive);

        // アイテムのスポーン（まれに）
        if (timestamp - lastItemSpawnTime > CONFIG.ITEM_SPAWN_INTERVAL) {
            lastItemSpawnTime = timestamp;
            if (Math.random() < CONFIG.ITEM_SPAWN_CHANCE) {
                spawnItem();
            }
        }

        // アイテムの更新と取得判定
        items.forEach(item => {
            item.update();
            players.forEach(player => {
                if (item.alive && item.checkCollision(player)) {
                    item.alive = false;
                    applyItemEffect(player, item);
                    playItemPickupSound();

                    // 取得エフェクト
                    for (let i = 0; i < 12; i++) {
                        const angle = (Math.PI * 2 / 12) * i;
                        particles.push(new Particle(
                            item.x, item.y,
                            Math.cos(angle) * 3,
                            Math.sin(angle) * 3,
                            item.config.color,
                            8,
                            0.03
                        ));
                    }
                }
            });
        });
        items = items.filter(item => item.alive);

        // Update UI
        updateUI();
    }

    // ゲーム終了後の処理（パーティクルのみ更新）
    if (!gameRunning) {
        particles.forEach(p => p.update());
        particles = particles.filter(p => p.alive);
    } else {
        // ゲーム中のパーティクル更新
        particles.forEach(p => p.update());
        particles = particles.filter(p => p.alive);
    }

    // Draw
    draw();

    requestAnimationFrame(gameLoop);
}

// 弾の更新と当たり判定（ゲーム中用）
function processBullets() {
    bullets.forEach(bullet => {
        bullet.update(canvas.width, canvas.height);

        // Check collision with players
        players.forEach(player => {
            if (bullet.checkCollision(player)) {
                player.takeDamage(CONFIG.BULLET_DAMAGE);
                bullet.alive = false;

                // 被弾音
                playHitSound();

                // Hit particles
                for (let i = 0; i < 5; i++) {
                    particles.push(new Particle(
                        bullet.x, bullet.y,
                        (Math.random() - 0.5) * 4,
                        (Math.random() - 0.5) * 4,
                        bullet.color,
                        5
                    ));
                }
            }
        });
    });

    // 弾同士の相殺判定（無効化中 - 有効にするにはコメント解除）
    // checkBulletCollisions();
}

// 弾同士の相殺
function checkBulletCollisions() {
    for (let i = 0; i < bullets.length; i++) {
        if (!bullets[i].alive) continue;

        for (let j = i + 1; j < bullets.length; j++) {
            if (!bullets[j].alive) continue;

            // 異なるプレイヤーの弾同士のみ相殺
            if (bullets[i].ownerId === bullets[j].ownerId) continue;

            const dx = bullets[i].x - bullets[j].x;
            const dy = bullets[i].y - bullets[j].y;
            const distance = Math.sqrt(dx * dx + dy * dy);

            if (distance < bullets[i].radius + bullets[j].radius) {
                // 両方の弾を消す
                bullets[i].alive = false;
                bullets[j].alive = false;

                // 相殺エフェクト（中間地点でパーティクル）
                const midX = (bullets[i].x + bullets[j].x) / 2;
                const midY = (bullets[i].y + bullets[j].y) / 2;

                // 両方の色のパーティクル
                for (let k = 0; k < 8; k++) {
                    const angle = (Math.PI * 2 / 8) * k;
                    const speed = 2 + Math.random() * 3;
                    particles.push(new Particle(
                        midX, midY,
                        Math.cos(angle) * speed,
                        Math.sin(angle) * speed,
                        bullets[i].color,
                        4 + Math.random() * 4,
                        0.03
                    ));
                    particles.push(new Particle(
                        midX, midY,
                        Math.cos(angle + 0.4) * speed,
                        Math.sin(angle + 0.4) * speed,
                        bullets[j].color,
                        4 + Math.random() * 4,
                        0.03
                    ));
                }

                // 相殺音（軽い音）
                playBulletClashSound();
            }
        }
    }
}

// 引き分け表示
function showDraw() {
    playDrawSound();

    // Canvas内に結果を表示（録画に含める）
    showResultOnCanvas = true;
    resultDisplayData = {
        text: 'DRAW',
        color: '#AAAAAA',
        glowColor: '#888888',
        animationProgress: 0
    };

    // 少し待ってから録画を停止（DRAW表示を含めるため）
    setTimeout(() => {
        stopRecording();
    }, 2500);
}

function updateEffects() {
    // 画面フラッシュの減衰
    if (screenFlash.active) {
        screenFlash.intensity -= 0.03;
        if (screenFlash.intensity <= 0) {
            screenFlash.active = false;
            screenFlash.intensity = 0;
        }
    }

    // 画面シェイクの減衰
    if (screenShake.active) {
        screenShake.intensity *= 0.9;
        if (screenShake.intensity < 0.5) {
            screenShake.active = false;
            screenShake.intensity = 0;
        }
    }

    // 爆発リングの更新
    explosionRings.forEach(ring => {
        ring.radius += ring.speed;
        ring.life -= 0.02;
        ring.lineWidth *= 0.97;
    });
    explosionRings = explosionRings.filter(ring => ring.life > 0 && ring.radius < ring.maxRadius);
}

function draw() {
    // 画面シェイク適用
    ctx.save();
    if (screenShake.active) {
        const shakeX = (Math.random() - 0.5) * screenShake.intensity;
        const shakeY = (Math.random() - 0.5) * screenShake.intensity;
        ctx.translate(shakeX, shakeY);
    }

    // Clear canvas（シンプルな単色背景）
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(-50, -50, canvas.width + 100, canvas.height + 100);

    // Draw explosion rings（シンプルな円）
    explosionRings.forEach(ring => {
        ctx.globalAlpha = ring.life;
        ctx.beginPath();
        ctx.arc(ring.x, ring.y, ring.radius, 0, Math.PI * 2);
        ctx.strokeStyle = ring.color;
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.globalAlpha = 1;
    });

    // Draw items
    items.forEach(item => item.draw(ctx));

    // Draw bullets
    bullets.forEach(bullet => bullet.draw(ctx));

    // Draw players
    players.forEach(player => player.draw(ctx));

    // Draw active effects indicator
    players.forEach(player => {
        if (player.alive && player.activeEffects.length > 0) {
            ctx.fillStyle = '#FFFFFF';
            ctx.font = '12px sans-serif';
            ctx.textAlign = 'center';
            const effectIcons = player.activeEffects.map(e => ITEM_TYPES[e.type].icon).join('');
            ctx.fillText(effectIcons, player.x, player.y - player.radius - 10);
        }
    });

    // Draw particles
    particles.forEach(p => p.draw(ctx));

    ctx.restore();

    // 画面フラッシュ（最前面）
    if (screenFlash.active) {
        ctx.globalAlpha = screenFlash.intensity * 0.8;
        ctx.fillStyle = screenFlash.color;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.globalAlpha = 1;
    }

    // ===== HP表示（Canvas上部） =====
    drawHPDisplay();

    // ===== 結果表示（WIN/DRAW） =====
    if (showResultOnCanvas) {
        drawResultOnCanvas();
    }
}

// HP表示をCanvas内に描画
function drawHPDisplay() {
    const padding = 20;
    const topY = 35;

    // 背景バー
    ctx.fillStyle = '#222';
    ctx.fillRect(0, 0, canvas.width, 60);

    // Player 1 (左側)
    if (players[0]) {
        ctx.font = 'bold 12px sans-serif';
        ctx.fillStyle = COLORS.player1.main;
        ctx.textAlign = 'center';
        ctx.fillText('P1', padding + 30, topY - 12);

        ctx.font = 'bold 32px sans-serif';
        ctx.fillText(players[0].hp.toString(), padding + 30, topY + 15);
    }

    // Player 2 (右側)
    if (players[1]) {
        ctx.font = 'bold 12px sans-serif';
        ctx.fillStyle = COLORS.player2.main;
        ctx.textAlign = 'center';
        ctx.fillText('P2', canvas.width - padding - 30, topY - 12);

        ctx.font = 'bold 32px sans-serif';
        ctx.fillText(players[1].hp.toString(), canvas.width - padding - 30, topY + 15);
    }
}

// 結果をCanvas内に描画
function drawResultOnCanvas() {
    // 背景オーバーレイ
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // テキスト描画
    ctx.font = 'bold 48px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = resultDisplayData.color;

    // 2行に分けて描画
    const lines = resultDisplayData.text.split('\n');
    if (lines.length === 2) {
        ctx.fillText(lines[0], canvas.width / 2, canvas.height / 2 - 30);
        ctx.fillText(lines[1], canvas.width / 2, canvas.height / 2 + 30);
    } else {
        ctx.fillText(resultDisplayData.text, canvas.width / 2, canvas.height / 2);
    }
}

// ===== Start Game =====
window.addEventListener('load', initGame);
