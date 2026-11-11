const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),ts=require('typescript');
const cache=new Map();
function load(name){
 const file=path.resolve(__dirname,name.endsWith('.ts')?name:name+'.ts');
 if(cache.has(file))return cache.get(file).exports;
 const m={exports:{}};cache.set(file,m);
 const code=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText;
 new Function('require','module','exports',code)(id=>id.startsWith('.')?load(path.resolve(path.dirname(file),id)):require(id),m,m.exports);
 return m.exports;
}
const l=load('locale'),{ENGLISH}=load('locale.en');
const han=/[\u3400-\u9fff]/;
test('regional platform locales and unsupported languages select a supported display language',()=>{
 for(const [input,expected]of [['zh_CN','zh'],['zh-TW','zh'],['ZH-hans','zh'],['en_US','en'],['pt-BR','en'],[undefined,'en'],['','en']])assert.equal(l.resolveGameLanguage(input),expected);
});
test('language preference persists separately and tolerates unavailable or malformed storage',()=>{
 const data=new Map([['toybot-breakout:garage:v1','unchanged']]);const store={getItem:k=>data.get(k),setItem:(k,v)=>data.set(k,v)};
 assert.equal(l.readLanguagePreference(store),null);l.saveLanguagePreference('en',store);assert.equal(l.readLanguagePreference(store),'en');assert.equal(data.get('toybot-breakout:garage:v1'),'unchanged');
 assert.equal(l.readLanguagePreference({getItem:()=> 'fr'}),null);assert.equal(l.readLanguagePreference({getItem:()=>{throw Error();}}),null);assert.doesNotThrow(()=>l.saveLanguagePreference('zh',{setItem:()=>{throw Error();}}));
});
test('every English catalog entry is populated and preserves interpolation slots',()=>{
 for(const [source,target]of Object.entries(ENGLISH)){
  assert.ok(target.trim(),source);assert.ok(!han.test(target)||source==='简体中文',source);
  assert.deepEqual((source.match(/\{\d+\}/g)||[]).sort(),(target.match(/\{\d+\}/g)||[]).sort(),source);
 }
});
test('current source prose and JSX labels have catalog coverage',()=>{
 const missing=[];
 for(const name of fs.readdirSync(__dirname).filter(n=>/\.tsx?$/.test(n)&&!/(Review|locale\.en|i18n)/.test(n))){
  const text=fs.readFileSync(path.join(__dirname,name),'utf8');const source=ts.createSourceFile(name,text,ts.ScriptTarget.Latest,true,name.endsWith('tsx')?ts.ScriptKind.TSX:ts.ScriptKind.TS);
  const check=s=>{s=s.trim();if(han.test(s)&&ENGLISH[s]===undefined&&han.test(l.translateText(s,'en')))missing.push(name+': '+s);};
  function visit(n){if(ts.isStringLiteral(n)||ts.isNoSubstitutionTemplateLiteral(n)||ts.isJsxText(n))check(n.text);if(ts.isTemplateExpression(n))check(n.head.text+n.templateSpans.map((p,i)=>'{'+i+'}'+p.literal.text).join(''));ts.forEachChild(n,visit);}visit(source);
 }
 assert.deepEqual(missing,[]);
});
test('composed prelude labels translate names, goals, rewards and accessibility status together',()=>{
 const {SORTIES_V39,sortieGoalV39}=load('sortiesV39');
 for(const s of SORTIES_V39){
  for(const text of [s.name+' · '+sortieGoalV39(s)+' · 首通额外零件','前置 '+(s.slot+1)+' '+s.name+' 未解锁',s.intro,s.outro]){
   if(typeof text==='string')assert.ok(!han.test(l.translateText(text,'en')),text+' -> '+l.translateText(text,'en'));
  }
 }
 assert.equal(l.translateText('无首领 · 45秒','en'),'No boss · 45s');
 assert.equal(l.translateText('先完成第 3 小关','en'),'Clear prelude 3 first');
});
test('combat and upgrade interpolation preserve numbers and recursively translate names',()=>{
 assert.equal(l.translateText('核心生命 80/100','en'),'Core HP 80/100');
 assert.equal(l.translateText('贯流光束中，剩余4.5秒','en'),'Flux Beam active, 4.5s remaining');
 assert.equal(l.translateText('小队 3 台，护盾 2，装甲 1','en'),'Squad: 3 mechs, 2 shields, 1 armor');
 assert.equal(l.translateText('装甲模块 升级至2级，生命 110 → 120，消耗7零件','en'),'Armor module: upgrade to Lv.2. HP 110 → 120. Cost: 7 parts');
});
test('display conversion preserves Chinese, numeric children, React objects and simulation identifiers',()=>{
 const object={type:'button',props:{children:'装甲'}};
 assert.equal(l.localizeValue(object,'en'),object);assert.equal(l.localizeValue(15,'en'),15);assert.equal(l.translateText(' 脉冲先锋 ','zh'),' 脉冲先锋 ');
 assert.deepEqual(l.localizeValue(['装甲',3,null,false],'en'),['Armor',3,null,false]);assert.equal(l.translateText('0:4','en'),'0:4');
});
test('language rendering does not mutate progression or reward values',()=>{
 const p=load('progression'),g=p.normalizeGarage({parts:12,tutorialCompleted:true,sortieClears:['0:0'],levels:{weapon:1,armor:1,core:0}}),before=JSON.stringify(g);
 for(const lang of ['en','zh','en'])for(const item of p.UPGRADES){l.translateText(item.title,lang);l.translateText(p.previewUpgrade(g,item.id),lang);}
 assert.equal(JSON.stringify(g),before);assert.equal(g.parts,12);assert.deepEqual(g.sortieClears,['0:0']);
});
