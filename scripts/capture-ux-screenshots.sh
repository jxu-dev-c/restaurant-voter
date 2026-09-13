#!/usr/bin/env bash
set -euo pipefail

project_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$project_dir"

for command_name in docker ego-browser curl pnpm; do
  if ! command -v "$command_name" >/dev/null 2>&1; then
    echo "Missing required command: $command_name" >&2
    exit 1
  fi
done

node_major="$(node -p 'process.versions.node.split(".")[0]')"
if [[ "$node_major" != "24" ]]; then
  echo "Node.js 24 is required; found $(node -v)." >&2
  exit 1
fi

project_id="$(sed -nE 's/^project_id[[:space:]]*=[[:space:]]*"([^"]+)"/\1/p' supabase/config.toml | head -n 1)"
if [[ ! "$project_id" =~ ^[A-Za-z0-9_-]+$ ]]; then
  echo "Unable to resolve a safe local Supabase project id." >&2
  exit 1
fi

supabase_started=0
app_pid=""
app_log="$(mktemp -t lunchpick-ux-app.XXXXXX.log)"

cleanup() {
  local exit_code=$?
  if [[ -n "$app_pid" ]] && kill -0 "$app_pid" >/dev/null 2>&1; then
    kill "$app_pid" >/dev/null 2>&1 || true
    wait "$app_pid" >/dev/null 2>&1 || true
  fi
  if [[ "$supabase_started" == "1" ]]; then
    pnpm exec supabase stop >/dev/null 2>&1 || true
  fi
  if [[ $exit_code -ne 0 && -s "$app_log" ]]; then
    echo "Application log (last 60 lines):" >&2
    tail -n 60 "$app_log" >&2
  fi
  rm -f "$app_log"
  exit "$exit_code"
}
trap cleanup EXIT INT TERM

if ! pnpm exec supabase status -o env >/dev/null 2>&1; then
  echo "Starting local Supabase..."
  pnpm exec supabase start >/dev/null
  supabase_started=1
fi

status_env="$(pnpm exec supabase status -o env 2>/dev/null)"
ux_api_url=""
ux_publishable_key=""
ux_secret_key=""
while IFS='=' read -r key value; do
  value="${value#\"}"
  value="${value%\"}"
  case "$key" in
    API_URL) ux_api_url="$value" ;;
    PUBLISHABLE_KEY) ux_publishable_key="$value" ;;
    SECRET_KEY) ux_secret_key="$value" ;;
  esac
done <<< "$status_env"

if [[ -z "$ux_api_url" || -z "$ux_publishable_key" || -z "$ux_secret_key" ]]; then
  echo "Unable to read local Supabase credentials." >&2
  exit 1
fi
if [[ "$ux_api_url" != http://127.0.0.1:* && "$ux_api_url" != http://localhost:* ]]; then
  echo "Refusing to reset a non-local Supabase project: $ux_api_url" >&2
  exit 1
fi

echo "Resetting the local Supabase database and loading UX fixtures..."
pnpm exec supabase db reset >/dev/null

export UX_SUPABASE_URL="$ux_api_url"
export UX_SUPABASE_SECRET_KEY="$ux_secret_key"
ux_sign_in_path="$(node scripts/create-ux-review-user.mjs)"

db_container="supabase_db_${project_id}"
if ! docker inspect "$db_container" >/dev/null 2>&1; then
  echo "Local Supabase database container was not found: $db_container" >&2
  exit 1
fi
docker exec -i "$db_container" psql -v ON_ERROR_STOP=1 -U postgres -d postgres \
  < supabase/ux-review-seed.sql >/dev/null

ux_port="${UX_SCREENSHOT_PORT:-3111}"
if [[ ! "$ux_port" =~ ^[0-9]+$ ]] || (( ux_port < 1024 || ux_port > 65535 )); then
  echo "UX_SCREENSHOT_PORT must be an integer between 1024 and 65535." >&2
  exit 1
fi
ux_base_url="http://127.0.0.1:${ux_port}"
ux_output_dir="${UX_SCREENSHOT_OUTPUT_DIR:-$project_dir/ux-review-screenshots-$(date +%F)}"
if [[ "$ux_output_dir" != /* ]]; then
  ux_output_dir="$project_dir/$ux_output_dir"
fi
mkdir -p "$ux_output_dir"

export NEXT_PUBLIC_APP_URL="$ux_base_url"
export NEXT_PUBLIC_SUPABASE_URL="$ux_api_url"
export NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY="$ux_publishable_key"
export SUPABASE_SECRET_KEY="$ux_secret_key"
export REFERRAL_SIGNING_SECRET="local-referral-secret-for-ux-review-2026"
export COOKIE_SIGNING_SECRET="local-cookie-secret-for-ux-review-2026!!"
export DEVICE_HASH_SECRET="local-device-secret-for-ux-review-2026!!"
export UX_SCREENSHOT_BASE_URL="$ux_base_url"
export UX_SCREENSHOT_OUTPUT_DIR="$ux_output_dir"
export UX_SCREENSHOT_SIGN_IN_PATH="$ux_sign_in_path"

echo "Building the production application..."
pnpm build >"$app_log" 2>&1
pnpm start --hostname 127.0.0.1 --port "$ux_port" >>"$app_log" 2>&1 &
app_pid=$!

for _ in {1..120}; do
  if curl --fail --silent "$ux_base_url/api/health" >/dev/null; then
    break
  fi
  if ! kill -0 "$app_pid" >/dev/null 2>&1; then
    echo "The application exited before becoming ready." >&2
    exit 1
  fi
  sleep 0.25
done
if ! curl --fail --silent "$ux_base_url/api/health" >/dev/null; then
  echo "The application did not become ready at $ux_base_url." >&2
  exit 1
fi

echo "Capturing desktop and mobile screens..."
{
  node - "$ux_base_url" "$ux_output_dir" "$ux_sign_in_path" <<'NODE'
const [baseUrl, outputDir, signInPath] = process.argv.slice(2);
for (const [name, value] of [
  ["UX_SCREENSHOT_BASE_URL", baseUrl],
  ["UX_SCREENSHOT_OUTPUT_DIR", outputDir],
  ["UX_SCREENSHOT_SIGN_IN_PATH", signInPath],
]) {
  process.stdout.write(`process.env.${name} = ${JSON.stringify(value)};\n`);
}
NODE
  sed -n '1,$p' scripts/capture-ux-screenshots.mjs
} | ego-browser nodejs

png_count="$(find "$ux_output_dir" -maxdepth 1 -type f -name '*.png' | wc -l | tr -d ' ')"
if [[ "$png_count" != "50" ]]; then
  echo "Expected 50 screenshots but found $png_count in $ux_output_dir." >&2
  exit 1
fi

echo "Created 50 verified screenshots in $ux_output_dir"
