// Footer year
document.getElementById('year').textContent = new Date().getFullYear();

const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const canHover = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

function staggerIn(els, gap){
  els.forEach((el, i) => {
    setTimeout(() => el.classList.add('in-view'), i * gap);
  });
}

// ---------- squiggle draw-on ----------
const squiggle = document.getElementById('squiggle');
let drawSquiggle = () => {};
if (squiggle){
  const path = squiggle.querySelector('path');
  const len = path.getTotalLength();
  path.style.strokeDasharray = len;
  path.style.strokeDashoffset = len;
  drawSquiggle = () => { path.style.strokeDashoffset = 0; };
}

// ---------- intro entrance ----------
const intro = document.getElementById('intro');
const heroReveals = Array.from(document.querySelectorAll('#top .reveal'));
const introMark = document.getElementById('introMark');
const introCounter = document.getElementById('introCounter');
const introBarFill = document.getElementById('introBarFill');

// split the wordmark into per-letter spans for a stagger-in effect
if (introMark){
  const text = introMark.textContent;
  introMark.innerHTML = '';
  [...text].forEach((ch, i) => {
    const span = document.createElement('span');
    span.className = 'ch' + (ch === '.' ? ' dot' : '');
    span.textContent = ch;
    span.style.animationDelay = (i * 0.045) + 's';
    introMark.appendChild(span);
  });
}

if (intro){
  if (reducedMotion){
    intro.remove();
    staggerIn(heroReveals, 0);
    drawSquiggle();
  } else {
    document.body.classList.add('intro-lock');

    // counter 00 -> 100 synced with the loading bar
    const counterDuration = 850;
    const counterStart = performance.now();
    function tickCounter(now){
      const p = Math.min((now - counterStart) / counterDuration, 1);
      const val = Math.floor(p * 100);
      if (introCounter) introCounter.textContent = String(val).padStart(2, '0');
      if (introBarFill) introBarFill.style.width = (p * 100) + '%';
      if (p < 1) requestAnimationFrame(tickCounter);
    }
    requestAnimationFrame(tickCounter);

    setTimeout(() => {
      intro.classList.add('hide');
      document.body.classList.remove('intro-lock');
      staggerIn(heroReveals, 100);
      setTimeout(drawSquiggle, 550);
    }, 1080);

    intro.addEventListener('transitionend', (e) => {
      if (e.propertyName === 'transform') intro.classList.add('done');
    });
  }
} else {
  drawSquiggle();
}

// ---------- scroll reveal (everything outside the hero) ----------
const revealEls = document.querySelectorAll('.reveal:not(#top .reveal)');
const io = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting){
      entry.target.classList.add('in-view');
      io.unobserve(entry.target);
    }
  });
}, { threshold: 0.15, rootMargin: '0px 0px -60px 0px' });
revealEls.forEach(el => io.observe(el));

// ---------- stat counters ----------
const statEls = document.querySelectorAll('.stat-number');
const statsIO = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (!entry.isIntersecting) return;
    statsIO.unobserve(entry.target);
    const el = entry.target;
    const target = parseFloat(el.dataset.target);
    const suffix = el.dataset.suffix || '';
    if (!target){ return; }
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

// ---------- journey timeline: scroll-progress fill ----------
const timelineWrap = document.querySelector('.timeline-wrap');
const timelineFill = document.getElementById('timelineFill');
const timelineItems = Array.from(document.querySelectorAll('.timeline-item'));
if (timelineWrap && timelineFill && timelineItems.length){
  function updateTimeline(){
    const rect = timelineWrap.getBoundingClientRect();
    const vh = window.innerHeight;
    const progressPx = Math.min(Math.max(vh * 0.65 - rect.top, 0), rect.height);
    timelineFill.style.height = progressPx + 'px';
    timelineItems.forEach(item => {
      const dot = item.querySelector('.timeline-dot');
      const dotOffset = dot.offsetTop;
      item.classList.toggle('active', dotOffset <= progressPx + 4);
    });
  }
  window.addEventListener('scroll', updateTimeline, { passive: true });
  window.addEventListener('resize', updateTimeline);
  updateTimeline();
}

