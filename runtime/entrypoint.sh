#!/bin/sh
set -eu
mkdir -p /data/control /data/workspace /data/home
chmod 700 /data/control
test ! -L /data/home/browser || exit 1
mkdir -p /data/home/browser /tmp/.X11-unix
chmod 1777 /tmp/.X11-unix
chown 1000:1000 /data/workspace /data/home /data/home/browser
# Clear owner/control credentials before changing UID. Same-UID guest processes
# can read one another's /proc environments; scrubbing only the API is too late.
guest() {
  env -i PATH=/usr/local/bin:/usr/bin:/bin HOME=/data/home DISPLAY=:1 LANG=C.UTF-8 \
    setpriv --reuid=1000 --regid=1000 --clear-groups "$@"
}
guest Xvfb :1 -screen 0 1280x800x24 -nolisten tcp &
i=0
until xdpyinfo -display :1 >/dev/null 2>&1; do i=$((i+1)); [ "$i" -lt 100 ] || exit 1; sleep 0.1; done
guest openbox --config-file /opt/computer-mcp/runtime/shell/openbox-rc.xml &
# Desktop shell: wallpaper and dock. Files/Terminal launchers stay owner-only
# through the root-owned holder file the runtime publishes (runtime/shell.js).
mkdir -p /run/computer-mcp && chmod 755 /run/computer-mcp
guest feh --no-fehbg --bg-fill /opt/computer-mcp/runtime/shell/wallpaper.png || true
guest tint2 -c /opt/computer-mcp/runtime/shell/tint2rc >/dev/null 2>&1 &
guest x11vnc -display :1 -rfbport 5900 -localhost -forever -shared -nopw -viewonly -quiet >/dev/null 2>&1 &
guest x11vnc -display :1 -rfbport 5901 -localhost -forever -shared -nopw -quiet >/dev/null 2>&1 &
COMPUTER_DESKTOP_SHELL=1 exec node /opt/computer-mcp/runtime/server.js
