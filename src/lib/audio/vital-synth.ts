/**
 * Web Audio Vital Synthesizer
 * Synthesizes biological telemetry based on on-chain forensic parameters:
 * - Heartbeat pulse modulated by transaction BPM
 * - Resonant toxic drone modulated by toxicity index
 * - Arrhythmic parasitic clicks modulated by swarm density
 * - Real-time FFT analyser for oscilloscope & ECG rendering
 */

export class VitalSynthesizer {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private analyser: AnalyserNode | null = null;
  private isRunning: boolean = false;
  private isMuted: boolean = false;
  private heartbeatTimer: number | null = null;

  // Drone oscillators
  private droneOsc: OscillatorNode | null = null;
  private droneFilter: BiquadFilterNode | null = null;
  private droneGain: GainNode | null = null;

  // Parameters
  private bpm: number = 120;
  private toxicity: number = 50; // 0 - 100
  private necrosis: number = 30; // 0 - 100

  constructor() {
    // Lazy initialize upon user activation
  }

  private initContext() {
    if (this.ctx) return;
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    this.ctx = new AudioContextClass();

    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.setValueAtTime(0.3, this.ctx.currentTime);

    this.analyser = this.ctx.createAnalyser();
    this.analyser.fftSize = 256;
    this.analyser.smoothingTimeConstant = 0.85;

    this.masterGain.connect(this.analyser);
    this.analyser.connect(this.ctx.destination);
  }

  public async start(): Promise<void> {
    if (typeof window === 'undefined') return;
    this.initContext();
    if (!this.ctx) return;

    if (this.ctx.state === 'suspended') {
      await this.ctx.resume();
    }

    if (this.isRunning) return;
    this.isRunning = true;

    this.startDrone();
    this.scheduleNextHeartbeat();
  }

  public stop(): void {
    this.isRunning = false;
    if (this.heartbeatTimer !== null) {
      window.clearTimeout(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
    this.stopDrone();
  }

  public toggleMute(): boolean {
    this.isMuted = !this.isMuted;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : 0.3, this.ctx.currentTime);
    }
    return this.isMuted;
  }

  public getIsRunning(): boolean {
    return this.isRunning;
  }

  public getIsMuted(): boolean {
    return this.isMuted;
  }

  public updateParameters(params: { bpm?: number; toxicity?: number; necrosis?: number }): void {
    if (params.bpm !== undefined) this.bpm = Math.max(40, Math.min(240, params.bpm));
    if (params.toxicity !== undefined) this.toxicity = Math.max(0, Math.min(100, params.toxicity));
    if (params.necrosis !== undefined) this.necrosis = Math.max(0, Math.min(100, params.necrosis));

    this.updateDroneModulation();
  }

  private startDrone(): void {
    if (!this.ctx || !this.masterGain) return;

    // Filtered resonant drone
    this.droneOsc = this.ctx.createOscillator();
    this.droneOsc.type = 'sawtooth';
    this.droneOsc.frequency.setValueAtTime(55, this.ctx.currentTime); // 55Hz base note (A1)

    this.droneFilter = this.ctx.createBiquadFilter();
    this.droneFilter.type = 'lowpass';
    this.droneFilter.Q.setValueAtTime(4.0, this.ctx.currentTime);

    this.droneGain = this.ctx.createGain();
    this.droneGain.gain.setValueAtTime(0.08, this.ctx.currentTime);

    this.droneOsc.connect(this.droneFilter);
    this.droneFilter.connect(this.droneGain);
    this.droneGain.connect(this.masterGain);

    this.droneOsc.start();
    this.updateDroneModulation();
  }

  private updateDroneModulation(): void {
    if (!this.ctx || !this.droneFilter || !this.droneOsc || !this.droneGain) return;

    const t = this.ctx.currentTime;
    // As toxicity increases, filter opens up from 120Hz to 1800Hz with dissonance
    const cutoff = 120 + (this.toxicity / 100) * 1600;
    this.droneFilter.frequency.setTargetAtTime(cutoff, t, 0.1);
    this.droneFilter.Q.setTargetAtTime(3 + (this.toxicity / 100) * 8, t, 0.1);

    // As necrosis increases, pitch drifts downward slightly
    const baseFreq = Math.max(40, 58 - (this.necrosis / 100) * 16);
    this.droneOsc.frequency.setTargetAtTime(baseFreq, t, 0.2);
  }

  private stopDrone(): void {
    if (this.droneOsc) {
      try {
        this.droneOsc.stop();
        this.droneOsc.disconnect();
      } catch {
        // Safe disconnect
      }
      this.droneOsc = null;
    }
  }

  private scheduleNextHeartbeat = (): void => {
    if (!this.isRunning) return;

    this.triggerHeartbeat();

    // Interval based on current BPM
    const intervalMs = (60 / this.bpm) * 1000;
    this.heartbeatTimer = window.setTimeout(this.scheduleNextHeartbeat, intervalMs);
  };

  /**
   * Triggers biological dual beat ("lub-dub")
   */
  public triggerHeartbeat(): void {
    if (!this.ctx || !this.masterGain || this.isMuted) return;

    const now = this.ctx.currentTime;

    // Lub (S1 sound)
    this.playHeartTransient(now, 85, 45, 0.12, 0.35);

    // Dub (S2 sound, slightly higher and sharper)
    const dubDelay = Math.min(0.18, 0.10 + (60 / this.bpm) * 0.05);
    this.playHeartTransient(now + dubDelay, 110, 52, 0.09, 0.25);

    // High toxicity or parasitic anomaly triggers occasional neural telemetry chirp
    if (this.toxicity > 70 && Math.random() > 0.45) {
      this.playParasiticArtifact(now + 0.08);
    }
  }

  private playHeartTransient(time: number, startFreq: number, endFreq: number, duration: number, vol: number) {
    if (!this.ctx || !this.masterGain) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(startFreq, time);
    osc.frequency.exponentialRampToValueAtTime(Math.max(20, endFreq), time + duration);

    gain.gain.setValueAtTime(0.001, time);
    gain.gain.linearRampToValueAtTime(vol, time + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + duration);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(time);
    osc.stop(time + duration);
  }

  private playParasiticArtifact(time: number) {
    if (!this.ctx || !this.masterGain) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(880 + Math.random() * 440, time);
    osc.frequency.linearRampToValueAtTime(440, time + 0.04);

    gain.gain.setValueAtTime(0.06, time);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.04);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(time);
    osc.stop(time + 0.04);
  }

  public getVisualizerData(): Uint8Array {
    if (!this.analyser) {
      return new Uint8Array(128);
    }
    const data = new Uint8Array(this.analyser.frequencyBinCount);
    this.analyser.getByteTimeDomainData(data);
    return data;
  }
}

export const vitalSynth = new VitalSynthesizer();
