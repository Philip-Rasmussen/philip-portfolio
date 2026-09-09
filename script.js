// always start a fresh load (refresh included) at the top of the page with
// every scroll-triggered animation reset, instead of the browser silently
// restoring your old scroll position and making it look like nothing played
if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
window.scrollTo(0, 0);
window.addEventListener('pageshow', (e) => {
  if (e.persisted) window.scrollTo(0, 0); // back/forward-cache restores
});

// Footer year
document.getElementById('year').textContent = new Date().getFullYear();

const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const canHover = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

// batches a scroll handler to run at most once per animation frame — native
// 'scroll' events can fire faster than the display refreshes, and re-running
// several getBoundingClientRect-heavy handlers that often was a source of
// jank independent of however the scroll itself was driven
function rafThrottle(fn){
  let ticking = false;
  return function throttled(...args){
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      fn.apply(this, args);
      ticking = false;
    });
  };
}

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

// ---------- intro entrance: pixel-tile dissolve ----------
const intro = document.getElementById('intro');
const introGrid = document.getElementById('introGrid');
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

    // build the pixel-tile grid that will dissolve away
    const cols = 12, rows = 7;
    const tiles = [];
    if (introGrid){
      intro.style.setProperty('--intro-cols', cols);
      intro.style.setProperty('--intro-rows', rows);
      const frag = document.createDocumentFragment();
      for (let r = 0; r < rows; r++){
        for (let c = 0; c < cols; c++){
          const tile = document.createElement('div');
          tile.className = 'intro-tile';
          frag.appendChild(tile);
          tiles.push({ el: tile, r, c });
        }
      }
      introGrid.appendChild(frag);
    }

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

      // dissolve the tiles in a diagonal wave, with a touch of randomness per tile
      const maxWave = cols + rows;
      tiles.forEach(({ el, r, c }) => {
        const wave = (r + c) / maxWave; // 0 -> 1 across the diagonal
        const jitter = Math.random() * 0.12;
        const delay = (wave * 480) + (jitter * 300);
        el.style.transitionDelay = delay + 'ms';
        el.classList.add('out');
      });

      setTimeout(() => intro.classList.add('done'), 1320);
    }, 1080);
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
    if (reducedMotion){
      el.textContent = target.toLocaleString() + suffix;
      return;
    }
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

// ---------- seamless marquees: repeat the content enough times that the
// track is always wider than 2x the viewport, so the -50% loop point never
// runs out of text (which showed up as a bare stretch of empty bar on wide
// screens) — re-measured on resize and once webfonts swap in. The animation
// duration is derived from the final track width so the scroll speed (px/s)
// stays constant no matter how many copies got added — otherwise adding
// more copies to close the gap on a wide screen also sped the whole thing up.
function ensureSeamlessMarquee(track, speedPxPerSec){
  if (!track) return;
  const unit = track.innerHTML;
  function fill(){
    const probe = document.createElement('div');
    probe.style.cssText = 'position:absolute; visibility:hidden; pointer-events:none; white-space:nowrap; display:flex; align-items:center; left:-9999px;';
    probe.style.gap = getComputedStyle(track).gap;
    probe.innerHTML = unit;
    document.body.appendChild(probe);
    const unitWidth = probe.scrollWidth || 200;
    document.body.removeChild(probe);

    let copies = Math.ceil((window.innerWidth * 2.2) / unitWidth);
    if (copies < 4) copies = 4;
    if (copies % 2 !== 0) copies += 1; // keep the -50% loop point on a seam
    track.innerHTML = unit.repeat(copies);

    const totalWidth = track.scrollWidth || (unitWidth * copies);
    const distance = totalWidth / 2; // the keyframes travel from 0 to -50%
    track.style.animationDuration = (distance / speedPxPerSec) + 's';
  }
  fill();
  let resizeTimer;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(fill, 200);
  });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(fill);
}
ensureSeamlessMarquee(document.getElementById('marqueeTrack'), 55);
ensureSeamlessMarquee(document.getElementById('contactMarqueeTrack'), 28);

