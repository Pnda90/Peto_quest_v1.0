import Phaser from 'phaser';
import { CONSTS } from '../consts';
import { backdrop, button, label, panel, ACID, MUTED } from '../ui/Theme';
export class SelectionScene extends Phaser.Scene {
  constructor() {
    super(CONSTS.SCENES.SELECTION);
  }
  create() {
    backdrop(this, 'PREPARAZIONE   /   01');
    label(this, 48, 115, 'Scegli il carburante.', 51, '#edf4df', '900');
    label(this, 48, 191, 'Tre ricette. Tre modi di lasciare il segno.', 22, MUTED);
    const details = [
      ['bean', 'SPRINT', 'Fagioli magici', 'Parti con il 15% di velocità in più.'],
      ['onion', 'ATTRAZIONE', 'Cipolla orbitale', 'Il magnete raggiunge i fagioli più lontani.'],
      ['chili', 'PUNTEGGIO', 'Peperoncino infernale', 'Fagioli e punti raccolti valgono il doppio.']
    ];
    let selected = 'beans';
    let mode: 'expedition' | 'endless' = 'expedition';
    const frames: Phaser.GameObjects.Graphics[] = [];
    const select = (i: number) => {
      selected = CONSTS.FOODS[i].id;
      frames.forEach((f, j) => {
        f.clear();
        if (i === j) f.lineStyle(3, 0xcef78a).strokeRoundedRect(48, 276 + j * 194, 704, 172, 22);
      });
    };
    details.forEach(([icon, tag, name, desc], i) => {
      const y = 276 + i * 194;
      panel(this, 48, y, 704, 172);
      this.add.image(125, y + 83, icon).setDisplaySize(94, 94);
      label(this, 201, y + 25, tag, 14, ACID).setLetterSpacing(3);
      label(this, 201, y + 55, name, 29, '#edf4df', '800');
      label(this, 201, y + 103, desc, 18, MUTED).setWordWrapWidth(500);
      frames.push(this.add.graphics());
      this.add
        .zone(400, y + 86, 704, 172)
        .setInteractive({ useHandCursor: true })
        .on('pointerdown', () => select(i));
    });
    select(0);
    const modeLabel = label(this, 400, 881, 'SPEDIZIONE · 4 REGIONI · 3200 m', 19, ACID)
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });
    modeLabel.on('pointerdown', () => {
      mode = mode === 'expedition' ? 'endless' : 'expedition';
      modeLabel.setText(
        mode === 'expedition'
          ? 'SPEDIZIONE · 4 REGIONI · 3200 m'
          : 'CORSA INFINITA · FINO AL TUO LIMITE'
      );
    });
    label(this, 400, 911, 'Tocca per cambiare modalità', 14, MUTED).setOrigin(0.5);
    label(
      this,
      48,
      945,
      'Raccogli fagioli, carica il GAS BURST e premi E.\nPer 3 secondi puoi distruggere ogni ostacolo.',
      21,
      MUTED
    ).setLineSpacing(8);
    const start = () => this.scene.start(CONSTS.SCENES.GAME, { selectedFood: selected, mode });
    button(this, 400, 1041, 704, 'SI PARTE     →', start, true, 82);
    button(
      this,
      400,
      1135,
      250,
      '←  INDIETRO',
      () => this.scene.start(CONSTS.SCENES.MENU),
      false,
      50
    );
    this.input.keyboard?.once('keydown-ENTER', start);
  }
}
