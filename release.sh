#!/bin/sh
set -e

# --- Debug Log (hilft dir sofort zu sehen, was passiert) ---
DEBUG_LOG="/volume1/web/planetstar/release-debug.log"
log() { echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*" | tee -a "$DEBUG_LOG"; }

# --- Project paths ---
ROOT="/volume1/web/planetstar"
DEV="$ROOT/dev"
STABLE="$ROOT/stable"
RELEASES="$ROOT/releases"
VERSION_FILE="$ROOT/VERSION.txt"
CHANGELOG="$ROOT/CHANGELOG.md"

# Notes come from iPhone Shortcut (Home file)
HOME_NOTES="/volume1/web/planetstar/release-notes.txt"

BUMP="${1:-patch}" # patch|minor|major

now_stamp() { date "+%Y-%m-%d_%H%M"; }

ensure_files() {
  mkdir -p "$RELEASES" "$STABLE"

  [ -f "$VERSION_FILE" ] || echo "0.0.0" > "$VERSION_FILE"

  if [ ! -f "$CHANGELOG" ]; then
    echo "# Changelog – Planet Star" > "$CHANGELOG"
    echo "" >> "$CHANGELOG"
  fi

  # Ensure debug log exists
  [ -f "$DEBUG_LOG" ] || : > "$DEBUG_LOG"
}

read_version() { tr -d ' \n\r\t' < "$VERSION_FILE"; }
write_version() { echo "$1" > "$VERSION_FILE"; }

bump_version() {
  v="$1"
  major="$(echo "$v" | awk -F. '{print $1}')"
  minor="$(echo "$v" | awk -F. '{print $2}')"
  patch="$(echo "$v" | awk -F. '{print $3}')"

  case "$BUMP" in
    major) major=$((major+1)); minor=0; patch=0 ;;
    minor) minor=$((minor+1)); patch=0 ;;
    patch) patch=$((patch+1)) ;;
    *) log "ERROR: Unknown bump '$BUMP' (use patch|minor|major)"; exit 1 ;;
  esac

  echo "${major}.${minor}.${patch}"
}

sync_stable() {
  if [ ! -d "$DEV" ]; then
    log "ERROR: DEV folder not found: $DEV"
    exit 1
  fi

  log "Sync dev → stable"
  rm -rf "$STABLE"/*
  # copy top-level content from dev to stable
  find "$DEV" -mindepth 1 -maxdepth 1 ! -name "__MACOSX" -exec cp -pR {} "$STABLE"/ \;
}

append_changelog() {
  ver="$1"
  stamp="$2"

  log "Append changelog: v$ver — $stamp"
  echo "" >> "$CHANGELOG"
  echo "## v$ver — $stamp" >> "$CHANGELOG"

  if [ -f "$HOME_NOTES" ] && [ -s "$HOME_NOTES" ]; then
    log "Notes found: $HOME_NOTES (size: $(wc -c < "$HOME_NOTES") bytes)"
    while IFS= read -r line; do
      clean="$(echo "$line" | sed 's/^[ \t]*//')"
      [ -z "$clean" ] && continue
      case "$clean" in
        -\ *) echo "$clean" >> "$CHANGELOG" ;;
        *)    echo "- $clean" >> "$CHANGELOG" ;;
      esac
    done < "$HOME_NOTES"

    # clear notes only after writing
    : > "$HOME_NOTES"
    log "Notes consumed and cleared."
  else
    log "No notes found (file missing or empty)."
    echo "- (keine Release Notes angegeben)" >> "$CHANGELOG"
  fi
}

make_archive() {
  ver="$1"
  stamp="$2"
  base="PlanetStar_v${ver}_${stamp}"

  if command -v zip >/dev/null 2>&1; then
    out="$RELEASES/${base}.zip"
    log "Create zip: $out"
    (cd "$STABLE" && zip -r "$out" . -x "__MACOSX/*" "*/__MACOSX/*") >/dev/null
  else
    out="$RELEASES/${base}.tar.gz"
    log "Create tar.gz: $out"
    (cd "$STABLE" && tar --exclude="__MACOSX" -czf "$out" .)
  fi

  echo "$out"
}

# --- Run ---
ensure_files

old_ver="$(read_version)"
new_ver="$(bump_version "$old_ver")"
stamp="$(now_stamp)"

log "Release start (bump=$BUMP)"
log "ROOT=$ROOT"
log "DEV=$DEV"
log "STABLE=$STABLE"
log "CHANGELOG=$CHANGELOG"
log "HOME_NOTES=$HOME_NOTES"

write_version "$new_ver"
log "Version: $old_ver → $new_ver"

sync_stable
append_changelog "$new_ver" "$stamp"
archive_path="$(make_archive "$new_ver" "$stamp")"

log "✅ Release done: v$new_ver"
log "Archive: $archive_path"