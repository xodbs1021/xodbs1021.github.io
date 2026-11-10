// Loop clips (≤12s, silent) play only while at least half on screen and pause when they leave.
// Readers who prefer reduced motion get the poster and a play button instead of autoplay.
// The button sits outside the frame so it is reachable by keyboard (WCAG 2.2.2 pause, stop, hide).
const reduced = matchMedia('(prefers-reduced-motion: reduce)');

function setupLoop(figure: HTMLElement, video: HTMLVideoElement, frame: HTMLElement) {
  const button = figure.querySelector<HTMLButtonElement>('.motion-toggle');
  if (!button) return;
  // Native controls are only the no-JavaScript fallback; the button replaces them.
  video.controls = false;
  button.hidden = false;
  let userPaused = reduced.matches;
  let onScreen = false;
  const label = () => {
    const playing = !video.paused;
    button.textContent = playing ? '일시정지' : '재생';
    button.dataset.state = playing ? 'playing' : 'paused';
  };
  const sync = () => {
    if (onScreen && !userPaused) video.play().catch(() => label());
    else if (!video.paused) video.pause();
  };
  button.addEventListener('click', () => {
    userPaused = !video.paused;
    if (userPaused) video.pause();
    else video.play().catch(() => label());
  });
  video.addEventListener('play', label);
  video.addEventListener('pause', label);
  new IntersectionObserver(entries => {
    onScreen = entries[entries.length - 1].isIntersecting;
    sync();
  }, {threshold: 0.5}).observe(frame);
  label();
}

export function setupMotion() {
  for (const figure of document.querySelectorAll<HTMLElement>('.motion-figure')) {
    const video = figure.querySelector<HTMLVideoElement>('video');
    const frame = figure.querySelector<HTMLElement>('.motion-frame');
    if (!video || !frame) continue;
    // The poster picture stays until the first frame is on screen, then the video covers it.
    video.addEventListener('playing', () => frame.classList.add('is-started'), {once: true});
    if (figure.dataset.play === 'loop') setupLoop(figure, video, frame);
  }
}
