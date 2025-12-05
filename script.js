(() => {
    const canvas = document.getElementById('game');
    const ctx = canvas.getContext('2d');
    const scoreEl = document.getElementById('score');
    const stopBtn = document.getElementById('stopBtn');
    const resumeBtn = document.getElementById('resumeBtn');
    const replayBtn = document.getElementById('replayBtn');
    const statusEl = document.getElementById('status');

    const themeNormalBtn = document.getElementById('themeNormal');
    const themeLightBtn = document.getElementById('themeLight');
    const themeDarkBtn = document.getElementById('themeDark');

    const W = canvas.width;
    const H = canvas.height;

    let score = 0;
    let frames = 0;
    let running = true;
    let gameOver = false;

    const ship = { x: W / 2, y: H / 2, w: 28, h: 20 };

    let lasers = [];
    let enemies = [];
    let powerUps = [];

    let laserSpeed = 7;
    let enemySpeed = 2;
    const spawnRate = 60;
    let autoShootRate = 15;
    const enemyEmojis = ['👾', '👽', '🛸', '🤖', '👹'];

    let multiShotLevel = 1;
    let multiShotTimer = 0;


    const sound1 = new Audio('sound1.mp3');
    sound1.loop = true;
    sound1.volume = 0.3;
    sound1.play().catch(() => { });
    const sound2 = new Audio('sound2.mp3');
    const sound3 = new Audio('sound3.mp3');

    const leaderboardListEl = document.getElementById('leaderboardList');

    function loadLeaderboard() {
        const raw = localStorage.getItem('alienShooterLeaderboard');
        try {
            const data = raw ? JSON.parse(raw) : [];
            return Array.isArray(data) ? data : [];
        } catch {
            return [];
        }
    }

    function saveLeaderboard(entries) {
        localStorage.setItem('alienShooterLeaderboard', JSON.stringify(entries));
    }

    function renderLeaderboard() {
        const entries = loadLeaderboard();
        leaderboardListEl.innerHTML = '';
        entries.forEach((item, idx) => {
            const li = document.createElement('li');
            const date = new Date(item.ts).toLocaleString();
            li.textContent = `#${idx + 1} — ${item.score} pts • ${date}`;
            leaderboardListEl.appendChild(li);
        });
    }

    function addScoreToLeaderboard(finalScore) {
        const entries = loadLeaderboard();
        entries.push({ score: finalScore, ts: Date.now() });
        entries.sort((a, b) => b.score - a.score);
        const top = entries.slice(0, 10);
        saveLeaderboard(top);
        renderLeaderboard();
    }

    function spawnEnemy() {
        const x = Math.random() * (W - 40) + 20;
        const emoji = enemyEmojis[Math.floor(Math.random() * enemyEmojis.length)];
        enemies.push({ x, y: -20, w: 30, h: 20, emoji });
    }

    function spawnPowerUp() {
        const x = Math.random() * (W - 40) + 20;
        const levels = [2, 3, 4];
        const level = levels[Math.floor(Math.random() * levels.length)];
        powerUps.push({ x, y: -20, r: 12, level });
    }

    function shoot() {
        if (multiShotLevel === 1) {
            lasers.push({ x: ship.x, y: ship.y - ship.h / 2, w: 4, h: 12 });
        } else if (multiShotLevel === 2) {
            lasers.push({ x: ship.x - 8, y: ship.y - ship.h / 2, w: 4, h: 12 });
            lasers.push({ x: ship.x + 8, y: ship.y - ship.h / 2, w: 4, h: 12 });
        } else if (multiShotLevel === 3) {
            lasers.push({ x: ship.x - 10, y: ship.y - ship.h / 2, w: 4, h: 12 });
            lasers.push({ x: ship.x, y: ship.y - ship.h / 2, w: 4, h: 12 });
            lasers.push({ x: ship.x + 10, y: ship.y - ship.h / 2, w: 4, h: 12 });
        } else if (multiShotLevel === 4) {
            lasers.push({ x: ship.x - 12, y: ship.y - ship.h / 2, w: 4, h: 12 });
            lasers.push({ x: ship.x - 4, y: ship.y - ship.h / 2, w: 4, h: 12 });
            lasers.push({ x: ship.x + 4, y: ship.y - ship.h / 2, w: 4, h: 12 });
            lasers.push({ x: ship.x + 12, y: ship.y - ship.h / 2, w: 4, h: 12 });
        }
    }

    function update() {
        if (!running) return;
        frames++;

        if (frames % autoShootRate === 0) shoot();

        for (let l of lasers) l.y -= laserSpeed;
        lasers = lasers.filter(l => l.y > -20);

        if (frames % spawnRate === 0) spawnEnemy();

        for (let e of enemies) e.y += enemySpeed;
        enemies = enemies.filter(e => e.y <= H + 20);

        // lasers vs enemies
        for (let i = enemies.length - 1; i >= 0; i--) {
            const e = enemies[i];
            for (let j = lasers.length - 1; j >= 0; j--) {
                const l = lasers[j];
                if (rectsOverlap(l, e)) {
                    enemies.splice(i, 1);
                    lasers.splice(j, 1);
                    score++;
                    scoreEl.textContent = score;
                    sound2.currentTime = 0;
                    sound2.play();
                    break;
                }
            }
        }

        // enemies vs ship
        for (let i = enemies.length - 1; i >= 0; i--) {
            const e = enemies[i];
            if (rectsOverlap(ship, e)) {
                running = false;
                gameOver = true;
                statusEl.textContent = 'Game Over — Press Replay to try again';
                sound3.currentTime = 0;
                sound3.play();
                addScoreToLeaderboard(score);
                break;
            }
        }

        if (frames % 600 === 0) spawnPowerUp();
        updatePowerUps();
    }

    function rectsOverlap(a, b) {
        const aw = a.w || 0;
        const ah = a.h || 0;
        const bw = b.w || (b.r ? b.r * 2 : 0);
        const bh = b.h || (b.r ? b.r * 2 : 0);
        return a.x < (b.x + bw) && (a.x + aw) > b.x && a.y < (b.y + bh) && (a.y + ah) > b.y;
    }

    function updatePowerUps() {
        for (let p of powerUps) p.y += 2;
        for (let i = powerUps.length - 1; i >= 0; i--) {
            const p = powerUps[i];
            if (p.y > H + 20) powerUps.splice(i, 1);
            if (Math.abs(ship.x - p.x) < ship.w / 2 && Math.abs(ship.y - p.y) < ship.h / 2) {
                powerUps.splice(i, 1);
                multiShotLevel = p.level;
                multiShotTimer = 300;
                score += p.level * 5;
                scoreEl.textContent = score;
            }
        }
        if (multiShotLevel > 1) {
            multiShotTimer--;
            if (multiShotTimer <= 0) multiShotLevel = 1;
        }
    }

    function drawShip() {
        const { x, y, w, h } = ship;
        ctx.save();
        ctx.translate(x, y);
        ctx.shadowColor = 'rgba(0,0,0,0.35)';
        ctx.shadowBlur = 8;

        // Hull
        ctx.fillStyle = '#2b3a67';
        roundEllipse(0, 0, w * 0.35, h * 0.3);

        // Cockpit
        ctx.fillStyle = '#53d8ff';
        roundEllipse(0, -h * 0.1, w * 0.18, h * 0.16);

        // Wings
        ctx.fillStyle = '#3f5aa6';
        roundRect(-w * 0.42, -h * 0.05, w * 0.28, h * 0.14, 8, true, false);
        roundRect(w * 0.14, -h * 0.05, w * 0.28, h * 0.14, 8, true, false);

        // Thrusters glow
        const grad = ctx.createRadialGradient(0, h * 0.22, 2, 0, h * 0.22, 18);
        grad.addColorStop(0, 'rgba(255,180,64,0.95)');
        grad.addColorStop(1, 'rgba(255,180,64,0)');
        ctx.fillStyle = grad;
        roundEllipse(0, h * 0.22, w * 0.14, h * 0.08);

        ctx.restore();
    }

    function drawPowerUps() {
        for (const p of powerUps) {
            const g = ctx.createRadialGradient(p.x, p.y, 2, p.x, p.y, 18);
            g.addColorStop(0, 'rgba(83,216,255,0.8)');
            g.addColorStop(1, 'rgba(83,216,255,0)');
            ctx.fillStyle = g;
            roundEllipse(p.x, p.y, 18, 18);

            ctx.fillStyle = '#53d8ff';
            roundEllipse(p.x, p.y, 8, 8);

            ctx.fillStyle = '#ffffff';
            ctx.font = '12px system-ui, sans-serif';
            ctx.fillText(`x${p.level}`, p.x - 10, p.y - 12);
        }
    }

    function draw() {
        ctx.clearRect(0, 0, W, H);

        ctx.fillStyle = '#53d8ff';
        for (let l of lasers) ctx.fillRect(l.x - 2, l.y, l.w, l.h);

        ctx.font = '24px serif';
        for (let e of enemies) ctx.fillText(e.emoji, e.x, e.y);

        drawPowerUps();

        ctx.font = '12px system-ui, sans-serif';
        ctx.fillStyle = '#ffffff';
        ctx.fillText(`Multi-Shot Level: ${multiShotLevel}`, 10, 20);

        drawShip();

        if (gameOver) {
            ctx.fillStyle = 'rgba(0,0,0,0.5)';
            ctx.fillRect(0, 0, W, H);
            ctx.fillStyle = '#ffffff';
            ctx.font = '20px system-ui, sans-serif';
            ctx.fillText('Game Over', W / 2 - 60, H / 2 - 10);
            ctx.font = '16px system-ui, sans-serif';
            ctx.fillText('Press Replay to start again', W / 2 - 110, H / 2 + 20);
        }
    }

    function loop() {
        update();
        draw();
        requestAnimationFrame(loop);
    }

    // Cursor tracking only inside canvas
    canvas.addEventListener('mousemove', e => {
        const rect = canvas.getBoundingClientRect();
        ship.x = e.clientX - rect.left;
        ship.y = e.clientY - rect.top;
    });

    stopBtn.addEventListener('click', () => {
        running = false;
        statusEl.textContent = 'Paused';
    });

    resumeBtn.addEventListener('click', () => {
        if (!gameOver) {
            running = true;
            statusEl.textContent = 'Move your mouse to fly • Auto‑shoot enabled';
        }
    });

    replayBtn.addEventListener('click', () => {
        resetGame();
    });

    function resetGame() {
        lasers = [];
        enemies = [];
        powerUps = [];
        score = 0;
        frames = 0;
        multiShotLevel = 1;
        multiShotTimer = 0;
        running = true;
        gameOver = false;
        scoreEl.textContent = score;
        statusEl.textContent = 'Move your mouse to fly • Auto‑shoot enabled';
        ship.x = W / 2;
        ship.y = H / 2;
    }

    // Helpers
    function roundRect(x, y, w, h, r, fill = true, stroke = false) {
        ctx.beginPath();
        ctx.moveTo(x + r, y);
        ctx.arcTo(x + w, y, x + w, y + h, r);
        ctx.arcTo(x + w, y + h, x, y + h, r);
        ctx.arcTo(x, y + h, x, y, r);
        ctx.arcTo(x, y, x + w, y, r);
        if (fill) ctx.fill();
        if (stroke) ctx.stroke();
    }

    function roundEllipse(cx, cy, rx, ry) {
        ctx.beginPath();
        ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
        ctx.fill();
    }

    // Theme controls
    function applyTheme(mode) {
        const root = document.documentElement;
        if (!mode || mode === 'normal') {
            root.removeAttribute('data-theme');
            localStorage.setItem('alienShooterTheme', 'normal');
            return;
        }
        root.setAttribute('data-theme', mode);
        localStorage.setItem('alienShooterTheme', mode);
    }

    themeNormalBtn.addEventListener('click', () => applyTheme('normal'));
    themeLightBtn.addEventListener('click', () => applyTheme('light'));
    themeDarkBtn.addEventListener('click', () => applyTheme('dark'));

    const savedTheme = localStorage.getItem('alienShooterTheme') || 'normal';
    applyTheme(savedTheme);

    renderLeaderboard();
    loop();
})();
