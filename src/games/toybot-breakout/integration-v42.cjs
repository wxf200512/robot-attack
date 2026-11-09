const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),ts=require('typescript');
test('V42 platform locale accepts a string and safely falls back for malformed or absent locale',()=>{
 const source=fs.readFileSync(path.resolve(__dirname,'../../services/LogService.ts'),'utf8').replace('import.meta.env.VITE_API_BASE_URL',"''"),code=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText;
 const oldWindow=global.window,oldStorage=global.localStorage;
 try{for(const [value,expected]of [['zh_CN','zh'],[' en_US ','en'],[42,'en'],[null,'en'],['','en']]){
  const saved=new Map();global.localStorage={getItem:k=>saved.get(k)??null,setItem:(k,v)=>saved.set(k,v)};global.window={FBInstant:{getLocale:()=>value}};const m={exports:{}};new Function('module','exports',code)(m,m.exports);assert.equal(m.exports.LogService.getInstance().getCurrentLanguage(),expected);if(typeof value==='string'&&value.trim()){assert.equal(saved.get('language'),expected);assert.equal(saved.get('i18nextLng'),expected);}else assert.equal(saved.size,0);
 }}finally{global.window=oldWindow;global.localStorage=oldStorage;}
});
