import React, { useState } from 'react';
import { Task } from '../types';
import { Plus, Check, Play, Trash2, ListFilter, AlertCircle, FileCode, Cpu, ShieldAlert, BookOpen, AlertOctagon, HelpCircle } from 'lucide-react';
import { playTick, playSuccessChime, playErrorBuzz } from '../utils/audio';

interface TaskManagerProps {
  tasks: Task[];
  onAddTask: (title: string, category: Task['category'], priority: Task['priority']) => void;
  onToggleTask: (id: string) => void;
  onDeleteTask: (id: string) => void;
  logsTerminal: (text: string, type: 'input' | 'output' | 'error' | 'success' | 'system') => void;
}

export default function TaskManager({
  tasks,
  onAddTask,
  onToggleTask,
  onDeleteTask,
  logsTerminal,
}: TaskManagerProps) {
  const [newTitle, setNewTitle] = useState('');
  const [category, setCategory] = useState<Task['category']>('DEV');
  const [priority, setPriority] = useState<Task['priority']>('MED');
  const [filterCat, setFilterCat] = useState<string>('ALL');
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'ACTIVE' | 'COMPLETED'>('ALL');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) {
      playErrorBuzz();
      return;
    }
    
    onAddTask(newTitle.trim(), category, priority);
    logsTerminal(`Task created: "${newTitle.trim()}" [${category}] [PRIO: ${priority}]`, 'success');
    setNewTitle('');
    playSuccessChime();
  };

  const getCategoryIcon = (cat: Task['category']) => {
    switch (cat) {
      case 'DEV': return <FileCode className="w-3.5 h-3.5 text-zinc-400" />;
      case 'SYS': return <Cpu className="w-3.5 h-3.5 text-zinc-400" />;
      case 'CODEX': return <BookOpen className="w-3.5 h-3.5 text-zinc-400" />;
      case 'AGY': return <ShieldAlert className="w-3.5 h-3.5 text-zinc-400" />;
      case 'DOCS': return <FileCode className="w-3.5 h-3.5 text-zinc-400" />;
      default: return <HelpCircle className="w-3.5 h-3.5 text-zinc-400" />;
    }
  };

  const getPriorityBadge = (prio: Task['priority']) => {
    switch (prio) {
      case 'CRIT':
        return <span className="bg-red-500/10 text-red-400 border border-red-500/30 text-[9px] px-1.5 py-0.5 rounded-sm font-bold tracking-wider flex items-center gap-1"><AlertOctagon className="w-2.5 h-2.5" />CRIT</span>;
      case 'HIGH':
        return <span className="bg-amber-500/10 text-amber-500 border border-amber-500/30 text-[9px] px-1.5 py-0.5 rounded-sm font-bold tracking-wider flex items-center gap-1"><AlertCircle className="w-2.5 h-2.5" />HIGH</span>;
      case 'MED':
        return <span className="bg-zinc-800 text-zinc-300 border border-zinc-700 text-[9px] px-1.5 py-0.5 rounded-sm font-medium tracking-wider">MED</span>;
      default:
        return <span className="bg-zinc-900 text-zinc-500 border border-zinc-800 text-[9px] px-1.5 py-0.5 rounded-sm">LOW</span>;
    }
  };

  const filteredTasks = tasks.filter(t => {
    const matchCat = filterCat === 'ALL' || t.category === filterCat;
    const matchStatus = 
       filterStatus === 'ALL' || 
       (filterStatus === 'ACTIVE' && !t.completed) || 
       (filterStatus === 'COMPLETED' && t.completed);
    return matchCat && matchStatus;
  });

  return (
    <div id="codex-task-module" className="bg-zinc-900/30 border border-zinc-800 rounded-sm p-4 font-mono shadow-md relative overflow-hidden flex flex-col h-full">

      <div className="flex items-center justify-between mb-4 pb-2 border-b border-zinc-800">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 bg-emerald-500"></div>
          <h2 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <span>DAILY_CODEX_CONTROLLER</span>
          </h2>
        </div>
        <span className="text-[9px] text-emerald-450/90 font-bold bg-emerald-950/20 px-1.5 py-0.5 rounded-sm border border-emerald-900/40">SECURE LOCAL ACCS</span>
      </div>

      {/* Adding form */}
      <form onSubmit={handleSubmit} className="mb-4 bg-zinc-950 p-3 rounded-sm border border-zinc-800">
        <h3 className="text-[10px] text-emerald-400 mb-2 font-semibold uppercase tracking-wider">// INITIALIZE NEW OBJECTIVES:</h3>
        
        <div className="flex flex-col gap-3">
          <input
            id="task-title-input"
            type="text"
            placeholder="Mục tiêu mới... (e.g. Code auth route / config Sensors)"
            value={newTitle}
            onChange={(e) => {
              setNewTitle(e.target.value);
              playTick();
            }}
            className="w-full bg-zinc-900 border border-zinc-800 rounded-sm px-3 py-1.5 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-zinc-500 transition-colors"
          />

          <div className="flex flex-wrap gap-2 items-center justify-between">
            <div className="flex gap-2 items-center flex-wrap">
              {/* Category selector */}
              <div className="flex items-center gap-1.5">
                <span className="text-[9px] text-zinc-500">CAT:</span>
                <select
                  id="task-category-select"
                  value={category}
                  onChange={(e) => {
                    setCategory(e.target.value as Task['category']);
                    playTick();
                  }}
                  className="bg-zinc-900 border border-zinc-800 text-[10px] text-zinc-300 rounded-sm px-2 py-0.5 focus:outline-none focus:border-zinc-600 cursor-pointer"
                >
                  <option value="DEV">DEV (Phát Triển)</option>
                  <option value="SYS">SYS (Cấu Hình)</option>
                  <option value="CODEX">CODEX (Học Tập)</option>
                  <option value="AGY">AGY (Tự Động)</option>
                  <option value="DOCS">DOCS (Tài Liệu)</option>
                  <option value="MISC">MISC (Khác)</option>
                </select>
              </div>

              {/* Priority selector */}
              <div className="flex items-center gap-1.5">
                <span className="text-[9px] text-zinc-500">PRIO:</span>
                <select
                  id="task-priority-select"
                  value={priority}
                  onChange={(e) => {
                    setPriority(e.target.value as Task['priority']);
                    playTick();
                  }}
                  className="bg-zinc-900 border border-zinc-800 text-[10px] text-zinc-300 rounded-sm px-2 py-0.5 focus:outline-none focus:border-zinc-600 cursor-pointer"
                >
                  <option value="LOW">LOW</option>
                  <option value="MED">MED</option>
                  <option value="HIGH">HIGH</option>
                  <option value="CRIT">CRITICAL</option>
                </select>
              </div>
            </div>

            <button
              id="submit-task-btn"
              type="submit"
              className="flex items-center gap-1 px-3 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs rounded-sm border border-zinc-700 transition-all font-bold cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>DEPLOY</span>
            </button>
          </div>
        </div>
      </form>

      {/* Filters and Search Bar */}
      <div className="flex flex-wrap gap-2 items-center justify-between mb-3 bg-zinc-950 p-2 rounded-sm border border-zinc-800">
        <div className="flex items-center gap-1.5">
          <ListFilter className="w-3 h-3 text-zinc-400" />
          <span className="text-[10px] text-zinc-400 font-semibold uppercase tracking-wider">FILTERS:</span>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Category Filter */}
          <select
            id="filter-category-select"
            value={filterCat}
            onChange={(e) => {
              setFilterCat(e.target.value);
              playTick();
            }}
            className="bg-zinc-900 border border-zinc-800 text-[10px] text-zinc-350 rounded-sm px-1.5 py-0.5 focus:outline-none focus:border-zinc-600 cursor-pointer"
          >
            <option value="ALL">ALL CATEGORIES</option>
            <option value="DEV">DEV</option>
            <option value="SYS">SYS</option>
            <option value="CODEX">CODEX</option>
            <option value="AGY">AGY</option>
            <option value="DOCS">DOCS</option>
            <option value="MISC">MISC</option>
          </select>

          {/* Status Filter */}
          <div className="inline-flex rounded-sm p-0.5 bg-zinc-900 border border-zinc-800">
            {(['ALL', 'ACTIVE', 'COMPLETED'] as const).map((st) => (
              <button
                key={st}
                onClick={() => {
                  setFilterStatus(st);
                  playTick();
                }}
                className={`px-2 py-0.5 text-[9px] font-bold rounded-sm transition-colors cursor-pointer ${
                  filterStatus === st 
                    ? 'bg-zinc-800 text-white' 
                    : 'text-zinc-500 hover:text-zinc-350'
                }`}
              >
                {st}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Tasks List */}
      <div className="file-scroller flex-grow overflow-y-auto space-y-2 pr-1 max-h-[360px] min-h-[160px]">
        {filteredTasks.length === 0 ? (
          <div className="text-center py-8 text-zinc-550 border border-dashed border-zinc-800 rounded bg-zinc-950/20 text-xs">
            {"[SYSTEM]: No matching active operations found."}
          </div>
        ) : (
          filteredTasks.map((task) => (
            <div
              key={task.id}
              className={`flex items-center justify-between p-2.5 rounded-sm border transition-all ${
                task.completed
                  ? 'bg-zinc-900/10 border-zinc-800/45 opacity-50'
                  : 'bg-zinc-950/80 border-zinc-800 hover:border-zinc-700'
              }`}
            >
              <div className="flex items-start gap-2.5 flex-1 min-w-0">
                {/* Complete checkbox trigger */}
                <button
                  onClick={() => {
                    onToggleTask(task.id);
                    if (!task.completed) {
                      playSuccessChime();
                      logsTerminal(`Objective COMPLETE: "${task.title}"`, 'success');
                    } else {
                      playTick();
                      logsTerminal(`Reactivated target: "${task.title}"`, 'system');
                    }
                  }}
                  className={`mt-0.5 w-4 h-4 rounded-sm border flex items-center justify-center transition-all cursor-pointer ${
                    task.completed
                      ? 'bg-emerald-500/10 border-emerald-500 text-emerald-400'
                      : 'border-zinc-700 hover:border-zinc-500 bg-zinc-900'
                  }`}
                >
                  {task.completed && <Check className="w-3 h-3 stroke-[3]" />}
                </button>

                <div className="min-w-0 flex-1">
                  <p className={`text-xs select-text break-words ${
                    task.completed ? 'line-through text-zinc-600' : 'text-zinc-200'
                  }`}>
                    {task.title}
                  </p>
                  
                  <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                    <span className="flex items-center gap-1 text-[9px] bg-zinc-900 border border-zinc-800 px-1.5 py-0.5 rounded-sm text-zinc-400">
                      {getCategoryIcon(task.category)}
                      <span className="uppercase text-[8.5px] font-semibold text-zinc-400">{task.category}</span>
                    </span>

                    {getPriorityBadge(task.priority)}

                    <span className="text-[8.5px] text-zinc-500 font-mono">
                      {new Date(task.createdAt).toLocaleDateString('vi', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>
              </div>

              {/* Action delete buttons */}
              <button
                onClick={() => {
                  onDeleteTask(task.id);
                  playErrorBuzz();
                  logsTerminal(`Purged objective node ID: ${task.id.slice(0, 8)}...`, 'error');
                }}
                className="text-zinc-500 hover:text-red-400 p-1 rounded hover:bg-zinc-800 transition-colors ml-2 cursor-pointer"
                title="Purge Task"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))
        )}
      </div>

      {/* Legend / Tip */}
      <div className="mt-3 text-[9px] text-zinc-500 border-t border-zinc-800 pt-2 flex items-center justify-between">
        <span>TIP: Thử gõ <span className="bg-zinc-900 text-zinc-300 font-bold px-1 rounded-sm">todo add [tên]</span> trong CLI bên dưới</span>
        <span className="font-semibold text-zinc-600">v4.1.4_STABLE</span>
      </div>
    </div>
  );
}
