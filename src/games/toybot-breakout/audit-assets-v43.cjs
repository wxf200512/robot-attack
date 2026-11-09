const fs=require('node:fs'),path=require('node:path'),ts=require('typescript');
const cache=new Map();
function load(name){const file=path.resolve(__dirname,name+'.ts');if(cache.has(file))return cache.get(file);const module={exports:{}};cache.set(file,module.exports);const code=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2020,module:ts.ModuleKind.CommonJS}}).outputText;new Function('require','module','exports',code)(id=>id.startsWith('./')?load(id):require(id),module,module.exports);return module.exports;}
const urls=new Set(),seen=new Set();
function visit(value){if(typeof value==='string'&&value.startsWith('/games/toybot-breakout/')&&/\.(?:png|webp|jpg|mp3)$/.test(value))urls.add(value);if(value&&typeof value==='object'&&!seen.has(value)){seen.add(value);for(const item of Object.values(value))visit(item);}}
for(const module of ['art','visualArt','referenceCamera','hostileMotionV31','signatureV34','arenaMotionV36','roadMotionV37','partDamageV38','campaign','defenseArt','operations','awakening','musicTracks'])visit(load(module));
for(const name of fs.readdirSync(__dirname).filter(n=>/\.(?:tsx?|css)$/.test(n))){const code=fs.readFileSync(path.join(__dirname,name),'utf8');for(const match of code.matchAll(/["'`](\/games\/toybot-breakout\/[^"'`\s{}]+\.(?:png|webp|jpg|mp3))["'`]/g))urls.add(match[1]);}
const missing=[...urls].filter(url=>!fs.existsSync(path.resolve(__dirname,'../../../public',url.slice(1))));
if(missing.length)throw Error('Missing runtime assets: '+missing.join(', '));
console.log(JSON.stringify({runtimeAssetUrls:urls.size,missing:0}));
