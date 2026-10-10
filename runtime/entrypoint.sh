#!/bin/sh
set -eu
mkdir -p /data/control /data/workspace /data/home
chmod 700 /data/control
test ! -L /data/home/browser || exit 1
mkdir -p /data/home/browser /tmp/.X11-unix
chmod 1777 /tmp/.X11-unix
chown 1000:1000 /data/workspace /data/home /data/home/browser
setpriv --reuid=1000 --regid=1000 --clear-groups Xvfb :1 -screen 0 1280x800x24 -nolisten tcp &
i=0
until xdpyinfo -display :1 >/dev/null 2>&1; do i=$((i+1)); [ "$i" -lt 100 ] || exit 1; sleep 0.1; done
setpriv --reuid=1000 --regid=1000 --clear-groups env HOME=/data/home openbox &
setpriv --reuid=1000 --regid=1000 --clear-groups x11vnc -display :1 -rfbport 5900 -localhost -forever -shared -nopw -viewonly -quiet >/dev/null 2>&1 &
setpriv --reuid=1000 --regid=1000 --clear-groups x11vnc -display :1 -rfbport 5901 -localhost -forever -shared -nopw -quiet >/dev/null 2>&1 &
exec node /opt/computer-mcp/runtime/server.js
