// src/builders/buildRectCloth.js
import * as THREE from 'three';

/**
 * params: {
 *   table: {...},
 *   meas: { topY:number, sizeXZ:{x:number, z:number} },
 *   cloth: { drop:number, waveAmp?:number, waveFreq?:number }
 * }
 */
export function buildRectCloth(params) {
  const { meas = {}, cloth = {} } = params || {};
  const topY = (meas.topY ?? 75) + 0.6;
  const W = Math.max(1, meas.sizeXZ?.x ?? 100);
  const L = Math.max(1, meas.sizeXZ?.z ?? 180);

  const drop = Math.max(0, Number(cloth.drop ?? 15));
  const waveAmp  = Number.isFinite(cloth.waveAmp) ? cloth.waveAmp : 1.0;
  const waveFreq = Number.isFinite(cloth.waveFreq) ? cloth.waveFreq : 24;

  const group = new THREE.Group();
  group.name = 'RectCloth';

  // 1) 상판(사각)
  const topGeom = new THREE.PlaneGeometry(W, L, 1, 1);
  const topMat  = new THREE.MeshStandardMaterial({ metalness: 0.05, roughness: 0.85 });
  const top = new THREE.Mesh(topGeom, topMat);
  top.rotation.x = -Math.PI / 2;
  top.position.y = topY;
  top.castShadow = top.receiveShadow = true;
  group.add(top);

  const edges = new THREE.EdgesGeometry(topGeom);
  const line  = new THREE.LineSegments(edges, new THREE.LineBasicMaterial());
  line.rotation.x = -Math.PI / 2;
  line.position.y = topY + 0.001;
  group.add(line);

  // 2) 스커트 띠
  const segPerEdge = 24;
  const x0 =  W / 2, x1 = -W / 2;
  const z0 =  L / 2, z1 = -L / 2;

  const path = [];
  for (let i = 0; i <= segPerEdge; i++) path.push(new THREE.Vector2(THREE.MathUtils.lerp(x1, x0, i/segPerEdge), z0));
  for (let i = 1; i <= segPerEdge; i++) path.push(new THREE.Vector2(x0, THREE.MathUtils.lerp(z0, z1, i/segPerEdge)));
  for (let i = 1; i <= segPerEdge; i++) path.push(new THREE.Vector2(THREE.MathUtils.lerp(x0, x1, i/segPerEdge), z1));
  for (let i = 1; i <  segPerEdge; i++) path.push(new THREE.Vector2(x1, THREE.MathUtils.lerp(z1, z0, i/segPerEdge)));
  const N = path.length;

  const pos = new Float32Array(N * 2 * 3);
  const idx = [];

  // top ring
  for (let i = 0; i < N; i++) {
    const p = path[i];
    pos[i*3+0] = p.x;
    pos[i*3+1] = topY;
    pos[i*3+2] = p.y;
  }
  // bottom ring (웨이브)
  for (let i = 0; i < N; i++) {
    const p = path[i];
    const t = i / N;
    const prev = path[(i-1+N)%N], next = path[(i+1)%N];
    const tx = next.x - prev.x, tz = next.y - prev.y;
    const nlen = Math.hypot(tx, tz) || 1;
    const nx = -tz / nlen, nz = tx / nlen;
    const offset = waveAmp * Math.sin(waveFreq * t * Math.PI * 2) * 0.7;

    const base = N + i;
    pos[base*3+0] = p.x + nx * offset;
    pos[base*3+1] = topY - drop;
    pos[base*3+2] = p.y + nz * offset;
  }

  for (let i = 0; i < N; i++) {
    const a = i, b = (i+1)%N, c = N+i, d = N+((i+1)%N);
    idx.push(a,c,b,  b,c,d);
  }

  const geom = new THREE.BufferGeometry();
  geom.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geom.setIndex(idx);
  geom.computeVertexNormals();

  const mat = new THREE.MeshStandardMaterial({ metalness: 0.05, roughness: 0.9, side: THREE.DoubleSide });
  const skirt = new THREE.Mesh(geom, mat);
  skirt.castShadow = skirt.receiveShadow = true;
  group.add(skirt);

  return group;
}
