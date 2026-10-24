# Ideation A v2: Ask the codebase, watch it build the answer

> **Background only.** This is the early, domain-agnostic brainstorm. The plan we're building is [swe-demo-plan.md](swe-demo-plan.md); the overview is the [README](../README.md).

## The wow loop

1. **You ask the codebase out loud** (through Reason8): *"How does this repo do protein translation?"*
2. **The harness queries the MCP** (symbols, call graph, docs) to understand what the code actually does.
3. **The harness builds a live, interactive UI** that *is* the answer. It's not a diagram of the code: it's a working emulation of the concept, such as a ribosome moving along mRNA and adding amino acids.
4. **Every visual step is linked to real code.** Clicking the "tRNA binds" step highlights `bind_trna()` in `src/translation.py`. You see the concept and the implementation side by side.
5. **You keep talking** ("slow it down", "what if the codon is a stop codon?") and the UI changes in place.

The point is that **the explanation becomes a playable thing**.

---

## Verdict: there's no single library that does all of this

Nothing covers proteins, finance charts, circuit simulation, maps and architecture in one package. So we need a **playbook**: a *renderer router* plus a set of vetted libraries, each with a clearly defined **grabbing point**. A grabbing point is the structured thing the agent emits so it never has to write a whole app from scratch.

### The three tiers of generated UI (pick the lowest tier that works)

| Tier | What the agent emits | Reliability | Use for |
|---|---|---|---|
| **1. Primitives** | `{component: "MoleculeViewer", props: {...}}` from our own registry | ★★★ demo-safe | 80% of answers, all of the live demo |
| **2. Declarative spec** | A library's native spec (Vega-Lite JSON, Mol* state, Mermaid/D2, A2UI layout) | ★★☆ | Charts, layouts, diagrams |
| **3. Open-ended code** | A React/R3F component run in a sandbox | ★☆☆ wow, risky | Novel simulations nobody prebuilt |

