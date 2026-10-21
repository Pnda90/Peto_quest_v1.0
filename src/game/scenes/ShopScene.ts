import Phaser from 'phaser';
import { CONSTS } from '../consts';
import { SaveManager } from '../systems/SaveManager';
import { backdrop, button, label, panel, ACID, MUTED } from '../ui/Theme';
export class ShopScene extends Phaser.Scene {
  constructor() {
    super(CONSTS.SCENES.SHOP);
  }
  create() {
    backdrop(this, 'LABORATORIO   /   EVOLUZIONE');
    const data = SaveManager.getSaveData();
    label(this, 48, 115, 'Fatto per evolvere.', 52, '#edf4df', '900');
    label(this, 48, 194, `${data.coins} FAGIOLI DISPONIBILI`, 20, ACID).setLetterSpacing(2);
    const notice = label(
      this,
      400,
      1030,
      'Si acquista con i fagioli raccolti giocando.',
      18,
      MUTED
    ).setOrigin(0.5);
    label(this, 48, 264, 'IL TUO LOOK', 15, MUTED).setLetterSpacing(3);
    const skins = [
      { id: 'default', name: 'Originale', cost: 0, tint: 0xffffff },
      { id: 'toxic', name: 'Ultravioletto', cost: 100, tint: 0xbb94ff },
      { id: 'golden', name: 'Oro orbitale', cost: 500, tint: 0xffd279 }
    ];
    skins.forEach((skin, i) => {
      const x = 48 + i * 240;
      panel(this, x, 305, 224, 302);
      this.add
        .image(x + 112, 398, 'hero')
        .setDisplaySize(146, 146)
        .setTint(skin.tint);
      label(this, x + 112, 482, skin.name, 22).setOrigin(0.5);
      const owned = data.unlockedSkins.includes(skin.id),
        equipped = data.equippedSkin === skin.id;
      button(
        this,
        x + 112,
        558,
        196,
        equipped ? 'IN USO' : owned ? 'EQUIPAGGIA' : `${skin.cost} FAGIOLI`,
        () => {
          if (!owned) {
            if (!SaveManager.spendCoins(skin.cost)) {
              notice.setText('Servono più fagioli. Un’altra corsa?');
              return;
            }
            SaveManager.unlockSkin(skin.id);
          }
          SaveManager.equipSkin(skin.id);
          this.scene.restart();
        },
        equipped,
        54
      );
    });
    label(this, 48, 655, 'POTENZIAMENTI PERMANENTI', 15, MUTED).setLetterSpacing(3);
    (['invincibilityLevel', 'magnetLevel'] as const).forEach((id, i) => {
      const y = 699 + i * 147,
        level = data.upgrades[id],
        cost = 200 * (level + 1);
      panel(this, 48, y, 704, 126);
      label(this, 72, y + 22, i === 0 ? 'Scudo prolungato' : 'Campo magnetico', 27);
      label(this, 72, y + 65, `LIVELLO ${level}/5  ·  ${5 + level * 2} secondi`, 17, MUTED);
      button(
        this,
        627,
        y + 63,
        198,
        level >= 5 ? 'AL MASSIMO' : `${cost} FAGIOLI`,
        () => {
          if (level >= 5) return;
          if (!SaveManager.purchaseUpgrade(id, cost)) {
            notice.setText('Fagioli insufficienti per questo potenziamento.');
            return;
          }
          this.scene.restart();
        },
        false,
        60
      );
    });
    button(this, 400, 1130, 704, '←  TORNA AL MENU', () => this.scene.start(CONSTS.SCENES.MENU));
  }
}
