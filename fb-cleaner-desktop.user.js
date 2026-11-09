// ==UserScript==
// @name         FB Cleaner (Desktop)
// @version      18
// @namespace    https://github.com/therealgulltop/fb-cleaner
// @description  Hides Facebook ads and Follow/Join suggestions on the desktop site (clicks Facebook's own hide button).
// @updateURL    https://raw.githubusercontent.com/therealgulltop/fb-cleaner/main/fb-cleaner-desktop.user.js
// @downloadURL  https://raw.githubusercontent.com/therealgulltop/fb-cleaner/main/fb-cleaner-desktop.user.js
// @match        https://www.facebook.com/*
// @run-at       document-idle
// @grant        none
// ==/UserScript==
(() => {
  const DEBUG = false; // true = stamp each post with what the script read (for diagnosing misses)
  const AD = /(^|\s)(Ad|Sponsored)(\s|·|$)/, SUGG = /·\s*(Follow|Join)\s*$/;
  const MSG = /^(You won.t see this ad again\.?|Why aren.t you interested\?)$/;
  const kept = new Set(), posts = new Set(), ads = new Set(), sugg = new Set();
  const shown = el => { const s = getComputedStyle(el); return s.visibility !== 'hidden' && +s.opacity > 0 && parseFloat(s.fontSize) > 1 && s.color !== 'rgba(0, 0, 0, 0)'; };
  const textLines = (root, sep = '') => {
    const box = root.getBoundingClientRect(), bits = [];
    const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    for (let n; (n = w.nextNode());) {
      if (!n.data.trim() || !shown(n.parentElement)) continue;
      const r = document.createRange(); r.selectNodeContents(n);
      const rc = [...r.getClientRects()].find(q => q.width > 1 && q.height > 1 && q.right > box.left && q.left < box.right && q.bottom > box.top && q.top < box.bottom);
      if (rc) bits.push({ t: n.data, x: rc.left, y: rc.top + rc.height / 2 });
    }
    // FB also draws labels as <svg><use href="#id"> pointing at a hidden <text>
    root.querySelectorAll('svg > use').forEach(u => {
      const s = u.parentElement, rc = s.getBoundingClientRect();
      if (rc.width <= 1 || rc.height <= 1 || !shown(s)) return;
      // follow the <use> chain to the end, however deep (FB nests them several levels)
      let el = u;
      const seen = new Set();
      while (el && el.querySelector) {
        const v = el.tagName === 'use' ? el : el.querySelector('use');
        if (!v) break;
        const nx = document.getElementById((v.getAttribute('href') || v.getAttribute('xlink:href') || '').slice(1));
        if (!nx || seen.has(nx)) { el = null; break; }
        seen.add(nx); el = nx;
      }
      if (el && el.textContent.trim()) bits.push({ t: el.textContent, x: rc.left, y: rc.top + rc.height / 2 });
    });
    // group into lines by vertical center, then read each line left to right
    bits.sort((a, b) => a.y - b.y);
    let line = 0, top = -1e9;
    bits.forEach(b => { if (b.y - top > 8) { line++; top = b.y; } b.l = line; });
    bits.sort((a, b) => a.l - b.l || a.x - b.x);
    const out = [];
    bits.forEach(b => { out[b.l - 1] = (out[b.l - 1] === undefined ? '' : out[b.l - 1] + sep) + b.t; });
    return out.filter(l => l !== undefined);
  };
  const visibleText = root => textLines(root).join('\n');
  const name = x => x.getAttribute('aria-label').replace(/^Hide post by /, '');
  const key = x => { const s = x.closest('[data-virtualized]'), m = s && s.querySelector('[data-ad-preview="message"]'); return name(x) + '|' + (m ? m.textContent.slice(0, 60) : ''); };

  const box = document.createElement('div');
  box.style.cssText = 'position:fixed;right:76px;bottom:20px;z-index:9999;padding:6px 10px;border-radius:8px;background:rgba(0,0,0,.7);color:#fff;font:12px/1.4 system-ui,sans-serif;pointer-events:none';
  document.body.appendChild(box);
  if (DEBUG) {
    const st = document.createElement('style');
    st.textContent = '[data-adread]::before{content:attr(data-adread);display:block;padding:2px 6px;font:11px/1.3 monospace;color:#ff0;background:#600;white-space:pre-wrap}';
    document.head.appendChild(st);
  }
  const stamp = (x, msg) => { const s = DEBUG && x.closest('[data-virtualized]'); if (s && s.dataset.adread !== msg) s.dataset.adread = msg; };
  const show = () => {
    const n = ads.size + sugg.size;
    const s = `Ads ${ads.size} + Suggested ${sugg.size} / Posts ${posts.size} -- ${posts.size ? Math.round(100 * n / posts.size) : 0}%`;
    if (box.textContent !== s) box.textContent = s;
  };

  const scan = () => {
    const now = Date.now();
    document.querySelectorAll('[aria-label^="Hide post"]:not([data-adhit])').forEach(x => {
      if (now - (+x.dataset.adseen || 0) < 1000) return; // regular post checked <1s ago; skip to keep passes cheap
      let h = x.parentElement;
      while (h && !h.querySelector('h2,h3,h4,strong')) h = h.parentElement;
      if (!h) { stamp(x, 'NO HEADER'); return; }
      const ls = textLines(h);
      const hd = h.querySelector('h2,h3,h4,strong');
      const sub = ls.join('\n').replace(visibleText(hd), ' ');
      // same text with a space between pieces, so hidden labels glued onto "Ad"
      // (e.g. the avatar's "Online status indicator") can't hide the word
      const subSp = textLines(h, ' ').join('\n').replace(textLines(hd, ' ').join('\n'), ' ');
      const read = ls.join(' / ');
      if (!sub.includes('·')) { stamp(x, 'WAIT (no dot): ' + read); return; } // line not fully drawn yet; check again later
      const k = key(x);
      posts.add(k);
      // not marked done when neither: labels can render late, so recheck next pass
      if (AD.test(sub) || AD.test(subSp)) ads.add(k);
      else if (SUGG.test(ls[0] || '')) sugg.add(k);
      else { x.dataset.adseen = now; stamp(x, 'POST: ' + read); return; }
      stamp(x, (ads.has(k) ? 'AD: ' : 'SUGG: ') + read);
      if (!kept.has(name(x))) { x.dataset.adhit = 1; x.click(); }
    });
    show();
  };

  // Remember the advertiser on hide; on Undo, leave that advertiser alone
  document.addEventListener('click', e => {
    const t = e.target.closest && e.target.closest('a,[role="button"]');
    const slot = t && t.closest('[data-virtualized]');
    if (!slot) return;
    if (/^Hide post by /.test(t.getAttribute('aria-label') || '')) slot.dataset.adhint = name(t);
    else if (/^(Undo|Unhide post)$/.test(t.textContent.trim()) && slot.dataset.adhint) kept.add(slot.dataset.adhint);
  }, true);

  let t = 0;
  const tick = () => { if (!t) t = setTimeout(() => { t = 0; scan(); }, 120); };

  // Swap the hidden-post blurb for the poster's name; rescan as the feed loads
  new MutationObserver(() => {
    document.querySelectorAll('[data-adhint]').forEach(slot => {
      const m = [...slot.querySelectorAll('span,div')].find(e => !e.childElementCount && MSG.test(e.textContent.trim()));
      if (m) m.textContent = (/^Why/.test(m.textContent) ? 'Hidden: ' : '') + slot.dataset.adhint;
    });
    tick();
  }).observe(document.body, { childList: true, subtree: true });

  // also rescan on back/forward (page restored from cache), tab refocus, and every 1.5s as a backstop
  ['scroll', 'pageshow', 'popstate', 'focus'].forEach(ev => addEventListener(ev, tick, { passive: true }));
  document.addEventListener('visibilitychange', tick);
  setInterval(tick, 1500);
  tick();
})();
