// Render the native AI-tool interface clips (HyperFrames compositions in src/native/) to public/native/*.mp4.
//   node scripts/render-native.mjs              renders all of them
//   node scripts/render-native.mjs approval-gate  renders one
// Each folder is a copy of an everestchris.com video component with its CONFIG edited for this demo
// (see src/native/NOTICE.md). The pinned CLI version matches the components' own package.json.
import {execFileSync} from 'node:child_process';
import {cpSync,existsSync,mkdirSync} from 'node:fs';
import path from 'node:path';

// The components' motion kit (assets/kit, transitions.dev-derived) may only live in its source project, so it is
// gitignored here and copied in from the local component library before rendering. Override with NATIVE_KIT.
const kit = process.env.NATIVE_KIT ?? 'D:/ai-games-offer/vendor/everestchris-components/components/terminal-run/assets/kit';

const clips = {
 'terminal-before': {variant: '0', theme: 'dark'},
 'terminal-mcp': {variant: '0', theme: 'dark'},
 'skill-install': {variant: '0', theme: 'light'},
 'approval-gate': {variant: '1', theme: 'dark'},
};
const only = process.argv.slice(2);
mkdirSync('public/native', {recursive: true});
for (const [name, vars] of Object.entries(clips)) {
 if (only.length && !only.includes(name)) continue;
 const out = path.resolve('public/native', `${name}.mp4`);
 const localKit = path.resolve('src/native', name, 'assets/kit');
 if (!existsSync(localKit)) {
  if (!existsSync(kit)) throw new Error(`Motion kit not found at ${kit}; set NATIVE_KIT to a components/<slug>/assets/kit folder.`);
  cpSync(kit, localKit, {recursive: true});
 }
 console.log(`Rendering ${name} → ${out}`);
 const win = process.platform === 'win32';
 // npx is a .cmd on Windows, so it runs through the shell: quote the JSON for cmd.exe
 const json = win ? `"${JSON.stringify(vars).replaceAll('"', '\\"')}"` : JSON.stringify(vars);
 execFileSync('npx', ['--yes', 'hyperframes@0.8.162', 'render', '.', '--variables', json, '-o', out],
  {cwd: path.resolve('src/native', name), stdio: ['ignore', 'ignore', 'inherit'], shell: win});
}
