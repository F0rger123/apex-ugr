// Engine Sound Synthesizer using Web Audio API for realistic supercar / tuner engine revs
export const playEngineSound = (engineType: string = 'VR38DETT Twin-Turbo') => {
  if (typeof window === 'undefined' || !('AudioContext' in window || 'webkitAudioContext' in window)) {
    return;
  }

  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    const audioCtx = new AudioContextClass();
    const now = audioCtx.currentTime;
    const master = audioCtx.createGain();
    const compressor = audioCtx.createDynamicsCompressor();
    const exhaust = audioCtx.createBiquadFilter();
    const body = audioCtx.createBiquadFilter();
    let idle = 46;
    let redline = 168;
    if (engineType.includes('V8')) { idle = 38; redline = 132; }
    if (engineType.includes('Flat-6') || engineType.includes('GT3')) { idle = 56; redline = 228; }
    if (engineType.includes('I4') || engineType.includes('2JZ')) { idle = 52; redline = 194; }
    master.gain.setValueAtTime(.0001, now);
    master.gain.exponentialRampToValueAtTime(.13, now + .12);
    master.gain.setValueAtTime(.13, now + .55);
    master.gain.linearRampToValueAtTime(.22, now + 1.35);
    master.gain.exponentialRampToValueAtTime(.0001, now + 2.65);
    compressor.threshold.value = -22;
    compressor.knee.value = 18;
    compressor.ratio.value = 5;
    compressor.attack.value = .005;
    compressor.release.value = .16;
    exhaust.type = 'lowpass';
    exhaust.frequency.setValueAtTime(520, now);
    exhaust.frequency.exponentialRampToValueAtTime(2200, now + 1.35);
    exhaust.frequency.exponentialRampToValueAtTime(680, now + 2.5);
    body.type = 'peaking';
    body.frequency.value = 118;
    body.Q.value = 1.4;
    body.gain.value = 9;
    exhaust.connect(body);
    body.connect(compressor);
    compressor.connect(master);
    master.connect(audioCtx.destination);
    [1, 2, 3.03, 4.1].forEach((harmonic, index) => {
      const oscillator = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      oscillator.type = index === 0 ? 'sawtooth' : index === 1 ? 'triangle' : 'sine';
      oscillator.frequency.setValueAtTime(idle * harmonic, now);
      oscillator.frequency.setValueAtTime(idle * harmonic * 1.05, now + .55);
      oscillator.frequency.exponentialRampToValueAtTime(redline * harmonic, now + 1.35);
      oscillator.frequency.exponentialRampToValueAtTime(idle * harmonic * .92, now + 2.5);
      gain.gain.value = [.72, .34, .16, .08][index];
      oscillator.connect(gain);
      gain.connect(exhaust);
      oscillator.start(now);
      oscillator.stop(now + 2.7);
    });
    const buffer = audioCtx.createBuffer(1, Math.floor(audioCtx.sampleRate * 2.7), audioCtx.sampleRate);
    const samples = buffer.getChannelData(0);
    for (let i = 0; i < samples.length; i += 1) samples[i] = (Math.random() * 2 - 1) * (i % 160 < 14 ? .7 : .12);
    const texture = audioCtx.createBufferSource();
    const textureGain = audioCtx.createGain();
    const textureFilter = audioCtx.createBiquadFilter();
    texture.buffer = buffer;
    textureFilter.type = 'bandpass';
    textureFilter.frequency.setValueAtTime(92, now);
    textureFilter.frequency.exponentialRampToValueAtTime(430, now + 1.35);
    textureGain.gain.setValueAtTime(.025, now);
    textureGain.gain.linearRampToValueAtTime(.075, now + 1.3);
    textureGain.gain.exponentialRampToValueAtTime(.0001, now + 2.6);
    texture.connect(textureFilter);
    textureFilter.connect(textureGain);
    textureGain.connect(compressor);
    texture.start(now);
    texture.stop(now + 2.7);
  } catch (err) {
    console.log('Audio synth playback error:', err);
  }
};

export const playInterfaceSound = (kind: 'select' | 'unlock' | 'error' = 'select') => {
  if (typeof window === 'undefined' || !('AudioContext' in window || 'webkitAudioContext' in window)) return;
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    const context = new AudioContextClass();
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    const now = context.currentTime;
    oscillator.type = kind === 'unlock' ? 'sine' : kind === 'error' ? 'sawtooth' : 'triangle';
    oscillator.frequency.setValueAtTime(kind === 'unlock' ? 340 : kind === 'error' ? 190 : 180, now);
    oscillator.frequency.exponentialRampToValueAtTime(kind === 'unlock' ? 980 : kind === 'error' ? 48 : 290, now + (kind === 'unlock' ? .28 : kind === 'error' ? .22 : .08));
    gain.gain.setValueAtTime(.0001, now);
    gain.gain.exponentialRampToValueAtTime(kind === 'unlock' ? .09 : .035, now + .015);
    gain.gain.exponentialRampToValueAtTime(.0001, now + (kind === 'unlock' ? .34 : kind === 'error' ? .26 : .11));
    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start(now);
    oscillator.stop(now + (kind === 'unlock' ? .36 : kind === 'error' ? .28 : .12));
  } catch {
    // Audio remains optional when a browser blocks playback.
  }
};
