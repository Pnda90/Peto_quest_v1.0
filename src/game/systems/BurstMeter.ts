/** Simulation-time meter: never advances while the scene is paused. */
export class BurstMeter {
  energy = 0;
  remaining = 0;
  get active() {
    return this.remaining > 0;
  }
  get ready() {
    return this.energy >= 100 && !this.active;
  }
  get fraction() {
    return this.active ? this.remaining / 3000 : this.energy / 100;
  }
  charge(amount: number) {
    if (!this.active && Number.isFinite(amount))
      this.energy = Math.min(100, Math.max(0, this.energy + amount));
  }
  activate() {
    if (!this.ready) return false;
    this.energy = 0;
    this.remaining = 3000;
    return true;
  }
  tick(delta: number) {
    if (Number.isFinite(delta)) this.remaining = Math.max(0, this.remaining - Math.max(0, delta));
  }
}
