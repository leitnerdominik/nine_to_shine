#!/usr/bin/env bash

set -euo pipefail

readonly script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
readonly activation_script="$script_dir/activate-release.sh"
readonly valid_release="0123456789abcdef0123456789abcdef01234567-123-1"

new_app_root() {
  local root

  root="$(mktemp -d)"
  mkdir -p "$root/releases/$valid_release" "$root/logs"
  touch "$root/releases/$valid_release/NineToShineApi.dll"
  printf '%s\n' "$root"
}

run_success_case() (
  local root

  root="$(new_app_root)"
  trap 'rm -rf "$root"' EXIT
  ln -s releases/previous "$root/current"

  NTS_APP_ROOT="$root" source "$activation_script"
  verify_service_configuration() { return 0; }
  restart_service() { return 0; }
  wait_until_ready() { return 0; }

  main "$valid_release"
  [[ "$(readlink "$root/current")" == "releases/$valid_release" ]]
  [[ "$(readlink "$root/releases/$valid_release/logs")" == "../../logs" ]]
)

run_rollback_case() (
  local readiness_attempt=0
  local restart_attempt=0
  local root

  root="$(new_app_root)"
  trap 'rm -rf "$root"' EXIT
  mkdir -p "$root/releases/previous"
  ln -s releases/previous "$root/current"

  NTS_APP_ROOT="$root" source "$activation_script"
  verify_service_configuration() { return 0; }
  restart_service() {
    restart_attempt=$((restart_attempt + 1))
    return 0
  }
  wait_until_ready() {
    readiness_attempt=$((readiness_attempt + 1))
    [[ "$readiness_attempt" -gt 1 ]]
  }
  show_service_status() { return 0; }

  if main "$valid_release"; then
    echo "A failed release unexpectedly succeeded." >&2
    return 1
  fi

  [[ "$(readlink "$root/current")" == "releases/previous" ]]
  [[ "$restart_attempt" -eq 2 ]]
)

run_initial_restart_failure_case() (
  local restart_attempt=0
  local root

  root="$(new_app_root)"
  trap 'rm -rf "$root"' EXIT
  mkdir -p "$root/releases/previous"
  ln -s releases/previous "$root/current"

  NTS_APP_ROOT="$root" source "$activation_script"
  verify_service_configuration() { return 0; }
  restart_service() {
    restart_attempt=$((restart_attempt + 1))
    [[ "$restart_attempt" -gt 1 ]]
  }
  wait_until_ready() { return 0; }
  show_service_status() { return 0; }

  if main "$valid_release"; then
    echo "A release with an initial restart failure unexpectedly succeeded." >&2
    return 1
  fi

  [[ "$(readlink "$root/current")" == "releases/previous" ]]
  [[ "$restart_attempt" -eq 2 ]]
)

run_first_deploy_failure_case() (
  local root

  root="$(new_app_root)"
  trap 'rm -rf "$root"' EXIT

  NTS_APP_ROOT="$root" source "$activation_script"
  verify_service_configuration() { return 0; }
  restart_service() { return 0; }
  wait_until_ready() { return 1; }
  show_service_status() { return 0; }

  if main "$valid_release"; then
    echo "An unhealthy first release unexpectedly succeeded." >&2
    return 1
  fi

  [[ "$(readlink "$root/current")" == "releases/$valid_release" ]]
)

run_rollback_restart_failure_case() (
  local restart_attempt=0
  local root

  root="$(new_app_root)"
  trap 'rm -rf "$root"' EXIT
  mkdir -p "$root/releases/previous"
  ln -s releases/previous "$root/current"

  NTS_APP_ROOT="$root" source "$activation_script"
  verify_service_configuration() { return 0; }
  restart_service() {
    restart_attempt=$((restart_attempt + 1))
    [[ "$restart_attempt" -eq 1 ]]
  }
  wait_until_ready() { return 1; }
  show_service_status() { return 0; }

  if main "$valid_release"; then
    echo "A release with a failed rollback restart unexpectedly succeeded." >&2
    return 1
  fi

  [[ "$(readlink "$root/current")" == "releases/previous" ]]
)

run_rollback_readiness_failure_case() (
  local root

  root="$(new_app_root)"
  trap 'rm -rf "$root"' EXIT
  mkdir -p "$root/releases/previous"
  ln -s releases/previous "$root/current"

  NTS_APP_ROOT="$root" source "$activation_script"
  verify_service_configuration() { return 0; }
  restart_service() { return 0; }
  wait_until_ready() { return 1; }
  show_service_status() { return 0; }

  if main "$valid_release"; then
    echo "An unhealthy rollback unexpectedly succeeded." >&2
    return 1
  fi

  [[ "$(readlink "$root/current")" == "releases/previous" ]]
)

run_service_preflight_failure_case() (
  local restart_attempt=0
  local root

  root="$(new_app_root)"
  trap 'rm -rf "$root"' EXIT
  mkdir -p "$root/releases/previous"
  ln -s releases/previous "$root/current"

  NTS_APP_ROOT="$root" source "$activation_script"
  verify_service_configuration() { return 1; }
  restart_service() {
    restart_attempt=$((restart_attempt + 1))
    return 1
  }
  wait_until_ready() { return 1; }
  show_service_status() { return 0; }

  if main "$valid_release"; then
    echo "A release with an invalid service configuration unexpectedly succeeded." >&2
    return 1
  fi

  [[ "$(readlink "$root/current")" == "releases/previous" ]]
  [[ "$restart_attempt" -eq 0 ]]
)

run_validation_cases() (
  local root

  root="$(new_app_root)"
  trap 'rm -rf "$root"' EXIT

  NTS_APP_ROOT="$root" source "$activation_script"
  verify_service_configuration() { return 0; }

  if main invalid-release; then
    echo "An invalid release ID unexpectedly succeeded." >&2
    return 1
  fi

  rm "$root/releases/$valid_release/NineToShineApi.dll"
  if main "$valid_release"; then
    echo "A release without its application DLL unexpectedly succeeded." >&2
    return 1
  fi
)

run_stdin_execution_case() (
  local output

  if output="$(bash -s -- invalid-release < "$activation_script" 2>&1)"; then
    echo "An invalid stdin deployment unexpectedly succeeded." >&2
    return 1
  fi

  [[ "$output" == *"Release ID must contain a full Git SHA"* ]]
  [[ "$output" != *"unbound variable"* ]]
)

run_success_case
run_rollback_case
run_initial_restart_failure_case
run_first_deploy_failure_case
run_rollback_restart_failure_case
run_rollback_readiness_failure_case
run_service_preflight_failure_case
run_validation_cases
run_stdin_execution_case

echo "Release activation tests passed."
