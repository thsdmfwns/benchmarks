#!/bin/sh
set -eu

DOTNET_TUS_URL="${DOTNET_TUS_URL:-http://bm_dotnet/files}"
DOTNET_AOT_TUS_URL="${DOTNET_AOT_TUS_URL:-http://bm_dotnet_aot:8080/files}"
GO_TUS_URL="${GO_TUS_URL:-http://bm_golang:8080/files}"
BENCHMARK_FILES_DIR="${BENCHMARK_FILES_DIR:-/files}"
BENCHMARK_FILE_100MB="${BENCHMARK_FILE_100MB:-100MB.bin}"
BENCHMARK_FILE_1GB="${BENCHMARK_FILE_1GB:-1GB.bin}"
BENCHMARK_FILE_10GB="${BENCHMARK_FILE_10GB:-10GB.bin}"
WAIT_RETRY_COUNT="${WAIT_RETRY_COUNT:-120}"
WAIT_INTERVAL_SECONDS="${WAIT_INTERVAL_SECONDS:-2}"

wait_for_http() {
  name="$1"
  url="$2"
  max_attempts="$3"
  attempt=1

  while [ "$attempt" -le "$max_attempts" ]; do
    code="$(curl -sS -o /dev/null -w "%{http_code}" "$url" || true)"
    if [ "$code" != "000" ]; then
      echo "$name is reachable at $url (status: $code)"
      return 0
    fi

    echo "Waiting for $name at $url ($attempt/$max_attempts)"
    attempt=$((attempt + 1))
    sleep "$WAIT_INTERVAL_SECONDS"
  done

  echo "Timed out waiting for $name at $url"
  return 1
}

ensure_required_file() {
  file_path="$1"
  if [ -f "$file_path" ]; then
    return 0
  fi

  echo "Missing benchmark file: $file_path"
  return 1
}

wait_for_http "bm_dotnet" "$DOTNET_TUS_URL" "$WAIT_RETRY_COUNT"
wait_for_http "bm_dotnet_aot" "$DOTNET_AOT_TUS_URL" "$WAIT_RETRY_COUNT"
wait_for_http "bm_golang" "$GO_TUS_URL" "$WAIT_RETRY_COUNT"

ensure_required_file "$BENCHMARK_FILES_DIR/$BENCHMARK_FILE_100MB"
ensure_required_file "$BENCHMARK_FILES_DIR/$BENCHMARK_FILE_1GB"
ensure_required_file "$BENCHMARK_FILES_DIR/$BENCHMARK_FILE_10GB"

if [ "$#" -gt 0 ]; then
  exec dotnet run -c Release --no-build --project BenchmarkSuite1.csproj -- "$@"
fi

if [ -n "${BENCHMARK_FILTER:-}" ]; then
  exec dotnet run -c Release --no-build --project BenchmarkSuite1.csproj -- --filter "$BENCHMARK_FILTER"
fi

exec dotnet run -c Release --no-build --project BenchmarkSuite1.csproj