// ---------- journey timeline: zigzag path connecting each milestone, drawn in
// as you scroll, plus a rolling odometer step number per card ----------
const timelineWrap = document.getElementById('timelineWrap');
const timelineSvg = document.getElementById('timelinePath');
const timelinePathTrack = document.getElementById('timelinePathTrack');
const timelinePathFill = document.getElementById('timelinePathFill');
const timelineItems = Array.from(document.querySelectorAll('.timeline-item'));

// build each "01".."05" step number into a per-digit odometer strip.
// Every row is pinned to the same *integer* pixel height (measured once,
// then applied explicitly) instead of trusting `1em` on both the mask and
// the rows to agree — browsers can round those independently by a
// fraction of a pixel, which let a sliver of the neighbouring digit peek
// through the mask on every non-zero digit.
timelineItems.forEach(item => {
  const indexEl = item.querySelector('.timeline-index');
  if (!indexEl || indexEl.dataset.built) return;
  const digits = indexEl.textContent.trim().split('');
  const rowPx = Math.round(indexEl.getBoundingClientRect().height) || 1;
  indexEl.textContent = '';
  digits.forEach(d => {
    const mask = document.createElement('span');
    mask.className = 'digit-mask';
    mask.style.height = rowPx + 'px';
    const track = document.createElement('span');
    track.className = 'digit-track';
    track.dataset.target = d;
    track.dataset.rowPx = rowPx;
    for (let n = 0; n <= 9; n++){
      const s = document.createElement('span');
      s.textContent = n;
      s.style.height = rowPx + 'px';
      track.appendChild(s);
    }
    mask.appendChild(track);
    indexEl.appendChild(mask);
  });
  indexEl.dataset.built = 'true';
});

function rollOdometer(item){
  item.querySelectorAll('.digit-track').forEach(track => {
    if (track.dataset.rolled) return;
    const target = parseInt(track.dataset.target, 10) || 0;
    const rowPx = parseInt(track.dataset.rowPx, 10) || 0;
    track.style.transform = `translateY(${-target * rowPx}px)`;
    track.dataset.rolled = 'true';
  });
}

if (timelineWrap && timelineSvg && timelineItems.length){
  function layoutPath(){
    const wrapRect = timelineWrap.getBoundingClientRect();
    timelineSvg.setAttribute('viewBox', `0 0 ${wrapRect.width} ${wrapRect.height}`);
    const points = timelineItems.map(item => {
      const dot = item.querySelector('.timeline-dot');
      const r = dot.getBoundingClientRect();
      // center point is stable whether or not the dot's pop-in scale has
      // played yet, since scale() doesn't move the element's own centre
      return { x: r.left + r.width / 2 - wrapRect.left, y: r.top + r.height / 2 - wrapRect.top };
    });
    // smooth flowing curve through every dot instead of sharp straight-
    // line zigzag joints: curve toward the midpoint between each pair of
    // points, using the point itself as the control handle
    let d = `M ${points[0].x},${points[0].y}`;
    for (let i = 1; i < points.length - 1; i++){
      const mx = (points[i].x + points[i + 1].x) / 2;
      const my = (points[i].y + points[i + 1].y) / 2;
      d += ` Q ${points[i].x},${points[i].y} ${mx},${my}`;
    }
    if (points.length > 1){
      const last = points[points.length - 1];
      d += ` L ${last.x},${last.y}`;
    }
    timelinePathTrack.setAttribute('d', d);
    timelinePathFill.setAttribute('d', d);
    const len = timelinePathFill.getTotalLength();
    timelinePathFill.style.strokeDasharray = len;
    timelinePathFill.style.strokeDashoffset = len;
    timelinePathFill.dataset.length = len;
  }

  function updateTimeline(){
    const vh = window.innerHeight;
    const len = parseFloat(timelinePathFill.dataset.length || '0');
    timelineItems.forEach((item, i) => {
      const dot = item.querySelector('.timeline-dot');
      const dotRect = dot.getBoundingClientRect();
      const passed = dotRect.top < vh * 0.72;
      item.classList.toggle('active', passed);
      if (passed) rollOdometer(item);
    });
    if (len){
      const wrapRect = timelineWrap.getBoundingClientRect();
      const progress = Math.min(Math.max((vh * 0.72 - wrapRect.top) / wrapRect.height, 0), 1);
      timelinePathFill.style.strokeDashoffset = len * (1 - progress);
    }
  }

  window.addEventListener('load', () => { layoutPath(); updateTimeline(); });
  window.addEventListener('resize', () => { layoutPath(); updateTimeline(); });
  window.addEventListener('scroll', rafThrottle(updateTimeline), { passive: true });
  // fonts loading late can shift layout; re-measure once ready
  if (document.fonts && document.fonts.ready){
    document.fonts.ready.then(() => { layoutPath(); updateTimeline(); });
  }
  layoutPath();
  updateTimeline();
}

