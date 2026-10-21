import { SaveManager } from './SaveManager';

export interface Mission {
  id: string;
  description: string;
  goal: number;
  reward: number;
}

export const MISSIONS: Mission[] = [
  {
    id: 'collect_beans_total',
    description: 'Raccogli 1000 fagioli totali',
    goal: 1000,
    reward: 500
  },
  { id: 'reach_stomach', description: 'Raggiungi lo Stomaco', goal: 1, reward: 200 },
  { id: 'reach_intestine_c', description: "Raggiungi l'Intestino Crasso", goal: 1, reward: 1000 }
];

export class MissionManager {
  static checkMissionCompletion(missionId: string, currentProgress: number): boolean {
    const mission = MISSIONS.find((m) => m.id === missionId);
    if (!mission) return false;

    const data = SaveManager.getSaveData();
    if (data.missions[missionId + ':claimed']) return false;
    if (currentProgress >= mission.goal) {
      data.coins += mission.reward;
      data.missions[missionId] = Math.max(data.missions[missionId] || 0, mission.goal);
      data.missions[missionId + ':claimed'] = 1;
      SaveManager.save(data);
      return true;
    }
    return false;
  }

  static getActiveMissions() {
    return MISSIONS.filter((m) => SaveManager.getMissionProgress(m.id) < m.goal);
  }
}
