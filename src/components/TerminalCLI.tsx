import React, { useState, useRef, useEffect } from 'react';
import { TerminalLog, Task, SystemProcess } from '../types';
import { Play, Sparkles, Terminal, Copy, ClipboardCheck } from 'lucide-react';
import { playTick, playBeep, playSuccessChime, playErrorBuzz } from '../utils/audio';

interface TerminalCLIProps {
  logs: TerminalLog[];
  onClearLogs: () => void;
  tasks: Task[];
  processes: SystemProcess[];
  onAddTask: (title: string, category: Task['category'], priority: Task['priority']) => void;
  onToggleTask: (id: string) => void;
  onKillProcess: (pid: number) => void;
  onRunAgent: (agentId: string) => void;
  logsTerminal: (text: string, type: TerminalLog['type']) => void;
}

export default function TerminalCLI({
  logs,
  onClearLogs,
  tasks,
  processes,
  onAddTask,
  onToggleTask,
  onKillProcess,
  onRunAgent,
  logsTerminal,
}: TerminalCLIProps) {
  const [inputVal, setInputVal] = useState('');
  const [copied, setCopied] = useState(false);
  const logContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Command input instructions overview
  const commandGuide = [
    { cmd: 'help', desc: 'Hiển thị danh sách câu lệnh điều khiển' },
    { cmd: 'todo add <tiêu đề>', desc: 'Thêm nhanh 1 mục tiêu/task công việc hằng ngày' },
    { cmd: 'todo list', desc: 'In danh sách task dưới dạng bảng ASCII cổ điển' },
    { cmd: 'todo done <ki_tu>', desc: 'Đánh dấu hoàn thành task có tên chứa kí tự' },
    { cmd: 'kill <pid>', desc: 'Kill tiến trình hệ thống trong htop theo pid' },
    { cmd: 'run <1|2|3>', desc: 'Kích hoạt Agents tự động hóa quét lỗi, dọn dẹp' },
    { cmd: 'clean', desc: 'Dọn dẹp sâu sắc hệ thống thực tế (node, vite, react, ollama)' },
    { cmd: 'report', desc: 'Gửi toàn bộ chỉ số hiện trạng hệ thống cho Gemini AI phân tích' },
    { cmd: 'sysinfo', desc: 'In trạng thái phần cứng, RAM và nhiệt độ PC' },
    { cmd: 'clear', desc: 'Dọn sạch màn hình terminal của bạn' },
  ];

  // Auto scroll terminal logs
  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [logs]);

  // Focus terminal input when clicking the console workspace container
  const handleContainerClick = () => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  // Keyboard sound
  const handleKeyDown = () => {
    playTick();
  };

  // Parse terminal command
  const handleCommandSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cmdStr = inputVal.trim();
    if (!cmdStr) return;

    // Log user input
    logsTerminal(`DEVOS_SHELL $ ${cmdStr}`, 'input');
    setInputVal('');

    const lowerCmd = cmdStr.toLowerCase();

    // 1. CLEAR command
    if (lowerCmd === 'clear' || lowerCmd === 'cls') {
      playBeep(450, 0.08);
      onClearLogs();
      return;
    }

    // 2. HELP command
    if (lowerCmd === 'help' || lowerCmd === '?') {
      playBeep(700, 0.1);
      logsTerminal('=== HƯỚNG DẪN ĐIỀU KHIỂN HỆ THỐNG DEVOS ===', 'header');
      commandGuide.forEach(it => {
        logsTerminal(`  ${it.cmd.padEnd(22, ' ')} - ${it.desc}`, 'output');
      });
      logsTerminal('Ghi chú: Bạn cũng có thể dùng chuột bấm trực tiếp lên UI!', 'system');
      return;
    }

    // 3. TODO LIST command
    if (lowerCmd === 'todo list') {
      playBeep(700, 0.1);
      if (tasks.length === 0) {
        logsTerminal('[SYSTEM]: Không có task nào trong Codex.', 'system');
        return;
      }
      logsTerminal('+---------------------------+------------+----------+-----------+', 'header');
      logsTerminal('| TÊN NHIỆM VỤ              | PHÂN LOẠI  | ĐỘ ƯU TIÊN | TRẠNG THÁI |', 'header');
      logsTerminal('+---------------------------+------------+----------+-----------+', 'header');
      tasks.forEach(t => {
        const titleTrim = t.title.length > 25 ? t.title.slice(0, 22) + '...' : t.title.padEnd(25, ' ');
        const catTrim = t.category.padEnd(10, ' ');
        const prioTrim = t.priority.padEnd(8, ' ');
        const statusTrim = t.completed ? 'COMPLETED' : 'ACTIVE   ';
        logsTerminal(`| ${titleTrim} | ${catTrim} | ${prioTrim} | ${statusTrim} |`, 'output');
      });
      logsTerminal('+---------------------------+------------+----------+-----------+', 'header');
      return;
    }

    // 4. TODO ADD command
    if (lowerCmd.startsWith('todo add ')) {
      const taskTitle = cmdStr.substring(9).trim();
      if (!taskTitle) {
        playErrorBuzz();
        logsTerminal('LỖI: Chưa nhập tên nhiệm vụ. Cú pháp: todo add <tên task>', 'error');
        return;
      }
      onAddTask(taskTitle, 'DEV', 'MED');
      playSuccessChime();
      logsTerminal(`[OK]: Thêm thành công task: "${taskTitle}"`, 'success');
      return;
    }

    // 5. TODO DONE command
    if (lowerCmd.startsWith('todo done ')) {
      const query = lowerCmd.substring(10).trim();
      if (!query) {
        playErrorBuzz();
        logsTerminal('LỖI: Chưa nhập từ khóa. Cú pháp: todo done <tập ký tự nhiệm vụ>', 'error');
        return;
      }

      // Find first matching task
      const match = tasks.find(t => !t.completed && t.title.toLowerCase().includes(query));
      if (!match) {
        playErrorBuzz();
        logsTerminal(`LỖI: Không tìm thấy task ACTIVE nào khớp với từ khóa "${query}"`, 'error');
        return;
      }

      onToggleTask(match.id);
      playSuccessChime();
      logsTerminal(`[SUCC]: Đã hoàn thành: "${match.title}"`, 'success');
      return;
    }

    // 6. KILL command
    if (lowerCmd.startsWith('kill ')) {
      const pidStr = lowerCmd.substring(5).trim();
      const pidNum = parseInt(pidStr, 10);
      if (isNaN(pidNum)) {
        playErrorBuzz();
        logsTerminal('LỖI: PID phải là số. Cú pháp: kill <pid>', 'error');
        return;
      }

      const procExists = processes.some(p => p.pid === pidNum);
      if (!procExists) {
        playErrorBuzz();
        logsTerminal(`LỖI: Không tìm thấy tiến trình nào có PID ${pidNum}`, 'error');
        return;
      }

      onKillProcess(pidNum);
      return;
    }

    // 7. RUN agent command
    if (lowerCmd.startsWith('run ')) {
      const agentNum = lowerCmd.substring(4).trim();
      if (agentNum === '1') {
        onRunAgent('agy-1');
      } else if (agentNum === '2') {
        onRunAgent('agy-2');
      } else if (agentNum === '3') {
        onRunAgent('agy-3');
      } else {
        playErrorBuzz();
        logsTerminal('LỖI: Không có Agent ID khớp. Chọn 1 (Codex), 2 (Security) hoặc 3 (Clean)', 'error');
      }
      return;
    }

    // 8. SYSINFO command
    if (lowerCmd === 'sysinfo') {
      playBeep(700, 0.1);
      logsTerminal('=== THÔNG TIN PHẦN CỨNG CLIENT HOST ===', 'header');
      logsTerminal(`  SỐ TIẾN TRÌNH ĐANG CO-RUNNING : ${processes.length}`, 'output');
      logsTerminal(`  HỆ ĐIỀU HÀNH GIẢ SẢN          : DevOS Shell Embedded v4.1`, 'output');
      logsTerminal(`  THREAD ALLOTMENT              : 4 Core / 4 Threads`, 'output');
      logsTerminal(`  GIAO THỨC CHỜ                 : I2C Internal Sensors Gateway`, 'output');
      return;
    }

    // 9. CLEAN command for DevOps
    if (lowerCmd === 'clean' || lowerCmd === 'purge') {
      playBeep(800, 0.12);
      logsTerminal('=== KHỞI CHẠY TIẾN TRÌNH PURGE DỌN DẸP SÂU ===', 'header');
      logsTerminal('Đang liên kết API /api/deep-clean, gửi tín hiệu dọn dẹp tối ưu toàn hệ thống...', 'system');
      
      fetch('/api/deep-clean', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ selectedTargets: ['node', 'vite', 'react', 'ollama', 'tmp_logs'] })
      })
      .then(r => r.json())
      .then(data => {
        if (data.success) {
          logsTerminal(`[SUCCESS]: ${data.message}`, 'success');
          logsTerminal(`-> Giải phóng: ${data.reclaimedMb} MB`, 'success');
          logsTerminal(`-> Kill vãng lai: ${data.killedThreads} luồng (threads)`, 'success');
        } else {
          logsTerminal(`[LỖI]: ${data.error}`, 'error');
        }
      })
      .catch(err => {
        logsTerminal(`[LỖI TRUYỀN TẢI]: ${err.message}`, 'error');
      });
      return;
    }

    // 10. REPORT / AI command
    if (lowerCmd === 'report' || lowerCmd === 'ai' || lowerCmd === 'ai_analyze' || lowerCmd === 'diagnose') {
      playBeep(900, 0.15);
      logsTerminal('=== KHOANH VÙNG KIỂM TRA & CHẨN ĐOÁN AI GEMINI ===', 'header');
      logsTerminal('[WAIT]: Đang trích xuất telemetry sensors gửi AI phân tích...', 'system');
      
      fetch('/api/analyze-status', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          sensors: {
            cpuTemp: 55,
            gpuTemp: 51,
            fanSpeed: 2100,
            powerDraw: 65,
            cpuLoad: 24,
            ramUsed: 4.8,
            ramTotal: 16,
            diskUsed: 36
          },
          processes,
          tasks
        })
      })
      .then(r => r.json())
      .then(data => {
        if (data.success) {
          logsTerminal('=== BÁO CÁO PHÂN TÍCH CHUYÊN GIA DEVOS AI ===', 'header');
          const lines = data.analysis.split('\n');
          lines.forEach((line: string) => {
            if (line.trim()) {
              logsTerminal(line, 'output');
            }
          });
        } else {
          logsTerminal(`[AI LỖI]: ${data.error}`, 'error');
        }
      })
      .catch(err => {
        logsTerminal(`[LỖI TRUYỀN TẢI]: ${err.message}`, 'error');
      });
      return;
    }

    // Default error
    playErrorBuzz();
    logsTerminal(`Cú pháp không xác định: "${cmdStr}". Gõ "help" hoặc "?" để xem các câu lệnh khả dụng.`, 'error');
  };

  const handleCopyLogs = () => {
    try {
      const textToCopy = logs.map(l => `[${l.timestamp}] ${l.text}`).join('\n');
      navigator.clipboard.writeText(textToCopy);
      setCopied(true);
      playBeep(900, 0.1, 0.05);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      // ignore
    }
  };

  return (
    <div 
      id="cli-terminal-main"
      onClick={handleContainerClick}
      className="bg-zinc-950 border border-zinc-800 rounded-sm p-4 font-mono shadow-md flex flex-col h-[280px] text-xs relative select-none cursor-text group"
    >
      {/* Small floating copy widget */}
      <div className="absolute top-2 right-3 flex items-center gap-2 opacity-40 group-hover:opacity-100 transition-opacity z-10">
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleCopyLogs();
          }}
          className="bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white p-1 rounded-sm border border-zinc-800 flex items-center gap-1.5 focus:outline-none cursor-pointer"
          title="Sao chép toàn bộ nhật ký"
        >
          {copied ? (
            <>
              <ClipboardCheck className="w-3.5 h-3.5 text-zinc-300 animate-bounce" />
              <span className="text-[9px]">COPIED</span>
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5" />
              <span className="text-[9px]">COPY ALL</span>
            </>
          )}
        </button>
      </div>

      <div className="flex items-center gap-2 border-b border-zinc-900 pb-2 mb-2 shrink-0">
        <Terminal className="w-3.5 h-3.5 text-zinc-400" />
        <span className="font-bold text-zinc-300 text-[11px] tracking-wide">DEVOS INTERACTIVE SHELL terminal_shell.bin</span>
        <span className="text-zinc-500 bg-zinc-900 px-1 py-0.2 rounded-sm text-[9px]">v1.0-STABLE</span>
      </div>

      {/* Terminal Display Stream */}
      <div 
        ref={logContainerRef}
        className="flex-grow overflow-y-auto space-y-1 mb-2 pr-1.5 select-text file-scroller scroll-smooth min-h-0"
      >
        {logs.map((log) => {
          let cssClass = 'text-zinc-300';
          if (log.type === 'input') cssClass = 'text-zinc-400';
          else if (log.type === 'error') cssClass = 'text-red-400 font-bold';
          else if (log.type === 'success') cssClass = 'text-zinc-100 font-bold';
          else if (log.type === 'system') cssClass = 'text-amber-500';
          else if (log.type === 'header') cssClass = 'text-zinc-200 font-bold select-none';

          return (
            <div key={log.id} className="leading-5">
              <span className="text-zinc-650 select-none mr-2.5">[{log.timestamp}]</span>
              <span className={`${cssClass} whitespace-pre-wrap font-mono`}>{log.text}</span>
            </div>
          );
        })}
      </div>

      {/* Input controller */}
      <form onSubmit={handleCommandSubmit} className="flex items-center gap-2 mt-auto border-t border-zinc-900 pt-2 shrink-0">
        <span className="text-zinc-400 font-bold tracking-wider select-none shrink-0">DEVOS_SHELL $</span>
        <input
          ref={inputRef}
          type="text"
          value={inputVal}
          onChange={(e) => setInputVal(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Nhập 'help' hoặc 'todo add My Task' và nhấn ENTER để thực thi..."
          className="bg-transparent border-none text-zinc-300 font-mono text-xs focus:outline-none focus:ring-0 flex-grow w-full placeholder-zinc-750 min-w-0"
        />
        <button
          type="submit"
          className="text-[10px] uppercase font-bold tracking-widest text-zinc-200 hover:bg-zinc-900 px-2 py-0.5 rounded-sm transition-all cursor-pointer border border-zinc-800"
        >
          EXEC
        </button>
      </form>
    </div>
  );
}
