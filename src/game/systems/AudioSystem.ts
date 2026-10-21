import { SaveManager } from './SaveManager';

export class AudioSystem {
  private static instance: AudioSystem;
  private audioCtx: AudioContext | null = null;
  private isMuted: boolean = false;

  // BGM State
  private bgmIntervalId: number | null = null;
  private isBgmPlaying = false;
  private bgmStep = 0;
  private nextNoteTime = 0;
  private currentTempoMultiplier = 1;

  // Cache for noise buffer
  private noiseBuffer: AudioBuffer | null = null;

  // Catchy chiptune melody (C minor pentatonic + driving bass)
  private bgmSequence = [
    // Measure 1
    261.63, 0, 261.63, 311.13, 0, 392.0, 0, 311.13,
    // Measure 2
    349.23, 0, 349.23, 392.0, 0, 261.63, 0, 0,
    // Measure 3
    261.63, 0, 261.63, 311.13, 0, 392.0, 0, 311.13,
    // Measure 4
    466.16, 0, 466.16, 392.0, 0, 349.23, 311.13, 0
  ];

  private constructor() {
    this.isMuted = !SaveManager.getSaveData().audioEnabled;
  }

  public static getInstance(): AudioSystem {
    if (!AudioSystem.instance) {
      AudioSystem.instance = new AudioSystem();
    }
    return AudioSystem.instance;
  }

  public init(): void {
    const initAudio = () => {
      try {
        if (!this.audioCtx) {
          const AudioCtxClass =
            window.AudioContext ||
            (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
          if (AudioCtxClass) {
            this.audioCtx = new AudioCtxClass();
          }
        }
        if (this.audioCtx && this.audioCtx.state === 'suspended') {
          this.audioCtx.resume();
        }

        if (this.audioCtx) {
          const buffer = this.audioCtx.createBuffer(1, 1, 22050);
          const source = this.audioCtx.createBufferSource();
          source.buffer = buffer;
          source.connect(this.audioCtx.destination);
          source.start(0);
          this.prepareNoiseBuffer();
        }
      } catch (err) {
        console.warn('AudioContext init error:', err);
      }

      window.removeEventListener('click', initAudio);
      window.removeEventListener('touchstart', initAudio);
      window.removeEventListener('pointerdown', initAudio);
      window.removeEventListener('keydown', initAudio);
    };

    window.addEventListener('click', initAudio, { once: true });
    window.addEventListener('touchstart', initAudio, { once: true });
    window.addEventListener('pointerdown', initAudio, { once: true });
    window.addEventListener('keydown', initAudio, { once: true });
  }

  public resume(): void {
    try {
      if (this.audioCtx && this.audioCtx.state === 'suspended') {
        this.audioCtx.resume();
      }
    } catch {
      // safe fallback
    }
  }

  private prepareNoiseBuffer() {
    if (!this.audioCtx) return;
    try {
      const bufferSize = this.audioCtx.sampleRate * 2;
      this.noiseBuffer = this.audioCtx.createBuffer(1, bufferSize, this.audioCtx.sampleRate);
      const data = this.noiseBuffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }
    } catch (e) {
      console.warn('prepareNoiseBuffer failed', e);
    }
  }

  public toggleMute(): boolean {
    this.isMuted = !this.isMuted;
    const data = SaveManager.getSaveData();
    data.audioEnabled = !this.isMuted;
    SaveManager.save(data);

    if (this.isMuted) {
      this.stopBGM();
    }
    return this.isMuted;
  }

  public getIsMuted(): boolean {
    return this.isMuted;
  }

  public setBGMTempo(multiplier: number) {
    if (isNaN(multiplier) || multiplier <= 0) multiplier = 1;
    this.currentTempoMultiplier = Math.max(0.6, Math.min(2.5, multiplier));
  }

  public startBGM() {
    if (this.isMuted || this.isBgmPlaying) return;
    this.isBgmPlaying = true;

    const checkCtx = () => {
      if (!this.isBgmPlaying) return;
      if (this.audioCtx && this.audioCtx.state === 'running') {
        this.bgmStep = 0;
        this.nextNoteTime = this.audioCtx.currentTime + 0.05;
        if (this.bgmIntervalId !== null) window.clearInterval(this.bgmIntervalId);
        this.bgmIntervalId = window.setInterval(() => this.scheduleBGM(), 80);
      } else {
        setTimeout(checkCtx, 250);
      }
    };
    checkCtx();
  }

