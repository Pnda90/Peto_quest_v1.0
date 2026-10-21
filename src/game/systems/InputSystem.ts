import Phaser from 'phaser';

export class InputSystem {
  private handledKeys = new WeakSet<KeyboardEvent>();
  private scene: Phaser.Scene;
  private cursors?: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasd?: object;

  // Swipe handling
  private swipeMinDistance = 25; // px
  private swipeMaxTime = 400; // ms
  private touchStartX = 0;
  private touchStartY = 0;
  private touchStartTime = 0;
  private isSwiping = false;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.setupInputs();
  }

  private setupInputs(): void {
    if (this.scene.input.keyboard) {
      this.cursors = this.scene.input.keyboard.createCursorKeys();
      this.wasd = this.scene.input.keyboard.addKeys({
        up: Phaser.Input.Keyboard.KeyCodes.W,
        down: Phaser.Input.Keyboard.KeyCodes.S,
        left: Phaser.Input.Keyboard.KeyCodes.A,
        right: Phaser.Input.Keyboard.KeyCodes.D,
        space: Phaser.Input.Keyboard.KeyCodes.SPACE
      });

      const bindings = {
        LEFT: 'left',
        A: 'left',
        RIGHT: 'right',
        D: 'right',
        UP: 'up',
        W: 'up',
        SPACE: 'up',
        DOWN: 'down',
        S: 'down'
      } as const;
      for (const [key, direction] of Object.entries(bindings)) {
        this.scene.input.keyboard.on('keydown-' + key, (event: KeyboardEvent) => {
          if (event.repeat || this.handledKeys.has(event)) return;
          this.handledKeys.add(event);
          this.emitDirection(direction);
        });
      }
    }

    // Touch / Pointer Swipe + Tap Handling
    this.scene.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      // Ignore if clicking UI (top 100px or bottom HUD buttons zone handled by buttons)
      if (pointer.y < 190 || pointer.y > this.scene.scale.height - 170) return;
      this.touchStartX = pointer.x;
      this.touchStartY = pointer.y;
      this.touchStartTime = Date.now();
      this.isSwiping = true;
    });

    this.scene.input.on('pointerup', (pointer: Phaser.Input.Pointer) => {
      if (!this.isSwiping) return;
      this.isSwiping = false;

      const deltaX = pointer.x - this.touchStartX;
      const deltaY = pointer.y - this.touchStartY;
      const deltaTime = Date.now() - this.touchStartTime;
      const absX = Math.abs(deltaX);
      const absY = Math.abs(deltaY);

      if (deltaTime < this.swipeMaxTime && Math.max(absX, absY) >= this.swipeMinDistance) {
        if (absX > absY) {
          // Horizontal swipe
          if (deltaX > 0) this.emitDirection('right');
          else this.emitDirection('left');
        } else {
          // Vertical swipe
          if (deltaY > 0) this.emitDirection('down');
          else this.emitDirection('up');
        }
      } else if (deltaTime < 250 && Math.max(absX, absY) < 15) {
        // Quick tap: tap left third to go left, right third to go right, middle top to jump
        const screenW = this.scene.scale.width;
        if (pointer.x < screenW * 0.38) {
          this.emitDirection('left');
        } else if (pointer.x > screenW * 0.62) {
          this.emitDirection('right');
        } else {
          // Center tap: if upper half jump, lower half slide
          if (pointer.y < this.scene.scale.height * 0.7) {
            this.emitDirection('up');
          } else {
            this.emitDirection('down');
          }
        }
      }
    });

    this.scene.input.on('pointerout', () => {
      this.isSwiping = false;
    });
  }

  public emitDirection(dir: 'left' | 'right' | 'up' | 'down') {
    this.scene.events.emit('input-' + dir);
  }

  public destroy(): void {
    if (this.scene.input.keyboard) {
      this.scene.input.keyboard.removeAllListeners();
    }
    this.scene.input.removeAllListeners();
  }
}
