import * as THREE from 'https://esm.sh/three@0.160.0';

/**
 * Build cloth grid for different shapes.
 * Supports:
 *  - 'rect'   : rectangular panel (masking grid)
 *  - 'round'  : circular panel (masking grid)
 *  - 'runner' : table runner strip (exact boundary sampling; no clipping)
 */
export function buildGrid(shape, res, topY){
  // --- normalize: accept either legacy shape-object or THREE.Shape ---
  shape = normalizeShape(shape);

  // --- RUNNER: exact boundary sampling, no clipping ---
  if (shape.shape === 'runner') {
    const W = shape.params.width;
    const L = shape.params.length;
    const cap = shape.params.cap || 'hex';                 // 'hex' | 'round'
    const tipLenRatio = (shape.params.tipLenRatio ?? 0.25);

    const nx = res, nz = res;                              // u=x(폭), v=z(길이)
    const hw = W * 0.5;                                    // half width
    const hl = L * 0.5;                                    // half length
    const tip = Math.min(hl, L * tipLenRatio * 0.5);       // 각 끝에 할당되는 팁 길이
    const dz = L / Math.max(1, (nz - 1));

    // half width function w(z)
    
    function halfWidthAt(z){
      const az = Math.abs(z);
      if (cap === 'rect') {
  return hw; // 끝까지 일정한 폭
} else if (cap === 'round') {
        // semicircle end caps, radius = hw
        const core = hl - hw;              // central constant-width half-length
        if (az <= core) return hw;         // middle strip
        const local = az - core;           // 0..hw
        if (local >= hw) return 0;
        return Math.sqrt(Math.max(0, hw*hw - local*local)); // x = √(r² - y²)
      } else {
        // linear taper (triangular tip)
        if (az <= hl - tip) return hw;     // central strip
        const t = (hl - az) / tip;         // 1 → 0
        return Math.max(0, hw * t);
      }
    }

    // buffers
    const pos = new Float32Array(nx * nz * 3);
    const prev = new Float32Array(nx * nz * 3);
    const invm = new Float32Array(nx * nz);
    const mask = new Uint8Array(nx * nz); // all ones

    // sample z in [-hl,+hl], x in [-w(z), +w(z)]
    let k = 0;
    for (let iz = 0; iz < nz; iz++){
      const z = -hl + iz * dz;
      const w = halfWidthAt(z);
      for (let ix = 0; ix < nx; ix++){
        const u = (nx === 1) ? 0.5 : ix / (nx - 1); // 0..1
        const x = (w === 0) ? 0 : (-w + u * (2*w));
        const i3 = k*3;
        pos[i3+0]=x; pos[i3+1]=topY; pos[i3+2]=z;
        prev[i3+0]=x; prev[i3+1]=topY; prev[i3+2]=z;
        invm[k] = 1.0; mask[k] = 1; k++;
      }
    }

    const indices = [];
    for (let iz=0; iz<nz-1; iz++){
      for (let ix=0; ix<nx-1; ix++){
        const a = iz*nx + ix;
        const b = a+1;
        const c = a+nx;
        const d = c+1;
        indices.push(a,b,c, b,d,c);
      }
    }

    const geom = new THREE.BufferGeometry();
    geom.setAttribute('position', new THREE.BufferAttribute(pos,3));
    geom.setIndex(indices);
    geom.computeVertexNormals();
    return { nx, nz, pos, prev, invm, mask, geometry: geom, shape };
  }

  // --- RECT / ROUND (masking grid) ---
  let minx, maxx, minz, maxz;
  if (shape.shape==='rect'){
    const W = shape.params.width, L = shape.params.length;
    minx = -W*0.5; maxx = W*0.5;
    minz = -L*0.5; maxz = L*0.5;
  } else if (shape.shape==='round'){
    const R = shape.params.radius;
    minx = -R; maxx = R; minz = -R; maxz = R;
  } else {
    // fallback to rect bounds if unknown
    const W = shape.params.width ?? 1.0;
    const L = shape.params.length ?? 1.0;
    minx = -W*0.5; maxx = W*0.5;
    minz = -L*0.5; maxz = L*0.5;
  }

  const nx = res, nz = res;
  const dx = (maxx-minx)/(nx-1);
  const dz = (maxz-minz)/(nz-1);

  const pos = new Float32Array(nx*nz*3);
  const prev = new Float32Array(nx*nz*3);
  const invm = new Float32Array(nx*nz);
  const mask = new Uint8Array(nx*nz);

  function insideMask(x,z){
    if (shape.shape==='rect') return true;
    if (shape.shape==='round'){
      const R = shape.params.radius;
      return (x*x + z*z <= R*R + 1e-9);
    }
    return true;
  }

  let i=0;
  for (let iz=0; iz<nz; iz++){
    for (let ix=0; ix<nx; ix++){
      const x = minx + ix*dx;
      const z = minz + iz*dz;
      const inside = insideMask(x,z);
      mask[i] = inside?1:0;
      const idx3 = i*3;
      pos[idx3+0]=x; pos[idx3+1]=topY; pos[idx3+2]=z;
      prev[idx3+0]=x; prev[idx3+1]=topY; prev[idx3+2]=z;
      invm[i] = inside? 1.0 : 0.0;
      i++;
    }
  }

  const indices = [];
  for (let iz=0; iz<nz-1; iz++){
    for (let ix=0; ix<nx-1; ix++){
      const a = iz*nx + ix;
      const b = a+1;
      const c = a+nx;
      const d = c+1;
      if (mask[a]&&mask[b]&&mask[c]) indices.push(a,b,c);
      if (mask[b]&&mask[c]&&mask[d]) indices.push(b,d,c);
    }
  }

  const geom = new THREE.BufferGeometry();
  geom.setAttribute('position', new THREE.BufferAttribute(pos,3));
  geom.setIndex(indices);
  geom.computeVertexNormals();
  return { nx, nz, pos, prev, invm, mask, geometry: geom, shape };
}

