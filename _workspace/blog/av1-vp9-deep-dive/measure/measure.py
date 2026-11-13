#!/usr/bin/env python3
"""TB4 measurements. Run with: python3 -I /tmp/tb4w-scripts/measure.py /tmp/tb4w-measure
Outputs JSON/logs into the given directory. Sequential on purpose (CPU time)."""
import json, os, re, resource, subprocess, sys, threading, time

OUT = sys.argv[1]
REF = os.path.join(OUT, "ref.mkv")
FPS = 24
TARGET = 93.0
os.chdir(OUT)
LOG = open("run.log", "a")
results = {"started": time.strftime("%Y-%m-%dT%H:%M:%S%z")}


def log(msg):
    line = f"{time.strftime('%H:%M:%S')} {msg}"
    print(line, flush=True)
    LOG.write(line + "\n"); LOG.flush()


stop = False


def sampler():
    with open("load.log", "a") as f:
        while not stop:
            f.write(f"{time.strftime('%H:%M:%S')} {' '.join('%.2f' % x for x in os.getloadavg())}\n")
            f.flush()
            time.sleep(10)


threading.Thread(target=sampler, daemon=True).start()


def run(cmd, name=None):
    """Run cmd, return (cpu_user, cpu_sys, wall, stderr)."""
    before = resource.getrusage(resource.RUSAGE_CHILDREN)
    la0 = os.getloadavg()[0]
    t0 = time.time()
    p = subprocess.run(cmd, capture_output=True, text=True)
    wall = time.time() - t0
    after = resource.getrusage(resource.RUSAGE_CHILDREN)
    la1 = os.getloadavg()[0]
    if p.returncode != 0:
        log(f"FAIL {' '.join(cmd)}\n{p.stderr[-2000:]}")
        raise SystemExit(1)
    u = after.ru_utime - before.ru_utime
    s = after.ru_stime - before.ru_stime
    if name:
        with open(f"{name}.stderr.txt", "w") as f:
            f.write(p.stderr)
    return {"user": round(u, 2), "sys": round(s, 2), "cpu": round(u + s, 2), "wall": round(wall, 2),
            "load1_before": round(la0, 2), "load1_after": round(la1, 2)}, p.stderr, p.stdout


def packets(path):
    p = subprocess.run(["ffprobe", "-v", "error", "-select_streams", "v", "-show_entries",
                        "packet=pts_time,dts_time,size,flags", "-of", "json", path],
                       capture_output=True, text=True, check=True)
    return json.loads(p.stdout)["packets"]


def bitrate_stats(path):
    pk = packets(path)
    sizes = [int(x["size"]) for x in sorted(pk, key=lambda x: float(x["pts_time"]))]
    n = len(sizes)
    total = sum(sizes)
    win = 2 * FPS
    peak2 = max(sum(sizes[i:i + win]) for i in range(0, n - win + 1)) * 8 / 2 / 1000
    keys = [round(float(x["pts_time"]), 3) for x in pk if "K" in x["flags"]]
    return {"frames": n, "bytes": total, "kbps": round(total * 8 / (n / FPS) / 1000, 1),
            "peak2s_kbps": round(peak2, 1), "keyframes": sorted(keys)}


def vmaf(path, tag):
    logp = f"vmaf_{tag}.json"
    cpu, _, _ = run(["ffmpeg", "-hide_banner", "-y", "-i", path, "-i", REF, "-lavfi",
                     f"[0:v]setpts=N/{FPS}/TB[d];[1:v]setpts=N/{FPS}/TB[r];[d][r]libvmaf=model=version=vmaf_v0.6.1:n_threads=8:log_fmt=json:log_path={logp}",
                     "-f", "null", "-"])
    j = json.load(open(logp))
    per = sorted(f["metrics"]["vmaf"] for f in j["frames"])
    n = len(per)
    import math
    k = max(1, math.ceil(0.01 * n))
    return {"vmaf_mean": round(j["pooled_metrics"]["vmaf"]["mean"], 2),
            "vmaf_p1": round(per[k - 1], 2), "vmaf_min": round(per[0], 2), "vmaf_frames": n}


cache = {}