  public stopBGM() {
    this.isBgmPlaying = false;
    if (this.bgmIntervalId !== null) {
      window.clearInterval(this.bgmIntervalId);
      this.bgmIntervalId = null;
    }
  }

  private scheduleBGM() {
    if (!this.isBgmPlaying || !this.audioCtx || this.isMuted) return;

    try {
      const currentTime = this.audioCtx.currentTime;
      // If time lagged behind, resynchronize safely
      if (this.nextNoteTime < currentTime) {
        this.nextNoteTime = currentTime + 0.02;
      }

      const scheduleAheadTime = 0.4;
      const baseNoteLength = 0.115;
      const noteStep = baseNoteLength / (this.currentTempoMultiplier || 1);

      let maxIterations = 16; // Safeguard against runaway loops
      while (this.nextNoteTime < currentTime + scheduleAheadTime && maxIterations > 0) {
        maxIterations--;
        const freq = this.bgmSequence[this.bgmStep];
        if (freq > 0) {
          this.playBGMNote(freq, this.nextNoteTime, noteStep);
        }
        this.nextNoteTime += noteStep;
        this.bgmStep = (this.bgmStep + 1) % this.bgmSequence.length;
      }
    } catch (e) {
      console.warn('scheduleBGM safe catch', e);
    }
  }

  private playBGMNote(freq: number, time: number, duration: number) {
    if (!this.audioCtx) return;
    try {
      const osc = this.audioCtx.createOscillator();
      const gainNode = this.audioCtx.createGain();

      osc.type = 'square';
      osc.frequency.setValueAtTime(freq / 2, time);

      const startTime = Math.max(time, this.audioCtx.currentTime + 0.002);
      const attack = Math.min(0.015, duration * 0.25);
      const safeDuration = Math.max(0.04, duration);

      gainNode.gain.setValueAtTime(0.001, startTime);
      gainNode.gain.linearRampToValueAtTime(0.045, startTime + attack);
      gainNode.gain.exponentialRampToValueAtTime(0.0001, startTime + safeDuration);

      osc.connect(gainNode);
      gainNode.connect(this.audioCtx.destination);

      osc.start(startTime);
      osc.stop(startTime + safeDuration);
    } catch {
      // safe fallback for AudioParam errors
    }
  }

  public playJump() {
    if (this.isMuted || !this.audioCtx) return;
    this.playTone(280, 560, 0.12, 'sine');
  }

  public playFartJump() {
    if (this.isMuted || !this.audioCtx) return;
    this.playTone(160, 60, 0.22, 'sawtooth');
    this.playNoise(0.12);
  }

  public playSlide() {
    if (this.isMuted || !this.audioCtx) return;
    this.playNoise(0.24);
  }

  public playCoin(comboMultiplier: number = 1) {
    if (this.isMuted || !this.audioCtx) return;
    // Pitch scales with combo for addictive reward loop!
    const pitchOffset = Math.min((comboMultiplier - 1) * 60, 600);
    this.playMultipleTones(
      [
        { freqStart: 880 + pitchOffset, freqEnd: 880 + pitchOffset, duration: 0.05 },
        { freqStart: 1200 + pitchOffset, freqEnd: 1320 + pitchOffset, duration: 0.09 }
      ],
      'square'
    );
  }

  public playCloseCall() {
    if (this.isMuted || !this.audioCtx) return;
    this.playTone(700, 1100, 0.15, 'triangle');
  }

  public playPowerup() {
    if (this.isMuted || !this.audioCtx) return;
    this.playMultipleTones(
      [
        { freqStart: 300, freqEnd: 450, duration: 0.08 },
        { freqStart: 450, freqEnd: 600, duration: 0.08 },
        { freqStart: 600, freqEnd: 900, duration: 0.15 }
      ],
      'sine'
    );
  }

  public playSmash() {
    if (this.isMuted || !this.audioCtx) return;
    this.playTone(200, 60, 0.25, 'sawtooth');
    this.playNoise(0.3);
  }

  public playHit() {
    if (this.isMuted || !this.audioCtx) return;
    this.playTone(180, 45, 0.22, 'sawtooth');
    this.playNoise(0.25);
  }

