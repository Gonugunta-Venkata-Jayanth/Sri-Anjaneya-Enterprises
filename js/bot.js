/* Anjaneya Assistant — an on-page pump assistant.
   Runs entirely in the browser: it understands bore size, depth, HP, phase, brand, use, budget and common
   pump questions, searches the live catalogue (window.SAE_DATA) and hands off to WhatsApp / call when a person is needed. */
(function () {
  const D = window.SAE_DATA || { products: [], brands: [] };
  const P = D.products || [];
  const WA = '919246607214', TEL1 = '+919246607214', TEL2 = '+919704157350';
  const I = window.ICONS || {};
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const wa = t => `https://wa.me/${WA}?text=${encodeURIComponent(t)}`;

  /* ---------- product features ---------- */
  const num = s => { const m = String(s || '').replace(/,/g, '').match(/\d+(?:\.\d+)?/g); return m ? m.map(Number) : []; };
  const boreIn = p => {
    const t = `${p.type} ${p.bore}`;
    if (/open\s*-?well|openwell|monoset|sump/i.test(t) && !/borewell/i.test(p.type)) return 0;
    let m = t.match(/(\d(?:\.\d)?)\s*(?:"|″|”|inch)/i); if (m) return +m[1];
    m = t.match(/(\d{2,3})\s*mm/i); if (m) return Math.round(+m[1] / 25.4);
    return null;
  };
  const hpSpan = p => { const t = String(p.power || ''); let v = num(t); if (!v.length) return null; if (/kw/i.test(t) && !/hp/i.test(t)) v = v.map(x => x * 1.341); v = v.filter(x => x < 400); return v.length ? [Math.min(...v), Math.max(...v)] : null; };
  const headMax = p => { const v = num(p.head); return v.length ? Math.max(...v) : null; };
  const priceTop = p => p.pt || p.pf || null;
  const IDX = P.map(p => ({ p, bore: boreIn(p), hp: hpSpan(p), head: headMax(p), price: priceTop(p), solar: /solar/i.test(p.name + p.type), open: /open\s*-?well/i.test(p.type), ss: /stainless|\bss\b/i.test(p.name + p.type), text: `${p.name} ${p.brandName} ${p.subBrand} ${p.type} ${(p.applications || []).join(' ')}`.toLowerCase() }));

  const BRANDS = [['ksb', /\bksb\b/], ['kirloskar', /kirlo?skar|kirlosker/], ['wilo', /\bwilo\b/], ['ekki-deccan', /\bekki\b|deccan/], ['cri', /\bc\.?r\.?i\b/], ['falcon', /falcon/], ['lubi', /\blubi\b/], ['crompton', /crompton|cg pumps/], ['aqua-tide', /aqua\s*tide/]];

  /* ---------- understanding ---------- */
  const parse = raw => {
    const t = ' ' + raw.toLowerCase().replace(/[“”″]/g, '"') + ' ';
    const q = {};
    let m;
    if ((m = t.match(/(\d(?:\.\d)?)\s*(?:"|inch|inches|in\b|-inch)/))) q.bore = +m[1];
    else if ((m = t.match(/(\d{2,3})\s*mm\b/))) q.bore = Math.round(+m[1] / 25.4);
    if ((m = t.match(/(\d+(?:\.\d+)?)\s*(?:hp|h\.p|horse)/))) q.hp = +m[1];
    else if ((m = t.match(/(\d+(?:\.\d+)?)\s*kw/))) q.hp = +(+m[1] * 1.341).toFixed(1);
    if ((m = t.match(/(\d{2,4})\s*(?:ft|feet|foot)\b/))) q.depth = Math.round(+m[1] * .3048);
    else if ((m = t.match(/(\d{2,4})\s*(?:m|mtr|mtrs|meter|meters|metre|metres)\b/))) q.depth = +m[1];
    if (/single|1\s*-?\s*ph|1\s*phase|singlephase/.test(t)) q.phase = 'single';
    if (/three|3\s*-?\s*ph|3\s*phase|threephase/.test(t)) q.phase = 'three';
    for (const [slug, re] of BRANDS) if (re.test(t)) { q.brand = slug; break; }
    if (/agri|farm|field|irrigat|crop|paddy|garden|orchard|drip|sprinkler/.test(t)) q.cat = 'Agriculture';
    if (/home|house|domestic|apartment|flat|villa|residen|tank|bathroom|kitchen|building/.test(t)) q.cat = q.cat ? q.cat : 'Domestic';
    if (/solar/.test(t)) q.solar = true;
    if (/open\s*-?well|openwell|sump|\bwell\b(?!.*bore)|pond|river|canal/.test(t) && !/bore/.test(t)) q.open = true;
    if (/stainless|\bss\b|saline|salty|corros/.test(t)) q.ss = true;
    if ((m = t.match(/(?:under|below|budget|less than|within|upto|up to|max)\s*(?:rs\.?|₹|inr)?\s*([\d,.]+)\s*(k|thousand|lakh|lac)?/))) {
      let v = +m[1].replace(/,/g, ''); if (/k|thousand/.test(m[2] || '')) v *= 1000; if (/lakh|lac/.test(m[2] || '')) v *= 100000; if (v > 500) q.askedPrice = true;
    }
    return q;
  };
  const has = (t, re) => re.test(t.toLowerCase());

  /* ---------- recommending ---------- */
  const recommend = q => {
    let rows = IDX.filter(r => !q.brand || r.p.brand === q.brand);
    if (q.cat) rows = rows.filter(r => r.p.category === q.cat || (q.cat === 'Domestic' && /domestic|home|residen/i.test(r.text)));
    if (q.solar) rows = rows.filter(r => r.solar);
    if (q.open) rows = rows.filter(r => r.open || r.bore === 0);
    if (q.bore) rows = rows.filter(r => r.bore && r.bore <= q.bore);
    const scored = rows.map(r => {
      let s = 0; const why = [];
      if (q.bore && r.bore) { if (r.bore === q.bore) { s += 6; why.push(`fits a ${q.bore}" bore`); } else { s += 2; why.push(`${r.bore}" pump fits your ${q.bore}" bore`); } }
      if (q.hp && r.hp) { if (q.hp >= r.hp[0] - .01 && q.hp <= r.hp[1] + .01) { s += 5; why.push(`${q.hp} HP is in range`); } else s -= Math.min(4, Math.abs(q.hp - (q.hp < r.hp[0] ? r.hp[0] : r.hp[1])) / 2); }
      if (q.depth && r.head) { if (r.head >= q.depth * 1.15) { s += 4; why.push(`head up to ${Math.round(r.head)} m`); } else if (r.head >= q.depth) s += 1; else s -= 5; }
      if (q.phase) { const ph = (r.p.phase || '').toLowerCase(); if (ph.includes('both') || ph.includes(q.phase) || (q.phase === 'three' && /3/.test(ph)) || (q.phase === 'single' && /1/.test(ph))) { s += 2; why.push(q.phase === 'single' ? 'runs on single phase' : 'three-phase'); } else if (ph) s -= 3; }
      if (q.ss && r.ss) { s += 3; why.push('stainless steel for hard / saline water'); }
      
      if (q.cat && r.p.category === q.cat) s += 1;
      if (r.p.models && r.p.models.length) s += .6;
      if (r.p.desc) s += .3;
      return { ...r, s, why };
    }).sort((a, b) => b.s - a.s);
    // keep variety: at most 2 per brand unless a brand was asked for
    const out = [], per = {};
    for (const r of scored) { if (!q.brand && (per[r.p.brand] = (per[r.p.brand] || 0) + 1) > 2) continue; out.push(r); if (out.length === 3) break; }
    return out;
  };

  /* ---------- knowledge ---------- */
  const brandList = D.brands.filter(b => !b.own).map(b => `${b.name} (${b.count})`).join(', ');
  const KB = [
    [/what hp|how much hp|which hp|hp do i need|hp required|how many hp|size.*motor|motor size/, () => `A quick rule we use: the pump's head must beat your water depth plus pipe losses, and HP rises with depth and flow.<br>• Up to ~60 m, 1–1.5 HP (4″) is usual for a home.<br>• 100–150 m farms often need 5–7.5 HP.<br>• 200 m+ needs 10 HP and above, usually 6″.<br>Tell me your <b>bore size</b> and <b>depth</b> and I'll pick exact series.`],
    [/difference|vs\.?|versus|which is better|or open ?well|submersible or/, () => `<b>Borewell submersible</b>: slim (3″–10″), goes deep inside the bore casing, for 30–400 m.<br><b>Openwell submersible</b>: wider body, sits in a well, sump, pond or tank; great flow at low head.<br>Using a borewell? Go borewell submersible. Open well or sump? Go openwell.`],
    [/single.*three|three.*single|which phase|phase.*(differ|need|better)/, () => `Single phase (230 V) suits homes and small farms, usually up to about 1.5–2 HP. Three phase (415 V) is needed for bigger farm pumps, roughly 3 HP and above, and runs cooler and cheaper per litre. Many series come in both.`],
    [/oil.?filled|water.?filled|water.?cooled/, () => `<b>Water-filled</b> motors are rewindable and preferred for farms; repairs are easy and cheaper.<br><b>Oil-filled</b> motors are compact and common in 3″/4″ domestic pumps, but they aren't usually rewound.`],
    [/stage|stages/, () => `Each stage is one impeller-diffuser pair. More stages means more head (lift) at the same flow, so deeper borewells need more stages. Open any pump and check the <b>Models</b> tab to see stages against head and flow.`],
    [/saline|salty|hard water|corros|stainless/, () => `For saline or hard water, choose a <b>stainless-steel</b> pump such as KSB CORACHROM or the SS series from CRI, Lubi and Falcon. Want me to list stainless options for your bore size?`],
    [/warrant|guarantee/, () => `Warranty is set by each brand and depends on the model and the bill, typically 12–18 months on pumps. G V Sathyanarayana will confirm the exact terms on your quote.`],
    [/install|fitting|service|repair|rewind|maintenance|breakdown|not working|problem/, () => `We help with selection, installation guidance and after-sales support through the brands' service networks. For a repair or rewinding enquiry, WhatsApp us a photo of the pump's name-plate and the problem.`],
    [/deliver|shipping|transport|send to|courier/, () => `Delivery depends on the pump and your location. Share your village or town and the model on WhatsApp and we'll confirm.`],
    [/pay|payment|upi|emi|credit|cash|gst|invoice|bill/, () => `We issue a GST invoice (GSTIN 36ASFPG1225Q1ZM). Payment options are confirmed with your quote. Call or WhatsApp to arrange it.`],
    [/solar/, () => `We stock solar submersibles from KSB, Crompton, CRI, Lubi and Falcon (AC and DC). Tell me your bore size and depth and I'll suggest a series. Panel sizing comes with the quote.`]
  ];

  const ROBOT = '<svg viewBox="0 0 64 64" aria-hidden="true"><defs><linearGradient id="rbg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#e9f6ff"/><stop offset="1" stop-color="#9fd8ff"/></linearGradient></defs><line x1="32" y1="6" x2="32" y2="14" stroke="#3ee0ff" stroke-width="3" stroke-linecap="round"/><circle cx="32" cy="6" r="4" fill="#f5b524"/><rect x="10" y="14" width="44" height="34" rx="14" fill="url(#rbg)"/><rect x="16" y="21" width="32" height="18" rx="9" fill="#0a2a4a"/><circle cx="25" cy="30" r="4" fill="#3ee0ff"><animate attributeName="r" values="4;1;4" dur="4s" keyTimes="0;.05;.1" repeatCount="indefinite"/></circle><circle cx="39" cy="30" r="4" fill="#3ee0ff"><animate attributeName="r" values="4;1;4" dur="4s" keyTimes="0;.05;.1" repeatCount="indefinite"/></circle><rect x="5" y="25" width="5" height="12" rx="2.5" fill="#f5b524"/><rect x="54" y="25" width="5" height="12" rx="2.5" fill="#f5b524"/><path d="M22 54h20a4 4 0 0 0 4-4v-2H18v2a4 4 0 0 0 4 4z" fill="#9fd8ff"/></svg>';
  /* ---------- UI ---------- */
  const root = document.createElement('div');
  root.className = 'bot'; root.innerHTML = `
    <button class="bot-fab" aria-label="Open Anjaneya AI assistant" aria-expanded="false"><span class="bot-robot">${ROBOT}</span><span class="bot-ai">AI</span></button>
    <div class="bot-tip" role="status"><b>Anjaneya AI</b> · Ask me anything about pumps</div>
    <section class="bot-panel" role="dialog" aria-label="Anjaneya Assistant" aria-hidden="true">
      <header class="bot-head"><span class="bot-av">${ROBOT}</span><div><b>Anjaneya AI <span class="ai-tag">AI</span></b><small><i></i> AI assistant · knows our full catalogue · English, తెలుగు, हिन्दी</small></div>
        <a class="bot-hd-btn" href="tel:${TEL1}" title="Call" aria-label="Call">${I.phone || ''}</a><a class="bot-hd-btn" href="${wa('Hi, I have a pump enquiry.')}" target="_blank" rel="noopener" title="WhatsApp" aria-label="WhatsApp">${I.whatsapp || ''}</a>
        <button class="bot-x" aria-label="Close">✕</button></header>
      <div class="bot-body" aria-live="polite"></div>
      <div class="bot-chips"></div>
      <form class="bot-form"><input type="text" placeholder="Ask anything… e.g. 4 inch bore, 120 m, 3 phase" aria-label="Message" autocomplete="off" /><button aria-label="Send">➤</button></form>
      <p class="bot-foot">AI answers are grounded in our catalogue but can be wrong. G V Sathyanarayana gives prices and confirms the final model.</p>
    </section>`;
  document.body.appendChild(root);
  const $ = s => root.querySelector(s);
  const body = $('.bot-body'), chipsBox = $('.bot-chips'), input = $('.bot-form input'), panel = $('.bot-panel'), fab = $('.bot-fab');
  let flow = null; // guided finder state
  const ctx = {}; // remembered facts across turns

  const scroll = () => body.scrollTo({ top: body.scrollHeight, behavior: 'smooth' });
  const add = (html, who = 'ai') => { const d = document.createElement('div'); d.className = `bm ${who}`; d.innerHTML = html; body.appendChild(d); scroll(); return d; };
  const chips = list => { chipsBox.innerHTML = list.map(c => `<button type="button" data-q="${esc(c)}">${esc(c)}</button>`).join(''); };
  const DEFAULT_CHIPS = ['🔍 Find my pump', '💰 Ask for price', '🌾 Agriculture pumps', '🏠 Home pumps', '☀️ Solar pumps', '🏷️ Brands we sell', '📍 Shop location', '📞 Talk to a person'];
  const say = (html, next) => new Promise(res => {
    const t = add('<span class="typing"><i></i><i></i><i></i></span>');
    setTimeout(() => { t.innerHTML = html; scroll(); if (next) chips(next); res(t); }, Math.min(900, 280 + html.length * 1.2));
  });

  const card = r => {
    const p = r.p, price = priceTop(p);
    return `<div class="bc" data-id="${esc(p.id)}">
      <div class="bc-img">${p.img ? `<img src="${esc(p.img)}" alt="" loading="lazy" />` : ''}</div>
      <div class="bc-b"><small>${esc(p.brandName)} · ${esc(p.type)}</small><b>${esc(p.name)}</b>
      <span class="bc-sp">${[p.power, p.head, r.bore ? r.bore + '″ bore' : (r.open ? 'Openwell' : '')].filter(Boolean).map(esc).join(' · ')}</span>
      ${r.why && r.why.length ? `<em>✓ ${esc(r.why.slice(0, 2).join(' · '))}</em>` : ''}
      <a class="bc-pr" href="tel:+919246607214"><i class="ico">${I.phone || ''}</i>Price: call 9246607214</a>
      <div class="bc-act"><button type="button" data-view="${esc(p.id)}">View details</button><a href="${wa(`Hi, please share the price for ${p.name}.`)}" target="_blank" rel="noopener">${I.whatsapp || ''} Ask for price</a></div></div></div>`;
  };
  const showRecs = async (q, intro) => {
    const recs = recommend(q);
    if (!recs.length) {
      return say(`I couldn't find an exact match for that combination in our catalogue. G V Sathyanarayana can check other models and stock for you.<div class="bm-act"><a href="${wa(`Hi, I need a pump: ${describe(q)}`)}" target="_blank" rel="noopener">${I.whatsapp || ''} Ask on WhatsApp</a><a href="tel:${TEL1}">${I.phone || ''} Call</a></div>`, ['🔍 Find my pump', '🏷️ Brands we sell', '📞 Talk to a person']);
    }
    await say(`${intro || 'Here are my top picks'} for <b>${esc(describe(q))}</b>:<div class="bcs">${recs.map(card).join('')}</div>For prices, call G V Sathyanarayana on 92466 07214 or 97041 57350.`, ['Show more options', '💰 Ask for price', '🔍 Start over']);
    ctx.last = q;
  };
  const describe = q => [q.bore ? `${q.bore}″ borewell` : q.open ? 'open well / sump' : '', q.depth ? `${q.depth} m depth` : '', q.hp ? `${q.hp} HP` : '', q.phase ? `${q.phase} phase` : '', q.cat ? q.cat.toLowerCase() : '', q.solar ? 'solar' : '', q.ss ? 'stainless steel' : '', q.brand ? (D.brands.find(b => b.slug === q.brand) || {}).name : ''].filter(Boolean).join(', ') || 'your needs';

  /* guided finder */
  const startFinder = async () => { flow = { step: 'bore', q: {} }; await say('Let\'s find the right pump. What is your <b>borewell size</b>? (Or choose open well / sump.)', ['3″', '4″', '5″', '6″', '7″', '8″', 'Open well / sump', 'Not sure']); };
  const finderStep = async text => {
    const q = flow.q, t = text.toLowerCase(), pq = parse(text);
    if (flow.step === 'bore') {
      if (/open|sump|well/.test(t) && !/bore/.test(t)) q.open = true; else if (pq.bore) q.bore = pq.bore; else if (/(\d)/.test(t)) q.bore = +t.match(/\d/)[0]; else if (/not sure/.test(t)) q.bore = null;
      flow.step = 'depth';
      return say(q.open ? 'How high do you need to lift the water (well depth plus up to the tank)?' : 'Roughly how <b>deep</b> is the water level / borewell?', ['Up to 30 m', '60 m', '100 m', '150 m', '200 m', '300 m+', 'Not sure']);
    }
    if (flow.step === 'depth') {
      const v = pq.depth || (t.match(/(\d{2,3})/) || [])[1]; if (v) q.depth = +v;
      flow.step = 'phase';
      return say('Which <b>power supply</b> do you have?', ['Single phase', 'Three phase', 'Solar', 'Not sure']);
    }
    if (flow.step === 'phase') {
      if (/single/.test(t)) q.phase = 'single'; if (/three/.test(t)) q.phase = 'three'; if (/solar/.test(t)) q.solar = true;
      flow.step = 'use';
      return say('Is it for <b>agriculture</b> or <b>home</b> use?', ['🌾 Agriculture', '🏠 Home / building', 'Both']);
    }
    if (flow.step === 'use') {
      if (/agri|farm/.test(t)) q.cat = 'Agriculture'; else if (/home|build/.test(t)) q.cat = 'Domestic';
      flow = null; Object.assign(ctx, { finder: q });
      return showRecs(q, 'Great, based on your answers, these are my picks');
    }
  };

  
  /* ---------- AI (LLM) layer ---------- */
  const AI_URL = 'https://text.pollinations.ai/openai';
  const history = [];
  const compact = r => { const p = r.p; return `${p.id} | ${p.name} | ${p.brandName} | ${p.category || ''} | ${p.type} | power ${p.power || '-'} | head ${p.head || '-'} | flow ${p.flow || '-'} | bore ${p.bore || '-'} | phase ${p.phase || '-'}`; };
  const candidates = text => {
    const q = parse(text), t = text.toLowerCase(), seen = new Set(), out = [];
    const push = r => { if (r && !seen.has(r.p.id) && out.length < 8) { seen.add(r.p.id); out.push(r); } };
    if (Object.keys(q).length) recommend(q).forEach(push);
    const words = t.split(/[^a-z0-9.]+/).filter(w => w.length > 2 && !/the|and|for|pump|pumps|motor|with|need|want|which|what|best/.test(w));
    if (words.length) IDX.map(r => ({ r, k: words.reduce((a, w) => a + (r.text.includes(w) ? 1 : 0), 0) })).filter(x => x.k).sort((a, b) => b.k - a.k).slice(0, 6).forEach(x => push(x.r));
    if (ctx.last) recommend(ctx.last).forEach(push);
    return out;
  };
  const SYS = () => `You are "Anjaneya AI", the assistant on the website of Sri Anjaneya Enterprises, an authorised dealer of submersible pumps and motors in Old Boiguda, Secunderabad, Telangana (8+ years).
Facts you may use:
- Brands: ${brandList}. Own brand: Aqua Tide (coming soon).
- Managing Director: G V Sathyanarayana. Phones: 92466 07214, 97041 57350. WhatsApp: +91 92466 07214. Email: sae.sathya@gmail.com.
- Address: 5-3-160, Ground Floor, Jeera Compound, Old Boiguda, Secunderabad 500003. GSTIN 36ASFPG1225Q1ZM.
- Prices are NOT published. Never state, estimate or compare any price or budget figure. For any price question, ask the customer to contact G V Sathyanarayana on 92466 07214 or 97041 57350 (call or WhatsApp).
- Opening hours are not published: ask the customer to call before visiting.
Rules:
- Reply in the same language the customer writes in (English, Telugu or Hindi). Be warm, clear and brief: at most 110 words, short lines, no tables.
- For pump selection, ask only for what is missing (bore size, water depth, phase, use) and recommend ONLY products from the CATALOGUE list below, by id. Never invent models, specs, prices, warranties or stock.
- If the catalogue list has nothing suitable, say so and suggest calling or WhatsApp.
- General pump questions (HP, phase, stages, oil vs water filled, solar, saline water, maintenance) you may answer from general knowledge, carefully.
- Submersible motors are cooled by the water around them. For tripping, low pressure or noise, suggest checking supply voltage and phases, starter / overload settings, dry running (water level fallen), cable joints and a choked pump, and offer a check by our team.
- Off-topic questions: answer in one short line if harmless, then offer pump help.
- Last line must be exactly: IDS: <comma separated catalogue ids you recommend> or IDS: none`;
  const md = s => esc(s).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>').replace(/^\s*[-•*]\s+/gm, '• ').replace(/\n/g, '<br>');
  window.__aiPayload = text => { const cands = candidates(text); return JSON.stringify({ model: 'openai', temperature: .4, messages: [{ role: 'system', content: SYS() + '\n\nCATALOGUE (id | name | brand | use | type | power | head | flow | bore | phase):\n' + (cands.map(compact).join('\n') || '(none)') }, { role: 'user', content: text }] }); };
  let lastAI = 0;
  const aiReply = async text => {
    const cands = candidates(text);
    const t = add('<span class="typing"><i></i><i></i><i></i></span><small class="think">Anjaneya AI is thinking…</small>');
    const wait = Math.max(0, lastAI + 13000 - Date.now()); // free AI tier allows about one request every 15 s
    if (wait) await new Promise(r => setTimeout(r, wait));
    lastAI = Date.now();
    const ctrl = new AbortController(), timer = setTimeout(() => ctrl.abort(), 25000);
    try {
      const messages = [{ role: 'system', content: SYS() + '\n\nCATALOGUE (id | name | brand | use | type | power | head | flow | bore | phase):\n' + (cands.map(compact).join('\n') || '(no close matches for this message)') }, ...history.slice(-8), { role: 'user', content: text }];
      const r = await fetch(AI_URL, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ model: 'openai', messages, temperature: .4 }), signal: ctrl.signal });
      if (!r.ok) throw new Error('http ' + r.status);
      const j = await r.json();
      let out = (j.choices && j.choices[0] && j.choices[0].message && j.choices[0].message.content || '').trim();
      if (!out) throw new Error('empty');
      const m = out.match(/IDS:\s*([^\n]*)\s*$/i); out = out.replace(/\n?IDS:[^\n]*\s*$/i, '').replace(/\s*\((?:[a-z]+(?:[-\u2011][a-z]+)*)[-\u2011]\d+\)/gi, '').trim();
      const ids = m ? m[1].replace(/[\u2010\u2011\u2013]/g, '-').split(/[,\s]+/).map(x => x.trim()).filter(x => x && x !== 'none') : [];
      const recs = ids.map(id => cands.find(c => c.p.id === id) || IDX.find(r => r.p.id === id)).filter(Boolean).slice(0, 3);
      history.push({ role: 'user', content: text }, { role: 'assistant', content: out });
      if (recs.length) ctx.last = Object.assign({}, ctx.last || {}, parse(text));
      t.innerHTML = md(out) + (recs.length ? `<div class="bcs">${recs.map(card).join('')}</div>` : '') + `<div class="bm-act"><a href="${wa('Hi, ' + text)}" target="_blank" rel="noopener">${I.whatsapp || ''} Ask our team</a></div>`;
      t.classList.add('aim'); scroll(); chips(['🔍 Find my pump', '💰 Ask for price', '📞 Talk to a person']);
    } catch (e) {
      t.remove(); return localReply(text);
    } finally { clearTimeout(timer); }
  };

  const localReply = async text => {
    const t = text.toLowerCase().replace(/[^\w\s"″.,₹+-]/g, ' ').trim();
    if (flow) return finderStep(text);
    if (/^(hi|hello|hey|namaste|namaskaram|hai|hii+|good (morning|afternoon|evening))\b/.test(t)) return say('Namaste! 🙏 I\'m the Sri Anjaneya Enterprises assistant. I can find a pump for your borewell, compare brands, explain options or connect you to G V Sathyanarayana for the price.', DEFAULT_CHIPS);
    if (/thank|thanks|thx|super|great|ok thanks|dhanyavad/.test(t)) return say('Happy to help! Anything else? You can also call or WhatsApp us for the final quote.', DEFAULT_CHIPS);
    if (/start over|reset|find my pump|^find|suggest a pump|which pump|recommend|help me choose|choose a pump/.test(t) && !Object.keys(parse(text)).length) return startFinder();
    if (/show more/.test(t) && ctx.last) { const all = recommend({ ...ctx.last }); return say(`Want the full list? Open the catalogue filtered for you.<div class="bm-act"><a href="#pumps" data-goto="1">Open catalogue</a></div>`, DEFAULT_CHIPS); }
    if (/talk to|person|human|agent|call|phone|number|contact/.test(t)) return say(`You can reach <b>G V Sathyanarayana (MD)</b> directly:<div class="bm-act"><a href="tel:${TEL1}">${I.phone || ''} 92466 07214</a><a href="tel:${TEL2}">${I.phone || ''} 97041 57350</a><a href="${wa('Hi, I have a pump enquiry.')}" target="_blank" rel="noopener">${I.whatsapp || ''} WhatsApp</a><a href="${window.mailLink ? mailLink('Pump enquiry') : 'mailto:sae.sathya@gmail.com'}" target="_blank" rel="noopener">${I.gmail || ''} Gmail</a></div>`, DEFAULT_CHIPS);
    if (/whatsapp|watsapp|whats app/.test(t)) return say(`Tap to chat on WhatsApp:<div class="bm-act"><a href="${wa('Hi, I have a pump enquiry.')}" target="_blank" rel="noopener">${I.whatsapp || ''} Open WhatsApp</a></div>`, DEFAULT_CHIPS);
    if (/mail|gmail/.test(t)) return say(`Write to us at <b>sae.sathya@gmail.com</b>:<div class="bm-act"><a href="${window.mailLink ? mailLink('Pump enquiry') : 'mailto:sae.sathya@gmail.com'}" target="_blank" rel="noopener">${I.gmail || ''} Compose email</a></div>`, DEFAULT_CHIPS);
    if (/where|location|address|shop|directions|map|visit|reach you/.test(t)) return say(`We're at <b>5-3-160, Ground Floor, Jeera Compound, Old Boiguda, Secunderabad – 500003</b>.<div class="bm-act"><a href="https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent('Jeera Compound, Old Boiguda, Secunderabad, Telangana 500003')}" target="_blank" rel="noopener">${I.map || ''} Directions</a><a href="tel:${TEL1}">${I.phone || ''} Call before visiting</a></div>`, DEFAULT_CHIPS);
    if (/timing|hours|open today|opening|closing|close time|sunday/.test(t)) return say(`Please call before you visit so we can confirm today's timings and keep your pump ready: <a href="tel:${TEL1}">92466 07214</a>.`, DEFAULT_CHIPS);
    if (/brands?|which compan|what do you sell|dealer|authori[sz]ed/.test(t) && !parse(text).brand) return say(`We're dealers for ${esc(brandList)}, plus our own brand <b>Aqua Tide</b> (coming soon). Tap a brand logo on the page to see its full range.`, ['KSB pumps', 'Kirloskar pumps', 'Crompton pumps', 'Lubi pumps', '🔍 Find my pump']);
    if (/price|cost|rate|quote|quotation|price|discount|offer|how much/.test(t)) {
      const q = parse(text);
      if (Object.keys(q).length) return showRecs(q, 'Here are options for');
      return say(`Prices are not listed online. For the price of any motor, call <b>G V Sathyanarayana</b> on <a href="tel:${TEL1}">92466 07214</a> or <a href="tel:${TEL2}">97041 57350</a>.<div class="bm-act"><a href="${wa('Hi, please share your price for a pump.')}" target="_blank" rel="noopener">${I.whatsapp || ''} Ask for price</a></div>`, ['🔍 Find my pump', '📞 Talk to a person']);
    }
    for (const [re, fn] of KB) if (re.test(t)) { const q = parse(text); if (re.source.startsWith('solar') && (q.bore || q.depth)) break; return say(fn(), ['🔍 Find my pump', '💰 Ask for price', '📞 Talk to a person']); }
    if (/^(?:🌾\s*)?agriculture pumps?$/.test(t) || /^agriculture$/.test(t)) return showRecs({ cat: 'Agriculture' }, 'Popular agriculture pumps');
    if (/^(?:🏠\s*)?home pumps?$/.test(t)) return showRecs({ cat: 'Domestic' }, 'Popular home pumps');
    const q = parse(text);
    if (Object.keys(q).length) { Object.assign(q, ctx.last && /also|and|same|instead|change|what about|how about/.test(t) ? { ...ctx.last, ...q } : {}); return showRecs(q); }
    // something we don't cover: be honest, offer help and a human hand-off with their question attached
    return say(`I'm not sure about that one. I'm best with pumps: choosing one for your borewell, prices, brands and our shop. Shall I pass your question to G V Sathyanarayana?<div class="bm-act"><a href="${wa(`Hi, I have a question: ${text}`)}" target="_blank" rel="noopener">${I.whatsapp || ''} Send this on WhatsApp</a><a href="tel:${TEL1}">${I.phone || ''} Call</a></div>`, DEFAULT_CHIPS);
  };

  const QUICK = /^(find my pump|price|agriculture pumps|home pumps|solar pumps|brands we sell|shop location|talk to a person|start over|show more options|ksb pumps|kirloskar pumps|crompton pumps|lubi pumps)$/i;
  const reply = text => (flow || QUICK.test(text) || !navigator.onLine) ? localReply(text) : aiReply(text);
  const send = text => { text = String(text || '').replace(/^[^\w"″\u0C00-\u0C7F\u0900-\u097F]+/u, '').trim(); if (!text) return; add(esc(text), 'me'); chipsBox.innerHTML = ''; reply(text); };
  const open = v => {
    root.classList.toggle('open', v); panel.setAttribute('aria-hidden', String(!v)); fab.setAttribute('aria-expanded', String(v));
    if (v && !body.children.length) say('Namaste! 🙏 I\'m <b>Anjaneya AI</b>. Ask me anything about pumps in English, తెలుగు or हिन्दी: your borewell size and depth, a brand, a price, or a problem with your motor.', DEFAULT_CHIPS);
    if (v) setTimeout(() => input.focus({ preventScroll: true }), 300);
    root.querySelector('.bot-tip').classList.remove('show');
  };
  fab.addEventListener('click', () => open(!root.classList.contains('open')));
  $('.bot-x').addEventListener('click', () => open(false));
  $('.bot-form').addEventListener('submit', e => { e.preventDefault(); const v = input.value; input.value = ''; send(v); });
  chipsBox.addEventListener('click', e => { const b = e.target.closest('button[data-q]'); if (b) send(b.dataset.q); });
  body.addEventListener('click', e => {
    const v = e.target.closest('[data-view]'); if (v) { window.SAE && SAE.openPump(v.dataset.view); return; }
    const g = e.target.closest('[data-goto]'); if (g) { open(false); }
  });
  addEventListener('keydown', e => { if (e.key === 'Escape' && root.classList.contains('open') && !document.querySelector('.modal.open')) open(false); });
  // one gentle nudge per visit
  if (!sessionStorage.getItem('saeBotTip')) setTimeout(() => { if (!root.classList.contains('open')) { root.querySelector('.bot-tip').classList.add('show'); sessionStorage.setItem('saeBotTip', 1); setTimeout(() => root.querySelector('.bot-tip').classList.remove('show'), 7000); } }, 6000);
  root.querySelector('.bot-tip').addEventListener('click', () => open(true));
  window.SAEBot = { open, send };
})();
