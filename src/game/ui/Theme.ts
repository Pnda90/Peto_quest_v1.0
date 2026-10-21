import Phaser from 'phaser';
import { CONSTS } from '../consts';
import { AudioSystem } from '../systems/AudioSystem';
import { SaveManager } from '../systems/SaveManager';
export const INK = '#edf4df',
  MUTED = '#9ab3b0',
  ACID = '#cef78a';
export function label(
  s: Phaser.Scene,
  x: number,
  y: number,
  text: string,
  size = 22,
  color = INK,
  weight = '600'
) {
  return s.add.text(x, y, text, {
    fontFamily: CONSTS.FONT_FAMILY,
    fontSize: `${size}px`,
    color,
    fontStyle: weight
  });
}
export function panel(
  s: Phaser.Scene,
  x: number,
  y: number,
  w: number,
  h: number,
  color = 0x143139
) {
  const g = s.add.graphics();
  g.fillStyle(color, 0.96).fillRoundedRect(x, y, w, h, 22);
  g.lineStyle(1, 0x75948b, 0.3).strokeRoundedRect(x, y, w, h, 22);
  return g;
}
export function backdrop(s: Phaser.Scene, eyebrow?: string) {
  s.cameras.main.setBackgroundColor('#0a2029');
  s.add.image(400, 600, 'world').setAlpha(0.45);
  const g = s.add.graphics();
  g.fillGradientStyle(0x091e27, 0x091e27, 0x091e27, 0x091e27, 0.25, 0.25, 0.97, 0.97).fillRect(
    0,
    0,
    800,
    1200
  );
  if (eyebrow) label(s, 48, 43, eyebrow, 16, ACID).setLetterSpacing(4);
  if (!SaveManager.getSaveData().reducedEffects) s.cameras.main.fadeIn(220);
}
export function button(
  s: Phaser.Scene,
  x: number,
  y: number,
  w: number,
  text: string,
  action: () => void,
  primary = false,
  height = 72
) {
  const c = s.add.container(x, y);
  const bg = s.add.graphics();
  const draw = (hover: boolean) => {
    bg.clear().fillStyle(primary ? (hover ? 0xe5ffb4 : 0xcef78a) : hover ? 0x234850 : 0x15343d);
    bg.fillRoundedRect(-w / 2, -height / 2, w, height, 18);
    bg.lineStyle(1, primary ? 0xe9ffbd : 0x52756f, 0.65).strokeRoundedRect(
      -w / 2,
      -height / 2,
      w,
      height,
      18
    );
  };
  draw(false);
  c.add([bg, label(s, 0, 0, text, 22, primary ? '#163431' : INK, '800').setOrigin(0.5)]);
  c.setSize(w, height).setInteractive({ useHandCursor: true });
  c.on('pointerover', () => draw(true)).on('pointerout', () => draw(false));
  c.on('pointerdown', () => {
    AudioSystem.getInstance().resume();
    AudioSystem.getInstance().playUIClick();
    action();
  });
  return c;
}
