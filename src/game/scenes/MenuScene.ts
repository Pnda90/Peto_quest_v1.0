import Phaser from 'phaser';
import { CONSTS } from '../consts';
import { SaveManager } from '../systems/SaveManager';
import { MissionManager } from '../systems/MissionManager';
import { backdrop, button, label, panel, ACID, MUTED } from '../ui/Theme';
export class MenuScene extends Phaser.Scene {
  constructor() {
    super(CONSTS.SCENES.MENU);
  }
  create() {
    backdrop(this, 'PETO QUEST   /   DEEP GUT');
    const save = SaveManager.getSaveData();
    label(this, 752, 43, 'EDIZIONE 02', 15, MUTED).setOrigin(1, 0);
    label(this, 48, 106, 'PICCOLO EROE.', 64, '#edf4df', '900').setLetterSpacing(-2);
    label(this, 48, 176, 'GRANDE GAS.', 74, ACID, '900').setLetterSpacing(-3);
    label(this, 50, 270, 'Un viaggio fuori di testa. Dentro di te.', 23, MUTED);
    const orbit = this.add.graphics();
    orbit.lineStyle(1, 0x8dac91, 0.22).strokeCircle(400, 480, 154).strokeCircle(400, 480, 191);
    orbit.lineStyle(4, 0xc6f587, 0.65).beginPath().arc(400, 480, 191, -0.7, 0.1).strokePath();
    label(this, 70, 365, 'SPECIMEN\nPQ—001', 14, MUTED).setLineSpacing(5);
    label(this, 730, 556, '100%\nINSTABILE', 14, MUTED).setOrigin(1, 0).setLineSpacing(5);
    const hero = this.add.image(400, 475, 'hero').setDisplaySize(310, 310);
    if (!save.reducedEffects)
      this.tweens.add({
        targets: hero,
        y: 461,
        angle: 3,
        duration: 2200,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut'
      });
    button(
      this,
      400,
      704,
      704,
      'INIZIA LA SPEDIZIONE     →',
      () => this.scene.start(CONSTS.SCENES.SELECTION),
      true,
      86
    );
    button(this, 219, 800, 342, 'LABORATORIO', () => this.scene.start(CONSTS.SCENES.SHOP));
    button(this, 581, 800, 342, 'RECORD LOCALI', () => this.scene.start(CONSTS.SCENES.LEADERBOARD));
    panel(this, 48, 864, 704, 132);
    const mission = MissionManager.getActiveMissions()[0];
    label(
      this,
      72,
      884,
      mission ? 'PROSSIMO OBIETTIVO' : 'TUTTE LE MISSIONI COMPLETATE',
      14,
      ACID
    ).setLetterSpacing(2);
    label(this, 72, 915, mission?.description || 'Il prossimo record è tuo.', 23);
    if (mission) {
      const progress = Math.min(SaveManager.getMissionProgress(mission.id), mission.goal);
      this.add.rectangle(72, 969, 656, 4, 0x29474b).setOrigin(0, 0.5);
      this.add
        .rectangle(72, 969, Math.max(2, (656 * progress) / mission.goal), 4, 0xcef78a)
        .setOrigin(0, 0.5);
      label(this, 728, 886, `${progress} / ${mission.goal}`, 15, MUTED).setOrigin(1, 0);
    }
    label(
      this,
      50,
      1022,
      `RECORD  ${save.highScore.toLocaleString('it-IT')}   /   FAGIOLI  ${save.coins}`,
      18,
      MUTED
    );
    button(
      this,
      400,
      1100,
      310,
      'IMPOSTAZIONI',
      () => this.scene.start('SettingsScene'),
      false,
      54
    );
    label(this, 400, 1155, 'FRECCE / WASD  ·  SPAZIO: SALTA  ·  E: GAS BURST', 14, MUTED).setOrigin(
      0.5
    );
    this.input.keyboard?.once('keydown-ENTER', () => this.scene.start(CONSTS.SCENES.SELECTION));
  }
}
