import { PetoQuestGame } from './game/Game';
window.addEventListener('load', () => {
  const game = new PetoQuestGame();
  // Development-only hook for deterministic browser regression tests.
  if (import.meta.env.DEV) Object.assign(window, { __PETO_GAME__: game });
});
