#!/bin/sh
exec setpriv --reuid=1000 --regid=1000 --clear-groups /opt/pw-browsers/chromium-*/chrome-linux*/chrome "$@"
