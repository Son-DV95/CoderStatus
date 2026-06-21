#!/usr/bin/env bash

# Quietly check and start the CoderStatus server and agent, then launch Google Chrome in app mode.

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$DIR"

PORT=3000

ICON_PATH="$DIR/assets/icon.jpg"

# 1. Start CoderStatus server (backend/frontend) if not already running on port 3000
if ! ss -ltn | grep -q ":$PORT "; then
    if command -v notify-send &>/dev/null; then
        notify-send -i "$ICON_PATH" "Coder Status" "Đang khởi động máy chủ CoderStatus..."
    fi
    echo "Starting CoderStatus server..."
    # Run tsx directly in the background to avoid npm wrapper signal termination
    nohup ./node_modules/.bin/tsx server.ts > server.log 2>&1 &
    disown
    
    # Wait for server to start (timeout 15 seconds)
    echo -n "Waiting for server to start on port $PORT"
    for i in {1..15}; do
        if ss -ltn | grep -q ":$PORT "; then
            echo " Server is up!"
            break
        fi
        echo -n "."
        sleep 1
    done
    
    if ! ss -ltn | grep -q ":$PORT "; then
        echo " Failed to start server. Check server.log."
        if command -v notify-send &>/dev/null; then
            notify-send -u critical -i "$ICON_PATH" "Coder Status Error" "Lỗi: Không thể khởi động máy chủ."
        fi
        exit 1
    fi
else
    echo "CoderStatus server is already running on port $PORT."
fi

# 2. Start agent.sh if not running
if ! pgrep -f "$DIR/agent.sh" > /dev/null; then
    echo "Starting CoderStatus system monitor agent..."
    nohup /bin/bash "$DIR/agent.sh" > agent.log 2>&1 &
    disown
else
    echo "CoderStatus agent is already running."
fi

# 3. Launch Chrome in app (widget) mode
echo "Opening widget..."
if command -v notify-send &>/dev/null; then
    notify-send -i "$ICON_PATH" "Coder Status" "Hệ thống đã sẵn sàng! Đang mở widget..."
fi
google-chrome --app="http://localhost:$PORT" --window-size=1200,800 "$@" &
