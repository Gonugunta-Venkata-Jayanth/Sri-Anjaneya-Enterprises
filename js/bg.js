/* Interactive deep-water background: drifting light, god rays, plankton that dodge the cursor, ripples on move/click. 2D canvas, no WebGL needed. */
(() => {
  const c = document.getElementById('bgFx'); if (!c) return;
  const x = c.getContext('2d');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const small = matchMedia('(max-width: 760px)').matches;
  let W, H, dpr = Math.min(devicePixelRatio || 1, 1.5);
  const resize = () => { W = innerWidth; H = innerHeight; c.width = W * dpr; c.height = H * dpr; x.setTransform(dpr, 0, 0, dpr, 0, 0); };
  resize(); addEventListener('resize', resize);

  const N = small ? 55 : 120;
  const parts = Array.from({ length: N }, () => ({ x: Math.random() * innerWidth, y: Math.random() * innerHeight, z: .3 + Math.random() * .9, r: .6 + Math.random() * 2.2, vx: 0, vy: 0, h: Math.random() < .18 ? 42 : 190 }));
  const blobs = [
    { h: 200, s: 90, l: 45, a: .22, r: .55, sp: .00011, ph: 0 },
    { h: 215, s: 85, l: 40, a: .2, r: .65, sp: .00008, ph: 2 },
    { h: 185, s: 95, l: 50, a: .14, r: .45, sp: .00014, ph: 4 },
    { h: 42, s: 95, l: 55, a: .07, r: .35, sp: .0001, ph: 1 }
  ];
  const ripples = [];
  let mx = -999, my = -999, lastRip = 0, scrollY0 = scrollY, sv = 0;
  addEventListener('pointermove', e => {
    mx = e.clientX; my = e.clientY;
    const t = performance.now(); if (t - lastRip > 90) { lastRip = t; ripples.push({ x: mx, y: my, r: 4, a: .28, w: 1 }); if (ripples.length > 28) ripples.shift(); }
  }, { passive: true });
  addEventListener('pointerdown', e => { for (let i = 0; i < 3; i++) ripples.push({ x: e.clientX, y: e.clientY, r: 2 + i * 14, a: .55 - i * .12, w: 2 }); }, { passive: true });
  addEventListener('scroll', () => { sv += (scrollY - scrollY0) * .04; scrollY0 = scrollY; }, { passive: true });

  let running = true; document.addEventListener('visibilitychange', () => { running = !document.hidden; if (running) requestAnimationFrame(frame); });

  function frame(t) {
    if (!running) return;
    x.clearRect(0, 0, W, H);
    // drifting light pools
    x.globalCompositeOperation = 'lighter';
    blobs.forEach((b, i) => {
      const cx = W * (.5 + .38 * Math.sin(t * b.sp + b.ph)), cy = H * (.5 + .34 * Math.cos(t * b.sp * 1.3 + b.ph)) - (scrollY * (.03 + i * .01)) % H;
      const R = Math.max(W, H) * b.r, g = x.createRadialGradient(cx, cy, 0, cx, cy, R);
      g.addColorStop(0, `hsla(${b.h},${b.s}%,${b.l}%,${b.a})`); g.addColorStop(1, 'hsla(210,80%,10%,0)');
      x.fillStyle = g; x.fillRect(0, 0, W, H);
    });
    // god rays
    for (let i = 0; i < 6; i++) {
      const sx = W * (i / 5) + Math.sin(t * .0003 + i) * 80, w = 60 + 50 * Math.sin(i * 1.7 + t * .0005);
      const g = x.createLinearGradient(0, 0, 0, H * .9); g.addColorStop(0, 'rgba(140,220,255,.06)'); g.addColorStop(1, 'rgba(140,220,255,0)');
      x.fillStyle = g; x.beginPath(); x.moveTo(sx - w, -10); x.lineTo(sx + w, -10); x.lineTo(sx + w * 3 + 160, H); x.lineTo(sx - w + 160, H); x.closePath(); x.fill();
    }
    // plankton / bubbles
    sv *= .92;
    parts.forEach(p => {
      const dx = p.x - mx, dy = p.y - my, d2 = dx * dx + dy * dy;
      if (d2 < 22000) { const f = (22000 - d2) / 22000 * .9; p.vx += dx / Math.sqrt(d2 + 1) * f; p.vy += dy / Math.sqrt(d2 + 1) * f; }
      p.vx *= .93; p.vy *= .93;
      p.x += p.vx + Math.sin(t * .001 + p.y * .01) * .15 * p.z; p.y += p.vy - .25 * p.z - sv * p.z;
      if (p.y < -10) { p.y = H + 10; p.x = Math.random() * W; } if (p.y > H + 12) p.y = -8; if (p.x < -10) p.x = W + 8; if (p.x > W + 10) p.x = -8;
      const a = .25 + .5 * p.z * (.6 + .4 * Math.sin(t * .002 + p.x));
      x.fillStyle = `hsla(${p.h},95%,${p.h === 42 ? 62 : 75}%,${a * .8})`;
      x.beginPath(); x.arc(p.x, p.y, p.r * p.z, 0, 6.283); x.fill();
    });
    // ripples
    x.globalCompositeOperation = 'source-over';
    for (let i = ripples.length - 1; i >= 0; i--) {
      const r = ripples[i]; r.r += 1.6 + r.w; r.a *= .955;
      if (r.a < .01) { ripples.splice(i, 1); continue; }
      x.strokeStyle = `rgba(120,230,255,${r.a})`; x.lineWidth = r.w; x.beginPath(); x.ellipse(r.x, r.y, r.r, r.r * .55, 0, 0, 6.283); x.stroke();
    }
    // cursor glow
    if (mx > -900) { const g = x.createRadialGradient(mx, my, 0, mx, my, 220); g.addColorStop(0, 'rgba(62,224,255,.10)'); g.addColorStop(1, 'rgba(62,224,255,0)'); x.fillStyle = g; x.fillRect(mx - 220, my - 220, 440, 440); }
    if (!reduced) requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
})();
