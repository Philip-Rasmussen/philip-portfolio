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

// Custom cursor (desktop / fine pointer only)
const cursor = document.getElementById('cursorDot');
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

  document.querySelectorAll('a, button, .work-card').forEach(el => {
    el.addEventListener('mouseenter', () => cursor.classList.add('grow'));
    el.addEventListener('mouseleave', () => cursor.classList.remove('grow'));
  });
}

// Play/pause hover-preview videos in work cards (once real <video> tags are added)
document.querySelectorAll('.work-card video').forEach(video => {
  const card = video.closest('.work-card');
  card.addEventListener('mouseenter', () => video.play().catch(() => {}));
  card.addEventListener('mouseleave', () => { video.pause(); video.currentTime = 0; });
});