This follows the static / declarative / open-ended split that the generative-UI field has settled on. See the [CopilotKit guide](https://copilotkit.ai/blog/the-developer-s-guide-to-generative-ui-in-2026).

---

## The runtime layer: how the UI gets on screen

| Option | What it is | Why we care |
|---|---|---|
| **MCP Apps** (official MCP extension, Jan 2026) | A tool returns a `ui://` HTML resource. The host renders it in a sandboxed iframe, and the iframe can call tools back over postMessage JSON-RPC. | **Biggest lever.** Our MCP can return the visualization itself, and it renders *inside Claude, ChatGPT, VS Code and Goose*. Our own app is one more host. [spec blog](https://blog.modelcontextprotocol.io/posts/2026-01-26-mcp-apps/), [ext-apps repo](https://github.com/modelcontextprotocol/ext-apps) |
| **A2UI** (Google, v0.9 Apr 2026) | Streaming JSONL that says what the UI should contain. The client renders it with its own components. | A good Tier 2 layout format that streams in as it's generated. [blog](https://developers.googleblog.com/a2ui-v0-9-generative-ui/) |
| **AG-UI / CopilotKit** | A protocol for agent ↔ frontend events: state sync, tool-call streaming. | Transport for "the UI updates while the harness works". It's a transport, not a UI spec. |
| **Vercel json-render** | Renders a JSON spec into your own component catalog. | The quickest way to build Tier 1 with guardrails. |
| **Thesys C1** (commercial) | An API that returns generative UI directly. | Shortcut if we don't want to build the registry ourselves. *Not verified, check the docs.* |
| **Sandpack** (CodeSandbox) / **WebContainers** (StackBlitz, commercial licence) | Run generated React code in the browser. | The Tier 3 sandbox. |

**Recommendation:** use MCP Apps as the delivery format and a Tier 1 registry (json-render style) as the main path. Sandpack is the fallback for open-ended ideas. AG-UI-style events drive the "building in real time" feel: skeleton → data → animation.

---

## Library map by use case

Professional or commercial libraries are listed first, open-source fallbacks second. **The grabbing point is what the agent emits.**

### Life sciences / chemistry
| Need | Pro / best-in-class | Grabbing point | Fallback |
|---|---|---|---|
| Protein / molecule 3D | **Mol\*** (RCSB/PDBe standard, used by PDB itself) | PDB ID + `MolViewSpec` JSON (scene: representations, colors, focus, camera, *animation snapshots*) | 3Dmol.js, NGL |
| Process animation (translation, transcription) | **Mol\* snapshots** for real structures + **Rive** or **GSAP** for schematic steps | A step list: `[{t, actor, action, codeRef}]` driving a timeline | Three.js / R3F |
| Sequences / genomics | **IGV.js**, **Nightingale** (EBI) | Locus + tracks JSON | — |
| Small molecules / reactions | **ChemDoodle Web** (commercial), **Ketcher** (EPAM) | SMILES / MOL strings | RDKit.js |
| Medical imaging | **Cornerstone3D**, **vtk.js** | DICOM URLs + viewport config | — |

### Physics / engineering / math
| Need | Pro | Grabbing point | Fallback |
|---|---|---|---|
| Interactive math / functions | **Desmos API**, **GeoGebra** embed | Expression list (`y=sin(ax)`, sliders) | Mafs, JSXGraph |
| Rigid-body physics | **Rapier** (WASM) in R3F | Bodies + constraints JSON | Matter.js |
| Circuits / embedded | **Wokwi** embed | `diagram.json` + firmware | Falstad circuit sim |
| CAD / 3D models | **Autodesk APS Viewer**, **Onshape** embeds | Model URN / glTF | three-cad-viewer |
| Signals / huge datasets | **SciChart.js**, **LightningChart JS** (WebGL, millions of points, commercial) | Series arrays + axis config | uPlot |

### Data / business
| Need | Pro | Grabbing point | Fallback |
|---|---|---|---|
| General charts | **Highcharts** (+ Stock, Gantt, Maps, Dashboards), **amCharts 5**, **AG Charts Enterprise** | Options JSON (very LLM-friendly) | Vega-Lite, ECharts |
| Charts the LLM can write reliably | **Vega-Lite** | One spec JSON; the grammar is the API | Observable Plot |
| Tables / grids | **AG Grid Enterprise** | `columnDefs` + `rowData` | TanStack Table |
| Maps / geo | **Mapbox GL**, **CesiumJS + ion** (3D globe), **deck.gl** | GeoJSON + layer config | MapLibre, kepler.gl |

### Systems / code / graphs (the repo itself)
| Need | Pro | Grabbing point | Fallback |
|---|---|---|---|
| Large graphs, top-quality auto-layout | **yFiles for HTML** (commercial, best layouts), **Cambridge Intelligence ReGraph/KeyLines**, **Linkurious Ogma** | Nodes/edges JSON + layout name | Sigma.js, Cytoscape.js |
| Flow / architecture editors | **React Flow Pro** (xyflow), **GoJS**, **JointJS+** | Nodes/edges + node type | React Flow OSS |
| Text-to-diagram | **D2 + TALA** layout (Terrastruct, commercial) | D2 text | Mermaid |
| Whiteboard canvas the agent draws on | **tldraw SDK** (commercial licence since v4; free hobby key; 100-day trial) | Shape records via the editor API | Excalidraw |

### Motion / "make it feel alive"
| Need | Pro | Grabbing point |
|---|---|---|
| Interactive animated illustrations with state | **Rive** (state machines, runtime inputs) | Set state-machine inputs: `step=3`, `speed=0.5` |
| Timeline choreography | **GSAP** (free under Webflow's licence; check the clause about competing site builders) | Timeline of tweens |
| 3D scenes | **Spline** (design tool + runtime), **Three.js / R3F**, **Babylon.js**, **PlayCanvas** | Scene objects + events |
| Explainer video export | **Remotion** (companies need a licence), **Motion Canvas** | Composition props |
| Game-grade sims | **Unity WebGL** (we have a Unity MCP connected) | Scene + C# scripts. Heavy, but impressive |

---

## The playbook (how the router decides)

1. **Classify the question:** domain (bio / math / data / systems / physical) × kind (structure / process / quantity / relationship / space).
2. **Kind picks the shape:**
   - structure → 3D viewer or graph
   - process → **stepper timeline** (always: steps you can play, pause and scrub)
   - quantity → chart
   - relationship → graph
   - space → map or 3D scene
3. **Domain picks the library** from the tables above.
4. **Ground it in code:** the harness uses the MCP to map each visual step or element to `codeRef: {file, symbol, lines}`. This is our differentiator: *the visualization is generated from and linked to this repo*, not generic textbook content.
5. **Emit the lowest tier that works.** Validate the spec against a schema. If validation fails, fall back to a simpler shape: chart → table, 3D → 2D stepper.
6. **Stream it in:** layout skeleton → data → animation, with each stage pushed as an event so the user watches it build.
7. **Voice edits are patches,** not rebuilds: "slower" → `{speed: 0.5}`, "show the stop codon" → `{step: "termination"}`.

### The universal shell (worth building first)
Every answer renders inside one consistent frame:
- **Left:** the live visualization (any library).
- **Bottom:** a **stepper / scrubber** (play, pause, step, speed).
- **Right:** **code panel**. The current step's `codeRef` is highlighted and syncs both ways.
- **Top:** the question you asked, plus a "Sources: 4 symbols, 2 files" chip.

Because of this shell, even a weak visualization looks like a finished product, and the code↔visual link shows up in every demo.

---

## Demo scenarios (pick 2–3 repos)
1. **Bio repo** → *"how does translation work here?"* → Mol\* ribosome (PDB 4V6F or similar) + Rive/GSAP codon stepper, each step linked to a function.
2. **Finance or data repo** → *"what happens to an order?"* → animated flow (React Flow) + Highcharts of order-book state per step.
3. **This very repo** (repo-analysis-workbench) → *"how does a query get answered?"* → yFiles or React Flow pipeline (Tantivy → LMDB → RyuGraph → rerank) with a live packet travelling through it.

## Feasibility
- **Yes, if the demo runs on Tier 1 primitives** (about 6–8 prebuilt components: MoleculeViewer, Stepper, Chart, Graph, Map, Scene3D, CodePanel, Table) with live data and code links. Tier 3 free generation is the risky part: show it once, don't depend on it.
- **MCP Apps** means the same UI also works inside Claude, which is a strong pitch for Anthropic judges.
- **Licences:** yFiles, SciChart, LightningChart (~$2.7k), Highcharts, AG Grid Enterprise, tldraw and Remotion all have trials or hobby/dev terms. Fine for a hackathon, but say so if the product is going to ship.
- **Unverified here:** what the Reason8 API offers, details of Thesys C1, and the current GSAP and Remotion terms. Check before you commit to them.
