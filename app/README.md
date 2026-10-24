# Spelunk (UI prototype, mock data)

Ask a codebase a question by voice or text and watch a playable answer build, linked to the real code.
Implements the plan in `../docs/swe-demo-plan.md`. The MCP backend is not wired yet: answers are
recorded `ViewSpec` fixtures replayed at real speed.

```bash
npm install
npm run dev
```

Open http://localhost:5173. Add `?still` to the URL to skip the code-city entrance (screenshots, recordings).

## What's real and what's mocked

| Piece | State |
| --- | --- |
| Screens: connect, overview, answer, atlas | Built |
| Views: FlowTrace, AlgoStepper, BlastRadius, code city | Built, driven by `src/data` |
| Blast radius for any symbol in the sample index | Built (`blastRecording`) |
| Voice | Reson8 speech-to-text (`src/engine/reson8.ts`, needs `RESON8_API_KEY`); browser speech recognition as fallback |
| Local folder picker | Real (`showDirectoryPicker`); indexing stages are simulated |
| Agent connection | Real install snippets and deep links; "I've added it" is a manual toggle |
| Repo index, symbols, code excerpts, caller lists | Sample data in `src/data/repo.ts`, to be replaced by MCP calls |
| Question routing | Keyword router in `src/engine/router.ts`, stands in for the harness |

## Where the backend plugs in

- `src/data/types.ts`: `ViewSpec`, `ToolCall`, `Recording`, the contract with the harness.
- `src/engine/useReplay.ts`: swap the timer replay for the MCP event stream (tool calls, then nodes).
- `src/ui/ConnectAgent.tsx`: `MCP_URL`.
