// ===== Game Configuration =====
const CONFIG = {
    ROUND_ENABLED: false,    // ラウンド制を無効化
    ROUND_DURATION: 9999,    // 実質無限（ラウンド無効時）
    TOTAL_ROUNDS: 3,         // 全ラウンド数（無効時は使用しない）
    ROUND_INTERVAL: 2,       // ラウンド間のインターバル（秒）
    INITIAL_HP: 50,
    BULLET_DAMAGE: 1,
    BULLET_RADIUS: 8,
    PLAYER_RADIUS: 25,
    ITEM_SPAWN_INTERVAL: 3000,  // アイテム出現チェック間隔（ms）
    ITEM_SPAWN_CHANCE: 0.3,     // アイテム出現確率（30%）
    ITEM_RADIUS: 20,
    ITEM_DURATION: 8000,        // アイテム効果持続時間（ms）
    // AI動作設定
    AI_DODGE_DISTANCE: 100,     // 弾を回避し始める距離
    AI_ITEM_PRIORITY_DISTANCE: 500, // アイテムを優先する距離
    AI_DIRECTION_CHANGE_INTERVAL: 500, // 方向転換のインターバル（ms）
    // プレイヤー衝突設定
    PLAYER_COLLISION_DAMAGE: 5,       // 衝突時のダメージ
    PLAYER_COLLISION_COOLDOWN: 500,   // 衝突ダメージのクールダウン（ms）
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
        // ピンク: 素早く動き、少ない弾を高速連射するスピードタイプ
        speed: 6,
        shootInterval: 500,      // 連射が速い
        bulletsPerShot: 3,       // 弾数少なめ
        bulletSpeed: 7,          // 弾が速い
        spreadAngle: Math.PI / 8, // 狭い扇形
    },
    player2: {
        // ミント: ゆっくり動き、大量の弾をばらまくパワータイプ
        speed: 2.5,
        shootInterval: 800,      // 連射が遅い
        bulletsPerShot: 8,       // 弾数多め
        bulletSpeed: 4,          // 弾が遅い
        spreadAngle: Math.PI / 2, // 広い扇形
    },
};

// ===== Colors (Pastel) =====
const COLORS = {
    player1: {
        main: '#FF8FAB',
        light: '#FFB5C5',
        dark: '#E75480',
        bullet: '#FF69B4',
    },
    player2: {
        main: '#7DFFB3',
        light: '#B5FFCF',
        dark: '#3CB371',
        bullet: '#00FF7F',
    },
};

// ===== Audio System =====
let audioCtx = null;

function initAudio() {
    if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioCtx.state === 'suspended') {
        audioCtx.resume();
    }
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
    gain1.connect(audioCtx.destination);

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
    gain2.connect(audioCtx.destination);

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
    noiseGain.connect(audioCtx.destination);

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
    gain.connect(audioCtx.destination);

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
    gain.connect(audioCtx.destination);

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
        gain.connect(audioCtx.destination);

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
    gain.connect(audioCtx.destination);

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
    gain1.connect(audioCtx.destination);

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
    noiseGain.connect(audioCtx.destination);

    noiseGain.gain.setValueAtTime(0.15, audioCtx.currentTime);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.3);

    noise.start(audioCtx.currentTime);

    // 高音のキラキラ
    const osc2 = audioCtx.createOscillator();
    const gain2 = audioCtx.createGain();
    osc2.connect(gain2);
    gain2.connect(audioCtx.destination);

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
        gain.connect(audioCtx.destination);

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
    gain1.connect(audioCtx.destination);

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
    gain2.connect(audioCtx.destination);

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
        gain.connect(audioCtx.destination);

        osc.frequency.setValueAtTime(freq, t + sadTimes[i]);
        osc.type = 'sine';

        gain.gain.setValueAtTime(0.1, t + sadTimes[i]);
        gain.gain.exponentialRampToValueAtTime(0.001, t + sadTimes[i] + 0.25);

        osc.start(t + sadTimes[i]);
        osc.stop(t + sadTimes[i] + 0.25);
    });
}

