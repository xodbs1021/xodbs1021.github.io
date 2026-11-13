import re,sys,collections
# usage: count.py <server.log>...
HOOKS=["runOnDisconnect","runOnUnread","runOnUnDemand","runOnUnavailable","runOnOffline","runOnRecordSegmentCreate","runOnRecordSegmentComplete"]
for f in sys.argv[1:]:
    txt=open(f).read()
    l=collections.Counter(re.findall(r"(\w+) command launched",txt))
    e=collections.Counter(re.findall(r"(\w+) command exited: fork/exec /nonexistent/",txt))
    race=txt.count("DATA RACE"); panic=txt.count("panic:")
    print(f, "launched",sum(l[h] for h in HOOKS),"exited",sum(e[h] for h in HOOKS),"race",race,"panic",panic)
    for h in HOOKS: print("  %-28s %d %d"%(h,l[h],e[h]))
