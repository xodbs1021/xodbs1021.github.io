import sys, time, threading, urllib.request, json, statistics, re
def get(url):
    t = time.time()
    try:
        r = urllib.request.urlopen(url, timeout=30); b = r.read(); st = r.status; h = dict(r.headers)
    except urllib.error.HTTPError as e:
        b = e.read(); st = e.code; h = dict(e.headers)
    return st, h, b, t, time.time()
def pct(a, p):
    a = sorted(a); return a[min(len(a)-1, int(round(p/100*(len(a)-1))))]
mode = sys.argv[1]
if mode == 'herd':
    prefix, port, name, n = sys.argv[2], sys.argv[3], sys.argv[4], int(sys.argv[5])
    bar = threading.Barrier(n); res = [None]*n
    def w(i):
        url = f"http://edge{i%4+1}:{port}/{prefix}/{name}.ts"
        bar.wait(); st, h, b, t0, t1 = get(url); res[i] = (st, h.get('X-Cache'), t1-t0, len(b))
    th = [threading.Thread(target=w, args=(i,)) for i in range(n)]
    [x.start() for x in th]; [x.join() for x in th]
    lat = [r[2] for r in res]; cache = {}
    for r in res: cache[r[1]] = cache.get(r[1], 0) + 1
    print(json.dumps({'name': name, 'prefix': prefix, 'port': port, 'n': n, 'status': sorted(set(r[0] for r in res)),
        'x_cache': cache, 'lat_p50_ms': round(pct(lat,50)*1000), 'lat_p95_ms': round(pct(lat,95)*1000), 'lat_max_ms': round(max(lat)*1000),
        'bytes_ok': all(r[3] == 1_000_000 for r in res)}))
elif mode == 'late404':
    port, name = sys.argv[2], sys.argv[3]
    url = f"http://edge1:{port}/lock/{name}.ts"; t0 = time.time(); out = []
    while time.time() - t0 < 16:
        st, h, b, a, z = get(url); out.append((round(a - t0, 2), st, h.get('X-Cache'))); time.sleep(0.25)
    first200 = next((o for o in out if o[1] == 200), None)
    print(json.dumps({'name': name, 'first_request_s': 0, 'origin_ready_s': 3.0, 'first_200_at_s': first200[0] if first200 else None,
        'trace': [o for i, o in enumerate(out) if i == 0 or out[i-1][1:] != o[1:]]}))
elif mode == 'playlist':
    kind, port, dur, name = sys.argv[2], sys.argv[3], float(sys.argv[4]), sys.argv[5]
    ages, lags = [], []; L = threading.Lock(); stop = time.time() + dur
    def w(i):
        k = 0
        while time.time() < stop:
            url = f"http://edge{(i+k)%4+1}:{port}/{kind}/{name}.m3u8"; k += 1
            st, h, b, a, z = get(url); s = b.decode()
            gen = float(re.search(r'#GEN:([\d.]+)', s).group(1)); seq = int(re.search(r'MEDIA-SEQUENCE:(\d+)', s).group(1))
            with L: ages.append(z - gen); lags.append(int(z // 2) - seq)
            time.sleep(0.5)
    th = [threading.Thread(target=w, args=(i,)) for i in range(20)]
    [x.start() for x in th]; [x.join() for x in th]
    lc = {}
    for x in lags: lc[x] = lc.get(x, 0) + 1
    print(json.dumps({'kind': kind, 'port': port, 'responses': len(ages), 'age_p50_ms': round(pct(ages,50)*1000), 'age_p95_ms': round(pct(ages,95)*1000),
        'age_max_ms': round(max(ages)*1000), 'segments_behind': dict(sorted(lc.items()))}))
elif mode == 'idle':
    kind, port, name, idle = sys.argv[2], sys.argv[3], sys.argv[4], float(sys.argv[5])
    url = f"http://edge1:{port}/{kind}/{name}.m3u8"; out = []
    for step in range(3):
        st, h, b, a, z = get(url); s = b.decode()
        gen = float(re.search(r'#GEN:([\d.]+)', s).group(1)); seq = int(re.search(r'MEDIA-SEQUENCE:(\d+)', s).group(1))
        out.append({'after_idle_s': idle if step else 0, 'x_cache': h.get('X-Cache'), 'age_ms': round((z-gen)*1000), 'segments_behind': int(z//2)-seq})
        if step == 0: time.sleep(idle)
        else: time.sleep(0.6)
    print(json.dumps({'kind': kind, 'name': name, 'trace': out}))