// ---------- custom cursor ----------
const cursor = document.getElementById('cursorDot');
const cursorLabel = cursor ? cursor.querySelector('.cursor-label') : null;

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

// ---------- magnetic buttons ----------
if (canHover){
  document.querySelectorAll('.magnetic').forEach(btn => {
    btn.addEventListener('mousemove', (e) => {
      const r = btn.getBoundingClientRect();
      const relX = e.clientX - r.left - r.width / 2;
      const relY = e.clientY - r.top - r.height / 2;
      btn.style.transform = `translate(${relX * 0.25}px, ${relY * 0.35}px)`;
    });
    btn.addEventListener('mouseleave', () => { btn.style.transform = ''; });
  });
}

// ---------- light parallax (only once an element has revealed) ----------
const parallaxEls = document.querySelectorAll('[data-parallax]');
if (parallaxEls.length && !reducedMotion){
  function onScrollParallax(){
    const vh = window.innerHeight;
    parallaxEls.forEach(el => {
      if (!el.classList.contains('in-view')) return;
      const speed = parseFloat(el.dataset.parallax) || 0.05;
      const rect = el.getBoundingClientRect();
      const center = rect.top + rect.height / 2 - vh / 2;
      el.style.transform = `translateY(${center * -speed}px)`;
    });
  }
  window.addEventListener('scroll', onScrollParallax, { passive: true });
  const warmup = setInterval(onScrollParallax, 300);
  setTimeout(() => clearInterval(warmup), 4000);
}

// ---------- smoother scroll: eased wheel glide (desktop only) ----------
if (canHover && !reducedMotion){
  let targetY = window.scrollY;
  let currentY = window.scrollY;
  let raf = null;
  const ease = 0.085;

  function glide(){
    currentY += (targetY - currentY) * ease;
    if (Math.abs(targetY - currentY) < 0.4){
      currentY = targetY;
      window.scrollTo({ top: currentY, behavior: 'instant' });
      raf = null;
      return;
    }
    window.scrollTo({ top: currentY, behavior: 'instant' });
    raf = requestAnimationFrame(glide);
  }

  window.addEventListener('wheel', (e) => {
    if (e.ctrlKey) return; // let pinch-zoom behave natively
    e.preventDefault();
    const max = document.documentElement.scrollHeight - window.innerHeight;
    targetY = Math.min(Math.max(targetY + e.deltaY, 0), max);
    if (!raf) raf = requestAnimationFrame(glide);
  }, { passive: false });

  // keep target in sync with keyboard / scrollbar-drag scrolling
  window.addEventListener('scroll', () => {
    if (!raf){ targetY = window.scrollY; currentY = window.scrollY; }
  }, { passive: true });
}

// ---------- work card hover-preview video ----------
document.querySelectorAll('.work-card video').forEach(video => {
  const card = video.closest('.work-card');
  card.addEventListener('mouseenter', () => video.play().catch(() => {}));
  card.addEventListener('mouseleave', () => { video.pause(); video.currentTime = 0; });
});

