import { describe, it, expect, beforeEach } from 'vitest';
import { BurstMeter } from '../game/systems/BurstMeter';
import { createWave } from '../game/systems/WaveDirector';
import { SaveManager } from '../game/systems/SaveManager';
import { MissionManager } from '../game/systems/MissionManager';
describe('Deep Gut gameplay regressions', () => {
  beforeEach(() => localStorage.clear());
  it('requires a full charge, prevents stacked activations and expires after 3 simulated seconds', () => {
    const meter = new BurstMeter();
    meter.charge(96);
    expect(meter.activate()).toBe(false);
    meter.charge(8);
    expect(meter.energy).toBe(100);
    expect(meter.activate()).toBe(true);
    meter.charge(100);
    expect(meter.energy).toBe(0);
    expect(meter.activate()).toBe(false);
    meter.tick(2999);
    expect(meter.active).toBe(true);
    meter.tick(1);
    expect(meter.active).toBe(false);
    meter.charge(100);
    expect(meter.ready).toBe(true);
  });
  it('always leaves a safe lane across all region and wave combinations', () => {
    for (let stage = 0; stage < 4; stage++)
      for (let row = 0; row < 60; row++)
        for (const random of [0, 0.35, 0.99]) {
          const wave = createWave(row, stage, () => random);
          expect(wave.hazards.length).toBeLessThan(3);
          expect(wave.hazards.every((h) => h.lane !== wave.safeLane)).toBe(true);
          expect(new Set(wave.hazards.map((h) => h.lane)).size).toBe(wave.hazards.length);
        }
  });
  it('awards cumulative collection reward once, including the threshold coin', () => {
    SaveManager.updateMissionProgress('collect_beans_total', 1000);
    expect(MissionManager.checkMissionCompletion('collect_beans_total', 1000)).toBe(true);
    expect(SaveManager.getSaveData().coins).toBe(500);
    expect(MissionManager.checkMissionCompletion('collect_beans_total', 1001)).toBe(false);
    expect(SaveManager.getSaveData().coins).toBe(500);
  });
  it('does not leak mutable default arrays into a new profile', () => {
    SaveManager.unlockSkin('golden');
    localStorage.clear();
    expect(SaveManager.getSaveData().unlockedSkins).toEqual(['default']);
  });
  it('isolates the original game save and rejects invalid currency operations', () => {
    localStorage.setItem('fart_quest_save_v1', JSON.stringify({ coins: 123 }));
    SaveManager.addCoins(25);
    expect(SaveManager.spendCoins(-100)).toBe(false);
    expect(SaveManager.spendCoins(NaN)).toBe(false);
    expect(JSON.parse(localStorage.getItem('fart_quest_save_v1')!).coins).toBe(123);
  });
  it('caps permanent upgrades at level five', () => {
    SaveManager.addCoins(9999);
    for (let i = 0; i < 5; i++) expect(SaveManager.purchaseUpgrade('magnetLevel', 200)).toBe(true);
    expect(SaveManager.purchaseUpgrade('magnetLevel', 200)).toBe(false);
  });
});
