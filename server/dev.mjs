import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const node=process.execPath;
const processes=[spawn(node,['server/server.mjs'],{cwd:root,stdio:'inherit'}),spawn(node,['node_modules/vite/bin/vite.js','--host','0.0.0.0'],{cwd:root,stdio:'inherit'})];
function close(){for(const p of processes)if(!p.killed)p.kill();}
process.on('SIGINT',close);process.on('SIGTERM',close);
for(const p of processes)p.on('exit',code=>{if(code&&code!==0){close();process.exitCode=code;}});