def encode(enc, preset, crf):
    key = f"{enc}_{preset}_crf{crf}"
    if key in cache:
        return cache[key]
    out = f"enc_{key}.mp4"
    if enc == "x264":
        args = ["-c:v", "libx264", "-preset", preset, "-crf", str(crf)]
    elif enc == "x265":
        args = ["-c:v", "libx265", "-preset", preset, "-crf", str(crf)]
    elif enc == "svt":
        args = ["-c:v", "libsvtav1", "-preset", str(preset), "-crf", str(crf)]
    cmd = ["ffmpeg", "-hide_banner", "-y", "-i", REF, "-an"] + args + [out]
    log(f"encode {key}")
    t, _, _ = run(cmd, name=f"enc_{key}")
    r = {"encoder": enc, "preset": preset, "crf": crf, "cmd": " ".join(cmd), "time": t}
    r.update(bitrate_stats(out))
    r.update(vmaf(out, key))
    log(f"  {key}: cpu={t['cpu']}s kbps={r['kbps']} vmaf={r['vmaf_mean']} p1={r['vmaf_p1']}")
    cache[key] = r
    json.dump(cache, open("encodes.json", "w"), indent=1, ensure_ascii=False)
    return r


def bisect(enc, preset, lo, hi):
    """Largest integer CRF in [lo, hi] with mean VMAF >= TARGET (VMAF assumed non-increasing in CRF)."""
    best = None
    while lo <= hi:
        mid = (lo + hi) // 2
        r = encode(enc, preset, mid)
        if r["vmaf_mean"] >= TARGET:
            best = mid; lo = mid + 1
        else:
            hi = mid - 1
    return best


def sh(cmd):
    return subprocess.run(cmd, shell=True, capture_output=True, text=True)


def part_h264_headers():
    log("== h264 headers / level")
    res = {}
    for name, extra in [("auto60_veryfast", "-preset veryfast"), ("auto60_medium", "-preset medium"),
                        ("auto30_medium", "-preset medium"), ("lvl41_60", "-preset veryfast -level 4.1"),
                        ("lvl42_60", "-preset veryfast -level 4.2")]:
        rate = 30 if "30" in name else 60
        out = f"h264_{name}.ts"
        cmd = (f"ffmpeg -hide_banner -y -f lavfi -i testsrc2=size=1920x1080:rate={rate} -t 1 -c:v libx264 {extra} "
               f"-profile:v high -pix_fmt yuv420p -g {2*rate} -sc_threshold 0 -f mpegts {out}")
        p = sh(cmd)
        open(f"h264_{name}.encode.txt", "w").write(cmd + "\n" + p.stderr)
        tr = sh(f"ffmpeg -hide_banner -i {out} -c copy -bsf:v trace_headers -f null - 2>&1")
        open(f"h264_{name}.trace.txt", "w").write(tr.stdout + tr.stderr)
        text = tr.stdout + tr.stderr
        lvl = re.findall(r"level_idc\s+\S+\s+=\s+(\d+)", text)
        prof = re.findall(r"profile_idc\s+\S+\s+=\s+(\d+)", text)
        refs = re.findall(r"max_num_ref_frames\s+\S+\s+=\s+(\d+)", text)
        nals = re.findall(r"nal_unit_type\s+\S+\s+=\s+(\d+)", text)
        warn = [l for l in p.stderr.splitlines() if "level" in l.lower() and "x264" in l.lower()]
        res[name] = {"cmd": cmd, "level_idc": lvl[:1], "profile_idc": prof[:1], "max_num_ref_frames": refs[:1],
                     "first_nals": nals[:20], "warnings": warn}
        log(f"  {name}: level={lvl[:1]} refs={refs[:1]} nals={nals[:12]} warn={warn}")
    # HLS CODECS attribute
    for codec, args in [("h264_60", "-c:v libx264 -preset veryfast -profile:v high -r 60"),
                        ("h264_30", "-c:v libx264 -preset veryfast -profile:v high -r 30"),
                        ("hevc_30", "-c:v libx265 -preset veryfast -tag:v hvc1 -r 30"),
                        ("av1_30", "-c:v libsvtav1 -preset 12 -r 30")]:
        d = f"hls_{codec}"
        os.makedirs(d, exist_ok=True)
        cmd = (f"ffmpeg -hide_banner -y -f lavfi -i testsrc2=size=1920x1080:rate=60 -t 2 {args} -pix_fmt yuv420p "
               f"-f hls -hls_segment_type fmp4 -hls_time 1 -hls_list_size 0 -master_pl_name master.m3u8 {d}/v.m3u8")
        p = sh(cmd)
        m = open(f"{d}/master.m3u8").read() if os.path.exists(f"{d}/master.m3u8") else p.stderr[-800:]
        res[f"hls_{codec}"] = {"cmd": cmd, "master": m}
        log(f"  hls {codec}: {m.strip().splitlines()[-2:] if m else ''}")
    results["h264_headers"] = res


