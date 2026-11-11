const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),ts=require('typescript');
const modules=new Map();
function load(name){const file=path.resolve(__dirname,name+'.ts');if(modules.has(file))return modules.get(file).exports;const m={exports:{}};modules.set(file,m);const code=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText;new Function('require','module','exports',code)(id=>id.startsWith('.')?load(path.resolve(path.dirname(file),id)):require(id),m,m.exports);return m.exports;}
const locale=load('locale'),{ENGLISH}=load('locale.en');
test('all nine selectable languages resolve region tags without losing Traditional Chinese',()=>{
 assert.equal(locale.LANGUAGES.length,9);for(const [tag,id]of [['zh_Hant','zh-TW'],['zh_HK','zh-TW'],['zh_MO','zh-TW'],['zh_CN','zh'],['zh-SG','zh'],['pt_PT','pt-BR'],['fr-CA','fr'],['es_MX','es'],['de-DE','de'],['ja-JP','ja'],['ko_KR','ko'],['ru-RU','en']])assert.equal(locale.resolveGameLanguage(tag),id);
});
for(const {id}of locale.LANGUAGES.filter(item=>item.id!=='zh'&&item.id!=='en')){
 const catalog=load('locale.'+id).default;locale.registerTranslations(id,catalog); const cleared={es:'Superado','pt-BR':'Concluído',fr:'Terminé',de:'Abgeschlossen',ja:'クリア済み',ko:'클리어'}; if(cleared[id])assert.equal(catalog['已通关'],cleared[id]);
 test(id+' has complete text coverage and valid interpolation without translation markers',()=>{
  assert.deepEqual(Object.keys(catalog).sort(),Object.keys(ENGLISH).sort());for(const [key,value]of Object.entries(catalog)){
   assert.ok(value.trim(),key);assert.deepEqual((key.match(/\{\d+\}/g)||[]).sort(),(value.match(/\{\d+\}/g)||[]).sort(),key);assert.ok(!/TBKEY|ZXQ/.test(value),key);
  }
 });
 test(id+' renders real prelude and cockpit strings while keeping numeric values',()=>{
  const stages=load('sortiesV39');for(const stage of stages.SORTIES_V39){const result=locale.translateText(stage.name+' · '+stages.sortieGoalV39(stage),id);assert.ok(result.includes(String(stage.target)),result);if(['es','pt-BR','fr','de','ko'].includes(id))assert.ok(!/[\u3400-\u9fff]/.test(result),result);}
  const result=locale.translateText('小队 3 台，护盾 2，装甲 1',id);for(const n of ['3','2','1'])assert.ok(result.includes(n),result);assert.ok(!/\{\d+\}|ZXQ|TBKEY/.test(result));
 });
}
test('Traditional Chinese exact text is not retranslated as individual Simplified fragments',()=>{
 assert.equal(locale.translateText('训练核心生命 100/100','zh-TW'),'訓練核心生命 100/100');assert.equal(locale.translateText('玩具城突围','zh-TW'),'玩具城突圍');assert.equal(locale.translateText('脉冲先锋','zh-TW'),'脈衝先鋒');assert.equal(locale.translateText('第一盏归航灯','zh-TW'),load('locale.zh-TW').default['第一盏归航灯']);
 const slots=locale.translateText('小队 3 台，护盾 2，装甲 1','zh-TW');assert.ok(slots.includes('護盾')&&slots.includes('裝甲'),slots);
});
test('language cache remains isolated when cycling between languages and back to Simplified',()=>{
 const expected=locale.LANGUAGES.map(({id})=>[id,locale.translateText('机库改装',id)]);for(let repeat=0;repeat<3;repeat++)for(const [id,text]of expected)assert.equal(locale.translateText('机库改装',id),text);assert.equal(locale.translateText('机库改装','zh'),'机库改装');
});
