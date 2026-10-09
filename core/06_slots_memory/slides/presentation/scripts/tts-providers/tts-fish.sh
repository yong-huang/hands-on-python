# tts-fish provider —— 本机 Fish S2 Pro TTS 服务（OpenAI 兼容 /v1/audio/speech）。
# 服务启动：cd ~/Desktop/workspace/projects/mytts-fish && bash scripts/... 或
#   bash ~/.agents/skills/tts-fish/scripts/tts.sh ensure
# 默认音色 myself（克隆音色）；MYTTS_FISH_BASE_URL 可覆盖服务地址。

tts_check() {
  command -v curl >/dev/null || { echo "✗ curl not found" >&2; return 1; }
  curl -fsS --max-time 5 "${MYTTS_FISH_BASE_URL:-http://127.0.0.1:8881}/health" >/dev/null 2>&1 || {
    echo "✗ mytts-fish service not reachable at ${MYTTS_FISH_BASE_URL:-http://127.0.0.1:8881}" >&2
    return 1
  }
}

tts_install_help() {
  cat <<'EOF' >&2
Start the local Fish S2 Pro TTS service first:
  bash ~/.agents/skills/tts-fish/scripts/tts.sh ensure
List voices:  bash ~/.agents/skills/tts-fish/scripts/tts.sh voices
Override URL: export MYTTS_FISH_BASE_URL=http://127.0.0.1:<port>
EOF
}

tts_synthesize() {
  local text="$1" out="$2" voice="${3:-myself}"
  local payload
  payload=$(jq -n --arg t "$text" --arg v "$voice" \
    '{input:$t, voice:$v, response_format:"mp3"}')
  curl -fsS --max-time 300 -o "$out" -X POST \
    "${MYTTS_FISH_BASE_URL:-http://127.0.0.1:8881}/v1/audio/speech" \
    -H "Content-Type: application/json" \
    -d "$payload"
}
