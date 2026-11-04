/* Hero 3D scene: a cut-away borewell diorama.
   Soil strata, an aquifer, a submersible pump in the bore, water rising up the riser pipe
   and delivered either to a field (Farm) or to a rooftop tank (Home). */
import * as THREE from 'three';

const canvas = document.getElementById('heroCanvas');
const hero = document.querySelector('.hero');
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const mobile = innerWidth < 760;
const fallback = () => hero.classList.add('no3d');

let renderer;
try { renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' }); }
catch (e) { renderer = null; fallback(); }

if (renderer) {
  renderer.setPixelRatio(Math.min(devicePixelRatio, mobile ? 1.5 : 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.shadowMap.enabled = !mobile;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 200);

  /* environment for reflections */
  const pmrem = new THREE.PMREMGenerator(renderer);
  const env = new THREE.Scene();
  env.add(new THREE.Mesh(new THREE.SphereGeometry(30, 32, 16), new THREE.ShaderMaterial({
    side: THREE.BackSide,
    vertexShader: 'varying vec3 vP; void main(){ vP=normalize(position); gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }',
    fragmentShader: `varying vec3 vP; void main(){ float y=vP.y*.5+.5;
      vec3 c=mix(vec3(.05,.12,.2),vec3(.55,.8,1.),smoothstep(.3,1.,y));
      c+=vec3(1.,.85,.55)*smoothstep(.9,1.,dot(vP,normalize(vec3(.6,.6,.5))))*3.;
      gl_FragColor=vec4(c,1.); }`
  })));
  scene.environment = pmrem.fromScene(env, 0.03).texture;

  /* lights */
  scene.add(new THREE.HemisphereLight(0xcfe9ff, 0x2a1a10, 0.9));
  const sun = new THREE.DirectionalLight(0xfff1d6, 2.6);
  sun.position.set(6, 10, 7); sun.castShadow = !mobile;
  sun.shadow.mapSize.set(1024, 1024); Object.assign(sun.shadow.camera, { left: -7, right: 7, top: 7, bottom: -7 });
  scene.add(sun);
  const cyan = new THREE.PointLight(0x3ee0ff, 18, 12); cyan.position.set(-1, -5, 4); scene.add(cyan);

  const world = new THREE.Group(); scene.add(world);
  const W = 8, D = 5, FRONT = D / 2;
  const std = (c, o = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: .92, flatShading: true, ...o });

  /* soil strata (y top → bottom) */
  const strata = [
    { t: 1.5, b: 1.05, c: 0x6d4b2c, n: 'Topsoil' },
    { t: 1.05, b: -0.9, c: 0x91603a, n: 'Red soil' },
    { t: -0.9, b: -2.7, c: 0xb9874f, n: 'Clay & murram' },
    { t: -2.7, b: -4.6, c: 0x646b77, n: 'Hard rock' },
    { t: -4.6, b: -6.6, c: 0x1f6fb5, n: 'Aquifer', water: true },
    { t: -6.6, b: -7.3, c: 0x3a3f48, n: 'Bedrock' }
  ];
  const aquiferU = { uTime: { value: 0 } };
  strata.forEach(s => {
    const h = s.t - s.b;
    const g = new THREE.BoxGeometry(W, h, D, 24, 6, 4);
    // organic edge on the front face
    const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const y = p.getY(i), x = p.getX(i);
      if (Math.abs(y - h / 2) < 1e-3 && s.t < 1.4) p.setY(i, y + Math.sin(x * 2.1 + s.t * 3) * .06);
      if (Math.abs(y + h / 2) < 1e-3 && s.b > -7.2) p.setY(i, y + Math.sin(x * 2.1 + s.b * 3) * .06);
    }
    g.computeVertexNormals();
    let m;
    if (s.water) {
      m = new THREE.ShaderMaterial({
        uniforms: aquiferU, transparent: true,
        vertexShader: 'varying vec3 vP; varying vec3 vN; void main(){ vP=position; vN=normal; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }',
        fragmentShader: `uniform float uTime; varying vec3 vP; varying vec3 vN;
          float h(vec2 p){ return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5); }
          void main(){
            vec2 q = vP.xy*5.; vec2 i=floor(q); vec2 f=fract(q);
            float pebble = smoothstep(.45,.2,length(f-.5-.25*vec2(h(i),h(i+7.))));
            float flow = .5+.5*sin(vP.x*2.5 - uTime*1.6 + sin(vP.y*4.+uTime)*.8);
            vec3 c = mix(vec3(.04,.25,.5), vec3(.15,.6,.95), flow*.6);
            c = mix(c, vec3(.45,.55,.6), pebble*.18);
            c += vec3(.4,.9,1.)*pow(flow,6.)*.35;
            float face = max(vN.z, 0.);
            gl_FragColor = vec4(c*(.75+.35*face), .96);
          }`
      });
    } else m = std(s.c);
    const mesh = new THREE.Mesh(g, m);
    mesh.position.y = (s.t + s.b) / 2; mesh.receiveShadow = true;
    world.add(mesh);
  });
  // grass cap
  const grassG = new THREE.PlaneGeometry(W, D, 40, 24); grassG.rotateX(-Math.PI / 2);
  { const p = grassG.attributes.position; for (let i = 0; i < p.count; i++) p.setY(i, Math.sin(p.getX(i) * 1.3) * Math.cos(p.getZ(i) * 1.7) * .05); grassG.computeVertexNormals(); }
  const grass = new THREE.Mesh(grassG, std(0x5fae4b, { roughness: 1 })); grass.position.y = 1.52; grass.receiveShadow = true; world.add(grass);

  /* bore slot cut into the front face */
  const BX = -1.6;
  const slot = new THREE.Mesh(new THREE.BoxGeometry(.78, 8.9, .02), new THREE.MeshBasicMaterial({ color: 0x0b1422 }));
  slot.position.set(BX, -2.85, FRONT + .011); world.add(slot);
  // casing (half pipe so the inside reads)
  const steel = new THREE.MeshPhysicalMaterial({ color: 0xd0d8e2, metalness: 1, roughness: .25, clearcoat: .5 });
  const pvc = new THREE.MeshPhysicalMaterial({ color: 0x9aa6b4, metalness: .2, roughness: .5, side: THREE.DoubleSide });
  const casing = new THREE.Mesh(new THREE.CylinderGeometry(.36, .36, 6.2, 48, 1, true, -Math.PI / 2, Math.PI), pvc);
  casing.position.set(BX, -1.6, FRONT + .14); casing.rotation.y = Math.PI; world.add(casing);
  // casing collar above ground
  const collar = new THREE.Mesh(new THREE.CylinderGeometry(.42, .42, .35, 48), pvc); collar.position.set(BX, 1.7, FRONT - .36); world.add(collar);

  /* submersible pump */
  const pump = new THREE.Group();
  const blue = new THREE.MeshPhysicalMaterial({ color: 0x1e5bd8, metalness: .5, roughness: .3, clearcoat: 1 });
  const gold = new THREE.MeshPhysicalMaterial({ color: 0xf5b524, metalness: 1, roughness: .25 });
  const prof = []; const a = (r, y) => prof.push(new THREE.Vector2(r, y));
  a(0, -1.1); a(.2, -1.1); a(.24, -1.02); a(.24, .1); a(.27, .14); a(.27, .22); a(.22, .26); a(.22, 1.05); a(.14, 1.18); a(.1, 1.3); a(0, 1.3);
  pump.add(new THREE.Mesh(new THREE.LatheGeometry(prof, 64), steel));
  const mot = new THREE.Mesh(new THREE.CylinderGeometry(.245, .245, 1.05, 64, 1, true), blue); mot.position.y = -.5; pump.add(mot);
  for (let i = 0; i < 6; i++) { const r = new THREE.Mesh(new THREE.TorusGeometry(.225, .018, 10, 48), i % 2 ? gold : steel); r.rotation.x = Math.PI / 2; r.position.y = .35 + i * .13; pump.add(r); }
  const slotsG = new THREE.BoxGeometry(.03, .12, .02);
  for (let i = 0; i < 18; i++) { const an = i / 18 * Math.PI * 2, s = new THREE.Mesh(slotsG, std(0x334)); s.position.set(Math.cos(an) * .272, .18, Math.sin(an) * .272); s.rotation.y = -an; pump.add(s); }
  pump.traverse(o => o.castShadow = true);
  pump.position.set(BX, -5.55, FRONT + .2); world.add(pump);
  // glow halo around pump (it's working)
  const pumpGlow = new THREE.Mesh(new THREE.SphereGeometry(.9, 32, 16), new THREE.MeshBasicMaterial({ color: 0x3ee0ff, transparent: true, opacity: .12, blending: THREE.AdditiveBlending, depthWrite: false }));
  pumpGlow.position.copy(pump.position); world.add(pumpGlow);
  // power cable
  const cable = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([
    new THREE.Vector3(BX + .2, -5.9, FRONT + .3), new THREE.Vector3(BX + .25, -3, FRONT + .3), new THREE.Vector3(BX + .22, 1.6, FRONT - .2), new THREE.Vector3(BX + 1, 1.62, FRONT - .9)
  ]), 80, .025, 6), std(0x111111, { roughness: .6 })); world.add(cable);

  /* water paths (riser → delivery) with flowing shader */
  const flowU = { uTime: { value: 0 } };
  const flowMat = () => new THREE.ShaderMaterial({
    uniforms: flowU, transparent: true, depthWrite: false,
    vertexShader: 'varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }',
    fragmentShader: `uniform float uTime; varying vec2 vUv;
      void main(){ float s = fract(vUv.x*26. - uTime*1.8); float dash = smoothstep(.0,.25,s)*smoothstep(.8,.45,s);
        vec3 c = mix(vec3(.1,.55,1.), vec3(.7,.98,1.), dash);
        float edge = 1.-abs(vUv.y-.5)*2.; gl_FragColor = vec4(c, .55+.45*dash*edge); }`
  });
  const pipeMat = new THREE.MeshPhysicalMaterial({ color: 0xe8eef5, metalness: .1, roughness: .15, transparent: true, opacity: .32, depthWrite: false });
  const makeFlow = pts => {
    const curve = new THREE.CatmullRomCurve3(pts, false, 'catmullrom', .05);
    const g = new THREE.Group();
    g.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 160, .085, 12), pipeMat));
    g.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 160, .06, 10), flowMat()));
    world.add(g); return { g, curve };
  };
  const riserBase = [new THREE.Vector3(BX, -4.25, FRONT + .2), new THREE.Vector3(BX, 0, FRONT + .2), new THREE.Vector3(BX, 1.95, FRONT), new THREE.Vector3(BX + .25, 2.15, FRONT - .5)];
  const farm = makeFlow([...riserBase, new THREE.Vector3(BX + 1.2, 2.15, FRONT - .9), new THREE.Vector3(BX + 1.9, 2.0, FRONT - 1.2)]);
  const HX = 2.2, HZ = -.4;
  const home = makeFlow([...riserBase, new THREE.Vector3(BX + 1.5, 2.2, FRONT - .9), new THREE.Vector3(HX - .9, 2.25, HZ + .6), new THREE.Vector3(HX - .7, 3.9, HZ + .3), new THREE.Vector3(HX - .3, 4.0, HZ)]);

  /* Farm set: outlet spout, channel, crops */
  const farmSet = new THREE.Group(); world.add(farmSet);
  const OUT = new THREE.Vector3(BX + 1.9, 2.0, FRONT - 1.2);
  const channel = new THREE.Mesh(new THREE.BoxGeometry(4.2, .06, .36), new THREE.ShaderMaterial({
    uniforms: flowU,
    vertexShader: 'varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }',
    fragmentShader: `uniform float uTime; varying vec2 vUv; void main(){ float w=.5+.5*sin(vUv.x*60.-uTime*5.+sin(vUv.y*20.)*1.5);
      gl_FragColor=vec4(mix(vec3(.08,.45,.85),vec3(.65,.95,1.),w*w*.7),1.); }`
  }));
  channel.position.set(OUT.x + 1.95, 1.56, OUT.z - .1); farmSet.add(channel);
  const bank = new THREE.Mesh(new THREE.BoxGeometry(4.3, .08, .5), std(0x7a5534)); bank.position.set(channel.position.x, 1.54, channel.position.z); farmSet.add(bank);
  // crops: instanced stalks with leaves
  const cropG = new THREE.ConeGeometry(.11, .5, 5); cropG.translate(0, .25, 0);
  const crops = new THREE.InstancedMesh(cropG, std(0x3f9a3a), 120); crops.castShadow = true;
  const cropBase = [];
  let ci = 0;
  for (let r = 0; r < 5; r++) for (let c = 0; c < 24 && ci < 120; c++) {
    const x = OUT.x + .1 + c * .17, z = (r < 2 ? OUT.z - .55 - r * .38 : OUT.z + .35 + (r - 2) * .38);
    if (x > W / 2 - .15 || z > FRONT - .1 || z < -D / 2 + .1) continue;
    cropBase.push({ x, z, s: .7 + Math.random() * .6, ph: Math.random() * 6 }); ci++;
  }
  crops.count = cropBase.length; farmSet.add(crops);
  const dummy = new THREE.Object3D();
  // pouring water particles at the spout
  const PN = 260, pourG = new THREE.BufferGeometry(), pourP = new Float32Array(PN * 3), pourS = new Float32Array(PN);
  for (let i = 0; i < PN; i++) pourS[i] = Math.random();
  pourG.setAttribute('position', new THREE.BufferAttribute(pourP, 3));
  const pourM = new THREE.PointsMaterial({ color: 0x9be8ff, size: .06, transparent: true, opacity: .9, depthWrite: false, blending: THREE.AdditiveBlending });
  const pour = new THREE.Points(pourG, pourM); farmSet.add(pour);

  /* Home set: house with rooftop tank */
  const homeSet = new THREE.Group(); world.add(homeSet);
  const wallM = std(0xf3ead8, { roughness: .8 }), roofM = std(0xc0532f);
  const house = new THREE.Mesh(new THREE.BoxGeometry(1.8, 1.5, 1.6), wallM); house.position.set(HX, 2.27, HZ); house.castShadow = true; homeSet.add(house);
  const roof = new THREE.Mesh(new THREE.BoxGeometry(1.95, .12, 1.75), roofM); roof.position.set(HX, 3.07, HZ); homeSet.add(roof);
  const door = new THREE.Mesh(new THREE.BoxGeometry(.36, .7, .02), std(0x6d4b2c)); door.position.set(HX, 1.88, HZ + .81); homeSet.add(door);
  [-.55, .55].forEach(dx => { const w = new THREE.Mesh(new THREE.BoxGeometry(.34, .34, .02), new THREE.MeshStandardMaterial({ color: 0xffd36b, emissive: 0xffb02e, emissiveIntensity: .8 })); w.position.set(HX + dx, 2.45, HZ + .81); homeSet.add(w); });
  const tank = new THREE.Mesh(new THREE.CylinderGeometry(.42, .46, .75, 32), std(0x22303c, { roughness: .5 })); tank.position.set(HX - .1, 3.5, HZ); tank.castShadow = true; homeSet.add(tank);
  const tankLevel = new THREE.Mesh(new THREE.CylinderGeometry(.405, .405, 1, 32), new THREE.MeshBasicMaterial({ color: 0x3ee0ff, transparent: true, opacity: .55 }));
  tankLevel.position.set(HX - .1, 3.15, HZ + .001); homeSet.add(tankLevel);
  const tap = new THREE.Mesh(new THREE.TorusGeometry(.12, .03, 8, 24, Math.PI), steel); tap.position.set(HX + .9, 2.0, HZ + .4); tap.rotation.y = Math.PI / 2; homeSet.add(tap);

  /* aquifer bubbles drawn toward the pump intake */
  const BN = mobile ? 160 : 320, bG = new THREE.BufferGeometry(), bP = new Float32Array(BN * 3), bS = new Float32Array(BN);
  for (let i = 0; i < BN; i++) bS[i] = Math.random();
  bG.setAttribute('position', new THREE.BufferAttribute(bP, 3));
  const bubbles = new THREE.Points(bG, new THREE.PointsMaterial({ color: 0xbff4ff, size: .045, transparent: true, opacity: .8, depthWrite: false, blending: THREE.AdditiveBlending }));
  world.add(bubbles);

  /* sun disk + soft clouds behind */
  const sunDisk = new THREE.Mesh(new THREE.CircleGeometry(.6, 48), new THREE.MeshBasicMaterial({ color: 0xffd36b, transparent: true, opacity: .9 }));
  sunDisk.position.set(1.6, 4.6, -4); 
  const sunGlow = new THREE.Mesh(new THREE.CircleGeometry(1.6, 48), new THREE.MeshBasicMaterial({ color: 0xffb02e, transparent: true, opacity: .18, blending: THREE.AdditiveBlending, depthWrite: false }));
  sunGlow.position.copy(sunDisk.position).add(new THREE.Vector3(0, 0, -.01)); 

  /* HTML labels pinned to 3D anchors */
  const labelsBox = document.getElementById('heroLabels');
  const anchors = [
    { el: null, p: new THREE.Vector3(W / 2 - .3, -5.6, FRONT), txt: 'Aquifer', sub: 'groundwater zone' },
    { el: null, p: pump.position.clone().add(new THREE.Vector3(.35, 0, .2)), txt: 'Submersible pump', sub: 'works fully under water' },
    { el: null, p: new THREE.Vector3(BX + .1, -1.2, FRONT), txt: 'Riser pipe', sub: 'lifts water to the surface' },
    { el: null, p: new THREE.Vector3(W / 2 - .6, 1.85, OUT.z - .1), txt: 'Field irrigation', sub: 'agriculture', mode: 'farm' },
    { el: null, p: new THREE.Vector3(HX - .1, 4.0, HZ), txt: 'Overhead tank', sub: 'domestic supply', mode: 'home' }
  ];
  if (labelsBox) anchors.forEach(a => { const d = document.createElement('div'); d.className = 'h3-label'; d.innerHTML = `<b>${a.txt}</b><small>${a.sub}</small>`; labelsBox.appendChild(d); a.el = d; });


  /* mode switch */
  let mode = 'farm', mix = 0; // 0 farm → 1 home
  const setMode = m => { mode = m; document.querySelectorAll('[data-scene]').forEach(b => b.classList.toggle('on', b.dataset.scene === m)); };
  document.querySelectorAll('[data-scene]').forEach(b => b.addEventListener('click', () => { userTouched = true; setMode(b.dataset.scene); }));
  if (!reduced) setInterval(() => { if (!userTouched) setMode(mode === 'farm' ? 'home' : 'farm'); }, 9000);

  /* interaction */
  let dragging = false, lx = 0, yaw = -.45, yawT = -.45, mxN = 0, myN = 0, scrollP = 0, userTouched = false;
  canvas.addEventListener('pointerdown', e => { dragging = true; userTouched = true; lx = e.clientX; canvas.setPointerCapture(e.pointerId); });
  canvas.addEventListener('pointermove', e => { if (dragging) { yawT = THREE.MathUtils.clamp(yawT + (e.clientX - lx) * .006, -1.1, .5); lx = e.clientX; } });
  canvas.addEventListener('pointerup', () => dragging = false);
  addEventListener('mousemove', e => { mxN = e.clientX / innerWidth - .5; myN = e.clientY / innerHeight - .5; });
  addEventListener('scroll', () => { scrollP = Math.min(scrollY / innerHeight, 1.2); }, { passive: true });

  let wide = true;
  const resize = () => {
    const w = canvas.clientWidth, h = canvas.clientHeight; renderer.setSize(w, h, false);
    camera.aspect = w / h; camera.updateProjectionMatrix(); wide = w > 960;
    world.position.set(wide ? 5.7 : 0, wide ? 0.6 : 0, 0);
    world.scale.setScalar(wide ? 1 : .72);
  };
  addEventListener('resize', resize); resize();

  let visible = true;
  new IntersectionObserver(([e]) => visible = e.isIntersecting).observe(canvas);
  const clock = new THREE.Clock();
  const v = new THREE.Vector3();
  let frames = 0, slow = 0, lastT = performance.now(), level = 0;

  (function loop() {
    requestAnimationFrame(loop);
    if (!visible) return;
    const now = performance.now(), dt = now - lastT; lastT = now; frames++;
    if (frames > 20) { slow = slow * .92 + (dt > 40 ? .08 : 0); if (slow > .6 && level < 2) { level++; renderer.setPixelRatio(level === 1 ? 1 : .75); renderer.shadowMap.enabled = false; resize(); slow = 0; } }
    const t = clock.getElapsedTime(), tt = reduced ? 0 : t;

    // camera: orbit-ish yaw + parallax, scroll dives toward the pump
    if (!dragging && !userTouched) yawT = -.45 + Math.sin(tt * .25) * .35;
    yaw += (yawT + mxN * .25 - yaw) * .06;
    world.rotation.y = yaw;
    const dive = wide ? THREE.MathUtils.smoothstep(scrollP, 0, 1) : 0;
    camera.position.set(wide ? 1 : 0, 3.2 - myN * .8 - dive * 5.5, (wide ? 27 : 25) - dive * 9);
    camera.lookAt(wide ? 1 : 0, (wide ? -1.6 : -1.3) - dive * 3.2, 0);

    flowU.uTime.value = tt; aquiferU.uTime.value = tt;
    mix += ((mode === 'home' ? 1 : 0) - mix) * Math.min(1, dt / 220);
    farmSet.visible = mix < .98; homeSet.visible = mix > .02;
    farmSet.scale.setScalar(Math.max(.001, 1 - mix)); homeSet.scale.setScalar(Math.max(.001, mix));
    farm.g.visible = mix < .5; home.g.visible = mix >= .5;

    // crops sway
    cropBase.forEach((c, i) => { dummy.position.set(c.x, 1.5, c.z); dummy.rotation.set(Math.sin(tt * 1.6 + c.ph) * .08, 0, Math.cos(tt * 1.3 + c.ph) * .08); dummy.scale.setScalar(c.s * (1 + Math.sin(tt * .6 + c.ph) * .03)); dummy.updateMatrix(); crops.setMatrixAt(i, dummy.matrix); });
    crops.instanceMatrix.needsUpdate = true;

    // pour arc
    for (let i = 0; i < PN; i++) { const k = (pourS[i] + tt * .9) % 1; pourP[i * 3] = OUT.x + k * .7 + Math.sin(i) * .02; pourP[i * 3 + 1] = OUT.y - k * k * .5; pourP[i * 3 + 2] = OUT.z - .1 + Math.cos(i * 3.1) * .05; }
    pourG.attributes.position.needsUpdate = true;
    // tank fills and drains gently
    const lvl = .35 + .3 * (.5 + .5 * Math.sin(tt * .5));
    tankLevel.scale.y = lvl; tankLevel.position.y = 3.13 + lvl / 2 - .35;

    // aquifer bubbles spiral into the intake
    for (let i = 0; i < BN; i++) {
      const k = (bS[i] + tt * .12) % 1, ang = bS[i] * 40 + k * 6, r = (1 - k) * (1.2 + bS[i] * 2.4);
      bP[i * 3] = BX + Math.cos(ang) * r; bP[i * 3 + 1] = -5.4 + Math.sin(ang * 1.7) * (1 - k) * .8; bP[i * 3 + 2] = FRONT + .1 + Math.min(.2, Math.sin(ang) * r * .1) + .03;
    }
    bG.attributes.position.needsUpdate = true;
    pumpGlow.material.opacity = .1 + .06 * Math.sin(tt * 3); pumpGlow.scale.setScalar(1 + .08 * Math.sin(tt * 3));
    cyan.intensity = 14 + 6 * Math.sin(tt * 2);

    renderer.render(scene, camera);

    // labels
    if (labelsBox) {
      const r = canvas.getBoundingClientRect();
      anchors.forEach(a => {
        v.copy(a.p); world.localToWorld(v); v.project(camera);
        const on = v.z < 1 && Math.abs(v.x) < 1.05 && Math.abs(v.y) < 1.05 && (!a.mode || (a.mode === 'home' ? mix > .6 : mix < .4)) && scrollP < .6;
        a.el.style.transform = `translate(${Math.min((v.x * .5 + .5) * r.width, r.width - (a.el.offsetWidth || 120) - 14)}px,${(-v.y * .5 + .5) * r.height}px)`;
        a.el.classList.toggle('on', on);
      });
    }
  })();
}
