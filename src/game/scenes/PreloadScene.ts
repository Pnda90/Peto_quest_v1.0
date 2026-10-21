import Phaser from 'phaser';
import { CONSTS } from '../consts';

export class PreloadScene extends Phaser.Scene {
  constructor() {
    super(CONSTS.SCENES.PRELOAD);
  }

  preload() {
    this.createLoadingBar();

    this.load.setPath('art/');
    for (const key of [
      'hero',
      'world',
      'world-stomach',
      'world-small',
      'world-deep',
      'bean',
      'onion',
      'chili',
      'run0',
      'run1',
      'run2',
      'run3',
      'jump',
      'slide',
      'dead'
    ])
      this.load.svg(key, `${key}.svg`);
    this.load.svg('obs_spike', 'spike.svg');
    this.load.svg('premium_trap', 'trap.svg');
    this.load.svg('premium_barrier', 'barrier.svg');
    this.load.setPath('generated/');
    this.load.image('particle_puff', 'particle_puff.png');
  }

  create() {
    const canvas = document.createElement('canvas');
    canvas.width = 896;
    canvas.height = 128;
    const context = canvas.getContext('2d')!;
    ['run0', 'run1', 'run2', 'run3', 'jump', 'slide', 'dead'].forEach((key, i) =>
      context.drawImage(
        this.textures.get(key).getSourceImage() as HTMLImageElement,
        i * 128,
        0,
        128,
        128
      )
    );
    const atlas = this.textures.addCanvas('player', canvas)!;
    ['run_0', 'run_1', 'run_2', 'run_3', 'jump', 'slide', 'dead'].forEach((key, i) =>
      atlas.add(key, 0, i * 128, 0, 128, 128)
    );
    this.createAnimations();
    this.scene.start(CONSTS.SCENES.MENU);
  }

  private createAnimations() {
    this.anims.create({
      key: 'player_run',
      frames: [
        { key: 'player', frame: 'run_0' },
        { key: 'player', frame: 'run_1' },
        { key: 'player', frame: 'run_2' },
        { key: 'player', frame: 'run_3' }
      ],
      frameRate: 10,
      repeat: -1
    });

    this.anims.create({
      key: 'player_jump',
      frames: [{ key: 'player', frame: 'jump' }],
      frameRate: 1
    });

    this.anims.create({
      key: 'player_slide',
      frames: [{ key: 'player', frame: 'slide' }],
      frameRate: 1
    });

    this.anims.create({
      key: 'player_dead',
      frames: [{ key: 'player', frame: 'dead' }],
      frameRate: 1
    });
  }

  private createLoadingBar() {
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    // Loading screen
    const bg = this.add.graphics();
    bg.fillGradientStyle(0x0a2029, 0x0a2029, 0x153a3c, 0x153a3c);
    bg.fillRect(0, 0, width, height);

    // Title
    const title = this.add.text(width / 2, height / 2 - 120, 'PETO QUEST', {
      fontFamily: CONSTS.FONT_FAMILY,
      fontSize: '56px',
      color: CONSTS.COLORS.TITLE,
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 6
    });
    title.setOrigin(0.5);

    // Subtitle
    const subtitle = this.add.text(width / 2, height / 2 - 65, 'DEEP GUT / EDIZIONE 02', {
      fontFamily: CONSTS.FONT_FAMILY,
      fontSize: '20px',
      color: '#cef78a',
      fontStyle: '600'
    });
    subtitle.setOrigin(0.5);

    // Loading bar container with rounded corners
    const barWidth = 320;
    const barHeight = 24;
    const barX = width / 2 - barWidth / 2;
    const barY = height / 2 + 20;

    const prgBox = this.add.graphics();
    prgBox.fillStyle(0x1a1a2e, 0.9);
    prgBox.fillRoundedRect(barX - 4, barY - 4, barWidth + 8, barHeight + 8, 16);
    prgBox.lineStyle(2, 0xcef78a, 0.6);
    prgBox.strokeRoundedRect(barX - 4, barY - 4, barWidth + 8, barHeight + 8, 16);

    const prgBar = this.add.graphics();

    // Percentage text
    const percentText = this.add.text(width / 2, barY + barHeight + 30, '0%', {
      fontFamily: CONSTS.FONT_FAMILY,
      fontSize: '18px',
      color: '#cef78a',
      fontStyle: '600'
    });
    percentText.setOrigin(0.5);

    // Loading text
    const loadingText = this.add.text(width / 2, barY + barHeight + 60, 'Preparando i gas...', {
      fontFamily: CONSTS.FONT_FAMILY,
      fontSize: '14px',
      color: '#666688'
    });
    loadingText.setOrigin(0.5);

    this.load.on('progress', (value: number) => {
      prgBar.clear();
      // Gradient bar effect
      prgBar.fillStyle(0xcef78a, 1);
      prgBar.fillRoundedRect(barX, barY, barWidth * value, barHeight, 12);
      // Bright overlay stripe
      prgBar.fillStyle(0xb4db86, 0.5);
      prgBar.fillRoundedRect(barX, barY, barWidth * value, barHeight / 2, {
        tl: 12,
        tr: 12,
        bl: 0,
        br: 0
      });

      percentText.setText(`${Math.floor(value * 100)}%`);
    });

    this.load.on('complete', () => {
      prgBar.destroy();
      prgBox.destroy();
      percentText.destroy();
      loadingText.destroy();
    });
  }
}
