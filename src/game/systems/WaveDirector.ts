export type Hazard = 'obs_spike' | 'premium_trap' | 'premium_barrier';
export interface Wave {
  safeLane: number;
  hazards: { lane: number; key: Hazard }[];
}
/** Every authored row leaves a full lane open. Early rows teach one action at a time. */
export function createWave(index: number, biome: number, random = Math.random): Wave {
  const safeLane = Math.min(2, Math.max(0, Math.floor(random() * 3)));
  const keys: Hazard[] = ['obs_spike', 'premium_trap', 'premium_barrier'];
  const key = keys[index < 3 ? 0 : (index + biome) % 3];
  const lanes = [(safeLane + 1) % 3, (safeLane + 2) % 3];
  const count = index < 5 || index % 3 === 0 ? 1 : 2;
  return { safeLane, hazards: lanes.slice(0, count).map((lane) => ({ lane, key })) };
}
