import React, { useState } from 'react';
import { SystemSensors, SystemProcess, Task } from '../types';
import { Sparkles, RefreshCw, AlertCircle, Terminal, HelpCircle, FileText, CheckCircle2 } from 'lucide-react';
import { playTick, playBeep, playSuccessChime, playErrorBuzz } from '../utils/audio';

interface AiDiagnosticsProps {
  sensors: SystemSensors;
  processes: SystemProcess[];
  tasks: Task[];
  logsTerminal: (text: string, type: 'input' | 'output' | 'error' | 'success' | 'system') => void;
}

export default function AiDiagnostics({
  sensors,
  processes,
  tasks,
  logsTerminal,
}: AiDiagnosticsProps) {
  const [analysis, setAnalysis] = useState<string>(() => {
    return localStorage.getItem('devos_ai_analysis') || '';
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const triggerAiAnalysis = async () => {
    if (isLoading) return;
    setIsLoading(true);
    setError(null);
    playBeep(900, 0.12);
    logsTerminal('[AI] Đang nạp báo cáo hiện trạng phần cứng & Codex nhiệm vụ...', 'system');

    try {
      const response = await fetch('/api/analyze-status', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          sensors,
          processes,
          tasks,
          os: "Debian GNU/Linux 12 (bookworm)",
          kernel: "Linux 6.1.0-srv-amd64",
          hostname: "devos-primary-node",
          cpuCores: 4,
          cpuModel: "Intel(R) Core(TM) i7 Cascade Lake",
          uptime: Math.round(performance.now() / 1000)
        })
      });

      const data = await response.json();
      if (data.success) {
        setAnalysis(data.analysis);
        localStorage.setItem('devos_ai_analysis', data.analysis);
        logsTerminal('[AI OK] Phân tích trạng thái DevOps thành công! Gợi ý tối ưu đã sẵn sàng.', 'success');
        playSuccessChime();
      } else {
        throw new Error(data.error || 'Server-side analyzer failed to respond.');
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message);
      logsTerminal(`[AI ERR] Thất bại khi phân tích: ${err.message}`, 'error');
      playErrorBuzz();
    } finally {
      setIsLoading(false);
    }
  };

  const clearAnalysis = () => {
    playBeep(400, 0.08);
    setAnalysis('');
    localStorage.removeItem('devos_ai_analysis');
  };

  // Human-readable parser to convert markdown text lines to beautifully styled terminal elements
  const renderOutputLines = () => {
    if (!analysis) return null;
    const lines = analysis.split('\n');
    let insideCodeBlock = false;

    return lines.map((line, idx) => {
      const trimmed = line.trim();

      // Handle Code Block wrapper
      if (trimmed.startsWith('```')) {
        insideCodeBlock = !insideCodeBlock;
        return null;
      }

      if (insideCodeBlock) {
        return (
          <div key={idx} className="bg-zinc-950 font-mono text-[10px] text-zinc-300 p-1.5 my-1 border border-zinc-900 rounded-sm overflow-x-auto select-all selection:bg-zinc-800">
            {trimmed}
          </div>
        );
      }

      // Title Header parser
      if (trimmed.startsWith('### ')) {
        return (
          <h4 key={idx} className="text-[11.5px] font-bold text-emerald-400/90 tracking-wide mt-3 mb-1.5 flex items-center gap-1.5">
            ⚡ {trimmed.replace(/^###\s+/, '')}
          </h4>
        );
      }
      if (trimmed.startsWith('## ')) {
        return (
          <h3 key={idx} className="text-xs font-black text-amber-400 uppercase tracking-widest mt-4 mb-2 pb-1.5 border-b border-zinc-800 flex items-center gap-2">
            ⚙️ {trimmed.replace(/^##\s+/, '')}
          </h3>
        );
      }
      if (trimmed.startsWith('# ')) {
        return (
          <h2 key={idx} className="text-sm font-black text-red-400 uppercase tracking-wider mt-5 mb-3 px-2 py-1 bg-red-950/20 rounded-sm border border-red-900/40">
            [ {trimmed.replace(/^#\s+/, '')} ]
          </h2>
        );
      }

      // Bullet List parser
      if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
        const cleanContent = trimmed.substring(2);
        return (
          <div key={idx} className="pl-4 text-[11px] text-zinc-300 leading-relaxed flex items-start gap-2 py-0.5">
            <span className="text-emerald-500 font-bold select-none mt-0.5 shrink-0">▪</span>
            <span>{cleanContent}</span>
          </div>
        );
      }

      // Ordered / Number steps
      if (/^\d+\.\s+/.test(trimmed)) {
        return (
          <div key={idx} className="pl-2 font-bold text-zinc-100 text-[11.5px] mt-2.5 mb-1.5">
            {trimmed}
          </div>
        );
      }

      if (!trimmed) {
        return <div key={idx} className="h-2" />;
      }

      // Bold text highlights inside line
      if (trimmed.includes('**')) {
        const parts = trimmed.split('**');
        return (
          <p key={idx} className="text-[11px] text-zinc-400 leading-relaxed mb-1">
            {parts.map((p, pIdx) => pIdx % 2 === 1 ? <strong key={pIdx} className="text-zinc-100 font-bold">{p}</strong> : p)}
          </p>
        );
      }

      return <p key={idx} className="text-[11px] text-zinc-400 leading-relaxed mb-1">{trimmed}</p>;
    });
  };

  return (
    <div id="ai-advisor-panel" className="bg-zinc-900/30 border border-zinc-800 p-4 rounded-sm font-mono flex flex-col gap-3 relative overflow-hidden">
      
      {/* Absolute faint AI backdrop */}
      <div className="absolute -right-16 -bottom-16 w-48 h-48 rounded-full bg-emerald-500/5 blur-3xl pointer-events-none select-none z-0"></div>

      <div className="flex items-center justify-between border-b border-zinc-800 pb-2 mb-1 z-10">
        <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-emerald-400 shrink-0 select-none" />
          <span>DEVSEC_AI_SYSTEM_DIAGNOSTICS</span>
        </h3>
        <span className="text-[9px] text-emerald-450/90 font-bold bg-emerald-950/10 px-1.5 py-0.5 rounded-sm border border-emerald-900/30">ONLINE</span>
      </div>

      <div className="text-[10.5px] text-zinc-400 leading-relaxed select-none">
        Kích hoạt trí tuệ nhân tạo <strong className="text-emerald-400">Gemini 3.5</strong> rà soát tổng hợp hỏa tốc liên tục các tiến trình, nhiệt độ calibrate, và mục tiêu Codex để đưa ra phân tích hiện trạng tối ưu.
      </div>

      <div className="flex gap-2 z-10">
        <button
          id="btn-trigger-ai-diagnosis"
          disabled={isLoading}
          onClick={triggerAiAnalysis}
          className="flex-grow bg-emerald-500 text-black hover:bg-emerald-400 disabled:bg-zinc-800 disabled:text-zinc-500 font-bold text-[10.5px] py-1.5 px-3 rounded-sm cursor-pointer transition-all flex items-center justify-center gap-2 uppercase tracking-wide h-8"
        >
          {isLoading ? (
            <>
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              <span>Đang thu thập & Chẩn đoán...</span>
            </>
          ) : (
            <>
              <Sparkles className="w-3.5 h-3.5" />
              <span>GỬI HIỆN TRẠNG CHO AI PHÂN TÍCH</span>
            </>
          )}
        </button>

        {analysis && (
          <button
            onClick={clearAnalysis}
            className="bg-zinc-950 border border-zinc-800 hover:bg-zinc-900 text-zinc-400 hover:text-white text-[10px] px-2.5 rounded-sm cursor-pointer transition-all"
            title="Làm mới báo cáo"
          >
            CLEAR
          </button>
        )}
      </div>

      {error && (
        <div className="bg-red-950/20 border border-red-500/20 text-red-200 text-[10px] p-2.5 rounded-sm flex items-start gap-2 animate-fadeIn">
          <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
          <div className="leading-normal">
            <span className="font-bold uppercase text-red-400">CHẨN ĐOÁN THẤT BẠI:</span> {error}
          </div>
        </div>
      )}

      {/* Report Scroll Area */}
      {analysis && !isLoading && (
        <div className="bg-zinc-950 border border-zinc-900 rounded-sm p-3 max-h-[300px] overflow-y-auto leading-relaxed font-mono select-all selection:bg-zinc-800 animate-fadeIn relative scrollbar-thin z-10">
          <div className="absolute top-2 right-3 h-3 h-3 text-[8.5px] text-zinc-650 font-bold select-none pointer-events-none">REPORT_MARKDOWN</div>
          <div className="space-y-1.5">
            {renderOutputLines()}
          </div>
        </div>
      )}

      {/* Loading simulated backdrop overlay when analyzing */}
      {isLoading && (
        <div className="bg-zinc-950/75 border border-zinc-900 rounded-sm p-4 text-center py-10 flex flex-col items-center justify-center gap-3 z-10">
          <div className="relative">
            <RefreshCw className="w-8 h-8 text-emerald-400 animate-spin" style={{ animationDuration: '2s' }} />
            <Sparkles className="w-4 h-4 text-emerald-400 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-pulse" />
          </div>
          <div className="space-y-1">
            <div className="text-[11px] font-bold text-white animate-pulse">DEVOS_ANALYSIS_STRIKE_DAEMON ACTIVE</div>
            <div className="text-[9px] text-zinc-500 font-mono tracking-widest">TRANSMITTING TELEMETRY DATA VIA SECURE SSL ENDPOINT...</div>
          </div>
        </div>
      )}
    </div>
  );
}
