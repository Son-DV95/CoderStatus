import React, { useState, useEffect, useRef } from 'react';
import { 
  Play, 
  Pause, 
  SkipForward, 
  Volume2, 
  VolumeX, 
  Music, 
  Sparkles, 
  CloudRain, 
  Disc, 
  Sliders, 
  Activity, 
  Radio 
} from 'lucide-react';

interface LofiTrack {
  id: string;
  name: string;
  artist: string;
  url: string;
  isSynth: boolean;
  desc?: string;
}

const LOFI_TRACKS: LofiTrack[] = [
  {
    id: 'synth-lofi',
    name: 'DevOS Retro procedural Synth',
    artist: 'Web Audio Engine',
    url: 'procedural-synth',
    isSynth: true,
    desc: 'Âm thanh tự tổng hợp qua chip trình duyệt: Hợp âm jazz mộc, đĩa than cổ và mưa rơi.'
  },
  {
    id: 'mixkit-1',
    name: 'Cozy Coding Night',
    artist: 'Mixkit Beautiful Dream',
    url: 'https://assets.mixkit.co/music/preview/mixkit-beautiful-dream-lofi-614.mp3',
    isSynth: false,
    desc: 'Piano lofi êm dịu kết hợp trống jazz lùi sâu hoàn hảo cho việc học tập.'
  },
  {
    id: 'mixkit-2',
    name: 'Rainy Cyber Cruiser',
    artist: 'Mixkit Chill Medium',
    url: 'https://assets.mixkit.co/music/preview/mixkit-lofi-chill-medium-tempo-110.mp3',
    isSynth: false,
    desc: 'Beat lofi trầm ấm, lôi cuốn, mang hơi thở thành phố về khuya.'
  },
  {
    id: 'mixkit-3',
    name: 'Deep Space Sandbox',
    artist: 'Mixkit Electric Chill',
    url: 'https://assets.mixkit.co/music/preview/mixkit-dreaming-big-lofi-619.mp3',
    isSynth: false,
    desc: 'Hợp âm pad không gian dập dềnh giúp thư giãn đầu óc cực đã.'
  }
];

