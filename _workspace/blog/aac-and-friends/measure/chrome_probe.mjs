import { chromium } from 'playwright';
const browser = await chromium.launch({ executablePath: '<Google Chrome 157 실행 파일>', headless: true });
const page = await browser.newPage();
await page.goto('about:blank');
const res = await page.evaluate(async () => {
  const types = [
    'audio/mp4; codecs="mp4a.40.2"', 'audio/mp4; codecs="mp4a.40.5"', 'audio/mp4; codecs="mp4a.40.29"', 'audio/mp4; codecs="mp4a.40.42"',
    'audio/mp4; codecs="mp4a.40.23"', 'audio/mp4; codecs="mp4a.40.39"', 'audio/mp4; codecs="mp4a.40.34"', 'audio/mp4; codecs="mp4a.69"', 'audio/mpeg',
    'audio/mp4; codecs="opus"', 'audio/webm; codecs="opus"', 'audio/mp4; codecs="flac"', 'audio/mp4; codecs="ac-3"', 'audio/mp4; codecs="ec-3"',
    'audio/aac', 'video/mp4; codecs="avc1.42c01e,mp4a.40.2"', 'video/mp4; codecs="avc1.42c01e,mp4a.40.5"'
  ];
  const mse = {};
  for (const t of types) mse[t] = MediaSource.isTypeSupported(t);
  const di = {};
  for (const c of ['mp4a.40.2','mp4a.40.5','mp4a.40.29','opus','ac-3','ec-3','flac']) {
    try { const r = await navigator.mediaCapabilities.decodingInfo({ type: 'media-source', audio: { contentType: `audio/mp4; codecs="${c}"`, channels: '2', bitrate: 128000, samplerate: 48000 } }); di[c] = r.supported; } catch (e) { di[c] = 'err ' + e.message; }
  }
  const pc = new RTCPeerConnection();
  pc.addTransceiver('audio');
  const offer = await pc.createOffer();
  pc.close();
  const lines = offer.sdp.split('\r\n').filter(l => /^m=audio|opus|red\/|a=fmtp:|a=rtpmap|ptime/i.test(l));
  return { ua: navigator.userAgent, mse, di, sdp: lines };
});
console.log(JSON.stringify(res, null, 1));
await browser.close();
