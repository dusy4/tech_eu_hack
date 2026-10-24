# 04 Terminal run

An agent CLI doing one real turn inside a macOS terminal window:
- the task is typed;
- Read, Edit and Bash tool calls tick by;
- the diff summary prints;
- the turn ends on a done line.

Use it whenever a video needs to show "the agent did the work in the terminal". It is 8.4 s long and loops cleanly: it starts and ends on an empty stage.

| Variant | Product | What it shows |
|---|---|---|
| `0` | Claude Code | Fullscreen renderer: `● Read` / `● Update` (+ structured patch) / `● Bash`, then `✻ Worked for 4s`. |
| `1` | Codex CLI | `• Explored` / `• Edited (+1 -1)` / `• Ran`, then `─ Worked for 3s ─`. |
| `2` | Gemini CLI | Gradient GEMINI logo, `✔ ReadFile` / `Edit` + `Shell` tool boxes, then the `✦` reply. |

Each variant has a light and a dark theme.

## Render
```bash
npx hyperframes render . --variables '{"variant":"1","theme":"dark"}'
```
Round evidence: `bash tools/v2/capture.sh library/04-terminal-run <round> 7.4` (from the repo root).

## CONFIG (top of the script in `index.html`)
| Field | What it controls |
|---|---|
| `task` | The prompt that gets typed. Shared by all variants; keep it under about 70 characters so it stays on one row. |
| `diff` | The patch, one entry per row: `n` line number, `k` (`' '` context, `'-'` removed, `'+'` added), `s` the code. `«…»` marks the changed words (word-highlighted in Claude Code). Claude Code and Gemini print every row; Codex prints only the -/+ rows. |
| `time` | The shared beat sheet in seconds: `enter`, `typeAt`, `cps`, `submit`, `read`/`edit`/`bash` as [start, done], `answer`, `done`, `push` (start of the hold push-in), `exit`, `end`, plus `row` (row-commit step) and `scroll` (scroll ease length). |
| `variants['0']` | Claude Code: title (idle/task), header line, spinner `verb`, `tokens` keys for the live counter, the `read`/`edit`/`bash` tool rows, results and Read's `hint`, `answer` segments (`{t}` text, `{id}` identifier), `done` line, footer mode text. |
| `variants['1']` | Codex: window `title`, `version`, `cwd`, `tagline`, `placeholder`, `explore` / `run` verb pairs, `exploreItem`, `edit` counts, `cmd`, `timers`, `worked`, `answer`, model `status` line. |
| `variants['2']` | Gemini: `title`, `logo` rows (80 cols; █ full, ░ shade), `tips` (`{…}` = purple bold), `context` / `mode` row, `placeholder`, loading `phrases`, `timers`, `read`/`edit`/`shell` tool rows, `answer` (`{b}` bold, `{code}`, `{t}`), `footer` (path, branch, sandbox, model, `ctx` before/after). |

Notes:
- The window is an 80 × 26 terminal (Claude Code: 23 taller rows). Long lines wrap at 80 columns. When content overflows, the transcript scrolls whole rows with a short ease, and the amount is measured at build time, so edits to CONFIG stay aligned.
- Assets come from `assets/skins/claude-code` and `assets/skins/codex` (synced by the capture script) and `assets/kit/motion/motion.js`.

## Keywords
terminal, CLI, TUI, agent, coding agent, Claude Code, Codex CLI, Gemini CLI, tool calls, Read, Edit, Update, Bash, Shell, diff, tests passing, worked for, spinner, auto mode, gpt-6-Astra, gemini-4-argon, macOS window, light, dark
