#!/usr/bin/env bash

set -euo pipefail

readonly app_root="${NTS_APP_ROOT:-/var/www/ninetoshine}"
readonly service_name="ninetoshine.service"
readonly health_url="http://127.0.0.1:5006/api/health/ready"

restart_service() {
  sudo /usr/bin/systemctl restart "$service_name"
}

show_service_status() {
  sudo /usr/bin/systemctl status "$service_name" --no-pager || true
}

verify_service_configuration() {
  local environment_files
  local exec_start

  exec_start="$(/usr/bin/systemctl show "$service_name" --property=ExecStart --value)"
  environment_files="$(/usr/bin/systemctl show "$service_name" --property=EnvironmentFiles --value)"

  if [[ "$exec_start" != *"$app_root/current/NineToShineApi.dll"* ]]; then
    echo "The installed service does not run the current release symlink." >&2
    return 1
  fi

  if [[ "$environment_files" != *"/etc/ninetoshine/ninetoshine.env"* ]]; then
    echo "The installed service does not use the expected environment file." >&2
    return 1
  fi
}

wait_until_ready() {
  local attempt

  for attempt in $(seq 1 30); do
    if curl --fail --silent --show-error --max-time 5 "$health_url" >/dev/null; then
      return 0
    fi

    sleep 2
  done

  return 1
}

activate_target() {
  local current_link="$app_root/current"
  local next_link="$app_root/current.next"
  local target="$1"

  if ! rm -f "$next_link"; then
    return 1
  fi

  if ! ln -s "$target" "$next_link"; then
    return 1
  fi

  if ! mv -Tf "$next_link" "$current_link"; then
    return 1
  fi
}

main() {
  local current_link="$app_root/current"
  local previous_target=""
  local release_dir
  local release_id="${1:-}"

  if [[ ! "$release_id" =~ ^[0-9a-f]{40}-[0-9]+-[0-9]+$ ]]; then
    echo "Release ID must contain a full Git SHA, run ID, and run attempt." >&2
    return 1
  fi

  release_dir="$app_root/releases/$release_id"

  if [[ ! -f "$release_dir/NineToShineApi.dll" ]]; then
    echo "Release is incomplete: NineToShineApi.dll is missing." >&2
    return 1
  fi

  if [[ -e "$release_dir/logs" && ! -L "$release_dir/logs" ]]; then
    echo "Release contains an unexpected logs directory." >&2
    return 1
  fi

  if [[ -e "$current_link" && ! -L "$current_link" ]]; then
    echo "$current_link must be a symbolic link." >&2
    return 1
  fi

  if ! verify_service_configuration; then
    return 1
  fi

  if ! rm -f "$release_dir/logs" || ! ln -s ../../logs "$release_dir/logs"; then
    echo "The persistent logs link could not be prepared." >&2
    return 1
  fi

  if [[ -L "$current_link" ]]; then
    previous_target="$(readlink "$current_link")"
  fi

  if ! activate_target "releases/$release_id"; then
    echo "The release symlink could not be activated." >&2
    return 1
  fi

  if restart_service && wait_until_ready; then
    echo "Release $release_id is ready."
    return 0
  fi

  echo "Release $release_id failed its readiness check." >&2
  show_service_status

  if [[ -z "$previous_target" ]]; then
    echo "No previous release is available for rollback." >&2
    return 1
  fi

  echo "Rolling back to $previous_target." >&2
  if ! activate_target "$previous_target"; then
    echo "The previous release symlink could not be restored." >&2
    return 1
  fi

  if ! restart_service; then
    echo "The service could not be restarted after rollback." >&2
    show_service_status
    return 1
  fi

  if wait_until_ready; then
    echo "Rollback is ready; the deployment remains failed." >&2
  else
    echo "Rollback also failed its readiness check." >&2
    show_service_status
  fi

  return 1
}

if [[ -z "${BASH_SOURCE[0]-}" ]]; then
  main "$@"
elif [[ "${BASH_SOURCE[0]}" == "$0" ]]; then
  main "$@"
fi