/* ---------------- helpers ---------------- */

function normalizeShape(input){
  // already in legacy format
  if (input && input.shape && input.params) return input;

  // THREE.Shape? (has getPoints)
  if (input && typeof input.getPoints === 'function') {
    const pts = input.getPoints(64);
    if (!pts || pts.length === 0) {
      // minimal safe fallback
      return { shape:'rect', params:{ width:1, length:1 } };
    }

    // compute bbox
    let minX=Infinity, maxX=-Infinity, minY=Infinity, maxY=-Infinity;
    let cx=0, cy=0;
    for (const p of pts){ 
      if (p.x<minX) minX=p.x; if (p.x>maxX) maxX=p.x;
      if (p.y<minY) minY=p.y; if (p.y>maxY) maxY=p.y;
      cx += p.x; cy += p.y;
    }
    cx /= pts.length; cy /= pts.length;
    const W = maxX - minX;
    const H = maxY - minY;

    // try circle detection: radius variance small ⇒ round
    let meanR=0;
    const rs = [];
    for (const p of pts){
      const r = Math.hypot(p.x - cx, p.y - cy);
      rs.push(r); meanR += r;
    }
    meanR /= rs.length;
    let varR=0;
    for (const r of rs) varR += (r - meanR)*(r - meanR);
    varR /= rs.length;
    const relStd = Math.sqrt(varR) / (meanR || 1);

    if (Math.abs(W - H) <= 1e-3 && relStd < 0.02) {
      // round
      return { shape:'round', params:{ radius: (W*0.5) } };
    }
    // else treat as rect-like (rounded 코너는 마스킹에서는 동일)
    return { shape:'rect', params:{ width: W, length: H } };
  }

  // totally unknown → safe rect 1x1
  return { shape:'rect', params:{ width:1, length:1 } };
}