# Native interface components: source and licence notes

The four folders here are copies of **everestchris.com video components** ("Skills by Chris",
https://www.everestchris.com/components), taken from the local mirror at
`D:\ai-games-offer\vendor\everestchris-components\components\` (scraped 2026-10-17, HyperFrames projects pinned to
`hyperframes@0.8.162`). Only each component's `CONFIG` block (text, names, beat times, duration) and, in
`approval-gate`, three hard-coded beat times were changed for this demo. Layout, skins and motion are unchanged.

| Folder | Source component | Variant / theme | Used for |
|---|---|---|---|
| `terminal-before/` | `terminal-run` (#04) | `0` Claude Code, dark | The problem: Claude Code searching and reading files |
| `terminal-mcp/` | `terminal-run` (#04) | `0` Claude Code, dark | The core: the same question answered with repo-analysis MCP tools |
| `skill-install/` | `skill-install` (#29) | `0` Claude Code, light | The `spelunk-handoff` skill in `.claude/skills` |
| `approval-gate/` | `approval-gate` (#12) | `1` Claude Code permission, dark | Claude Code works the handoff, asks before running tests |

Rendered clips go to `public/native/*.mp4` (`node scripts/render-native.mjs`).

## Licence notes

- **Motion kit (`assets/kit/`)**: its README says the transitions.dev-derived values "may be used inside this
  project", must not be redistributed or published, and that "rendered videos are fine". So `assets/kit/` is
  **gitignored** in this repo and copied in from the local component library at render time
  (`scripts/render-native.mjs`, override the source with `NATIVE_KIT`). Never commit or publish it.
- **Components (`index.html`, skins)**: the site and the mirror carry no explicit licence. They were used here as
  the site's own agent prompts instruct ("add the component to this project, render it"). Ask the author before
  publishing this folder's source; the rendered MP4s are the intended output.
- **Fonts** (`assets/fonts`): Inter, JetBrains Mono, Source Serif 4, all under the SIL Open Font License.
- **Logos** (`assets/logos`) and product skins are trademarks of their owners, used to depict those products.
- **Avatars** in `assets/skins/gemini/img` are Unsplash photos (Unsplash License); they are not used in this video.
