# usage: python3 -I opus_toc.py file.ogg  -> mode counts and run-length sequence
import json, subprocess, sys
f = sys.argv[1]
out = subprocess.run(["ffprobe","-v","error","-select_streams","a","-show_packets","-show_data","-of","json",f],capture_output=True,text=True).stdout
pk = json.loads(out)["packets"]
def mode(cfg):
    if cfg < 12: return "SILK-" + ["NB","MB","WB"][cfg//4]
    if cfg < 16: return "Hybrid-" + ["SWB","FB"][(cfg-12)//2]
    return "CELT-" + ["NB","WB","SWB","FB"][(cfg-16)//4]
def fdur(cfg):
    if cfg < 12: return [10,20,40,60][cfg%4]
    if cfg < 16: return [10,20][cfg%2]
    return [2.5,5,10,20][cfg%4]
seq=[]; counts={}
for p in pk:
    hexline = p["data"].strip().split("\n")[0]
    b = int(hexline.split(":")[1].split()[0][:2],16)
    cfg = b >> 3
    m = f"{mode(cfg)} {fdur(cfg)}ms"
    counts[m]=counts.get(m,0)+1
    t = float(p["pts_time"])
    if not seq or seq[-1][0]!=m: seq.append([m,t,t])
    else: seq[-1][2]=t
print(f, "packets", len(pk), counts)
runs=[s for s in seq]
print("runs", len(runs))
for m,a,b in runs[:40]: print(f"  {a:7.2f}-{b:7.2f}s {m}")
