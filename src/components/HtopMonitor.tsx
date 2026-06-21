import React, { useState, useEffect } from 'react';
import { SystemProcess, SystemSensors } from '../types';
import { Play, Square, RefreshCw, X, ChevronDown, ChevronUp, Plus, Trash2, ShieldAlert, Sparkles, Database, FileText, CheckSquare, Settings } from 'lucide-react';
import { playTick, playBeep, playErrorBuzz, playSuccessChime } from '../utils/audio';

interface HtopMonitorProps {
  sensors: SystemSensors;
  onUpdateSensors: React.Dispatch<React.SetStateAction<SystemSensors>>;
  processes: SystemProcess[];
  onSetProcesses: React.Dispatch<React.SetStateAction<SystemProcess[]>>;
  logsTerminal: (text: string, type: 'input' | 'output' | 'error' | 'success' | 'system') => void;
  dataSource: 'SERVER' | 'LOCAL';
}

export default function HtopMonitor({
  sensors,
  onUpdateSensors,
  processes,
  onSetProcesses,
  logsTerminal,
  dataSource,
}: HtopMonitorProps) {
  const [sortBy, setSortBy] = useState<'pid' | 'cpu' | 'ram' | 'name'>('cpu');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [spawnName, setSpawnName] = useState('vite-indexer');
  
  // Custom user requested features
  const [showAllProcesses, setShowAllProcesses] = useState(false);
  const [showCleanPanel, setShowCleanPanel] = useState(false);
  const [isCleaning, setIsCleaning] = useState(false);
  const [cleanTargets, setCleanTargets] = useState<string[]>(['node', 'vite', 'react', 'ollama', 'tmp_logs', 'stale_apps']);
  const [cleanLogs, setCleanLogs] = useState<string[]>([]);
  const [cleanReport, setCleanReport] = useState<{ reclaimedMb: number; killedThreads: number; details: any } | null>(null);

  // Spawn preset process names
  const systemScripts = [
    'npm-run-build',
    'python-scrapper',
    'postgres-vacuum',
    'docker-compose-up',
    'gemini-embedding-gen',
    'sensors-daemon',
    'redis-cache-flush',
  ];

  // Fluctuate CPU/RAM of running processes every 2 seconds (skip if displaying real stats)
  useEffect(() => {
    if (dataSource === 'SERVER' || dataSource === 'LOCAL') {
      return;
    }
    const timer = setInterval(() => {
      onSetProcesses(prev => {
        const next = prev.map(p => {
          if (p.status === 'RUNNING') {
            // Random fluctuations
            const cpuDelta = (Math.random() - 0.5) * 6;
            const ramDelta = (Math.random() - 0.5) * 2;
            const newCpu = Math.max(0.5, Math.min(99.5, p.cpu + cpuDelta));
            const newRam = Math.max(0.5, Math.min(95, p.ram + ramDelta));
            return {
              ...p,
              cpu: parseFloat(newCpu.toFixed(1)),
              ram: parseFloat(newRam.toFixed(1)),
              uptimeSeconds: p.uptimeSeconds + 2,
            };
          }
          return { ...p, uptimeSeconds: p.uptimeSeconds + 2 };
        });
        return next;
      });
    }, 2000);
    return () => clearInterval(timer);
  }, [onSetProcesses, dataSource]);

  // Recalculate global sensors CPU & RAM load based on processes (skip if displaying real stats)
  useEffect(() => {
    if (dataSource === 'SERVER' || dataSource === 'LOCAL') {
      return;
    }
    let totalCpu = 0;
    let totalRamPct = 0;
    processes.forEach(p => {
      if (p.status === 'RUNNING') {
        totalCpu += p.cpu;
        totalRamPct += p.ram * 0.15; // weighted impact
      }
    });

    // Baseline minimum load
    const calculatedCpu = Math.min(99, Math.max(3, Math.round(totalCpu / 5) + 5));
    // Max 16GB
    const rawRamUsed = Math.min(15.9, Math.max(1.8, 1.8 + (totalRamPct / 100) * 14.2));

    onUpdateSensors(prev => ({
      ...prev,
      cpuLoad: calculatedCpu,
      ramUsed: parseFloat(rawRamUsed.toFixed(2)),
    }));
  }, [processes, onUpdateSensors, dataSource]);

  // Handle killing a process
  const handleKill = async (pid: number, name: string) => {
    onSetProcesses(prev => prev.filter(p => p.pid !== pid));
    playErrorBuzz();
    logsTerminal(`SIGKILL [9] delivered to process PID ${pid} [${name}]. Memory freed.`, 'error');
    
    try {
      await fetch('/api/kill', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pid, name })
      });
    } catch (e) {}
  };

  // Adjust nice level of a process
  const handleAdjustNice = (pid: number) => {
    playTick();
    onSetProcesses(prev => prev.map(p => {
      if (p.pid === pid) {
        const nextNice = p.nice >= 19 ? -20 : p.nice + 2;
        // Nice value decreases or increases CPU allotment slightly
        const factor = nextNice < 0 ? 1.4 : 0.7;
        logsTerminal(`RENICE: Modified priority for PID ${pid} to [${nextNice}].`, 'system');
        return {
          ...p,
          nice: nextNice,
          cpu: parseFloat((p.cpu * factor).toFixed(1)),
        };
      }
      return p;
    }));
  };

  // Spawn new process manually
  const handleSpawn = (e: React.FormEvent) => {
    e.preventDefault();
    const pid = Math.floor(Math.random() * 8000) + 1000;
    const initialCpu = parseFloat((Math.random() * 35 + 15).toFixed(1));
    const initialRam = parseFloat((Math.random() * 12 + 4).toFixed(1));

    const newProc: SystemProcess = {
      pid,
      name: spawnName,
      cpu: initialCpu,
      ram: initialRam,
      status: 'RUNNING',
      user: 'root',
      nice: 0,
      uptimeSeconds: 0,
    };

    onSetProcesses(prev => [newProc, ...prev]);
    playBeep(650, 0.12);
    logsTerminal(`Successfully spawned background process [PID: ${pid}] - '${spawnName}'`, 'success');
  };

  // Sort logic
  const handleSort = (field: typeof sortBy) => {
    playTick();
    if (sortBy === field) {
      setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
  };

  const getSortIcon = (field: typeof sortBy) => {
    if (sortBy !== field) return null;
    return sortOrder === 'desc' ? <ChevronDown className="w-3 h-3 text-emerald-400" /> : <ChevronUp className="w-3 h-3 text-emerald-400" />;
  };

  // Custom Deep Clean handler
  const handleDeepPurge = async () => {
    if (isCleaning) return;
    setIsCleaning(true);
    setCleanReport(null);
    setCleanLogs([]);
    playBeep(800, 0.15);
    
    const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));
    
    setCleanLogs(prev => [...prev, '[DỌN DẸP] Đang khởi động Purge Optimizer v4.9...']);
    await sleep(400);
    setCleanLogs(prev => [...prev, `[DỌN DẸP] Mục tiêu quét : [${cleanTargets.join(', ')}]`]);
    await sleep(400);

    if (cleanTargets.includes('node')) {
      setCleanLogs(prev => [...prev, '[QUÉT] Quét bộ nhớ rác Heap Leaks của tiến trình Node.js...']);
      await sleep(350);
    }
    if (cleanTargets.includes('vite')) {
      setCleanLogs(prev => [...prev, '[QUÉT] Flush bộ nhớ bundler cache Vite HMR...']);
      await sleep(300);
    }
    if (cleanTargets.includes('ollama')) {
      setCleanLogs(prev => [...prev, '[QUÉT] Pruning inactive Ollama model contexts...']);
      await sleep(400);
    }
    if (cleanTargets.includes('stale_apps')) {
      setCleanLogs(prev => [...prev, '[QUÉT] Đóng triệt tàn dư zombie cụm DarkLust & RPChat...']);
      await sleep(350);
    }
    if (cleanTargets.includes('browser_hogs')) {
      setCleanLogs(prev => [...prev, '[QUÉT] Tìm Firefox/Chrome content process đang ngốn CPU để đóng mềm...']);
      await sleep(350);
    }
    if (cleanTargets.includes('headless_automation')) {
      setCleanLogs(prev => [...prev, '[QUÉT] Tìm Firefox/Playwright headless automation mồ côi...']);
      await sleep(350);
    }

    try {
      const res = await fetch('/api/deep-clean', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ selectedTargets: cleanTargets })
      });
      const data = await res.json();
      if (data.success) {
        setCleanReport({
          reclaimedMb: data.reclaimedMb,
          killedThreads: data.killedThreads,
          details: data.details
        });
        setCleanLogs(prev => [
          ...prev, 
          `[OK] Đã hoàn tất tối ưu hóa thành công!`,
          `[THÔNG SỐ] Giải phóng : ${data.reclaimedMb} MB`,
          `[THÔNG SỐ] Đã giải tán  : ${data.killedThreads} tiến trình ngầm vãng lai.`
        ]);
        playSuccessChime();
        logsTerminal(`[DEEP PURGE SUCCESS]: ${data.message}`, 'success');
      } else {
        throw new Error(data.error || 'Deep clean endpoint returned server error');
      }
    } catch (err: any) {
      setCleanLogs(prev => [...prev, `[LỖI] Trục trặc: ${err.message}`]);
      playErrorBuzz();
      logsTerminal(`[DEEP PURGE ERR]: ${err.message}`, 'error');
    } finally {
      setIsCleaning(false);
    }
  };

  const sortedProcesses = [...processes].sort((a, b) => {
    let valA = a[sortBy];
    let valB = b[sortBy];

    if (typeof valA === 'string' && typeof valB === 'string') {
      return sortOrder === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
    }

    return sortOrder === 'asc' 
      ? (valA as number) - (valB as number)
      : (valB as number) - (valA as number);
  });

  const visibleProcesses = showAllProcesses ? sortedProcesses : sortedProcesses.slice(0, 7);

  // Calculate some stats
  const coreBars = [
    { label: 'CPU1', val: Math.min(100, Math.max(1, Math.round(sensors.cpuLoad * 1.05 + (Math.random() - 0.5) * 12))) },
    { label: 'CPU2', val: Math.min(100, Math.max(1, Math.round(sensors.cpuLoad * 0.95 + (Math.random() - 0.5) * 10))) },
    { label: 'CPU3', val: Math.min(100, Math.max(1, Math.round(sensors.cpuLoad * 1.12 + (Math.random() - 0.5) * 8))) },
    { label: 'CPU4', val: Math.min(100, Math.max(1, Math.round(sensors.cpuLoad * 0.88 + (Math.random() - 0.5) * 9))) },
  ];

  return (
    <div id="htop-system-module" className="bg-zinc-900/30 border border-zinc-800 rounded-sm p-4 font-mono shadow-md flex flex-col h-full relative">

      {/* Header */}
      <div className="flex items-center justify-between mb-3 pb-2 border-b border-zinc-800">
        <h2 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
          <span>ACTIVE_HTOP_DAEMON</span>
        </h2>
        <span className="text-[9px] text-zinc-500">TASKS: <span className="text-emerald-400 font-bold">{processes.length}</span> | CRON: <span className="text-emerald-400 font-bold">ONLINE</span></span>
      </div>

      {/* HTOP Cpu / Ram Visualiser */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-zinc-950 p-3 rounded-sm border border-zinc-800 mb-3 text-[11px] select-none text-zinc-350">
        <div className="space-y-1">
          {coreBars.map((core) => {
            const blockCount = Math.round(core.val / 5);
            const blocks = '|'.repeat(blockCount);
            const spaces = '.'.repeat(20 - blockCount);
            return (
              <div key={core.label} className="flex items-center justify-between gap-2">
                <span className="text-zinc-400 w-10 font-bold">{core.label}</span>
                <span className="font-mono text-emerald-500 font-bold">[{blocks.padEnd(20, '.')}]</span>
                <span className={`w-10 text-right font-bold ${core.val > 80 ? 'text-red-400' : core.val > 55 ? 'text-amber-400' : 'text-emerald-400'}`}>
                  {core.val}%
                </span>
              </div>
            );
          })}
        </div>

        <div className="space-y-1">
          {/* Ram Bar */}
          <div className="flex items-center justify-between gap-2">
            <span className="text-zinc-400 w-10 font-bold">MEM</span>
            <span className="font-mono text-zinc-100 font-medium">
              [{'|'.repeat(Math.round((sensors.ramUsed / sensors.ramTotal) * 20)).padEnd(20, '.')}]
            </span>
            <span className="text-zinc-400 w-16 text-right">
              {sensors.ramUsed.toFixed(1)}G/{sensors.ramTotal}G
            </span>
          </div>

          {/* Disk bar */}
          <div className="flex items-center justify-between gap-2">
            <span className="text-zinc-400 w-10 font-bold">DSK</span>
            <span className="font-mono text-zinc-100 font-medium">
              [{'|'.repeat(Math.round(sensors.diskUsed / 5)).padEnd(20, '.')}]
            </span>
            <span className="text-zinc-400 w-16 text-right">
              {sensors.diskUsed}%
            </span>
          </div>

          <div className="text-[10px] text-zinc-500 flex justify-between pt-1 border-t border-zinc-900 mt-2">
            <span>SWAP: <span className="text-emerald-450 font-bold">{(sensors.swapUsed ?? 0.2).toFixed(1)}G / {(sensors.swapTotal ?? 4.0).toFixed(1)}G</span></span>
            <span>IP: <span className="text-emerald-450 font-bold">{sensors.ipAddress ?? "127.0.0.1"}</span></span>
          </div>
        </div>
      </div>

      {/* Deep Purge trigger bar */}
      <div className="bg-zinc-950 p-2 border border-zinc-800 rounded-sm mb-3 flex items-center justify-between text-[11px]">
        <div className="flex items-center gap-2">
          <Trash2 className="w-3.5 h-3.5 text-amber-500 shrink-0" />
          <span className="font-bold text-zinc-300">TRÌNH DỌN DẸP SÂU HỆ THỐNG</span>
        </div>
        <button
          id="btn-toggle-deep-clean"
          onClick={() => {
            setShowCleanPanel(!showCleanPanel);
            playTick();
          }}
          className={`px-2 py-0.5 rounded-sm font-bold text-[9.5px] border cursor-pointer transition-all ${
            showCleanPanel 
              ? 'bg-amber-500/20 border-amber-500 text-amber-300 animate-pulse' 
              : 'bg-zinc-900 border-zinc-700 hover:bg-zinc-800 text-zinc-300'
          }`}
        >
          {showCleanPanel ? 'ĐÓNG ĐIỀU KHIỂN' : 'MỞ ĐIỀU KHIỂN SÂU (DEEP PURGE)'}
        </button>
      </div>

      {/* Interactive Deep Purge Panel */}
      {showCleanPanel && (
        <div className="bg-zinc-950 border border-amber-500/20 p-2.5 rounded-sm mb-3 text-[11px] animate-fadeIn">
          <div className="flex items-center justify-between border-b border-zinc-900 pb-1.5 mb-2">
            <span className="font-bold text-amber-400 flex items-center gap-1.5 uppercase tracking-wide">
              <ShieldAlert className="w-3.5 h-3.5 text-amber-500" /> Bảng điều khiển Purge Engine tối ưu
            </span>
            <span className="text-[9px] text-zinc-500 font-mono">
              NGUỒN LỰC: {dataSource === 'LOCAL' ? 'THIẾT BỊ VẬT LÝ (AGENT)' : dataSource === 'SERVER' ? 'HOST CONTAINER (SERVER)' : 'GIẢ LẬP (SANDBOX)'}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 mb-2">
            <label className="flex items-center gap-1.5 hover:text-white cursor-pointer select-none">
              <input 
                type="checkbox" 
                checked={cleanTargets.includes('node')}
                onChange={() => {
                  playTick();
                  setCleanTargets(prev => prev.includes('node') ? prev.filter(t => t !== 'node') : [...prev, 'node']);
                }}
                className="accent-amber-500 cursor-pointer"
              />
              <span className="text-zinc-400 text-[10px]">Node.js Engine (Heap GC)</span>
            </label>
            <label className="flex items-center gap-1.5 hover:text-white cursor-pointer select-none">
              <input 
                type="checkbox" 
                checked={cleanTargets.includes('vite')}
                onChange={() => {
                  playTick();
                  setCleanTargets(prev => prev.includes('vite') ? prev.filter(t => t !== 'vite') : [...prev, 'vite']);
                }}
                className="accent-amber-500 cursor-pointer"
              />
              <span className="text-zinc-400 text-[10px]">Vite Bundler (Dev HMR Cache)</span>
            </label>
            <label className="flex items-center gap-1.5 hover:text-white cursor-pointer select-none">
              <input 
                type="checkbox" 
                checked={cleanTargets.includes('react')}
                onChange={() => {
                  playTick();
                  setCleanTargets(prev => prev.includes('react') ? prev.filter(t => t !== 'react') : [...prev, 'react']);
                }}
                className="accent-amber-500 cursor-pointer"
              />
              <span className="text-zinc-400 text-[10px]">React Developer Sandbox</span>
            </label>
            <label className="flex items-center gap-1.5 hover:text-white cursor-pointer select-none">
              <input 
                type="checkbox" 
                checked={cleanTargets.includes('ollama')}
                onChange={() => {
                  playTick();
                  setCleanTargets(prev => prev.includes('ollama') ? prev.filter(t => t !== 'ollama') : [...prev, 'ollama']);
                }}
                className="accent-amber-500 cursor-pointer"
              />
              <span className="text-zinc-400 text-[10px]">Ollama Background Contexts</span>
            </label>
            <label className="flex items-center gap-1.5 hover:text-white cursor-pointer select-none">
              <input 
                type="checkbox" 
                checked={cleanTargets.includes('stale_apps')}
                onChange={() => {
                  playTick();
                  setCleanTargets(prev => prev.includes('stale_apps') ? prev.filter(t => t !== 'stale_apps') : [...prev, 'stale_apps']);
                }}
                className="accent-amber-500 cursor-pointer"
              />
              <span className="text-zinc-400 text-[10px] font-bold text-amber-300">Đóng sập DarkLust & RPChat cũ</span>
            </label>
            <label className="flex items-center gap-1.5 hover:text-white cursor-pointer select-none">
              <input 
                type="checkbox" 
                checked={cleanTargets.includes('tmp_logs')}
                onChange={() => {
                  playTick();
                  setCleanTargets(prev => prev.includes('tmp_logs') ? prev.filter(t => t !== 'tmp_logs') : [...prev, 'tmp_logs']);
                }}
                className="accent-amber-500 cursor-pointer"
              />
              <span className="text-zinc-400 text-[10px]">Nhật ký tạm hệ thống (/tmp/*.log)</span>
            </label>
            <label className="flex items-center gap-1.5 hover:text-white cursor-pointer select-none">
              <input 
                type="checkbox" 
                checked={cleanTargets.includes('browser_hogs')}
                onChange={() => {
                  playTick();
                  setCleanTargets(prev => prev.includes('browser_hogs') ? prev.filter(t => t !== 'browser_hogs') : [...prev, 'browser_hogs']);
                }}
                className="accent-amber-500 cursor-pointer"
              />
              <span className="text-amber-300 text-[10px] font-bold">Browser CPU hogs (đóng tab/process cao)</span>
            </label>
            <label className="flex items-center gap-1.5 hover:text-white cursor-pointer select-none">
              <input 
                type="checkbox" 
                checked={cleanTargets.includes('headless_automation')}
                onChange={() => {
                  playTick();
                  setCleanTargets(prev => prev.includes('headless_automation') ? prev.filter(t => t !== 'headless_automation') : [...prev, 'headless_automation']);
                }}
                className="accent-amber-500 cursor-pointer"
              />
              <span className="text-emerald-300 text-[10px] font-bold">Headless automation cũ (Firefox/Playwright)</span>
            </label>
          </div>

          <div className="flex gap-2 items-stretch min-h-[72px]">
            {/* Terminal log output stream */}
            <div className="flex-grow bg-zinc-950 rounded-sm border border-zinc-900 p-1.5 font-mono text-[9px] text-zinc-400 max-h-[85px] overflow-y-auto leading-tight space-y-0.5">
              {cleanLogs.length === 0 ? (
                <div className="text-zinc-650 italic text-center pt-5">[Sẵn sàng kích hoạt dọn dẹp hệ thống]</div>
              ) : (
                cleanLogs.map((log, lIdx) => (
                  <div key={lIdx} className={log.includes('[OK]') ? 'text-emerald-400 font-bold' : log.includes('[LỖI]') ? 'text-red-400 font-bold' : 'text-zinc-400'}>
                    {log}
                  </div>
                ))
              )}
            </div>

            <div className="shrink-0 flex flex-col justify-between w-28">
              <button
                id="btn-trigger-deep-purge"
                disabled={isCleaning || cleanTargets.length === 0}
                onClick={handleDeepPurge}
                className="w-full bg-amber-500 text-black hover:bg-amber-400 disabled:bg-zinc-800 disabled:text-zinc-500 font-bold text-[9px] p-2 rounded-sm cursor-pointer transition-colors block text-center uppercase tracking-wide h-10"
              >
                {isCleaning ? 'PURGING...' : 'BẮT ĐẦU PURGE'}
              </button>

              <div className="p-1 rounded-sm text-center text-[8.5px] text-zinc-500 leading-tight">
                Không ảnh hưởng mã nguồn.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Spawning Controls */}
      <form onSubmit={handleSpawn} className="flex gap-2 mb-3 bg-zinc-950 p-2 rounded-sm border border-zinc-800 items-center">
        <span className="text-[9px] text-zinc-500 font-semibold uppercase tracking-wider shrink-0 flex items-center gap-1">
          <Plus className="w-3 h-3 text-zinc-400" /> CO-PROCESS:
        </span>
        <select
          id="spawn-process-select"
          value={spawnName}
          onChange={(e) => {
            setSpawnName(e.target.value);
            playTick();
          }}
          className="bg-zinc-900 border border-zinc-800 text-xs text-zinc-300 rounded-sm px-2 py-0.5 focus:outline-none focus:border-zinc-650 cursor-pointer flex-grow"
        >
          {systemScripts.map(script => (
            <option key={script} value={script}>{script}</option>
          ))}
        </select>
        <button
          id="run-process-btn"
          type="submit"
          className="bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-[10px] px-3 py-1 rounded-sm border border-zinc-700 transition-all font-bold cursor-pointer"
        >
          EXECUTE
        </button>
      </form>

      {/* HTOP Active Processes Table List */}
      <div className={`overflow-x-auto overflow-y-auto select-none border border-zinc-800 rounded-sm bg-zinc-950 transition-all duration-300 ${
        showAllProcesses ? 'max-h-[450px]' : 'max-h-[220px]'
      }`}>
        <table className="w-full text-left text-[11px] border-collapse min-w-[420px]">
          <thead>
            <tr className="bg-zinc-900 text-zinc-400 font-bold border-b border-zinc-800">
              <th 
                className="p-1.5 pl-3 cursor-pointer hover:bg-zinc-800 select-none" 
                onClick={() => handleSort('pid')}
              >
                <div className="flex items-center gap-1">PID {getSortIcon('pid')}</div>
              </th>
              <th 
                className="p-1.5 cursor-pointer hover:bg-zinc-800 select-none" 
                onClick={() => handleSort('name')}
              >
                <div className="flex items-center gap-1">PROCESS {getSortIcon('name')}</div>
              </th>
              <th 
                className="p-1.5 cursor-pointer hover:bg-zinc-800 select-none text-right" 
                onClick={() => handleSort('cpu')}
              >
                <div className="flex items-center gap-1 justify-end">CPU% {getSortIcon('cpu')}</div>
              </th>
              <th 
                className="p-1.5 cursor-pointer hover:bg-zinc-800 select-none text-right" 
                onClick={() => handleSort('ram')}
              >
                <div className="flex items-center gap-1 justify-end">MEM% {getSortIcon('ram')}</div>
              </th>
              <th className="p-1.5 text-center">NICE</th>
              <th className="p-1.5 pr-3 text-center">ACTION</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-900 w-full">
            {visibleProcesses.map((proc) => (
              <tr 
                key={proc.pid} 
                className={`hover:bg-zinc-800/40 font-mono text-zinc-300 ${
                  proc.status === 'STOPPED' ? 'opacity-40' : ''
                }`}
              >
                <td className="p-1.5 pl-3 text-zinc-500 font-bold">{proc.pid}</td>
                <td className="p-1.5 text-zinc-100 font-medium truncate max-w-[120px]" title={proc.name}>
                  {proc.name}
                </td>
                <td className="p-1.5 text-right font-medium text-zinc-300">{proc.cpu}%</td>
                <td className="p-1.5 text-right font-medium text-zinc-450">{proc.ram}%</td>
                
                {/* Nice prioritizing */}
                <td className="p-1.5 text-center">
                  <button
                    onClick={() => handleAdjustNice(proc.pid)}
                    className="bg-zinc-900 border border-zinc-800 text-[10px] text-zinc-400 hover:text-white px-1.5 py-0.5 rounded-sm cursor-pointer transition-colors"
                    title="Điều chỉnh Nice level"
                  >
                    {proc.nice}
                  </button>
                </td>

                {/* Kill actions */}
                <td className="p-1.5 text-center pr-3">
                  <button
                    onClick={() => handleKill(proc.pid, proc.name)}
                    className="text-red-400 bg-red-500/10 hover:bg-red-500/20 px-1.5 py-0.5 rounded-sm border border-red-500/30 transition-all font-bold cursor-pointer text-[10px]"
                    title="Kill Process (SIGKILL)"
                  >
                    KILL
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-2 text-[9px] text-zinc-500 flex justify-between items-center select-none pt-2 border-t border-zinc-800">
        <button
          id="btn-expand-processes"
          onClick={() => {
            setShowAllProcesses(!showAllProcesses);
            playTick();
          }}
          className="bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 hover:text-white text-zinc-300 px-2 py-0.5 rounded-sm flex items-center gap-1 font-mono cursor-pointer transition-all text-[9.5px]"
        >
          {showAllProcesses ? (
            <>
              THU GỌN DANH SÁCH (SHOW LESS) <ChevronUp className="w-3.5 h-3.5 text-emerald-400" />
            </>
          ) : (
            <>
              XEM TOÀN BỘ TIẾN TRÌNH ({processes.length}) (SHOW ALL) <ChevronDown className="w-3.5 h-3.5 text-emerald-400" />
            </>
          )}
        </button>
        <span className="text-zinc-500">SORT: {sortBy.toUpperCase()} ({sortOrder.toUpperCase()})</span>
      </div>
    </div>
  );
}
