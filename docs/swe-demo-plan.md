# SWE demo plan: "Ask a huge codebase, watch the answer build itself"

This applies [viz-playbook.md](viz-playbook.md) to software engineering, which is how we'll demo.

## 1. The pitch in one sentence
Point it at a codebase nobody can hold in their head. Ask it something out loud, and the harness builds a **playable, interactive view** of the answer, made from the repo's real symbols. Every frame is linked to the exact line of code.

## 2. Which repo to demo on

| Candidate | Why it works | Risk |
|---|---|---|
| **facebook/react** ⭐ recommended | Every judge has wondered "how does setState update the screen?" The answer (scheduler → fiber → commit) is famously hard to follow and very visual. | Very indirect code; we need to test the questions in advance |
| redis/redis | Data structures and the event loop look great as animations | C parsing; less familiar to a web audience |
| excalidraw/excalidraw | A visual app; undo, collaboration and rendering are easy to show | Smaller, so "huge repo" is less impressive |
| prmartinow/repo-analysis-workbench | Self-referential: "how does this tool answer a question?" | Small; keep it as the backup or closing beat |

**First decision to make:** ask the backend team which languages the parser supports (the README doesn't say), and how long a React-sized index takes. **Pre-index the demo repo** either way.

## 3. SWE question types → view archetypes

The router maps every question to one of these. Each archetype is a **prebuilt primitive** that the agent fills in. This is "tier 1" from the playbook: reliable enough to demo live.

| # | Question shape | Archetype | What the user can do with it | Library (pro → fallback) | MCP data it needs |
|---|---|---|---|---|---|
| 1 | "How does X get to Y?" | **FlowTrace**: an animated path through real functions, with a packet travelling it | Play/scrub; click a node to see its code | **yFiles** hierarchic layout → React Flow + ELK.js; motion with GSAP | find-symbol, callers-of / callees, prepare-context |
| 2 | "How does this algorithm or structure work?" | **AlgoStepper**: data-structure frames (tree, list, queue, map), one frame per step | Step forward/back; edit input values | Custom renderers on **Motion** / GSAP; D3 for tree layout | symbol bodies + an agent-written frame list |
| 3 | "What states can X be in?" | **StateMachine**: a state chart you can play | Click events to fire transitions | **Stately / XState** inspector → React Flow | symbol bodies (enums, switch statements) |
| 4 | "What breaks if I change X?" | **BlastRadius**: rings of impact (direct callers, then their callers, then tests), shown as a ripple | Set the depth; filter tests vs prod code | **yFiles** radial / **Cambridge Intelligence ReGraph** → Sigma.js | callers-of (recursive), references |
| 5 | "How is this system organised?" | **ArchMap**: a zoomable map (modules → files → symbols), optionally a 3D "code city" | Zoom in semantically; a heat overlay for size or churn | yFiles grouping / **R3F** code city (CodeCharta style) | repo-overview, imports |
| 6 | "What runs concurrently / in what order?" | **Swimlane**: lanes over time (tasks, threads, scheduler priorities) | Scrub along time | Custom on **Motion**; **Perfetto UI** if real traces exist | agent-inferred from code + summaries |
| 7 | "Show me this component / API live" | **LiveSpecimen**: runs the real extracted code in a sandbox, with knobs for the inputs | Change props or arguments and watch the result | **Sandpack** (CodeSandbox) / WebContainers | symbol bodies + imports |
| 8 | "What's the data model?" | **SchemaMap**: an entity-relationship diagram | Click an entity to see where it's read and written | yFiles / React Flow | find-symbol on types/models, references |

Every archetype renders inside the **Answer Shell** (§5), so even a rough answer looks finished.

## 4. End-to-end UX flow

### Screen 1: Connect
- GitHub URL field with a GitHub icon, **Analyze** button, and a **Pick local folder** button with a folder icon.
- **Connect your agent** button with a plug icon, opening tabs for Claude Code, Claude Desktop, Cursor and VS Code (from ideation v1).

### Screen 2: Repo home (after indexing)
- **Header:** `facebook/react · 412k LOC · 18k symbols · indexed 2h ago` (illustrative numbers), plus the agent-connected pill.
- **Hero:** the ArchMap or code city flies in. This is the first wow, before anyone has spoken.
- **"Try asking"** chips generated from repo-overview, e.g. *"How does setState reach the DOM?"*, *"What breaks if I touch the scheduler?"*
- **The voice orb** sits at the bottom centre (a Rive animation: idle, listening and thinking states), with a text field as fallback.

### Screen 3: Asking, where the answer builds live (the main show)
Choreography, with each stage pushed to the UI as an event:
1. **0–1 s:** your transcribed question appears at the top. The router picks an archetype and its **empty skeleton** appears immediately (e.g. grey FlowTrace lanes).
2. **Agent ticker** (thin strip on the left): every MCP call appears as a chip with an icon and a result count, e.g. `find-symbol setState → 3`, `callers-of dispatchSetState → 12`, `prepare-context …`. This makes "the harness is working" visible.
3. **Nodes appear as the agent finds symbols.** Edges draw themselves in. The layout settles with a smooth animation, never a jump.
4. **Narration line:** a one-sentence summary types out under the title.
5. **Ready state:** a ▶ button lights up and the stepper is ready.

### Screen 4: Exploring
- Press ▶: the packet moves through FlowTrace, and the **code panel follows**, scrolling to and highlighting the current function.
- Clicking a node or a line of code selects in both directions.
- **Voice follow-ups change the current view in place instead of rebuilding it:** "slower", "go deeper into beginWork", "now show it as a tree" (switches archetype, keeps context), "what breaks if I change this?" (BlastRadius from the selected node).
- **Pin** (pin icon) saves the answer to the **Repo Atlas**.

### Screen 5: Repo Atlas
- A gallery of pinned answers that becomes **living documentation** for the repo.
- Each card can be **opened in Claude**: the same view renders as an MCP App inside the Claude window.

## 5. The Answer Shell (the one layout to perfect)
```
┌───────────────────────────────────────────────────────────────┐
│ 🎙 "How does setState reach the DOM?"     ⓘ 9 symbols · 4 files │
├────────┬──────────────────────────────────────┬───────────────┤
│ agent  │                                      │  code panel   │
│ ticker │        VIEW (any archetype)          │  (Monaco /    │
│ chips  │                                      │  Shiki, synced│
│        │                                      │  highlight)   │
├────────┴──────────────────────────────────────┴───────────────┤
│ ⏮ ▶ ⏭  ━━━━━●━━━━━━━  step 4/9: scheduleUpdateOnFiber   1×  📌 │
└───────────────────────────────────────────────────────────────┘
```
Hugeicons on every control and node type: function, class, file, module, test, mic, play, pin, plug.

## 6. The one contract we own: `ViewSpec`
The backend and MCP are someone else's job, but the shape the harness hands to the UI is ours to define. Draft:

```ts
type ViewSpec = {
  archetype: "flowTrace" | "algoStepper" | "stateMachine" | "blastRadius"
           | "archMap" | "swimlane" | "liveSpecimen" | "schemaMap";
  title: string;
  summary: string;
  nodes: { id: string; label: string; kind: "fn"|"class"|"file"|"module"|"test"|"state";
           codeRef?: { file: string; symbol: string; lines: [number, number] } }[];
  edges: { from: string; to: string; kind: "calls"|"imports"|"transition"|"impacts"; label?: string }[];
  steps?: { id: string; focus: string[]; caption: string; frame?: unknown }[];  // drives the stepper
  sources: { file: string; symbol: string }[];
};
type ViewPatch = { op: "speed"|"focus"|"expand"|"switchArchetype"|"filter"; args: unknown };
```

- The UI accepts a streamed, partial ViewSpec: nodes arrive before steps.
- **We also need one event stream from the MCP team:** the tool-call events that drive the agent ticker.
- **For the build:** we work against mocked JSON fixtures for 3–4 recorded answers, so nothing is blocked on the backend.

## 7. Demo script (3 minutes)
| Time | Beat | Wow |
|---|---|---|
| 0:00 | Paste the React URL ("indexed earlier"); the code city flies in | Scale |
| 0:25 | Say: *"How does setState actually update the screen?"* | Voice, with chips ticking |
| 0:40 | FlowTrace builds live: setState → dispatchSetState → scheduleUpdateOnFiber → … → commitRoot → DOM | It builds itself |
| 1:10 | Press ▶: the packet travels, the code panel follows line by line | Concept ↔ code link |
| 1:40 | Say: *"Show the render phase as a tree."* AlgoStepper walks the fiber tree (beginWork / completeWork) | Switching archetype by voice |
| 2:10 | Click commitRoot and say: *"What breaks if I change this?"* BlastRadius ripples out to callers and tests | Practical engineering value |
| 2:35 | Open the same answer in Claude Desktop, rendered there as an MCP App | Works with any harness (Anthropic judges) |
| 2:50 | Show the Repo Atlas: "every question becomes documentation" | Business story |

**Safety net:** 3 scripted questions are **pre-recorded** (ViewSpec fixtures plus a replay of the event stream) and play back at real speed. One question is asked **live and unscripted** to prove the system is real.

## 8. Build order (hackathon-sized)
1. **Answer Shell + stepper + synced code panel**, driven by a fixture. Everything else depends on this.
2. **FlowTrace** (the hero archetype), with a streaming build-in animation.
3. **Agent ticker + skeleton-first choreography,** played from a recorded event log.
4. **Repo home:** ArchMap or code city, "Try asking" chips, voice orb.
5. **BlastRadius + AlgoStepper** (the second and third demo beats).
6. **Voice:** Reason8 in, intent → ViewSpec/ViewPatch, with a text fallback.
7. **Live wiring:** real MCP calls replace the fixtures; package the views as an MCP App for the Claude beat.
8. **If there's time:** StateMachine, LiveSpecimen (Sandpack), Repo Atlas.

**Suggested split for three people:** (A) shell, code panel and choreography; (B) archetype renderers; (C) voice, routing, the ViewSpec fixtures and the MCP App packaging.

## 9. Stack picks
- **App:** React + Vite + Tailwind, Hugeicons (check the Pro licence for solid), Motion + GSAP for choreography.
- **Graphs:** yFiles for HTML (evaluation licence; the best hierarchical and radial layouts for call graphs). Fallback: React Flow + ELK.js.
- **Code panel:** Monaco (read-only) or Shiki with line decorations.
- **3D code city:** React Three Fiber + drei.
- **State charts:** XState + Stately inspector.
- **Sandbox:** Sandpack.
- **Orb:** Rive.

## 10. Risks and fallbacks
| Risk | Fallback |
|---|---|
| The parser doesn't support the demo repo's language | Pick the repo once the backend team has confirmed this (§2) |
| Indexing a big repo takes too long | Pre-index; the demo says "indexed earlier" |
| The LLM is slow or gives a poor graph | Show the skeleton instantly; scripted questions replay recordings; test the questions on the real repo beforehand |
| React's code is too indirect for static analysis | Curate questions whose paths resolve well; let the agent collapse helper functions into one node ("+6 helpers") |
| The Reason8 API is unknown or flaky | Text box + browser speech as a backup input |
| The yFiles licence can't be arranged | React Flow + ELK.js, same ViewSpec |
| MCP App support differs between hosts | Demo it in Claude Desktop only; our own app is the main surface |

## 11. Why judges will care
- **Anthropic:** MCP-native, works with any harness, renders inside Claude through MCP Apps.
- **Reason8:** voice is the primary way to use it, not a gimmick: you ask and refine out loud.
- **Everyone:** it solves a real pain (onboarding to a huge codebase), and the output stays useful afterwards as the Repo Atlas.