// ===== Game State =====
let canvas, ctx;
let gameRunning = false;
let roundTime = CONFIG.ROUND_DURATION;
let lastTime = 0;
let lastShootTime = { player1: 0, player2: 0 };
let winner = null;
let winnerDeclared = false;
let waitingForBulletsClear = false;

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
        this.radius = CONFIG.PLAYER_RADIUS;
        this.color = color;
        this.alive = true;

        // プレイヤーごとの個性設定（ベース値）
        const config = PLAYER_CONFIGS[id];
        this.baseSpeed = config.speed;
        this.baseShootInterval = config.shootInterval;
        this.bulletsPerShot = config.bulletsPerShot;
        this.bulletSpeed = config.bulletSpeed;
        this.spreadAngle = config.spreadAngle;

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

    update(canvasWidth, canvasHeight) {
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

        // Bounce off walls
        if (this.x - this.radius <= 0 || this.x + this.radius >= canvasWidth) {
            this.vx *= -1;
            this.x = Math.max(this.radius, Math.min(canvasWidth - this.radius, this.x));
        }
        if (this.y - this.radius <= 0 || this.y + this.radius >= canvasHeight) {
            this.vy *= -1;
            this.y = Math.max(this.radius, Math.min(canvasHeight - this.radius, this.y));
        }
    }

    draw(ctx) {
        if (!this.alive) return;

        // Outer glow
        const gradient = ctx.createRadialGradient(
            this.x, this.y, this.radius * 0.5,
            this.x, this.y, this.radius * 1.5
        );
        gradient.addColorStop(0, this.color.main);
        gradient.addColorStop(0.5, this.color.light + '80');
        gradient.addColorStop(1, 'transparent');

        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius * 1.5, 0, Math.PI * 2);
        ctx.fillStyle = gradient;
        ctx.fill();

        // Main circle
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = this.color.main;
        ctx.fill();
        ctx.strokeStyle = this.color.light;
        ctx.lineWidth = 4;
        ctx.stroke();

        // HP Text
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 32px Outfit';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(this.hp.toString(), this.x, this.y);
    }

    takeDamage(amount) {
        this.hp -= amount;
        if (this.hp <= 0) {
            this.hp = 0;
            this.alive = false;
            this.explode();
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

        // Bounce off walls (弾も反射)
        if (this.x - this.radius <= 0 || this.x + this.radius >= canvasWidth) {
            this.alive = false; // 壁で消滅
        }
        if (this.y - this.radius <= 0 || this.y + this.radius >= canvasHeight) {
            this.alive = false; // 壁で消滅
        }
    }

    draw(ctx) {
        // Draw trail
        for (let i = 0; i < this.trail.length; i++) {
            const alpha = (i + 1) / this.trail.length * 0.5;
            const size = this.radius * (0.3 + (i / this.trail.length) * 0.7);
            ctx.beginPath();
            ctx.arc(this.trail[i].x, this.trail[i].y, size, 0, Math.PI * 2);
            ctx.fillStyle = this.color + Math.floor(alpha * 255).toString(16).padStart(2, '0');
            ctx.fill();
        }

        // Draw bullet
        const gradient = ctx.createRadialGradient(
            this.x, this.y, 0,
            this.x, this.y, this.radius
        );
        gradient.addColorStop(0, '#fff');
        gradient.addColorStop(0.3, this.color);
        gradient.addColorStop(1, this.color + '00');

        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = gradient;
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
        const pulse = 1 + Math.sin(this.pulsePhase) * 0.15;
        const glowPulse = 1 + Math.sin(this.pulsePhase * 0.5) * 0.3;

        // 外側のグロー
        const gradient = ctx.createRadialGradient(
            this.x, this.y, 0,
            this.x, this.y, this.radius * 2 * glowPulse
        );
        gradient.addColorStop(0, this.config.color + '80');
        gradient.addColorStop(0.5, this.config.glowColor + '40');
        gradient.addColorStop(1, 'transparent');

        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius * 2 * glowPulse, 0, Math.PI * 2);
        ctx.fillStyle = gradient;
        ctx.fill();

        // メインの円
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius * pulse, 0, Math.PI * 2);
        ctx.fillStyle = this.config.color;
        ctx.fill();
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 3;
        ctx.stroke();

        // アイコン
        ctx.fillStyle = '#FFFFFF';
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

        // グロー効果
        const gradient = ctx.createRadialGradient(
            this.x, this.y, 0,
            this.x, this.y, this.size * this.life
        );
        gradient.addColorStop(0, '#FFFFFF');
        gradient.addColorStop(0.3, this.color);
        gradient.addColorStop(1, this.color + '00');

        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size * this.life, 0, Math.PI * 2);
        ctx.fillStyle = gradient;
        ctx.fill();
        ctx.globalAlpha = 1;
    }

    get alive() {
        return this.life > 0;
    }
}

