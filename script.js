// Footer year
document.getElementById('year').textContent = new Date().getFullYear();

// Scroll reveal
const revealEls = document.querySelectorAll('.reveal');
const io = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting){
      entry.target.classList.add('in-view');
      io.unobserve(entry.target);
    }
  });
}, { threshold: 0.15, rootMargin: '0px 0px -60px 0px' });
revealEls.forEach(el => io.observe(el));

// Stat counters — count up when the stats section scrolls into view
const statEls = document.querySelectorAll('.stat-number');
const statsIO = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (!entry.isIntersecting) return;
    statsIO.unobserve(entry.target);
    const el = entry.target;
    const target = parseFloat(el.dataset.target);
    const suffix = el.dataset.suffix || '';
    if (!target){ return; } // leave placeholder "—" until a real number is set
    const duration = 1400;
    const start = performance.now();
    function tick(now){
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const value = Math.floor(eased * target);
      el.textContent = value.toLocaleString() + suffix;
      if (progress < 1) requestAnimationFrame(tick);
      else el.textContent = target.toLocaleString() + suffix;
    }
    requestAnimationFrame(tick);
  });
}, { threshold: 0.4 });
statEls.forEach(el => statsIO.observe(el));

// Custom cursor (desktop / fine pointer only)
const cursor = document.getElementById('cursorDot');
const cursorLabel = cursor ? cursor.querySelector('.cursor-label') : null;
const canHover = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

if (canHover && cursor){
  let x = 0, y = 0, cx = 0, cy = 0;
  window.addEventListener('mousemove', (e) => {
    x = e.clientX; y = e.clientY;
    cursor.classList.add('active');
  });
  document.addEventListener('mouseleave', () => cursor.classList.remove('active'));

  function loop(){
    cx += (x - cx) * 0.25;
    cy += (y - cy) * 0.25;
    cursor.style.transform = `translate(${cx}px, ${cy}px) translate(-50%, -50%)`;
    requestAnimationFrame(loop);
  }
  loop();

  document.querySelectorAll('a, button').forEach(el => {
    el.addEventListener('mouseenter', () => cursor.classList.add('grow'));
    el.addEventListener('mouseleave', () => cursor.classList.remove('grow'));
  });

  document.querySelectorAll('.work-card').forEach(el => {
    el.addEventListener('mouseenter', () => {
      cursor.classList.add('grow');
      if (cursorLabel) cursorLabel.textContent = 'VIEW';
    });
    el.addEventListener('mouseleave', () => {
      cursor.classList.remove('grow');
      if (cursorLabel) cursorLabel.textContent = '';
    });
  });

  document.querySelectorAll('.hero-reel').forEach(el => {
    el.addEventListener('mouseenter', () => {
      cursor.classList.add('grow');
      if (cursorLabel) cursorLabel.textContent = 'PLAY';
    });
    el.addEventListener('mouseleave', () => {
      cursor.classList.remove('grow');
      if (cursorLabel) cursorLabel.textContent = '';
    });
  });
}

// Play/pause hover-preview videos in work cards (once real <video> tags are added)
document.querySelectorAll('.work-card video').forEach(video => {
  const card = video.closest('.work-card');
  card.addEventListener('mouseenter', () => video.play().catch(() => {}));
  card.addEventListener('mouseleave', () => { video.pause(); video.currentTime = 0; });
});
