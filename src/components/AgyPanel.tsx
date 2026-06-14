import React, { useState } from 'react';
import { AgyAgent } from '../types';
import { Play, CheckCircle, AlertTriangle, Terminal, Eye, FileSpreadsheet } from 'lucide-react';
import { playTick, playBeep, playSuccessChime, playErrorBuzz } from '../utils/audio';

interface AgyPanelProps {
  agents: AgyAgent[];
  onSetAgents: React.Dispatch<React.SetStateAction<AgyAgent[]>>;
  logsTerminal: (text: string, type: 'input' | 'output' | 'error' | 'success' | 'system') => void;
}

export default function AgyPanel({
  agents,
  onSetAgents,
  logsTerminal,
}: AgyPanelProps) {
  const [selectedAgentId, setSelectedAgentId] = useState<string>('agy-1');

  // Realistic mock log flows when we execute agents
  const getAgentLogsForExecution = (id: string): string[] => {
    switch (id) {
      case 'agy-1':
        return [
          '[INFO] Initializing Codex Auditor v1.2...',
          '[AUDIT] Scanning typescript hooks for dependency arrays...',
          '[AUDIT] Inspecting React components for re-renders...',
          '[DEBUG] Memoization check on getProcesses() => OK',
          '[SUCCESS] Code Audited! 0 critical leaks found.',
        ];
      case 'agy-2':
        return [
          '[SEC] Initializing Vulnerability Scanner...',
          '[SEC] Reading packages file map list from node_modules...',
          '[WARN] Found 1 moderate vulnerability in ancient-dep@0.1b',
          '[SEC] Patch suggested: npm install next-package-fixed',
          '[SUCCESS] Safe state confirmed. Protection verified.',
        ];
      case 'agy-3':
        return [
          '[SYS] Spawning Garbage Collection daemon...',
          '[SYS] Identifying orphan process logs and zombie processes...',
          '[SYS] Terminated 1 inactive tailwind-cache thread (PID 2145)...',
          '[CLEAN] Recovered 240MB of memory buffer space.',
          '[SUCCESS] Garbage cleanup complete.',
        ];
      default:
        return ['[SYS] Agent triggered. Ready.'];
    }
  };

  // Run the agent triggers
  const handleRunAgent = (id: string, name: string) => {
    playBeep(520, 0.15, 0.08);
    logsTerminal(`[AGY]: Dispatched Agent '${name}' in background thread...`, 'system');

    // Reset status to running with 0% progress
    onSetAgents(prev => prev.map(a => {
      if (a.id === id) {
        return { 
          ...a, 
          status: 'running', 
          progress: 0, 
          logs: [`[SYS] Dispatched at ${new Date().toLocaleTimeString()}`]
        };
      }
      return a;
    }));

    // Choose logs for simulated steps
    const mockSteps = getAgentLogsForExecution(id);
    let stepIndex = 0;

    const interval = setInterval(() => {
      onSetAgents(prev => prev.map(a => {
        if (a.id === id) {
          const nextProgress = Math.min(100, a.progress + 20);
          const currentLogs = [...a.logs];

          if (stepIndex < mockSteps.length) {
            currentLogs.push(mockSteps[stepIndex]);
            stepIndex++;
          }

          if (nextProgress >= 100) {
            clearInterval(interval);
            setTimeout(() => {
              playSuccessChime();
              logsTerminal(`[AGY]: Agent '${name}' has successfully finished execution. Results written to Codex database.`, 'success');
            }, 100);

            return {
              ...a,
              status: 'success',
              progress: 100,
              lastExecution: new Date().toLocaleTimeString('vi', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
              logs: [...currentLogs, `[SYS] Completed successfully. Exiting daemon [0x00].`],
            };
          }

          return {
            ...a,
            progress: nextProgress,
            logs: currentLogs,
          };
        }
        return a;
      }));
    }, 700);
  };

  const selectedAgent = agents.find(a => a.id === selectedAgentId) || agents[0];

  return (
    <div id="agy-agent-module" className="bg-zinc-900/30 border border-zinc-800 rounded-sm p-4 font-mono shadow-md relative flex flex-col h-full">

      {/* Header */}
      <div className="flex items-center justify-between mb-3 pb-2 border-b border-zinc-800">
        <h2 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
          <span>AGENT_AGENCY_DAEMON</span>
        </h2>
        <span className="text-[9px] text-zinc-500">LLM_GATEWAY: CLOUD_RUN_READY</span>
      </div>

      {/* Interactive Grid listing agents */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 mb-3">
        {agents.map((agent) => {
          const isSelected = agent.id === selectedAgentId;
          return (
            <div
              key={agent.id}
              onClick={() => {
                setSelectedAgentId(agent.id);
                playTick();
              }}
              className={`p-2.5 rounded-sm border transition-all cursor-pointer select-none relative overflow-hidden ${
                isSelected
                  ? 'bg-zinc-800 border-zinc-500'
                  : 'bg-zinc-950 border border-zinc-800 hover:border-zinc-700'
              }`}
            >
              <div className="flex justify-between items-start mb-1 gap-2">
                <span className={`text-[10.5px] font-bold truncate ${isSelected ? 'text-white' : 'text-zinc-400'}`}>
                  {agent.name}
                </span>

                {agent.status === 'running' && (
                  <span className="w-1.5 h-1.5 bg-zinc-400 animate-pulse"></span>
                )}
                {agent.status === 'success' && (
                  <span className="w-1.5 h-1.5 bg-zinc-100"></span>
                )}
                {agent.status === 'idle' && (
                  <span className="w-1.5 h-1.5 bg-zinc-800"></span>
                )}
              </div>

              <div className="text-[9px] text-zinc-500 truncate mb-2">
                {agent.description}
              </div>

              {agent.status === 'running' ? (
                <div>
                  <div className="flex justify-between items-center text-[8.5px] text-zinc-300 mb-0.5">
                    <span>RUNNING...</span>
                    <span>{agent.progress}%</span>
                  </div>
                  <div className="w-full bg-zinc-900 h-1 overflow-hidden">
                    <div className="h-full bg-white" style={{ width: `${agent.progress}%` }} />
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between mt-1">
                  <span className="text-[8.5px] text-zinc-650">
                    LAST: {agent.lastExecution || 'NEVER'}
                  </span>
                  
                  <button
                    id={`trigger-agent-${agent.id}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRunAgent(agent.id, agent.name);
                    }}
                    className="text-[9px] px-1.5 py-0.5 font-bold bg-zinc-900 hover:bg-zinc-800 text-zinc-350 hover:text-white rounded-sm border border-zinc-700 transition-colors cursor-pointer"
                  >
                    RUN
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Selected Agent Logs visual box - real terminal styled log output! */}
      <div className="bg-zinc-950 border border-zinc-800 rounded-sm p-3 flex-grow flex flex-col min-h-[140px] max-h-[185px]">
        <div className="flex justify-between items-center border-b border-zinc-900 pb-1.5 mb-2">
          <span className="text-[10px] text-zinc-400 font-bold flex items-center gap-1.5 uppercase">
            <Terminal className="w-3.5 h-3.5" /> LOGSTREAM: /var/log/{selectedAgent.id}.log
          </span>
          <span className="text-[9.5px] text-zinc-500 border border-zinc-900 px-1 py-0.1 rounded-sm text-right uppercase">
            STATUS: {selectedAgent.status}
          </span>
        </div>

        {/* Real logs rendering */}
        <div className="flex-grow overflow-y-auto font-mono text-[10px] text-zinc-400 space-y-1 select-text file-scroller">
          {selectedAgent.logs.length === 0 ? (
            <div className="text-zinc-650 italic">
              [SYSTEM]: No log records for this daemon. Run Agent to stream records.
            </div>
          ) : (
            selectedAgent.logs.map((log, idx) => {
              let logColor = 'text-zinc-400';
              if (log.includes('[SUCCESS]')) logColor = 'text-zinc-100 font-bold';
              else if (log.includes('[WARN]')) logColor = 'text-amber-500 font-medium';
              else if (log.includes('[SEC]')) logColor = 'text-zinc-300';
              else if (log.includes('[INFO]')) logColor = 'text-zinc-500';
              return (
                <div key={idx} className={`${logColor} break-all`}>
                  {log}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
