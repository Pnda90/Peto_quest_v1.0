import Phaser from 'phaser';
import { CONSTS } from '../consts';
import { LaneIndex, PlayerState } from '../types';
import { InputSystem } from '../systems/InputSystem';
import { SaveManager } from '../systems/SaveManager';
import { AudioSystem } from '../systems/AudioSystem';
import { label, panel, button, ACID, MUTED } from '../ui/Theme';
import { createWave } from '../systems/WaveDirector';
import { BurstMeter } from '../systems/BurstMeter';
import { MissionManager } from '../systems/MissionManager';

export class GameScene extends Phaser.Scene {
  private handledKeys = new WeakSet<KeyboardEvent>();
  private waveIndex = 0;
  private safeLane = 1;
  private mode: 'expedition' | 'endless' = 'expedition';
  private burst = new BurstMeter();
  private burstLabel!: Phaser.GameObjects.Text;
  private burstFill!: Phaser.GameObjects.Rectangle;
  private stageLabel!: Phaser.GameObjects.Text;
  private stageFill!: Phaser.GameObjects.Rectangle;
  private burstCount = 0;
  private closeCalls = 0;
  private invincibleUntil = 0;
  private magnetUntil = 0;
  private effectLabel!: Phaser.GameObjects.Text;
  private resumePending = false;
  private pausedTweens: Phaser.Tweens.Tween[] = [];
  private inputSystem!: InputSystem;
  private audioSystem!: AudioSystem;
  private selectedFoodId: string = 'beans';

  // Player
  private player!: Phaser.Physics.Arcade.Sprite;
  private currentLane: LaneIndex = 1;
  private playerState: PlayerState = PlayerState.RUNNING;
  private isSwitchingLane = false;
  private dustEmitter!: Phaser.GameObjects.Particles.ParticleEmitter;
  private trailEmitter!: Phaser.GameObjects.Particles.ParticleEmitter;

  // VFX Emitters (pooled / reusable)
  private coinBurstEmitter!: Phaser.GameObjects.Particles.ParticleEmitter;
  private powerupBurstEmitter!: Phaser.GameObjects.Particles.ParticleEmitter;
  private fartBurstEmitter!: Phaser.GameObjects.Particles.ParticleEmitter;
  private speedLineEmitter!: Phaser.GameObjects.Particles.ParticleEmitter;

  // Env
  private bg1!: Phaser.GameObjects.TileSprite;
  private bg2!: Phaser.GameObjects.TileSprite;
  private obstacles!: Phaser.Physics.Arcade.Group;
  private coins!: Phaser.Physics.Arcade.Group;
  private powerups!: Phaser.Physics.Arcade.Group;
  private laneLines: Phaser.GameObjects.TileSprite[] = [];

  // State
  private currentSpeed: number = CONSTS.BASE_SPEED;
  private distance = 0;
  private score = 0;
  private coinsCollected = 0;
  private scoreMultiplier = 1;
  private comboTimer = 0;
  private isGameOver = false;

  // Biomes / Stages
  private currentBiomeIndex = 0;
  private lastBiomeDistance = 0;

  // Powerup states
  private isInvincible = false;
  private isMagnet = false;
  private invincibleGlow!: Phaser.GameObjects.Image;

  // Dynamic Missions
  private activeChallenge: {
    type: string;
    goal: number;
    progress: number;
    description: string;
  } | null = null;
  private challengeText!: Phaser.GameObjects.Text;
  private challengeContainer!: Phaser.GameObjects.Container;

  // Timers (with initial grace period so game doesn't instantly hit player)
  private obstacleSpawnTimer = 2200; // 2.2s grace period
  private itemSpawnTimer = 800;

  // Pause
  private isPaused = false;
  private pauseContainer!: Phaser.GameObjects.Container;
  private visibilityHandler!: () => void;

  // UI & Mobile Controls
  private scoreText!: Phaser.GameObjects.Text;
  private distanceText!: Phaser.GameObjects.Text;
  private coinsText!: Phaser.GameObjects.Text;
  private multiplierText!: Phaser.GameObjects.Text;
  private touchControlsContainer!: Phaser.GameObjects.Container;

  constructor() {
    super(CONSTS.SCENES.GAME);
  }

  init(data: { selectedFood?: string; mode?: 'expedition' | 'endless' }) {
    this.selectedFoodId = data.selectedFood || 'beans';
    this.mode = data.mode || 'expedition';
  }