// ---------- project case-study modal ----------
const modal = document.getElementById('projectModal');
if (modal){
  const coverImg = modal.querySelector('.project-modal-cover-img');
  const coverWrap = modal.querySelector('.project-modal-cover');
  const titleEl = modal.querySelector('.project-modal-title');
  const tagsEl = modal.querySelector('.project-modal-tags');
  const clientEl = modal.querySelector('.project-modal-client');
  const briefEl = modal.querySelector('.project-modal-brief');
  const processEl = modal.querySelector('.project-modal-process');
  const outcomeEl = modal.querySelector('.project-modal-outcome');
  const resultEl = modal.querySelector('.result-badge');
  let lastFocused = null;

  function openModal(card){
    titleEl.textContent = card.dataset.title || '';
    clientEl.textContent = card.dataset.client || '';
    briefEl.textContent = card.dataset.brief || '';
    processEl.textContent = card.dataset.process || '';
    outcomeEl.textContent = card.dataset.outcome || '';
    resultEl.textContent = card.dataset.result || '';

    tagsEl.innerHTML = '';
    (card.dataset.tags || '').split('·').map(t => t.trim()).filter(Boolean).forEach(t => {
      const span = document.createElement('span');
      span.textContent = t;
      tagsEl.appendChild(span);
    });

    coverWrap.classList.remove('no-cover');
    coverImg.style.display = 'none';
    coverImg.removeAttribute('src');
    const coverSrc = card.dataset.cover;
    if (coverSrc){
      coverImg.onload = () => { coverImg.style.display = 'block'; };
      coverImg.onerror = () => { coverImg.style.display = 'none'; };
      coverImg.src = coverSrc;
    }

    lastFocused = document.activeElement;
    modal.classList.add('open');
    modal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    modal.querySelector('.project-modal-close').focus();
  }

  function closeModal(){
    modal.classList.remove('open');
    modal.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
    if (lastFocused) lastFocused.focus();
  }

  document.querySelectorAll('.work-card').forEach(card => {
    card.addEventListener('click', () => openModal(card));
    card.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' '){
        e.preventDefault();
        openModal(card);
      }
    });
  });

  modal.querySelectorAll('[data-close]').forEach(el => el.addEventListener('click', closeModal));
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modal.classList.contains('open')) closeModal();
  });
}

// ---------- journey: horizontal pinned scroll (desktop only) ----------
const journeyPinWrap = document.getElementById('journeyPinWrap');
const journeyTrack = document.getElementById('journeyTrack');
const journeyProgressFill = document.getElementById('journeyProgressFill');
const journeyDesktopMQ = window.matchMedia('(min-width: 900px)');

if (journeyPinWrap && journeyTrack && journeyProgressFill && !reducedMotion){
  function updateJourneyPin(){
    if (!journeyDesktopMQ.matches){
      journeyTrack.style.transform = '';
      journeyProgressFill.style.width = '0%';
      return;
    }
    const rect = journeyPinWrap.getBoundingClientRect();
    const wrapHeight = journeyPinWrap.offsetHeight;
    const vh = window.innerHeight;
    const scrollable = wrapHeight - vh;
    let progress = scrollable > 0 ? (-rect.top) / scrollable : 0;
    progress = Math.min(Math.max(progress, 0), 1);
    const maxTranslate = Math.max(journeyTrack.scrollWidth - journeyTrack.clientWidth, 0);
    journeyTrack.style.transform = `translateX(-${progress * maxTranslate}px)`;
    journeyProgressFill.style.width = (progress * 100) + '%';
  }
  window.addEventListener('scroll', updateJourneyPin, { passive: true });
  window.addEventListener('resize', updateJourneyPin);
  updateJourneyPin();
}

// ---------- mobile nav (hamburger toggle) ----------
const navBurger = document.getElementById('navBurger');
const navMobile = document.getElementById('navMobile');
if (navBurger && navMobile){
  function closeMobileNav(){
    navBurger.setAttribute('aria-expanded', 'false');
    navMobile.classList.remove('open');
    document.body.classList.remove('nav-open');
  }
  function toggleMobileNav(){
    const open = navMobile.classList.toggle('open');
    navBurger.setAttribute('aria-expanded', String(open));
    document.body.classList.toggle('nav-open', open);
  }
  navBurger.addEventListener('click', toggleMobileNav);
  navMobile.querySelectorAll('a').forEach(a => a.addEventListener('click', closeMobileNav));
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && navMobile.classList.contains('open')) closeMobileNav();
  });
}

// ---------- contact email: custom cursor label ----------
if (canHover && cursor){
  document.querySelectorAll('.contact-email-btn').forEach(el => {
    el.addEventListener('mouseenter', () => {
      cursor.classList.add('grow');
      if (cursorLabel) cursorLabel.textContent = 'SEND';
    });
    el.addEventListener('mouseleave', () => {
      cursor.classList.remove('grow');
      if (cursorLabel) cursorLabel.textContent = '';
    });
  });
}
