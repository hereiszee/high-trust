# builds the per-job table (stage x path) from the probe logs in docs/audit/jobs/logs
import json,glob,os,sys,collections
D=sys.argv[1] if len(sys.argv)>1 else 'docs/audit/jobs/logs'
rows=collections.OrderedDict()
for f in sorted(glob.glob(D+'/*.log')):
  name=os.path.basename(f);job,quit=name.split('.')[0],name.split('.')[1]
  if job.startswith('pair') or job.startswith('r'): 
    if not job in('roundup','rick','rosa'): continue
  L=[]
  for line in open(f):
    try:L.append(json.loads(line))
    except:pass
  r=rows.setdefault(job,{})
  for x in L:
    if x.get('step')=='fail':
      st=x.get('stage') or '(one stage)';k=(st,x['way'])
      r.setdefault(k,set()).add('fails' if x['f'].get('state')=='lost' else ('n/a' if x['f'].get('state')=='go' else x['f'].get('state')))
    if x.get('step')=='after':
      st=x.get('stage') or '(one stage)';d=x['diff'];ok=x['clicked'] and x['snap']['M'] and x['snap']['M']['state']=='go'
      r.setdefault((st,x['act'].replace('result:','')),set()).add('ok' if ok else 'FAIL')
    if x.get('step')=='hubDiff':
      dd={k:v for k,v in x['d'].items() if k not in('solids','cols','lgroup','wmObjs','cars','widgets','obj')}
      r.setdefault(('leave',quit),set()).add('ok' if not dd or x['d'].get('mode',[0,'hub'])[1]!='hub' and quit=='title' else json.dumps(dd)[:80])
for job,r in rows.items():
  stages=[];[stages.append(k[0]) for k in r if k[0] not in stages]
  cells=[]
  for st in stages:
    parts=[f"{w}:{'/'.join(sorted(v))}" for (s,w),v in r.items() if s==st]
    cells.append(f"**{st}** "+', '.join(parts))
  print(f"| {job} | "+' · '.join(cells)+" |")
