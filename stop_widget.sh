#!/usr/bin/env bash

# Stop the CoderStatus server and agent.

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$DIR"

PORT=3000

# Notify starting stop
if command -v notify-send &>/dev/null; then
    notify-send -i process-stop "Coder Status" "Đang dừng các dịch vụ chạy ngầm..."
fi

echo "Stopping CoderStatus system..."

# 1. Stop agent
AGENT_PID=$(pgrep -f "$DIR/agent.sh")
if [ -n "$AGENT_PID" ]; then
    echo "Stopping CoderStatus agent (PID: $AGENT_PID)..."
    kill $AGENT_PID
else
    echo "CoderStatus agent is not running."
fi

# 2. Stop server on port 3000
SERVER_PID=$(lsof -t -i :$PORT)
if [ -n "$SERVER_PID" ]; then
    echo "Stopping CoderStatus server on port $PORT (PID: $SERVER_PID)..."
    kill $SERVER_PID
else
    # Fallback search by process command if lsof not showing
    SERVER_PID2=$(pgrep -f "tsx server.ts")
    if [ -n "$SERVER_PID2" ]; then
        echo "Stopping CoderStatus server via command search (PID: $SERVER_PID2)..."
        kill $SERVER_PID2
    else
        echo "CoderStatus server is not running."
    fi
fi

echo "Done."

# Notify finished
if command -v notify-send &>/dev/null; then
    notify-send -i process-stop "Coder Status" "Đã dừng toàn bộ dịch vụ ngầm CoderStatus."
fi
