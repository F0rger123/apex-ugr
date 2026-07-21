// Engine Sound Synthesizer using Web Audio API for realistic supercar / tuner engine revs
export const playEngineSound = (engineType: string = 'VR38DETT Twin-Turbo') => {
  if (typeof window === 'undefined' || !('AudioContext' in window || 'webkitAudioContext' in window)) {
    return;
  }

  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    const audioCtx = new AudioContextClass();

    // Primary Engine Fundamental Frequency Oscillator
    const osc1 = audioCtx.createOscillator();
    const osc2 = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();
    const filter = audioCtx.createBiquadFilter();

    // Turbocharger Whistle Oscillator
    const turboOsc = audioCtx.createOscillator();
    const turboGain = audioCtx.createGain();

    // Base Pitch based on Engine Type
    let baseFreq = 80;
    let revFreq = 420;
    if (engineType.includes('Flat-6') || engineType.includes('GT3')) {
      baseFreq = 110;
      revFreq = 680; // High revving NA Flat-6
    } else if (engineType.includes('2JZ')) {
      baseFreq = 95;
      revFreq = 520;
    } else if (engineType.includes('V8')) {
      baseFreq = 65;
      revFreq = 380;
    }

    osc1.type = 'sawtooth';
    osc2.type = 'square';
    turboOsc.type = 'sine';

    osc1.frequency.setValueAtTime(baseFreq, audioCtx.currentTime);
    osc2.frequency.setValueAtTime(baseFreq * 0.5, audioCtx.currentTime);
    turboOsc.frequency.setValueAtTime(1200, audioCtx.currentTime);

    // Filter settings for throaty exhaust growl
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(800, audioCtx.currentTime);

    // Dynamic Rev Sweep envelope (Idle -> Redline Rev -> Pop & Blow-off -> Return to Idle)
    const now = audioCtx.currentTime;
    
    // Rev Up
    osc1.frequency.exponentialRampToValueAtTime(revFreq, now + 0.8);
    osc2.frequency.exponentialRampToValueAtTime(revFreq * 0.5, now + 0.8);
    turboOsc.frequency.exponentialRampToValueAtTime(3200, now + 0.8);
    filter.frequency.exponentialRampToValueAtTime(3500, now + 0.8);

    // Rev Down with exhaust deceleration pops
    osc1.frequency.exponentialRampToValueAtTime(baseFreq, now + 1.8);
    osc2.frequency.exponentialRampToValueAtTime(baseFreq * 0.5, now + 1.8);
    turboOsc.frequency.exponentialRampToValueAtTime(1000, now + 1.8);
    filter.frequency.exponentialRampToValueAtTime(600, now + 1.8);

    // Master Volume Envelope
    gainNode.gain.setValueAtTime(0.01, now);
    gainNode.gain.linearRampToValueAtTime(0.25, now + 0.4);
    gainNode.gain.linearRampToValueAtTime(0.4, now + 0.8);
    gainNode.gain.exponentialRampToValueAtTime(0.01, now + 1.9);

    turboGain.gain.setValueAtTime(0.001, now);
    turboGain.gain.linearRampToValueAtTime(0.08, now + 0.8);
    turboGain.gain.exponentialRampToValueAtTime(0.001, now + 1.8);

    // Connect Audio Pipeline
    osc1.connect(filter);
    osc2.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(audioCtx.destination);

    turboOsc.connect(turboGain);
    turboGain.connect(audioCtx.destination);

    osc1.start(now);
    osc2.start(now);
    turboOsc.start(now);

    osc1.stop(now + 2.0);
    osc2.stop(now + 2.0);
    turboOsc.stop(now + 2.0);
  } catch (err) {
    console.log('Audio synth playback error:', err);
  }
};