// ---------- about: guided-reveal reading rail (same technique as Journey) ----------
const aboutSteps = document.getElementById('aboutSteps');
const aboutStepsFill = document.getElementById('aboutStepsFill');
const aboutStepEls = aboutSteps ? Array.from(aboutSteps.querySelectorAll('.about-step')) : [];
if (aboutSteps && aboutStepsFill && aboutStepEls.length){
  function updateAboutSteps(){
    const rect = aboutSteps.getBoundingClientRect();
    const vh = window.innerHeight;
    const progressPx = Math.min(Math.max(vh * 0.65 - rect.top, 0), rect.height);
    aboutStepsFill.style.height = progressPx + 'px';
    aboutStepEls.forEach(step => {
      const mid = step.offsetTop + step.offsetHeight / 2;
      step.classList.toggle('in-focus', mid <= progressPx);
    });
  }
  window.addEventListener('scroll', rafThrottle(updateAboutSteps), { passive: true });
  window.addEventListener('resize', updateAboutSteps);
  updateAboutSteps();
}

// ---------- toolkit: programs / skills switcher + staggered reveal ----------
const toolkitSection = document.getElementById('toolkit');
const toolkitPanels = toolkitSection ? Array.from(toolkitSection.querySelectorAll('.toolkit-panel')) : [];
const toolkitTabs = toolkitSection ? Array.from(toolkitSection.querySelectorAll('.toolkit-tab')) : [];
const toolkitPrev = document.getElementById('toolkitPrev');
const toolkitNext = document.getElementById('toolkitNext');

