/* "Pump types" explainer: one WebGL stage, a procedural cut-away model per pump type,
   water particles that follow the real flow path, and three animated "how it works" steps. */
import * as THREE from 'three';

const root = document.getElementById('types');
const canvas = document.getElementById('typesCanvas');
if (root && canvas) {
  const D = window.SAE_DATA || { products: [] };
  const count = re => D.products.filter(p => re.test((p.type || '') + ' ' + (p.name || ''))).length;
  const TYPES = [
    { key: 'borewell', name: 'Borewell submersible', tag: 'V3 – V10 · deep borewells',
      what: 'A slim multistage pump and motor that sits deep inside the borewell, below the water level, and pushes water up the riser pipe.',
      steps: ['Water enters through the suction strainer above the motor', 'Stacked impellers add pressure stage by stage', 'Water rises up the riser pipe to the surface'],
      use: 'Farms, apartments, homes on borewells', re: /borewell submersible/i },
    { key: 'openwell', name: 'Openwell submersible', tag: 'Horizontal & vertical · open wells, sumps',
      what: 'A compact submersible that works under water in an open well, sump or river. No foundation and no priming needed.',
      steps: ['The pump lies under water, so it is always primed', 'The water-cooled motor spins the impeller', 'Water is pushed up the delivery pipe to the field'],
      use: 'Open wells, farm ponds, sumps', re: /openwell|open well/i },
    { key: 'monoblock', name: 'Monoblock (surface)', tag: 'Centrifugal · ground level',
      what: 'Motor and pump share one shaft in a single block on the ground. It sucks water up through a suction pipe with a foot valve.',
      steps: ['The foot valve keeps the suction pipe full of water', 'The impeller spins and creates suction', 'Water is thrown out of the volute into the delivery pipe'],
      use: 'Shallow wells, canals, tanks, irrigation', re: /monoblock/i },
    { key: 'selfpriming', name: 'Self-priming (domestic)', tag: 'Home pumps · sump to overhead tank',
      what: 'A small home pump that clears air from its suction pipe by itself, so it lifts water from the sump without manual priming.',
      steps: ['Water is lifted from the underground sump', 'The priming chamber pushes out trapped air', 'Water fills the overhead tank on the roof'],
      use: 'Houses, shops, small buildings', re: /self.?priming/i },
    { key: 'booster', name: 'Pressure booster', tag: 'Constant pressure · every floor',
      what: 'A pump with a pressure tank and switch that keeps taps and showers at steady pressure on every floor.',
      steps: ['The pressure switch senses a tap opening', 'The pump starts and the tank cushions the pressure', 'Every floor gets the same steady flow'],
      use: 'Apartments, villas, hotels', re: /booster|pressure/i },
    { key: 'solar', name: 'Solar pump', tag: 'AC / DC · runs on sunlight',
      what: 'Solar panels feed a controller that drives a submersible pump. No grid power or diesel needed during the day.',
      steps: ['Panels turn sunlight into DC power', 'The controller matches speed to the sunlight', 'The pump lifts water straight to the field'],
      use: 'Farms without reliable power', re: /solar/i },
  ];

  /* ---------- UI ---------- */
  const tabs = root.querySelector('.ty-tabs'), info = root.querySelector('.ty-info');
  tabs.innerHTML = TYPES.map((t, i) => `<button role="tab" data-i="${i}" aria-selected="${i === 0}"><b>${t.name}</b><small>${t.tag}</small></button>`).join('');
  const renderInfo = (i, step) => {
    const t = TYPES[i], n = count(t.re);
    info.innerHTML = `<span class="eyebrow">${t.tag}</span><h3>${t.name}</h3><p>${t.what}</p>
      <ol class="ty-steps">${t.steps.map((s, k) => `<li class="${k === step ? 'on' : ''}"><i>${k + 1}</i><span>${s}</span></li>`).join('')}</ol>
      <p class="ty-use"><b>Best for:</b> ${t.use}</p>
      <div class="ty-cta">${n ? `<button class="btn btn-gold btn-sm" data-ty-find="${t.key}">See ${n} models</button>` : ''}<a class="btn btn-ghost btn-sm" target="_blank" rel="noopener" href="https://wa.me/919246607214?text=${encodeURIComponent('Hi, I want to know about ' + t.name + ' pumps')}">Ask about ${t.name.split(' ')[0].toLowerCase()} pumps</a></div>`;
  };
  info.addEventListener('click', e => {
    const b = e.target.closest('[data-ty-find]'); if (!b) return;
    const q = document.getElementById('q'), t = TYPES.find(x => x.key === b.dataset.tyFind);
    if (q) { q.value = t.key === 'borewell' ? 'borewell' : t.key === 'openwell' ? 'openwell' : t.key; q.dispatchEvent(new Event('input', { bubbles: true })); }
    document.getElementById('pumps')?.scrollIntoView({ behavior: 'smooth' });
  });

  /* ---------- 3D ---------- */
  let renderer;
  try { renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true }); } catch (e) { root.classList.add('no3d'); }
  const mobile = innerWidth < 760;
  let cur = 0, step = 0, stepT = 0, auto = true, visible = false;
  const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(34, 1, .1, 100);
  const world = new THREE.Group(); scene.add(world);
  if (renderer) {
    renderer.setPixelRatio(Math.min(devicePixelRatio, mobile ? 1.5 : 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping = THREE.ACESFilmicToneMapping;
    scene.add(new THREE.HemisphereLight(0xcfe8ff, 0x0a1a2c, 1.1));
    const key = new THREE.DirectionalLight(0xffffff, 2.2); key.position.set(4, 7, 5); scene.add(key);
    const rim = new THREE.DirectionalLight(0x3ee0ff, 1.4); rim.position.set(-5, 3, -4); scene.add(rim);
  }
  const M = {
    steel: new THREE.MeshStandardMaterial({ color: 0xc9d3dc, metalness: .9, roughness: .28 }),
    blue: new THREE.MeshStandardMaterial({ color: 0x1d6fd6, metalness: .5, roughness: .35 }),
    red: new THREE.MeshStandardMaterial({ color: 0xd8262f, metalness: .4, roughness: .4 }),
    dark: new THREE.MeshStandardMaterial({ color: 0x223040, metalness: .6, roughness: .5 }),
    pipe: new THREE.MeshStandardMaterial({ color: 0xe8eef4, metalness: .2, roughness: .4, transparent: true, opacity: .35 }),
    soil1: new THREE.MeshStandardMaterial({ color: 0x8a5a35, roughness: 1 }), soil2: new THREE.MeshStandardMaterial({ color: 0x6b4426, roughness: 1 }),
    rock: new THREE.MeshStandardMaterial({ color: 0x5a5f66, roughness: .9 }),
    water: new THREE.MeshPhysicalMaterial({ color: 0x2fb7ff, transparent: true, opacity: .45, roughness: .1, transmission: .3 }),
    grass: new THREE.MeshStandardMaterial({ color: 0x3f8f3a, roughness: 1 }),
    wall: new THREE.MeshStandardMaterial({ color: 0xe9e2d6, roughness: .9 }), roof: new THREE.MeshStandardMaterial({ color: 0xb04a2e, roughness: .8 }),
    tank: new THREE.MeshStandardMaterial({ color: 0x1b1f24, roughness: .6 }),
    panel: new THREE.MeshStandardMaterial({ color: 0x0d2b5a, metalness: .7, roughness: .2, emissive: 0x06204a, emissiveIntensity: .4 }),
    glow: new THREE.MeshBasicMaterial({ color: 0xf5b524 }),
  };
  const box = (w, h, d, m, x = 0, y = 0, z = 0, g = world) => { const o = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); o.position.set(x, y, z); g.add(o); return o; };
  const cyl = (r, h, m, x = 0, y = 0, z = 0, g = world, rt = r, seg = 32) => { const o = new THREE.Mesh(new THREE.CylinderGeometry(rt, r, h, seg), m); o.position.set(x, y, z); g.add(o); return o; };

  /* a submersible pump-motor set standing along +Y (or laid flat with rot) */
  const subPump = (g, len = 2.2, r = .16) => {
    const p = new THREE.Group(); g.add(p);
    cyl(r, len * .45, M.steel, 0, len * .22, 0, p);                       // motor
    const st = cyl(r * .95, len * .1, M.dark, 0, len * .5, 0, p);          // strainer
    st.material = new THREE.MeshStandardMaterial({ color: 0x334455, metalness: .7, roughness: .4, wireframe: false });
    for (let i = 0; i < 6; i++) cyl(r * 1.02, len * .055, i % 2 ? M.steel : M.blue, 0, len * (.6 + i * .06), 0, p); // stages
    cyl(r * .5, len * .08, M.steel, 0, len * .98, 0, p);
    p.userData.parts = { strainer: st };
    return p;
  };
  /* water flow: a translucent pipe plus moving particles along a curve */
  const flows = [];
  const flow = (pts, r = .07, n = 70, showPipe = true) => {
    const curve = new THREE.CatmullRomCurve3(pts.map(p => new THREE.Vector3(...p)));
    if (showPipe) world.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 80, r, 12), M.pipe));
    const geo = new THREE.BufferGeometry(), pos = new Float32Array(n * 3); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const pts3 = new THREE.Points(geo, new THREE.PointsMaterial({ color: 0x7fe3ff, size: mobile ? .09 : .07, transparent: true, opacity: .95, depthWrite: false, blending: THREE.AdditiveBlending }));
    world.add(pts3); flows.push({ curve, geo, n, off: Math.random() }); return curve;
  };
  const clear = () => { flows.length = 0; while (world.children.length) { const o = world.children.pop(); o.traverse?.(c => { c.geometry?.dispose(); }); } };
  const ground = (w = 7, d = 4) => { box(w, .3, d, M.grass, 0, 0, 0); };
  const strata = (w, d, depth) => { // cut-away soil block (front half removed)
    const g = new THREE.Group(); world.add(g);
    const layers = [[M.soil1, .3], [M.soil2, .3], [M.rock, .4]]; let y = -.15;
    layers.forEach(([m, f]) => { const h = depth * f; box(w, h, d / 2, m, 0, y - h / 2, -d / 4, g); y -= h; });
    return g;
  };

  const BUILD = {
    borewell() {
      ground(6, 4); strata(6, 4, 6);
      box(6, 1.5, 2, M.water, 0, -5.2, -1);                               // aquifer
      cyl(.26, 6, M.pipe, 0, -3, 0);                                         // casing
      const p = subPump(world, 2, .17); p.position.set(0, -5.9, 0);
      flow([[0, -4, 0], [0, -1.5, 0], [0, .7, 0], [0, 1.0, 0], [.35, 1.2, 0], [1.2, 1.2, 0], [2.8, 1.2, 0]], .07, 90);
      cyl(.5, .2, M.dark, 0, .3, 0);
      camera.userData = { target: new THREE.Vector3(0, -2.4, 0), dist: 16, y: -1 };
      return [p.userData.parts.strainer.position.clone().add(p.position), new THREE.Vector3(0, -4.4, 0), new THREE.Vector3(0, .6, 0)];
    },
    openwell() {
      ground(7, 4); strata(7, 4, 4);
      const ring = cyl(1.3, 4, new THREE.MeshStandardMaterial({ color: 0x9aa3ab, roughness: .9, side: THREE.BackSide }), 0, -2, -.2, world, 1.3, 40);
      cyl(1.25, 2.4, M.water, 0, -2.8, -.2, world, 1.25, 40);
      const p = subPump(world, 1.4, .26); p.rotation.z = Math.PI / 2; p.position.set(.7, -3.6, -.2);
      flow([[-.7, -3.6, -.2], [-.9, -2, -.2], [-.9, .6, -.2], [-.4, .9, -.2], [3.2, .9, -.2]], .08, 90);
      camera.userData = { target: new THREE.Vector3(0, -1.6, 0), dist: 13.5, y: 0 };
      return [new THREE.Vector3(.2, -3.6, -.2), new THREE.Vector3(.7, -3.6, -.2), new THREE.Vector3(-.9, 0, -.2)];
    },
    monoblock() {
      ground(7, 4); strata(7, 4, 3.5);
      box(3, 1.6, 2, M.water, -1.6, -2.6, -1);
      const g = new THREE.Group(); world.add(g); g.position.set(1, .55, 0);
      const mot = cyl(.42, 1.3, M.blue, 0, 0, 0, g); mot.rotation.z = Math.PI / 2; mot.position.x = .5;
      for (let i = 0; i < 8; i++) { const f = cyl(.45, .04, M.blue, .05 + i * .14, 0, 0, g); f.rotation.z = Math.PI / 2; }
      const vol = cyl(.55, .4, M.red, -.45, 0, 0, g); vol.rotation.z = Math.PI / 2;
      box(1.8, .1, .7, M.dark, .2, -.48, 0, g);
      flow([[-2.4, -2.9, -.4], [-2.4, -.5, -.4], [-2.4, .55, -.4], [-1.4, .55, 0], [.35, .55, 0]], .08, 70);
      flow([[.55, 1.1, 0], [.55, 2, 0], [1.4, 2.4, 0], [3.2, 2.4, 0]], .08, 50);
      cyl(.14, .25, M.dark, -2.4, -3.1, -.4);                                // foot valve
      camera.userData = { target: new THREE.Vector3(0, -.2, 0), dist: 13.5, y: .6 };
      return [new THREE.Vector3(-2.4, -3.1, -.4), new THREE.Vector3(.55, .55, 0), new THREE.Vector3(.55, 1.8, 0)];
    },
    selfpriming() {
      ground(7, 4); box(2, 1.4, 1.6, M.water, -2, -1, 0);                  // sump
      box(2.4, 2.6, 2, M.wall, 1.6, 1.45, -.4); const r = box(2.8, .18, 2.4, M.roof, 1.6, 2.85, -.4);
      const tank = cyl(.45, .9, M.tank, 2.2, 3.4, -.4);
      const g = new THREE.Group(); world.add(g); g.position.set(-.4, .4, .6);
      const mot = cyl(.25, .7, M.blue, .25, 0, 0, g); mot.rotation.z = Math.PI / 2;
      cyl(.3, .32, M.blue, -.2, .05, 0, g).rotation.z = Math.PI / 2;
      cyl(.18, .3, M.steel, -.2, .4, 0, g);                                  // priming chamber
      flow([[-2, -1.4, .3], [-2, .1, .3], [-1.2, .4, .6], [-.4, .4, .6]], .06, 50);
      flow([[-.2, .75, .6], [-.2, 1.5, .6], [.2, 3.2, .6], [1.9, 3.6, -.1]], .06, 60);
      camera.userData = { target: new THREE.Vector3(0, 1.1, 0), dist: 13.5, y: 1.4 };
      return [new THREE.Vector3(-2, -1, .3), new THREE.Vector3(-.6, .8, .6), tank.position.clone()];
    },
    booster() {
      ground(7, 4);
      const floors = 3; for (let i = 0; i < floors; i++) { box(3, 1.2, 2, M.wall, 1.5, .75 + i * 1.3, -.6); box(3.1, .1, 2.1, M.dark, 1.5, 1.4 + i * 1.3, -.6); }
      const g = new THREE.Group(); world.add(g); g.position.set(-1.6, .4, .4);
      const mot = cyl(.22, .6, M.blue, 0, 0, 0, g); mot.rotation.z = Math.PI / 2;
      const pt = cyl(.32, 1, M.red, -.9, .5, 0, g); const cap = new THREE.Mesh(new THREE.SphereGeometry(.32, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), M.red); cap.position.set(-.9, 1, 0); g.add(cap);
      flow([[-1.3, .4, .4], [-.4, .4, .4], [.2, .4, .4], [.2, 3.8, .4]], .06, 80);
      for (let i = 0; i < floors; i++) flow([[.2, .9 + i * 1.3, .4], [1.2, .9 + i * 1.3, .4], [2.4, .9 + i * 1.3, .4]], .045, 22);
      camera.userData = { target: new THREE.Vector3(0, 1.6, 0), dist: 13.5, y: 1.8 };
      return [new THREE.Vector3(-1.6, .6, .4), new THREE.Vector3(-2.5, .9, .4), new THREE.Vector3(2.2, 2.2, .4)];
    },
    solar() {
      ground(7, 4); strata(7, 4, 5); box(7, 1.2, 2, M.water, 0, -4.4, -1);
      for (let i = 0; i < 3; i++) { const p = box(1.1, .05, .8, M.panel, -2.4 + i * 1.2, 1.4, .2); p.rotation.x = -.55; cyl(.03, 1.1, M.steel, -2.4 + i * 1.2, .8, .3); }
      const ctl = box(.5, .7, .25, M.steel, .3, .7, .6); const led = box(.1, .1, .02, M.glow, .3, .85, .74);
      cyl(.22, 5, M.pipe, 1.6, -2.5, 0); const p = subPump(world, 1.6, .15); p.position.set(1.6, -5, 0);
      flow([[-2.4, 1.3, .2], [-1, 1.1, .6], [.3, 1, .6]], .02, 30, false);   // power (yellow)
      flows[flows.length - 1].power = true;
      flow([[1.6, -3.4, 0], [1.6, .9, 0], [2, 1.1, 0], [3.4, 1.1, 0]], .07, 80);
      camera.userData = { target: new THREE.Vector3(0, -1.6, 0), dist: 15.5, y: -.4 };
      return [new THREE.Vector3(-1.2, 1.4, .2), ctl.position.clone(), new THREE.Vector3(1.6, .6, 0)];
    },
  };

  /* step marker */
  const marker = new THREE.Mesh(new THREE.TorusGeometry(.32, .04, 12, 40), new THREE.MeshBasicMaterial({ color: 0xf5b524 }));
  let anchors = [];
  const label = root.querySelector('.ty-label');
  const show = i => {
    cur = i; step = 0; stepT = 0;
    if (renderer) { clear(); anchors = BUILD[TYPES[i].key](); world.add(marker); flows.forEach(f => { if (f.power) f.geo.userData.power = true; }); }
    tabs.querySelectorAll('button').forEach((b, k) => b.setAttribute('aria-selected', k === i));
    renderInfo(i, 0); root.dataset.type = TYPES[i].key;
  };
  tabs.addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; auto = false; show(+b.dataset.i); });
  info.addEventListener('mouseenter', () => { auto = false; });

  /* drag to rotate */
  let yaw = -.5, tYaw = -.5, drag = null;
  canvas.addEventListener('pointerdown', e => { drag = e.clientX; auto = false; canvas.setPointerCapture(e.pointerId); });
  canvas.addEventListener('pointermove', e => { if (drag != null) { tYaw += (e.clientX - drag) * .008; drag = e.clientX; } });
  canvas.addEventListener('pointerup', () => { drag = null; });

  const resize = () => { if (!renderer) return; const r = canvas.getBoundingClientRect(); renderer.setSize(r.width, r.height, false); camera.aspect = r.width / r.height; camera.updateProjectionMatrix(); };
  addEventListener('resize', resize);
  new IntersectionObserver(es => { visible = es[0].isIntersecting; if (visible) resize(); }, { rootMargin: '100px' }).observe(root);

  const v = new THREE.Vector3(); let last = performance.now(), typeT = 0;
  const loop = now => {
    requestAnimationFrame(loop);
    const dt = Math.min(.05, (now - last) / 1000); last = now;
    if (!visible || !renderer) return;
    stepT += dt; if (stepT > 3.2) { stepT = 0; step = (step + 1) % 3; renderInfo(cur, step); if (step === 0 && auto && (typeT += 1) >= 2) { typeT = 0; show((cur + 1) % TYPES.length); } }
    tYaw += auto ? dt * .12 : 0; yaw += (tYaw - yaw) * .06;
    const u = camera.userData || { target: new THREE.Vector3(), dist: 10, y: 0 };
    camera.position.set(u.target.x + Math.sin(yaw) * u.dist, u.target.y + u.y + 1.6, u.target.z + Math.cos(yaw) * u.dist); camera.lookAt(u.target);
    flows.forEach(f => {
      const a = f.geo.attributes.position, sp = f.geo.userData.power ? .5 : .28;
      f.off = (f.off + dt * sp) % 1;
      for (let i = 0; i < f.n; i++) { f.curve.getPointAt((i / f.n + f.off) % 1, v); a.setXYZ(i, v.x + (Math.random() - .5) * .03, v.y, v.z + (Math.random() - .5) * .03); }
      a.needsUpdate = true;
      if (f.geo.userData.power) world.children.forEach(c => { if (c.isPoints && c.geometry === f.geo) c.material.color.set(0xffd34d); });
    });
    const an = anchors[step]; if (an) { marker.position.copy(an); marker.lookAt(camera.position); const s = 1 + Math.sin(now / 200) * .15; marker.scale.setScalar(s); }
    if (label && an) { v.copy(an).project(camera); const r = canvas.getBoundingClientRect(); const lx = (v.x * .5 + .5) * r.width, ly = (-v.y * .5 + .5) * r.height; label.classList.toggle('flip', lx > r.width * .55); label.style.transform = `translate(${lx}px,${Math.max(60, Math.min(r.height - 20, ly))}px)`; label.textContent = (step + 1) + ' · ' + TYPES[cur].steps[step]; }
    renderer.render(scene, camera);
  };
  show(0); resize(); requestAnimationFrame(loop);
}