export default function LofiPlayer() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTrackIndex, setCurrentTrackIndex] = useState(0);
  const [volume, setVolume] = useState(0.5);
  const [rainVolume, setRainVolume] = useState(0.4);
  const [vinylVolume, setVinylVolume] = useState(0.3);
  const [soundMode, setSoundMode] = useState<'synth' | 'mp3'>('synth');
  const [timeElapsed, setTimeElapsed] = useState(0);
  
  // Audio nodes for synthesis
  const audioCtxRef = useRef<AudioContext | null>(null);
  const synthNodesRef = useRef<{
    masterGain: GainNode | null;
    rainGain: GainNode | null;
    vinylGain: GainNode | null;
    reverbNode: ConvolverNode | null;
    intervalId: any;
    noiseSource: AudioWorkletNode | ScriptProcessorNode | null;
  }>({
    masterGain: null,
    rainGain: null,
    vinylGain: null,
    reverbNode: null,
    intervalId: null,
    noiseSource: null
  });

  // MP3 Audio element reference
  const audioElRef = useRef<HTMLAudioElement | null>(null);
  
  // VU Meter state
  const [vuLevels, setVuLevels] = useState<number[]>([2, 5, 3, 4, 10, 6, 2, 4]);

  const currentTrack = LOFI_TRACKS[currentTrackIndex];

  // Randomize VU levels during play
  useEffect(() => {
    let interval: any;
    if (isPlaying) {
      interval = setInterval(() => {
        setVuLevels(prev => prev.map(() => Math.floor(Math.random() * 85) + 15));
      }, 120);
    } else {
      setVuLevels([5, 5, 5, 5, 5, 5, 5, 5]);
    }
    return () => clearInterval(interval);
  }, [isPlaying]);

  // Track timer counter
  useEffect(() => {
    let interval: any;
    if (isPlaying) {
      interval = setInterval(() => {
        setTimeElapsed(prev => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isPlaying]);

  // Handle standard audio volume
  useEffect(() => {
    if (audioElRef.current) {
      audioElRef.current.volume = volume;
    }
    if (synthNodesRef.current.masterGain) {
      synthNodesRef.current.masterGain.gain.setValueAtTime(volume * 0.45, audioCtxRef.current?.currentTime || 0);
    }
  }, [volume]);

  // Dynamic volume adjustment for rain & dust
  useEffect(() => {
    if (synthNodesRef.current.rainGain) {
      synthNodesRef.current.rainGain.gain.setValueAtTime(rainVolume * 0.65, audioCtxRef.current?.currentTime || 0);
    }
  }, [rainVolume]);

  useEffect(() => {
    if (synthNodesRef.current.vinylGain) {
      synthNodesRef.current.vinylGain.gain.setValueAtTime(vinylVolume * 0.16, audioCtxRef.current?.currentTime || 0);
    }
  }, [vinylVolume]);

  // Clean elements and stop sound generators on unmount
  useEffect(() => {
    return () => {
      stopAllSounds();
    };
  }, []);

  // Set sound mode safely
  const changeTrack = (idx: number) => {
    const nextTrack = LOFI_TRACKS[idx];
    setCurrentTrackIndex(idx);
    setTimeElapsed(0);
    
    const wasPlaying = isPlaying;
    
    // Stop previous state
    stopAllSounds();

    if (wasPlaying) {
      setTimeout(() => {
        startSound(idx);
      }, 100);
    }
  };

  const handleNext = () => {
    const nextIdx = (currentTrackIndex + 1) % LOFI_TRACKS.length;
    changeTrack(nextIdx);
  };

  const togglePlay = () => {
    if (isPlaying) {
      stopAllSounds();
      setIsPlaying(false);
    } else {
      startSound(currentTrackIndex);
      setIsPlaying(true);
    }
  };

  const stopAllSounds = () => {
    // 1. Pause MP3
    if (audioElRef.current) {
      audioElRef.current.pause();
    }

    // 2. Clear synth routines
    if (synthNodesRef.current.intervalId) {
      clearInterval(synthNodesRef.current.intervalId);
      synthNodesRef.current.intervalId = null;
    }

    // Stop and close AudioContext safely
    if (audioCtxRef.current) {
      try {
        audioCtxRef.current.close();
      } catch (e) {}
      audioCtxRef.current = null;
    }

    synthNodesRef.current.masterGain = null;
    synthNodesRef.current.rainGain = null;
    synthNodesRef.current.vinylGain = null;
  };

  // Start synthesizing or playing streams
  const startSound = async (idx: number) => {
    const track = LOFI_TRACKS[idx];
    
    try {
      if (!audioCtxRef.current) {
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        audioCtxRef.current = new AudioContextClass();
      }
      
      const ctx = audioCtxRef.current;
      if (ctx.state === 'suspended') {
        await ctx.resume();
      }

      const now = ctx.currentTime;
      
      // Setup master gain for real-time ambient noise
      const masterGain = ctx.createGain();
      masterGain.gain.setValueAtTime(volume * 0.45, now);
      masterGain.connect(ctx.destination);
      synthNodesRef.current.masterGain = masterGain;

      // Custom Sound synthesis block: Rain effect (Filtered Pink noise)
      const rainGain = ctx.createGain();
      rainGain.gain.setValueAtTime(rainVolume * 0.65, now);
      rainGain.connect(masterGain);
      synthNodesRef.current.rainGain = rainGain;
      createRainSynth(ctx, rainGain);

      // Custom sound synthesis block: Old Vinyl dust pops / static noise
      const vinylGain = ctx.createGain();
      vinylGain.gain.setValueAtTime(vinylVolume * 0.16, now);
      vinylGain.connect(masterGain);
      synthNodesRef.current.vinylGain = vinylGain;
      createVinylSynth(ctx, vinylGain);

      if (track.isSynth) {
        setSoundMode('synth');
        // Play automatic jazz lofi chord loop + lovely randomized warm Rhodes notes!
        playNeoChordsProgression(ctx, masterGain);
      } else {
        setSoundMode('mp3');
        // Stream path
        if (!audioElRef.current) {
          audioElRef.current = new Audio(track.url);
          audioElRef.current.loop = true;
        } else {
          audioElRef.current.src = track.url;
        }
        
        audioElRef.current.volume = volume;
        try {
          await audioElRef.current.play();
        } catch (e) {
          console.warn('Click required for browser autoplay bypass: ', e);
        }
      }
    } catch (e) {
      console.error("Failed to boot generated ambient machine: ", e);
    }
  };

  // Generate real audio Buffer of white noise for Rain using Paul Kellet's Pink Noise algorithm
  const createRainSynth = (ctx: AudioContext, destination: AudioNode) => {
    const bufferSize = 4 * ctx.sampleRate; // 4 seconds of unique rain sound
    const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
    
    // Paul Kellet's refined Pink Noise generation algorithm
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.99886 * b0 + white * 0.0555179;
      b1 = 0.99332 * b1 + white * 0.0750759;
      b2 = 0.96900 * b2 + white * 0.1538520;
      b3 = 0.86650 * b3 + white * 0.3104856;
      b4 = 0.55000 * b4 + white * 0.5329522;
      b5 = -0.7616 * b5 - white * 0.0168980;
      
      const pink = b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362;
      output[i] = pink * 0.11; // normalise to approx -1.0 to 1.0
      b6 = white * 0.115926;
    }
    
    const noiseSource = ctx.createBufferSource();
    noiseSource.buffer = noiseBuffer;
    noiseSource.loop = true;

    // Soft low pass for gentle atmospheric attenuation (muffled rain outside window)
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(1400, ctx.currentTime);

    // Deep high pass filter to remove extreme low-end rumble
    const filterHigh = ctx.createBiquadFilter();
    filterHigh.type = 'highpass';
    filterHigh.frequency.setValueAtTime(80, ctx.currentTime);

    noiseSource.connect(filter);
    filter.connect(filterHigh);
    filterHigh.connect(destination);
    
    noiseSource.start(0);
  };

  // Generate Vinyl dust pops manually in real-time using continuous timer
  const createVinylSynth = (ctx: AudioContext, destination: AudioNode) => {
    const bufferSize = ctx.sampleRate;
    const crackleBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const output = crackleBuffer.getChannelData(0);
    
    // Soft constant crackle rustle
    for (let i = 0; i < bufferSize; i++) {
      output[i] = (Math.random() * 2 - 1) * 0.015;
    }
    
    const staticSource = ctx.createBufferSource();
    staticSource.buffer = crackleBuffer;
    staticSource.loop = true;

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(1000, ctx.currentTime);
    filter.Q.setValueAtTime(1.8, ctx.currentTime);

    staticSource.connect(filter);
    filter.connect(destination);
    staticSource.start(0);

    // Create random heavy vinyl scratches with timing intervals
    const popInterval = setInterval(() => {
      if (Math.random() > 0.4) {
        playSingleVinylPop(ctx, destination);
      }
    }, 1800);

    // Register handle to clear later
    const previousInterval = synthNodesRef.current.intervalId;
    if (previousInterval) clearInterval(previousInterval);
  };

  const playSingleVinylPop = (ctx: AudioContext, destination: AudioNode) => {
    try {
      const popOsc = ctx.createOscillator();
      const popGain = ctx.createGain();
      
      popOsc.connect(popGain);
      popGain.connect(destination);
      
      // Vintage pop scratch wave
      popOsc.type = 'sawtooth';
      popOsc.frequency.setValueAtTime(20 + Math.random() * 50, ctx.currentTime);
      
      popGain.gain.setValueAtTime(0, ctx.currentTime);
      popGain.gain.linearRampToValueAtTime(0.08 + Math.random() * 0.1, ctx.currentTime + 0.002);
      popGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.04);
      
      popOsc.start();
      popOsc.stop(ctx.currentTime + 0.05);
    } catch (e) {}
  };

  // Beautiful synthetic Jazz Rhodes / Lofi chime progression algorithm
  const playNeoChordsProgression = (ctx: AudioContext, destination: AudioNode) => {
    // Elegant warm chord voicings (Fmaj7 -> G6 -> Em7 -> Am7)
    const chordsList = [
      [174.61, 220.00, 261.63, 329.63, 392.00], // Fmaj9 (F3, A3, C4, E4, G4)
      [196.00, 246.94, 293.66, 349.23, 440.00], // G9 (G3, B3, D4, F4, A4)
      [164.81, 196.00, 246.94, 329.63, 392.00], // Em9 (E3, G3, B3, E4, G4)
      [220.00, 261.63, 329.63, 392.00, 493.88]  // Am9 (A3, C4, E4, G4, B4)
    ];

    let chordIdx = 0;

    const playChordStep = () => {
      if (ctx.state === 'suspended') return;
      
      const freqs = chordsList[chordIdx];
      const now = ctx.currentTime;
      const stepDuration = 6.0; // 6 seconds per chord

      // Play soft cozy bass note + chord voice
      freqs.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const nodeGain = ctx.createGain();
        
        osc.connect(nodeGain);
        nodeGain.connect(destination);
        
        // Triangle has a lovely woodwind wood/analog vintage Rhodes feel
        osc.type = 'triangle';
        // Detune slightly for delicious dreamy retro chorus flutter
        osc.frequency.setValueAtTime(freq + (Math.random() * 0.8 - 0.4), now);
        
        // Custom envelope (slow attack, long sustained decay)
        nodeGain.gain.setValueAtTime(0, now);
        // Stagger note triggers slightly (strum effect)
        const noteOffset = i * 0.035;
        nodeGain.gain.linearRampToValueAtTime(0.12 - (i * 0.015), now + 0.6 + noteOffset);
        nodeGain.gain.exponentialRampToValueAtTime(0.001, now + stepDuration - 0.2);
        
        osc.start(now);
        osc.stop(now + stepDuration);
      });

      // Overlay a cozy melody bells on top of chords occasionally
      if (Math.random() > 0.3) {
        setTimeout(() => {
          playPianoTinkle(ctx, chordIdx, destination);
        }, 1200 + Math.random() * 1500);
      }

      // Progress chord step
      chordIdx = (chordIdx + 1) % chordsList.length;
    };

    // Trigger right away
    playChordStep();
    
    // Continuous loop interval
    const chordIntervalId = setInterval(playChordStep, 6000);
    synthNodesRef.current.intervalId = chordIntervalId;
  };

  // Randomized warm piano high bell keys
  const playPianoTinkle = (ctx: AudioContext, chordIndex: number, destination: AudioNode) => {
    try {
      if (ctx.state === 'suspended') return;
      const now = ctx.currentTime;
      
      // Pentatonic/modal notes matching weavy jazz progression
      const melodyScales = [
        [523.25, 587.33, 659.25, 783.99, 880.00], // C Pentatonic (C5, D5, E5, G5, A5)
        [587.33, 659.25, 739.99, 880.00, 987.77], // G Pentatonic (D5, E5, F#5, A5, B5)
        [523.25, 587.33, 659.25, 783.99, 880.00], // C Pentatonic
        [440.00, 493.88, 523.25, 587.33, 659.25]  // A minor Pentatonic
      ];

      const scale = melodyScales[chordIndex];
      const randomNote = scale[Math.floor(Math.random() * scale.length)];

      const osc = ctx.createOscillator();
      const noteGain = ctx.createGain();

      osc.connect(noteGain);
      noteGain.connect(destination);

      osc.type = 'sine'; // Pure sweet electric sound
      osc.frequency.setValueAtTime(randomNote, now);

      noteGain.gain.setValueAtTime(0, now);
      noteGain.gain.linearRampToValueAtTime(0.08, now + 0.05);
      noteGain.gain.exponentialRampToValueAtTime(0.001, now + 1.8);

      osc.start(now);
      osc.stop(now + 2.0);
    } catch(e) {}
  };

  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const remainingSecs = secs % 60;
    return `${mins.toString().padStart(2, '0')}:${remainingSecs.toString().padStart(2, '0')}`;
  };

  return (
    <div id="lofi-rack-player" className="bg-zinc-950 border border-zinc-800 rounded-sm p-4 font-mono shadow-lg relative overflow-hidden flex flex-col gap-4">
      {/* Tape Deck Aesthetic Grid background pattern */}
      <div className="absolute inset-0 bg-grid-slate-900 opacity-20 pointer-events-none" />
      
      {/* Top rack information */}
      <div className="flex items-center justify-between border-b border-zinc-850 pb-3 z-10">
        <div className="flex items-center gap-2">
          <Radio className={`w-4 h-4 ${isPlaying ? 'text-orange-500 animate-pulse' : 'text-zinc-500'}`} />
          <h2 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
            CAFÉ LO-FI STUDIO ACCENT
            {isPlaying && <span className="inline-block w-1.5 h-1.5 rounded-full bg-orange-500 animate-ping" />}
          </h2>
        </div>
        <div className="flex items-center gap-1.5 text-[9px] bg-zinc-900 text-zinc-400 px-2.5 py-1 border border-zinc-850 rounded-sm">
          <Activity className="w-2.5 h-2.5 text-orange-500" />
          <span>OUTPUT: SYNTH-CHIP STEREOPHONIC</span>
        </div>
      </div>

      {/* Main player controls - structured like an old physical deck */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-center z-10">
        
        {/* Play/Pause control center */}
        <div className="md:col-span-5 bg-zinc-900/60 p-3.5 border border-zinc-850 rounded-sm flex flex-col gap-3">
          <div className="flex items-center gap-3">
            {/* Spinning Cassette Icon */}
            <div className={`p-4 bg-zinc-950 border border-zinc-800 rounded-full flex items-center justify-center relative ${isPlaying ? 'shadow-[0_0_15px_rgba(249,115,22,0.15)] border-orange-500/30' : ''}`}>
              <Disc className={`w-8 h-8 text-orange-500 ${isPlaying ? 'animate-spin' : 'text-zinc-650 opacity-60'}`} style={{ animationDuration: '6s' }} />
              <div className="absolute w-3 h-3 bg-zinc-900 rounded-full border border-zinc-700" />
            </div>

            <div className="flex-grow min-w-0">
              <div className="text-[10px] text-zinc-500 uppercase tracking-widest leading-none font-semibold">ĐANG PHÁT</div>
              <div className="text-[12px] text-zinc-100 font-bold tracking-tight truncate mt-1">
                {currentTrack.name}
              </div>
              <div className="text-[10px] text-orange-400/90 font-medium truncate">
                by {currentTrack.artist}
              </div>
            </div>
          </div>

          {/* Cassette deck interactive details */}
          <div className="bg-zinc-950 p-2 border border-zinc-850/80 rounded-sm flex justify-between items-center text-[10px] font-mono">
            <span className="text-zinc-500 font-bold uppercase select-none">COUNTER TAPE</span>
            <span className="text-emerald-400 bg-emerald-950/20 px-2 py-0.5 border border-emerald-950 rounded-sm font-semibold tracking-widest text-[10.5px]">
              {isPlaying ? formatTime(timeElapsed) : '00:00'}
            </span>
          </div>

          {/* Action Tape Buttons bar */}
          <div className="flex gap-2">
            <button
              onClick={togglePlay}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-sm text-[10.5px] font-bold uppercase transition-all border cursor-pointer ${
                isPlaying 
                  ? 'bg-orange-500/15 text-orange-400 border-orange-500/30 hover:bg-orange-500/20 shadow-[0_0_8px_rgba(249,115,22,0.1)]' 
                  : 'bg-emerald-950 hover:bg-emerald-900 text-emerald-400 border-emerald-800'
              }`}
            >
              {isPlaying ? (
                <>
                  <Pause className="w-3.5 h-3.5 fill-current" />
                  <span>TẠM DỪNG</span>
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5 fill-current animate-pulse" />
                  <span>PHÁT NHẠC ☕</span>
                </>
              )}
            </button>

            <button
              onClick={handleNext}
              className="px-3 bg-zinc-800 hover:bg-zinc-750 text-zinc-200 border border-zinc-700 hover:text-white rounded-sm transition-all flex items-center justify-center cursor-pointer"
              title="Next Track"
            >
              <SkipForward className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Master sliders & track customization controls */}
        <div className="md:col-span-7 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Customizer Slider: MASTER VOLUME */}
            <div className="bg-zinc-900/40 p-2.5 border border-zinc-850/80 rounded-sm space-y-2">
              <div className="flex justify-between items-center text-[9.5px]">
                <span className="text-zinc-400 font-bold uppercase tracking-wider flex items-center gap-1">
                  <Volume2 className="w-3 h-3 text-orange-500" />
                  ÂM LƯỢNG MASTER
                </span>
                <span className="text-orange-400 font-semibold">{Math.round(volume * 100)}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={volume}
                onChange={(e) => setVolume(parseFloat(e.target.value))}
                className="w-full accent-orange-500 cursor-pointer h-1 bg-zinc-800 rounded-none overflow-hidden"
              />
            </div>

            {/* Customizer Slider: RAIN INTENSITY */}
            <div className="bg-zinc-900/40 p-2.5 border border-zinc-850/80 rounded-sm space-y-2">
              <div className="flex justify-between items-center text-[9.5px]">
                <span className="text-zinc-400 font-bold uppercase tracking-wider flex items-center gap-1">
                  <CloudRain className="w-3 h-3 text-sky-400" />
                  MƯA NGOÀI CỬA SỔ
                </span>
                <span className="text-sky-400 font-semibold">{Math.round(rainVolume * 100)}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={rainVolume}
                onChange={(e) => setRainVolume(parseFloat(e.target.value))}
                className="w-full cursor-pointer h-1 rounded-none overflow-hidden accent-sky-500"
              />
            </div>
          </div>

          {/* Third slider & level metrics bar */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Customizer Slider: VINYL CRACKLE */}
            <div className="bg-zinc-900/40 p-2.5 border border-zinc-850/80 rounded-sm space-y-2">
              <div className="flex justify-between items-center text-[9.5px]">
                <span className="text-zinc-400 font-bold uppercase tracking-wider flex items-center gap-1">
                  <Disc className="w-3 h-3 text-amber-500" />
                  TIẾNG RÈ ĐĨA THAN
                </span>
                <span className="text-amber-400 font-semibold">{Math.round(vinylVolume * 100)}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={vinylVolume}
                onChange={(e) => setVinylVolume(parseFloat(e.target.value))}
                className="w-full cursor-pointer h-1 rounded-none overflow-hidden accent-amber-500"
              />
            </div>

            {/* Simulated bouncing Audio Visualizer screen */}
            <div className="bg-zinc-900/60 p-2 border border-zinc-850 rounded-sm flex flex-col justify-between">
              <div className="text-[8.5px] text-zinc-500 uppercase tracking-widest font-semibold flex justify-between items-center px-1">
                <span>SPECTRAL ANALYZER</span>
                <span className="text-emerald-500 animate-pulse">● LIVE</span>
              </div>
              <div className="flex items-end justify-between h-7 px-2 pt-1 gap-1">
                {vuLevels.map((lvl, i) => (
                  <div key={i} className="flex-1 bg-zinc-800 h-full rounded-sm overflow-hidden flex flex-col justify-end">
                    <div 
                      className={`w-full transition-all duration-100 ${
                        lvl > 75 
                          ? 'bg-red-500' 
                          : lvl > 50 
                            ? 'bg-orange-400' 
                            : 'bg-emerald-500'
                      }`}
                      style={{ height: `${isPlaying ? lvl : 8}%` }}
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Playlist tracks selection rack */}
      <div className="bg-zinc-900 p-2 border border-zinc-850 rounded-sm z-10">
        <div className="text-[9px] text-zinc-500 uppercase tracking-widest font-semibold pb-1.5 px-1">
          CHỌN ALBUM / SOUNDTRACKS LOFI:
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
          {LOFI_TRACKS.map((track, idx) => {
            const isSelected = idx === currentTrackIndex;
            return (
              <button
                key={track.id}
                onClick={() => changeTrack(idx)}
                className={`text-left p-2 rounded-sm border cursor-pointer transition-all duration-200 text-[10.5px] ${
                  isSelected 
                    ? 'bg-orange-500/10 border-orange-500/40 text-orange-400' 
                    : 'bg-zinc-950 border-zinc-850 text-zinc-400 hover:text-zinc-200 hover:border-zinc-750'
                }`}
              >
                <div className="font-bold flex items-center gap-1.5">
                  <Music className="w-3 h-3 shrink-0" />
                  <span className="truncate">{track.name}</span>
                </div>
                <div className="text-[9px] text-zinc-500 mt-0.5 truncate uppercase select-none">
                  {track.artist}
                </div>
              </button>
            );
          })}
        </div>
        
        {/* Track descriptions helper message */}
        <p className="text-[9.5px] text-zinc-500 mt-2 px-1 text-center select-none leading-relaxed italic">
          💡 {currentTrack.desc || "Thư giãn đầu óc vỗ về năng lượng tập trung làm việc."}
        </p>
      </div>
    </div>
  );
}
