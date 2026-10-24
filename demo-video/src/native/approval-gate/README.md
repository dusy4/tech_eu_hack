# 12 · Approval gate

An agent is working, stops at a permission prompt, the person approves, and the agent carries on. 8 s, 1920×1080, 30 fps, loops cleanly.

| Variant | Shows |
|---|---|
| `0` dots approval | ChatGPT iOS on an iPhone, keyboard up: the person asks the dot "Blossie" for a flight; it asks before booking; tap Approve, it books and adds it to the calendar |
| `1` Claude Code permission | Claude Code CLI: the prompt is typed, the `Bash command` permission prompt opens for the test run; choose "Yes, and don't ask again", the tests run and pass |
| `2` Codex sandbox | Codex thread in the ChatGPT desktop app: `pnpm add p-retry` needs network access outside the sandbox; "Yes, proceed", Submit, it installs, tests and finishes |

Both themes (`light`, `dark`) for every variant.

## Render
```bash
npx hyperframes render . --variables '{"variant":"1","theme":"dark"}'
```
Variables: `variant` = `"0"` | `"1"` | `"2"` (default `"0"`), `theme` = `light` | `dark` (default `light`).

## CONFIG (top of the script in `index.html`)
- `duration`: 8.
- `beat`: the shared beat sheet in seconds. `enter` (object rises in), `gate` (prompt appears), `approve` (tap up / Enter / mouse up), `done` (result lands), `exit` (fade for the loop, clear by +0.35 s).
- `variants["0"]` (dots): `zoom`, `top` (phone placement), `clock`, `dot` (name), `placeholder` (composer), `user` (typed and sent; keep it to one composer line), `ask` (the dot's question), `card` (`title`, `price`, `from`, `to`, `when`, `detail`, `decline`, `approve`, `booked`, `code`), `follow` (the follow-up action pill).
- `variants["1"]` (Claude Code): `cols`, `rows`, `fontSize`, `lineHeight` (terminal size in cells), `title` (window title), `prior` (an earlier short turn: `prompt`, `answer` segments, `worked`), `prompt` (typed), `summary`, `edit` (tool name, args, result HTML), `perm` (`title`, `tip`, `desc`, `cmd`, `note`, `ask`, `options`, `pick` = the option chosen, `hint`), `bash` (tool, running text, result), `answer` (segments; `{id}` renders as an identifier), `verb` (spinner word), `mode` (footer mode label).
- `variants["2"]` (Codex): `w`, `h`, `zoom` (window size), `tab`, `model` (`name`, `effort`), `placeholder`, `user`, `secondsAtStart` (status timer), `rows` (live work rows: `at` seconds or `"gate"`, `html`; the `wait` row swaps to `after` once approved), `approval` (`q`, `why`, `cmd`, `options` with `` `code` ``, `submit`), `reply` (with `` `code` ``), `files` (title, counts, rows).

Shared assets come in through `bash tools/v2/capture.sh` (skins `chatgpt`, `device`, `claude-code`, `codex`, fonts, the KitMotion kit). See `DECISIONS.md` for what is faithful to which reference and what is extrapolated.

## Keywords
approval, permission prompt, approval request, Would you like to run the following command, human in the loop, allow, approve, confirm, consent, gate, pause, sandbox, escalation, network access, Bash command, Do you want to proceed, auto mode, accept edits, dots, ChatGPT agent, Codex, Claude Code, CLI, terminal, iPhone, booking, payment confirmation
