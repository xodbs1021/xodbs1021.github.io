#!/bin/bash
# VQ measurements. Usage: vq.sh <step>
set -e
cd /tmp/tb6w-vq
S=/tmp/tb6w-media/sintel_trailer-1080p.mp4
M=/opt/homebrew/share/libvmaf/model
V0="version=vmaf_v0.6.1\:name=vmaf|version=vmaf_v0.6.1neg\:name=neg|version=vmaf_v0.6.1\:name=phone\:enable_transform=true"
FEAT="name=psnr|name=float_ssim"
now(){ TZ=Asia/Seoul date '+%Y-%m-%d %H:%M:%S KST'; }
ld(){ uptime | sed 's/.*load averages: //'; }
# metric <dist> <ref> <json> [dist prefilter] [models]
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
case $1 in
prep)
 echo "## 준비 $(now) load $(ld)"
 echo "\$ ffmpeg -ss 20 -i sintel_trailer-1080p.mp4 -t 10 -an -c:v ffv1 ref10.mkv"; ffmpeg -hide_banner -v error -y -ss 20 -i $S -t 10 -an -c:v ffv1 ref10.mkv
 echo "\$ ffmpeg -i sintel_trailer-1080p.mp4 -an -c:v ffv1 full.mkv"; ffmpeg -hide_banner -v error -y -i $S -an -c:v ffv1 full.mkv
 ffprobe -v error -select_streams v:0 -count_frames -show_entries stream=width,height,r_frame_rate,nb_read_frames -of csv=p=0 ref10.mkv | sed 's/^/  ref10: /'
 ffprobe -v error -select_streams v:0 -count_frames -show_entries stream=width,height,r_frame_rate,nb_read_frames -of csv=p=0 full.mkv | sed 's/^/  full: /'
 ;;
v1)
 echo "## V1 선명화(unsharp) 전후 $(now) load $(ld)"
 E="-c:v libx264 -preset medium -threads 4 -b:v 1600k -maxrate 1600k -bufsize 3200k"
 echo "\$ ffmpeg -i ref10.mkv $E plain.mp4"; ffmpeg -hide_banner -v error -y -i ref10.mkv $E plain.mp4
 for a in 0.8 1.5; do
  echo "\$ ffmpeg -i ref10.mkv -vf unsharp=5:5:$a:5:5:0 $E presharp$a.mp4"; ffmpeg -hide_banner -v error -y -i ref10.mkv -vf unsharp=5:5:$a:5:5:0 $E presharp$a.mp4
 done
 for f in plain.mp4 presharp0.8.mp4 presharp1.5.mp4; do echo "### $f ($(stat -f %z $f) 바이트)"; metric $f ref10.mkv v1-$f.json; done
 echo "### plain.mp4 디코딩 뒤 unsharp=5:5:0.8:5:5:0"; metric plain.mp4 ref10.mkv v1-postsharp.json "unsharp=5:5:0.8:5:5:0"
 echo "### 원본 자체에 unsharp=5:5:0.8:5:5:0 (압축 없음)"; metric ref10.mkv ref10.mkv v1-refsharp.json "unsharp=5:5:0.8:5:5:0"
 ;;
v2)
 echo "## V2 흐림 대 블록 — PSNR 맞추기 $(now) load $(ld)"
 for s in 1.0 1.4 1.8 2.4; do echo "### gblur sigma=$s (압축 없음)"; metric ref10.mkv ref10.mkv v2-blur$s.json "gblur=sigma=$s"; done
 for q in 38 42 46; do
  echo "\$ ffmpeg -i ref10.mkv -c:v libx264 -preset medium -threads 4 -qp $q qp$q.mp4"; ffmpeg -hide_banner -v error -y -i ref10.mkv -c:v libx264 -preset medium -threads 4 -qp $q qp$q.mp4
  echo "### x264 -qp $q ($(stat -f %z qp$q.mp4) 바이트)"; metric qp$q.mp4 ref10.mkv v2-qp$q.json
 done
 ;;