def part_decode_order():
    log("== decode order")
    cmd = f"ffmpeg -hide_banner -y -i {REF} -frames:v 9 -an -c:v libx264 -preset medium -bf 3 -b-pyramid none dec_order.mp4"
    sh(cmd)
    pk = sh("ffprobe -v error -select_streams v -show_entries packet=pts,dts,flags -of csv=p=0 dec_order.mp4").stdout
    fr = sh("ffprobe -v error -select_streams v -show_entries frame=pts,pict_type -of csv=p=0 dec_order.mp4").stdout
    results["decode_order"] = {"cmd": cmd, "packets_pts_dts_flags": pk.strip().splitlines(),
                               "frames_pts_type": fr.strip().splitlines()}
    log("  packets " + " | ".join(pk.strip().splitlines()))
    log("  frames " + " | ".join(fr.strip().splitlines()))


def part_twopass():
    log("== h264 1-pass ABR vs 2-pass")
    B = "1500k"
    res = {}
    out1 = "abr1.mp4"
    cmd1 = ["ffmpeg", "-hide_banner", "-y", "-i", REF, "-an", "-c:v", "libx264", "-preset", "medium", "-b:v", B, out1]
    t1, _, _ = run(cmd1, "abr1")
    r = {"cmd": " ".join(cmd1), "time": t1}; r.update(bitrate_stats(out1)); r.update(vmaf(out1, "abr1"))
    res["one_pass"] = r
    log(f"  1pass {r['time']['cpu']}s {r['kbps']}kbps vmaf {r['vmaf_mean']} p1 {r['vmaf_p1']} peak2 {r['peak2s_kbps']}")
    cmdp1 = ["ffmpeg", "-hide_banner", "-y", "-i", REF, "-an", "-c:v", "libx264", "-preset", "medium", "-b:v", B,
             "-pass", "1", "-passlogfile", "tp", "-f", "null", "-"]
    tp1, _, _ = run(cmdp1, "pass1")
    cmdp2 = ["ffmpeg", "-hide_banner", "-y", "-i", REF, "-an", "-c:v", "libx264", "-preset", "medium", "-b:v", B,
             "-pass", "2", "-passlogfile", "tp", "twopass.mp4"]
    tp2, _, _ = run(cmdp2, "pass2")
    r = {"cmd_pass1": " ".join(cmdp1), "cmd_pass2": " ".join(cmdp2), "time_pass1": tp1, "time_pass2": tp2}
    r.update(bitrate_stats("twopass.mp4")); r.update(vmaf("twopass.mp4", "twopass"))
    try:
        r["pass1_options"] = open("tp-0.log").readline().strip()
    except Exception as e:
        r["pass1_options"] = str(e)
    r["pass2_options"] = sh("strings twopass.mp4 | grep -o 'options:.*' | head -1").stdout.strip()
    res["two_pass"] = r
    log(f"  2pass {tp1['cpu']}+{tp2['cpu']}s {r['kbps']}kbps vmaf {r['vmaf_mean']} p1 {r['vmaf_p1']} peak2 {r['peak2s_kbps']}")
    results["twopass"] = res


