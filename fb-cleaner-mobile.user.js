// ==UserScript==
// @name         FB Cleaner (Mobile)
// @version      62
// @namespace    https://github.com/therealgulltop/fb-cleaner
// @description  Collapses Facebook ads, suggestions and Reels on the mobile layout, on screen only.
// @updateURL    https://raw.githubusercontent.com/therealgulltop/fb-cleaner/main/fb-cleaner-mobile.user.js
// @downloadURL  https://raw.githubusercontent.com/therealgulltop/fb-cleaner/main/fb-cleaner-mobile.user.js
// @match        https://www.facebook.com/*
// @match        https://m.facebook.com/*
// @run-at       document-idle
// @grant        GM_xmlhttpRequest
// @connect      raw.githubusercontent.com
// @connect      www.facebook.com
// ==/UserScript==
// For Facebook's MOBILE layout only (does nothing on the desktop layout).
// Collapses ads, Follow/Join suggestions and the Reels tray on screen only -- Facebook is not told.
// Tap the FB Cleaner logo (bottom-right) for settings; they're remembered in this browser.
(() => {
  if (document.documentElement.dataset.fbmcRunning) return; // another copy of this script is already running
  document.documentElement.dataset.fbmcRunning = '62';
  // ---- stale-copy check: a browser can keep running the old copy after an update until the tab is closed, so compare with GitHub ----
  const checkLatest = () => {
    if (typeof GM_xmlhttpRequest !== 'function') return;
    if (!document.querySelector('[data-mcomponent]')) return; // only check on this script's own layout, so the other script's copy doesn't nag here
    const VER = 62, KEY = 'fbc-latest-fb-cleaner-mobile.user.js';
    const tell = latest => {
      if (!(latest > VER) || document.querySelector('.fbc-stale')) return;
      try { if (localStorage.getItem(KEY + '-dismissed') === String(latest)) return; } catch (e) {}
      const b = document.createElement('div');
      b.className = 'fbc-stale';
      b.style.cssText = 'position:fixed;left:12px;right:12px;top:12px;z-index:10001;max-width:560px;margin:0 auto;padding:12px 14px;border-radius:10px;background:#242526;color:#e4e6eb;font:14px/1.4 system-ui,sans-serif;box-shadow:0 2px 12px rgba(0,0,0,.6);display:flex;gap:12px;align-items:center';
      b.innerHTML = '<div style="flex:1"></div><span role="button" title="Dismiss" style="flex:none;cursor:pointer;color:#b0b3b8;font-size:18px;padding:0 4px">✕</span>';
      b.firstChild.textContent = 'FB Cleaner (Mobile) v' + latest + ' is out, but this tab is running v' + VER + '.  Update it in Tampermonkey if it hasn’t already, then close this tab and reopen Facebook.';
      b.lastChild.addEventListener('click', () => { b.remove(); try { localStorage.setItem(KEY + '-dismissed', String(latest)); } catch (e) {} });
      document.body.appendChild(b);
    };
    let c = null;
    try { c = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) {}
    if (c && Date.now() - c.at < 5 * 60000) return tell(c.v);
    GM_xmlhttpRequest({ method: 'GET', url: 'https://raw.githubusercontent.com/therealgulltop/fb-cleaner/main/fb-cleaner-mobile.user.js', onload: r => {
      const m = /@version\s+(\d+)/.exec(r.responseText || ''); if (!m) return;
      try { localStorage.setItem(KEY, JSON.stringify({ at: Date.now(), v: +m[1] })); } catch (e) {}
      tell(+m[1]);
    } });
  };
  // once shortly after loading, then every 10 minutes, since the update usually lands while the tab is already open
  setTimeout(checkLatest, 5000);
  setInterval(checkLatest, 10 * 60000);
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
  const DEFAULTS = { friends: true, follow: true, join: true, reels: true, suggestions: true, errors: true, plain: true, nags: true, strangers: true, ai: true, debug: false };
  const load = () => { try { return Object.assign({}, DEFAULTS, JSON.parse(localStorage.getItem('fbmc-settings') || '{}')); } catch (e) { return Object.assign({}, DEFAULTS); } };
  const save = () => { try { localStorage.setItem('fbmc-settings', JSON.stringify(opt)); } catch (e) {} };
  const opt = load();
  // ---- open the Friends feed instead of the main feed when you arrive at Facebook's home page ----
  // Only on arrival from outside Facebook (typed address, bookmark, new tab, link from another site), so clicking
  // Home inside Facebook still gets you the main feed.  Skipped if we already did it in the last 10 seconds, so a
  // site that drops the filter can't cause a reload loop.
  const fromFacebook = /^https:\/\/([a-z0-9-]+\.)*facebook\.com\//.test(document.referrer);
  if (opt.friends && !fromFacebook && location.pathname === '/' && !/[?&](filter|sk)=/.test(location.search)) {
    let last = 0;
    try { last = +sessionStorage.getItem('fbc-friends-at') || 0; sessionStorage.setItem('fbc-friends-at', Date.now()); } catch (e) {}
    if (Date.now() - last > 10000) { location.replace('/?filter=friends&sk=h_chr'); return; }
  }
  const enabled = kind => kind === 'ad' || !!opt[kind];

  const AD = /(^|\s)(Ad|Sponsored)(\s|[·•]|$)/, SUGG = /([·•]|\s)(Follow|Join|Add friend)$/;
  // headings of Facebook's suggestion carousels
  const SUGG_BLOCK = /^(Suggested for you|People you may know|Suggested groups|Groups you might like|Pages you may like|Suggested pages|Reels and short videos)\b/i;
  const kept = new Set(); // posts you tapped Undo on (until the tab closes), by postKey
  const restore = new WeakMap();
  let posts = 0, ads = 0, sugg = 0, reels = 0, strangers = 0, ai = 0, plained = 0; // plained: backgrounds removed

  // strip Facebook's icon-font glyphs (private-use characters, incl. the supplementary planes) and invisible joiners
  const clean = s => s.replace(/[\uE000-\uF8FF\u{F0000}-\u{FFFFD}\u{100000}-\u{10FFFD}\uFE0F\u200B-\u200F\u202A-\u202E\u2060-\u2069\u00AD]/gu, '').replace(/\s+/g, ' ').trim();
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
  // one post, not its source: the first pieces of its text (header and the start of the post)
  const postKey = post => nodeTexts(post, 8).join('|');
  const shown = el => { const s = getComputedStyle(el); return s.visibility !== 'hidden' && +s.opacity > 0; };
  // visible text of the top of a post, grouped into lines, read left to right

  // ---- who you know: your friends, the people and pages you follow, and you (fetched from Facebook about once a day, kept in this browser) ----
  const KNOWN_KEY = 'fbc-known', DAY = 864e5;
  const norm = s => clean(s).normalize('NFKC').toLowerCase();
  let known = null; // { at, self, friends, following, names: [...] } or { at, error }
  try { known = JSON.parse(localStorage.getItem(KNOWN_KEY) || 'null'); } catch (e) {}
  let knownSet = new Set(known && known.names || []), knownBusy = 0; // when the update started
  const pause = ms => new Promise(r => setTimeout(r, ms));
  // ask Facebook with your own sign-in: this site first (m.facebook.com on a phone), then www.facebook.com through Tampermonkey
  const send = (host, path, body) => new Promise((ok, fail) => {
    const method = body ? 'POST' : 'GET', headers = body ? { 'Content-Type': 'application/x-www-form-urlencoded' } : {};
    if (host === location.host) { const ac = new AbortController(); setTimeout(() => ac.abort(), 20000); return fetch(path, { method, body, headers, credentials: 'include', signal: ac.signal }).then(r => r.text()).then(ok, () => fail(new Error('timeout or network'))); }
    if (typeof GM_xmlhttpRequest !== 'function') return fail(new Error('no GM_xmlhttpRequest'));
    // www.facebook.com sends phones to m.facebook.com, so these requests say they come from a computer browser
    if (host === 'www.facebook.com') headers['User-Agent'] = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';
    setTimeout(() => fail(new Error('no answer')), 25000);
    GM_xmlhttpRequest({ method, url: 'https://' + host + path, data: body, headers, onload: r => ok(r.responseText || ''), onerror: () => fail(new Error('network')), ontimeout: () => fail(new Error('timeout')), timeout: 20000 });
  });
  const HOSTS = [...new Set([location.host, 'www.facebook.com'])];
  let goodHost = null; // the host whose answers worked last
  // try each host until the answer passes the test; the error says what each host returned
  const ask = async (path, body, test) => {
    const notes = [];
    for (const h of goodHost ? [goodHost, ...HOSTS.filter(x => x !== goodHost)] : HOSTS) {
      for (let i = 0; i < 3; i++) { // Facebook sometimes answers a request with a passing server error: wait and try again
        if (i) await pause(1500 * i);
        try { const t = await send(h, path, body); const v = test(t); if (v) { goodHost = h; return v; } notes.push(h.split('.')[0] + ':' + t.length + ':' + t.slice(0, 120).replace(/\s+/g, ' ')); }
        catch (e) { notes.push(h.split('.')[0] + ':' + (e.message || e)); }
      }
    }
    throw new Error(path.split('?')[0] + ' -- ' + [...new Set(notes)].join(' | '));
  };
  // the session token Facebook requires on these requests: from this page's own code, or asked for
  const pageToken = () => { for (const s of document.querySelectorAll('script:not([src])')) { const m = s.textContent.match(/"(?:DTSGInitialData|DTSGInitData)",\[\],\{"token":"([^"]+)"/) || s.textContent.match(/"dtsg":\{"token":"([^"]+)"/) || s.textContent.match(/name="fb_dtsg" value="([^"]+)"/); if (m) return m[1]; } const i = document.querySelector('input[name="fb_dtsg"]'); return i ? i.value : null; };
  const firstJson = t => JSON.parse(t.replace(/^for \(;;\);/, '').split('\n')[0]);
  const refreshKnown = async () => {
    if (knownBusy && Date.now() - knownBusy < 5 * 6e4) return; knownBusy = Date.now(); showKnown();
    try {
      const uid = (document.cookie.match(/c_user=(\d+)/) || [])[1]; if (!uid) throw new Error('not signed in');
      const dt = [null, pageToken() || await ask('/ajax/dtsg/?__a=true', null, t => (t.match(/"token":"([^"]+)"/) || [])[1])];
      const gql = (doc, vars) => ask('/api/graphql/', new URLSearchParams({ fb_dtsg: dt[1], doc_id: doc, variables: JSON.stringify(vars) }).toString(), t => { try { return firstJson(t).data || null; } catch (e) { return null; } });
      const names = new Set();
      let followErr = null;
      // friends
      let friends = 0, cur = null;
      do { const c = (await gql('26206414195674994', { count: 30, cursor: cur, name: null, scale: 1 })).viewer.all_friends; c.edges.forEach(e => { if (e.node.name) { names.add(norm(e.node.name)); friends++; } }); cur = c.page_info.has_next_page ? c.page_info.end_cursor : null; await pause(150); } while (cur);
      // your name and your Following list's id come from the route Facebook uses to open your Following tab
      const rt = await ask('/ajax/bulk-route-definitions/', new URLSearchParams({ fb_dtsg: dt[1], 'route_urls[0]': '/' + uid + '/following', __a: '1', __user: uid, __comet_req: '15' }).toString(), t => /collectionToken/.test(t) && t).catch(e => { followErr = String(e.message || e).slice(0, 400); return ''; });
      const self = (rt.match(/"title":"([^"]+)"/) || [])[1]; if (self) names.add(norm(JSON.parse('"' + self + '"')));
      const col = (rt.match(/"collectionToken":"(YXBwX2NvbGxlY3Rpb246[A-Za-z0-9=]+)"/) || [])[1];
      let following = 0;
      if (col) { cur = null; do { const c = (await gql('40194301110185320', { count: 8, cursor: cur, scale: 1, search: null, id: col })).node.pageItems; c.edges.forEach(e => { const n = e.node.title && e.node.title.text; if (n) { names.add(norm(n)); following++; } }); cur = c.page_info.has_next_page ? c.page_info.end_cursor : null; await pause(150); } while (cur); }
      if (friends < 1) throw new Error('empty friends list');
      known = { at: Date.now(), v: document.documentElement.dataset.fbmcRunning, self: !!self, friends, following: col ? following : null, names: [...names], followErr };
      knownSet = names;
      document.querySelectorAll('[data-fbmc="post"]').forEach(p => delete p.dataset.fbmc); // recheck posts already seen
    } catch (e) { known = Object.assign({}, known, { at: Date.now(), v: document.documentElement.dataset.fbmcRunning, error: String(e.message || e).slice(0, 300) }); }
    try { localStorage.setItem(KNOWN_KEY, JSON.stringify(known)); } catch (e) {}
    knownBusy = 0; showKnown(); tick();
  };
  // a post from one person or page you don't know? (group posts and posts with a second name line are left alone)
  const TIME = /^(\d+\s?(s|m|h|d|w|y|min|mins|hr|hrs)\b|Just now|Yesterday|(January|February|March|April|May|June|July|August|September|October|November|December|Jan|Feb|Mar|Apr|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec)\b)/i;
  // the dots between header items are drawn, not text, so the label shows up as "Lori Raby AI content 19h": it has to be followed by the time
  const AI_LABEL = /(^|\s|[·•])AI (content|info)\s*[·•]?\s*(\d+\s?(s|m|h|d|w|y|min|mins|hr|hrs)\b|Just now|Yesterday|(January|February|March|April|May|June|July|August|September|October|November|December|Jan|Feb|Mar|Apr|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec)\b|$)/i;
  // the label as its own short piece of text anywhere in the post; Facebook may split "AI" and "content" or use a no-break space
  const hasAiLabel = post => {
    const w = document.createTreeWalker(post, NodeFilter.SHOW_TEXT);
    let prev = '';
    for (let n; (n = w.nextNode());) {
      if (n.parentElement.closest('.fbmc-dbg,.fbmc-bar')) continue;
      const s = clean(n.data); if (!s) continue;
      if (s.length < 60 && AI_LABEL.test(s)) return true;
      if (/^(content|info)( ?[·•])?$/i.test(s) && /(^|[·•] ?)AI$/.test(prev)) return true;
      prev = s;
    }
    return false;
  };
  // only on feed views (Home, Friends, Favorites and the other feeds): in a group or on someone's page, posts from people you don't follow are the point
  const homeFeed = () => /^\/((home\.php)?|feeds?(\/.*)?|groups\/feed\/?)$/.test(location.pathname);
  let whyKnown = ''; // why the last post checked counts as known (for the debug label)
  const stranger = ls => {
    whyKnown = '';
    if (knownSet.size < 20) { whyKnown = 'no list'; return false; }
    if (!ls[1] || !TIME.test(ls[1])) { whyKnown = 'not one author'; return false; }
    const head = norm(ls[0]);
    if (knownSet.has(head)) { whyKnown = 'known'; return false; }
    for (const n of knownSet) if (head.startsWith(n + ' ')) { whyKnown = 'known: ' + n; return false; } // "Jim McNulty is with ...", "Jim McNulty shared a memory"
    return true;
  };
  const headerLines = post => {
    const dbg = post.querySelector(':scope > .fbmc-dbg');
    const top0 = (dbg ? dbg.getBoundingClientRect().bottom : post.getBoundingClientRect().top), bits = [];
    const w = document.createTreeWalker(post, NodeFilter.SHOW_TEXT);
    for (let n; (n = w.nextNode());) {
      if (!n.data.trim() || !shown(n.parentElement) || n.parentElement.closest('.fbmc-dbg,.fbmc-bar')) continue; // skip our own labels
      const r = document.createRange(); r.selectNodeContents(n);
      const q = [...r.getClientRects()].find(q => q.width > 1 && q.height > 1);
      if (q && q.top - top0 < 170) bits.push({ t: n.data, x: q.left, y: q.top + q.height / 2 });
    }
    post.querySelectorAll('svg use').forEach(u => {
      const q = u.closest('svg').getBoundingClientRect(), t = resolveUse(u);
      if (t.trim() && q.width > 1 && q.top - top0 < 170) bits.push({ t, x: q.left, y: q.top + q.height / 2 });
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
  // compact, low-key card that stands in for a hidden post:  [x] Label · name ............ [Undo]
  // Facebook's phone page catches taps on posts before they reach anything inside them, so Undo buttons are answered here,
  // on the window before Facebook sees the tap: a tap (not a scroll) that lands on an Undo button
  const undoOf = new WeakMap();
  let tx = 0, ty = 0;
  // every layer under the finger, since Facebook can lay an invisible tap layer over the post
  const undoAt = (x, y) => { for (const el of document.elementsFromPoint(x, y)) for (let e = el; e; e = e.parentElement) if (undoOf.has(e)) return e; return null; };
  ['touchstart', 'pointerdown', 'mousedown'].forEach(ev => addEventListener(ev, e => {
    const p = e.touches ? e.touches[0] : e; tx = p.clientX; ty = p.clientY;
    if (undoAt(tx, ty)) e.stopImmediatePropagation();
  }, { capture: true, passive: true }));
  ['touchend', 'pointerup', 'mouseup', 'click'].forEach(ev => addEventListener(ev, e => {
    const p = e.changedTouches ? e.changedTouches[0] : e;
    const b = undoAt(p.clientX, p.clientY); if (!b) return;
    e.stopImmediatePropagation(); if (e.cancelable) e.preventDefault();
    if (Math.hypot(p.clientX - tx, p.clientY - ty) <= 10 || e.type === 'click') undoOf.get(b)();
  }, { capture: true }));
  // Taps inside Facebook's feed never reach the Undo buttons on the phone, but taps on our own controls (outside the feed) do.
  // So each visible Undo button gets an invisible tap target of our own, laid over it from outside the feed and kept in place as you scroll.
  const undoBtns = new Set(), hitOf = new Map();
  const hits = document.createElement('div');
  hits.style.cssText = 'position:fixed;left:0;top:0;width:0;height:0;z-index:9998;pointer-events:none';
  let undoRaf = 0;
  const placeHits = () => {
    undoRaf = 0;
    if (!hits.isConnected) document.body.appendChild(hits);
    undoBtns.forEach(b => {
      const r = b.isConnected ? b.getBoundingClientRect() : null;
      let h = hitOf.get(b);
      if (!r || !r.width || r.bottom < 0 || r.top > innerHeight) { if (h) h.style.display = 'none'; if (!b.isConnected) { if (h) h.remove(); hitOf.delete(b); undoBtns.delete(b); } return; }
      if (!h) {
        h = document.createElement('div');
        h.style.cssText = 'position:fixed;pointer-events:auto;cursor:pointer;background:transparent';
        h.addEventListener('click', e => { e.stopPropagation(); e.preventDefault(); const f = undoOf.get(b); if (f) f(); h.remove(); hitOf.delete(b); undoBtns.delete(b); });
        hits.appendChild(h); hitOf.set(b, h);
      }
      Object.assign(h.style, { display: '', left: r.left - 6 + 'px', top: r.top - 6 + 'px', width: r.width + 12 + 'px', height: r.height + 12 + 'px' });
    });
  };
  const trackUndo = () => { if (!undoRaf) undoRaf = requestAnimationFrame(placeHits); };
  ['scroll', 'resize', 'touchmove'].forEach(ev => addEventListener(ev, () => { if (undoBtns.size) trackUndo(); }, { passive: true, capture: true }));
  setInterval(() => { if (undoBtns.size) trackUndo(); }, 500); // posts above can change height without a scroll
  const makeBar = (c, label, sub, onUndo) => {
    const bar = document.createElement('div');
    bar.style.cssText = 'display:flex;align-items:center;gap:8px;padding:4px 6px 4px 10px;background:' + c.card + ';border-radius:8px;font:13px/20px system-ui,sans-serif;color:' + c.sub;
    bar.innerHTML = '<span style="flex:none;width:12px;height:12px;border-radius:3px;text-align:center;font:bold 8px/12px system-ui,sans-serif"></span><span style="flex:1;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis"></span><button style="flex:none;border:0;border-radius:6px;padding:1px 7px;font:600 11px/16px system-ui,sans-serif;cursor:pointer">Undo</button>';
    const [icon, text, btn] = bar.children;
    const dim = c.card === '#242526' ? '#7c7f84' : '#8a8d91'; // same gray as the description
    icon.textContent = '✕'; icon.style.background = c.card === '#242526' ? '#4e4f52' : '#c6c9cd'; icon.style.color = c.card;
    text.textContent = label + (sub ? ' · ' + sub : '');
    text.style.cssText += ';font-size:12px;font-style:italic;color:' + dim; // dimmer than the rest of the card
    btn.style.background = c.card === '#242526' ? '#303132' : '#eef0f2'; btn.style.color = dim;
    let done = false;
    undoOf.set(btn, () => { if (!done) { done = true; onUndo(); } });
    undoBtns.add(btn); trackUndo();
    return bar;
  };
  const collapse = (post, label, name) => {
    post.dataset.fbmc = 'hidden';
    const kids = [...post.children].filter(k => !k.classList.contains('fbmc-dbg'));
    kids.forEach(k => { k.dataset.fbmcDisp = k.style.display; k.style.display = 'none'; });
    post.dataset.fbmcH = post.style.height;
    post.dataset.fbmcPad = post.style.padding;
    post.style.height = 'auto'; post.style.padding = '0'; // just the bar's own padding, like the desktop card
    const expand = () => {
      bar.remove();
      kids.forEach(k => { k.style.display = k.dataset.fbmcDisp || ''; delete k.dataset.fbmcDisp; });
      post.style.height = post.dataset.fbmcH || ''; delete post.dataset.fbmcH;
      post.style.padding = post.dataset.fbmcPad || ''; delete post.dataset.fbmcPad;
      restore.delete(post);
    };
    restore.set(post, expand);
    const bar = makeBar(palette(), label, name, () => { kept.add(postKey(post)); expand(); post.dataset.fbmc = 'shown'; });
    bar.className = 'fbmc-bar';
    bar.style.position = 'relative'; bar.style.zIndex = '10'; // above any tap layer Facebook puts over the post (and below our own tap targets)
    post.prepend(bar);
  };
  const LABEL = { ad: 'Ad hidden', follow: 'Suggestion hidden', join: 'Group suggestion hidden', reels: 'Reels hidden', suggestions: 'Suggestions hidden', strangers: 'Not someone you follow', ai: 'AI content hidden' };
  const act = (post, kind, name) => {
    post.dataset.fbmcKind = kind;
    if (!enabled(kind)) { post.dataset.fbmc = 'off'; return; }
    collapse(post, LABEL[kind], name);
  };

  // ---- counter ----
  const box = document.createElement('div');
  box.style.cssText = 'position:fixed;right:56px;bottom:8px;min-height:36px;box-sizing:border-box;display:flex;align-items:center;max-width:calc(100vw - 68px);z-index:9999;padding:4px 10px;border-radius:8px;background:rgba(36,37,38,.6);-webkit-backdrop-filter:blur(14px) saturate(160%);backdrop-filter:blur(14px) saturate(160%);border:1px solid rgba(255,255,255,.14);color:#fff;font:12px/1.4 system-ui,sans-serif;cursor:grab;user-select:none';
  const show = () => {
    if (!box.isConnected) document.body.appendChild(box);
    const n = ads + sugg + strangers + ai + reels;
    const pct = `${posts ? Math.round(100 * n / posts) : 0}%`;
    if (box.textContent !== pct) { box.textContent = pct; place(); }
    if (stats.style.display === 'block') {
      const rows = [['Ads', ads], ['Suggestions', sugg], ['Not someone you follow', strangers], ['AI content', ai], ['Reels', reels]];
      const html = rows.map(([k, v]) => `<span>${k}</span><span>${v}</span>`).join('');
      if (stats.dataset.v !== html + n + posts + plained) {
        stats.dataset.v = html + n + posts + plained;
        stats.innerHTML = `<div style="display:grid;grid-template-columns:1fr auto;gap:1px 14px;font-variant-numeric:tabular-nums">${html}</div>`
          + `<div style="display:flex;justify-content:space-between;gap:14px;border-top:1px solid #3e4042;margin-top:4px;padding-top:4px;font-variant-numeric:tabular-nums"><span>Hidden ${n} of ${posts} posts</span><span>${pct}</span></div>`
          + `<div style="color:#b0b3b8;font-variant-numeric:tabular-nums">Backgrounds removed ${plained}</div>`;
        stats.querySelectorAll('div > span:nth-child(even)').forEach(s => { s.style.textAlign = 'right'; });
      }
      // above the counter, right edges lined up, kept on screen
      const b = box.getBoundingClientRect(), w = stats.offsetWidth;
      stats.style.left = Math.max(4, Math.min(b.right - w, innerWidth - 4 - w)) + 'px';
      stats.style.top = (b.top - stats.offsetHeight - 8 >= 4 ? b.top - stats.offsetHeight - 8 : b.bottom + 8) + 'px';
    }
  };
  // tap the percentage for the breakdown (the menu is separate)
  const stats = document.createElement('div');
  stats.style.cssText = 'position:fixed;z-index:10000;display:none;box-sizing:border-box;max-width:calc(100vw - 8px);padding:6px 10px;border-radius:8px;background:rgba(36,37,38,.6);-webkit-backdrop-filter:blur(14px) saturate(160%);backdrop-filter:blur(14px) saturate(160%);border:1px solid rgba(255,255,255,.14);color:#fff;font:12px/1.5 system-ui,sans-serif;box-shadow:0 2px 12px rgba(0,0,0,.6)';
  const toggleStats = open => {
    if (!stats.isConnected) document.body.appendChild(stats);
    stats.style.display = (open === undefined ? stats.style.display !== 'block' : open) ? 'block' : 'none';
    show();
  };
  box.addEventListener('click', e => { e.stopPropagation(); if (moved) { moved = false; return; } if (panel.style.display === 'block') { panel.style.display = 'none'; place(); } toggleStats(); });
  // it closes on another tap of the percentage, a tap anywhere else that reaches us, or scrolling the feed
  addEventListener('pointerdown', e => { if (stats.style.display === 'block' && !stats.contains(e.target) && !box.contains(e.target)) toggleStats(false); }, true);
  addEventListener('scroll', () => { if (stats.style.display === 'block') toggleStats(false); }, { passive: true });

  // ---- debug labels ----
  const tag = (el, msg) => {
    if (!opt.debug) return;
    let d = el.querySelector(':scope > .fbmc-dbg');
    if (!d) { d = document.createElement('div'); d.className = 'fbmc-dbg'; d.style.cssText = 'font:10px/1.3 monospace;color:#ff0;background:#600;padding:1px 4px;white-space:pre-wrap'; el.prepend(d); }
    const cs = getComputedStyle(el), r = el.getBoundingClientRect();
    const m = msg + '  [' + cs.position + ' h' + Math.round(r.height) + ' kids' + el.children.length + ']';
    if (d.textContent !== m) d.textContent = m;
  };

  const OPTIONS = [['friends', 'Open the Friends feed'], ['follow', 'Hide Follow suggestions'], ['join', 'Hide Join (group) suggestions'], ['suggestions', 'Hide "Suggested for you" blocks'], ['reels', 'Hide Reels tray'], ['errors', 'Hide "Something went wrong" tiles'], ['plain', 'Remove colored backgrounds from text posts'], ['nags', 'Close "Get the app" popups'], ['strangers', 'Hide posts from people and pages you don\'t follow'], ['ai', 'Hide posts labeled "AI content"'], ['debug', 'Debug labels']];
  // ---- settings button (the FB Cleaner logo) + panel ----
  const LOGO = '<svg viewBox="0 0 100 100" width="100%" height="100%" style="display:block"><circle cx="50" cy="50" r="42" fill="none" stroke="#e0245e" stroke-width="9"/><line x1="69" y1="31" x2="31" y2="69" stroke="#e0245e" stroke-width="9" stroke-linecap="round"/><circle cx="34" cy="36" r="8" fill="none" stroke="#8a8d91" stroke-width="6"/><circle cx="66" cy="64" r="8" fill="none" stroke="#8a8d91" stroke-width="6"/></svg>';
  const gear = document.createElement('div');
  gear.title = 'FB Cleaner settings';
  gear.innerHTML = LOGO;
  gear.style.cssText = 'position:fixed;right:12px;bottom:8px;z-index:10000;width:36px;height:36px;padding:3px;box-sizing:border-box;border-radius:50%;background:rgba(36,37,38,.6);-webkit-backdrop-filter:blur(14px) saturate(160%);backdrop-filter:blur(14px) saturate(160%);border:1px solid rgba(255,255,255,.14);box-shadow:0 1px 4px rgba(0,0,0,.5);cursor:pointer;user-select:none';
  const panel = document.createElement('div');
  panel.style.cssText = 'position:fixed;right:12px;bottom:52px;z-index:10000;box-sizing:border-box;max-width:calc(100vw - 24px);padding:8px 12px;border-radius:10px;background:rgba(36,37,38,.6);-webkit-backdrop-filter:blur(14px) saturate(160%);backdrop-filter:blur(14px) saturate(160%);border:1px solid rgba(255,255,255,.14);color:#e4e6eb;font:400 12px/1.6 system-ui,sans-serif;box-shadow:0 2px 12px rgba(0,0,0,.6);display:none';
  const head = document.createElement('div');
  head.style.cssText = 'display:flex;align-items:center;gap:6px;padding:0 0 6px;margin-bottom:4px;border-bottom:1px solid #3e4042;font:400 14px/1.2 system-ui,sans-serif';
  head.innerHTML = '<span style="flex:none;width:20px;height:20px">' + LOGO + '</span><a href="https://blog.throbs.net/fb-cleaner/" target="_blank" rel="noopener" title="About FB Cleaner" style="color:inherit;text-decoration:none">FB Cleaner</a><span style="font-weight:400;font-size:9px;color:#7c7f84;margin-left:auto;align-self:flex-start">Mobile v62</span>';
  const about = head.querySelector('a'); // the name links to FB Cleaner's page
  about.addEventListener('mouseenter', () => { about.style.textDecoration = 'underline'; });
  about.addEventListener('mouseleave', () => { about.style.textDecoration = 'none'; });
  panel.appendChild(head);
  // [setting, label, parent setting for an indented sub-option]
  const boxes = {};
  const syncSubs = () => OPTIONS.forEach(([k, , parent]) => { if (parent) { boxes[k].disabled = !opt[parent]; boxes[k].parentElement.style.opacity = opt[parent] ? '' : '.5'; } });
  OPTIONS.forEach(([k, text, parent]) => {
    const row = document.createElement('label');
    row.style.cssText = 'display:flex;align-items:center;gap:7px;cursor:pointer;font-weight:400;color:#e4e6eb' + (parent ? ';padding-left:20px' : ''); // Facebook styles labels dim gray
    const cb = document.createElement('input');
    cb.type = 'checkbox'; cb.checked = !!opt[k]; cb.style.cssText = 'width:13px;height:13px;margin:0;accent-color:#5d6064';
    cb.addEventListener('change', () => { opt[k] = cb.checked; save(); syncSubs(); applySettings(k); });
    row.append(cb, document.createTextNode(text));
    panel.appendChild(row);
    boxes[k] = cb;
  });
  syncSubs();
  // under "Hide posts from people and pages you don't follow": how big the list is and when it was fetched
  const knownRow = document.createElement('div');
  knownRow.style.cssText = 'padding-left:20px;font:400 11px/1.5 system-ui,sans-serif;color:#9a9da2';
  boxes.strangers.parentElement.after(knownRow);
  const ago = t => { const m = Math.round((Date.now() - t) / 6e4); return m < 1 ? 'just now' : m < 60 ? m + ' min ago' : m < 1440 ? Math.round(m / 60) + ' h ago' : Math.round(m / 1440) + ' d ago'; };
  const showKnown = () => {
    if (!knownRow) return;
    const s = knownBusy ? 'Updating your list...' : !known ? 'List not loaded yet' : known.error ? 'List update failed (' + known.error + ')' : known.friends + ' friends + ' + (known.following === null ? '? ' : known.following + ' ') + 'followed, ' + ago(known.at) + (known.followErr ? ' (followed list failed: ' + known.followErr + ')' : '');
    knownRow.innerHTML = '<span></span> <a href="#" style="color:#9a9da2">Refresh</a>';
    knownRow.firstChild.textContent = s;
    knownRow.lastChild.style.display = knownBusy ? 'none' : '';
  };
  knownRow.addEventListener('click', e => { if (e.target.tagName === 'A') { e.preventDefault(); e.stopPropagation(); refreshKnown(); } });
  showKnown();
  setInterval(showKnown, 60000);
  // fetch the list on its own, on the phone layout: when it's missing or a day old, or 30 minutes after a failed try.
  // Its age is shared by every tab, so opening Facebook again doesn't fetch it again.
  const autoKnown = () => {
    try { const s = JSON.parse(localStorage.getItem(KNOWN_KEY) || 'null'); if (s && (!known || s.at > known.at)) { known = s; if (s.names) knownSet = new Set(s.names); showKnown(); } } catch (e) {} // another tab may have fetched it
    if (document.querySelector('[data-mcomponent]') && opt.strangers && (!known || !known.names || Date.now() - known.at > (known.error ? 18e5 : DAY))) refreshKnown(); };
  setTimeout(autoKnown, 8000);
  setInterval(autoKnown, 3e5);
  // ---- Debug labels are for the author: the option stays hidden unless you press Ctrl+Alt+D (or tap the version number 5 times) ----
  const dev = () => { try { return localStorage.getItem('fbc-dev') === '1'; } catch (e) { return false; } };
  const syncDev = init => {
    boxes.debug.parentElement.style.display = dev() ? '' : 'none';
    if (!dev() && opt.debug) { opt.debug = false; boxes.debug.checked = false; save(); if (!init) applySettings('debug'); }
  };
  const toggleDev = () => { try { localStorage.setItem('fbc-dev', dev() ? '0' : '1'); } catch (e) {} syncDev(); };
  addEventListener('keydown', e => { if (e.ctrlKey && e.altKey && /^d$/i.test(e.key)) { e.preventDefault(); if (e.fbcDev) syncDev(); else { e.fbcDev = 1; toggleDev(); } } });
  let taps = [];
  head.lastElementChild.addEventListener('click', () => { const now = Date.now(); taps = taps.filter(t => now - t < 2000).concat(now); if (taps.length >= 5) { taps = []; toggleDev(); } });
  syncDev(true);
  gear.addEventListener('click', e => { e.stopPropagation(); if (moved) { moved = false; return; } panel.style.display = panel.style.display === 'none' ? 'block' : 'none'; if (panel.style.display === 'block') toggleStats(false); show(); place(); });
  // ---- drag the button and counter (together) out of the way; the spot is remembered in this browser ----
  const POS = 'fbc-pos-mobile';
  let pos = { x: 0, y: 0 }, moved = false, drag = null;
  try { pos = Object.assign(pos, JSON.parse(localStorage.getItem(POS) || '{}')); } catch (e) {}
  const place = () => {
    const at = (x, y) => `translate(${x}px,${y}px)`;
    gear.style.transform = box.style.transform = panel.style.transform = at(pos.x, pos.y);
    if (!gear.isConnected) return;
    // keep the pair on screen (a smaller window or a turned phone can push it off)
    const g = gear.getBoundingClientRect(), b = box.isConnected ? box.getBoundingClientRect() : g;
    const L = Math.min(g.left, b.left), R = Math.max(g.right, b.right), T = Math.min(g.top, b.top), B = Math.max(g.bottom, b.bottom);
    const fx = L < 4 ? 4 - L : R > innerWidth - 4 ? innerWidth - 4 - R : 0;
    const fy = T < 4 ? 4 - T : B > innerHeight - 4 ? innerHeight - 4 - B : 0;
    if (fx || fy) { pos.x += fx; pos.y += fy; gear.style.transform = box.style.transform = panel.style.transform = at(pos.x, pos.y); }
    // the menu follows; it opens below the button instead if there's no room above, and slides sideways to stay on screen
    if (panel.style.display === 'block') {
      const p = panel.getBoundingClientRect(), g2 = gear.getBoundingClientRect();
      const py = p.top < 4 ? g2.bottom + 8 - p.top : 0;
      const px = p.left < 4 ? 4 - p.left : p.right > innerWidth - 4 ? innerWidth - 4 - p.right : 0;
      if (px || py) panel.style.transform = at(pos.x + px, pos.y + py);
    }
  };
  [gear, box].forEach(el => {
    el.style.touchAction = 'none';
    el.addEventListener('pointerdown', e => {
      if (e.button) return;
      drag = { sx: e.clientX, sy: e.clientY, ox: pos.x, oy: pos.y }; moved = false;
      try { el.setPointerCapture(e.pointerId); } catch (err) {}
    });
    el.addEventListener('pointermove', e => {
      if (!drag) return;
      const dx = e.clientX - drag.sx, dy = e.clientY - drag.sy;
      if (!moved && Math.hypot(dx, dy) < 6) return; // a tap, not a drag
      moved = true; e.preventDefault();
      pos.x = drag.ox + dx; pos.y = drag.oy + dy; place();
    });
    const end = () => { if (!drag) return; drag = null; if (moved) try { localStorage.setItem(POS, JSON.stringify(pos)); } catch (e) {} };
    el.addEventListener('pointerup', end); el.addEventListener('pointercancel', end);
  });
  addEventListener('resize', place);
  const applySettings = k => {
    if (k === 'debug' && !opt.debug) document.querySelectorAll('.fbmc-dbg').forEach(d => d.remove());
    if (k === 'debug' || k === 'strangers' || k === 'ai') { document.querySelectorAll('[data-fbmc="post"]').forEach(p => delete p.dataset.fbmc); }
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
      if (p) { if ('fbmcH' in p.dataset) { p.style.height = p.dataset.fbmcH; delete p.dataset.fbmcH; } if ('fbmcPad' in p.dataset) { p.style.padding = p.dataset.fbmcPad; delete p.dataset.fbmcPad; } delete p.dataset.fbmc; restore.delete(p); }
    });
  };
  const quickCheck = post => {
    const nt = nodeTexts(post, 6);
    if (nt[0] === 'Reels') { // Reels tray with a plain "Reels" heading
      if (!post.dataset.fbmcKind) { posts++; reels++; }
      tag(post, 'REELS');
      act(post, 'reels', '');
      return true;
    }
    if (nt[0] && SUGG_BLOCK.test(nt[0])) { // suggestion carousel heading
      if (!post.dataset.fbmcKind) { posts++; sugg++; }
      tag(post, 'SUGGESTIONS: ' + nt[0]);
      act(post, 'suggestions', nt[0].match(SUGG_BLOCK)[1]);
      return true;
    }
    // "Ad" as its own text piece right after the name: catches ads before Facebook draws them
    const adAt = nt.findIndex((x, i) => i > 0 && i < 4 && /^(Ad|Sponsored)( ?[\u00b7\u2022])?$/.test(x));
    if (adAt > 0) {
      const nm = nt.slice(0, adAt).join(' ');
      if (!post.dataset.fbmcKind) { posts++; ads++; }
      tag(post, 'AD (text): ' + nm);
      if (kept.has(postKey(post))) { post.dataset.fbmcKind = 'ad'; post.dataset.fbmc = 'shown'; return true; }
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
      if (!post.dataset.fbmcKind) { posts++; sugg++; }
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
    let name = ls[0].replace(/\s*[·•]?\s*(Follow|Join|Add friend)$/, '').trim();
    // the Ad label sits on a short line under the name (line 3 if the name wraps); long lines are post text
    let isAd = [ls[1], ls[2] || ''].some(l => l.length < 20 && AD.test(l));
    // ads with a "Friends follow Netflix." line above the name push the Ad label further down: it then has to be the whole line
    if (!isAd) { const j = ls.findIndex((l, i) => i >= 3 && i < 6 && /^(Ad|Sponsored)\s*([·•].*)?$/.test(l)); if (j > 0) { isAd = true; name = ls[j - 1]; } }
    // "Add friend" counts as a suggestion like Follow; in a group or on someone's page, Follow/Join/Add friend posts are left alone
    const kind = isAd ? 'ad' : m && homeFeed() ? (m[2] === 'Join' ? 'join' : 'follow') : 'post';
    // Facebook's own "AI content" label, on the line under the name ("Joe Miller · AI content · 16h"),
    // also on a post shared inside another (further down than the header lines reach)
    if (kind === 'post' && opt.ai && (ls.slice(1, 4).some(l => AI_LABEL.test(l)) || hasAiLabel(post))) {
      if (!post.dataset.fbmcKind) { posts++; ai++; }
      tag(post, 'AI: ' + ls.slice(0, 2).join(' / '));
      if (kept.has(postKey(post))) { post.dataset.fbmcKind = 'ai'; post.dataset.fbmc = 'shown'; return; }
      act(post, 'ai', name);
      return;
    }
    if (kind === 'post' && opt.strangers && homeFeed() && stranger(ls)) {
      if (!post.dataset.fbmcKind) { posts++; strangers++; }
      tag(post, 'STRANGER: ' + ls.slice(0, 2).join(' / '));
      if (kept.has(postKey(post))) { post.dataset.fbmcKind = 'strangers'; post.dataset.fbmc = 'shown'; return; }
      act(post, 'strangers', name);
      return;
    }
    if (kind === 'post') {
      tag(post, 'POST' + (opt.strangers ? ' (' + whyKnown + ')' : '') + ': ' + ls.slice(0, 2).join(' / '));
      post.dataset.fbmcSeen = (+post.dataset.fbmcSeen || 0) + 1;
      if (+post.dataset.fbmcSeen > 3) { post.dataset.fbmc = 'post'; posts++; }
      return;
    }
    if (!post.dataset.fbmcKind) { posts++; if (kind === 'ad') ads++; else sugg++; }
    tag(post, kind.toUpperCase() + ': ' + ls.slice(0, 2).join(' / '));
    if (kept.has(postKey(post))) { post.dataset.fbmcKind = kind; post.dataset.fbmc = 'shown'; return; }
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

  // ---- text posts on a colored/picture background: show the words as a normal post instead ----
  // undo one: put that post's colors back (it stays that way until the tab closes)
  const unplain = box => {
    const p = box.querySelector(':scope > .fbmc-plain');
    if (p) p.remove();
    [...box.children].forEach(k => { k.style.display = k.dataset.fbmcPlainDisp || ''; delete k.dataset.fbmcPlainDisp; });
    for (let e = box; e; e = e.parentElement) { if ('fbmcPlainH' in e.dataset) { e.style.height = e.dataset.fbmcPlainH; delete e.dataset.fbmcPlainH; } if (e.dataset.trackingDurationId) break; }
    if (box.dataset.fbmcPlainBg) { try { const [bi, bc] = JSON.parse(box.dataset.fbmcPlainBg); box.style.backgroundImage = bi; box.style.backgroundColor = bc; } catch (e) {} delete box.dataset.fbmcPlainBg; }
    delete box.dataset.fbmcPlain;
  };
  const toPlain = (box, words) => {
    const oldH = box.getBoundingClientRect().height;
    [...box.children].forEach(k => { k.dataset.fbmcPlainDisp = k.style.display; k.style.display = 'none'; });
    const c = palette();
    const p = document.createElement('div');
    p.className = 'fbmc-plain';
    p.style.cssText = 'color:' + c.text + ';font:18px/1.33 system-ui,sans-serif;padding:0 12px 10px;white-space:pre-wrap;overflow-wrap:anywhere';
    // top-right: a small note that the colors were taken off, with Undo
    const note = document.createElement('div');
    note.style.cssText = 'display:flex;justify-content:flex-end;align-items:center;gap:6px;padding:4px 0 2px;font:italic 12px/20px system-ui,sans-serif;color:' + (c.card === '#242526' ? '#7c7f84' : '#8a8d91');
    note.innerHTML = '<span>Background removed</span><span role="button" style="flex:none;padding:0 8px;border-radius:6px;font-style:normal;cursor:pointer"></span>';
    const btn = note.lastChild;
    btn.textContent = 'Undo'; btn.style.background = c.card === '#242526' ? '#303132' : '#eef0f2';
    const words_ = document.createElement('div'); words_.textContent = words;
    p.append(note, words_);
    box.append(p); box.dataset.fbmcPlain = '1'; plained++;
    // the box may paint the colors itself: take its own background off too
    box.dataset.fbmcPlainBg = JSON.stringify([box.style.backgroundImage, box.style.backgroundColor]); box.style.backgroundImage = 'none'; box.style.backgroundColor = 'transparent';
    box.dataset.fbmcPlainH = box.style.height; box.style.height = 'auto';
    // Facebook sizes every box on the phone page by hand, so shrink the post's boxes by what we saved
    const delta = oldH - box.getBoundingClientRect().height;
    for (let e = box.parentElement; e; e = e.parentElement) { const h = parseFloat(e.style.height); if (h) { e.dataset.fbmcPlainH = e.style.height; e.style.height = (h - delta) + 'px'; } if (e.dataset.trackingDurationId) break; }
    // taps inside the feed don't reach it, so it uses the same outside tap targets as the hidden-post bars
    let done = false;
    undoOf.set(btn, () => { if (done) return; done = true; box.dataset.fbmcPlainKept = '1'; unplain(box); });
    undoBtns.add(btn); trackUndo();
  };
  const plain = () => {
    if (!opt.plain) { document.querySelectorAll('[data-fbmc-plain]').forEach(unplain); document.querySelectorAll('[data-fbmc-plain-seen]').forEach(e => delete e.dataset.fbmcPlainSeen); return; }
    document.querySelectorAll('[data-tracking-duration-id] [data-mcomponent="TextArea"]:not([data-fbmc-plain-seen])').forEach(ta => {
      const sp = ta.querySelector('span'), tr = ta.getBoundingClientRect();
      if (!sp || !tr.width) return; // not drawn yet; look again next pass
      const words = ta.innerText.trim();
      if (!/\p{L}/u.test(words)) return;
      const post = ta.closest('[data-tracking-duration-id]');
      const big = parseFloat(getComputedStyle(sp).fontSize) >= 22;
      let box = null;
      // 1) words drawn on top of a full-width picture
      const img = ta.parentElement.querySelector(':scope > [data-mcomponent="ImageArea"]');
      if (img && parseFloat(ta.style.marginTop) < 0 && big) {
        const ir = img.getBoundingClientRect();
        if (ir.width >= innerWidth * 0.9 && tr.width >= ir.width * 0.5) box = ta.parentElement;
      }
      // 2) words on a colored or gradient background: a full-width box just above the words that paints its own background
      if (!box && big) {
        const postBg = getComputedStyle(post).backgroundColor;
        for (let e = ta, n = 0; e && e !== post && n < 5; e = e.parentElement, n++) {
          const cs = getComputedStyle(e);
          const painted = cs.backgroundImage !== 'none' || (cs.backgroundColor !== 'rgba(0, 0, 0, 0)' && cs.backgroundColor !== 'transparent' && cs.backgroundColor !== postBg);
          if (painted && e.getBoundingClientRect().width >= innerWidth * 0.9) { box = e; break; }
        }
      }
      // 3) words over a full-width picture somewhere behind them (some colored backgrounds are a picture, not a CSS background)
      if (!box && big) {
        for (let e = ta.parentElement, n = 0; e && e !== post && n < 4 && !box; e = e.parentElement, n++) {
          for (const pic of e.querySelectorAll(':scope > [data-mcomponent="ImageArea"], :scope > img')) {
            const ir = pic.getBoundingClientRect();
            if (ir.width >= innerWidth * 0.9 && ir.top <= tr.top + 4 && ir.bottom >= tr.bottom - 4) { box = e; break; }
          }
        }
      }
      // pictures and colors can arrive after the words: look again on the next few passes before giving up on this post
      if (!box) { const tries = (+ta.dataset.fbmcPlainTries || 0) + 1; ta.dataset.fbmcPlainTries = tries; if (tries < 8) { if (opt.debug) tag(post, 'TEXT plain? not yet (' + tries + '): font ' + getComputedStyle(sp).fontSize); return; } }
      ta.dataset.fbmcPlainSeen = '1';
      if (opt.debug) tag(post, 'TEXT ' + (box ? 'ON COLOR -> plain' : 'plain? no') + ': font ' + getComputedStyle(sp).fontSize + (img ? ' img' : '') + ' "' + words.slice(0, 30) + '"');
      if (!box || box.dataset.fbmcPlain || box.dataset.fbmcPlainKept) return;
      toPlain(box, words);
    });
  };

  // ---- "Facebook is better on the app" and similar get-the-app sheets: press their own "Not now" ----
  const NAG = /better on the app|get the (facebook )?app|open (it )?in the app|use the app|download the app|continue in the app/i, NOT_NOW = /^(Not now|No thanks|Maybe later|Continue in browser|Stay on web)$/i;
  let nagAt = 0;
  const nags = () => {
    if (!opt.nags || Date.now() - nagAt < 1000) return; // a full text walk, so at most once a second
    nagAt = Date.now();
    const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    for (let n; (n = w.nextNode());) {
      if (!NOT_NOW.test(n.data.trim()) || n.parentElement.closest('.fbmc-bar,[data-fbmc-nag]')) continue;
      // the sheet: the nearest box around the button that also carries the get-the-app pitch
      let sheet = n.parentElement;
      while (sheet && sheet !== document.body && !NAG.test(sheet.textContent)) sheet = sheet.parentElement;
      if (!sheet || sheet === document.body || sheet.textContent.length > 600) continue;
      const btn = n.parentElement.closest('[role="button"],button,a,[data-action-id],[tabindex]') || n.parentElement;
      btn.dataset.fbmcNag = '1';
      btn.click();
      setTimeout(() => { // still up: hide the sheet's whole pop-up layer
        if (!sheet.isConnected || !sheet.getBoundingClientRect().height) return;
        let layer = sheet;
        for (let e = sheet; e && e !== document.body; e = e.parentElement) if (getComputedStyle(e).position === 'fixed') { layer = e; break; }
        layer.style.display = 'none';
      }, 600);
    }
  };

  // ---- main pass ----
  const scan = () => {
    if (!document.querySelector('[data-mcomponent]')) return; // desktop layout: leave it to the desktop script
    if (!gear.isConnected) { document.body.append(gear, panel); place(); }
    // only show our controls on the feed: on a post, photo or profile they'd cover Facebook's own buttons
    const onFeed = !/^\/(story\.php|permalink\.php|photo|reel|watch|video|notifications|messages|marketplace|search|profile\.php|groups\/[^/]+\/(posts|permalink)\/|[^/]+\/(posts|photos|videos)\/)/.test(location.pathname);
    [gear, panel, box].forEach(e => { e.style.visibility = onFeed ? '' : 'hidden'; });
    if (!onFeed) panel.style.display = 'none';
    heal();
    plain();
    nags();
    // Reels tray
    document.querySelectorAll('[aria-label^="reels" i]').forEach(r => {
      const post = r.closest('[data-tracking-duration-id]');
      if (post && !post.dataset.fbmc) { if (!post.dataset.fbmcKind) { posts++; reels++; } act(post, 'reels', ''); tag(post, 'REELS'); }
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
