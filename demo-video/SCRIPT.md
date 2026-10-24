# Spelunk demo: script

**Length** 2:11 (131.1 s) · **Format** 1920×1080, 30 fps, H.264 + AAC · **Output** `out/spelunk-full-demo.mp4`
**Composition** `SpelunkFullDemo` (`src/full/`), timeline in `src/full/timeline.ts` · **Repo shown** `rust-agent-framework`
(19 crates, 67k lines of Rust) with its real symbols: `ApprovalRequiredTool` (`crates/core/src/tool.rs:170`),
`WorkspaceContextProvider::add_tool` / `add_tool_arc`, `FunctionInvokingChatClient`, `ScopePolicy`,
`ChatClientBuilder::build`, `IChatClient`.

**Voice** ElevenLabs `eleven_v3`, voice "Eric" (premade), one take cut per beat (`scripts/voiceover.py`).
**Music** the ElevenLabs "mellow" score (`public/audio/elevenlabs-mellow-original.mp3`, 104 BPM), extended to 131 s
with two bar-aligned loops (`scripts/music-bed.py`) and ducked under the voice.

Pitch rules kept: no performance numbers for our product; "Rust in depth"; no embeddings mentioned or shown.

Native components are everestchris.com video components (HyperFrames), copied to `src/native/` with their CONFIG
edited (see `src/native/NOTICE.md`) and rendered to `public/native/`. Spelunk's own screens are Remotion scenes
built from the app's design tokens (`app/src/styles.css`).

| # | Time | Beat | Voiceover | On screen | Component |
|---|---|---|---|---|---|
| 01 | 0:00–0:14 | **The problem** | "Coding agents read code like text. Ask Claude Code who uses ApprovalRequiredTool, and it searches, opens a thousand-line file, searches again, and it's still reading." | Claude Code terminal: the question is typed; `Search("ApprovalRequiredTool")` → 35 files, `Read(invoke.rs)` → 1068 lines, `Search("requires_approval")`; a half answer, still working | **terminal-run** v0 (Claude Code, dark) → `src/native/terminal-before` |
| 02 | 0:14–0:30 | **The core** | "repo-analysis fixes this underneath the agent. It parses the codebase once into a code graph, with Rust in depth through rust-analyzer, and serves it to any agent as sixteen MCP tools." | Three panels build left to right: the 19 crates → "parse once · rust-analyzer SCIP" → code graph of the real symbols ("Rust in depth") → the 16 MCP tools | Remotion scene `CoreScene` |
| 03 | 0:30–0:44 | **The core in Claude Code** | "Same question, with the tools. find_symbol locates the struct. symbol_relations returns its exact callers, across crates. The answer comes from the graph, not from guessing." | Claude Code with `repo-analysis - find_symbol (MCP)`, `symbol_relations` (callers), `symbol_relations` on `ITool::requires_approval`; a grounded answer | **terminal-run** v0 → `src/native/terminal-mcp` |
| 04 | 0:44–0:48 | **Spelunk** | "Spelunk puts that same graph in front of the whole team." | Spelunk block wordmark, "The same graph, for the whole room." | snap-cn `BlockWordmark` (already in the project) |
| 05a | 0:48–0:58 | **Listen** | "When the room talks about code, Spelunk listens. Reson8 transcribes the conversation live, and tells the speakers apart." | Spelunk app: live transcript streams in, Maya (Speaker 1) and Tom (Speaker 2), "Live · Reson8" | Remotion scene `RoomScene` |
| 05b | 0:58–1:06 | **Extract** | "Claude Haiku reads each new sentence and grounds it in the real code, calling the same MCP tools." | Haiku panel (`claude-haiku-5-5`): `find_symbol`, `symbol_relations` (callers), `search_code`; matching nodes light up on the graph | `RoomScene` |
| 05c | 1:06–1:17 | **Propose** | "Then it acts. A change someone suggests becomes a proposal, pinned to the node it touches. A question asked in the room gets an answer, straight from the code." | Haiku's own tool calls `propose` / `answer`: a proposal card under `ApprovalRequiredTool` ("Add a reason the approver sees"), an answer card under `FunctionInvokingChatClient`, a second proposal under `ScopePolicy` | `RoomScene` |
| 05d | 1:17–1:24 | **Decide** | "Nothing moves without a yes. The team accepts one proposal, and declines the other." | Pointer: Accept on the reason proposal, Decline on the rename; "Ready for the agent · 1" | `RoomScene` |
| 05 | 1:24–1:35 | **Hand off** | "Accepted decisions become a handoff document, saved on the MCP server, where any connected coding agent can pick it up." | "Send 1 to the agent" → the handoff JSON (`POST /handoffs · 201`) → repo-analysis MCP server (`list_handoffs`, `get_handoff`, `update_handoff_status`) → Claude Code, Cursor, any MCP client | Remotion scene `HandoffScene` (handoff chain built in the app's style, with the kit's Claude Code and Cursor logos) |
| 06 | 1:35–1:42 | **The skill** | "The repo ships a Claude Code skill for exactly this: spelunk-handoff." | Claude Code › Customize › Skills: `spelunk-handoff` drops into `tech_eu_hack/.claude/skills` between `repo-analysis` and `update-ilograph`, 16 → 17 skills | **skill-install** v0 (Claude Code, light) |
| 07 | 1:42–1:56 | **Build** | "Claude Code pulls the handoff: what was decided, who said it, and where it lives in the code. It makes the change, asks before it runs the tests, and marks the handoff done." | Claude Code: previous turn shows the handoff from `get_handoff`; "Work the handoff" → `Update(crates/core/src/tool.rs)` → permission prompt for `cargo test -p rust-agent-core` → Yes → test result ok → "Marked the handoff done with update_handoff_status" | **approval-gate** v1 (Claude Code permission, dark) |
| 08 | 1:56–2:11 | **Close** | "Talk it through. Decide together. Let the agent build it. That's Spelunk." | The handoff in Spelunk flips Open → In progress → Done with Claude Code's note; then the closing card: Spelunk mark + wordmark, the three lines, and "repo-analysis: a code graph under your agent · 16 MCP tools · Rust in depth / Reson8 live transcription · Claude Haiku 5.5 · hands off to Claude Code, Cursor or any MCP client" | Remotion scene `CloseScene` |

## What is staged

- The Claude Code terminals and the skills page are scripted renders of native components, not screen recordings.
  Their symbols, files, line numbers and counts come from the real `rust-agent-framework` checkout
  (`repo_analyse/rust-agent-framework`); the code change and its test run are illustrations.
- The Spelunk room is a recreation of the app's layout and tokens, because the Haiku loop was being finished in
  `app/` while this was made. Replace it with a capture once the live loop runs (see README).
- The room conversation is shown as text only; the voiceover narrates over it.