if (toolkitSection && toolkitPanels.length){
  const panelOrder = toolkitPanels.map(p => p.dataset.panel);
  let activeIndex = Math.max(0, panelOrder.indexOf(
    toolkitPanels.find(p => p.classList.contains('is-active'))?.dataset.panel
  ));

  function runToolkitChoreography(panel){
    const cards = Array.from(panel.querySelectorAll('.toolkit-card, .skill-card'));

    if (reducedMotion){
      cards.forEach(card => {
        card.classList.add('in-view');
        const level = card.querySelector('.toolkit-level');
        if (level){
          const fill = parseInt(level.dataset.fill, 10) || 0;
          Array.from(level.children).slice(0, fill).forEach(dot => dot.classList.add('filled'));
        }
      });
      return;
    }

    cards.forEach((card, i) => {
      card.classList.remove('in-view');
      // reset any previously-filled level dots so the meter can replay
      card.querySelectorAll('.toolkit-level span.filled').forEach(s => {
        s.classList.remove('filled');
        s.style.transitionDelay = '';
      });
    });
    // force a reflow so the removed classes actually register before we
    // re-add them — otherwise the browser coalesces it into a no-op
    void panel.offsetWidth;

    const CARD_STAGGER = 90; // ms between each card starting its entrance
    const CARD_DURATION = 500; // matches the .toolkit-card / .skill-card transition
    cards.forEach((card, i) => {
      setTimeout(() => {
        card.classList.add('in-view');
        const level = card.querySelector('.toolkit-level');
        if (level){
          const fill = parseInt(level.dataset.fill, 10) || 0;
          const dots = Array.from(level.children);
          // bar starts filling only once the card has finished popping in
          setTimeout(() => {
            dots.slice(0, fill).forEach((dot, di) => {
              dot.style.transitionDelay = (di * 70) + 'ms';
              dot.classList.add('filled');
            });
          }, CARD_DURATION * 0.5);
        }
      }, i * CARD_STAGGER);
    });
  }

  function showPanel(nextIndex, direction){
    nextIndex = (nextIndex + panelOrder.length) % panelOrder.length;
    if (nextIndex === activeIndex) return;
    const nextPanelName = panelOrder[nextIndex];
    const currentPanel = toolkitPanels[activeIndex];
    const nextPanel = toolkitPanels[nextIndex];

    currentPanel.classList.remove('is-active');
    nextPanel.style.setProperty('--enter-x', direction === 'prev' ? '-26px' : '26px');
    nextPanel.classList.add('is-active', 'is-entering');
    nextPanel.addEventListener('animationend', function handler(){
      nextPanel.classList.remove('is-entering');
      nextPanel.removeEventListener('animationend', handler);
    });

    toolkitTabs.forEach(tab => tab.classList.toggle('is-active', tab.dataset.panel === nextPanelName));
    activeIndex = nextIndex;
    runToolkitChoreography(nextPanel);
  }

  if (toolkitPrev) toolkitPrev.addEventListener('click', () => showPanel(activeIndex - 1, 'prev'));
  if (toolkitNext) toolkitNext.addEventListener('click', () => showPanel(activeIndex + 1, 'next'));
  toolkitTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const targetIndex = panelOrder.indexOf(tab.dataset.panel);
      showPanel(targetIndex, targetIndex > activeIndex ? 'next' : 'prev');
    });
  });

  // first-time entrance, once the card grid itself is actually on screen.
  // watching the whole section (heading + copy + tabs sit well above the
  // cards) meant the choreography could finish before the cards were ever
  // visible; watching the grid directly ties it to the thing that's
  // actually popping in.
  const toolkitCardGrid = document.getElementById('toolkitGrid') || toolkitSection;
  const toolkitIO = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting){
        runToolkitChoreography(toolkitPanels[activeIndex]);
        toolkitIO.unobserve(entry.target);
      }
    });
  }, { threshold: 0.15, rootMargin: '0px 0px -60px 0px' });
  toolkitIO.observe(toolkitCardGrid);
}

// ---------- custom cursor ----------
const cursor = document.getElementById('cursorDot');
const cursorLabel = cursor ? cursor.querySelector('.cursor-label') : null;

if (canHover && cursor){
  let x = 0, y = 0, cx = 0, cy = 0;
  let idleTimer = null;
  window.addEventListener('mousemove', (e) => {
    x = e.clientX; y = e.clientY;
    cursor.classList.add('active');
    // belt-and-braces #3: if the pointer just stops moving for a couple of
    // seconds (e.g. a screenshot is taken, or the tab is switched via a
    // method that doesn't fire blur/mouseleave), hide the dot anyway rather
    // than let it sit frozen wherever it last was
    clearTimeout(idleTimer);
    idleTimer = setTimeout(() => cursor.classList.remove('active'), 2500);
  });
  // belt-and-braces: hide the dot the moment the pointer actually leaves the
  // page (mouseleave on document can be flaky across browsers), moves onto
  // browser chrome, or the tab/window loses focus — otherwise it freezes
  // visible at its last position, which reads like a stray design element
  document.addEventListener('mouseleave', () => cursor.classList.remove('active'));
  document.addEventListener('mouseout', (e) => {
    if (!e.relatedTarget) cursor.classList.remove('active');
  });
  window.addEventListener('blur', () => cursor.classList.remove('active'));

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
  window.addEventListener('scroll', rafThrottle(onScrollParallax), { passive: true });
  const warmup = setInterval(onScrollParallax, 300);
  setTimeout(() => clearInterval(warmup), 4000);
}

