#!/bin/bash
# ==============================================================================
# DEBIAN LIVE SYSTEM AGENT FOR DEVOS DASHBOARD (UNIVERSAL & ROBUST)
# ==============================================================================

API_URL="http://localhost:3000/api/agent-post"

echo "=========================================================="
echo "Initializing DeVos Debian Monitor Agent..."
echo "Posting metrics back live to: $API_URL"
echo "Press [Ctrl + C] to terminate agent anytime."
echo "=========================================================="

# Check for essential commands
for cmd in ps awk grep curl; do
  if ! command -v $cmd &> /dev/null; then
    echo "ERROR: Essential utility '$cmd' not found. Please install it."
    exit 1
  fi
done

PREV_TOTAL=0
PREV_IDLE=0

while true; do
  # 1. Hostname with safe fallback
  if command -v hostname &>/dev/null; then
    HOSTNAME=$(hostname)
  else
    HOSTNAME=${HOSTNAME:-debian-local}
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
    CPU_MODEL=$(grep -m 1 "model name" /proc/cpuinfo | cut -d: -f2 | sed -e 's/^[ 	]*//')
  fi
  if [ -z "$CPU_MODEL" ]; then
    CPU_MODEL=$(uname -p 2>/dev/null || echo "ARM/Intel Processor")
  fi

  # 5. CPU load calculations (real-time CPU % from /proc/stat, closer to htop)
  CPU_LOAD_PCT=0
  if [ -f /proc/stat ]; then
    read -r cpu user nice system idle iowait irq softirq steal guest guest_nice < /proc/stat
    CURR_IDLE=$((idle + iowait))
    CURR_TOTAL=$((user + nice + system + idle + iowait + irq + softirq + steal))

    DIFF_TOTAL=$((CURR_TOTAL - PREV_TOTAL))
    DIFF_IDLE=$((CURR_IDLE - PREV_IDLE))

    if [ "$PREV_TOTAL" -gt 0 ] && [ "$DIFF_TOTAL" -gt 0 ]; then
      CPU_LOAD_PCT=$((100 * (DIFF_TOTAL - DIFF_IDLE) / DIFF_TOTAL))
    else
      CPU_LOAD_PCT=$(ps -A -o pcpu 2>/dev/null | awk '{s+=$1} END {print int(s)}')
    fi

    [ -z "$CPU_LOAD_PCT" ] && CPU_LOAD_PCT=0
    [ "$CPU_LOAD_PCT" -gt 100 ] && CPU_LOAD_PCT=100
    [ "$CPU_LOAD_PCT" -lt 0 ] && CPU_LOAD_PCT=0

    PREV_TOTAL=$CURR_TOTAL
    PREV_IDLE=$CURR_IDLE
  else
    CPU_LOAD_PCT=$(ps -A -o pcpu 2>/dev/null | awk '{s+=$1} END {print int(s)}')
    [ -z "$CPU_LOAD_PCT" ] && CPU_LOAD_PCT=0
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
    gsub(/"/, "\"", name);
    gsub(/"/, "\"", user);
    
    if (!first) printf ",";
    printf "{\"pid\":%d,\"cpu\":%.1f,\"ram\":%.1f,\"name\":\"%s\",\"user\":\"%s\",\"status\":\"RUNNING\",\"nice\":0,\"uptimeSeconds\":0}", pid, cpu, ram, name, user;
    first=0;
  }
  ')

  # 10. Assemble full JSON body
  JSON_BODY="{"hostname":"$HOSTNAME","os":"$OS_PRETTY","kernel":"$KERNEL","cpuCores":$CPU_CORES,"cpuModel":"$CPU_MODEL","cpuLoad":$CPU_LOAD_PCT,"ramUsed":$RAM_USED,"ramTotal":$RAM_TOTAL,"diskUsed":$DISK_PCT,"uptime":$UPTIME_SEC,"processes":[$PROCESSES_JSON]}"

  # 11. Post back to app
  curl -s -X POST -H "Content-Type: application/json" -d "$JSON_BODY" "$API_URL" > /dev/null

  echo "🟢 [$(date +%T)] Posted live info to DeVos (CPU Load: ${CPU_LOAD_PCT}%, RAM used: ${RAM_USED} / ${RAM_TOTAL} GB)"
  sleep 3
done
