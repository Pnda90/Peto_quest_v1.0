export type LaneIndex = 0 | 1 | 2; // Left, Center, Right

export enum PlayerState {
  RUNNING,
  JUMPING,
  SLIDING,
  DEAD
}

export enum PowerUpType {
  INVINCIBILITY = 'invincibility',
  MAGNET = 'magnet'
}
