/**
 * BUBU FRUIT RUSH - HTML5 CANVAS GAME ENGINE
 * High-performance 60 FPS arcade canvas engine featuring Bubu the Panda
 */

class FruitRushGame {
  constructor(canvasId, uiController) {
    this.canvas = document.getElementById(canvasId);
    this.ctx = this.canvas.getContext('2d');
    this.ui = uiController;

    // Fixed virtual resolution for physics consistency
    this.width = 800;
    this.height = 600;
    this.canvas.width = this.width;
    this.canvas.height = this.height;

    // Game loop state
    this.isRunning = false;
    this.isPaused = false;
    this.animFrameId = null;

    // Player state
    this.player = {
      x: this.width / 2 - 45,
      y: this.height - 110,
      width: 90,
      height: 90,
      speed: 11,
      targetX: this.width / 2 - 45,
      skin: 'default', // 'default', 'ninja', 'king', 'chef'
      direction: 1 // 1: right, -1: left
    };

    // Controls
    this.keys = { left: false, right: false };
    this.isDragging = false;

    // Game Stats
    this.score = 0;
    this.combo = 1;
    this.maxCombo = 1;
    this.fruitsCaught = 0;
    this.lives = 3;
    this.level = 1;
    this.startTime = 0;

    // Power-up Active Timers (in ms)
    this.powerups = {
      magnet: 0,
      freeze: 0,
      frenzy: 0
    };

    // Game Objects
    this.items = [];
    this.particles = [];
    this.floatingTexts = [];

    // Screen Shake
    this.shakeTime = 0;
    this.shakeIntensity = 0;

    // Spawner timers
    this.lastSpawnTime = 0;
    this.spawnInterval = 1000; // ms

    this.setupInputs();
  }

  setSkin(skinId) {
    this.player.skin = skinId;
  }

