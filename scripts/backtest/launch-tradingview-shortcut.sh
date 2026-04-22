#!/usr/bin/env bash

set -euo pipefail

if [ "$#" -ne 1 ]; then
  echo "Usage: $0 <windows-shortcut-path>" >&2
  exit 1
fi

shortcut_path="$1"
escaped_path="${shortcut_path//\'/\'\'}"

powershell.exe -NoProfile -Command "Start-Process -FilePath '$escaped_path' -WindowStyle Normal"
