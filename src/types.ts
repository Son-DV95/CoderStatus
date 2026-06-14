export interface Task {
  id: string;
  title: string;
  category: 'DEV' | 'SYS' | 'CODEX' | 'AGY' | 'DOCS' | 'MISC';
  priority: 'LOW' | 'MED' | 'HIGH' | 'CRIT';
  dueDate?: string;
  completed: boolean;
  createdAt: string;
}

export interface SystemProcess {
  pid: number;
  name: string;
  cpu: number; // percentage 0-100
  ram: number; // percentage 0-100
  status: 'RUNNING' | 'SLEEPING' | 'ZOMBIE' | 'STOPPED';
  user: string;
  nice: number; // -20 to 19
  uptimeSeconds: number;
}

export interface SystemSensors {
  cpuTemp: number; // degrees Celsius
  gpuTemp: number;
  fanSpeed: number; // RPM
  powerDraw: number; // Watts
  cpuLoad: number; // overall percentage
  ramUsed: number; // GB
  ramTotal: number; // GB
  diskUsed: number; // percentage
  networkKbps: { up: number; down: number };
  swapTotal?: number;
  swapUsed?: number;
  ipAddress?: string;
}

export interface AgyAgent {
  id: string;
  name: string;
  description: string;
  status: 'idle' | 'running' | 'success' | 'error';
  progress: number; // 0 to 100
  lastExecution: string;
  logs: string[];
}

export interface TerminalLog {
  id: string;
  timestamp: string;
  text: string;
  type: 'input' | 'output' | 'error' | 'success' | 'system' | 'header';
}
