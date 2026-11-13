#!/bin/bash
cd /tmp/tb6w-vq
M=/opt/homebrew/share/libvmaf/model
V0="version=vmaf_v0.6.1\:name=vmaf|version=vmaf_v0.6.1neg\:name=neg|version=vmaf_v0.6.1\:name=phone\:enable_transform=true"
FEAT="name=psnr|name=float_ssim"
metric(){
 local pre=${4:-null}; local models=${5:-$V0}
 echo "\$ ffmpeg -i $1 -i $2 -lavfi \"[0:v]$pre,scale=1920:1080:flags=bicubic,setpts=N/${FR:-24}/TB[d];[1:v]setpts=N/${FR:-24}/TB[r];[d][r]libvmaf=model='$models':feature='$FEAT':log_fmt=json:log_path=$3:n_threads=8\" -f null -"
 ffmpeg -hide_banner -v error -i $1 -i $2 -lavfi "[0:v]$pre,scale=1920:1080:flags=bicubic,setpts=N/${FR:-24}/TB[d];[1:v]setpts=N/${FR:-24}/TB[r];[d][r]libvmaf=model='$models':feature='$FEAT':log_fmt=json:log_path=$3:n_threads=8" -f null -
 python3 - "$3" <<'PY'
import json,sys
d=json.load(open(sys.argv[1])); fr=d['frames']
def pooled(k):
    v=sorted(f['metrics'][k] for f in fr if k in f['metrics']); n=len(v)
    if not n: return None
    mean=sum(v)/n; hm=n/sum(1/(x+1) for x in v)-1; p1=v[max(0,int(0.01*n)-1)] if n>=100 else v[0]
    return f"{k}: 평균 {mean:.3f} · 조화평균 {hm:.3f} · 하위1% {p1:.3f} · 최소 {v[0]:.3f}"
print(f"  프레임 {len(fr)}")
for k in ['vmaf','neg','phone','v1','v1hfr','psnr_y','float_ssim']:
    r=pooled(k)
    if r: print('  '+r)
PY
}
echo "## V2 추가 $(TZ=Asia/Seoul date '+%Y-%m-%d %H:%M:%S KST') load $(uptime | sed 's/.*load averages: //')"
for s in "$@"; do echo "### gblur sigma=$s (압축 없음)"; metric ref10.mkv ref10.mkv v2-blur$s.json "gblur=sigma=$s"; done
