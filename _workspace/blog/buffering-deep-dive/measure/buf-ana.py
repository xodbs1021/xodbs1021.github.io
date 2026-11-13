import json,sys
for f in sys.argv[1:]:
    d=json.load(open(f)); S=d['samples']; E=d['events']
    print('==',d['name'],'hls.js',d['hlsjs'],'chrome',d['chrome'],'mbl',d['maxBufferLength'],'applied',d['applied'])
    lv=[l for l in E if l[1]=='MANIFEST_PARSED']; print(' levels',lv[0][2] if lv else None)
    # sample every 5s
    for s in S:
        if abs(s[0]-round(s[0]/5)*5)<0.13: print(f"  t={s[0]:6.1f} cur={s[1]:6.2f} buf={s[2]:5.2f} lvl={s[3]} load={s[4]} bw={s[5]/1e6:.2f}M lat={s[6]} ready={s[9]} paused={s[8]}")
    for e in E:
        if e[1] in ('ERROR','STALL_RESOLVED','LEVEL_SWITCHED') or e[1].startswith('video:'): print('  ev',e)
    print('  maxbuf',max(s[2] for s in S), 'min buf after 5s', min(s[2] for s in S if s[0]>5))
    for w in d['warns'][:12]: print('  warn',w)
