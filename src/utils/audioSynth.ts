// Procedural Web Audio Synthesizer Engine for Void Horizon
// Generates fully immersive, high-fidelity retro sci-fi audio purely offline without any asset files.

class AudioSynthEngine {
  private ctx: AudioContext | null = null;
  private ambientOsc1: OscillatorNode | null = null;
  private ambientOsc2: OscillatorNode | null = null;
  private ambientLfo: OscillatorNode | null = null;
  private ambientGain: GainNode | null = null;
  private mainGain: GainNode | null = null;
  private isMuted: boolean = false;

  private initCtx() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      
      // Master volume regulator
      this.mainGain = this.ctx.createGain();
      this.mainGain.gain.setValueAtTime(this.isMuted ? 0 : 0.8, this.ctx.currentTime);
      this.mainGain.connect(this.ctx.destination);
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  public setMute(mute: boolean) {
    this.isMuted = mute;
    if (this.mainGain && this.ctx) {
      this.mainGain.gain.setValueAtTime(mute ? 0 : 0.8, this.ctx.currentTime);
    }
  }

  // 1. Deep Space Ambient Hum (Synthesized Space Station Drone)
  public playAmbientHum() {
    try {
      this.initCtx();
      if (!this.ctx || !this.mainGain) return;
      if (this.ambientOsc1) return; // Already running

      const now = this.ctx.currentTime;

      // Base oscillators for deep sub-harmonics
      this.ambientOsc1 = this.ctx.createOscillator();
      this.ambientOsc1.type = 'triangle';
      this.ambientOsc1.frequency.setValueAtTime(55, now); // A1 note (sub-bass)

      this.ambientOsc2 = this.ctx.createOscillator();
      this.ambientOsc2.type = 'sawtooth';
      this.ambientOsc2.frequency.setValueAtTime(27.5, now); // A0 note (sub-lows rumble)

      // Lowpass sweep filter
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(100, now);
      filter.Q.setValueAtTime(3, now);

      // Ambient gain controller (fades in)
      this.ambientGain = this.ctx.createGain();
      this.ambientGain.gain.setValueAtTime(0, now);
      this.ambientGain.gain.linearRampToValueAtTime(0.2, now + 3); // Slow fade-in

      // LFO modulation to create the rhythmic breathing / engines sweeping
      this.ambientLfo = this.ctx.createOscillator();
      this.ambientLfo.type = 'sine';
      this.ambientLfo.frequency.setValueAtTime(0.12, now); // 8-second cycles

      const lfoGain = this.ctx.createGain();
      lfoGain.gain.setValueAtTime(30, now); // sweep range

      // Wire LFO to filter frequency
      this.ambientLfo.connect(lfoGain);
      lfoGain.connect(filter.frequency);

      // Connect standard sound paths
      this.ambientOsc1.connect(filter);
      this.ambientOsc2.connect(filter);
      filter.connect(this.ambientGain);
      this.ambientGain.connect(this.mainGain);

      // Trigger sweeps
      this.ambientOsc1.start(now);
      this.ambientOsc2.start(now);
      this.ambientLfo.start(now);
    } catch (e) {
      console.error('Failed to boot ambient synth hum:', e);
    }
  }

  public stopAmbientHum() {
    const now = this.ctx?.currentTime || 0;
    
    // Slow fade-out to prevent pops
    if (this.ambientGain && this.ctx) {
      this.ambientGain.gain.setValueAtTime(this.ambientGain.gain.value, now);
      this.ambientGain.gain.linearRampToValueAtTime(0, now + 0.5);
    }

    setTimeout(() => {
      try {
        if (this.ambientOsc1) { this.ambientOsc1.stop(); this.ambientOsc1.disconnect(); this.ambientOsc1 = null; }
        if (this.ambientOsc2) { this.ambientOsc2.stop(); this.ambientOsc2.disconnect(); this.ambientOsc2 = null; }
        if (this.ambientLfo) { this.ambientLfo.stop(); this.ambientLfo.disconnect(); this.ambientLfo = null; }
        if (this.ambientGain) { this.ambientGain.disconnect(); this.ambientGain = null; }
      } catch (e) {}
    }, 600);
  }