// ===== Shooting Logic =====
function shoot(player, target, timestamp) {
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

// ===== Game Functions =====
function initGame() {
    canvas = document.getElementById('gameCanvas');
    ctx = canvas.getContext('2d');

    // オーディオ初期化（ユーザー操作後に有効化）
    document.addEventListener('click', initAudio, { once: true });
    document.addEventListener('keydown', initAudio, { once: true });
    initAudio();

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    resetGame();
    gameRunning = true;
    lastTime = performance.now();
    requestAnimationFrame(gameLoop);
}

function resizeCanvas() {
    const container = canvas.parentElement;
    const header = document.querySelector('.game-header');
    const footer = document.querySelector('.game-footer');

    // フッターが非表示の場合はoffsetHeightが0になるので問題なく動作
    const headerHeight = header ? header.offsetHeight : 0;
    const footerHeight = footer ? footer.offsetHeight : 0;

    canvas.width = container.clientWidth;
    canvas.height = container.clientHeight - headerHeight - footerHeight;
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

    const margin = CONFIG.PLAYER_RADIUS + 50;

    players = [
        new Player(
            'player1',
            margin + Math.random() * (canvas.width / 4),
            margin + Math.random() * (canvas.height - margin * 2),
            COLORS.player1
        ),
        new Player(
            'player2',
            canvas.width - margin - Math.random() * (canvas.width / 4),
            margin + Math.random() * (canvas.height - margin * 2),
            COLORS.player2
        ),
    ];

    updateUI();
    document.getElementById('resultOverlay').classList.remove('show');

    playRoundStartSound();
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

    const overlay = document.getElementById('resultOverlay');
    const resultText = document.getElementById('resultText');

    // 勝者名とWIN!を表示
    const playerName = winnerPlayer.id === 'player1' ? 'Player1' : 'Player2';
    resultText.innerHTML = `${playerName}<br>WIN!`;
    resultText.style.textAlign = 'center';

    // 勝者の色でテキストを表示
    resultText.style.background = `linear-gradient(45deg, ${winnerPlayer.color.light}, ${winnerPlayer.color.main})`;
    resultText.style.webkitBackgroundClip = 'text';
    resultText.style.webkitTextFillColor = 'transparent';
    resultText.style.backgroundClip = 'text';
    resultText.style.filter = `drop-shadow(0 0 20px ${winnerPlayer.color.main}) drop-shadow(0 0 40px ${winnerPlayer.color.main}) drop-shadow(0 0 60px ${winnerPlayer.color.light})`;

    // アニメーションをリセットして再生
    resultText.style.animation = 'none';
    resultText.offsetHeight;
    resultText.style.animation = 'resultPop 0.5s ease-out';

    overlay.classList.add('show');
    // ゲーム終了（自動ラウンド遷移なし）
}

// ===== Game Loop =====
function gameLoop(timestamp) {
    const deltaTime = (timestamp - lastTime) / 1000;
    lastTime = timestamp;

    // エフェクトの更新（ゲーム終了後も継続）
    updateEffects();

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
        players.forEach(player => player.update(canvas.width, canvas.height));

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

        // Check for death
        players.forEach((player, index) => {
            if (!player.alive && gameRunning) {
                // 勝者を決定（死んだプレイヤーの相手が勝者）
                const winnerId = player.id === 'player1' ? 'player2' : 'player1';
                const winnerPlayer = players.find(p => p.id === winnerId);
                winner = winnerPlayer;
                gameRunning = false;
                waitingForBulletsClear = true;
            }
        });

        // Update UI
        updateUI();
    }

    // ゲーム終了後の処理
    if (!gameRunning) {
        // パーティクル更新
        particles.forEach(p => p.update());
        particles = particles.filter(p => p.alive);

        // 弾の更新と当たり判定（生き残ったプレイヤーにも当たる）
        bullets.forEach(bullet => bullet.update(canvas.width, canvas.height));

        // 弾同士の相殺判定（無効化中）
        // checkBulletCollisions();

        // 生き残ったプレイヤーへの当たり判定
        bullets.forEach(bullet => {
            if (!bullet.alive) return;
            players.forEach(player => {
                if (player.alive && bullet.ownerId !== player.id) {
                    const dx = bullet.x - player.x;
                    const dy = bullet.y - player.y;
                    const distance = Math.sqrt(dx * dx + dy * dy);

                    if (distance < bullet.radius + player.radius) {
                        player.takeDamage(CONFIG.BULLET_DAMAGE);
                        bullet.alive = false;
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

                        // HPが0になったら爆発
                        if (player.hp <= 0) {
                            winner = null; // 両方爆発したので勝者なし（引き分け）
                        }
                    }
                }
            });
        });

        bullets = bullets.filter(b => b.alive);

        // 生き残ったプレイヤーの移動
        players.forEach(player => player.update(canvas.width, canvas.height));

        // UI更新
        updateUI();

        // 弾が全て消えたらWIN表示
        if (waitingForBulletsClear && bullets.length === 0 && !winnerDeclared) {
            winnerDeclared = true;

            // 少し待ってから表示
            setTimeout(() => {
                // 生き残ったプレイヤーを確認
                const survivingPlayer = players.find(p => p.alive);
                if (survivingPlayer) {
                    showWinner(survivingPlayer);
                } else {
                    // 両方爆発した場合は引き分け表示
                    showDraw();
                }
            }, 500);
        }
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

    const overlay = document.getElementById('resultOverlay');
    const resultText = document.getElementById('resultText');

    resultText.textContent = 'DRAW';
    resultText.style.background = 'linear-gradient(45deg, #888888, #AAAAAA)';
    resultText.style.webkitBackgroundClip = 'text';
    resultText.style.webkitTextFillColor = 'transparent';
    resultText.style.backgroundClip = 'text';
    resultText.style.filter = 'drop-shadow(0 0 10px #666666) drop-shadow(0 0 20px #888888)';

    resultText.style.animation = 'none';
    resultText.offsetHeight;
    resultText.style.animation = 'resultPop 0.5s ease-out';

    overlay.classList.add('show');
    // ゲーム終了（自動ラウンド遷移なし）
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

    // Clear canvas
    ctx.fillStyle = '#0d1b2a';
    ctx.fillRect(-50, -50, canvas.width + 100, canvas.height + 100);

    // Draw grid pattern (subtle background)
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)';
    ctx.lineWidth = 1;
    const gridSize = 50;
    for (let x = 0; x < canvas.width; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
        ctx.stroke();
    }
    for (let y = 0; y < canvas.height; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
    }

    // Draw explosion rings
    explosionRings.forEach(ring => {
        ctx.globalAlpha = ring.life;
        ctx.beginPath();
        ctx.arc(ring.x, ring.y, ring.radius, 0, Math.PI * 2);
        ctx.strokeStyle = ring.color;
        ctx.lineWidth = ring.lineWidth * ring.life;
        ctx.stroke();

        // 内側のグロー
        const gradient = ctx.createRadialGradient(
            ring.x, ring.y, ring.radius * 0.8,
            ring.x, ring.y, ring.radius
        );
        gradient.addColorStop(0, 'transparent');
        gradient.addColorStop(0.5, ring.color + '40');
        gradient.addColorStop(1, ring.color + '00');
        ctx.fillStyle = gradient;
        ctx.fill();
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
}

// ===== Start Game =====
window.addEventListener('load', initGame);
