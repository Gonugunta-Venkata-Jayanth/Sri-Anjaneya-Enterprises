/* Sri Anjaneya Enterprises — app logic */
(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const D = window.SAE_DATA || { brands: [], products: [] };
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const store = {
    get: (k, d) => { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } },
    set: (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} }
  };
  const toast = msg => { const t = $('#toast'); t.textContent = msg; t.classList.add('show'); clearTimeout(t._t); t._t = setTimeout(() => t.classList.remove('show'), 2200); };
  if (reduced) document.documentElement.classList.add('reduced');
  document.body.classList.add('loading');
  $('#year').textContent = new Date().getFullYear();

  /* ---------- Preloader ---------- */
  let pl = 0; const plBar = $('#plBar');
  const plTick = setInterval(() => { pl = Math.min(pl + Math.random() * 18, 92); plBar.style.width = pl + '%'; }, 120);
  const finishLoad = () => {
    clearInterval(plTick); plBar.style.width = '100%';
    if (finishLoad.done) return; finishLoad.done = true;
    $('#preloader').classList.add('done'); document.body.classList.remove('loading'); intro();
  };
  window.addEventListener('load', finishLoad); document.addEventListener('DOMContentLoaded', () => setTimeout(finishLoad, 1800)); setTimeout(finishLoad, 3500);

  /* ---------- Smooth scroll ---------- */
  let lenis = null;
  if (window.Lenis && !reduced) {
    lenis = new Lenis({ lerp: .1, smoothWheel: true });
    const raf = t => { lenis.raf(t); requestAnimationFrame(raf); }; requestAnimationFrame(raf);
    if (window.ScrollTrigger) lenis.on('scroll', ScrollTrigger.update);
  }
  const scrollTo = target => { const el = typeof target === 'string' ? $(target) : target; if (!el) return; lenis ? lenis.scrollTo(el, { offset: -80 }) : el.scrollIntoView({ behavior: 'smooth' }); };
  $$('a[href^="#"]').forEach(a => a.addEventListener('click', e => { const id = a.getAttribute('href'); if (id.length > 1 && $(id)) { e.preventDefault(); scrollTo(id); $('#navLinks').classList.remove('open'); $('#burger').classList.remove('open'); } }));

  /* ---------- Nav, progress, to-top, active link ---------- */
  const nav = $('#nav'), prog = $('#scrollProgress'), toTop = $('#toTop');
  const onScroll = () => {
    const y = scrollY, h = document.documentElement.scrollHeight - innerHeight;
    nav.classList.toggle('scrolled', y > 40); prog.style.width = (y / h * 100) + '%'; toTop.classList.toggle('show', y > 900);
  };
  addEventListener('scroll', onScroll, { passive: true }); onScroll();
  toTop.onclick = () => lenis ? lenis.scrollTo(0) : scrollTo('#home');
  $('#burger').onclick = () => { $('#burger').classList.toggle('open'); $('#navLinks').classList.toggle('open'); };
  const secObs = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) $$('.nav-links a').forEach(a => a.classList.toggle('active', a.getAttribute('href') === '#' + e.target.id)); }), { rootMargin: '-45% 0px -50% 0px' });
  $$('section[id]').forEach(s => secObs.observe(s));

  /* ---------- Cursor + magnetic ---------- */
  const cur = $('#cursor'), dot = $('#cursorDot');
  if (matchMedia('(hover:hover)').matches) {
    let mx = innerWidth / 2, my = innerHeight / 2, cx = mx, cy = my;
    addEventListener('mousemove', e => { mx = e.clientX; my = e.clientY; dot.style.transform = `translate(${mx}px,${my}px) translate(-50%,-50%)`; });
    (function loop() { cx += (mx - cx) * .18; cy += (my - cy) * .18; cur.style.transform = `translate(${cx}px,${cy}px) translate(-50%,-50%)`; requestAnimationFrame(loop); })();
    document.addEventListener('mouseover', e => cur.classList.toggle('hover', !!e.target.closest('a,button,.brand-card,.pump-card,.cert,select,input')));
    $$('.magnetic').forEach(m => {
      m.addEventListener('mousemove', e => { const r = m.getBoundingClientRect(); m.style.transform = `translate(${(e.clientX - r.left - r.width / 2) * .25}px,${(e.clientY - r.top - r.height / 2) * .35}px)`; });
      m.addEventListener('mouseleave', () => m.style.transform = '');
    });
  }

  /* ---------- 3D tilt ---------- */
  const bindTilt = el => {
    if (!matchMedia('(hover:hover)').matches || reduced || el._tilt) return; el._tilt = 1;
    el.addEventListener('mousemove', e => {
      const r = el.getBoundingClientRect(), x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
      el.style.transform = `perspective(900px) rotateX(${(.5 - y) * 10}deg) rotateY(${(x - .5) * 12}deg) translateZ(0)`;
      el.style.setProperty('--mx', x * 100 + '%'); el.style.setProperty('--my', y * 100 + '%');
    });
    el.addEventListener('mouseleave', () => { el.style.transform = ''; });
  };
  $$('.tilt').forEach(bindTilt);

  /* ---------- Typed brand names ---------- */
  const typed = $('[data-typed]');
  if (typed) {
    const names = D.brands.filter(b => !b.own).map(b => b.name); let i = 0, j = 0, del = false;
    (function type() {
      const w = names[i % names.length] || 'KSB'; typed.textContent = w.slice(0, j);
      if (!del && j++ >= w.length) { del = true; return setTimeout(type, 1400); }
      if (del && j-- <= 0) { del = false; i++; j = 0; }
      setTimeout(type, del ? 45 : 90);
    })();
  }

  /* ---------- Marquee ---------- */
  const mq = $('#marquee');
  const logos = D.brands.map(b => `<div class="mq-item"><img src="${b.logo}" alt="${esc(b.name)}" /></div>`).join('');
  mq.innerHTML = logos + logos + logos + logos;

  /* ---------- Counters ---------- */
  const total = D.products.length;
  $('#pumpCountHero').dataset.to = total; $('#vbPumps').dataset.to = total;
  const countUp = el => {
    const to = +el.dataset.to || 0; if (reduced) { el.textContent = to; return; }
    const t0 = performance.now(), dur = 1600;
    (function f(t) { const p = Math.min((t - t0) / dur, 1); el.textContent = Math.round(to * (1 - Math.pow(1 - p, 3))); if (p < 1) requestAnimationFrame(f); })(t0);
  };
  const cObs = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { countUp(e.target); cObs.unobserve(e.target); } }), { threshold: .6 });
  $$('.count').forEach(c => cObs.observe(c));

  /* ---------- Split headings ---------- */
  $$('.split').forEach(h => {
    const walk = node => [...node.childNodes].forEach(n => {
      if (n.nodeType === 3) {
        const frag = document.createDocumentFragment();
        n.textContent.split(/(\s+)/).forEach(t => { if (!t) return; if (/^\s+$/.test(t)) frag.append(t); else { const w = document.createElement('span'); w.className = 'w'; w.innerHTML = `<span>${esc(t)}</span>`; frag.append(w); } });
        n.replaceWith(frag);
      } else if (n.nodeType === 1) walk(n);
    });
    walk(h);
  });

  /* ---------- GSAP animations ---------- */
  function intro() {
    if (!window.gsap || reduced) { $$('.reveal').forEach(r => { r.style.opacity = 1; r.style.transform = 'none'; }); return; }
    gsap.registerPlugin(ScrollTrigger);
    gsap.from('.hero-title .word', { yPercent: 110, duration: 1.1, stagger: .12, ease: 'expo.out' });
    gsap.to('.hero .reveal', { opacity: 1, y: 0, duration: 1, stagger: .12, delay: .35, ease: 'power3.out' });
    $$('section:not(.hero) .reveal').forEach(el => gsap.to(el, { opacity: 1, y: 0, duration: 1, ease: 'power3.out', scrollTrigger: { trigger: el, start: 'top 88%' } }));
    $$('.split').forEach(h => gsap.from($$('.w>span', h), { yPercent: 110, duration: .9, stagger: .04, ease: 'expo.out', scrollTrigger: { trigger: h, start: 'top 85%' } }));
    gsap.to('.video-band video', { yPercent: 12, ease: 'none', scrollTrigger: { trigger: '.video-band', scrub: true } });
    gsap.to('.hero-inner', { yPercent: 18, opacity: .2, ease: 'none', scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true } });
  }
  const animateCards = cards => {
    if (!window.gsap || reduced) return;
    gsap.fromTo(cards, { opacity: 0, y: 40, rotateX: -12 }, { opacity: 1, y: 0, rotateX: 0, duration: .7, stagger: .05, ease: 'power3.out', clearProps: 'transform' });
  };

  /* ---------- Brands ---------- */
  const brandBySlug = Object.fromEntries(D.brands.map(b => [b.slug, b]));
  $('#brandGrid').innerHTML = D.brands.map(b => `
    <article class="brand-card glass tilt reveal ${b.own ? 'own' : ''}" data-brand="${b.slug}" tabindex="0">
      ${b.own ? '<span class="uc-ribbon">COMING SOON</span>' : ''}
      <div class="brand-logo"><img src="${b.logo}" alt="${esc(b.name)} logo" loading="lazy" /></div>
      <h3>${esc(b.name)}</h3><div class="brand-origin">${esc(b.origin)}</div>
      <span class="brand-status">✓ ${esc(b.status)}</span>
      <p>${esc(b.blurb)}</p>
      <div class="brand-foot"><span>${b.own ? 'Under construction' : `<b>${b.count}</b> submersible series`}</span><span>View →</span></div>
    </article>`).join('');
  $$('#brandGrid .brand-card').forEach(c => { bindTilt(c); const open = () => openBrand(c.dataset.brand); c.onclick = open; c.onkeydown = e => { if (e.key === 'Enter') open(); }; });

  function openBrand(slug) {
    const b = brandBySlug[slug]; if (!b) return;
    if (b.own) {
      $('#brandModalBody').innerHTML = `<div class="uc"><div class="brand-logo"><img src="${b.logo}" alt="Aqua Tide" /></div>
        <h2>Aqua Tide is <em>under construction</em></h2>
        <p>Our own submersible motor brand, engineered for durability and energy efficiency in Indian water conditions. The full Aqua Tide range will be hosted here soon.</p>
        <div class="bar"><i></i></div><small class="muted">Coming soon</small>
        <div style="margin-top:22px"><a class="btn btn-gold" href="https://wa.me/919246607214?text=${encodeURIComponent('Hi, I would like to know about Aqua Tide motors.')}" target="_blank" rel="noopener">Ask about Aqua Tide</a></div></div>`;
      return openModal('#brandModal');
    }
    const list = D.products.filter(p => p.brand === slug);
    const render = cat => {
      const items = list.filter(p => cat === 'all' || p.category === cat);
      $('#bmGrid').innerHTML = items.map(cardHTML).join('') || '<div class="empty">No series in this category.</div>';
      wireCards($('#bmGrid'));
    };
    $('#brandModalBody').innerHTML = `
      <div class="bm-head"><div class="brand-logo"><img src="${b.logo}" alt="${esc(b.name)}" /></div>
        <div><span class="eyebrow">${esc(b.origin)}</span><h2>${esc(b.name)}</h2><p class="muted">${esc(b.tagline || b.blurb)}</p>
        ${b.websites.map(w => `<a class="link-btn" href="${esc(w)}" target="_blank" rel="noopener">${esc(w.replace(/^https?:\/\//, '').replace(/\/$/, ''))} ↗</a>`).join(' · ')}</div></div>
      <div class="seg bm-cats" id="bmSeg"><button class="on" data-cat="all">All (${list.length})</button><button data-cat="Agriculture">🌾 Agriculture (${list.filter(p => p.category === 'Agriculture').length})</button><button data-cat="Domestic">🏠 Domestic (${list.filter(p => p.category === 'Domestic').length})</button></div>
      <div class="pump-grid" id="bmGrid"></div>`;
    $$('#bmSeg button').forEach(btn => btn.onclick = () => { $$('#bmSeg button').forEach(x => x.classList.remove('on')); btn.classList.add('on'); render(btn.dataset.cat); });
    render('all'); openModal('#brandModal');
  }

  /* ---------- Pump catalogue ---------- */
  const state = { q: '', cat: 'all', brands: new Set(), type: 'all', sort: 'brand', view: 'grid', limit: 24 };
  const compare = new Set(store.get('sae_compare', []));
  const enquiry = new Set(store.get('sae_enquiry', []));
  const byId = Object.fromEntries(D.products.map(p => [p.id, p]));
  [...compare].forEach(id => byId[id] || compare.delete(id)); [...enquiry].forEach(id => byId[id] || enquiry.delete(id));

  const typeGroup = t => { t = (t || '').toLowerCase();
    if (t.includes('solar')) return 'Solar submersible';
    if (t.includes('open')) return 'Openwell submersible';
    if (t.includes('bore') || /\d["”]/.test(t)) return 'Borewell submersible';
    if (t.includes('mono')) return 'Monoblock submersible';
    return 'Other submersible'; };
  D.products.forEach(p => p.group = typeGroup(p.type + ' ' + p.name));
  [...new Set(D.products.map(p => p.group))].sort().forEach(g => $('#typeSel').insertAdjacentHTML('beforeend', `<option>${g}</option>`));

  $('#brandPills').innerHTML = D.brands.filter(b => !b.own).map(b => `<button data-b="${b.slug}">${esc(b.name)} <small>${b.count}</small></button>`).join('');
  $$('#brandPills button').forEach(btn => btn.onclick = () => { const s = btn.dataset.b; state.brands.has(s) ? state.brands.delete(s) : state.brands.add(s); btn.classList.toggle('on'); state.limit = 24; renderPumps(); });
  $$('#catSeg button').forEach(btn => btn.onclick = () => { $$('#catSeg button').forEach(x => x.classList.remove('on')); btn.classList.add('on'); state.cat = btn.dataset.cat; state.limit = 24; renderPumps(); });
  let qT; $('#q').oninput = e => { clearTimeout(qT); qT = setTimeout(() => { state.q = e.target.value.trim().toLowerCase(); state.limit = 24; renderPumps(); }, 160); };
  $('#typeSel').onchange = e => { state.type = e.target.value; state.limit = 24; renderPumps(); };
  $('#sortSel').onchange = e => { state.sort = e.target.value; renderPumps(); };
  $$('.view-toggle button').forEach(btn => btn.onclick = () => { $$('.view-toggle button').forEach(x => x.classList.remove('on')); btn.classList.add('on'); state.view = btn.dataset.view; $('#pumpGrid').classList.toggle('list', state.view === 'list'); });
  $('#loadMore').onclick = () => { state.limit += 24; renderPumps(true); };
  $('#resetFilters').onclick = () => {
    Object.assign(state, { q: '', cat: 'all', type: 'all', sort: 'brand', limit: 24 }); state.brands.clear(); state.hpMin = state.hpMax = undefined;
    $('#q').value = ''; $('#typeSel').value = 'all'; $('#sortSel').value = 'brand';
    $$('#brandPills button').forEach(b => b.classList.remove('on')); $$('#catSeg button').forEach((b, i) => b.classList.toggle('on', i === 0)); renderPumps();
  };

  const hpRange = s => { const n = (s || '').match(/\d+(\.\d+)?/g); if (!n) return null; const v = n.map(Number); return [Math.min(...v), Math.max(...v)]; };
  const filtered = () => {
    let list = D.products.filter(p =>
      (state.cat === 'all' || p.category === state.cat) &&
      (!state.brands.size || state.brands.has(p.brand)) &&
      (state.type === 'all' || p.group === state.type) &&
      (!state.q || [p.name, p.series, p.type, p.power, p.bore, p.brandName, p.subBrand, p.phase, ...(p.applications || [])].join(' ').toLowerCase().includes(state.q)) &&
      (state.hpMin === undefined || (() => { const r = hpRange(p.power); return !r || (r[1] >= state.hpMin && r[0] <= state.hpMax); })()));
    const order = Object.fromEntries(D.brands.map((b, i) => [b.slug, i]));
    const pr = (p, d) => p.pf ?? (d > 0 ? 1e12 : -1);
    list.sort({
      brand: (a, b) => order[a.brand] - order[b.brand],
      name: (a, b) => a.name.localeCompare(b.name),
      priceAsc: (a, b) => pr(a, 1) - pr(b, 1),
      priceDesc: (a, b) => (b.pt ?? b.pf ?? -1) - (a.pt ?? a.pf ?? -1)
    }[state.sort]);
    return list;
  };

  const brandLogo = slug => (brandBySlug[slug] || {}).logo || '';
  const pLogo = p => p.brand === 'ekki-deccan' ? (/deccan/i.test(p.subBrand + p.name) ? 'images/brands/deccan.webp' : 'images/brands/ekki.webp') : brandLogo(p.brand);
  const short = v => (v || '—').replace(/\s*\([^)]*\)/g, '').replace(/^up to\s*/i, '≤ ').trim() || '—';
  function cardHTML(p) {
    const priced = p.priceFrom || p.priceTo;
    return `<article class="pump-card glass" data-id="${p.id}">
      <div class="pc-media" data-open>
        ${p.img ? `<img src="${esc(p.img)}" alt="${esc(p.name)}" loading="lazy" />` : `<div class="ph">${esc(p.brandName)}<small>${esc(p.series || 'SERIES')}</small></div>`}
        <span class="pc-tag ${p.category}">${p.category === 'Domestic' ? '🏠' : '🌾'} ${p.category}</span>
        <span class="pc-brand"><img src="${pLogo(p)}" alt="${esc(p.brandName)}" /></span>
      </div>
      <div class="pc-body">
        <div class="pc-type">${esc(p.type || p.group)}</div>
        <h3 data-open>${esc(p.name)}</h3>
        <div class="specs">
          <div><small>Power</small><b>${esc(short(p.power))}</b></div>
          <div><small>Head</small><b>${esc(short(p.head))}</b></div>
          <div><small>Bore</small><b>${esc(short(p.bore))}</b></div>
        </div>
        ${priced ? `<div class="price"><div><small>Starts from</small><b>${esc(p.priceFrom || '—')}</b></div><div style="text-align:right"><small>Up to</small><b>${esc(p.priceTo || p.priceFrom)}</b></div></div>`
                 : `<div class="price na"><div><small>Price</small><b>On request · call for best quote</b></div></div>`}
        <div class="pc-actions">
          <button data-cmp class="${compare.has(p.id) ? 'on' : ''}">${compare.has(p.id) ? '✓ Comparing' : '⇄ Compare'}</button>
          <button data-enq class="${enquiry.has(p.id) ? 'on' : ''}">${enquiry.has(p.id) ? '✓ Added' : '+ Enquire'}</button>
        </div>
      </div></article>`;
  }
  function wireCards(root) {
    $$('.pump-card', root).forEach(c => {
      const id = c.dataset.id;
      $$('[data-open]', c).forEach(o => o.onclick = () => openPump(id));
      $('[data-cmp]', c).onclick = () => toggleCompare(id);
      $('[data-enq]', c).onclick = () => toggleEnquiry(id);
    });
  }
  function renderPumps(append) {
    const list = filtered(), grid = $('#pumpGrid');
    const show = list.slice(0, state.limit);
    $('#resultCount').textContent = `${list.length} of ${D.products.length} pump series`;
    if (!list.length) { grid.innerHTML = '<div class="empty">No pumps match. Try fewer filters, or call us at 9246607214.</div>'; $('#loadMore').style.display = 'none'; return; }
    const prev = append ? grid.children.length : 0;
    grid.innerHTML = show.map(cardHTML).join('');
    wireCards(grid); animateCards([...grid.children].slice(prev));
    $('#loadMore').style.display = list.length > state.limit ? '' : 'none';
  }
  const refreshCardButtons = () => $$('.pump-card').forEach(c => {
    const id = c.dataset.id, cb = $('[data-cmp]', c), eb = $('[data-enq]', c);
    cb.classList.toggle('on', compare.has(id)); cb.textContent = compare.has(id) ? '✓ Comparing' : '⇄ Compare';
    eb.classList.toggle('on', enquiry.has(id)); eb.textContent = enquiry.has(id) ? '✓ Added' : '+ Enquire';
  });

  /* ---------- Compare ---------- */
  function toggleCompare(id) {
    if (compare.has(id)) compare.delete(id);
    else { if (compare.size >= 4) return toast('Compare up to 4 pumps'); compare.add(id); toast('Added to compare'); }
    store.set('sae_compare', [...compare]); updateBadges(); refreshCardButtons();
  }
  function renderCompare() {
    const items = [...compare].map(id => byId[id]).filter(Boolean);
    if (!items.length) { $('#compareBody').innerHTML = '<p class="muted">Tap “⇄ Compare” on up to 4 pumps to see them side by side.</p>'; return; }
    const row = (label, f) => `<tr><th>${label}</th>${items.map(p => `<td>${f(p)}</td>`).join('')}</tr>`;
    $('#compareBody').innerHTML = `<div style="overflow:auto"><table class="cmp">
      ${row('', p => p.img ? `<img src="${esc(p.img)}" alt="" />` : '')}
      ${row('Pump', p => `<b>${esc(p.name)}</b><br><small class="muted">${esc(p.brandName)}</small>`)}
      ${row('Category', p => esc(p.category))}${row('Type', p => esc(p.type))}${row('Power', p => esc(p.power || '—'))}
      ${row('Head', p => esc(p.head || '—'))}${row('Flow', p => esc(p.flow || '—'))}${row('Bore size', p => esc(p.bore || '—'))}${row('Phase', p => esc(p.phase || '—'))}
      ${row('Starts from', p => `<b class="gold">${esc(p.priceFrom || 'On request')}</b>`)}${row('Up to', p => `<b class="gold">${esc(p.priceTo || p.priceFrom || 'On request')}</b>`)}
      ${row('', p => `<button class="link-btn" data-rm="${p.id}">Remove</button>`)}
    </table></div><div style="margin-top:16px;display:flex;gap:10px;flex-wrap:wrap"><button class="btn btn-gold btn-sm" id="cmpEnq">Enquire about these</button><button class="btn btn-ghost btn-sm" id="cmpClear">Clear all</button></div>`;
    $$('[data-rm]', $('#compareBody')).forEach(b => b.onclick = () => { toggleCompare(b.dataset.rm); renderCompare(); });
    $('#cmpClear').onclick = () => { compare.clear(); store.set('sae_compare', []); updateBadges(); refreshCardButtons(); renderCompare(); };
    $('#cmpEnq').onclick = () => { items.forEach(p => enquiry.add(p.id)); store.set('sae_enquiry', [...enquiry]); updateBadges(); refreshCardButtons(); closeAll(); scrollTo('#contact'); };
  }
  $('#compareBtn').onclick = () => { renderCompare(); openModal('#compareDrawer'); };

  /* ---------- Enquiry ---------- */
  function toggleEnquiry(id) {
    enquiry.has(id) ? enquiry.delete(id) : (enquiry.add(id), toast('Added to your enquiry'));
    store.set('sae_enquiry', [...enquiry]); updateBadges(); refreshCardButtons();
  }
  function renderEnqItems() {
    const items = [...enquiry].map(id => byId[id]).filter(Boolean);
    $('#enqItems').innerHTML = items.length ? items.map(p => `<span>${esc(p.name)} <button type="button" data-x="${p.id}" aria-label="Remove">✕</button></span>`).join('')
      : '<small class="muted">Add pumps with “+ Enquire” to include them here.</small>';
    $$('[data-x]', $('#enqItems')).forEach(b => b.onclick = () => toggleEnquiry(b.dataset.x));
  }
  function updateBadges() {
    const c = $('#compareCount'), e = $('#enqCount');
    c.textContent = compare.size; c.toggleAttribute('data-zero', !compare.size);
    e.textContent = enquiry.size; e.toggleAttribute('data-zero', !enquiry.size); renderEnqItems();
  }
  $('#enqBtn').onclick = () => scrollTo('#contact');
  let via = 'wa'; $$('#enquiryForm [type=submit]').forEach(b => b.onclick = () => via = b.dataset.via);
  $('#enquiryForm').onsubmit = e => {
    e.preventDefault();
    const name = $('#eName').value.trim(), phone = $('#ePhone').value.trim();
    if (!name || !/^[+\d][\d\s-]{6,}$/.test(phone)) { $('#eErr').textContent = 'Please add your name and a valid phone number.'; return; }
    $('#eErr').textContent = '';
    const items = [...enquiry].map(id => byId[id]).filter(Boolean).map(p => `• ${p.name} (${p.brandName})`).join('\n');
    const msg = `Hello Sri Anjaneya Enterprises,\nName: ${name}\nPhone: ${phone}\nUse: ${$('#eUse').value}\n${items ? 'Pumps:\n' + items + '\n' : ''}${$('#eMsg').value.trim()}`;
    if (via === 'mail') location.href = `mailto:sae.sathya@gmail.com?subject=${encodeURIComponent('Pump enquiry from ' + name)}&body=${encodeURIComponent(msg)}`;
    else window.open(`https://wa.me/919246607214?text=${encodeURIComponent(msg)}`, '_blank', 'noopener');
    toast('Opening ' + (via === 'mail' ? 'email' : 'WhatsApp') + '…');
  };

  /* ---------- Pump detail ---------- */
  function openPump(id) {
    const p = byId[id]; if (!p) return;
    const priced = p.priceFrom || p.priceTo;
    const waText = encodeURIComponent(`Hi, I'm interested in the ${p.name} (${p.brandName}). Please share the price.`);
    $('#pumpModalBody').innerHTML = `<div class="pm pm-grid">
      <div class="pm-media">${p.img ? `<img src="${esc(p.img)}" alt="${esc(p.name)}" />` : `<div class="pc-media"><div class="ph">${esc(p.brandName)}</div></div>`}</div>
      <div>
        <span class="eyebrow">${esc(p.subBrand || p.brandName)} · ${esc(p.category)}</span>
        <h2>${esc(p.name)}</h2><div class="pc-type">${esc(p.type)}</div>
        ${priced ? `<div class="price" style="margin-top:14px"><div><small>Starts from</small><b>${esc(p.priceFrom || '—')}</b></div><div style="text-align:right"><small>Up to</small><b>${esc(p.priceTo || p.priceFrom)}</b></div></div>` : `<div class="price na" style="margin-top:14px"><div><small>Price</small><b>On request · call for best quote</b></div></div>`}
        <table>
          <tr><td>Power</td><td>${esc(p.power || '—')}</td></tr><tr><td>Head</td><td>${esc(p.head || '—')}</td></tr>
          <tr><td>Flow</td><td>${esc(p.flow || '—')}</td></tr><tr><td>Borewell size</td><td>${esc(p.bore || '—')}</td></tr>
          <tr><td>Phase</td><td>${esc(p.phase || '—')}</td></tr>
        </table>
        ${p.highlights?.length ? `<b>Highlights</b><ul>${p.highlights.map(h => `<li>${esc(h)}</li>`).join('')}</ul>` : ''}
        ${p.applications?.length ? `<div class="tags">${p.applications.map(a => `<span>${esc(a)}</span>`).join('')}</div>` : ''}
        <div class="btns">
          <a class="btn btn-gold btn-sm" href="https://wa.me/919246607214?text=${waText}" target="_blank" rel="noopener">💬 Get best price</a>
          <a class="btn btn-ghost btn-sm" href="tel:9246607214">📞 Call</a>
          <button class="btn btn-ghost btn-sm" id="pmEnq">${enquiry.has(p.id) ? '✓ In enquiry' : '+ Add to enquiry'}</button>
          <button class="btn btn-ghost btn-sm" id="pmCmp">${compare.has(p.id) ? '✓ Comparing' : '⇄ Compare'}</button>
        </div>
        ${p.src ? `<p class="src">Specs from the manufacturer: <a href="${esc(p.src)}" target="_blank" rel="noopener">official product page ↗</a></p>` : ''}
      </div></div>`;
    $('#pmEnq').onclick = () => { toggleEnquiry(p.id); $('#pmEnq').textContent = enquiry.has(p.id) ? '✓ In enquiry' : '+ Add to enquiry'; };
    $('#pmCmp').onclick = () => { toggleCompare(p.id); $('#pmCmp').textContent = compare.has(p.id) ? '✓ Comparing' : '⇄ Compare'; };
    openModal('#pumpModal');
  }

  /* ---------- Modals ---------- */
  const stack = [];
  function openModal(sel) { const m = $(sel); m.style.zIndex = 300 + stack.length * 2; m.classList.add('open'); m.setAttribute('aria-hidden', 'false'); stack.push(m); lenis?.stop(); }
  function closeTop() { const m = stack.pop(); if (!m) return; m.classList.remove('open'); m.setAttribute('aria-hidden', 'true'); if (!stack.length) lenis?.start(); }
  function closeAll() { while (stack.length) closeTop(); }
  $$('.modal,.drawer').forEach(m => m.addEventListener('click', e => { if (e.target === m || e.target.closest('[data-close]')) { while (stack.length && stack[stack.length - 1] !== m) closeTop(); closeTop(); } }));
  addEventListener('keydown', e => { if (e.key === 'Escape') closeTop(); });
  $$('.cert').forEach(c => c.onclick = () => {
    if (c.dataset.pdf) return window.open(c.dataset.pdf, '_blank', 'noopener');
    $('#imgModalImg').src = c.dataset.img; openModal('#imgModal');
  });

  /* ---------- Pump finder ---------- */
  const fmt = n => n.toLocaleString('en-IN');
  let fUse = 'Agriculture';
  $$('#fUse button').forEach(b => b.onclick = () => { $$('#fUse button').forEach(x => x.classList.remove('on')); b.classList.add('on'); fUse = b.dataset.v; calc(); });
  function calc() {
    const depth = +$('#fDepth').value, level = Math.min(+$('#fLevel').value, depth), need = +$('#fNeed').value;
    $('#fDepthOut').textContent = depth + ' m'; $('#fLevelOut').textContent = level + ' m'; $('#fNeedOut').textContent = fmt(need) + ' L';
    const hours = fUse === 'Agriculture' ? 6 : 2;
    const lpm = need / (hours * 60);
    const head = Math.round(level * 1.15 + 10);                 // pumping level + ~15% friction + delivery
    const kw = (lpm / 60000) * 1000 * 9.81 * head / 1000 / 0.45; // ρgQH / η(≈45% wire-to-water)
    const hpRaw = kw / 0.746;
    const sizes = [0.5, 0.75, 1, 1.5, 2, 3, 5, 7.5, 10, 12.5, 15, 20, 25, 30, 40, 50];
    const hp = sizes.find(s => s >= hpRaw) || 50;
    $('#fHead').textContent = head + ' m'; $('#fFlow').textContent = Math.round(lpm) + ' LPM'; $('#fHp').textContent = hp + ' HP';
    return { head, lpm, hp };
  }
  ['#fDepth', '#fLevel', '#fNeed', '#fBore'].forEach(s => $(s).addEventListener('input', calc)); calc();
  $('#fShow').onclick = () => {
    const { hp } = calc(); const bore = $('#fBore').value;
    $('#resetFilters').click();
    state.cat = fUse; $$('#catSeg button').forEach(b => b.classList.toggle('on', b.dataset.cat === fUse));
    state.type = bore === 'Open well' ? 'Openwell submersible' : 'Borewell submersible';
    if (![...$('#typeSel').options].some(o => o.value === state.type)) state.type = 'all';
    $('#typeSel').value = state.type;
    state.hpMin = hp; state.hpMax = hp;
    renderPumps(); scrollTo('#pumps');
    toast(`Showing ${fUse.toLowerCase()} pumps around ${hp} HP`);
  };

  /* ---------- Hero card live specs (cycles real data) ---------- */
  const withSpecs = D.products.filter(p => p.head && p.power);
  if (withSpecs.length) { let k = 0; const tick = () => { const p = withSpecs[k++ % withSpecs.length]; $('#hcHead').textContent = p.head.replace(/^up to\s*/i, '≤ '); $('#hcFlow').textContent = (p.flow || '—').replace(/\s*\(.*\)/, '').replace(/^up to\s*/i, '≤ '); $('#hcHp').textContent = p.power.replace(/\s*\(.*\)/, ''); $('.hc-top span').textContent = p.name; }; tick(); setInterval(tick, 3200); }

  /* ---------- Reviews ---------- */
  let rating = 0;
  $$('#starInput button').forEach(b => {
    b.onclick = () => { rating = +b.dataset.v; paintStars(rating); };
    b.onmouseenter = () => paintStars(+b.dataset.v); b.onmouseleave = () => paintStars(rating);
  });
  const paintStars = v => $$('#starInput button').forEach(b => b.classList.toggle('on', +b.dataset.v <= v));
  const starStr = v => '★★★★★'.slice(0, Math.round(v)) + '☆☆☆☆☆'.slice(0, 5 - Math.round(v));
  function renderReviews() {
    const rs = store.get('sae_reviews', []);
    const list = $('#reviewList'); list.innerHTML = '';
    if (!rs.length) list.innerHTML = '<div class="review glass"><p>No reviews yet. Be the first to share your experience!</p></div>';
    rs.slice().reverse().forEach(r => {
      const el = document.createElement('div'); el.className = 'review glass';
      el.innerHTML = '<div class="review-head"><div><b></b><small></small></div><div class="stars-static"></div></div><div class="prod"></div><p></p>';
      $('b', el).textContent = r.name; $('small', el).textContent = r.loc + ' · ' + new Date(r.t).toLocaleDateString('en-IN');
      $('.stars-static', el).textContent = starStr(r.rating); $('.prod', el).textContent = r.product; $('p', el).textContent = r.text;
      list.append(el);
    });
    const avg = rs.length ? rs.reduce((a, r) => a + r.rating, 0) / rs.length : 0;
    $('#avgRating').textContent = rs.length ? avg.toFixed(1) : '–'; $('#avgStars').textContent = starStr(avg);
    $('#reviewCount').textContent = rs.length + (rs.length === 1 ? ' review' : ' reviews');
  }
  $('#reviewForm').onsubmit = e => {
    e.preventDefault();
    const r = { name: $('#rName').value.trim(), loc: $('#rLoc').value.trim(), product: $('#rProduct').value.trim(), text: $('#rText').value.trim(), rating, t: Date.now() };
    if (!r.name || !r.loc || !r.product || !r.text) return $('#rErr').textContent = 'Please fill in all required fields.';
    if (!rating) return $('#rErr').textContent = 'Please choose a star rating.';
    $('#rErr').textContent = '';
    const rs = store.get('sae_reviews', []); rs.push(r); store.set('sae_reviews', rs.slice(-100));
    e.target.reset(); rating = 0; paintStars(0); renderReviews(); toast('Thank you for your review! 🎉');
  };

  /* ---------- Coverflow ---------- */
  const cfImgs = $$('#coverflow img'); let cf = 0;
  $('#cfDots').innerHTML = cfImgs.map((_, i) => `<button aria-label="Photo ${i + 1}"></button>`).join('');
  function layoutCF() {
    cfImgs.forEach((img, i) => {
      let d = i - cf; const n = cfImgs.length; if (d > n / 2) d -= n; if (d < -n / 2) d += n;
      const ad = Math.abs(d);
      img.style.transform = `translateX(calc(-50% + ${d * 42}%)) translateZ(${-ad * 220}px) rotateY(${-d * 32}deg)`;
      img.style.zIndex = 10 - ad; img.style.opacity = ad > 2 ? 0 : 1 - ad * .25; img.style.filter = ad ? 'brightness(.55) saturate(.8)' : 'none';
      img.onclick = () => { if (d) { cf = i; layoutCF(); } else { $('#imgModalImg').src = img.src; openModal('#imgModal'); } };
    });
    $$('#cfDots button').forEach((b, i) => { b.classList.toggle('on', i === cf); b.onclick = () => { cf = i; layoutCF(); }; });
  }
  $('#cfPrev').onclick = () => { cf = (cf - 1 + cfImgs.length) % cfImgs.length; layoutCF(); };
  $('#cfNext').onclick = () => { cf = (cf + 1) % cfImgs.length; layoutCF(); };
  let cfAuto = setInterval(() => $('#cfNext').click(), 4500);
  $('#coverflow').onmouseenter = () => clearInterval(cfAuto);
  let sx = 0; $('#coverflow').addEventListener('touchstart', e => sx = e.touches[0].clientX, { passive: true });
  $('#coverflow').addEventListener('touchend', e => { const dx = e.changedTouches[0].clientX - sx; if (Math.abs(dx) > 40) (dx < 0 ? $('#cfNext') : $('#cfPrev')).click(); });
  layoutCF();

  /* ---------- Init ---------- */
  updateBadges(); renderPumps(); renderReviews();
  window.SAE = { openBrand, openPump };
})();