// ---------- smooth scroll controller ----------
// one shared eased-glide engine drives both the desktop wheel feel and every
// in-page anchor link (nav, hero CTAs, footer "back to top"), so scrolling
// feels the same everywhere instead of switching between a custom glide for
// wheel input and the browser's own (differently-timed) smooth scroll for
// link clicks.
const smoothScroll = (() => {
  if (reducedMotion) return null;
  let targetY = window.scrollY;
  let currentY = window.scrollY;
  let raf = null;
  const ease = 0.12;

  function maxScroll(){
    return document.documentElement.scrollHeight - window.innerHeight;
  }

  function frame(){
    const dist = targetY - currentY;
    if (Math.abs(dist) < 0.5){
      currentY = targetY;
      window.scrollTo(0, currentY);
      raf = null;
      return;
    }
    currentY += dist * ease;
    window.scrollTo(0, currentY);
    raf = requestAnimationFrame(frame);
  }

  function start(){ if (!raf) raf = requestAnimationFrame(frame); }

  return {
    nudge(delta){
      targetY = Math.min(Math.max(targetY + delta, 0), maxScroll());
      start();
    },
    scrollTo(y){
      targetY = Math.min(Math.max(y, 0), maxScroll());
      start();
    },
    syncToNative(){
      if (!raf){ targetY = window.scrollY; currentY = window.scrollY; }
    },
    isGliding(){ return !!raf; }
  };
})();

if (canHover && smoothScroll){
  window.addEventListener('wheel', (e) => {
    if (e.ctrlKey) return; // let pinch-zoom behave natively
    if (document.querySelector('.project-modal.open')) return; // let the open case-study modal scroll natively
    e.preventDefault();
    smoothScroll.nudge(e.deltaY);
  }, { passive: false });

  // keep target in sync with keyboard / scrollbar-drag scrolling
  window.addEventListener('scroll', smoothScroll.syncToNative, { passive: true });
}

// route every in-page anchor link through the same smooth-scroll engine,
// landing a fixed distance below the fixed header instead of flush against it
const HEADER_OFFSET = 90;
document.querySelectorAll('a[href^="#"]').forEach(link => {
  const id = link.getAttribute('href').slice(1);
  if (!id) return;
  link.addEventListener('click', (e) => {
    const target = document.getElementById(id);
    if (!target) return;
    e.preventDefault();
    const y = target.getBoundingClientRect().top + window.scrollY - HEADER_OFFSET;
    if (smoothScroll) smoothScroll.scrollTo(y);
    else window.scrollTo({ top: y, behavior: reducedMotion ? 'auto' : 'smooth' });
    if (history.pushState) history.pushState(null, '', `#${id}`);
  });
});

// ---------- work: overlapping card stack ----------
const workShowcase = document.getElementById('workShowcase');
const workTrack = document.getElementById('workTrack');
const workCards = workTrack ? Array.from(workTrack.querySelectorAll('.work-card')) : [];
const workPrevBtn = document.getElementById('workPrev');
const workNextBtn = document.getElementById('workNext');
const workDotsWrap = document.getElementById('workDots');
const workIndexCurrentEl = document.getElementById('workIndexCurrent');
const workIndexTotalEl = document.getElementById('workIndexTotal');
const workActiveTitleEl = document.getElementById('workActiveTitle');
const workActiveTagsEl = document.getElementById('workActiveTags');

