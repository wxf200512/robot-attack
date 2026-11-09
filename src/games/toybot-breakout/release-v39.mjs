// Reproducible single-game TEST package; shared shell source is never modified.
import { readFile, writeFile, readdir, mkdir, rm, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
const here=path.dirname(fileURLToPath(import.meta.url)),repo=path.resolve(here,'../../..');
export function relativeGameAssetsV39(text,css=false){return text.replace(/(?<![.\w/\-])\/games\/toybot-breakout\//g,css?'../games/toybot-breakout/':'./games/toybot-breakout/').replace(/\/\/# sourceMappingURL=.*$/gm,'');}
export function releaseHtmlV39(html){return html.replace(/<!-- FB Pixel:[\s\S]*?(?=<!-- FBInstant SDK)/,'<script>window.fbq=()=>{};window.gtag=()=>{};</script>\n').replace(/<!-- vConsole[\s\S]*?<title>/,'<title>').replace('<title>Game Template</title>','<title>玩具城突围</title>').replace('href="./vite.svg"','href="./games/toybot-breakout/optimized/logo-v29.png"').replace('href="/vite.svg"','href="./games/toybot-breakout/optimized/logo-v29.png"').replace('initial-scale=1.0','initial-scale=1.0, viewport-fit=cover').replace('<html lang="en">','<html lang="zh-CN">');}
const walk=async dir=>{const all=[];for(const e of await readdir(dir,{withFileTypes:true})){const p=path.join(dir,e.name);if(e.isDirectory())all.push(...await walk(p));else all.push(p);}return all;};
export async function auditReleaseV39(site){
 const files=await walk(site),html=await readFile(path.join(site,'index.html'),'utf8'),config=JSON.parse(await readFile(path.join(site,'fbapp-config.json'),'utf8')),missing=[];
 if(!html.includes('fbinstant.8.0.js')||config.instant_games?.orientation!=='PORTRAIT')throw Error('Missing platform SDK or portrait bundle configuration');
 if(/__FB_PIXEL_ID__|__GA_ID__|vconsole\.js/.test(html))throw Error('Debug/placeholder scripts remain');
 if(files.some(f=>f.endsWith('.map')))throw Error('Source map remains in package');
 const rootRefs=[];
 for(const f of files.filter(f=>/\.(js|css)$/.test(f))){const code=await readFile(f,'utf8');if(/(?<![.\w/\-])\/games\/toybot-breakout\//.test(code))rootRefs.push(path.relative(site,f));
  for(const match of code.matchAll(/["'(](\.{1,2}\/games\/toybot-breakout\/[^"'`)\s{}]+\.(?:png|jpe?g|webp|svg|mp3|ogg|wav))(?:[?#][^"')\s]*)?/g)){const url=match[1],target=path.resolve(f.endsWith('.css')?path.dirname(f):site,url);try{await stat(target);}catch{missing.push(url);}}
 }
 if(rootRefs.length||missing.length)throw Error(JSON.stringify({rootRefs,missing}));
 return {files:files.length,bytes:(await Promise.all(files.map(f=>stat(f)))).reduce((n,s)=>n+s.size,0),rootGameUrls:rootRefs.length,missingLiteralAssets:missing.length,sourceMaps:0,telemetry:'disabled in test package',platformRuntime:'pending Facebook test account and devices'};
}
export async function buildReleaseV39(destination){
 const root=path.resolve(destination);try{await stat(root);throw Error('Release output already exists; choose a fresh directory');}catch(e){if(e.code!=='ENOENT')throw e;}
 await mkdir(root,{recursive:true});const site=path.join(root,'site');
 const run=(cmd,args,options={})=>{const r=spawnSync(cmd,args,{cwd:repo,stdio:'inherit',...options});if(r.status!==0)throw Error('Build/package command failed: '+cmd);};
 run(process.execPath,[path.join(repo,'node_modules/vite/bin/vite.js'),'build','--outDir',site],{env:{...process.env,FB_PACKAGE_GAME_ID:'toybot-breakout',VITE_API_BASE_URL:'',VITE_FB_PIXEL_ID:'',VITE_GA_ID:''}});
 const remove=async target=>{const abs=path.resolve(target),rel=path.relative(site,abs);if(!rel||rel.startsWith('..')||path.isAbsolute(rel))throw Error('Refusing deletion outside new staging directory');await rm(abs,{recursive:true,force:true});};
 const games=path.join(site,'games');for(const e of await readdir(games,{withFileTypes:true}))if(e.name!=='toybot-breakout')await remove(path.join(games,e.name));
 for(const f of await walk(site)){if(f.endsWith('.map'))await remove(f);else if(/\.(js|css)$/.test(f))await writeFile(f,relativeGameAssetsV39(await readFile(f,'utf8'),f.endsWith('.css')));}
 await remove(path.join(site,'vconsole.js'));await remove(path.join(site,'vite.svg'));
 await writeFile(path.join(site,'index.html'),releaseHtmlV39(await readFile(path.join(site,'index.html'),'utf8')));
 const report=await auditReleaseV39(site),zip=path.join(root,'toybot-breakout-v39-test.zip'),entries=await readdir(site);
 if(process.platform==='win32')run(path.join(process.env.SystemRoot||'C:/Windows','System32/tar.exe'),['-a','-c','-f',zip,'-C',site,...entries]);else run('zip',['-r',zip,'.'],{cwd:site});
 const bytes=await readFile(zip),commit=spawnSync('git',['rev-parse','HEAD'],{cwd:repo,encoding:'utf8'}).stdout?.trim();
 const result={...report,zip:path.basename(zip),zipBytes:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex'),sourceCommit:commit};await writeFile(path.join(root,'release-report.json'),JSON.stringify(result,null,2));console.log(JSON.stringify(result,null,2));return result;
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){if(process.argv.length!==3)throw Error('Usage: node src/games/toybot-breakout/release-v39.mjs <fresh-output-directory>');await buildReleaseV39(process.argv[2]);}
