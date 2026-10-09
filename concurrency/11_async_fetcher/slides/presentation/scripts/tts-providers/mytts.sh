# mytts provider —— 本地 Kokoro TTS 服务（OpenAI 兼容 /v1/audio/speech）。
# 服务启动：cd ~/Desktop/workspace/projects/mytts && uv run uvicorn app.main:app --port 8880
# 中文默认音色 zf_001；MYTTS_BASE_URL 可覆盖服务地址。

tts_check() {
  command -v curl >/dev/null || { echo "✗ curl not found" >&2; return 1; }
  curl -fsS --max-time 5 "${MYTTS_BASE_URL:-http://127.0.0.1:8880}/health" >/dev/null 2>&1 || {
    echo "✗ mytts service not reachable at ${MYTTS_BASE_URL:-http://127.0.0.1:8880}" >&2
    return 1
  }
}

tts_install_help() {
  cat <<'EOF' >&2
Start the local Kokoro TTS service first:
  cd ~/Desktop/workspace/projects/mytts
  uv run uvicorn app.main:app --host 127.0.0.1 --port 8880
List voices:  curl http://127.0.0.1:8880/v1/audio/voices?language=zh
Override URL: export MYTTS_BASE_URL=http://127.0.0.1:<port>
EOF
}

tts_synthesize() {
  local text="$1" out="$2" voice="${3:-zm_009}"
  local payload
  payload=$(jq -n --arg t "$text" --arg v "$voice" \
    '{input:$t, voice:$v, response_format:"mp3"}')
  curl -fsS -o "$out" -X POST \
    "${MYTTS_BASE_URL:-http://127.0.0.1:8880}/v1/audio/speech" \
    -H "Content-Type: application/json" \
    -d "$payload"
}
