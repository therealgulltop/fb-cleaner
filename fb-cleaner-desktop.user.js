// ==UserScript==
// @name         FB Cleaner (Desktop)
// @version      20
// @namespace    https://github.com/therealgulltop/fb-cleaner
// @description  Hides Facebook ads, Follow/Join suggestions, suggestion blocks and the Reels tray on the desktop site.
// @updateURL    https://raw.githubusercontent.com/therealgulltop/fb-cleaner/main/fb-cleaner-desktop.user.js
// @downloadURL  https://raw.githubusercontent.com/therealgulltop/fb-cleaner/main/fb-cleaner-desktop.user.js
// @match        https://www.facebook.com/*
// @run-at       document-idle
// @grant        none
// ==/UserScript==
// For Facebook's DESKTOP layout (does nothing on the mobile layout).
// Ads and Follow/Join posts are hidden with Facebook's own hide button.  Suggestion blocks, the Reels tray and
// "Something went wrong" tiles have no hide button, so they're collapsed on screen only.
// Click the gear (bottom-left) for settings; they're remembered in this browser.
(() => {
  if (document.documentElement.dataset.fbcdRunning) return; // another copy of this script is already running
  document.documentElement.dataset.fbcdRunning = '20';
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
  // this is the phone layout and the mobile script isn't running
  [4000, 10000].forEach(ms => setTimeout(() => {
    if (document.querySelector('[data-mcomponent]') && !document.documentElement.dataset.fbmcRunning) mismatch('Mobile', 'fb-cleaner-mobile.user.js');
  }, ms));

  // ---- settings (same names and storage as the mobile script) ----
  const DEFAULTS = { follow: true, join: true, reels: true, suggestions: true, errors: true, debug: false };
  const load = () => { try { return Object.assign({}, DEFAULTS, JSON.parse(localStorage.getItem('fbmc-settings') || '{}')); } catch (e) { return Object.assign({}, DEFAULTS); } };
  const save = () => { try { localStorage.setItem('fbmc-settings', JSON.stringify(opt)); } catch (e) {} };
  const opt = load();

  const AD = /(^|\s)(Ad|Sponsored)(\s|·|$)/, SUGG = /·\s*(Follow|Join)\s*$/;
  const MSG = /^(You won.t see this ad again\.?|Why aren.t you interested\?)$/;
  const SUGG_BLOCK = /^(Your group suggestions|Suggested for you|People you may know|Suggested groups|Groups you might like|Pages you may like|Suggested pages)\b/i;
  const REELS = /^(Reels|Reels and short videos)$/i;
  const kept = new Set(), posts = new Set(), ads = new Set(), sugg = new Set();
  let reels = 0, blocks = 0;
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

  // ---- counter ----
  const box = document.createElement('div');
  box.style.cssText = 'position:fixed;right:76px;bottom:20px;z-index:9999;padding:6px 10px;border-radius:8px;background:rgba(0,0,0,.7);color:#fff;font:12px/1.4 system-ui,sans-serif;pointer-events:none';
  const show = () => {
    if (!box.isConnected) document.body.appendChild(box);
    const n = ads.size + sugg.size, p = posts.size;
    const s = `Ads ${ads.size} + Suggested ${sugg.size + blocks} + Reels ${reels} / Posts ${p} -- ${p ? Math.round(100 * n / p) : 0}%`;
    if (box.textContent !== s) box.textContent = s;
  };

  // ---- debug labels ----
  const st = document.createElement('style');
  st.textContent = '[data-adread]::before{content:attr(data-adread);display:block;padding:2px 6px;font:11px/1.3 monospace;color:#ff0;background:#600;white-space:pre-wrap}';
  document.head.appendChild(st);
  const stamp = (el, msg) => { const s = opt.debug && el.closest('[data-virtualized]'); if (s && s.dataset.adread !== msg) s.dataset.adread = msg; };

  // ---- collapse / expand (for blocks Facebook gives no hide button) ----
  const palette = () => {
    const bg = [document.body, document.documentElement].map(e => getComputedStyle(e).backgroundColor).find(v => !/^rgba\(.*,\s*0\)$|transparent/.test(v));
    const m = (bg && bg.match(/\d+/g)) || [255, 255, 255];
    const dark = (+m[0] * 299 + +m[1] * 587 + +m[2] * 114) / 1000 < 128;
    return dark ? { card: '#242526', text: '#e4e6eb', sub: '#b0b3b8', button: '#3a3b3c' }
                : { card: '#ffffff', text: '#050505', sub: '#65676b', button: '#e4e6eb' };
  };
  const restore = new WeakMap();
  const collapse = (slot, label, sub) => {
    slot.dataset.fbcd = 'hidden';
    const kids = [...slot.children].filter(k => !k.classList.contains('fbcd-bar'));
    kids.forEach(k => { k.dataset.fbcdDisp = k.style.display; k.style.display = 'none'; });
    const c = palette();
    const bar = document.createElement('div');
    bar.className = 'fbcd-bar';
    // same look as Facebook's own "Ad hidden" card: icon, bold title, line underneath, Undo button
    bar.style.cssText = 'display:flex;align-items:center;justify-content:space-between;gap:12px;padding:16px;margin-bottom:16px;background:' + c.card + ';border-radius:8px;box-shadow:0 1px 2px rgba(0,0,0,.2);font:15px/1.3 "Segoe UI Historic","Segoe UI",Helvetica,Arial,sans-serif';
    bar.innerHTML = '<div style="display:flex;align-items:center;gap:12px;min-width:0"><span style="flex:none;width:24px;height:24px;border-radius:6px;text-align:center;font:bold 13px/24px system-ui,sans-serif"></span><div style="min-width:0"><div style="font-weight:600"></div><div style="font-size:13px"></div></div></div><button style="flex:none;border:0;border-radius:6px;padding:8px 14px;font:600 15px system-ui,sans-serif;cursor:pointer">Undo</button>';
    const icon = bar.firstChild.firstChild, title = bar.firstChild.lastChild.firstChild, line = bar.firstChild.lastChild.lastChild;
    icon.textContent = '✕'; icon.style.background = c.text; icon.style.color = c.card;
    title.textContent = label; title.style.color = c.text;
    line.textContent = sub || ''; line.style.color = c.sub; if (!sub) line.remove();
    bar.lastChild.style.background = c.button; bar.lastChild.style.color = c.text;
    const expand = () => {
      bar.remove();
      kids.forEach(k => { k.style.display = k.dataset.fbcdDisp || ''; delete k.dataset.fbcdDisp; });
      restore.delete(slot);
    };
    restore.set(slot, expand);
    bar.lastChild.addEventListener('click', e => { e.stopPropagation(); expand(); slot.dataset.fbcd = 'shown'; });
    slot.prepend(bar);
  };
  // Facebook reuses feed slots as you scroll; if it dropped our card, un-hide what we hid and check the slot again
  const heal = () => {
    document.querySelectorAll('[data-fbcd-disp]').forEach(k => {
      const s = k.parentElement;
      if (s && s.querySelector(':scope > .fbcd-bar')) return;
      k.style.display = k.dataset.fbcdDisp || ''; delete k.dataset.fbcdDisp;
    });
    document.querySelectorAll('[data-fbcd="hidden"]').forEach(s => { if (!s.querySelector(':scope > .fbcd-bar')) { delete s.dataset.fbcd; restore.delete(s); } });
  };
  // blocks with no hide button: Reels tray, suggestion carousels, error tiles
  const checkBlocks = () => {
    document.querySelectorAll('[data-virtualized]:not([data-fbcd])').forEach(slot => {
      if (slot.querySelector('[aria-label^="Hide post"]') || !slot.firstElementChild) return;
      const hs = [...slot.querySelectorAll('h2,h3,h4')].map(h => h.textContent.trim());
      const first = (slot.innerText || '').trim().split('\n')[0] || '';
      let kind = '', label = '', sub = '';
      if (hs.some(h => REELS.test(h))) { kind = 'reels'; label = 'Reels hidden'; }
      else if (SUGG_BLOCK.test(first) || hs.some(h => SUGG_BLOCK.test(h)) || slot.querySelector('[aria-label="Suggested for you"]')) {
        kind = 'suggestions'; label = 'Suggestions hidden';
        sub = (hs.find(h => SUGG_BLOCK.test(h)) || (SUGG_BLOCK.test(first) ? first : '') || 'Suggested for you').match(/^[^\d]*/)[0].trim();
      }
      else if (/Something went wrong/i.test(slot.innerText || '')) { kind = 'errors'; label = 'Error tile hidden'; }
      if (!kind) return;
      if (!slot.dataset.fbcdCounted) { slot.dataset.fbcdCounted = 1; if (kind === 'reels') reels++; else if (kind === 'suggestions') blocks++; }
      slot.dataset.fbcdKind = kind;
      stamp(slot, kind.toUpperCase() + ': ' + (hs[0] || first));
      if (!opt[kind]) { slot.dataset.fbcd = 'off'; return; }
      if (kind === 'errors') { slot.dataset.fbcd = 'err'; slot.dataset.fbcdDispSelf = slot.style.display; slot.style.display = 'none'; return; }
      collapse(slot, label, sub);
    });
  };

  // ---- settings button + panel ----
  const gear = document.createElement('div');
  gear.textContent = '⚙';
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
    if (k === 'debug' && !opt.debug) document.querySelectorAll('[data-adread]').forEach(s => delete s.dataset.adread);
    document.querySelectorAll('[data-fbcd-kind="' + k + '"]').forEach(s => {
      if (opt[k] && s.dataset.fbcd === 'off') delete s.dataset.fbcd; // collapse on next pass
      if (!opt[k] && s.dataset.fbcd === 'hidden') { const ex = restore.get(s); if (ex) ex(); s.dataset.fbcd = 'off'; }
      if (!opt[k] && s.dataset.fbcd === 'err') { s.style.display = s.dataset.fbcdDispSelf || ''; s.dataset.fbcd = 'off'; }
    });
    // Follow/Join posts already hidden through Facebook stay hidden (use its Undo); turning these on catches new ones
    if ((k === 'follow' || k === 'join') && opt[k]) document.querySelectorAll('[data-adseen]').forEach(x => delete x.dataset.adseen);
    tick();
  };

  // ---- posts with Facebook's hide button: ads and Follow/Join suggestions ----
  const scan = () => {
    if (document.querySelector('[data-mcomponent]')) return; // mobile layout: leave it to the mobile script
    if (!gear.isConnected) document.body.append(gear, panel);
    heal();
    checkBlocks();
    const now = Date.now();
    document.querySelectorAll('[aria-label^="Hide post"]:not([data-adhit])').forEach(x => {
      if (now - (+x.dataset.adseen || 0) < 1000) return; // checked <1s ago; skip to keep passes cheap
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
      const sm = (ls[0] || '').match(SUGG);
      // not marked done when neither: labels can render late, so recheck next pass
      if (AD.test(sub) || AD.test(subSp)) ads.add(k);
      else if (sm && opt[sm[1].toLowerCase()]) sugg.add(k);
      else { x.dataset.adseen = now; stamp(x, (sm ? 'SUGG (setting off): ' : 'POST: ') + read); return; }
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
  document.addEventListener('click', e => { if (!panel.contains(e.target) && e.target !== gear) panel.style.display = 'none'; });

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
