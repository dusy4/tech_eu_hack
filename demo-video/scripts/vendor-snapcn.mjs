import {mkdir,writeFile} from 'node:fs/promises';
import path from 'node:path';
const installed = new Set();
const provenance = [];
async function install(name) {
  if(installed.has(name)) return;
  installed.add(name);
  const url = `https://snapcn.dev/r/${name}.json`;
  const response = await fetch(url);
  if(!response.ok) throw new Error(`${url}: ${response.status}`);
  const item = await response.json();
  for(const dep of item.registryDependencies ?? []) await install(dep.split('/').pop().replace('.json',''));
  for(const file of item.files ?? []) {
    const target = file.target ?? file.path;
    const dest = path.join('src', target.replace(/^src\//,''));
    await mkdir(path.dirname(dest),{recursive:true});
    await writeFile(dest,file.content);
    provenance.push({name,url,path:dest});
  }
}
for (const name of ['text-reveal','text-build','block-wordmark','screen-recording','terminal-simulator']) await install(name);
await writeFile('snapcn-sources.json',JSON.stringify(provenance,null,2));
const license = await fetch('https://raw.githubusercontent.com/snapcndev/snapcn/main/LICENSE');
await writeFile('SNAPCN-LICENSE',await license.text());
