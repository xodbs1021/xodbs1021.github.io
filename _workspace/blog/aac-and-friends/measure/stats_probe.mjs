import { chromium } from 'playwright';
const browser = await chromium.launch({ executablePath: '<Google Chrome 157 실행 파일>', headless: true, args: ['--autoplay-policy=no-user-gesture-required'] });
const page = await browser.newPage();
await page.goto('about:blank');
const out = await page.evaluate(async () => {
  const ctx = new AudioContext();
  const osc = ctx.createOscillator(); const dst = ctx.createMediaStreamDestination();
  osc.connect(dst); osc.start();
  const a = new RTCPeerConnection(), b = new RTCPeerConnection();
  a.onicecandidate = e => e.candidate && b.addIceCandidate(e.candidate);
  b.onicecandidate = e => e.candidate && a.addIceCandidate(e.candidate);
  dst.stream.getAudioTracks().forEach(t => a.addTrack(t, dst.stream));
  b.ontrack = e => { const el = new Audio(); el.srcObject = e.streams[0]; el.muted = true; el.play().catch(() => {}); };
  await a.setLocalDescription(await a.createOffer()); await b.setRemoteDescription(a.localDescription);
  await b.setLocalDescription(await b.createAnswer()); await a.setRemoteDescription(b.localDescription);
  // --- code shown in the post ---
  async function audioInbound(pc) {
    const report = await pc.getStats();
    for (const s of report.values()) {
      if (s.type === 'inbound-rtp' && s.kind === 'audio') {
        const codec = report.get(s.codecId);
        return { t: s.timestamp, bytes: s.bytesReceived, lost: s.packetsLost, recv: s.packetsReceived,
                 concealed: s.concealedSamples, fec: s.fecPacketsReceived, mime: codec && codec.mimeType, fmtp: codec && codec.sdpFmtpLine };
      }
    }
  }
  await new Promise(r => setTimeout(r, 3000));
  const s1 = await audioInbound(b);
  await new Promise(r => setTimeout(r, 2000));
  const s2 = await audioInbound(b);
  const kbps = (s2.bytes - s1.bytes) * 8 / (s2.t - s1.t);
  const lostRate = (s2.lost - s1.lost) / ((s2.lost - s1.lost) + (s2.recv - s1.recv));
  a.close(); b.close(); osc.stop(); await ctx.close();
  return { s1, s2, kbps, lostRate };
});
console.log(JSON.stringify(out, null, 1));
await browser.close();
