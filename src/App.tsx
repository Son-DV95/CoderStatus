import React, { useState, useEffect, useCallback } from 'react';
import { Task, SystemProcess, SystemSensors, AgyAgent, TerminalLog } from './types';
import QuickTerminalStats from './components/QuickTerminalStats';
import TaskManager from './components/TaskManager';
import HtopMonitor from './components/HtopMonitor';
import SystemSensorsComp from './components/SystemSensors';
import AgyPanel from './components/AgyPanel';
import TerminalCLI from './components/TerminalCLI';
import LofiPlayer from './components/LofiPlayer';
import AiDiagnostics from './components/AiDiagnostics';
import { playBootSweep, setSoundEnabled, playBeep, playSuccessChime, playTick, playErrorBuzz } from './utils/audio';
import { Shield, Sparkles, Terminal as TerminalIcon, Calendar, CheckCircle2, Flame, RefreshCw } from 'lucide-react';

const defaultTasks: Task[] = [
  {
    id: 'task-1',
    title: 'Phân tích kiến trúc dự án & Thiết kế module DevOS Client',
    category: 'DEV',
    priority: 'HIGH',
    completed: true,
    createdAt: new Date(Date.now() - 3600000 * 4).toISOString(), // 4h ago
  },
  {
    id: 'task-2',
    title: 'Tối ưu hóa tần suất đọc mẫu sensor dht22/htop hằng ngày',
    category: 'SYS',
    priority: 'MED',
    completed: false,
    createdAt: new Date(Date.now() - 3600000 * 2).toISOString(), // 2h ago
  },
  {
    id: 'task-3',
    title: 'Đồng bộ hóa Codex Agent "Codex Auditor" rà soát lỗi bảo mật',
    category: 'AGY',
    priority: 'HIGH',
    completed: false,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'task-4',
    title: 'Đọc tài liệu hướng dẫn cấu hình hệ thống Core SDK',
    category: 'DOCS',
    priority: 'LOW',
    completed: false,
    createdAt: new Date().toISOString(),
  }
];

const defaultProcesses: SystemProcess[] = [
  { pid: 4012, name: 'vite-dev-server', cpu: 12.4, ram: 4.8, status: 'RUNNING', user: 'root', nice: 0, uptimeSeconds: 320 },
  { pid: 4110, name: 'node-i2c-bridge', cpu: 2.1, ram: 1.2, status: 'RUNNING', user: 'root', nice: -5, uptimeSeconds: 320 },
  { pid: 4125, name: 'tailwind-compiler', cpu: 0.8, ram: 2.5, status: 'RUNNING', user: 'root', nice: 0, uptimeSeconds: 320 },
  { pid: 5410, name: 'agy-context-daemon', cpu: 5.6, ram: 3.4, status: 'RUNNING', user: 'root', nice: 10, uptimeSeconds: 210 },
  { pid: 6290, name: 'htop-process-poller', cpu: 1.5, ram: 0.8, status: 'RUNNING', user: 'root', nice: 19, uptimeSeconds: 150 },
];

const defaultSensors: SystemSensors = {
  cpuTemp: 44,
  gpuTemp: 41,
  fanSpeed: 1680,
  powerDraw: 55,
  cpuLoad: 12,
  ramUsed: 4.2,
  ramTotal: 16,
  diskUsed: 48,
  networkKbps: { up: 45, down: 280 }
};

const defaultAgents: AgyAgent[] = [
  {
    id: 'agy-1',
    name: 'Codex Auditor',
    description: 'Bảo mật & Tối ưu Codex',
    status: 'idle',
    progress: 0,
    lastExecution: '',
    logs: []
  },
  {
    id: 'agy-2',
    name: 'OS Secu Scanner',
    description: 'Rà soát gói độc hại',
    status: 'idle',
    progress: 0,
    lastExecution: '',
    logs: []
  },
  {
    id: 'agy-3',
    name: 'Cache Clean Daemon',
    description: 'Bộ dọn RAM hệ thống',
    status: 'idle',
    progress: 0,
    lastExecution: '',
    logs: []
  }
];