  // 2. Manual Laser Excavation Beam SFX
  public playLaserSound() {
    try {
      this.initCtx();
      if (!this.ctx || !this.mainGain || this.isMuted) return;

      const now = this.ctx.currentTime;
      const duration = 0.18;

      // Laser sweep oscillator
      const osc = this.ctx.createOscillator();
      osc.type = 'triangle';
      // High-to-low pitch frequency sweep
      osc.frequency.setValueAtTime(1000, now);
      osc.frequency.exponentialRampToValueAtTime(80, now + duration);

      // Noise generator for laser dispersion crunch
      const bufferSize = this.ctx.sampleRate * duration;
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }

      const noise = this.ctx.createBufferSource();
      noise.buffer = buffer;

      // Highpass noise filter to keep only crackling highs
      const noiseFilter = this.ctx.createBiquadFilter();
      noiseFilter.type = 'highpass';
      noiseFilter.frequency.setValueAtTime(3000, now);

      // Mix gain levels
      const oscGain = this.ctx.createGain();
      oscGain.gain.setValueAtTime(0.25, now);
      oscGain.gain.exponentialRampToValueAtTime(0.01, now + duration);

      const noiseGain = this.ctx.createGain();
      noiseGain.gain.setValueAtTime(0.08, now);
      noiseGain.gain.exponentialRampToValueAtTime(0.01, now + duration);

      // Connect nodes
      osc.connect(oscGain);
      oscGain.connect(this.mainGain);

      noise.connect(noiseFilter);
      noiseFilter.connect(noiseGain);
      noiseGain.connect(this.mainGain);

      // Trigger oscillators
      osc.start(now);
      noise.start(now);

      osc.stop(now + duration);
      noise.stop(now + duration);
    } catch (e) {
      console.warn('Synth laser audio fail', e);
    }
  }

  // 3. Radar Sonar Ping SFX
  public playSonarSound() {
    try {
      this.initCtx();
      if (!this.ctx || !this.mainGain || this.isMuted) return;

      const now = this.ctx.currentTime;
      const duration = 1.6;

      // Sonar bell tone oscillator
      const osc = this.ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(1200, now);
      osc.frequency.exponentialRampToValueAtTime(400, now + duration);

      // Resonant bandpass sweep filter
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(1500, now);
      filter.frequency.exponentialRampToValueAtTime(400, now + duration);
      filter.Q.setValueAtTime(8, now);

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.35, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

      // Delay feedback echo loop (simulates echoing empty space sonar bounce)
      const delay = this.ctx.createDelay();
      delay.delayTime.setValueAtTime(0.3, now);

      const feedback = this.ctx.createGain();
      feedback.gain.setValueAtTime(0.4, now);

      // Wire nodes
      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.mainGain);

      // Wire delay echo feedback loop
      gain.connect(delay);
      delay.connect(feedback);
      feedback.connect(delay);
      delay.connect(this.mainGain);

      osc.start(now);
      osc.stop(now + duration + 0.5);
    } catch (e) {
      console.warn('Synth sonar audio fail', e);
    }
  }

  // 4. Commodity Exchange Click / Drone Purchase SFX (Dual-note major third arpeggio)
  public playChirpSound() {
    try {
      this.initCtx();
      if (!this.ctx || !this.mainGain || this.isMuted) return;

      const now = this.ctx.currentTime;

      // Note 1 (root tone)
      const osc1 = this.ctx.createOscillator();
      osc1.type = 'triangle';
      osc1.frequency.setValueAtTime(523.25, now); // C5

      const gain1 = this.ctx.createGain();
      gain1.gain.setValueAtTime(0.18, now);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

      osc1.connect(gain1);
      gain1.connect(this.mainGain);

      // Note 2 (Major Third delay offset)
      const osc2 = this.ctx.createOscillator();
      osc2.type = 'triangle';
      osc2.frequency.setValueAtTime(659.25, now + 0.06); // E5

      const gain2 = this.ctx.createGain();
      gain2.gain.setValueAtTime(0.18, now + 0.06);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.22);

      osc2.connect(gain2);
      gain2.connect(this.mainGain);

      osc1.start(now);
      osc2.start(now + 0.06);

      osc1.stop(now + 0.2);
      osc2.stop(now + 0.25);
    } catch (e) {
      console.warn('Synth chirp audio fail', e);
    }
  }

  // 5. Achievement Unlocks Space Arpeggio (Ascending 4-tone celestial arpeggio)
  public playUnlockSound() {
    try {
      this.initCtx();
      if (!this.ctx || !this.mainGain || this.isMuted) return;

      const now = this.ctx.currentTime;
      const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6 (C Major chords)

      notes.forEach((freq, index) => {
        if (!this.ctx || !this.mainGain) return;
        
        const noteTime = now + index * 0.1;
        const osc = this.ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, noteTime);

        // Sweeping lowpass
        const filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(3000, noteTime);
        filter.frequency.exponentialRampToValueAtTime(200, noteTime + 0.4);

        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(0.2, noteTime);
        gain.gain.exponentialRampToValueAtTime(0.001, noteTime + 0.4);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.mainGain);

        osc.start(noteTime);
        osc.stop(noteTime + 0.5);
      });
    } catch (e) {
      console.warn('Synth unlock arpeggio audio fail', e);
    }
  }
}

// Single active instance
export const audioSynth = new AudioSynthEngine();