// wired up once the modal block below initialises — the stack calls this
// instead of binding its own click-to-open listener on every card, which is
// what let a stray click land on the wrong project's modal before
let openProjectModal = () => {};

if (workShowcase && workTrack && workCards.length){
  let workIndex = 0;
  const workTotal = workCards.length;
  if (workIndexTotalEl) workIndexTotalEl.textContent = String(workTotal).padStart(2, '0');

  const workDots = workCards.map((_, i) => {
    const dot = document.createElement('button');
    dot.type = 'button';
    dot.className = 'work-dot';
    dot.setAttribute('aria-label', `Go to project ${i + 1}`);
    dot.addEventListener('click', () => goToWork(i));
    if (workDotsWrap) workDotsWrap.appendChild(dot);
    return dot;
  });

  // shortest signed circular distance from card i to the active card — with
  // 4 cards and index 0 active, card 3 sits at -1 (just behind, to the left)
  // rather than +3 (all the way around the other side)
  function circularOffset(i, active, total){
    let diff = i - active;
    if (diff > total / 2) diff -= total;
    if (diff < -total / 2) diff += total;
    return diff;
  }

  function renderWork(){
    workCards.forEach((card, i) => {
      const offset = circularOffset(i, workIndex, workTotal);
      const dist = Math.abs(offset);
      card.style.setProperty('--offset', offset);
      card.style.setProperty('--dist', dist);
      card.classList.toggle('is-active', i === workIndex);
      card.setAttribute('tabindex', i === workIndex ? '0' : '-1');
      card.setAttribute('aria-hidden', i === workIndex ? 'false' : 'true');
    });
    workDots.forEach((dot, i) => dot.classList.toggle('is-active', i === workIndex));
    const active = workCards[workIndex];
    if (workIndexCurrentEl) workIndexCurrentEl.textContent = String(workIndex + 1).padStart(2, '0');
    if (workActiveTitleEl) workActiveTitleEl.textContent = active.dataset.title || '';
    if (workActiveTagsEl) workActiveTagsEl.textContent = active.dataset.tags || '';
  }

  function goToWork(i){
    workIndex = (i + workTotal) % workTotal;
    renderWork();
  }

  // the highlighted (active) card opens its case study; any card still
  // peeking out from the stack instead steps the stack to bring it forward
  workCards.forEach((card, i) => {
    card.addEventListener('click', () => {
      if (i === workIndex) openProjectModal(card);
      else goToWork(i);
    });
    card.addEventListener('keydown', (e) => {
      if (e.key !== 'Enter' && e.key !== ' ') return;
      e.preventDefault();
      if (i === workIndex) openProjectModal(card);
      else goToWork(i);
    });
  });

  if (workPrevBtn) workPrevBtn.addEventListener('click', () => goToWork(workIndex - 1));
  if (workNextBtn) workNextBtn.addEventListener('click', () => goToWork(workIndex + 1));

  workShowcase.addEventListener('keydown', (e) => {
    if (e.target !== workShowcase) return; // don't hijack arrow keys while a card itself has focus
    if (e.key === 'ArrowLeft'){ e.preventDefault(); goToWork(workIndex - 1); }
    if (e.key === 'ArrowRight'){ e.preventDefault(); goToWork(workIndex + 1); }
  });

  // basic touch swipe
  let workTouchX = null;
  workShowcase.addEventListener('touchstart', (e) => { workTouchX = e.touches[0].clientX; }, { passive: true });
  workShowcase.addEventListener('touchend', (e) => {
    if (workTouchX === null) return;
    const dx = e.changedTouches[0].clientX - workTouchX;
    if (Math.abs(dx) > 40) goToWork(workIndex + (dx < 0 ? 1 : -1));
    workTouchX = null;
  }, { passive: true });

  renderWork();
}

