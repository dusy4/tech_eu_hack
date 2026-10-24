# 29 · Skill install

A SKILL.md file card is dragged into the agent's skills folder. The list opens a slot at the card's alphabetical position, the card drops in and reshapes into a row, the folder count rolls up, and the new skill's switch is clicked on. Then the skill's tile lights up in the product accent and a small "New" chip appears beside its name.

Use it in a video whenever you talk about agent skills: installing a skill, teaching an agent a new ability, or how SKILL.md works.

## Variants
| `variant` | Product | Surface |
|---|---|---|
| `0` | Claude Code | Claude desktop app, Customize › Skills, `~/.claude/skills` (blue switches, clay lit tile) |
| `1` | Codex | ChatGPT desktop app, Codex Skills page, `~/.codex/skills` (blue accent) |
| `2` | ChatGPT | Settings › Skills dialog, "Your skills" (ink accent) |

`theme` is `light` (default) or `dark`. 6.6s at 30fps. The hero frame is at 4.8s.

## Render
```bash
npx hyperframes render . --variables '{"variant":"1","theme":"dark"}'
```

## CONFIG (top of the script in `index.html`)
Each variant (`"0"`, `"1"`, `"2"`) has:
- **Layout:**
  - `skin`: `cc`, `cx` or `cg`, which picks the product chrome;
  - `w` and `h`: the window size in the product's 1x px;
  - `zoom`: how much it is enlarged for 1080p.
- **Page text:**
  - `head`: the Claude Code header title;
  - `title` and `sub`: the page title and its one-line description;
  - `button` and `buttonIcon`: the header button's label and icon (`upload` or `plus`).
- **Folder bar:**
  - `folder`: the label (a path, or "Your skills");
  - `folderMono`: `true` sets the label in monospace;
  - `count`: the count before and after, e.g. `[3, 4]`;
  - `countWord`: the word after the count;
  - `chip`: the label of the chip that appears beside the new skill (e.g. `New`).
- **List:**
  - `rows`: the installed skills, in alphabetical order. Each is `{ name, desc, icon }`. Icons are `layout`, `pdf` (file with a type label), `browser`, `doc` (file with text lines), `download`, `receipt`, `table` (file with a grid), `tag`, or the logos `github` and `vercel`.
  - `insertAt`: the index where the new skill's slot opens.
- **New skill** (`skill`):
  - `name`, `desc` and `icon`: as for a row;
  - `size`: the file size on the card;
  - `code`: the SKILL.md lines shown on the card, as `[class, text]` segments. Classes are `d` for the `---` fences, `k` for keys, `v` for values, `h` for headings and `p` for prose; the last line fades out.
- **ChatGPT only:** `nav` is the Settings nav, as `[icon, label, selected]`.

## Assets
- Skins (synced to `assets/skins/` by `tools/v2/sync_shared.sh`): `claude-code`, `codex`, `chatgpt`.
- Motion: `assets/kit/motion/motion.js`.
- Fonts: `assets/fonts/fonts.css` (Inter, JetBrains Mono).

## Keywords
skill, skills, SKILL.md, agent skills, install skill, upload skill, skills folder, ~/.claude/skills, ~/.codex/skills, new ability, capability, toggle on, drag and drop, file card, Claude Code, Codex, ChatGPT, settings, customize