  public playPeto(type: 'start' | 'end' | 'gameover' | 'default' = 'default') {
    if (this.isMuted || !this.audioCtx) return;

    switch (type) {
      case 'start':
        this.playTone(70, 110, 0.45, 'sawtooth');
        this.playNoise(0.25);
        break;
      case 'end':
        this.playMultipleTones(
          [
            { freqStart: 440, freqEnd: 660, duration: 0.1 },
            { freqStart: 660, freqEnd: 880, duration: 0.12 }
          ],
          'sine'
        );
        this.playNoise(0.12);
        break;
      case 'gameover':
        this.playTone(100, 35, 0.65, 'sawtooth');
        this.playNoise(0.3);
        break;
      default:
        this.playTone(85, 45, 0.28, 'sawtooth');
        this.playNoise(0.14);
    }
  }

  public playUIClick() {
    if (this.isMuted || !this.audioCtx) return;
    try {
      const osc = this.audioCtx.createOscillator();
      const gainNode = this.audioCtx.createGain();
      const now = this.audioCtx.currentTime;
      osc.type = 'sine';
      osc.frequency.setValueAtTime(1100, now);
      gainNode.gain.setValueAtTime(0.12, now);
      gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.035);
      osc.connect(gainNode);
      gainNode.connect(this.audioCtx.destination);
      osc.start(now);
      osc.stop(now + 0.035);
    } catch {}
  }

  public playUIHover() {
    if (this.isMuted || !this.audioCtx) return;
    try {
      const osc = this.audioCtx.createOscillator();
      const gainNode = this.audioCtx.createGain();
      const now = this.audioCtx.currentTime;
      osc.type = 'sine';
      osc.frequency.setValueAtTime(800, now);
      gainNode.gain.setValueAtTime(0.04, now);
      gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.015);
      osc.connect(gainNode);
      gainNode.connect(this.audioCtx.destination);
      osc.start(now);
      osc.stop(now + 0.015);
    } catch {}
  }

  private playTone(
    freqStart: number,
    freqEnd: number,
    duration: number,
    type: OscillatorType = 'sine'
  ) {
    if (!this.audioCtx) return;
    try {
      const osc = this.audioCtx.createOscillator();
      const gainNode = this.audioCtx.createGain();
      const now = this.audioCtx.currentTime;

      osc.type = type;
      osc.frequency.setValueAtTime(freqStart, now);
      osc.frequency.exponentialRampToValueAtTime(Math.max(freqEnd, 1), now + duration);

      gainNode.gain.setValueAtTime(0.2, now);
      gainNode.gain.exponentialRampToValueAtTime(0.001, now + duration);

      osc.connect(gainNode);
      gainNode.connect(this.audioCtx.destination);

      osc.start(now);
      osc.stop(now + duration);
    } catch {}
  }

  private playMultipleTones(
    notes: { freqStart: number; freqEnd: number; duration: number }[],
    type: OscillatorType = 'sine'
  ) {
    if (!this.audioCtx) return;
    try {
      let timeOffset = 0;
      const baseNow = this.audioCtx.currentTime;

      notes.forEach((note) => {
        const osc = this.audioCtx!.createOscillator();
        const gainNode = this.audioCtx!.createGain();
        const noteStart = baseNow + timeOffset;

        osc.type = type;
        osc.frequency.setValueAtTime(note.freqStart, noteStart);
        if (note.freqEnd !== note.freqStart) {
          osc.frequency.exponentialRampToValueAtTime(
            Math.max(note.freqEnd, 1),
            noteStart + note.duration
          );
        }

        gainNode.gain.setValueAtTime(0.18, noteStart);
        gainNode.gain.exponentialRampToValueAtTime(0.001, noteStart + note.duration);

        osc.connect(gainNode);
        gainNode.connect(this.audioCtx!.destination);

        osc.start(noteStart);
        osc.stop(noteStart + note.duration);

        timeOffset += note.duration;
      });
    } catch {}
  }

  private playNoise(duration: number) {
    if (!this.audioCtx) return;
    try {
      if (!this.noiseBuffer) {
        this.prepareNoiseBuffer();
      }
      if (!this.noiseBuffer) return;

      const noise = this.audioCtx.createBufferSource();
      noise.buffer = this.noiseBuffer;
      noise.loop = true;

      const filter = this.audioCtx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 1100;

      const gainNode = this.audioCtx.createGain();
      const now = this.audioCtx.currentTime;
      gainNode.gain.setValueAtTime(0.18, now);
      gainNode.gain.exponentialRampToValueAtTime(0.001, now + duration);

      noise.connect(filter);
      filter.connect(gainNode);
      gainNode.connect(this.audioCtx.destination);

      noise.start(now);
      noise.stop(now + duration);
    } catch {}
  }
}
