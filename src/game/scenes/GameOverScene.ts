import Phaser from 'phaser';
import { CONSTS } from '../consts';
import { SaveManager } from '../systems/SaveManager';
import { backdrop, button, label, panel, ACID, MUTED } from '../ui/Theme';
export class GameOverScene extends Phaser.Scene {
  private result = {
    score: 0,
    distance: 0,
    coins: 0,
    selectedFood: 'beans',
    bursts: 0,
    closeCalls: 0,
    mode: 'expedition' as 'expedition' | 'endless',
    completed: false
  };
  constructor() {
    super(CONSTS.SCENES.GAMEOVER);
  }
  init(data: Partial<typeof this.result>) {
    this.result = {
      score: 0,
      distance: 0,
      coins: 0,
      selectedFood: 'beans',
      bursts: 0,
      closeCalls: 0,
      mode: 'expedition',
      completed: false,
      ...data
    };
  }
  create() {
    const r = this.result;
    SaveManager.addCoins(r.coins);
    const record = SaveManager.updateHighScore(r.score);
    backdrop(this, 'RAPPORTO DI SPEDIZIONE');
    label(
      this,
      48,
      115,
      r.completed ? 'Missione compiuta.' : record ? 'Nuovo record.' : 'Fine della corsa.',
      60,
      '#edf4df',
      '900'
    );
    label(
      this,
      48,
      200,
      r.completed
        ? '4 regioni attraversate. Bonus finale: +2500 punti.'
        : 'Il gas finisce. La leggenda continua.',
      23,
      MUTED
    );
    this.add.image(400, 365, 'hero').setDisplaySize(220, 220).setAngle(12);
    panel(this, 48, 510, 704, 260);
    label(this, 80, 540, record ? 'RECORD PERSONALE' : 'PUNTEGGIO', 16, ACID).setLetterSpacing(3);
    label(this, 80, 575, r.score.toLocaleString('it-IT'), 78, '#edf4df', '900');
    label(this, 80, 701, `${r.distance} m percorsi`, 23, MUTED);
    label(this, 720, 701, `+${r.coins} fagioli`, 23, ACID).setOrigin(1, 0);
    label(
      this,
      50,
      807,
      `${r.closeCalls} SCHIVATE PERFETTE   /   ${r.bursts} GAS BURST`,
      18,
      MUTED
    );
    button(
      this,
      400,
      923,
      704,
      'RIPROVA     ↻',
      () => this.scene.start(CONSTS.SCENES.GAME, { selectedFood: r.selectedFood, mode: r.mode }),
      true,
      86
    );
    button(this, 219, 1022, 342, 'CAMBIA RICETTA', () => this.scene.start(CONSTS.SCENES.SELECTION));
    button(this, 581, 1022, 342, 'LABORATORIO', () => this.scene.start(CONSTS.SCENES.SHOP));
    button(this, 400, 1120, 310, '←  MENU', () => this.scene.start(CONSTS.SCENES.MENU), false, 52);
    this.input.keyboard?.once('keydown-ENTER', () =>
      this.scene.start(CONSTS.SCENES.GAME, { selectedFood: r.selectedFood, mode: r.mode })
    );
  }
}
