// ==UserScript==
// @name         FB Cleaner (Mobile)
// @version      17
// @namespace    https://github.com/therealgulltop/fb-cleaner
// @description  Collapses Facebook ads, suggestions and Reels on the mobile layout, on screen only.
// @updateURL    https://raw.githubusercontent.com/therealgulltop/fb-cleaner/main/fb-cleaner-mobile.user.js
// @downloadURL  https://raw.githubusercontent.com/therealgulltop/fb-cleaner/main/fb-cleaner-mobile.user.js
// @match        https://www.facebook.com/*
// @match        https://m.facebook.com/*
// @run-at       document-idle
// @grant        none
// ==/UserScript==
// For Facebook's MOBILE layout only (does nothing on the desktop layout).
// Collapses ads, Follow/Join suggestions and the Reels tray on screen only -- Facebook is not told.
// Tap the gear (bottom-left) for settings; they're remembered in this browser.
(() => {
  if (document.documentElement.dataset.fbmcRunning) return; // another copy of this script is already running
  document.documentElement.dataset.fbmcRunning = '17';
  // ---- wrong-script check: warn once if this page's layout needs the other FB Cleaner script and it isn't installed ----
  const mismatch = (want, file) => {
    const k = 'fbc-mismatch-' + want;
    try { if (localStorage.getItem(k)) return; } catch (e) {}
    if (document.querySelector('.fbc-mismatch')) return;
    const b = document.createElement('div');
    b.className = 'fbc-mismatch';
    b.style.cssText = 'position:fixed;left:12px;right:12px;top:12px;z-index:10001;max-width:560px;margin:0 auto;padding:12px 14px;border-radius:10px;background:#242526;color:#e4e6eb;font:14px/1.4 system-ui,sans-serif;box-shadow:0 2px 12px rgba(0,0,0,.6);display:flex;gap:12px;align-items:center';
    b.innerHTML = '<div style="flex:1"></div><a target="_blank" rel="noopener" style="flex:none;background:#0866ff;color:#fff;border-radius:6px;padding:8px 12px;font-weight:600;text-decoration:none">Install</a><span role="button" title="Dismiss" style="flex:none;cursor:pointer;color:#b0b3b8;font-size:18px;padding:0 4px">✕</span>';
    b.firstChild.textContent = 'FB Cleaner: this is Facebook’s ' + (want === 'Mobile' ? 'phone' : 'computer') + ' layout, but only FB Cleaner (' + (want === 'Mobile' ? 'Desktop' : 'Mobile') + ') is installed here.  Install FB Cleaner (' + want + ') to clean this page.';
    b.children[1].href = 'https://raw.githubusercontent.com/therealgulltop/fb-cleaner/main/' + file;
    b.lastChild.addEventListener('click', () => { b.remove(); try { localStorage.setItem(k, '1'); } catch (e) {} });
    document.body.appendChild(b);
  };
  // this is the computer layout and the desktop script isn't running (older desktop versions set no flag, so also look for their counter)
  [4000, 10000].forEach(ms => setTimeout(() => {
    if (document.querySelector('[data-mcomponent]') || document.documentElement.dataset.fbcdRunning) return;
    if (innerWidth < 600 || !document.querySelector('[role="banner"],[role="navigation"],[role="main"]')) return; // not a Facebook page we recognize yet
    if ([...document.body.children].some(c => /^Ads \d+ \+ Suggested/.test(c.textContent || ''))) return;
    mismatch('Desktop', 'fb-cleaner-desktop.user.js');
  }, ms));

  // ---- settings ----
  const DEFAULTS = { follow: true, join: true, reels: true, suggestions: true, errors: true, debug: false };
  const load = () => { try { return Object.assign({}, DEFAULTS, JSON.parse(localStorage.getItem('fbmc-settings') || '{}')); } catch (e) { return Object.assign({}, DEFAULTS); } };
  const save = () => { try { localStorage.setItem('fbmc-settings', JSON.stringify(opt)); } catch (e) {} };
  const opt = load();
  const enabled = kind => kind === 'ad' || !!opt[kind];

  const AD = /(^|\s)(Ad|Sponsored)(\s|[·•]|$)/, SUGG = /([·•]|\s)(Follow|Join)$/;
  // headings of Facebook's suggestion carousels
  const SUGG_BLOCK = /^(Suggested for you|People you may know|Suggested groups|Groups you might like|Pages you may like|Suggested pages|Reels and short videos)\b/i;
  const kept = new Set();
  const restore = new WeakMap();
  let posts = 0, ads = 0, sugg = 0, reels = 0;

  // strip Facebook's icon-font glyphs (private-use characters, incl. the supplementary planes) and invisible joiners
  const clean = s => s.replace(/[\uE000-\uF8FF\u{F0000}-\u{FFFFD}\u{100000}-\u{10FFFD}\uFE0F\u200B-\u200D\u2060]/gu, '').replace(/\s+/g, ' ').trim();
  const resolveUse = u => {
    let el = u; const seen = new Set();
    while (el && el.querySelector) {
      const v = el.tagName === 'use' ? el : el.querySelector('use');
      if (!v) break;
      const nx = document.getElementById((v.getAttribute('href') || v.getAttribute('xlink:href') || '').slice(1));
      if (!nx || seen.has(nx)) return '';
      seen.add(nx); el = nx;
    }
    return el ? el.textContent : '';
  };
  // the first few text pieces of a post, in page order (no layout needed, so it works before the post is drawn)
  const nodeTexts = (post, max) => {
    const out = [], w = document.createTreeWalker(post, NodeFilter.SHOW_TEXT);
    for (let n; (n = w.nextNode()) && out.length < max;) {
      if (n.parentElement.closest('.fbmc-dbg,.fbmc-bar')) continue;
      const t = clean(n.data);
      if (t) out.push(t);
    }
    return out;
  };
  const shown = el => { const s = getComputedStyle(el); return s.visibility !== 'hidden' && +s.opacity > 0; };
  // visible text of the top of a post, grouped into lines, read left to right
  const headerLines = post => {
    const dbg = post.querySelector(':scope > .fbmc-dbg');
    const top0 = (dbg ? dbg.getBoundingClientRect().bottom : post.getBoundingClientRect().top), bits = [];
    const w = document.createTreeWalker(post, NodeFilter.SHOW_TEXT);
    for (let n; (n = w.nextNode());) {
      if (!n.data.trim() || !shown(n.parentElement) || n.parentElement.closest('.fbmc-dbg,.fbmc-bar')) continue; // skip our own labels
      const r = document.createRange(); r.selectNodeContents(n);
      const q = [...r.getClientRects()].find(q => q.width > 1 && q.height > 1);
      if (q && q.top - top0 < 120) bits.push({ t: n.data, x: q.left, y: q.top + q.height / 2 });
    }
    post.querySelectorAll('svg use').forEach(u => {
      const q = u.closest('svg').getBoundingClientRect(), t = resolveUse(u);
      if (t.trim() && q.width > 1 && q.top - top0 < 120) bits.push({ t, x: q.left, y: q.top + q.height / 2 });
    });
    bits.sort((a, b) => a.y - b.y);
    let l = 0, top = -1e9;
    bits.forEach(b => { if (b.y - top > 8) { l++; top = b.y; } b.l = l; });
    bits.sort((a, b) => a.l - b.l || a.x - b.x);
    const out = [];
    bits.forEach(b => { out[b.l - 1] = (out[b.l - 1] === undefined ? '' : out[b.l - 1] + ' ') + b.t; });
    return out.filter(s => s !== undefined).map(clean).filter(Boolean);
  };

  // ---- collapse / expand ----
  // match Facebook's light or dark theme by the page's background brightness
  const palette = () => {
    const bg = [document.body, document.documentElement].map(e => getComputedStyle(e).backgroundColor).find(v => !/^rgba\(.*,\s*0\)$|transparent/.test(v));
    const m = (bg && bg.match(/\d+/g)) || [255, 255, 255];
    const dark = (+m[0] * 299 + +m[1] * 587 + +m[2] * 114) / 1000 < 128;
    return dark ? { card: '#242526', text: '#e4e6eb', sub: '#b0b3b8', button: '#3a3b3c' }
                : { card: '#ffffff', text: '#050505', sub: '#65676b', button: '#e4e6eb' };
  };
  const collapse = (post, label, name) => {
    post.dataset.fbmc = 'hidden';
    const kids = [...post.children].filter(k => !k.classList.contains('fbmc-dbg'));
    kids.forEach(k => { k.dataset.fbmcDisp = k.style.display; k.style.display = 'none'; });
    post.dataset.fbmcH = post.style.height;
    post.style.height = 'auto';
    const bar = document.createElement('div');
    bar.className = 'fbmc-bar';
    // same look as Facebook's own "Ad hidden" card on desktop: icon, bold title, name underneath, Undo button
    const c = palette();
    bar.style.cssText = 'display:flex;align-items:center;justify-content:space-between;gap:12px;padding:10px 12px;margin:4px 0;background:' + c.card + ';font:15px/1.3 system-ui,sans-serif;border-radius:8px';
    bar.innerHTML = '<div style="display:flex;align-items:center;gap:12px;min-width:0"><span style="flex:none;width:24px;height:24px;border-radius:6px;text-align:center;font:bold 13px/24px system-ui,sans-serif"></span><div style="min-width:0"><div style="font-weight:600"></div><div style="font-size:13px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis"></div></div></div><button style="flex:none;border:0;border-radius:6px;padding:8px 14px;font:600 15px system-ui,sans-serif">Undo</button>';
    const icon = bar.firstChild.firstChild, title = bar.firstChild.lastChild.firstChild, sub = bar.firstChild.lastChild.lastChild;
    icon.textContent = '\u2715'; icon.style.background = c.text; icon.style.color = c.card;
    title.textContent = label; title.style.color = c.text;
    sub.textContent = name; sub.style.color = c.sub; if (!name) sub.remove();
    bar.lastChild.style.background = c.button; bar.lastChild.style.color = c.text;
    const expand = () => {
      bar.remove();
      kids.forEach(k => { k.style.display = k.dataset.fbmcDisp || ''; delete k.dataset.fbmcDisp; });
      post.style.height = post.dataset.fbmcH || ''; delete post.dataset.fbmcH;
      restore.delete(post);
    };
    restore.set(post, expand);
    bar.lastChild.addEventListener('click', e => { e.stopPropagation(); if (name) kept.add(name); expand(); post.dataset.fbmc = 'shown'; });
    post.prepend(bar);
  };
  const LABEL = { ad: 'Ad hidden', follow: 'Suggestion hidden', join: 'Group suggestion hidden', reels: 'Reels hidden', suggestions: 'Suggestions hidden' };
  const act = (post, kind, name) => {
    post.dataset.fbmcKind = kind;
    if (!enabled(kind)) { post.dataset.fbmc = 'off'; return; }
    collapse(post, LABEL[kind], name);
  };

  // ---- counter ----
  const box = document.createElement('div');
  box.style.cssText = 'position:fixed;right:12px;bottom:26px;max-width:calc(100vw - 80px);z-index:9999;padding:6px 10px;border-radius:8px;background:rgba(0,0,0,.7);color:#fff;font:12px/1.4 system-ui,sans-serif;pointer-events:none';
  const show = () => {
    if (!box.isConnected) document.body.appendChild(box);
    const n = ads + sugg;
    const s = `Ads ${ads} + Suggested ${sugg} + Reels ${reels} / Posts ${posts} -- ${posts ? Math.round(100 * n / posts) : 0}%`;
    if (box.textContent !== s) box.textContent = s;
  };

  // ---- debug labels ----
  const tag = (el, msg) => {
    if (!opt.debug) return;
    let d = el.querySelector(':scope > .fbmc-dbg');
    if (!d) { d = document.createElement('div'); d.className = 'fbmc-dbg'; d.style.cssText = 'font:10px/1.3 monospace;color:#ff0;background:#600;padding:1px 4px;white-space:pre-wrap'; el.prepend(d); }
    const cs = getComputedStyle(el), r = el.getBoundingClientRect();
    const m = msg + '  [' + cs.position + ' h' + Math.round(r.height) + ' kids' + el.children.length + ']';
    if (d.textContent !== m) d.textContent = m;
  };

  // ---- settings button + panel ----
  const gear = document.createElement('div');
  gear.textContent = '\u2699';
  gear.style.cssText = 'position:fixed;left:12px;bottom:20px;z-index:10000;width:36px;height:36px;border-radius:50%;background:rgba(0,0,0,.7);color:#fff;font:20px/36px system-ui,sans-serif;text-align:center;cursor:pointer;user-select:none';
  const panel = document.createElement('div');
  panel.style.cssText = 'position:fixed;left:12px;bottom:64px;z-index:10000;padding:10px 14px;border-radius:10px;background:#242526;color:#e4e6eb;font:15px/2 system-ui,sans-serif;box-shadow:0 2px 12px rgba(0,0,0,.6);display:none';
  [['follow', 'Hide Follow suggestions'], ['join', 'Hide Join (group) suggestions'], ['suggestions', 'Hide "Suggested for you" blocks'], ['reels', 'Hide Reels tray'], ['errors', 'Hide "Something went wrong" tiles'], ['debug', 'Debug labels']].forEach(([k, text]) => {
    const row = document.createElement('label');
    row.style.cssText = 'display:flex;align-items:center;gap:10px;cursor:pointer';
    const cb = document.createElement('input');
    cb.type = 'checkbox'; cb.checked = !!opt[k]; cb.style.cssText = 'width:20px;height:20px';
    cb.addEventListener('change', () => { opt[k] = cb.checked; save(); applySettings(k); });
    row.append(cb, document.createTextNode(text));
    panel.appendChild(row);
  });
  gear.addEventListener('click', e => { e.stopPropagation(); panel.style.display = panel.style.display === 'none' ? 'block' : 'none'; });
  const applySettings = k => {
    if (k === 'debug' && !opt.debug) document.querySelectorAll('.fbmc-dbg').forEach(d => d.remove());
    if (k === 'debug') { document.querySelectorAll('[data-fbmc="post"]').forEach(p => delete p.dataset.fbmc); }
    document.querySelectorAll('[data-fbmc-kind="' + k + '"]').forEach(p => {
      if (opt[k] && p.dataset.fbmc === 'off') delete p.dataset.fbmc; // re-check and collapse on next pass
      if (!opt[k] && p.dataset.fbmc === 'hidden') { const ex = restore.get(p); if (ex) ex(); p.dataset.fbmc = 'off'; }
    });
    tick();
  };

  // ---- fast checks (plain text only, no layout), run before each repaint so posts collapse before you see them ----
  // Facebook reuses post blocks as you scroll; if it dropped our bar, un-hide what we hid (else it shows as a black box)
  const heal = () => {
    document.querySelectorAll('[data-fbmc-disp]').forEach(k => {
      const p = k.parentElement;
      if (p && p.querySelector(':scope > .fbmc-bar')) return;
      k.style.display = k.dataset.fbmcDisp || ''; delete k.dataset.fbmcDisp;
      if (p) { if ('fbmcH' in p.dataset) { p.style.height = p.dataset.fbmcH; delete p.dataset.fbmcH; } delete p.dataset.fbmc; restore.delete(p); }
    });
  };
  const quickCheck = post => {
    const nt = nodeTexts(post, 6);
    if (nt[0] === 'Reels') { // Reels tray with a plain "Reels" heading
      if (!post.dataset.fbmcKind) reels++;
      tag(post, 'REELS');
      act(post, 'reels', '');
      return true;
    }
    if (nt[0] && SUGG_BLOCK.test(nt[0])) { // suggestion carousel heading
      if (!post.dataset.fbmcKind) sugg++;
      tag(post, 'SUGGESTIONS: ' + nt[0]);
      act(post, 'suggestions', nt[0].match(SUGG_BLOCK)[1]);
      return true;
    }
    // "Ad" as its own text piece right after the name: catches ads before Facebook draws them
    const ai = nt.findIndex((x, i) => i > 0 && i < 4 && /^(Ad|Sponsored)( ?[\u00b7\u2022])?$/.test(x));
    if (ai > 0) {
      const nm = nt.slice(0, ai).join(' ');
      if (!post.dataset.fbmcKind) { posts++; ads++; }
      tag(post, 'AD (text): ' + nm);
      if (kept.has(nm)) { post.dataset.fbmcKind = 'ad'; post.dataset.fbmc = 'shown'; return true; }
      act(post, 'ad', nm);
      return true;
    }
    return false;
  };
  // full check of one post (reads layout)
  const check = post => {
    if (quickCheck(post)) return;
    const ls = headerLines(post);
    if (ls[0] && SUGG_BLOCK.test(ls[0])) { // a suggestion carousel: one heading line, no name/date line
      if (!post.dataset.fbmcKind) sugg++;
      tag(post, 'SUGGESTIONS: ' + ls[0]);
      act(post, 'suggestions', ls[0].match(SUGG_BLOCK)[1]);
      return;
    }
    if (ls.length < 2) { // not drawn yet; check again later
      if (opt.debug) { // say what this block holds, to identify blocks that never get a header
        const txt = clean([...post.childNodes].filter(n => !(n.classList && n.classList.contains('fbmc-dbg'))).map(n => n.textContent).join(' ')).slice(0, 60);
        const labels = [...post.querySelectorAll('[aria-label]')].map(e => e.getAttribute('aria-label').slice(0, 25)).slice(0, 4).join(' | ');
        tag(post, 'WAIT: ' + ls.join(' / ') + '\n text="' + txt + '"\n labels=' + labels + '\n video=' + post.querySelectorAll('video').length + ' img=' + post.querySelectorAll('img').length);
      }
      return;
    }
    const m = ls[0].match(SUGG);
    const name = ls[0].replace(/\s*[·•]?\s*(Follow|Join)$/, '').trim();
    // the Ad label sits on a short line under the name (line 3 if the name wraps); long lines are post text
    const isAd = [ls[1], ls[2] || ''].some(l => l.length < 20 && AD.test(l));
    const kind = isAd ? 'ad' : m ? m[2].toLowerCase() : 'post';
    if (kind === 'post') {
      tag(post, 'POST: ' + ls.slice(0, 2).join(' / '));
      post.dataset.fbmcSeen = (+post.dataset.fbmcSeen || 0) + 1;
      if (+post.dataset.fbmcSeen > 3) { post.dataset.fbmc = 'post'; posts++; }
      return;
    }
    if (!post.dataset.fbmcKind) { posts++; if (kind === 'ad') ads++; else sugg++; }
    tag(post, kind.toUpperCase() + ': ' + ls.slice(0, 2).join(' / '));
    if (kept.has(name)) { post.dataset.fbmcKind = kind; post.dataset.fbmc = 'shown'; return; }
    act(post, kind, name);
  };
  let qf = 0;
  const quick = () => {
    qf = 0;
    if (!document.querySelector('[data-mcomponent]')) return;
    heal();
    // posts on or near the screen get the full check now, before the repaint, so Follow/Join posts don't shrink in view;
    // the rest get the cheap text check and wait for the regular pass
    document.querySelectorAll('[data-type="vscroller"] > [data-tracking-duration-id]:not([data-fbmc])').forEach(post => {
      const r = post.getBoundingClientRect();
      if (r.bottom > -innerHeight && r.top < innerHeight * 2) check(post); else quickCheck(post);
    });
    show();
  };

  // ---- main pass ----
  const scan = () => {
    if (!document.querySelector('[data-mcomponent]')) return; // desktop layout: leave it to the desktop script
    if (!gear.isConnected) document.body.append(gear, panel);
    heal();
    // Reels tray
    document.querySelectorAll('[aria-label^="reels" i]').forEach(r => {
      const post = r.closest('[data-tracking-duration-id]');
      if (post && !post.dataset.fbmc) { if (!post.dataset.fbmcKind) reels++; act(post, 'reels', ''); tag(post, 'REELS'); }
    });
    // Posts: blocks directly inside the feed scroller
    document.querySelectorAll('[data-type="vscroller"] > [data-tracking-duration-id]:not([data-fbmc])').forEach(check);
    // Facebook's own error tiles ("Something went wrong ... Reload Page")
    document.querySelectorAll('[data-type="vscroller"] > *').forEach(el => {
      if (el.dataset.fbmcErr) { el.style.display = opt.errors ? 'none' : ''; return; }
      if (/Something went wrong/.test(el.textContent) && /Reload Page/.test(el.textContent)) { el.dataset.fbmcErr = 1; if (opt.errors) el.style.display = 'none'; }
    });
    if (opt.debug) document.querySelectorAll('[data-type="vscroller"] > *:not([data-tracking-duration-id])').forEach(el => tag(el, 'OTHER BLOCK'));
    show();
  };

  let t = 0;
  const tick = () => { if (!t) t = setTimeout(() => { t = 0; scan(); }, 120); };
  new MutationObserver(() => { if (!qf) qf = requestAnimationFrame(quick); tick(); }).observe(document.body, { childList: true, subtree: true });
  ['scroll', 'pageshow', 'popstate', 'focus'].forEach(ev => addEventListener(ev, tick, { passive: true }));
  document.addEventListener('visibilitychange', tick);
  setInterval(tick, 1500);
  tick();

  // Unstick the feed: collapsing makes the page shorter than Facebook expects, and it can stop loading more.
  // If you're near the bottom and nothing new has loaded for 1.5s, scroll up a screen and straight back
  // (what fixed it by hand). At most 3 tries until the page grows again.
  let lastH = 0, lastGrow = Date.now(), lastTry = 0, tries = 0;
  setInterval(() => {
    const se = document.scrollingElement, h = se.scrollHeight, now = Date.now();
    if (h !== lastH) { lastH = h; lastGrow = now; tries = 0; return; }
    if (document.hidden || tries >= 3 || now - lastGrow < 1500 || now - lastTry < 2500) return;
    if (se.scrollTop + innerHeight < h - innerHeight * 1.5 || !document.querySelector('[data-fbmc="hidden"]')) return;
    lastTry = now; tries++;
    const y = se.scrollTop;
    se.scrollTop = Math.max(0, y - innerHeight);
    requestAnimationFrame(() => requestAnimationFrame(() => { se.scrollTop = y; }));
  }, 500);
})();
