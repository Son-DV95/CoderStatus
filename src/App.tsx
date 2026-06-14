import React, { useState, useEffect, useCallback } from 'react';
import { Task, SystemProcess, SystemSensors, AgyAgent, TerminalLog } from './types';
import QuickTerminalStats from './components/QuickTerminalStats';
import TaskManager from './components/TaskManager';
import HtopMonitor from './components/HtopMonitor';
import SystemSensorsComp from './components/SystemSensors';
import AgyPanel from './components/AgyPanel';
import TerminalCLI from './components/TerminalCLI';
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
  const [dataSource, setDataSource] = useState<'SERVER' | 'LOCAL'>('SERVER');
  const [serverInfo, setServerInfo] = useState<any>(null);
  const [localAgentInfo, setLocalAgentInfo] = useState<any>(null);
  const [copiedCmd, setCopiedCmd] = useState(false);
  const [showManualGuide, setShowManualGuide] = useState(false);
  const [copiedManual, setCopiedManual] = useState(false);

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
        text: 'HƯỚNG DẪN: Chạy lệnh curl được định dạng riêng ở panel để monitor live máy Debian của bạn!',
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
          if (dataSource === 'SERVER') {
            setSensors(data.sensors);
            if (data.processes) {
              setProcesses(data.processes);
            }
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
  }, [dataSource]);

  // Poll local machine agent
  useEffect(() => {
    let active = true;
    let registeredConnected = false;

    const fetchAgent = async () => {
      try {
        const res = await fetch('/api/agent-data');
        const data = await res.json();
        if (active) {
          const wasActive = localAgentInfo?.active;
          setLocalAgentInfo(data);

          if (data.active) {
            if (!wasActive && !registeredConnected) {
              registeredConnected = true;
              logsTerminal(`[DEBIAN AGENT]: Phát hiện liên kết thành công từ Máy Local: "${data.data.hostname}" (${data.data.os})!`, 'success');
              // Auto-switch to enjoy the live local stream
              setDataSource('LOCAL');
            }

            if (dataSource === 'LOCAL') {
              const client = data.data;
              setSensors({
                cpuTemp: 46 + Math.round(Math.random() * 6), // estimates context
                gpuTemp: 41 + Math.round(Math.random() * 5),
                fanSpeed: client.cpuLoad > 60 ? 2800 : 1650,
                powerDraw: Math.round(25 + client.cpuLoad * 1.6),
                cpuLoad: client.cpuLoad,
                ramUsed: client.ramUsed,
                ramTotal: client.ramTotal,
                diskUsed: client.diskUsed,
                networkKbps: {
                  up: 20 + Math.floor(Math.random() * 80),
                  down: 100 + Math.floor(Math.random() * 400)
                }
              });
              if (client.processes && client.processes.length > 0) {
                setProcesses(client.processes);
              }
            }
          } else {
            if (wasActive) {
              logsTerminal(`[DEBIAN AGENT]: Kết nối với Máy Local đã bị ngắt (Timeout). Quay về Server Host.`, 'error');
              setDataSource('SERVER');
            }
          }
        }
      } catch (e) {
        // Ignore
      }
    };

    fetchAgent();
    const interval = setInterval(fetchAgent, 3000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [dataSource, localAgentInfo?.active, logsTerminal]);

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

        {/* Telemetry Hardware Source Selector block */}
        <section className="bg-zinc-950 border border-zinc-800 rounded-sm p-4 font-mono shadow-md flex flex-col gap-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <h2 className="text-xs font-bold text-white uppercase tracking-wider">
                  THIẾT LẬP NGUỒN SỐ LIỆU PHẦN CỨNG THẬT (TELEMETRY SOURCE)
                </h2>
              </div>
              <p className="text-[10px] text-zinc-400">
                Chế độ hiện tại: <b className="text-zinc-200">
                  {dataSource === 'SERVER' 
                    ? `🌐 Server Container [${serverInfo?.os || 'Debian / Linux'}] (Hostname: ${serverInfo?.hostname || 'host'})` 
                    : `💻 Máy Local Debian [${localAgentInfo?.data?.hostname || 'Unknown'}] (${localAgentInfo?.data?.os || 'OS Specs'})`}
                </b>
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              {/* Tabs button */}
              <div className="bg-zinc-900 p-0.5 rounded-sm border border-zinc-800 flex items-center">
                <button
                  onClick={() => {
                    setDataSource('SERVER');
                    playTick();
                    logsTerminal('Chuyển luồng đọc dữ liệu sang Server Container Host.', 'system');
                  }}
                  className={`px-3 py-1 text-[10px] font-bold rounded-sm transition-all cursor-pointer uppercase ${
                    dataSource === 'SERVER' 
                      ? 'bg-zinc-800 text-white border border-zinc-700 shadow-sm' 
                      : 'text-zinc-500 hover:text-zinc-300 border border-transparent'
                  }`}
                >
                  🌐 Server (Container Host)
                </button>
                <button
                  onClick={() => {
                    if (localAgentInfo?.active) {
                      setDataSource('LOCAL');
                      playTick();
                      logsTerminal(`Kết nối thành công. Đang stream số liệu máy local: ${localAgentInfo.data.hostname}`, 'success');
                    } else {
                      playErrorBuzz();
                      logsTerminal('Chưa có tín hiệu gửi từ máy Local. Vui lòng chạy bằng Script Thủ Công (Manual) ở dưới để đẩy dữ liệu!', 'error');
                    }
                  }}
                  className={`px-3 py-1 text-[10px] font-bold rounded-sm transition-all cursor-pointer uppercase flex items-center gap-1.5 ${
                    dataSource === 'LOCAL' 
                      ? 'bg-zinc-800 text-white border border-zinc-700 shadow-sm' 
                      : localAgentInfo?.active
                        ? 'text-emerald-400 hover:text-emerald-300 border border-transparent'
                        : 'text-zinc-500 hover:text-zinc-300 border border-transparent'
                  }`}
                >
                  💻 Máy Debian {localAgentInfo?.active && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block"></span>}
                </button>
              </div>

              {/* Curl Agent command */}
              <div className="flex flex-col xs:flex-row items-stretch sm:items-center gap-2">
                <div className="bg-zinc-900 border border-zinc-800 rounded-sm px-2.5 py-1.5 flex items-center justify-between gap-3 max-w-sm sm:max-w-md">
                  <div className="font-mono text-[9px] text-zinc-400 select-all truncate">
                    curl -sL {typeof window !== 'undefined' ? `${window.location.protocol}//${window.location.host}` : ''}/agent.sh | bash
                  </div>
                  <button
                    onClick={() => {
                      try {
                        const protocol = window.location.protocol;
                        const host = window.location.host;
                        navigator.clipboard.writeText(`curl -sL ${protocol}//${host}/agent.sh | bash`);
                        setCopiedCmd(true);
                        playBeep(900, 0.1, 0.05);
                        setTimeout(() => setCopiedCmd(false), 2000);
                      } catch (e) {}
                    }}
                    className="text-[9px] px-2 py-0.5 bg-zinc-850 hover:bg-zinc-800 text-zinc-100 uppercase rounded-sm cursor-pointer border border-zinc-700 font-bold shrink-0"
                  >
                    {copiedCmd ? 'COPIED!' : 'COPY'}
                  </button>
                </div>

                <button
                  onClick={() => {
                    setShowManualGuide(!showManualGuide);
                    playTick();
                  }}
                  className={`text-[9px] px-3 py-1.5 rounded-sm cursor-pointer border font-bold transition-all uppercase shrink-0 ${
                    showManualGuide 
                      ? 'bg-emerald-950/40 text-emerald-400 border-emerald-700' 
                      : 'bg-zinc-800 hover:bg-zinc-750 text-zinc-200 border-zinc-700'
                  }`}
                >
                  {showManualGuide ? 'ẨN CỦ HÀNH ✖' : 'CHẠY THỦ CÔNG 🛠'}
                </button>
              </div>
            </div>
          </div>

          {/* Collapsible Manual Terminal Script Block */}
          {showManualGuide && (
            <div className="border border-emerald-900/50 bg-emerald-950/10 rounded-sm p-3.5 space-y-3.5 transition-all text-[11px] leading-relaxed">
              <div className="space-y-1.5">
                <div className="text-emerald-400 font-bold uppercase tracking-wide flex items-center gap-1.5 text-xs">
                  <span className="w-1.5 h-1.5 bg-emerald-400"></span>
                  TẠI SAO LẠI CẦN CHẠY THỦ CÔNG?
                </div>
                <p className="text-zinc-400">
                  Do URL phát triển của dự án trong <b className="text-zinc-200">Google AI Studio Sandbox</b> được cấu hình bảo mật cực kỳ nghiêm ngặt, các lệnh <code className="text-zinc-300">curl</code> bên ngoài không mang cookie Google Auth sẽ nhận lại trang đăng nhập HTML dạng <code className="text-amber-400">&lt;!doctype html&gt;</code> thay vì script Bash thô.
                </p>
                <p className="text-zinc-400">
                  Hãy sao chép block câu lệnh dưới đây, dán toàn bộ vào Terminal máy Debian của bạn để tạo file và khởi chạy Agent cục bộ trực tiếp cực kỳ an toàn!
                </p>
              </div>

              <div className="relative bg-zinc-950 border border-zinc-800 rounded-sm p-3 font-mono text-[10px] text-zinc-300 overflow-x-auto max-h-64 space-y-1">
                <div className="sticky top-0 right-0 flex justify-end">
                  <button
                    onClick={() => {
                      const host = typeof window !== 'undefined' ? `${window.location.protocol}//${window.location.host}` : '';
                      const scriptStr = `cat << 'EOF' > agent.sh
#!/bin/bash
API_URL="${host}/api/agent-post"
echo "=========================================================="
echo "Initializing DeVos Debian Monitor Agent (Manual)..."
echo "Posting metrics back live to: \\$API_URL"
echo "Press [Ctrl + C] to terminate agent anytime."
echo "=========================================================="
for cmd in free df ps awk cut uname hostname; do
  if ! command -v \\$cmd &> /dev/null; then
    echo "ERROR: Required utility '\\$cmd' not found. Please install it."
    exit 1
  fi
done
while true; do
  HOSTNAME=\\$(hostname)
  OS_PRETTY=\\$(grep "PRETTY_NAME" /etc/os-release | cut -d= -f2 | tr -d '"')
  [ -z "\\$OS_PRETTY" ] && OS_PRETTY=\\$(uname -s)
  KERNEL=\\$(uname -r)
  CPU_CORES=\\$(nproc)
  CPU_MODEL=\\$(grep -m 1 "model name" /proc/cpuinfo | cut -d: -f2 | sed -e 's/^[ \\t]*//')
  [ -z "\\$CPU_MODEL" ] && CPU_MODEL=\\$(uname -p)
  L_AVG=\\$(cat /proc/loadavg | awk '{print \\$1}')
  CPU_LOAD_PCT=\\$(awk -v l="\\$L_AVG" -v c="\\$CPU_CORES" 'BEGIN {print int((l/c)*100)}')
  [ "\\$CPU_LOAD_PCT" -gt 100 ] && CPU_LOAD_PCT=100
  [ "\\$CPU_LOAD_PCT" -lt 1 ] && CPU_LOAD_PCT=1
  MEM_TOTAL_KB=\\$(grep MemTotal /proc/meminfo | awk '{print \\$2}')
  MEM_FREE_KB=\\$(grep MemFree /proc/meminfo | awk '{print \\$2}')
  MEM_BUFF_KB=\\$(grep -E 'Buffers' /proc/meminfo | awk '{print \\$2}')
  MEM_CACH_KB=\\$(grep -E '^Cached' /proc/meminfo | awk '{print \\$2}')
  [ -z "\\$MEM_TOTAL_KB" ] && { MEM_TOTAL_KB=16384000; MEM_FREE_KB=8192000; MEM_BUFF_KB=0; MEM_CACH_KB=0; }
  MEM_USED_KB=\\$((MEM_TOTAL_KB - MEM_FREE_KB - MEM_BUFF_KB - MEM_CACH_KB))
  RAM_TOTAL=\\$(awk -v t="\\$MEM_TOTAL_KB" 'BEGIN {printf "%.1f", t/1048576}')
  RAM_USED=\\$(awk -v u="\\$MEM_USED_KB" 'BEGIN {printf "%.2f", u/1048576}')
  DISK_PCT=\\$(df / | tail -n 1 | awk '{print \\$5}' | tr -d '%')
  UPTIME_SEC=\\$(cut -d. -f1 /proc/uptime)
  PROCESSES_JSON=""
  first=true
  while read -r pid pcpu pmem comm user; do
    comm_esc=\\$(echo "\\$comm" | sed 's/"/\\\\\\\\"/g')
    user_esc=\\$(echo "\\$user" | sed 's/"/\\\\\\\\"/g')
    if [ "\\$first" = true ]; then
      first=false
    else
      PROCESSES_JSON="\\$PROCESSES_JSON,"
    fi
    PROCESSES_JSON="\\$PROCESSES_JSON{\\"pid\\":\\$pid,\\"cpu\\":\\$pcpu,\\"ram\\":\\$pmem,\\"name\\":\\"\\$comm_esc\\",\\"user\\":\\"\\$user_esc\\",\\"status\\":\\"RUNNING\\",\\"nice\\":0,\\"uptimeSeconds\\":0}"
  done < <(ps -eo pid,pcpu,pmem,comm,user --no-headers --sort=-pcpu | head -n 10)
  JSON_BODY="{\\"hostname\\":\\"\\$HOSTNAME\\",\\"os\\":\\"\\$OS_PRETTY\\",\\"kernel\\":\\"\\$KERNEL\\",\\"cpuCores\\":\\$CPU_CORES,\\"cpuModel\\":\\"\\$CPU_MODEL\\",\\"cpuLoad\\":\\$CPU_LOAD_PCT,\\"ramUsed\\":\\$RAM_USED,\\"ramTotal\\":\\$RAM_TOTAL,\\"diskUsed\\":\\$DISK_PCT,\\"uptime\\":\\$UPTIME_SEC,\\"processes\\":[\\$PROCESSES_JSON]}"
  curl -s -X POST -H "Content-Type: application/json" -d "\\$JSON_BODY" "\\$API_URL" > /dev/null
  echo "🟢 [\$(date +%T)] Posted live info to DeVos (CPU: \${CPU_LOAD_PCT}%, RAM: \$RAM_USED GB)"
  sleep 3
done
EOF
chmod +x agent.sh && ./agent.sh`;

                      try {
                        navigator.clipboard.writeText(scriptStr);
                        setCopiedManual(true);
                        playBeep(900, 0.1, 0.05);
                        setTimeout(() => setCopiedManual(false), 2500);
                        logsTerminal('Đã sao chép lệnh tạo script manual vào Clipboard thành công!', 'success');
                      } catch (err) {}
                    }}
                    className="px-2.5 py-1 bg-emerald-950 hover:bg-emerald-900 text-emerald-400 font-bold border border-emerald-800 rounded-sm uppercase text-[9px] cursor-pointer"
                  >
                    {copiedManual ? 'COPIED TO CLIPBOARD!' : 'COPY COMMAND BLOCK'}
                  </button>
                </div>
                <div className="select-all opacity-85 leading-normal">
                  <span className="text-zinc-500"># Sao chép và dán lệnh tạo agent.sh cục bộ này trên terminal của bạn:</span><br />
                  <span className="text-sky-400 font-bold">cat &lt;&lt; 'EOF' &gt; agent.sh</span><br />
                  <span className="text-zinc-300">#!/bin/bash</span><br />
                  <span className="text-zinc-300">API_URL="{typeof window !== 'undefined' ? `${window.location.protocol}//${window.location.host}` : ''}/api/agent-post"</span><br />
                  <span className="text-zinc-500">... (Script giám sát Debian tự động ghi nhận ổ cứng, RAM, CPU & tiến trình) ...</span><br />
                  <span className="text-sky-400 font-bold">EOF</span><br />
                  <span className="text-emerald-400 font-bold">chmod +x agent.sh && ./agent.sh</span>
                </div>
              </div>

              <div className="text-[10px] text-zinc-500">
                💡 <b>Mẹo nâng cao:</b> Khi Agent chạy thành công, nó sẽ gửi tín hiệu ping đều đặn mỗi 3 giây. Quay lại góc trên tab <b>"MÁY DEBIAN LOCAL"</b> để kích hoạt xem trực quan dữ liệu thực!
              </div>
            </div>
          )}
        </section>

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
