import React, { useState, useEffect } from 'react';
import { Terminal, Shield, Cpu, Volume2, VolumeX, Flame } from 'lucide-react';
import { getSoundEnabled, setSoundEnabled, playBeep } from '../utils/audio';

interface QuickTerminalStatsProps {
  completedTasksCount: number;
  totalTasksCount: number;
  cpuLoad: number;
  cpuTemp: number;
  soundState: boolean;
  onToggleSound: (enabled: boolean) => void;
}

export default function QuickTerminalStats({
  completedTasksCount,
  totalTasksCount,
  cpuLoad,
  cpuTemp,
  soundState,
  onToggleSound,
}: QuickTerminalStatsProps) {
  const [time, setTime] = useState<string>('');
  const [uptimeSeconds, setUptimeSeconds] = useState<number>(1240); // static initial mock count up

  // Get current Vietnam/local time formatted nicely
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTime(
        now.toLocaleTimeString('vi-VN', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: false,
        })
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Set up counter for uptime since opening
  useEffect(() => {
    const timer = setInterval(() => {
      setUptimeSeconds((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatUptime = (totalSecs: number) => {
    const hrs = Math.floor(totalSecs / 3600);
    const mins = Math.floor((totalSecs % 3600) / 60);
    const secs = totalSecs % 60;
    return `${hrs.toString().padStart(2, '0')}:${mins
      .toString()
      .padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const completionRate = totalTasksCount > 0 ? Math.round((completedTasksCount / totalTasksCount) * 100) : 0;

  return (
    <div id="stats-ribbon" className="border border-zinc-800 bg-zinc-900/30 text-zinc-300 font-mono text-[11px] p-3 rounded-sm flex flex-wrap gap-4 items-center justify-between shadow-md mb-4 divide-y sm:divide-y-0 sm:divide-x divide-zinc-800/80">
      
      {/* 1. Host Name & Build */}
      <div className="flex items-center gap-2 pr-2">
        <Terminal className="w-4 h-4 text-emerald-500" />
        <span className="text-white font-bold tracking-wider">DEV_TERMINAL@ROOT</span>
        <span className="bg-emerald-500/10 text-emerald-500 px-1.5 py-0.5 rounded-sm text-[9px] border border-emerald-500/20">ONLINE</span>
      </div>

      {/* 2. System Load Status (CPU-driven) */}
      <div className="flex items-center gap-2 px-3 pt-2 sm:pt-0">
        <Cpu className="w-3.5 h-3.5 text-sky-450" />
        <span className="text-zinc-400">SYS LOAD:</span>
        <div className="w-16 bg-zinc-800 h-1.5 rounded-none overflow-hidden">
          <div 
            className={`h-full transition-all duration-500 ${cpuLoad > 80 ? 'bg-red-500' : cpuLoad > 55 ? 'bg-amber-500' : 'bg-emerald-500'}`}
            style={{ width: `${cpuLoad}%` }}
          />
        </div>
        <span className={cpuLoad > 80 ? 'text-red-400 font-bold' : cpuLoad > 55 ? 'text-amber-400 font-bold' : 'text-emerald-400 font-bold'}>{cpuLoad}%</span>
      </div>

      {/* 3. Uptime clock */}
      <div className="flex items-center gap-2 px-3 pt-2 sm:pt-0">
        <Shield className="w-3.5 h-3.5 text-zinc-400" />
        <span>SYS UPTIME:</span>
        <span className="text-emerald-400 font-semibold">{formatUptime(uptimeSeconds)}</span>
      </div>

      {/* 4. Daily tasks summary */}
      <div className="flex items-center gap-2 px-3 pt-2 sm:pt-0 flex-1">
        <span>CODEX PROGRESS:</span>
        <span className="text-emerald-400 font-bold">[{completedTasksCount}/{totalTasksCount}]</span>
        <div className="w-24 bg-zinc-800 h-1.5 rounded-none overflow-hidden flex-grow max-w-[150px]">
          <div 
            className="h-full bg-emerald-500 transition-all duration-500" 
            style={{ width: `${completionRate}%` }}
          />
        </div>
        <span className="text-emerald-400 font-semibold">{completionRate}%</span>
      </div>

      {/* 5. Live Local Time Clock & Sound Controller */}
      <div className="flex items-center gap-4 pl-3 pt-2 sm:pt-0 justify-between w-full sm:w-auto">
        <div className="flex items-center gap-1.5 bg-zinc-950 px-2 py-0.5 border border-zinc-800 rounded-sm">
          <span className="text-emerald-400 font-semibold tracking-wider">{time || '00:00:00'}</span>
        </div>

        {/* Audio Toggle */}
        <button
          id="sound-toggle-btn"
          onClick={() => {
            const nextState = !soundState;
            onToggleSound(nextState);
            setSoundEnabled(nextState);
            if (nextState) {
              playBeep(900, 0.1);
            }
          }}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-sm text-[10px] uppercase font-bold transition-all duration-350 cursor-pointer ${
            soundState 
              ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400' 
              : 'bg-zinc-850 border border-zinc-800 text-zinc-500 hover:text-zinc-400'
          }`}
          title={soundState ? "Mute audio synthesizer" : "Unmute audio synthesizer"}
        >
          {soundState ? (
            <>
              <Volume2 className="w-3 h-3 text-emerald-400" />
              <span>SOUND ON</span>
            </>
          ) : (
            <>
              <VolumeX className="w-3 h-3 text-zinc-500" />
              <span>SOUND OFF</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
