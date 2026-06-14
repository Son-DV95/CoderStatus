import React, { useState, useEffect } from 'react';
import { SystemProcess, SystemSensors } from '../types';
import { Play, Square, RefreshCw, X, ChevronDown, ChevronUp, Plus } from 'lucide-react';
import { playTick, playBeep, playErrorBuzz } from '../utils/audio';

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
  const handleKill = (pid: number, name: string) => {
    onSetProcesses(prev => prev.filter(p => p.pid !== pid));
    playErrorBuzz();
    logsTerminal(`SIGKILL [9] delivered to process PID ${pid} [${name}]. Memory freed.`, 'error');
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
            <span>SWAP: <span className="text-emerald-450 font-bold">0.2G / 4.0G</span></span>
            <span>IP: <span className="text-emerald-450 font-bold">192.168.1.144</span></span>
          </div>
        </div>
      </div>

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
      <div className="flex-grow overflow-x-auto select-none border border-zinc-800 rounded-sm bg-zinc-950">
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
            {sortedProcesses.map((proc) => (
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
        <span>Click <b>NICE</b> để chỉnh độ ưu tiên | <b>KILL</b> giải phóng RAM</span>
        <span className="text-zinc-500">SORT: {sortBy.toUpperCase()} ({sortOrder.toUpperCase()})</span>
      </div>
    </div>
  );
}
