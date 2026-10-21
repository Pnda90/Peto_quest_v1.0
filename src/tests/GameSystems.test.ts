import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SaveManager } from '../game/systems/SaveManager';
import { MissionManager, MISSIONS } from '../game/systems/MissionManager';
import { AudioSystem } from '../game/systems/AudioSystem';

describe('Game Systems Suite', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  describe('SaveManager extended', () => {
    it('should unlock and equip skins', () => {
      SaveManager.unlockSkin('toxic');
      expect(SaveManager.getSaveData().unlockedSkins).toContain('toxic');

      SaveManager.equipSkin('toxic');
      expect(SaveManager.getSaveData().equippedSkin).toBe('toxic');

      // Cannot equip locked skin
      SaveManager.equipSkin('non_existent');
      expect(SaveManager.getSaveData().equippedSkin).toBe('toxic');
    });

    it('should purchase upgrades if coins available', () => {
      SaveManager.addCoins(500);
      const bought = SaveManager.purchaseUpgrade('invincibilityLevel', 200);
      expect(bought).toBe(true);
      expect(SaveManager.getUpgradeLevel('invincibilityLevel')).toBe(1);
      expect(SaveManager.getSaveData().coins).toBe(300);

      const failed = SaveManager.purchaseUpgrade('invincibilityLevel', 500);
      expect(failed).toBe(false);
      expect(SaveManager.getUpgradeLevel('invincibilityLevel')).toBe(1);
    });

    it('should manage leaderboard entries and keep only top 10 sorted', () => {
      for (let i = 1; i <= 15; i++) {
        SaveManager.addLeaderboardEntry(i * 100, i * 50);
      }
      const leaderboard = SaveManager.getLeaderboard();
      expect(leaderboard.length).toBe(10);
      expect(leaderboard[0].score).toBe(1500);
      expect(leaderboard[9].score).toBe(600);
    });
  });

  describe('MissionManager', () => {
    it('should complete mission and award coins only once', () => {
      const mission = MISSIONS[1]; // reach_stomach (goal: 1, reward: 200)
      const initialCoins = SaveManager.getSaveData().coins;

      const completed = MissionManager.checkMissionCompletion('reach_stomach', 1);
      expect(completed).toBe(true);
      expect(SaveManager.getSaveData().coins).toBe(initialCoins + mission.reward);

      // Subsequent check should return false (already completed)
      const completedAgain = MissionManager.checkMissionCompletion('reach_stomach', 1);
      expect(completedAgain).toBe(false);
    });

    it('should return active missions correctly', () => {
      const active = MissionManager.getActiveMissions();
      expect(active.length).toBeGreaterThan(0);

      // Complete all missions
      MISSIONS.forEach((m) => {
        MissionManager.checkMissionCompletion(m.id, m.goal);
      });

      const activeAfter = MissionManager.getActiveMissions();
      expect(activeAfter.length).toBe(0);
    });
  });

  describe('AudioSystem', () => {
    it('should provide a singleton instance', () => {
      const a1 = AudioSystem.getInstance();
      const a2 = AudioSystem.getInstance();
      expect(a1).toBe(a2);
    });

    it('should toggle mute state and update save data', () => {
      const audio = AudioSystem.getInstance();
      const initialMuted = audio.getIsMuted();

      const newMuted = audio.toggleMute();
      expect(newMuted).toBe(!initialMuted);
      expect(SaveManager.getSaveData().audioEnabled).toBe(!newMuted);

      // Toggle back
      audio.toggleMute();
      expect(audio.getIsMuted()).toBe(initialMuted);
    });

    it('should clamp tempo multiplier safely', () => {
      const audio = AudioSystem.getInstance();
      // Should not throw or crash on negative or NaN
      audio.setBGMTempo(-5);
      audio.setBGMTempo(NaN);
      audio.setBGMTempo(100);
    });
  });
});
