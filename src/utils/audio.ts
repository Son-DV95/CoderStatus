// Web Audio API Retro synthesizer for satisfying terminal sounds

let audioCtx: AudioContext | null = null;
let isSoundEnabled = false;

export function setSoundEnabled(enabled: boolean) {
  isSoundEnabled = enabled;
}

export function getSoundEnabled(): boolean {
  return isSoundEnabled;
}

function initAudio() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
}

// 1. Terminal keyboard tick (click)
export function playTick() {
  if (!isSoundEnabled) return;
  try {
    initAudio();
    if (!audioCtx) return;

    const osc = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();

    osc.connect(gainNode);
    gainNode.connect(audioCtx.destination);

    // Short click sound
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(1000, audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(120, audioCtx.currentTime + 0.05);

    gainNode.gain.setValueAtTime(0.08, audioCtx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.05);

    osc.start();
    osc.stop(audioCtx.currentTime + 0.05);
  } catch (e) {
    // Fail silently to avoid interrupting UX
  }
}

// 2. High beep (e.g. key entered or command success)
export function playBeep(freq = 800, duration = 0.08, gainVal = 0.05) {
  if (!isSoundEnabled) return;
  try {
    initAudio();
    if (!audioCtx) return;

    const osc = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();

    osc.connect(gainNode);
    gainNode.connect(audioCtx.destination);

    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
    
    gainNode.gain.setValueAtTime(gainVal, audioCtx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);

    osc.start();
    osc.stop(audioCtx.currentTime + duration);
  } catch (e) {
    // Fail silently
  }
}

// 3. Error buzz
export function playErrorBuzz() {
  if (!isSoundEnabled) return;
  try {
    initAudio();
    if (!audioCtx) return;

    const osc = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();

    osc.connect(gainNode);
    gainNode.connect(audioCtx.destination);

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(120, audioCtx.currentTime);
    osc.frequency.linearRampToValueAtTime(80, audioCtx.currentTime + 0.2);

    gainNode.gain.setValueAtTime(0.05, audioCtx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.25);

    osc.start();
    osc.stop(audioCtx.currentTime + 0.25);
  } catch (e) {
    // Fail silently
  }
}

// 4. Success chime (staggered notes)
export function playSuccessChime() {
  if (!isSoundEnabled) return;
  try {
    initAudio();
    if (!audioCtx) return;

    const notes = [261.63, 329.63, 392.00, 523.25]; // C4, E4, G4, C5
    const now = audioCtx.currentTime;

    notes.forEach((freq, idx) => {
      const osc = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();

      osc.connect(gainNode);
      gainNode.connect(audioCtx.destination);

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + idx * 0.06);

      gainNode.gain.setValueAtTime(0, now + idx * 0.06);
      gainNode.gain.linearRampToValueAtTime(0.05, now + idx * 0.06 + 0.01);
      gainNode.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.06 + 0.25);

      osc.start(now + idx * 0.06);
      osc.stop(now + idx * 0.06 + 0.25);
    });
  } catch (e) {
    // Fail silently
  }
}

// 5. System boot-up sweep (whoosh/laser/synth pad)
export function playBootSweep() {
  if (!isSoundEnabled) return;
  try {
    initAudio();
    if (!audioCtx) return;

    const now = audioCtx.currentTime;
    
    // Low hum rising
    const osc1 = audioCtx.createOscillator();
    const osc2 = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();

    osc1.connect(gainNode);
    osc2.connect(gainNode);
    gainNode.connect(audioCtx.destination);

    osc1.type = 'triangle';
    osc1.frequency.setValueAtTime(100, now);
    osc1.frequency.exponentialRampToValueAtTime(440, now + 0.8);

    osc2.type = 'sawtooth';
    osc2.frequency.setValueAtTime(102, now);
    osc2.frequency.exponentialRampToValueAtTime(442, now + 0.8);

    gainNode.gain.setValueAtTime(0, now);
    gainNode.gain.linearRampToValueAtTime(0.06, now + 0.2);
    gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.9);

    osc1.start(now);
    osc2.start(now);
    
    osc1.stop(now + 0.9);
    osc2.stop(now + 0.9);

    // Terminal play chime on end
    setTimeout(() => {
      playBeep(880, 0.15, 0.08);
      setTimeout(() => playBeep(1320, 0.2, 0.06), 100);
    }, 600);
  } catch (e) {
    // Fail silently
  }
}
