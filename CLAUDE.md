# Philip's Portfolio Site

A personal portfolio for Philip Rasmussen — a 22-year-old Danish video editor / graphic
designer / content creator, currently a media graphics apprentice at BET25 in Aarhus.
The site's job is to land freelance work and full-time roles by proving real skill and
output to recruiters and brands, not to grow a social following.

## Stack & workflow

Plain HTML/CSS/JS, single scrolling page, no build step, no framework, no package.json.
Deployed via GitHub → Vercel: pushing to `main` deploys automatically.

**Never run `git push` without the user explicitly asking for it in that session.**
Committing locally is fine and expected; going live is a separate, deliberate step the
user controls.

## Files

- `index.html` — all markup and copy, single page, sections in DOM order:
  `#top` (hero) → `#work` (Selected Work carousel) → `#field-work` (press/logos) →
  `#stats` → `#quote` (a.k.a. "How I Think") → `#about` → `#toolkit` (skills grid) →
  `#journey` (timeline) → `#faq` (Questions) → `#contact`.
  There's also a fixed `#intro` overlay before the header — the pixel-tile loading
  animation that plays on first load.
- `styles.css` — all styling, organized roughly in the same order as the sections above,
  with a shared motion system at the top (`--ease`, `--dur-*` custom properties,
  `cubic-bezier(.32,1.85,.6,1)` used site-wide for "Apple-style" overshoot pop-ins).
- `script.js` — all behavior: intro sequence, scroll-reveal (IntersectionObserver +
  `.reveal` class), Selected Work carousel, project modals, FAQ open/close animation,
  toolkit tab switching, nav highlighting, custom cursor on contact links.
- `assets/` — images/media referenced by the site.
- `md-files/`, `Claude outputs/` — working notes, not part of the deployed site.

## Editing text fast

Nearly all visible copy is plain text directly in `index.html` between tags — no CMS,
no templating. Search for the exact phrase and edit in place. Don't touch anything
inside `<script>` tags or `class="..."`/`id="..."` attributes unless the change is
specifically about behavior, not wording.

Some text (the intro "PHILIP." wordmark) gets split into per-letter `<span>`s by
`script.js` at runtime for animation — that's normal, don't "fix" it in the HTML.

## Voice & tone (use when writing or editing any first-person copy: bio, hero, about, FAQ answers)

- Conversational, direct, confident without arrogance. Casual but precise — understate
  rather than exaggerate. Short paragraphs, gets to the point fast.
- Proof over adjectives: a number or a named result beats "passionate" or "creative"
  every time.
- Avoid guru language, hype words, ALL CAPS claims, exaggerated certainty. Never write
  anything that sounds like a template or a guru script (e.g. "This changed
  EVERYTHING", "3 secrets nobody tells you").
- Site language is English by default — audience is recruiters/brands, not the Danish
  creator-community audience Philip's social content is written for.
- Off-limits topics, always: politics, gambling/betting/casinos, romantic
  relationships/dating life — even as jokes.
- Always confirm with Philip before publishing real client/brand names that haven't
  already been confirmed for the site.

Fuller brand background (the full chain "idea → hook → capture → structure → edit →
sound → colour → publish → learn", audience framing, etc.) lives in Philip's Claude
project ("PHILIP - PORTFOLIO") as `about-philip-for-portfolio.md` — ask if something
here seems inconsistent with a decision made there.

## Known quirks / established patterns worth knowing before touching things

- **CSS Grid + `overflow`:** pairing `overflow-x:hidden` with `overflow-y:visible`
  silently forces the visible axis to `auto` in some browsers, creating an unwanted
  scroll container. Use `overflow-x:clip` instead when you want one axis clipped and
  the other visible.
- **No-JS-safe progressive enhancement:** elements default to visible/functional in
  plain HTML+CSS; a synchronous inline `<script>` at the top of `<head>` adds a
  `reveal-js` class to `<html>` before first paint to opt into JS-enhanced/animated
  behavior. Don't make anything depend on JS running unless it degrades gracefully.
- **Scroll reveal:** anything with a `.reveal` class is picked up automatically by the
  shared IntersectionObserver in `script.js` — no extra wiring needed for new sections.
- **`<details name="...">` for accordions:** the FAQ uses native `<details>/<summary
  name="faq">` so only one item is open at a time with zero JS required; `script.js`
  layers a Web Animations API open/close animation on top as a pure enhancement
  (gated on `!reducedMotion && Element.prototype.animate` existing).
- **The intro tile grid:** `.intro-grid` is a 12×7 CSS grid of tiles with no `gap` set.
  On non-round viewport widths, browsers can still round tracks to sub-pixel sizes and
  leave hairline gaps between tiles. Don't fix this by giving `.intro` or `.intro-grid`
  a solid background — that becomes a permanent floor behind every tile and breaks the
  dissolve effect (tiles are supposed to reveal the real page underneath as they
  scale away). The gap is closed instead via a `box-shadow` bleed on `.intro-tile`
  itself, which dissolves along with the tile.

## Verifying changes

There's no test suite. Before committing anything nontrivial (layout, animation,
carousel/modal behavior), it's worth spinning up a local server
(`python3 -m http.server`) and checking with a headless browser (Playwright is
available) across a few viewport widths — this project has repeatedly hit real mobile
bugs (horizontal overflow, IntersectionObserver trigger zones being skipped, CSS
overflow/grid rounding quirks) that only show up at specific widths, not obviously in
a single desktop view.
