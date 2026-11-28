# Architecture

An open-source companion/"duet" chat stack: SillyTavern as the chat UI,
swappable LLM backends (fully local or hosted API), local voice in/out, and
live web search — all running on this laptop.

## Components

```
                     ┌─────────────────────────┐
                     │   Browser (you)         │
                     │   localhost:8000         │
                     └────────────┬─────────────┘
                                  │
                     ┌────────────▼─────────────┐
                     │   SillyTavern              │
                     │   Node server · port 8000   │
                     │   chat UI, characters,      │
                     │   group chats ("duet")      │
                     └───┬─────────┬─────────┬────┘
                         │         │         │
            ┌────────────┘    ┌────┘    ┌────┘
            ▼                 ▼         ▼
   ┌────────────────┐ ┌───────────────┐ ┌──────────────────┐
   │ LLM backend     │ │ Voice          │ │ Web search        │
   │ (pick one)      │ │                │ │                    │
   │                 │ │ TTS (speak):   │ │ Tavily API         │
   │ Ollama (local)  │ │  Kokoro server │ │  api.tavily.com    │
   │  port 11434     │ │  port 8880     │ │                    │
   │   or            │ │                │ │ injects results    │
   │ Cloud API:      │ │ STT (listen):  │ │ into the prompt    │
   │  OpenRouter /    │ │  Whisper       │ │                    │
   │  NVIDIA NIM      │ │  (in-browser)  │ │                    │
   └────────────────┘ └───────────────┘ └──────────────────┘
```

### SillyTavern — chat UI (`SillyTavern/`, port 8000)
The front end: characters, personas, chat history, extensions. Talks to
whichever LLM backend is configured via an OpenAI-compatible "Chat
Completion" connection. **Group Chats** put two characters in one
conversation — the literal "duet" — where they can reply to each other as
well as to you.

### LLM backend — pick one per `.env` / `start-*.sh`
- **Local (`start-local.sh`)**: [Ollama](https://ollama.com), port 11434,
  serving a lightweight model (`llama3.2:3b` by default). Free, offline, no
  key. Larger local models already pulled on this machine (`qwen3:8b`,
  `gemma3:12b`, `qwen3:14b`) are swappable in SillyTavern's model dropdown —
  better replies, slower on CPU (see benchmark below).
- **Hosted (`start-api.sh openrouter|nvidia`)**: OpenRouter or NVIDIA NIM,
  OpenAI-compatible APIs, needs an API key in `.env`. OpenRouter also exposes
  real frontier models (e.g. `x-ai/grok-4`) if you want that specific
  personality instead of a local model.

### Voice out — Kokoro TTS (`kokoro-tts/`, port 8880)
A standalone FastAPI server (`kokoro-tts/server.py`) wrapping the open-source
[Kokoro](https://huggingface.co/hexgrad/Kokoro-82M) neural TTS model, exposed
as an OpenAI-compatible `/v1/audio/speech` endpoint. SillyTavern is wired to
it via the **OpenAI Compatible** TTS provider (Extensions → TTS).

Why a standalone server instead of SillyTavern's built-in in-browser Kokoro
option: that option loads its model through a Web Worker script
(`kokoro-worker.js`) which got stuck permanently `pending` in testing and
never initialized — a reproducible bug in this environment, not a config
issue. The standalone server sidesteps it entirely.

**Important implementation detail**: the server encodes real MP3 via
`ffmpeg`, not WAV. SillyTavern's OpenAI-compatible TTS client assumes MP3
output (matching real OpenAI's default) and labels the playback blob
`audio/mpeg` regardless of what the server's `Content-Type` header actually
says. Returning WAV bytes under that label makes Chrome silently fail to
decode it — audio plays with no error and no sound. This cost real debugging
time; don't revert `wav_to_mp3()` back to plain WAV.

### Voice in — Whisper (in-browser)
SillyTavern's official **Speech Recognition** extension, set to
`Whisper (Local)`. Runs a small Whisper model (`whisper-base.en`) client-side
via transformers.js/WASM — no server, downloads the model once, then works
offline. Chosen over the default "Browser" engine (the Web Speech API)
because it's noticeably more accurate.

### Web search — Tavily
SillyTavern's official **Web Search** extension, source = Tavily (an API
built for LLM/agent use; free tier). Injects search results into the prompt
when a message matches a trigger phrase (e.g. "what is", "who is", "how do
I"). Public SearXNG instances were tried first and rejected — every public
instance tested blocks programmatic/JSON-API access (bot-check pages or
HTTP 429), so that route doesn't actually work regardless of configuration.

## A known settings bug worth knowing about

SillyTavern's TTS extension tracks enablement with **two separate keys** in
`extension_settings.tts`: `enabled` (bound to the UI checkbox) and
`ttsEnabled` (what the actual playback-gating code checks). They can get out
of sync — the checkbox can show "on" while `ttsEnabled` is still `false`,
silently dropping every TTS job with zero errors logged anywhere. If audio
output goes silent again with no console errors, check both flags via the
browser console:
```js
SillyTavern.getContext().extensionSettings.tts.ttsEnabled // must be true
```

## Repo layout

```
.
├── setup.sh              # installs Ollama, lightweight model, Node, SillyTavern
├── start-local.sh        # runs fully offline (Ollama backend)
├── start-api.sh          # runs against OpenRouter or NVIDIA NIM
├── start-kokoro.sh       # starts the standalone Kokoro TTS server
├── benchmark.sh          # tokens/sec benchmark across local Ollama models
├── kokoro-tts/
│   ├── server.py          # OpenAI-compatible TTS server (Kokoro + ffmpeg→MP3)
│   └── venv/               # Python 3.12 virtualenv (not committed)
├── .env.example           # copy to .env — model choice, API keys
└── SillyTavern/            # cloned by setup.sh (git-ignored)
```

## Capabilities summary

| Capability | How |
|---|---|
| Chat with a persona | SillyTavern character cards |
| Two personas talking to each other (duet) | SillyTavern Group Chats |
| Fully offline operation | Ollama + local model, no internet needed |
| Swap model quality vs. speed | Change model in API Connections dropdown |
| Use a cloud/frontier model instead | `start-api.sh openrouter` / `nvidia` |
| Spoken replies | Kokoro TTS server (port 8880) |
| Talk instead of type | Whisper (Local) speech recognition |
| Answer questions about current events | Tavily web search extension |
| Long-term memory | World Info / Lorebooks + vector-based Data Bank (keyword/similarity recall, not a structured knowledge graph) |

## Benchmark (this laptop, Apple M1, 16GB RAM)

| Model | Tokens/sec | Notes |
|---|---|---|
| `llama3.2:3b` | ~25.2 | default, fastest, lightest |
| `qwen3:8b` | ~9.0 | noticeably better replies, slower |
| `gemma3:12b` | ~5.8 | |
| `qwen3:14b` | ~2.9 | heaviest, slowest on CPU |
