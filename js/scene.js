/* Hero 3D scene: a procedural submersible pump inside a column of rising bubbles. */
import * as THREE from 'three';

const canvas = document.getElementById('heroCanvas');
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const mobile = innerWidth < 760;

const fallback = () => { document.querySelector('.hero').classList.add('no3d'); };
let renderer;
try { renderer = new THREE.WebGLRenderer({ canvas, antialias: !mobile, alpha: true, powerPreference: 'high-performance', failIfMajorPerformanceCaveat: true }); }
catch (e) { renderer = null; fallback(); }

if (renderer) {
  renderer.setPixelRatio(Math.min(devicePixelRatio, mobile ? 1.5 : 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.15;

  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x04101f, 0.045);
  const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);
  camera.position.set(0, 0, 13);

  /* environment for metal reflections */
  const pmrem = new THREE.PMREMGenerator(renderer);
  const envScene = new THREE.Scene();
  const envGeo = new THREE.SphereGeometry(20, 32, 16);
  const envMat = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    uniforms: {},
    vertexShader: 'varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.); }',
    fragmentShader: `varying vec3 vP; void main(){ float y = vP.y*.5+.5;
      vec3 c = mix(vec3(.01,.04,.09), vec3(.15,.55,.9), smoothstep(.2,1.,y));
      c += vec3(1.,.75,.25)*smoothstep(.85,1.,dot(vP, normalize(vec3(.6,.5,.6))))*2.;
      c += vec3(.4,.9,1.)*smoothstep(.9,1.,dot(vP, normalize(vec3(-.7,.2,.4))))*1.5;
      gl_FragColor = vec4(c,1.); }`
  });
  envScene.add(new THREE.Mesh(envGeo, envMat));
  scene.environment = pmrem.fromScene(envScene, 0.02).texture;

  /* lights */
  scene.add(new THREE.AmbientLight(0x6fa8ff, 0.35));
  const key = new THREE.DirectionalLight(0xffe2a8, 2.4); key.position.set(5, 6, 6); scene.add(key);
  const rim = new THREE.PointLight(0x3ee0ff, 40, 30); rim.position.set(-5, -2, 3); scene.add(rim);
  const gold = new THREE.PointLight(0xf5b524, 25, 20); gold.position.set(3, -4, 2); scene.add(gold);

  /* pump model */
  const pump = new THREE.Group();
  const steel = new THREE.MeshPhysicalMaterial({ color: 0xd9e2ec, metalness: 1, roughness: 0.22, clearcoat: .6, clearcoatRoughness: .2 });
  const darkSteel = new THREE.MeshPhysicalMaterial({ color: 0x5f6f82, metalness: 1, roughness: 0.35 });
  const goldMat = new THREE.MeshPhysicalMaterial({ color: 0xf5b524, metalness: 1, roughness: 0.25, clearcoat: 1 });
  const blueMat = new THREE.MeshPhysicalMaterial({ color: 0x1e5bd8, metalness: .4, roughness: .3, clearcoat: 1 });

  // body profile (lathe)
  const prof = [];
  const add = (r, y) => prof.push(new THREE.Vector2(r, y));
  add(0, -3.6); add(.55, -3.6); add(.62, -3.45); add(.62, -1.2); add(.66, -1.1); add(.66, -.95); add(.58, -.85);
  add(.58, 2.5); add(.62, 2.6); add(.62, 2.9); add(.4, 3.1); add(.3, 3.4); add(.3, 3.7); add(0, 3.7);
  const body = new THREE.Mesh(new THREE.LatheGeometry(prof, 96), steel); pump.add(body);

  // motor section tint
  const motor = new THREE.Mesh(new THREE.CylinderGeometry(.635, .635, 2.3, 96, 1, true), blueMat);
  motor.position.y = -2.3; pump.add(motor);

  // stage rings (impeller bowls)
  for (let i = 0; i < 7; i++) {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(.6, .045, 16, 96), i % 3 === 0 ? goldMat : darkSteel);
    ring.rotation.x = Math.PI / 2; ring.position.y = -.4 + i * .42; pump.add(ring);
  }
  // inlet screen slots
  const slotGeo = new THREE.BoxGeometry(.06, .32, .05);
  for (let i = 0; i < 24; i++) {
    const a = i / 24 * Math.PI * 2, s = new THREE.Mesh(slotGeo, darkSteel);
    s.position.set(Math.cos(a) * .665, -1.02, Math.sin(a) * .665); s.rotation.y = -a; pump.add(s);
  }
  // cable guard strip
  const guard = new THREE.Mesh(new THREE.BoxGeometry(.14, 3.4, .08), darkSteel);
  guard.position.set(0, .9, .62); pump.add(guard);
  // delivery head
  const head = new THREE.Mesh(new THREE.CylinderGeometry(.22, .22, .5, 48), goldMat); head.position.y = 3.95; pump.add(head);
  const thread = new THREE.Mesh(new THREE.TorusGeometry(.23, .03, 12, 48), darkSteel); thread.rotation.x = Math.PI / 2; thread.position.y = 4.1; pump.add(thread);
  // gold brand band
  const band = new THREE.Mesh(new THREE.CylinderGeometry(.6, .6, .35, 96, 1, true), goldMat); band.position.y = 1.6; pump.add(band);

  pump.rotation.z = -0.32; pump.rotation.x = 0.12;
  const pumpWrap = new THREE.Group(); pumpWrap.add(pump); scene.add(pumpWrap);

  /* glowing water ring */
  const ringMat = new THREE.MeshBasicMaterial({ color: 0x3ee0ff, transparent: true, opacity: .35, blending: THREE.AdditiveBlending });
  const halo = new THREE.Mesh(new THREE.TorusGeometry(2.6, .015, 8, 200), ringMat); halo.rotation.x = Math.PI / 2.3; pumpWrap.add(halo);
  const halo2 = halo.clone(); halo2.material = ringMat.clone(); halo2.material.color.set(0xf5b524); halo2.scale.setScalar(1.25); halo2.rotation.x = Math.PI / 1.8; pumpWrap.add(halo2);

  /* bubbles */
  const N = mobile ? 900 : 2200;
  const bGeo = new THREE.BufferGeometry();
  const pos = new Float32Array(N * 3), seed = new Float32Array(N);
  for (let i = 0; i < N; i++) {
    pos[i * 3] = (Math.random() - .5) * 22; pos[i * 3 + 1] = (Math.random() - .5) * 16; pos[i * 3 + 2] = (Math.random() - .5) * 12 - 2; seed[i] = Math.random();
  }
  bGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3)); bGeo.setAttribute('seed', new THREE.BufferAttribute(seed, 1));
  const bMat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    uniforms: { uTime: { value: 0 }, uPR: { value: renderer.getPixelRatio() } },
    vertexShader: `attribute float seed; uniform float uTime; uniform float uPR; varying float vA;
      void main(){ vec3 p = position; float sp = .4 + seed*1.2;
        p.y = mod(p.y + uTime*sp + 8., 16.) - 8.;
        p.x += sin(uTime*1.5 + seed*30.)*.25;
        vec4 mv = modelViewMatrix*vec4(p,1.);
        gl_PointSize = (2. + seed*7.) * uPR * (10. / -mv.z);
        vA = .25 + seed*.6; gl_Position = projectionMatrix*mv; }`,
    fragmentShader: `varying float vA; void main(){ vec2 c = gl_PointCoord-.5; float d = length(c);
      float ring = smoothstep(.5,.38,d) - smoothstep(.36,.2,d)*.7; if(ring<=0.) discard;
      gl_FragColor = vec4(mix(vec3(.25,.85,1.), vec3(1.), .4), ring*vA); }`
  });
  const bubbles = new THREE.Points(bGeo, bMat); scene.add(bubbles);

  /* caustic light rays */
  const rayMat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
    uniforms: { uTime: { value: 0 } },
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.); }',
    fragmentShader: `uniform float uTime; varying vec2 vUv;
      void main(){ float r = 0.;
        for(int i=0;i<5;i++){ float fi=float(i); r += smoothstep(.04,0., abs(fract(vUv.x*3. + sin(uTime*.2+fi)*.15 + fi*.21)-.5)-.02); }
        float a = r * smoothstep(0.,.9,vUv.y) * .05;
        gl_FragColor = vec4(.4,.85,1., a); }`
  });
  const rays = new THREE.Mesh(new THREE.PlaneGeometry(26, 18), rayMat); rays.position.z = -6; rays.rotation.z = .25; scene.add(rays);

  /* interaction */
  let dragging = false, lx = 0, vel = 0.004, spin = 0, mxN = 0, myN = 0, scrollP = 0;
  canvas.addEventListener('pointerdown', e => { dragging = true; lx = e.clientX; canvas.setPointerCapture(e.pointerId); });
  canvas.addEventListener('pointermove', e => { if (dragging) { vel = (e.clientX - lx) * 0.0025; lx = e.clientX; } });
  canvas.addEventListener('pointerup', () => dragging = false);
  addEventListener('mousemove', e => { mxN = e.clientX / innerWidth - .5; myN = e.clientY / innerHeight - .5; });
  addEventListener('scroll', () => { scrollP = Math.min(scrollY / innerHeight, 1.2); }, { passive: true });

  const resize = () => {
    const w = canvas.clientWidth, h = canvas.clientHeight; renderer.setSize(w, h, false);
    camera.aspect = w / h; camera.updateProjectionMatrix();
    pumpWrap.position.x = w > 960 ? 3.4 : 0; pumpWrap.position.y = w > 960 ? 0 : -1.6;
    pumpWrap.scale.setScalar(w > 960 ? 1 : .75);
  };
  addEventListener('resize', resize); resize();

  let visible = true;
  new IntersectionObserver(([e]) => visible = e.isIntersecting).observe(canvas);
  const clock = new THREE.Clock();
  // adaptive quality: drop resolution, then frame rate, on slow devices
  let frames = 0, slowAcc = 0, level = 0, skip = 0, lastT = performance.now();
  const degrade = () => {
    level++;
    if (level === 1) renderer.setPixelRatio(1);
    else if (level === 2) { renderer.setPixelRatio(.7); bubbles.geometry.setDrawRange(0, N / 2); }
    else if (level >= 3) skip = Math.min(skip + 1, 3);
    resize(); bMat.uniforms.uPR.value = renderer.getPixelRatio();
  };
  let dead = false;
  (function loop() {
    if (dead) return;
    requestAnimationFrame(loop);
    if (!visible) return;
    if (skip && (frames % (skip + 1))) { frames++; return; }
    const now = performance.now(), dt = now - lastT; lastT = now; frames++;
    if (frames > 10) { slowAcc = slowAcc * .9 + (dt > 34 ? 1 : 0) * .1; if (slowAcc > .6 && level < 6) { degrade(); slowAcc = 0; } }
    const t = clock.getElapsedTime();
    if (!dragging) vel += ((reduced ? 0 : 0.006) - vel) * 0.03;
    spin += vel; pump.rotation.y = spin;
    pumpWrap.position.y += ((innerWidth > 960 ? 0 : -1.6) + Math.sin(t * .8) * .15 - scrollP * 2 - pumpWrap.position.y) * .08;
    pumpWrap.rotation.x += (myN * .25 - pumpWrap.rotation.x) * .05;
    pumpWrap.rotation.y += (mxN * .4 - pumpWrap.rotation.y) * .05;
    halo.rotation.z = t * .3; halo2.rotation.z = -t * .2;
    camera.position.z = 13 + scrollP * 3;
    bMat.uniforms.uTime.value = t; rayMat.uniforms.uTime.value = t;
    rim.intensity = 35 + Math.sin(t * 2) * 8;
    const r0 = performance.now();
    renderer.render(scene, camera);
    if (performance.now() - r0 > 60 && level < 6) degrade();
    if (level >= 5 || (frames > 30 && performance.now() - r0 > 120)) { dead = true; renderer.dispose(); fallback(); }
  })();
}