  setupInputs() {
    // Keyboard controls
    window.addEventListener('keydown', (e) => {
      if (!this.isRunning || this.isPaused) return;
      if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
        this.keys.left = true;
      }
      if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
        this.keys.right = true;
      }
    });

    window.addEventListener('keyup', (e) => {
      if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
        this.keys.left = false;
      }
      if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
        this.keys.right = false;
      }
    });

    // Mouse & Touch Drag Controls
    const getCanvasX = (clientX) => {
      const rect = this.canvas.getBoundingClientRect();
      const scaleX = this.width / rect.width;
      return (clientX - rect.left) * scaleX;
    };

    const handleMove = (clientX) => {
      if (!this.isRunning || this.isPaused) return;
      const x = getCanvasX(clientX);
      this.player.x = Math.max(0, Math.min(this.width - this.player.width, x - this.player.width / 2));
    };

    this.canvas.addEventListener('mousemove', (e) => {
      handleMove(e.clientX);
    });

    this.canvas.addEventListener('touchstart', (e) => {
      if (e.touches.length > 0) {
        this.isDragging = true;
        handleMove(e.touches[0].clientX);
      }
    }, { passive: true });

    this.canvas.addEventListener('touchmove', (e) => {
      if (this.isDragging && e.touches.length > 0) {
        handleMove(e.touches[0].clientX);
      }
    }, { passive: true });

    this.canvas.addEventListener('touchend', () => {
      this.isDragging = false;
    });
  }

  start() {
    this.score = 0;
    this.combo = 1;
    this.maxCombo = 1;
    this.fruitsCaught = 0;
    this.lives = 3;
    this.level = 1;
    this.items = [];
    this.particles = [];
    this.floatingTexts = [];
    this.powerups = { magnet: 0, freeze: 0, frenzy: 0 };
    this.player.x = this.width / 2 - 45;
    this.spawnInterval = 1000;
    this.isRunning = true;
    this.isPaused = false;
    this.lastTime = performance.now();
    this.lastSpawnTime = performance.now();

    if (this.animFrameId) cancelAnimationFrame(this.animFrameId);
    this.loop(performance.now());
  }

  pause() {
    this.isPaused = true;
  }

  resume() {
    if (this.isPaused) {
      this.isPaused = false;
      this.lastTime = performance.now();
      this.loop(performance.now());
    }
  }

  stop() {
    this.isRunning = false;
    this.isPaused = false;
    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }
  }

  // MAIN GAME LOOP
  loop(timestamp) {
    if (!this.isRunning) return;

    const dt = Math.min((timestamp - this.lastTime) / 1000, 0.1);
    this.lastTime = timestamp;

    if (!this.isPaused) {
      this.update(dt, timestamp);
      this.render();
    }

    this.animFrameId = requestAnimationFrame((ts) => this.loop(ts));
  }

  // UPDATE ENGINE
  update(dt, timestamp) {
    // Player Keyboard Movement
    if (this.keys.left) {
      this.player.x -= this.player.speed;
      this.player.direction = -1;
    }
    if (this.keys.right) {
      this.player.x += this.player.speed;
      this.player.direction = 1;
    }
    this.player.x = Math.max(0, Math.min(this.width - this.player.width, this.player.x));

    // Powerup Timers Update
    ['magnet', 'freeze', 'frenzy'].forEach((p) => {
      if (this.powerups[p] > 0) {
        this.powerups[p] -= dt * 1000;
        if (this.powerups[p] <= 0) this.powerups[p] = 0;
      }
    });

    // Screen Shake Update
    if (this.shakeTime > 0) {
      this.shakeTime -= dt * 1000;
    }

    // Spawn Items
    const effectiveInterval = this.powerups.freeze > 0 ? this.spawnInterval * 1.5 : this.spawnInterval;
    if (timestamp - this.lastSpawnTime > effectiveInterval) {
      this.spawnItem();
      this.lastSpawnTime = timestamp;
    }

    // Update Level Progression
    const calculatedLevel = Math.floor(this.score / 200) + 1;
    if (calculatedLevel > this.level) {
      this.level = calculatedLevel;
      this.spawnInterval = Math.max(400, 1000 - (this.level - 1) * 75);
      if (window.soundEngine) window.soundEngine.playLevelUp();
      this.addFloatingText('LEVEL UP! 🚀', this.width / 2, this.height / 2 - 50, '#ffcc00', 32);
    }

    // Basket Catch Zone
    const basketBox = {
      x: this.player.x + 10,
      y: this.player.y + 10,
      width: this.player.width - 20,
      height: 25
    };

    // Update Items
    for (let i = this.items.length - 1; i >= 0; i--) {
      const item = this.items[i];
      let speedMult = this.powerups.freeze > 0 ? 0.45 : 1.0;
      item.y += item.speed * speedMult;
      item.rotation += item.rotSpeed;

      // Magnet Effect (attract fruit to basket)
      if (this.powerups.magnet > 0 && item.type !== 'bomb') {
        const dx = (this.player.x + this.player.width / 2) - item.x;
        const dy = (this.player.y + 20) - item.y;
        const dist = Math.hypot(dx, dy);
        if (dist < 280) {
          item.x += (dx / dist) * 7;
          item.y += (dy / dist) * 7;
        }
      }

      // Check Basket Collision
      const dx = item.x - (basketBox.x + basketBox.width / 2);
      const dy = item.y - (basketBox.y + basketBox.height / 2);
      const distance = Math.hypot(dx, dy);

      if (distance < item.radius + basketBox.width / 2.2) {
        this.handleCatchItem(item);
        this.items.splice(i, 1);
        continue;
      }

      // Check Bottom Screen Miss
      if (item.y > this.height + 30) {
        if (item.type !== 'bomb') {
          // Missed fruit resets combo streak
          if (this.combo > 1) {
            this.combo = 1;
            this.addFloatingText('Combo Reset!', item.x, this.height - 50, '#ff3b30', 18);
          }
        }
        this.items.splice(i, 1);
      }
    }

    // Update Particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.vy += p.gravity;
      p.alpha -= p.decay;
      if (p.alpha <= 0) {
        this.particles.splice(i, 1);
      }
    }

    // Update Floating Texts
    for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
      const ft = this.floatingTexts[i];
      ft.y -= 1.2;
      ft.alpha -= 0.02;
      if (ft.alpha <= 0) {
        this.floatingTexts.splice(i, 1);
      }
    }

    // Update UI HUD
    if (this.ui) {
      this.ui.updateHUD({
        score: this.score,
        combo: this.combo,
        lives: this.lives,
        level: this.level,
        powerups: this.powerups
      });
    }
  }

  // SPAWN FALLING ITEM
  spawnItem() {
    const types = [
      { type: 'apple', color: '#ff3b30', points: 10, icon: '🍎', weight: 30 },
      { type: 'banana', color: '#ffcc00', points: 15, icon: '🍌', weight: 25 },
      { type: 'strawberry', color: '#e91e63', points: 20, icon: '🍓', weight: 20 },
      { type: 'grape', color: '#9c27b0', points: 25, icon: '🍇', weight: 15 },
      { type: 'orange', color: '#ff9800', points: 30, icon: '🍊', weight: 15 },
      { type: 'star', color: '#ffd700', points: 50, icon: '⭐', weight: 6 },
      { type: 'magnet', color: '#ff5722', points: 5, icon: '🧲', weight: 4 },
      { type: 'freeze', color: '#00bcd4', points: 5, icon: '❄️', weight: 4 },
      { type: 'bomb', color: '#333333', points: 0, icon: '💣', weight: 22 }
    ];

    // Weighted random selection
    const totalWeight = types.reduce((acc, t) => acc + t.weight, 0);
    let rand = Math.random() * totalWeight;
    let selected = types[0];
    for (let t of types) {
      if (rand < t.weight) {
        selected = t;
        break;
      }
      rand -= t.weight;
    }

    const radius = 24;
    const x = Math.random() * (this.width - radius * 4) + radius * 2;
    const speed = (3.5 + Math.random() * 2.5) + (this.level - 1) * 0.4;

    this.items.push({
      ...selected,
      x: x,
      y: -radius,
      radius: radius,
      speed: speed,
      rotation: Math.random() * Math.PI * 2,
      rotSpeed: (Math.random() - 0.5) * 0.08
    });
  }

  // HANDLE CATCHING AN ITEM
  handleCatchItem(item) {
    if (item.type === 'bomb') {
      // BOMB BLAST
      this.lives -= 1;
      this.combo = 1;
      this.triggerShake(400, 15);
      this.createExplosionParticles(item.x, item.y);
      if (window.soundEngine) window.soundEngine.playBombBlast();

      this.addFloatingText('-1 LIFE! 💣', item.x, item.y, '#ff3b30', 26);

      if (this.lives <= 0) {
        this.triggerGameOver();
      }
    } else {
      // FRUIT / POWERUP CATCH
      this.fruitsCaught++;
      let earnedPoints = item.points * this.combo;

      if (this.powerups.frenzy > 0) {
        earnedPoints *= 2;
      }

      this.score += earnedPoints;

      // Increment Combo
      this.combo++;
      if (this.combo > this.maxCombo) this.maxCombo = this.combo;

      // Handle Powerups
      if (item.type === 'star') {
        this.powerups.frenzy = 6000;
        if (window.soundEngine) window.soundEngine.playStarCatch();
        this.addFloatingText('STAR FRENZY 2X! ⭐', item.x, item.y, '#ffd700', 26);
      } else if (item.type === 'magnet') {
        this.powerups.magnet = 7000;
        if (window.soundEngine) window.soundEngine.playPowerup();
        this.addFloatingText('MAGNET POWER! 🧲', item.x, item.y, '#ff5722', 24);
      } else if (item.type === 'freeze') {
        this.powerups.freeze = 7000;
        if (window.soundEngine) window.soundEngine.playPowerup();
        this.addFloatingText('TIME FREEZE! ❄️', item.x, item.y, '#00bcd4', 24);
      } else {
        if (window.soundEngine) window.soundEngine.playFruitCatch(this.combo);
        this.addFloatingText(`+${earnedPoints}`, item.x, item.y, item.color, 22);
      }

      this.createSplashParticles(item.x, item.y, item.color);
    }
  }

  triggerShake(duration, intensity) {
    this.shakeTime = duration;
    this.shakeIntensity = intensity;
  }

  triggerGameOver() {
    this.stop();
    if (window.soundEngine) window.soundEngine.playGameOver();
    if (this.ui) {
      this.ui.showGameOver({
        score: this.score,
        fruitsCaught: this.fruitsCaught,
        maxCombo: this.maxCombo,
        level: this.level
      });
    }
  }

  // PARTICLE GENERATORS
  createSplashParticles(x, y, color) {
    for (let i = 0; i < 14; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 6 + 2;
      this.particles.push({
        x: x,
        y: y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 2,
        radius: Math.random() * 5 + 3,
        color: color,
        alpha: 1.0,
        decay: Math.random() * 0.04 + 0.02,
        gravity: 0.2
      });
    }
  }

  createExplosionParticles(x, y) {
    for (let i = 0; i < 25; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 9 + 3;
      const isFire = Math.random() > 0.4;
      this.particles.push({
        x: x,
        y: y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        radius: Math.random() * 7 + 4,
        color: isFire ? '#ff5722' : '#333333',
        alpha: 1.0,
        decay: 0.03,
        gravity: 0.1
      });
    }
  }

  addFloatingText(text, x, y, color, size = 20) {
    this.floatingTexts.push({ text, x, y, color, size, alpha: 1.0 });
  }

  // RENDER GRAPHICS
  render() {
    this.ctx.save();

    // Handle Screen Shake
    if (this.shakeTime > 0) {
      const offsetX = (Math.random() - 0.5) * this.shakeIntensity;
      const offsetY = (Math.random() - 0.5) * this.shakeIntensity;
      this.ctx.translate(offsetX, offsetY);
    }

    // Clear Canvas with Forest Gradient
    const bgGrad = this.ctx.createLinearGradient(0, 0, 0, this.height);
    bgGrad.addColorStop(0, '#1b3821');
    bgGrad.addColorStop(1, '#0e2413');
    this.ctx.fillStyle = bgGrad;
    this.ctx.fillRect(0, 0, this.width, this.height);

    // Draw Subtle Tree Canopy Backdrop
    this.drawForestBackdrop();

    // Draw Items
    this.items.forEach((item) => this.drawItem(item));

    // Draw Bubu Panda Player
    this.drawPandaPlayer(this.player);

    // Draw Particles
    this.particles.forEach((p) => {
      this.ctx.save();
      this.ctx.globalAlpha = p.alpha;
      this.ctx.fillStyle = p.color;
      this.ctx.beginPath();
      this.ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      this.ctx.fill();
      this.ctx.restore();
    });

    // Draw Floating Text
    this.floatingTexts.forEach((ft) => {
      this.ctx.save();
      this.ctx.globalAlpha = ft.alpha;
      this.ctx.font = `bold ${ft.size}px 'Fredoka', cursive, sans-serif`;
      this.ctx.fillStyle = ft.color;
      this.ctx.textAlign = 'center';
      this.ctx.shadowColor = 'rgba(0,0,0,0.8)';
      this.ctx.shadowBlur = 6;
      this.ctx.fillText(ft.text, ft.x, ft.y);
      this.ctx.restore();
    });

    this.ctx.restore();
  }

  drawForestBackdrop() {
    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.03)';
    for (let i = 0; i < 6; i++) {
      this.ctx.beginPath();
      this.ctx.arc(i * 150 + 50, 40, 100, 0, Math.PI * 2);
      this.ctx.fill();
    }
  }

  drawItem(item) {
    this.ctx.save();
    this.ctx.translate(item.x, item.y);
    this.ctx.rotate(item.rotation);

    // Draw item emoji/icon with shadow
    this.ctx.font = `${item.radius * 2}px sans-serif`;
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    this.ctx.shadowColor = 'rgba(0, 0, 0, 0.4)';
    this.ctx.shadowBlur = 8;
    this.ctx.fillText(item.icon, 0, 0);

    this.ctx.restore();
  }

  // DRAW BUBU THE PANDA MASCOT & BASKET
  drawPandaPlayer(p) {
    this.ctx.save();
    this.ctx.translate(p.x + p.width / 2, p.y + p.height / 2);

    // Draw Woven Fruit Basket at Top of Panda
    this.ctx.fillStyle = '#6b4226';
    this.ctx.strokeStyle = '#e6a756';
    this.ctx.lineWidth = 3;
    this.ctx.beginPath();
    this.ctx.ellipse(0, -35, 45, 18, 0, 0, Math.PI * 2);
    this.ctx.fill();
    this.ctx.stroke();

    // Basket rim weave line
    this.ctx.beginPath();
    this.ctx.ellipse(0, -35, 40, 14, 0, 0, Math.PI * 2);
    this.ctx.strokeStyle = '#3d2314';
    this.ctx.stroke();

    // Panda Body (White Base)
    this.ctx.fillStyle = '#ffffff';
    this.ctx.beginPath();
    this.ctx.arc(0, 10, 32, 0, Math.PI * 2);
    this.ctx.fill();
    this.ctx.strokeStyle = '#dddddd';
    this.ctx.lineWidth = 2;
    this.ctx.stroke();

    // Panda Black Ears
    this.ctx.fillStyle = '#222222';
    this.ctx.beginPath();
    this.ctx.arc(-24, -18, 12, 0, Math.PI * 2); // Left ear
    this.ctx.arc(24, -18, 12, 0, Math.PI * 2);  // Right ear
    this.ctx.fill();

    // Panda Face (White Head)
    this.ctx.fillStyle = '#ffffff';
    this.ctx.beginPath();
    this.ctx.arc(0, -5, 28, 0, Math.PI * 2);
    this.ctx.fill();

    // Black Eye Patches
    this.ctx.fillStyle = '#222222';
    this.ctx.beginPath();
    this.ctx.ellipse(-11, -8, 8, 10, -0.2, 0, Math.PI * 2); // Left patch
    this.ctx.ellipse(11, -8, 8, 10, 0.2, 0, Math.PI * 2);   // Right patch
    this.ctx.fill();

    // Cute White Pupil Highlights
    this.ctx.fillStyle = '#ffffff';
    this.ctx.beginPath();
    this.ctx.arc(-10, -10, 3, 0, Math.PI * 2);
    this.ctx.arc(12, -10, 3, 0, Math.PI * 2);
    this.ctx.fill();

    // Pink Rosy Cheeks
    this.ctx.fillStyle = 'rgba(255, 105, 180, 0.6)';
    this.ctx.beginPath();
    this.ctx.arc(-18, 2, 5, 0, Math.PI * 2);
    this.ctx.arc(18, 2, 5, 0, Math.PI * 2);
    this.ctx.fill();

    // Black Nose & Cute Mouth
    this.ctx.fillStyle = '#222222';
    this.ctx.beginPath();
    this.ctx.arc(0, -1, 3.5, 0, Math.PI * 2);
    this.ctx.fill();

    this.ctx.strokeStyle = '#222222';
    this.ctx.lineWidth = 2;
    this.ctx.beginPath();
    this.ctx.arc(-2.5, 4, 3, 0, Math.PI);
    this.ctx.arc(2.5, 4, 3, 0, Math.PI);
    this.ctx.stroke();

    // Paws holding basket up
    this.ctx.fillStyle = '#222222';
    this.ctx.beginPath();
    this.ctx.arc(-30, -20, 8, 0, Math.PI * 2);
    this.ctx.arc(30, -20, 8, 0, Math.PI * 2);
    this.ctx.fill();

    // SKIN SPECIFIC ACCESSORIES
    if (p.skin === 'ninja') {
      // Red Ninja Headband
      this.ctx.fillStyle = '#ff3b30';
      this.ctx.fillRect(-26, -22, 52, 7);
      this.ctx.fillStyle = '#ffd700';
      this.ctx.beginPath();
      this.ctx.arc(0, -18, 3, 0, Math.PI * 2);
      this.ctx.fill();
    } else if (p.skin === 'king') {
      // Golden Crown
      this.ctx.fillStyle = '#ffd700';
      this.ctx.beginPath();
      this.ctx.moveTo(-16, -30);
      this.ctx.lineTo(-20, -42);
      this.ctx.lineTo(-8, -35);
      this.ctx.lineTo(0, -46);
      this.ctx.lineTo(8, -35);
      this.ctx.lineTo(20, -42);
      this.ctx.lineTo(16, -30);
      this.ctx.closePath();
      this.ctx.fill();
      // Ruby jewel
      this.ctx.fillStyle = '#e91e63';
      this.ctx.beginPath();
      this.ctx.arc(0, -36, 3, 0, Math.PI * 2);
      this.ctx.fill();
    } else if (p.skin === 'chef') {
      // Chef Hat
      this.ctx.fillStyle = '#ffffff';
      this.ctx.beginPath();
      this.ctx.arc(0, -40, 16, 0, Math.PI * 2);
      this.ctx.fill();
      this.ctx.fillRect(-12, -32, 24, 10);
    }

    this.ctx.restore();
  }
}

window.FruitRushGame = FruitRushGame;