// ---------- work card hover-preview video (hover-capable devices only —
// on touch devices there is no hover, so the poster/fallback cover is what
// shows and a tap opens the case directly) ----------
if (canHover){
  document.querySelectorAll('.work-card video').forEach(video => {
    const card = video.closest('.work-card');
    card.addEventListener('mouseenter', () => video.play().catch(() => {}));
    card.addEventListener('mouseleave', () => { video.pause(); video.currentTime = 0; });
  });
}

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
  const processChainEl = modal.querySelector('.process-chain');
  const outcomeEl = modal.querySelector('.project-modal-outcome');
  const resultEl = modal.querySelector('.result-badge');
  const linksBlock = modal.querySelector('.project-modal-links');
  const linksListEl = modal.querySelector('.project-modal-links-list');
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

    // the "process chain" pills double as a compact breakdown of this
    // project's actual role/responsibilities, driven by data-role
    processChainEl.innerHTML = '';
    (card.dataset.role || '').split('·').map(r => r.trim()).filter(Boolean).forEach(r => {
      const li = document.createElement('li');
      li.textContent = r;
      processChainEl.appendChild(li);
    });

    // optional external links (real case URLs) — "Label|https://url" pairs
    // separated by ";;". Only rendered when a card actually provides one.
    linksListEl.innerHTML = '';
    const rawLinks = (card.dataset.links || '').split(';;').map(s => s.trim()).filter(Boolean);
    if (rawLinks.length){
      rawLinks.forEach(pair => {
        const [label, url] = pair.split('|').map(s => (s || '').trim());
        if (!url) return;
        const li = document.createElement('li');
        const a = document.createElement('a');
        a.href = url;
        a.target = '_blank';
        a.rel = 'noopener noreferrer';
        a.textContent = label || url;
        li.appendChild(a);
        linksListEl.appendChild(li);
      });
      linksBlock.hidden = false;
    } else {
      linksBlock.hidden = true;
    }

    coverWrap.classList.remove('no-cover');
    coverImg.style.display = 'none';
    coverImg.removeAttribute('src');
    const coverSrc = card.dataset.cover;
    if (coverSrc){
      coverImg.onload = () => { coverImg.style.display = 'block'; coverWrap.classList.add('has-photo'); };
      coverImg.onerror = () => { coverImg.style.display = 'none'; coverWrap.classList.remove('has-photo'); };
      coverImg.src = coverSrc;
    } else {
      coverWrap.classList.remove('has-photo');
    }

    lastFocused = document.activeElement;
    modal.classList.add('open');
    modal.setAttribute('aria-hidden', 'false');
    document.documentElement.style.overflow = 'hidden';
    document.body.style.overflow = 'hidden';
    modal.querySelector('.project-modal-close').focus();
  }

  function closeModal(){
    modal.classList.remove('open');
    modal.setAttribute('aria-hidden', 'true');
    document.documentElement.style.overflow = '';
    document.body.style.overflow = '';
    if (lastFocused) lastFocused.focus();
  }

  openProjectModal = openModal;

  modal.querySelectorAll('[data-close]').forEach(el => el.addEventListener('click', closeModal));
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modal.classList.contains('open')) closeModal();
  });
}

// ---------- mobile nav (hamburger toggle) ----------
const navBurger = document.getElementById('navBurger');
const navMobile = document.getElementById('navMobile');
if (navBurger && navMobile){
  function closeMobileNav(){
    navBurger.setAttribute('aria-expanded', 'false');
    navBurger.setAttribute('aria-label', 'Open menu');
    navMobile.classList.remove('open');
    document.body.classList.remove('nav-open');
  }
  function toggleMobileNav(){
    const open = navMobile.classList.toggle('open');
    navBurger.setAttribute('aria-expanded', String(open));
    navBurger.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    document.body.classList.toggle('nav-open', open);
    if (open) navMobile.querySelector('a')?.focus();
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
