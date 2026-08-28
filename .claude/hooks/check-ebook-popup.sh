#!/usr/bin/env bash
# check-ebook-popup.sh
#
# PostToolUse hook (registered in .claude/settings.json, matcher "Edit|Write")
# for index.html / styles.css / script.js.
#
# Guards the "10-second free eBook popup" feature described in the course
# brief: the popup itself is real website code (HTML/CSS/JS), not something
# Claude Code's hook system can trigger in a visitor's browser — hooks only
# run during Claude Code sessions. What a hook CAN usefully do is notice if
# an edit accidentally deletes the feature, before it gets committed.
#
# Reads the hook's stdin JSON, checks it was an edit to one of the three
# site files, and if so verifies:
#   - index.html still contains id="ebookPopup"
#   - script.js  still contains "function initEbookPopup"
# Warns (does not block) if either marker is missing. No jq dependency —
# just grep/sed — so it works even before a fresh jq install is on PATH.

input=$(cat)
file=$(printf '%s' "$input" \
  | grep -o '"file_path"[[:space:]]*:[[:space:]]*"[^"]*"' \
  | head -1 \
  | sed -E 's/.*:[[:space:]]*"(.*)"/\1/')

case "$file" in
  *index.html|*styles.css|*script.js) ;;
  *) exit 0 ;;
esac

dir=$(dirname "$file")
msg=""

grep -q 'id="ebookPopup"' "$dir/index.html" 2>/dev/null \
  || msg="index.html is missing id=ebookPopup. "

grep -q 'function initEbookPopup' "$dir/script.js" 2>/dev/null \
  || msg="${msg}script.js is missing function initEbookPopup. "

if [ -n "$msg" ]; then
  printf '{"systemMessage": "eBook popup feature check failed: %sDid the 10-second popup get accidentally removed?"}\n' "$msg"
fi

exit 0