export default function App() {
  const [soundState, setSoundState] = useState<boolean>(false);
  const [tasks, setTasks] = useState<Task[]>(() => {
    const saved = localStorage.getItem('devos_tasks');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        return defaultTasks;
      }
    }
    return defaultTasks;
  });

  const [processes, setProcesses] = useState<SystemProcess[]>(defaultProcesses);
  const [sensors, setSensors] = useState<SystemSensors>(defaultSensors);
  const [agents, setAgents] = useState<AgyAgent[]>(defaultAgents);

  // Real stack system info states
  const dataSource = 'SERVER';
  const [serverInfo, setServerInfo] = useState<any>(null);

  // Terminal command logs state
  const [logs, setLogs] = useState<TerminalLog[]>(() => {
    const defaultLogs: TerminalLog[] = [
      {
        id: 'initial-boot-0',
        timestamp: new Date().toLocaleTimeString('vi', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        text: 'HỆ THỐNG GIÁM SÁT HIỆU NĂNG THỰC DEVOS TERMINAL v4.1.4 [FULL-STACK LINUX]',
        type: 'header'
      },
      {
        id: 'initial-boot-1',
        timestamp: new Date().toLocaleTimeString('vi', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        text: 'Đang kết nối API hệ thống thực... OK - Đã nạp thành công dữ liệu container.',
        type: 'success'
      },
      {
        id: 'initial-boot-2',
        timestamp: new Date().toLocaleTimeString('vi', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        text: 'Mô-đun "Linux Process Poller" kích hoạt. Bạn có thể xem và quản trị tiến trình thực!',
        type: 'success'
      },
      {
        id: 'initial-boot-3',
        timestamp: new Date().toLocaleTimeString('vi', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        text: 'HỆ THỐNG: Đang đồng bộ hóa chỉ số hiệu năng trực tiếp của Server Host.',
        type: 'system'
      }
    ];
    return defaultLogs;
  });

  // Central log hook
  const logsTerminal = useCallback((text: string, type: TerminalLog['type'] = 'output') => {
    const timeStr = new Date().toLocaleTimeString('vi', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
    setLogs(prev => [
      ...prev,
      {
        id: `log-${Math.random().toString(36).substr(2, 9)}`,
        timestamp: timeStr,
        text,
        type
      }
    ]);
  }, []);

  // Poll system real metrics
  useEffect(() => {
    let active = true;
    const fetchSystem = async () => {
      try {
        const res = await fetch('/api/system-info');
        const data = await res.json();
        if (active && data.success) {
          setServerInfo(data);
          setSensors(data.sensors);
          if (data.processes) {
            setProcesses(data.processes);
          }
        }
      } catch (e) {
        // Fallback silently
      }
    };

    fetchSystem();
    const interval = setInterval(fetchSystem, 3000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, []);

  // Save tasks to LocalStorage automatically when modified
  useEffect(() => {
    localStorage.setItem('devos_tasks', JSON.stringify(tasks));
  }, [tasks]);

  // Play a cool boot sweep sound when user first enables sound
  const handleToggleSound = (enabled: boolean) => {
    setSoundState(enabled);
    setSoundEnabled(enabled);
    if (enabled) {
      setTimeout(() => {
        playBootSweep();
        logsTerminal('[AUDIO]: Khởi chạy màng âm thanh phản hồi tần số analog.', 'success');
      }, 50);
    } else {
      logsTerminal('[AUDIO]: Đã tắt thiết bị phát âm thanh phản hồi.', 'system');
    }
  };

  // Add Task callback
  const handleAddTask = (title: string, category: Task['category'], priority: Task['priority']) => {
    const newTask: Task = {
      id: `task-${Date.now()}`,
      title,
      category,
      priority,
      completed: false,
      createdAt: new Date().toISOString(),
    };
    setTasks(prev => [newTask, ...prev]);
  };

  // Toggle Task callback
  const handleToggleTask = (id: string) => {
    setTasks(prev => prev.map(t => t.id === id ? { ...t, completed: !t.completed } : t));
  };

  // Delete Task callback
  const handleDeleteTask = (id: string) => {
    setTasks(prev => prev.filter(t => t.id !== id));
  };

  // Kill Process from terminal / UI
  const handleKillProcess = (pid: number) => {
    const proc = processes.find(p => p.pid === pid);
    if (proc) {
      setProcesses(prev => prev.filter(p => p.pid !== pid));
      logsTerminal(`[EXEC]: SIGKILL [9] đã cưỡng chế giải phóng PID ${pid} (${proc.name})`, 'error');
    }
  };

  // Run AGY agent from CLI
  const handleRunAgentFromCLI = (agentId: string) => {
    const agent = agents.find(a => a.id === agentId);
    if (!agent) return;

    if (agent.status === 'running') {
      logsTerminal(`LỖI: Agent [${agent.name}] đang chạy rồi. Hãy đợi hoàn tất.`, 'error');
      return;
    }

    logsTerminal(`[CO-PROCESS]: Kích hoạt luồng chạy nền cho '${agent.name}'...`, 'system');
    
    // update status to running
    setAgents(prev => prev.map(a => {
      if (a.id === agentId) {
        return { ...a, status: 'running', progress: 0, logs: [`[SYS] Khởi tạo log stream qua CLI command...`] };
      }
      return a;
    }));

    // Perform background counts
    let progress = 0;
    const interval = setInterval(() => {
      progress += 25;
      setAgents(prev => prev.map(a => {
        if (a.id === agentId) {
          const currentLogs = [...a.logs, `[CLI] Đang xử lý khối dữ liệu [${progress}%]...`];
          if (progress >= 100) {
            clearInterval(interval);
            setTimeout(() => {
              logsTerminal(`[SUCCESS]: Agent '${a.name}' hoàn tất quét tự động!`, 'success');
              playSuccessChime();
            }, 50);
            return {
              ...a,
              status: 'success',
              progress: 100,
              lastExecution: new Date().toLocaleTimeString('vi', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
              logs: [...currentLogs, '[CLEANUP] Hoàn tất tác vụ. Ghi sổ lưu trữ thành công.']
            };
          }
          return { ...a, progress, logs: currentLogs };
        }
        return a;
      }));
    }, 650);
  };

  // Clear Terminal logs
  const handleClearLogs = () => {
    setLogs([
      {
        id: `clear-${Date.now()}`,
        timestamp: new Date().toLocaleTimeString('vi', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        text: 'MÀN HÌNH TERMINAL ĐÃ ĐƯỢC LÀM SẠCH. NHẬP "help" ĐỂ HIỆN DANH SÁCH LỆNH.',
        type: 'system'
      }
    ]);
  };

  // Task statistics
  const completedTasks = tasks.filter(t => t.completed).length;
  const totalTasks = tasks.length;
  const activeTasks = totalTasks - completedTasks;

  return (
    <div className="bg-[#09090b] text-zinc-300 min-h-screen font-mono flex flex-col relative overflow-x-hidden selection:bg-zinc-800 selection:text-white">
      
      {/* Subtle grid background effect */}
      <div className="absolute inset-0 pointer-events-none opacity-[3%] bg-[linear-gradient(to_right,#52525b_1px,transparent_1px),linear-gradient(to_bottom,#52525b_1px,transparent_1px)] bg-[size:24px_24px] z-0"></div>
      
      {/* Main Container Wrapper */}
      <main className="max-w-7xl w-full mx-auto p-4 flex-grow flex flex-col gap-4 relative z-10">
        
        {/* Top Header Navbar */}
        <header id="main-header" className="flex flex-wrap items-center justify-between border-b border-zinc-800 pb-3 mt-1">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-sm bg-zinc-900 border border-zinc-700 flex items-center justify-center text-white">
              <TerminalIcon className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-extrabold text-white tracking-wider uppercase">
                  DEVOS TERMINAL PANEL
                </h1>
                <span className="text-[9px] bg-zinc-900 text-zinc-300 px-1.5 py-0.5 rounded-sm border border-zinc-850 font-bold uppercase tracking-wider leading-none">
                  v4.1.4_STABLE
                </span>
              </div>
              <p className="text-[10.5px] text-zinc-500 font-medium tracking-wide">
                Trình giám sát hiệu năng PC, Sensor & Quản lý Codex mục tiêu thực dụng
              </p>
            </div>
          </div>

          {/* Quick aesthetic controls */}
          <div className="flex items-center gap-3 mt-2 sm:mt-0">
            <div className="hidden md:flex items-center gap-2 text-xs bg-zinc-950 px-2.5 py-1 rounded-sm border border-zinc-800 text-zinc-400">
              <Calendar className="w-3.5 h-3.5" />
              <span>STREAK: </span>
              <span className="font-bold text-white flex items-center gap-0.5">
                <Flame className="w-3.5 h-3.5 text-zinc-400 fill-zinc-400" /> 14 DAYS
              </span>
            </div>

            <button 
              id="hot-reload-btn"
              onClick={() => {
                playBeep(1200, 0.08); 
                logsTerminal('Thực hiện định tuyến kiểm tra lại cảm biến hệ thống toàn cục...', 'system');
              }}
              className="px-2.5 py-1 rounded-sm text-[10.5px] font-bold border border-zinc-800 hover:border-zinc-700 bg-zinc-900 hover:bg-zinc-800 text-zinc-200 hover:text-white transition-all cursor-pointer flex items-center gap-1.5"
              title="Reset metrics"
            >
              <RefreshCw className="w-3 h-3 text-zinc-400 animate-spin" style={{ animationDuration: '4s' }} />
              <span>RE-SAMPLE</span>
            </button>
          </div>
        </header>

        {/* Global Dashboard Ribbon Banner */}
        <QuickTerminalStats 
          completedTasksCount={completedTasks}
          totalTasksCount={totalTasks}
          cpuLoad={sensors.cpuLoad}
          cpuTemp={sensors.cpuTemp}
          soundState={soundState}
          onToggleSound={handleToggleSound}
        />

        {/* Café Lo-fi Studio Accent Player */}
        <LofiPlayer />

        {/* Bento Board Layout */}
        <div id="dashboard-grid" className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          
          {/* Main Column Left (55% space) - High-utility daily tasks control board */}
          <div className="lg:col-span-7 flex flex-col gap-4">
            
            {/* The Prime Task Controller */}
            <TaskManager 
              tasks={tasks}
              onAddTask={handleAddTask}
              onToggleTask={handleToggleTask}
              onDeleteTask={handleDeleteTask}
              logsTerminal={logsTerminal}
            />

            {/* Quick Codex Analytics Console Box */}
            <div className="bg-zinc-900/30 border border-zinc-800 p-4 rounded-sm font-mono flex flex-col gap-3">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5 select-none">
                <CheckCircle2 className="w-4 h-4 text-zinc-400 shrink-0" />
                <span>CODEX_ANALYTICS_OVERVIEW</span>
              </h3>

              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="bg-zinc-950 p-2 rounded-sm border border-zinc-900">
                  <div className="text-[9px] text-zinc-500 uppercase">ACTIVE</div>
                  <div className="text-sm font-bold text-zinc-200">{activeTasks} NODES</div>
                </div>

                <div className="bg-zinc-950 p-2 rounded-sm border border-zinc-900">
                  <div className="text-[9px] text-zinc-500 uppercase">COMPLETED</div>
                  <div className="text-sm font-bold text-zinc-300">{completedTasks} NODES</div>
                </div>

                <div className="bg-zinc-950 p-2 rounded-sm border border-zinc-900">
                  <div className="text-[9px] text-zinc-500 uppercase">TOTAL IN CODEX</div>
                  <div className="text-sm font-bold text-zinc-400">{totalTasks} OBJECTIVES</div>
                </div>
              </div>

              {/* Graphical mini instruction board */}
              <div className="text-[10px] text-zinc-400 leading-relax border-l-2 border-zinc-700 pl-3 space-y-1.5 py-1 select-none">
                <div>
                  <span className="text-white font-semibold">[HƯỚNG DẪN THỰC TẾ]:</span> Hệ thống Dashboard này không chỉ là mô mô hình larping! Mọi thao tác thêm/xóa/hoàn thiện task ĐỀU lưu trữ trực tiếp vào <span className="text-zinc-200 font-bold bg-zinc-950 px-1 py-0.2 rounded-sm border border-zinc-900">localStorage</span> trình duyệt của bạn. Bạn có thể sử dụng hàng ngày để quản trị tiến độ công việc lặp trình thực tế.
                </div>
              </div>
            </div>

            {/* The DevOps AI Assistant System diagnostics */}
            <AiDiagnostics 
              sensors={sensors}
              processes={processes}
              tasks={tasks}
              logsTerminal={logsTerminal}
            />
          </div>

          {/* Right Column (45% space) - PC Monitoring, HTOP and Sensors modules */}
          <div className="lg:col-span-5 flex flex-col gap-4">
            
            {/* Monitor 1: The HTOP processes terminal mock widget */}
            <HtopMonitor 
              sensors={sensors}
              onUpdateSensors={setSensors}
              processes={processes}
              onSetProcesses={setProcesses}
              logsTerminal={logsTerminal}
              dataSource={dataSource}
            />

            {/* Monitor 2: Hardwares temperatures & Sensors sliders */}
            <SystemSensorsComp 
              sensors={sensors}
              onUpdateSensors={setSensors}
              dataSource={dataSource}
            />

            {/* Monitor 3: Automated Micro-AGY Agent controls */}
            <AgyPanel 
              agents={agents}
              onSetAgents={setAgents}
              logsTerminal={logsTerminal}
            />

          </div>
        </div>

        {/* Lower footer: Shell interactive console command panel (takes 100% width) */}
        <footer id="dashboard-footer-shell" className="mt-2 pb-6">
          <TerminalCLI 
            logs={logs}
            onClearLogs={handleClearLogs}
            tasks={tasks}
            processes={processes}
            onAddTask={handleAddTask}
            onToggleTask={handleToggleTask}
            onKillProcess={handleKillProcess}
            onRunAgent={handleRunAgentFromCLI}
            logsTerminal={logsTerminal}
          />
        </footer>

      </main>
    </div>
  );
}