def part_hevc_tags_hdr():
    log("== hevc tags / hdr")
    res = {}
    for name, extra in [("default", ""), ("hvc1", "-tag:v hvc1")]:
        cmd = f"ffmpeg -hide_banner -y -f lavfi -i testsrc2=size=1280x720:rate=30 -t 1 -c:v libx265 -preset ultrafast {extra} tag_{name}.mp4"
        sh(cmd)
        tag = sh(f"ffprobe -v error -select_streams v -show_entries stream=codec_tag_string -of csv=p=0 tag_{name}.mp4").stdout.strip()
        res[f"tag_{name}"] = {"cmd": cmd, "codec_tag_string": tag}
        log(f"  tag {name}: {tag}")
    md = "G(13250,34500)B(7500,3000)R(34000,16000)WP(15635,16450)L(10000000,1)"
    cmd = ("ffmpeg -hide_banner -y -f lavfi -i testsrc2=size=1920x1080:rate=30 -t 1 -vf format=yuv420p10le "
           "-c:v libx265 -preset ultrafast -profile:v main10 -tag:v hvc1 "
           "-color_primaries bt2020 -color_trc smpte2084 -colorspace bt2020nc "
           f"-x265-params \"colorprim=bt2020:transfer=smpte2084:colormatrix=bt2020nc:master-display={md}:max-cll=1000,400:repeat-headers=1\" hdr10.mp4")
    p = sh(cmd)
    open("hdr10.encode.txt", "w").write(cmd + "\n" + p.stderr)
    fr = sh("ffprobe -v error -select_streams v -read_intervals %+#1 -show_frames -show_entries "
            "frame=pix_fmt,color_primaries,color_transfer,color_space:frame_side_data -of json hdr10.mp4").stdout
    st = sh("ffprobe -v error -select_streams v -show_entries stream=profile,codec_tag_string,pix_fmt,color_transfer,color_primaries,color_space -of json hdr10.mp4").stdout
    res["hdr10"] = {"cmd": cmd, "first_frame": json.loads(fr), "stream": json.loads(st)}
    log("  hdr10 frame " + fr.replace("\n", " ")[:900])
    cmd = ("ffmpeg -hide_banner -y -f lavfi -i testsrc2=size=1920x1080:rate=30 -t 1 -vf format=yuv420p10le "
           "-c:v libx265 -preset ultrafast -profile:v main10 -tag:v hvc1 "
           "-color_primaries bt2020 -color_trc arib-std-b67 -colorspace bt2020nc "
           "-x265-params \"colorprim=bt2020:transfer=arib-std-b67:colormatrix=bt2020nc\" hlg.mp4")
    sh(cmd)
    fr = sh("ffprobe -v error -select_streams v -read_intervals %+#1 -show_frames -show_entries "
            "frame=pix_fmt,color_primaries,color_transfer,color_space:frame_side_data -of json hlg.mp4").stdout
    res["hlg"] = {"cmd": cmd, "first_frame": json.loads(fr)}
    log("  hlg frame " + fr.replace("\n", " ")[:600])
    results["hevc"] = res


def part_compare():
    log("== same VMAF target compare")
    res = {}
    for enc, preset, lo, hi in [("x264", "medium", 10, 40), ("x265", "medium", 10, 40), ("svt", 8, 10, 60)]:
        c = bisect(enc, preset, lo, hi)
        res[f"{enc}_{preset}"] = c
        log(f"  {enc} {preset} -> crf {c}")
    c8 = res["svt_8"] or 35
    c = bisect("svt", 4, max(10, c8 - 4), min(63, c8 + 8))
    res["svt_4"] = c
    log(f"  svt 4 -> crf {c}")
    results["compare_choice"] = res


def part_svt_presets():
    log("== svt presets at crf 35")
    res = {}
    for p in [4, 6, 8, 10]:
        res[str(p)] = encode("svt", p, 35)
    results["svt_presets_crf35"] = {k: f"svt_{k}_crf35" for k in res}
    # default banner
    p = sh(f"ffmpeg -hide_banner -y -i {REF} -an -frames:v 24 -c:v libsvtav1 svt_default.mp4")
    open("svt_default.stderr.txt", "w").write(p.stderr)
    results["svt_default_log"] = [l for l in p.stderr.splitlines() if "Svt" in l or "SVT" in l][:40]


try:
    log("start; uptime " + sh("uptime").stdout.strip())
    part_h264_headers()
    part_decode_order()
    part_hevc_tags_hdr()
    part_twopass()
    part_compare()
    part_svt_presets()
    results["finished"] = time.strftime("%Y-%m-%dT%H:%M:%S%z")
    log("end; uptime " + sh("uptime").stdout.strip())
finally:
    stop = True
    json.dump(results, open("results.json", "w"), indent=1, ensure_ascii=False)
    json.dump(cache, open("encodes.json", "w"), indent=1, ensure_ascii=False)
    open("DONE", "w").write(time.strftime("%Y-%m-%dT%H:%M:%S%z"))
