import Phaser from 'phaser';
import { CONSTS } from '../consts';
import { SaveManager } from '../systems/SaveManager';
import { backdrop, button, label, panel, ACID, MUTED } from '../ui/Theme';
export class LeaderboardScene extends Phaser.Scene {
  constructor() {
    super(CONSTS.SCENES.LEADERBOARD);
  }
  create() {
    backdrop(this, 'ARCHIVIO   /   RECORD LOCALI');
    label(this, 48, 115, 'Lascia il segno.', 60, '#edf4df', '900');
    label(this, 48, 200, 'Le tue 10 migliori corse su questo browser.', 22, MUTED);
    const records = SaveManager.getLeaderboard();
    label(this, 76, 279, '#', 15, MUTED);
    label(this, 160, 279, 'PUNTEGGIO', 15, MUTED);
    label(this, 420, 279, 'DISTANZA', 15, MUTED);
    if (!records.length) {
      this.add.image(400, 545, 'hero').setDisplaySize(220, 220);
      label(this, 400, 715, 'La prima leggenda sei tu.', 30, ACID).setOrigin(0.5);
    }
    records.forEach((r, i) => {
      const y = 320 + i * 67;
      panel(this, 48, y, 704, 57);
      label(this, 76, y + 15, String(i + 1).padStart(2, '0'), 23, i === 0 ? ACID : MUTED);
      label(this, 160, y + 15, r.score.toLocaleString('it-IT'), 23);
      label(this, 420, y + 17, `${r.distance} m`, 20, MUTED);
      label(this, 726, y + 19, r.date, 15, MUTED).setOrigin(1, 0);
    });
    button(this, 400, 1130, 704, '←  TORNA AL MENU', () => this.scene.start(CONSTS.SCENES.MENU));
  }
}
