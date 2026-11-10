"""Retire only the reviewed manifest; keep source art and historical QA fixtures.
Run after historical generators. Idempotent, path-bounded, and checks dynamic URLs.
"""
from pathlib import Path
import json,subprocess,hashlib,shutil
here=Path(__file__).resolve().parent
repo=here.parents[2]
root=(repo/'public/games/toybot-breakout/optimized').resolve()
manifest=json.loads((here/'asset-retirement-v46.json').read_text(encoding='utf-8'))
audit=json.loads(subprocess.check_output(['node',str(here/'audit-assets-v43.cjs'),'--list'],cwd=repo,text=True))
for row in manifest['files']:
    target=(root/row['file']).resolve()
    assert target.parent==root,'Retirement target escaped optimized directory'
    assert '/games/toybot-breakout/optimized/'+target.name not in audit['urls'],'Still used at runtime'
    assert (root/row['replacement']).is_file(),'Replacement missing'
    assert (here/row['original']).is_file(),'Original artwork missing'
    if not target.exists():
        if 'historicalFixture' in row:assert (here/row['historicalFixture']).is_file()
        continue
    assert hashlib.sha256(target.read_bytes()).hexdigest()==row['sha256'],'Changed asset needs review'
    if 'historicalFixture' in row:
        archive=(here/row['historicalFixture']).resolve()
        assert archive.parent==(here/'art-source/runtime-retired-v46').resolve()
        archive.parent.mkdir(exist_ok=True)
        if archive.exists():assert archive.read_bytes()==target.read_bytes()
        else:shutil.copy2(target,archive)
    target.unlink()
print(json.dumps(dict(retiredRuntimeFiles=len(manifest['files']),removedRuntimeBytes=manifest['removedRuntimeBytes'],sourceArtPreserved=True)))
