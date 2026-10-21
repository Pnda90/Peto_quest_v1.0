import Phaser from 'phaser';
import { CONSTS } from '../consts';
import { SaveManager } from '../systems/SaveManager';
import { AudioSystem } from '../systems/AudioSystem';
import { backdrop, button, label, panel, ACID, MUTED } from '../ui/Theme';
export class SettingsScene extends Phaser.Scene {
  constructor() {
    super('SettingsScene');
  }
  create() {
    backdrop(this, 'IMPOSTAZIONI');
    label(this, 48, 115, 'Al tuo ritmo.', 60, '#edf4df', '900');
    const data = SaveManager.getSaveData();
    panel(this, 48, 290, 704, 150);
    label(this, 72, 319, 'Suono e musica', 29);
    label(this, 72, 368, 'Colonna sonora e suoni sintetizzati.', 18, MUTED);
    button(
      this,
      643,
      365,
      166,
      data.audioEnabled ? 'ATTIVI' : 'SPENTI',
      () => {
        AudioSystem.getInstance().toggleMute();
        this.scene.restart();
      },
      data.audioEnabled
    );
    panel(this, 48, 466, 704, 150);
    label(this, 72, 495, 'Effetti ridotti', 29);
    label(this, 72, 544, 'Riduce movimento, flash e vibrazioni.', 18, MUTED);
    button(
      this,
      643,
      541,
      166,
      data.reducedEffects ? 'SÌ' : 'NO',
      () => {
        const s = SaveManager.getSaveData();
        s.reducedEffects = !s.reducedEffects;
        SaveManager.save(s);
        this.scene.restart();
      },
      data.reducedEffects
    );
    label(this, 48, 692, 'COMANDI', 16, ACID).setLetterSpacing(3);
    label(
      this,
      48,
      743,
      '← → / A D     Cambia corsia\n↑ / W / Spazio     Salta\n↓ / S     Scivola\nE     Attiva Gas Burst\nEsc     Pausa / riprendi',
      26
    ).setLineSpacing(18);
    label(
      this,
      48,
      1012,
      'Su touch: scorri o usa i pulsanti in basso.\nI progressi vengono salvati su questo browser.',
      19,
      MUTED
    ).setLineSpacing(9);
    button(this, 400, 1130, 704, '←  TORNA AL MENU', () => this.scene.start(CONSTS.SCENES.MENU));
  }
}
