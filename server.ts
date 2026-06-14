import express from "express";
import path from "path";
import os from "os";
import { exec } from "child_process";
import fs from "fs";
import { createServer as createViteServer } from "vite";

interface SystemProcess {
  pid: number;
  name: string;
  cpu: number;
  ram: number;
  status: string;
  user: string;
  nice: number;
  uptimeSeconds: number;
}

interface SystemSensors {
  cpuTemp: number;
  gpuTemp: number;
  fanSpeed: number;
  powerDraw: number;
  cpuLoad: number;
  ramUsed: number;
  ramTotal: number;
  diskUsed: number;
  networkKbps: { up: number; down: number };
}

// Global cached variables for simulated metrics or local machine posts
let localAgentData: {
  hostname: string;
  os: string;
  kernel: string;
  cpuCores: number;
  cpuModel: string;
  cpuLoad: number;
  ramUsed: number;
  ramTotal: number;
  diskUsed: number;
  uptime: number;
  processes: SystemProcess[];
  lastUpdate: number;
} | null = null;

// Cache directory info for background tasks
let serverUptimeSeconds = 0;
setInterval(() => {
  serverUptimeSeconds++;
}, 1000);

// Auxiliary functions to shell exec
function getOSRelease(): Promise<string> {
  return new Promise((resolve) => {
    fs.readFile("/etc/os-release", "utf8", (err, data) => {
      if (err) {
        resolve(`${os.type()} ${os.release()}`);
        return;
      }
      const match = data.match(/PRETTY_NAME="([^"]+)"/);
      if (match && match[1]) {
        resolve(match[1]);
      } else {
        resolve(`${os.type()} ${os.release()}`);
      }
    });
  });
}

function getCPUModel(): string {
  const cpus = os.cpus();
  if (cpus.length > 0) {
    return cpus[0].model.trim();
  }
  return "Unknown Processor";
}

function getRealProcesses(): Promise<SystemProcess[]> {
  return new Promise((resolve) => {
    // Only run on non-win32 platforms
    if (os.platform() === "win32") {
      resolve([]);
      return;
    }

    // Command to get columns: pid, pcpu, pmem, comm, user (skip header)
    exec("ps -eo pid,pcpu,pmem,comm,user --no-headers --sort=-pcpu", (err, stdout) => {
      if (err || !stdout) {
        resolve([]);
        return;
      }

      const lines = stdout.trim().split("\n");
      const list: SystemProcess[] = [];

      for (let i = 0; i < Math.min(lines.length, 12); i++) {
        const line = lines[i].trim();
        const parts = line.split(/\s+/);
        if (parts.length >= 5) {
          const pid = parseInt(parts[0], 10);
          const cpu = parseFloat(parts[1]);
          const ram = parseFloat(parts[2]);
          const name = parts[3];
          const user = parts[4];

          if (!isNaN(pid)) {
            list.push({
              pid,
              name: path.basename(name || "process"),
              cpu: isNaN(cpu) ? 0 : cpu,
              ram: isNaN(ram) ? 0 : ram,
              status: "RUNNING",
              user: user || "root",
              nice: 0,
              uptimeSeconds: 0, // Mocked/unknown
            });
          }
        }
      }
      resolve(list);
    });
  });
}

function getCpuTemperature(): Promise<number> {
  return new Promise((resolve) => {
    // Read standard Linux thermal file if exists
    fs.readFile("/sys/class/thermal/thermal_zone0/temp", "utf8", (err, data) => {
      if (err || !data) {
        // Fallback temperature formula based on loadavg
        const load = os.loadavg()[0];
        const calculatedTemp = Math.floor(38 + load * 4.5 + Math.random() * 2);
        resolve(calculatedTemp);
        return;
      }
      const rawTemp = parseInt(data.trim(), 10);
      if (!isNaN(rawTemp)) {
        resolve(Math.round(rawTemp / 1000));
      } else {
        resolve(42);
      }
    });
  });
}

