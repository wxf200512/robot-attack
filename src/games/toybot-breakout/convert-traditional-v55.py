"""Build-only converter. Dependency: opencc-python-reimplemented==0.1.7.
Install in a separate tooling folder or Python environment, never the game's npm runtime.
"""
from pathlib import Path
import argparse,json,sys,re
parser=argparse.ArgumentParser()
parser.add_argument('--source-dir',type=Path,default=Path(__file__).parent)
parser.add_argument('--module-dir',type=Path)
args=parser.parse_args()
if args.module_dir:sys.path.insert(0,str(args.module_dir.resolve()))
from opencc import OpenCC
converter=OpenCC('s2twp')
source=(args.source_dir/'locale.en.ts').read_text(encoding='utf8')
keys=json.loads(source[source.index('{'):source.rindex('}')+1])
catalog={key:converter.convert(key) for key in keys}
catalog.update({'语言设置':'選擇語言','机库改装':'機庫改裝','世界档案':'世界檔案','玩具城突围':'玩具城突圍','重锤泰坦':'重錘泰坦','第 {0} 队列：{1}，{2}，{3}':'第 {0} 軌道：{1}，{2}，{3}','切换到第 {0} 队列':'切換至第 {0} 軌道'})
assert set(catalog)==set(keys)
for key,value in catalog.items():
 assert value.strip() and not re.search('[训练关设队画档数发机敌战进选奖罚领护装级锁击头会备归线资传损]',value),(key,value)
 assert sorted(re.findall(r'\{\d+\}',key))==sorted(re.findall(r'\{\d+\}',value)),key
(args.source_dir/'locale.zh-TW.ts').write_text('// Traditional Chinese generated offline with OpenCC s2twp; reviewed UI terms.\nconst messages: Readonly<Record<string, string>> = '+json.dumps(catalog,ensure_ascii=False,indent=2)+';\nexport default messages;\n',encoding='utf8')
print('Traditional Chinese entries:',len(catalog),'Simplified GUI character scan: passed')