v3)
 echo "## V3 화면별 VMAF — 예고편 전체, 라이브식 CBR $(now) load $(ld)"
 E="-c:v libx264 -preset veryfast -tune zerolatency -threads 4 -b:v 2500k -maxrate 2500k -bufsize 2500k -g 48 -keyint_min 48 -sc_threshold 0"
 echo "\$ ffmpeg -i full.mkv $E cbr.mp4"; ffmpeg -hide_banner -v error -y -i full.mkv $E cbr.mp4
 echo "### cbr.mp4 ($(stat -f %z cbr.mp4) 바이트)"; metric cbr.mp4 full.mkv v3-cbr.json
 echo "\$ ffmpeg -i full.mkv -vf \"select='gt(scene,0.3)',showinfo\" -f null - (장면 전환)"
 ffmpeg -hide_banner -i full.mkv -vf "select='gt(scene,0.3)',showinfo" -f null - 2>&1 | grep -o "n: *[0-9]* .*pts_time:[0-9.]*" | awk '{print "  cut", $0}' | sed 's/pts:.*pts_time/pts_time/' > v3-cuts.txt; cat v3-cuts.txt
 ;;
v4)
 echo "## V4 해상도별 기본 · 휴대폰 모델 $(now) load $(ld)"
 for r in 960:540:1000 1280:720:1600 1920:1080:1600; do IFS=: read w h b <<< "$r"
  f=res${h}_${b}.mp4; echo "\$ ffmpeg -i ref10.mkv -vf scale=$w:$h:flags=bicubic -c:v libx264 -preset medium -threads 4 -b:v ${b}k -maxrate ${b}k -bufsize $((b*2))k $f"
  ffmpeg -hide_banner -v error -y -i ref10.mkv -vf scale=$w:$h:flags=bicubic -c:v libx264 -preset medium -threads 4 -b:v ${b}k -maxrate ${b}k -bufsize $((b*2))k $f
  echo "### $f"; metric $f ref10.mkv v4-$h.json
 done
 ;;
v5)
 export FR=60; echo "## V5 60fps 대 30fps (합성 testsrc2) $(now) load $(ld)"
 V5M="version=vmaf_v0.6.1\:name=vmaf|path=$M/vmaf_v1.0.16/vmaf_v1.0.16_3d0h.json\:name=v1|path=$M/vmaf_v1.0.16_hfr/vmaf_v1.0.16_hfr_3d0h.json\:name=v1hfr"
 echo "\$ ffmpeg -f lavfi -i testsrc2=size=1920x1080:rate=60 -t 10 -c:v ffv1 ref60.mkv"; ffmpeg -hide_banner -v error -y -f lavfi -i testsrc2=size=1920x1080:rate=60 -t 10 -c:v ffv1 ref60.mkv
 echo "\$ ffmpeg -i ref60.mkv -vf fps=30 -c:v ffv1 ref30.mkv (참조를 30fps로 솎음)"; ffmpeg -hide_banner -v error -y -i ref60.mkv -vf fps=30 -c:v ffv1 ref30.mkv
 E="-c:v libx264 -preset medium -threads 4 -b:v 6000k -maxrate 6000k -bufsize 12000k"
 echo "\$ ffmpeg -i ref60.mkv $E e60.mp4"; ffmpeg -hide_banner -v error -y -i ref60.mkv $E e60.mp4
 echo "\$ ffmpeg -i ref60.mkv -vf fps=30 $E e30.mp4"; ffmpeg -hide_banner -v error -y -i ref60.mkv -vf fps=30 $E e30.mp4
 echo "### A: e60.mp4 대 ref60 (60fps끼리)"; metric e60.mp4 ref60.mkv v5-a.json null "$V5M"
 echo "### B1: e30.mp4 대 ref30 (30fps끼리 — 참조도 솎음)"; FR=30 metric e30.mp4 ref30.mkv v5-b1.json null "$V5M"
 echo "### B2: e30.mp4를 fps=60으로 프레임 반복 대 ref60"; metric e30.mp4 ref60.mkv v5-b2.json "fps=60" "$V5M"
 echo "### C: ref30(무손실)을 fps=60으로 반복 대 ref60 (압축 없이 프레임률만)"; metric ref30.mkv ref60.mkv v5-c.json "fps=60" "$V5M"
 ;;
esac
echo "끝 $(now) load $(ld)"