async function startServer() {
  const app = express();
  const PORT = parseInt(process.env.PORT || "3000", 10);

  // Middleware for raw/json parsing
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // API 1. Server Environment real-time info
  app.get("/api/system-info", async (req, res) => {
    try {
      const liveProcs = await getRealProcesses();
      const loadAvg = os.loadavg();
      const cpuLoadPercent = Math.min(
        100,
        Math.round((loadAvg[0] / os.cpus().length) * 100) || 5
      );

      const totalMemGb = os.totalmem() / (1024 * 1024 * 1024);
      const freeMemGb = os.freemem() / (1024 * 1024 * 1024);
      const usedMemGb = totalMemGb - freeMemGb;

      const cpuTemp = await getCpuTemperature();
      const osPretty = await getOSRelease();

      // Mock sensible sensors based on actual metrics so they fit cleanly
      const responseSensors: SystemSensors = {
        cpuTemp,
        gpuTemp: Math.max(30, cpuTemp - 4),
        fanSpeed: cpuTemp > 65 ? 3800 : cpuTemp > 50 ? 2400 : 1620,
        powerDraw: Math.round(35 + (cpuLoadPercent * 1.8)),
        cpuLoad: cpuLoadPercent,
        ramUsed: parseFloat(usedMemGb.toFixed(2)),
        ramTotal: parseFloat(totalMemGb.toFixed(1)),
        // Retrieve dynamic mock disk or actual df if linux
        diskUsed: 36, // fallback
        networkKbps: {
          up: Math.floor(30 + Math.random() * 120),
          down: Math.floor(200 + Math.random() * 900)
        }
      };

      res.status(200).json({
        success: true,
        source: "SERVER_ENVIRONMENT",
        os: osPretty,
        kernel: os.release(),
        hostname: os.hostname(),
        uptime: os.uptime(),
        cpuCores: os.cpus().length,
        cpuModel: getCPUModel(),
        sensors: responseSensors,
        processes: liveProcs.length > 0 ? liveProcs : null, // client will merge inside if null
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // API 2. Post from custom external agent (Debian Machine)
  app.post("/api/agent-post", (req, res) => {
    const {
      hostname,
      os: clientOs,
      kernel,
      cpuCores,
      cpuModel,
      cpuLoad,
      ramUsed,
      ramTotal,
      diskUsed,
      uptime,
      processes
    } = req.body;

    if (!hostname) {
      res.status(400).json({ success: false, error: "Missing hostname" });
      return;
    }

    localAgentData = {
      hostname,
      os: clientOs || "Debian Linux",
      kernel: kernel || "Linux",
      cpuCores: cpuCores || 4,
      cpuModel: cpuModel || "Intel/AMD Processor",
      cpuLoad: cpuLoad || 10,
      ramUsed: ramUsed || 4.2,
      ramTotal: ramTotal || 16,
      diskUsed: diskUsed || 50,
      uptime: uptime || 1200,
      processes: processes || [],
      lastUpdate: Date.now()
    };

    console.log(`[AGENT] Received system update from local host: ${hostname}`);
    res.status(200).json({ success: true, message: "Stats updated successfully in background context." });
  });

  // API 3. Get static agent data
  app.get("/api/agent-data", (req, res) => {
    if (!localAgentData) {
      res.json({ active: false });
      return;
    }

    // Timeout agent data after 15 seconds of inactivity
    const isStale = Date.now() - localAgentData.lastUpdate > 15000;
    res.json({
      active: !isStale,
      staleSeconds: Math.round((Date.now() - localAgentData.lastUpdate) / 1000),
      data: localAgentData
    });
  });

  // Serve Dynamic agent shell script for user copy-paste CLI
  app.get("/agent.sh", (req, res) => {
    const forwardedHost = req.headers["x-forwarded-host"];
    const host = typeof forwardedHost === "string" ? forwardedHost : (req.get("host") || "localhost:3000");
    const proto = req.headers["x-forwarded-proto"] || (req.secure ? "https" : "http");
    const appUrl = host.startsWith("http") ? host : `${proto}://${host}`;

    const shellScript = `#!/bin/bash
# ==============================================================================
# DEBIAN LIVE SYSTEM AGENT FOR DEVOS DASHBOARD (UNIVERSAL & ROBUST)
# ==============================================================================

API_URL="${appUrl}/api/agent-post"

echo "=========================================================="
echo "Initializing DeVos Debian Monitor Agent..."
echo "Posting metrics back live to: \$API_URL"
echo "Press [Ctrl + C] to terminate agent anytime."
echo "=========================================================="

# Check for essential commands
for cmd in ps awk grep curl; do
  if ! command -v $cmd &> /dev/null; then
    echo "ERROR: Essential utility '$cmd' not found. Please install it."
    exit 1
  fi
done

while true; do
  # 1. Hostname with safe fallback
  if command -v hostname &>/dev/null; then
    HOSTNAME=$(hostname)
  else
    HOSTNAME=\${HOSTNAME:-debian-local}
  fi

  # 2. Pretty OS name
  if [ -f /etc/os-release ]; then
    OS_PRETTY=$(grep "PRETTY_NAME" /etc/os-release | cut -d= -f2 | tr -d '"')
  else
    OS_PRETTY=$(uname -s 2>/dev/null || echo "Debian GNU/Linux")
  fi

  KERNEL=$(uname -r 2>/dev/null || echo "Linux")

  # 3. CPU Cores robust count
  if command -v nproc &>/dev/null; then
    CPU_CORES=$(nproc)
  else
    CPU_CORES=$(grep -c ^processor /proc/cpuinfo 2>/dev/null || echo 1)
  fi

  # 4. CPU Model
  CPU_MODEL=""
  if [ -f /proc/cpuinfo ]; then
    CPU_MODEL=$(grep -m 1 "model name" /proc/cpuinfo | cut -d: -f2 | sed -e 's/^[ \t]*//')
  fi
  if [ -z "$CPU_MODEL" ]; then
    CPU_MODEL=$(uname -p 2>/dev/null || echo "ARM/Intel Processor")
  fi

  # 5. CPU load calculations (handling missing files gracefully)
  CPU_LOAD_PCT=5
  if [ -f /proc/loadavg ]; then
    L_AVG=$(cat /proc/loadavg | awk '{print $1}')
    CPU_LOAD_PCT=$(awk -v l="$L_AVG" -v c="$CPU_CORES" 'BEGIN {print int((l/c)*100)}')
    if [ "$CPU_LOAD_PCT" -gt 100 ]; then
       CPU_LOAD_PCT=100
    fi
    if [ "$CPU_LOAD_PCT" -lt 1 ]; then
       CPU_LOAD_PCT=1
    fi
  else
    CPU_LOAD_PCT=$(ps -A -o pcpu 2>/dev/null | awk '{s+=$1} END {print int(s)}')
    [ -z "$CPU_LOAD_PCT" ] && CPU_LOAD_PCT=10
  fi

  # 6. RAM usage from /proc/meminfo
  MEM_TOTAL_KB=16384000
  MEM_FREE_KB=8000000
  MEM_BUFF_KB=0
  MEM_CACH_KB=0
  if [ -f /proc/meminfo ]; then
    MEM_TOTAL_KB=$(grep MemTotal /proc/meminfo | awk '{print $2}')
    MEM_FREE_KB=$(grep MemFree /proc/meminfo | awk '{print $2}')
    MEM_BUFF_KB=$(grep -E 'Buffers' /proc/meminfo | awk '{print $2}')
    MEM_CACH_KB=$(grep -E '^Cached' /proc/meminfo | awk '{print $2}')
  fi
  [ -z "$MEM_TOTAL_KB" ] && MEM_TOTAL_KB=16384000
  [ -z "$MEM_FREE_KB" ] && MEM_FREE_KB=8000000
  [ -z "$MEM_BUFF_KB" ] && MEM_BUFF_KB=0
  [ -z "$MEM_CACH_KB" ] && MEM_CACH_KB=0

  MEM_USED_KB=$((MEM_TOTAL_KB - MEM_FREE_KB - MEM_BUFF_KB - MEM_CACH_KB))
  RAM_TOTAL=$(awk -v t="$MEM_TOTAL_KB" 'BEGIN {printf "%.1f", t/1048576}')
  RAM_USED=$(awk -v u="$MEM_USED_KB" 'BEGIN {printf "%.2f", u/1048576}')

  # 7. Disk percent of root partition
  if command -v df &>/dev/null; then
    DISK_PCT=$(df / | tail -n 1 | awk '{print $5}' | tr -d '%')
    [ -z "$DISK_PCT" ] && DISK_PCT=35
  else
    DISK_PCT=42
  fi

  # 8. Uptime with safe fallback
  if [ -f /proc/uptime ]; then
    UPTIME_SEC=$(cut -d. -f1 /proc/uptime)
  else
    UPTIME_SEC=3600
  fi

  # 9. Gathering system processes robustly
  # Try advanced ps, fallback to basic lists on busybox systems
  PS_OUTPUT=$(ps -eo pid,pcpu,pmem,comm,user --no-headers --sort=-pcpu 2>/dev/null | head -n 10)
  if [ -z "$PS_OUTPUT" ]; then
    PS_OUTPUT=$(ps -eo pid,pcpu,pmem,comm,user 2>/dev/null | tail -n +2 | head -n 10)
  fi
  if [ -z "$PS_OUTPUT" ]; then
    PS_OUTPUT=$(ps w 2>/dev/null | awk 'NR>1 {print $1, 0, 0, $5, $2}' | head -n 10)
  fi
  if [ -z "$PS_OUTPUT" ]; then
    PS_OUTPUT=$(ps 2>/dev/null | awk 'NR>1 {print $1, 0, 0, $4, "root"}' | head -n 10)
  fi

  # Format details directly in awk for maximum POSIX compliance and zero loop escaping bugs
  PROCESSES_JSON=$(echo "$PS_OUTPUT" | awk '
  BEGIN { first=1 }
  {
    pid=$1; cpu=$2; ram=$3; name=$4; user=$5;
    if (!pid || pid == "PID") next;
    if (!cpu) cpu=0;
    if (!ram) ram=0;
    if (!name) name="process";
    if (!user) user="root";
    gsub(/"/, "\\\"", name);
    gsub(/"/, "\\\"", user);
    
    if (!first) printf ",";
    printf "{\"pid\":%d,\"cpu\":%.1f,\"ram\":%.1f,\"name\":\"%s\",\"user\":\"%s\",\"status\":\"RUNNING\",\"nice\":0,\"uptimeSeconds\":0}", pid, cpu, ram, name, user;
    first=0;
  }
  ')

  # 10. Assemble full JSON body
  JSON_BODY="{\"hostname\":\"$HOSTNAME\",\"os\":\"$OS_PRETTY\",\"kernel\":\"$KERNEL\",\"cpuCores\":$CPU_CORES,\"cpuModel\":\"$CPU_MODEL\",\"cpuLoad\":$CPU_LOAD_PCT,\"ramUsed\":$RAM_USED,\"ramTotal\":$RAM_TOTAL,\"diskUsed\":$DISK_PCT,\"uptime\":$UPTIME_SEC,\"processes\":[$PROCESSES_JSON]}"

  # 11. Post back to app
  curl -s -X POST -H "Content-Type: application/json" -d "$JSON_BODY" "$API_URL" > /dev/null

  echo "🟢 [$(date +%T)] Posted live info to DeVos (CPU Load: \${CPU_LOAD_PCT}%, RAM used: \${RAM_USED} / \${RAM_TOTAL} GB)"
  sleep 3
done
`;

    res.contentType("text/plain");
    res.send(shellScript);
  });

  // Setup Vite middleware for dynamic Dev Server, or static server in prod
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { 
        middlewareMode: true,
        hmr: false
      },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    // SPA fallback
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server is running at http://0.0.0.0:${PORT}`);
  });
}

startServer();
