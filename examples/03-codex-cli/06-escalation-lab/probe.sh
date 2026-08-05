#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd -P)"
REPO_ROOT="$(cd -- "${SCRIPT_DIR}/../../.." && pwd -P)"
RUNTIME_DIR="${SCRIPT_DIR}/.runtime"

usage() {
  printf '%s\n' \
    'Usage: probe.sh <command> [argument]' \
    '' \
    'Commands:' \
    '  inside-write                 Write .runtime/marker.txt inside the workspace.' \
    '  outside-write <absolute-file> Write one marker to an explicit external file.' \
    '  read-bytes <absolute-file>    Print only the byte count of an explicit file.' \
    '  network-head                 Send HEAD to https://example.com.' \
    '  help                         Show this help.'
}

require_absolute_file() {
  local target="${1:-}"

  if [[ -z "${target}" || "${target}" != /* ]]; then
    printf 'error: expected an absolute file path\n' >&2
    return 2
  fi

  case "${target}" in
    /|"${HOME:-}"|"${REPO_ROOT}"|"${SCRIPT_DIR}"|"${RUNTIME_DIR}")
      printf 'error: refusing broad directory target: %s\n' "${target}" >&2
      return 2
      ;;
  esac

  if [[ -d "${target}" ]]; then
    printf 'error: target is a directory, expected a file: %s\n' "${target}" >&2
    return 2
  fi
}

command_name="${1:-help}"

case "${command_name}" in
  inside-write)
    mkdir -p -- "${RUNTIME_DIR}"
    printf 'codex sandbox probe\n' > "${RUNTIME_DIR}/marker.txt"
    printf 'wrote %s\n' "${RUNTIME_DIR}/marker.txt"
    ;;
  outside-write)
    target="${2:-}"
    require_absolute_file "${target}"
    parent="$(dirname -- "${target}")"
    if [[ "$(basename -- "${parent}")" != "codex-sandbox-lab" ]]; then
      printf 'error: outside-write parent must be named codex-sandbox-lab: %s\n' "${parent}" >&2
      exit 2
    fi
    case "${target}" in
      "${REPO_ROOT}"/*)
        printf 'error: outside-write target must be outside the repository: %s\n' "${target}" >&2
        exit 2
        ;;
    esac
    if [[ ! -d "${parent}" ]]; then
      printf 'error: parent must already exist: %s\n' "${parent}" >&2
      exit 2
    fi
    parent_real="$(cd -- "${parent}" && pwd -P)"
    if [[ "$(basename -- "${parent_real}")" != "codex-sandbox-lab" ]]; then
      printf 'error: resolved parent must be a real codex-sandbox-lab directory: %s\n' "${parent_real}" >&2
      exit 2
    fi
    if [[ -e "${target}" || -L "${target}" ]]; then
      printf 'error: refusing to overwrite existing target: %s\n' "${target}" >&2
      exit 2
    fi
    printf 'codex sandbox external probe\n' > "${target}"
    printf 'wrote %s\n' "${target}"
    ;;
  read-bytes)
    target="${2:-}"
    require_absolute_file "${target}"
    if [[ ! -f "${target}" ]]; then
      printf 'error: expected an existing regular file: %s\n' "${target}" >&2
      exit 2
    fi
    byte_count="$(wc -c < "${target}")"
    printf 'read %s bytes from %s\n' "${byte_count//[[:space:]]/}" "${target}"
    ;;
  network-head)
    if ! command -v curl >/dev/null 2>&1; then
      printf 'error: curl is required for network-head\n' >&2
      exit 127
    fi
    curl --fail --silent --show-error --head --max-time 10 https://example.com
    ;;
  help|-h|--help)
    usage
    ;;
  *)
    printf 'error: unknown command: %s\n' "${command_name}" >&2
    usage >&2
    exit 2
    ;;
esac