  create() {
    this.waveIndex = 0;
    this.safeLane = 1;
    this.burst = new BurstMeter();
    this.burstCount = 0;
    this.closeCalls = 0;
    this.invincibleUntil = 0;
    this.magnetUntil = 0;
    this.resumePending = false;
    this.physics.resume();
    this.time.paused = false;
    this.isGameOver = false;
    this.isPaused = false;
    this.cameras.main.fadeIn(300, 0, 0, 0);

    // Initial state
    this.currentSpeed = CONSTS.BASE_SPEED;
    this.distance = 0;
    this.score = 0;
    this.coinsCollected = 0;
    this.scoreMultiplier = 1;
    this.comboTimer = 0;
    this.currentLane = 1;
    this.playerState = PlayerState.RUNNING;
    this.isSwitchingLane = false;
    this.isInvincible = false;
    this.isMagnet = false;
    this.laneLines = [];
    this.currentBiomeIndex = 0;
    this.lastBiomeDistance = 0;
    this.obstacleSpawnTimer = 2200;
    this.itemSpawnTimer = 800;

    // Apply Food Bonuses
    if (this.selectedFoodId === 'beans') {
      this.currentSpeed = CONSTS.BASE_SPEED * 1.15;
    }

    this.audioSystem = AudioSystem.getInstance();
    this.audioSystem.resume();
    this.audioSystem.startBGM();

    const w = this.scale.width;
    const h = this.scale.height;

    // Backgrounds (Parallax)
    this.bg1 = this.add.tileSprite(w / 2, h / 2, w, h, 'world').setDepth(-2);
    this.bg2 = this.add
      .tileSprite(w / 2, h / 2, w, h, 'world')
      .setDepth(-1)
      .setVisible(false);

    // Draw Lane Lines with glow
    const centerX = w / 2;
    for (let i = -1; i <= 1; i++) {
      if (i !== 0) {
        const lineX = centerX + (i * CONSTS.LANE_WIDTH) / 2;
        const line = this.add.tileSprite(lineX, h / 2, 12, h, 'lane_glow');
        line.setAlpha(0.25).setTint(0xb5e3aa);
        line.setDepth(0);
        this.laneLines.push(line);
      }
    }

    // --- High-Performance Reusable Particle Emitters ---
    this.coinBurstEmitter = this.add
      .particles(0, 0, 'spark', {
        speed: { min: 80, max: 240 },
        scale: { start: 0.9, end: 0 },
        alpha: { start: 1, end: 0 },
        lifespan: 450,
        emitting: false,
        tint: [0xfbbf24, 0xffdd00, 0xffffff]
      })
      .setDepth(150);

    this.powerupBurstEmitter = this.add
      .particles(0, 0, 'spark', {
        speed: { min: 120, max: 300 },
        scale: { start: 1.3, end: 0 },
        alpha: { start: 1, end: 0 },
        lifespan: 600,
        emitting: false,
        tint: [0xa855f7, 0x3b82f6, 0xffffff]
      })
      .setDepth(150);

    this.fartBurstEmitter = this.add
      .particles(0, 0, 'particle_puff', {
        speed: { min: 50, max: 140 },
        scale: { start: 0.65, end: 0.1 },
        alpha: { start: 0.85, end: 0 },
        lifespan: 550,
        emitting: false,
        tint:
          this.selectedFoodId === 'chili'
            ? [0xff4400, 0xf59e0b, 0xdc2626]
            : [0xa3e635, 0x84cc16, 0x4d7c0f]
      })
      .setDepth(12);

    this.trailEmitter = this.add
      .particles(0, 0, 'trail_particle', {
        scale: { start: 0.45, end: 0 },
        alpha: { start: 0.45, end: 0 },
        lifespan: 450,
        frequency: 45,
        tint:
          this.selectedFoodId === 'chili' ? [0xff4400, 0xfbbf24] : [0x55ff88, 0xaaffcc, 0x22c55e]
      })
      .setDepth(8);

    this.dustEmitter = this.add
      .particles(0, 0, 'particle_puff', {
        scale: { start: 0.35, end: 0 },
        alpha: { start: 0.4, end: 0 },
        lifespan: 350,
        frequency: -1
      })
      .setDepth(7);

    this.speedLineEmitter = this.add
      .particles(0, 0, 'speed_line', {
        x: { min: 0, max: w },
        y: -50,
        speedY: { min: 900, max: 1600 },
        scale: { start: 1, end: 0.4 },
        alpha: { start: 0.35, end: 0 },
        lifespan: 550,
        frequency: -1,
        angle: { min: 175, max: 185 }
      })
      .setDepth(50);

    // Player setup
    const playerX = centerX + CONSTS.LANE_POSITIONS[this.currentLane];
    const playerY = h - 260;
    this.player = this.physics.add.sprite(playerX, playerY, 'player');
    this.player.play('player_run');
    this.player.setDepth(10);

    // Apply Skin
    const equippedSkin = SaveManager.getSaveData().equippedSkin;
    if (equippedSkin === 'toxic') {
      this.player.setTint(0xbb94ff);
    } else if (equippedSkin === 'golden') {
      this.player.setTint(0xffd279);
    }

    // Invincible Glow
    this.invincibleGlow = this.add.image(0, 0, 'glow');
    this.invincibleGlow.setTint(0xffff00);
    this.invincibleGlow.setAlpha(0.45);
    this.invincibleGlow.setDepth(9);
    this.invincibleGlow.setVisible(false);

    this.player.setScale(1.05);
    this.player.setSize(75, 75);
    this.player.setOffset(26, 52);

    this.dustEmitter.startFollow(this.player, 0, 38);
    this.trailEmitter.startFollow(this.player, 0, 20);

    // Entities
    this.obstacles = this.physics.add.group();
    this.coins = this.physics.add.group();
    this.powerups = this.physics.add.group();

    // Inputs
    this.inputSystem = new InputSystem(this);
    this.setupInputListeners();

    // HUD & Mobile Controls
    this.createHUD(w);
    this.createTouchControls(w, h);
    this.showControlsTutorial(w, h);

    // Collisions
    this.physics.add.overlap(this.player, this.obstacles, this.hitObstacle, undefined, this);
    this.physics.add.overlap(this.player, this.coins, this.collectCoin, undefined, this);
    this.physics.add.overlap(this.player, this.powerups, this.collectPowerup, undefined, this);

    // Dynamic Missions Setup
    this.createChallengeUI();
    this.spawnNewChallenge();

    // Pause Menu
    this.createPauseMenu();

    // Visibility change handler
    this.visibilityHandler = () => {
      if (document.hidden && !this.isGameOver && !this.isPaused) {
        this.pauseGame();
      }
    };
    document.addEventListener('visibilitychange', this.visibilityHandler);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.shutdown, this);
    const actionKey = (event: KeyboardEvent, action: () => void) => {
      if (event.repeat || this.handledKeys.has(event)) return;
      this.handledKeys.add(event);
      action();
    };
    this.input.keyboard?.on('keydown-ESC', (event: KeyboardEvent) =>
      actionKey(event, () => {
        if (!this.isPaused) this.pauseGame();
        else this.resumeGame();
      })
    );
    this.input.keyboard?.on('keydown-E', (event: KeyboardEvent) =>
      actionKey(event, () => this.activateBurst())
    );
  }

  private createHUD(w: number) {
    panel(this, 24, 22, w - 48, 96).setDepth(100);
    label(this, 44, 34, 'PUNTEGGIO', 12, MUTED).setDepth(101).setLetterSpacing(2);
    this.scoreText = label(this, 44, 55, '0', 35, ACID, '800').setDepth(101);
    this.multiplierText = label(this, 220, 63, '', 22, ACID).setDepth(101);
    this.coinsText = label(this, w - 48, 43, '0 FAGIOLI', 23, ACID)
      .setOrigin(1, 0)
      .setDepth(101);
    this.distanceText = label(this, w - 48, 76, '0 m', 18, MUTED)
      .setOrigin(1, 0)
      .setDepth(101);
    const pause = label(this, w / 2, 70, 'Ⅱ', 32)
      .setOrigin(0.5)
      .setDepth(102)
      .setInteractive({ useHandCursor: true });
    pause.on('pointerdown', () => this.pauseGame());
    this.stageLabel = label(
      this,
      38,
      140,
      this.mode === 'expedition'
        ? '01 / ESOFAGO · SPEDIZIONE 3200 m'
        : '01 / ESOFAGO · CORSA INFINITA',
      16,
      MUTED
    ).setDepth(101);
    this.add
      .rectangle(38, 174, w - 76, 3, 0x2b4950)
      .setOrigin(0, 0.5)
      .setDepth(101);
    this.stageFill = this.add.rectangle(38, 174, 1, 3, 0xcef78a).setOrigin(0, 0.5).setDepth(102);
    this.effectLabel = label(this, w / 2, 270, '', 18, ACID)
      .setOrigin(0.5)
      .setDepth(101);
    panel(this, 230, 1060, 340, 102).setDepth(151);
    this.burstLabel = label(this, 400, 1082, 'GAS BURST · 0%', 18, ACID, '800')
      .setOrigin(0.5)
      .setDepth(152);
    this.add.rectangle(254, 1110, 292, 6, 0x33534f).setOrigin(0, 0.5).setDepth(152);
    this.burstFill = this.add.rectangle(254, 1110, 1, 6, 0xcef78a).setOrigin(0, 0.5).setDepth(153);
    label(this, 400, 1137, 'E / TOCCA PER ATTIVARE', 12, MUTED).setOrigin(0.5).setDepth(152);
    this.add
      .zone(400, 1111, 340, 102)
      .setDepth(154)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => this.activateBurst());
  }

  private activateBurst() {
    if (this.isPaused || this.isGameOver || !this.burst.activate()) return;
    this.burstCount++;
    this.audioSystem.playPowerup();
    this.createScorePopup(this.player.x, this.player.y - 130, 'GAS BURST!', '#cef78a');
    this.fartBurstEmitter.explode(22, this.player.x, this.player.y + 30);
  }

  // --- On-Screen Mobile Touch HUD Buttons ---
  private createTouchControls(w: number, h: number) {
    this.touchControlsContainer = this.add.container(0, 0).setDepth(150);

    const btnY = h - 90;

    // Left Button
    this.createTouchButton(65, btnY, '‹', () => this.switchDirection('left'), 0x3b82f6);
    // Right Button
    this.createTouchButton(155, btnY, '›', () => this.switchDirection('right'), 0x3b82f6);

    // Slide Button
    this.createTouchButton(w - 155, btnY, '↓', () => this.slide(), 0xd97706, 'GIÙ');
    // Jump Button
    this.createTouchButton(w - 65, btnY, '↑', () => this.jump(), 0x22c55e, 'SALTA');
  }

  private createTouchButton(
    x: number,
    y: number,
    icon: string,
    callback: () => void,
    tintColor: number,
    subLabel?: string
  ) {
    const size = 68;
    const btn = this.add.container(x, y);

    const bg = this.add.graphics();
    bg.fillStyle(0x0f172a, 0.7);
    bg.fillCircle(0, 0, size / 2);
    bg.lineStyle(2.5, tintColor, 0.85);
    bg.strokeCircle(0, 0, size / 2);

    const txt = this.add
      .text(0, subLabel ? -6 : 0, icon, {
        fontFamily: CONSTS.FONT_FAMILY,
        fontSize: '28px',
        color: '#ffffff'
      })
      .setOrigin(0.5);

    btn.add([bg, txt]);

    if (subLabel) {
      const lbl = this.add
        .text(0, 18, subLabel, {
          fontFamily: CONSTS.FONT_FAMILY,
          fontSize: '10px',
          color: '#94a3b8',
          fontStyle: '700'
        })
        .setOrigin(0.5);
      btn.add(lbl);
    }

    btn.setSize(size, size);
    btn.setInteractive({ useHandCursor: true });

    btn.on('pointerdown', () => {
      this.tweens.add({ targets: btn, scaleX: 0.88, scaleY: 0.88, duration: 60, yoyo: true });
      this.audioSystem.playUIClick();
      callback();
    });

    this.touchControlsContainer.add(btn);
  }

  private showControlsTutorial(w: number, h: number) {
    const c = this.add.container(w / 2, h / 2 - 100).setDepth(200);
    const bg = this.add
      .graphics()
      .fillStyle(0x102f37, 0.96)
      .fillRoundedRect(-265, -54, 530, 108, 18);
    c.add([
      bg,
      label(this, 0, -25, 'SALTA I PERICOLI A TERRA', 17, ACID).setOrigin(0.5),
      label(this, 0, 10, '↑ / Spazio: salta   ·   ↓: passa sotto i tubi', 18).setOrigin(0.5),
      label(this, 0, 35, '← → cambia corsia. Una via è sempre libera.', 16, MUTED).setOrigin(0.5)
    ]);
    this.tweens.add({
      targets: c,
      alpha: 0,
      delay: 4500,
      duration: 450,
      onComplete: () => c.destroy()
    });
  }

  private setupInputListeners() {
    this.events.on('input-left', () => this.switchDirection('left'));
    this.events.on('input-right', () => this.switchDirection('right'));
    this.events.on('input-up', () => this.jump());
    this.events.on('input-down', () => this.slide());
  }

  private switchDirection(dir: 'left' | 'right') {
    if (this.isGameOver || this.isPaused || this.isSwitchingLane) return;

    if (dir === 'left' && this.currentLane > 0) {
      this.switchLane((this.currentLane - 1) as LaneIndex);
    } else if (dir === 'right' && this.currentLane < 2) {
      this.switchLane((this.currentLane + 1) as LaneIndex);
    }
  }

  private switchLane(newLane: LaneIndex) {
    this.isSwitchingLane = true;
    const oldLane = this.currentLane;
    this.currentLane = newLane;

    const targetX = this.scale.width / 2 + CONSTS.LANE_POSITIONS[this.currentLane];

    // Check for "Schivata Perfetta" (Close Call) bonus
    this.checkCloseCallBonus(oldLane);

    this.tweens.add({
      targets: this.player,
      x: targetX,
      angle: { from: targetX > this.player.x ? 7 : -7, to: 0 },
      duration: CONSTS.LANE_SWITCH_DURATION,
      ease: 'Sine.easeOut',
      onComplete: () => {
        this.isSwitchingLane = false;
        if (this.player && this.player.active) this.player.angle = 0;
      }
    });

    // Safety timeout in case tween is interrupted
    this.time.delayedCall(CONSTS.LANE_SWITCH_DURATION + 40, () => {
      this.isSwitchingLane = false;
    });
  }

  private checkCloseCallBonus(oldLane: LaneIndex) {
    if (this.isGameOver) return;
    const oldLaneX = this.scale.width / 2 + CONSTS.LANE_POSITIONS[oldLane];
    const playerY = this.player.y;

    this.obstacles.getChildren().forEach((child) => {
      const obs = child as Phaser.Physics.Arcade.Sprite;
      if (!obs || !obs.active) return;

      const isSameLane = Math.abs(obs.x - oldLaneX) < 60;
      const distY = playerY - obs.y;

      // If obstacle was right in front of player (between 30px and 160px ahead)
      if (isSameLane && distY > 20 && distY < 180 && !obs.getData('closeCall')) {
        obs.setData('closeCall', true);
        this.closeCalls++;
        this.burst.charge(20);
        this.score += 100;
        this.createScorePopup(
          this.player.x,
          this.player.y - 70,
          'SCHIVATA PERFETTA +100',
          '#22c55e'
        );
        this.audioSystem.playCloseCall();
        this.haptic(20);
      }
    });
  }

  private jump() {
    if (this.isGameOver || this.isPaused || this.playerState !== PlayerState.RUNNING) return;

    this.playerState = PlayerState.JUMPING;
    this.audioSystem.playFartJump();
    this.player.play('player_jump');
    this.dustEmitter.stop();

    // Comic fart burst on jump!
    this.fartBurstEmitter.explode(10, this.player.x, this.player.y + 35);
    this.haptic(15);

    const startY = this.player.y;
    this.tweens.add({
      targets: this.player,
      y: startY - 170,
      scaleX: 1.25,
      scaleY: 1.25,
      duration: 340,
      yoyo: true,
      ease: 'Quad.easeOut',
      onComplete: () => {
        if (!this.isGameOver && this.player && this.player.active) {
          this.playerState = PlayerState.RUNNING;
          this.player.play('player_run');
          this.player.y = startY;
          this.player.setScale(1.05);
          this.dustEmitter.start();
          this.progressChallenge('jump');
        }
      }
    });
  }

  private slide() {
    if (this.isGameOver || this.isPaused || this.playerState !== PlayerState.RUNNING) return;

    this.playerState = PlayerState.SLIDING;
    this.audioSystem.playSlide();
    this.player.play('player_slide');
    this.player.setSize(75, 38);
    this.player.setOffset(26, 88);

    // Dust skid during slide
    this.fartBurstEmitter.explode(4, this.player.x, this.player.y + 25);
    this.haptic(15);

    this.time.delayedCall(CONSTS.PLAYER_SLIDE_DURATION, () => {
      if (!this.isGameOver && this.player && this.player.active) {
        this.playerState = PlayerState.RUNNING;
        this.player.play('player_run');
        this.player.setSize(75, 75);
        this.player.setOffset(26, 52);
      }
    });
  }

  private spawnObstacle() {
    const wave = createWave(this.waveIndex++, this.currentBiomeIndex);
    this.safeLane = wave.safeLane;
    for (const { lane, key } of wave.hazards) {
      const x = this.scale.width / 2 + CONSTS.LANE_POSITIONS[lane];
      const obs = this.obstacles.create(x, -120, key) as Phaser.Physics.Arcade.Sprite;
      obs.setVelocityY(this.currentSpeed).setScale(0.5);
      if (key === 'premium_barrier') obs.setSize(120, 36).setOffset(10, 8);
      else if (key === 'premium_trap') obs.setSize(95, 34).setOffset(16, 20);
      else obs.setSize(80, 80).setOffset(24, 30);
    }
  }

  private hitObstacle(_playerObj: unknown, obstacleObj: unknown) {
    if (this.isGameOver || this.isPaused) return;
    const obs = obstacleObj as Phaser.Physics.Arcade.Sprite;
    if (!obs || !obs.active) return;

    // Invincibility destroys obstacles!
    if (this.isInvincible || this.burst.active) {
      const smashX = obs.x;
      const smashY = obs.y;
      obs.destroy();
      this.audioSystem.playSmash();
      this.powerupBurstEmitter.explode(14, smashX, smashY);
      this.score += 150;
      this.createScorePopup(smashX, smashY, '💥 SMASH! +150', '#fbbf24');
      if (!SaveManager.getSaveData().reducedEffects) {
        this.cameras.main.shake(120, 0.015);
      }
      this.haptic([20, 30]);
      return;
    }

    const key = obs.texture.key;

    // Rule 1: JUMP clears floor hazards (obs_spike and obs_trap)
    if (
      this.playerState === PlayerState.JUMPING &&
      (key === 'obs_spike' || key === 'premium_trap')
    ) {
      return;
    }

    // Rule 2: SLIDE clears overhead barriers (obs_barrier)
    if (this.playerState === PlayerState.SLIDING && key === 'premium_barrier') {
      return;
    }

    this.gameOver();
  }

  private spawnItem() {
    const lane = this.safeLane as LaneIndex;
    const x = this.scale.width / 2 + CONSTS.LANE_POSITIONS[lane];
    const y = -120;

    const isPowerup = Math.random() < 0.12;

    if (isPowerup) {
      const isMagnet = Math.random() < 0.5;
      const key = isMagnet ? CONSTS.KEYS.PWR_MAGNET : CONSTS.KEYS.PWR_INVINCIBLE;
      const pwr = this.powerups.create(x, y, key) as Phaser.Physics.Arcade.Sprite;
      if (!pwr) return;

      pwr.setVelocityY(this.currentSpeed);
      pwr.setScale(0.4);
      pwr.setData('type', isMagnet ? 'magnet' : 'invincibility');
    } else {
      // Spawn trail of 3 coins
      for (let i = 0; i < 3; i++) {
        const coin = this.coins.create(x, y - i * 85, 'bean') as Phaser.Physics.Arcade.Sprite;
        if (!coin) continue;
        coin.setVelocityY(this.currentSpeed);
        coin.setScale(0.35);
      }
    }
  }

  private collectCoin(_playerObj: unknown, coinObj: unknown) {
    if (this.isGameOver || this.isPaused) return;
    const coin = coinObj as Phaser.Physics.Arcade.Sprite;
    if (!coin || !coin.active) return;

    const coinX = coin.x;
    const coinY = coin.y;
    coin.destroy();

    // High performance particle burst
    this.coinBurstEmitter.explode(8, coinX, coinY);

    this.audioSystem.playCoin(this.scoreMultiplier);
    this.haptic(15);

    const bonus = this.selectedFoodId === 'chili' ? 2 : 1;
    this.coinsCollected += CONSTS.COIN_VALUE * bonus;
    const points = 10 * this.scoreMultiplier * bonus;
    this.score += points;
    this.burst.charge(8);

    SaveManager.updateMissionProgress('collect_beans_total', 1);
    if (
      MissionManager.checkMissionCompletion(
        'collect_beans_total',
        SaveManager.getMissionProgress('collect_beans_total')
      )
    ) {
      this.showMissionComplete('Maestro dei Fagioli! (+500)');
    }

    this.scoreMultiplier = Math.min(
      this.scoreMultiplier + (this.selectedFoodId === 'chili' ? 2 : 1),
      15
    );
    this.comboTimer = 2200;
    this.progressChallenge('collect');

    this.coinsText.setText(`${this.coinsCollected} FAGIOLI`);
    this.multiplierText.setText(`×${this.scoreMultiplier}`);
    this.multiplierText.setVisible(this.scoreMultiplier > 1);

    this.tweens.add({
      targets: this.coinsText,
      scaleX: 1.3,
      scaleY: 1.3,
      yoyo: true,
      duration: 80
    });

    if (this.scoreMultiplier > 1) {
      this.tweens.add({
        targets: this.multiplierText,
        scaleX: 1.3,
        scaleY: 1.3,
        yoyo: true,
        duration: 80
      });
    }

    this.createScorePopup(coinX, coinY, `+${points}`);
  }

  private createScorePopup(x: number, y: number, text: string, color: string = '#fbbf24') {
    const popup = this.add
      .text(x, y, text, {
        fontFamily: CONSTS.FONT_FAMILY,
        fontSize: '22px',
        color,
        fontStyle: '800',
        stroke: '#000000',
        strokeThickness: 4
      })
      .setOrigin(0.5)
      .setDepth(200);

    this.tweens.add({
      targets: popup,
      y: y - 90,
      alpha: 0,
      duration: 750,
      ease: 'Cubic.easeOut',
      onComplete: () => popup.destroy()
    });
  }

  private collectPowerup(_playerObj: unknown, pwrObj: unknown) {
    if (this.isGameOver || this.isPaused) return;
    const pwr = pwrObj as Phaser.Physics.Arcade.Sprite;
    if (!pwr || !pwr.active) return;

    const pwrX = pwr.x;
    const pwrY = pwr.y;
    const type = pwr.getData('type');
    pwr.destroy();

    this.powerupBurstEmitter.explode(15, pwrX, pwrY);
    this.audioSystem.playPowerup();
    this.haptic(35);

    if (type === 'invincibility') {
      this.isInvincible = true;
      this.invincibleGlow.setVisible(true);
      this.createScorePopup(pwrX, pwrY, '⭐ INVINCIBILITÀ!', '#fbbf24');

      const upgrades = SaveManager.getSaveData().upgrades || {};
      const duration = CONSTS.POWERUP_DURATION + (upgrades.invincibilityLevel || 0) * 2000;

      this.invincibleUntil = Math.max(this.invincibleUntil, duration);
    } else if (type === 'magnet') {
      this.isMagnet = true;
      this.createScorePopup(pwrX, pwrY, '🧲 MAGNETE ATTIVO!', '#3b82f6');

      const upgrades = SaveManager.getSaveData().upgrades || {};
      const duration = CONSTS.POWERUP_DURATION + (upgrades.magnetLevel || 0) * 2000;

      this.magnetUntil = Math.max(this.magnetUntil, duration);
    }
  }

  private gameOver(completed = false) {
    if (this.isGameOver) return;
    this.isGameOver = true;
    this.playerState = PlayerState.DEAD;
    this.physics.pause();

    this.audioSystem.stopBGM();
    if (completed) this.audioSystem.playPowerup();
    else this.audioSystem.playPeto('gameover');
    this.player.play(completed ? 'player_jump' : 'player_dead');

    this.dustEmitter.stop();
    this.trailEmitter.stop();
    this.speedLineEmitter.stop();

    if (this.invincibleGlow) this.invincibleGlow.setVisible(false);

    // Comic spin / impact
    this.tweens.add({
      targets: this.player,
      angle: completed ? 0 : 180,
      y: this.player.y - 40,
      duration: 350,
      ease: 'Quad.easeOut'
    });

    const reducedEffects = SaveManager.getSaveData().reducedEffects;
    if (!reducedEffects && !completed) {
      this.cameras.main.shake(400, 0.025);
      this.cameras.main.flash(300, 255, 50, 50);
    }
    this.haptic([60, 40, 100]);

    document.removeEventListener('visibilitychange', this.visibilityHandler);
    SaveManager.addLeaderboardEntry(Math.floor(this.score), Math.floor(this.distance));

    // Transition smoothly without black-screen freeze
    this.time.delayedCall(1200, () => {
      this.scene.start(CONSTS.SCENES.GAMEOVER, {
        score: Math.floor(this.score),
        distance: Math.floor(this.distance),
        coins: this.coinsCollected,
        selectedFood: this.selectedFoodId,
        mode: this.mode,
        completed,
        bursts: this.burstCount,
        closeCalls: this.closeCalls
      });
    });
  }

  update(_time: number, delta: number) {
    if (this.isGameOver || this.isPaused) return;

    delta = Math.min(delta, 80);
    this.burst.tick(delta);
    this.invincibleUntil = Math.max(0, this.invincibleUntil - delta);
    this.magnetUntil = Math.max(0, this.magnetUntil - delta);
    this.isInvincible = this.invincibleUntil > 0;
    this.isMagnet = this.magnetUntil > 0;
    this.invincibleGlow.setVisible(this.isInvincible || this.burst.active);
    this.invincibleGlow.setPosition(this.player.x, this.player.y);
    this.burstFill.width = 292 * this.burst.fraction;
    this.burstLabel.setText(
      this.burst.active
        ? 'GAS BURST · ATTIVO'
        : this.burst.ready
          ? 'GAS BURST · PRONTO!'
          : `GAS BURST · ${Math.floor(this.burst.energy)}%`
    );
    this.stageFill.width = ((this.scale.width - 76) * (this.distance % 800)) / 800;
    this.effectLabel.setText(
      [
        this.isInvincible ? `SCUDO ${Math.ceil(this.invincibleUntil / 1000)}s` : '',
        this.isMagnet ? `MAGNETE ${Math.ceil(this.magnetUntil / 1000)}s` : ''
      ]
        .filter(Boolean)
        .join('   /   ')
    );
    // Follow player with glow
    if (this.isInvincible && this.invincibleGlow && this.player) {
      this.invincibleGlow.setPosition(this.player.x, this.player.y);
    }

    // Scrolling backgrounds
    const bgDelta = delta / 1000;
    this.bg1.tilePositionY -= this.currentSpeed * 0.2 * bgDelta;
    this.bg2.tilePositionY -= this.currentSpeed * 0.5 * bgDelta;

    // Lane line scrolling
    this.laneLines.forEach((line) => {
      line.tilePositionY -= this.currentSpeed * 0.8 * bgDelta;
    });

    // Speed progression
    if (this.currentSpeed < CONSTS.MAX_SPEED) {
      this.currentSpeed += CONSTS.SPEED_INCREMENT * bgDelta;
    }

    // BGM tempo
    const speedRatio = this.currentSpeed / CONSTS.BASE_SPEED;
    this.audioSystem.setBGMTempo(speedRatio);

    // Speed lines at high speed
    if (this.currentSpeed > CONSTS.BASE_SPEED * 1.4) {
      this.speedLineEmitter.emitParticle(1);
    }

    if (this.mode === 'expedition' && this.distance >= 3200) {
      this.score += 2500;
      this.gameOver(true);
      return;
    }
    // Stage Transition check (every 800m for exciting progression)
    if (this.distance - this.lastBiomeDistance >= 800) {
      this.transitionToNextStage();
    }

    // Combo Logic
    if (this.comboTimer > 0) {
      this.comboTimer -= delta;
      if (this.comboTimer <= 0) {
        this.scoreMultiplier = 1;
        this.multiplierText.setVisible(false);
      }
    }

    // Distance and score
    this.distance += (this.currentSpeed * delta) / 10000;
    this.score += 10 * this.scoreMultiplier * bgDelta;

    this.distanceText.setText(`${Math.floor(this.distance)}m`);
    this.scoreText.setText(`${Math.floor(this.score)}`);

    // Spawning logic (items)
    this.itemSpawnTimer -= delta;
    if (this.itemSpawnTimer <= 0) {
      this.spawnItem();
      this.itemSpawnTimer =
        Phaser.Math.Between(1000, 1800) * (CONSTS.BASE_SPEED / this.currentSpeed);
    }

    // Spawning logic (obstacles)
    this.obstacleSpawnTimer -= delta;
    if (this.obstacleSpawnTimer <= 0) {
      this.spawnObstacle();
      this.obstacleSpawnTimer =
        Phaser.Math.Between(1350, 1900) * (CONSTS.BASE_SPEED / this.currentSpeed);
    }

    // Magnet logic
    if (this.isMagnet && !this.isGameOver) {
      const magnetRange = this.selectedFoodId === 'onion' ? 650 : 450;
      const coinChildren = [...this.coins.getChildren()];
      for (const child of coinChildren) {
        const coin = child as Phaser.Physics.Arcade.Sprite;
        if (!coin || !coin.active || !coin.body) continue;

        const distY = this.player.y - coin.y;
        const distX = this.player.x - coin.x;

        if (Math.abs(distY) < magnetRange) {
          coin.x += distX * 0.15;
          coin.y += distY * 0.15;
          coin.setVelocityY(0);
        }
      }
    }

    // Safe cleanup and fake 3D perspective scaling
    const playerY = this.player.y;
    const spawnY = -120;

    const cleanupGroup = (group: Phaser.Physics.Arcade.Group, checkBonus: boolean = false) => {
      const children = [...group.getChildren()];
      for (const child of children) {
        const obj = child as Phaser.Physics.Arcade.Sprite;
        if (!obj || !obj.active) continue;

        if (obj.y > this.scale.height + 120) {
          obj.destroy();
          if (checkBonus && !this.isGameOver) {
            this.score += 50;
            this.progressChallenge('dodge');
          }
          continue;
        }

        // Safe fake 3D: scale grows from 0.4 to 1.0 as object approaches player
        const progress = Phaser.Math.Clamp((obj.y - spawnY) / (playerY - spawnY), 0, 1);
        const scale = 0.4 + progress * 0.6;
        obj.setScale(scale);

        if (obj.body && !(group === this.coins && this.isMagnet)) {
          obj.setVelocityY(this.currentSpeed);
        }
      }
    };

    cleanupGroup(this.obstacles, true);
    cleanupGroup(this.coins);
    cleanupGroup(this.powerups);
  }

  private showMissionComplete(text: string) {
    const w = this.scale.width;
    const container = this.add
      .container(w / 2, -100)
      .setDepth(1000)
      .setScrollFactor(0);

    const bg = this.add.graphics();
    bg.fillStyle(0x22c55e, 0.95);
    bg.fillRoundedRect(-160, 0, 320, 60, 14);
    bg.lineStyle(2, 0xffffff, 0.4);
    bg.strokeRoundedRect(-160, 0, 320, 60, 14);

    const txt = this.add
      .text(0, 30, `🎯 ${text}`, {
        fontFamily: CONSTS.FONT_FAMILY,
        fontSize: '16px',
        color: '#ffffff',
        fontStyle: '800',
        align: 'center'
      })
      .setOrigin(0.5);

    container.add([bg, txt]);

    this.tweens.add({
      targets: container,
      y: 95,
      duration: 500,
      ease: 'Back.easeOut',
      hold: 2000,
      yoyo: true
    });

    this.audioSystem.playPowerup();
  }

  private transitionToNextStage() {
    this.currentBiomeIndex = (this.currentBiomeIndex + 1) % CONSTS.STAGES.length;
    this.lastBiomeDistance = this.distance;

    const stage = CONSTS.STAGES[this.currentBiomeIndex];
    this.audioSystem.playPeto('end');

    // Mission tracking
    if (stage.name === 'Stomaco') {
      if (MissionManager.checkMissionCompletion('reach_stomach', 1)) {
        this.showMissionComplete('Stomaco Raggiunto! (+200)');
      }
    } else if (stage.name === 'Intestino Crasso') {
      if (MissionManager.checkMissionCompletion('reach_intestine_c', 1)) {
        this.showMissionComplete('Intestino Crasso! (+1000)');
      }
    }

    // Stage name banner
    const text = this.add
      .text(this.scale.width / 2, 220, stage.name.toUpperCase(), {
        fontFamily: CONSTS.FONT_FAMILY,
        fontSize: '44px',
        color: '#ffffff',
        fontStyle: '900',
        stroke: '#000000',
        strokeThickness: 6,
        shadow: { color: '#a855f7', blur: 22, fill: true, stroke: true }
      })
      .setOrigin(0.5)
      .setAlpha(0)
      .setDepth(200);

    this.tweens.add({
      targets: text,
      alpha: 1,
      y: 260,
      duration: 700,
      yoyo: true,
      hold: 1000,
      onComplete: () => text.destroy()
    });

    if (!SaveManager.getSaveData().reducedEffects) {
      this.cameras.main.flash(300, 168, 85, 247);
    }
    this.haptic(40);

    this.stageLabel.setText(
      `${String(this.currentBiomeIndex + 1).padStart(2, '0')} / ${stage.name.toUpperCase()}`
    );
    this.bg1.setTexture(
      ['world', 'world-stomach', 'world-small', 'world-deep'][this.currentBiomeIndex]
    );
    this.bg2.setTint(stage.bg2);
    this.laneLines.forEach((line) => line.setTint(stage.lanes));
  }

  // --- Dynamic Challenge Methods ---

  private createChallengeUI() {
    const w = this.scale.width;
    this.challengeContainer = this.add.container(w / 2, -100).setDepth(200);

    const bg = this.add.graphics();
    bg.fillStyle(0x000000, 0.75);
    bg.fillRoundedRect(-180, 0, 360, 56, 28);
    bg.lineStyle(1, 0x80a899, 0.45);
    bg.strokeRoundedRect(-180, 0, 360, 56, 28);

    this.challengeContainer.add(bg);

    this.challengeText = this.add
      .text(0, 28, 'MISSIONE...', {
        fontFamily: CONSTS.FONT_FAMILY,
        fontSize: '15px',
        color: '#ffffff',
        fontStyle: '800',
        align: 'center',
        stroke: '#000000',
        strokeThickness: 3
      })
      .setOrigin(0.5);
    this.challengeContainer.add(this.challengeText);
  }

  private spawnNewChallenge() {
    const types = [
      { type: 'collect', goal: 20, desc: 'Raccogli 20 fagioli' },
      { type: 'dodge', goal: 10, desc: 'Supera 10 ostacoli' },
      { type: 'jump', goal: 5, desc: 'Salta 5 volte' }
    ];
    const pick = types[Phaser.Math.Between(0, types.length - 1)];
    this.activeChallenge = { ...pick, progress: 0, description: pick.desc };
    this.updateChallengeUI();

    this.tweens.add({
      targets: this.challengeContainer,
      y: 193,
      duration: 600,
      ease: 'Back.easeOut'
    });
  }

  private updateChallengeUI() {
    if (!this.activeChallenge) return;
    this.challengeText.setText(
      `${this.activeChallenge.description.toUpperCase()}\n[ ${this.activeChallenge.progress} / ${this.activeChallenge.goal} ]`
    );
  }

  private progressChallenge(type: string, amount: number = 1) {
    if (!this.activeChallenge || this.activeChallenge.type !== type) return;
    this.activeChallenge.progress += amount;
    this.updateChallengeUI();

    if (this.activeChallenge.progress >= this.activeChallenge.goal) {
      this.completeChallenge();
    }
  }

  private completeChallenge() {
    this.audioSystem.playPowerup();
    this.score += 500;
    this.createScorePopup(this.scale.width / 2, 220, '🎯 +500 MISSIONE!');

    const reducedEffects = SaveManager.getSaveData().reducedEffects;
    if (!reducedEffects) {
      this.cameras.main.shake(300, 0.012);
      this.cameras.main.flash(400, 0, 255, 0, true);
    }
    this.haptic([35]);

    this.tweens.add({
      targets: this.challengeContainer,
      y: -100,
      duration: 500,
      ease: 'Back.easeIn'
    });

    this.activeChallenge = null;
    this.time.delayedCall(4500, () => this.spawnNewChallenge());
  }

  // --- Pause Menu ---

  private createPauseMenu() {
    const w = this.scale.width,
      h = this.scale.height;
    this.pauseContainer = this.add.container(0, 0).setDepth(2000).setVisible(false);
    const shield = this.add.rectangle(w / 2, h / 2, w, h, 0x06151c, 0.94).setInteractive();
    const title = label(this, w / 2, 380, 'Prendi fiato.', 60, '#edf4df', '900').setOrigin(0.5);
    const sub = label(this, w / 2, 455, 'La spedizione ti aspetta.', 23, MUTED).setOrigin(0.5);
    const resume = button(
      this,
      w / 2,
      590,
      460,
      'RIPRENDI     →',
      () => this.resumeGame(),
      true,
      82
    );
    const mute = button(this, w / 2, 695, 460, 'AUDIO ON / OFF', () =>
      this.audioSystem.toggleMute()
    );
    const exit = button(this, w / 2, 800, 460, 'TORNA AL MENU', () =>
      this.scene.start(CONSTS.SCENES.MENU)
    );
    this.pauseContainer.add([shield, title, sub, resume, mute, exit]);
  }

  private pauseGame() {
    if (this.isPaused || this.isGameOver) return;
    this.isPaused = true;
    this.physics.pause();
    this.time.paused = true;
    this.pausedTweens = this.tweens.getTweens().filter((t) => t.isPlaying());
    this.pausedTweens.forEach((t) => t.pause());
    this.player.anims.pause();
    this.audioSystem.stopBGM();
    this.pauseContainer.setVisible(true);
  }

  private resumeGame() {
    if (!this.isPaused || this.resumePending) return;
    this.resumePending = true;
    // Resume only on an explicit gesture; all simulation clocks remained frozen.
    this.pauseContainer.setVisible(false);
    this.isPaused = false;
    this.resumePending = false;
    this.physics.resume();
    this.time.paused = false;
    this.pausedTweens.forEach((t) => t.resume());
    this.pausedTweens = [];
    this.player.anims.resume();
    this.audioSystem.startBGM();
  }

  // --- Haptic Feedback ---

  private haptic(pattern: number | number[]) {
    const reducedEffects = SaveManager.getSaveData().reducedEffects;
    if (reducedEffects) return;
    if ('vibrate' in navigator) {
      try {
        navigator.vibrate(pattern);
      } catch {
        // Safe ignore
      }
    }
  }

  // --- Cleanup ---

  shutdown() {
    document.removeEventListener('visibilitychange', this.visibilityHandler);
    if (this.audioSystem) this.audioSystem.stopBGM();
    if (this.inputSystem) this.inputSystem.destroy();
    ['left', 'right', 'up', 'down'].forEach((dir) =>
      this.events.removeAllListeners('input-' + dir)
    );
    this.time.paused = false;
  }
}
