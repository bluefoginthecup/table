// src/builders_v2/buildRoundCloth_v2.js
import * as THREE from "three";
import { edgePathCircle, effectiveDrop, smooth01 } from "./clothUtils_v2.js";

/**
 * params: {
 *   table: { shape:'rect'|'round', ... },
 *   meas:  { topY:number, sizeXZ:{x:number, z:number} },
 *   cloth: { d:number, drop:number, waveAmp?:number, waveFreq?:number }
 * }
 */
export function buildRoundCloth(params) {
  const { table = {}, meas = {}, cloth = {} } = params || {};
  const topY = (meas.topY ?? 75) + 0.6; // 테이블 상판 + ε
  const d = Number(cloth.d ?? 180);
  const r = Math.max(1, d / 2);
  const baseDrop = Math.max(0, Number(cloth.drop ?? 15));

  const waveAmp = Number.isFinite(cloth.waveAmp) ? cloth.waveAmp : 1.2;
  const waveFreq = Number.isFinite(cloth.waveFreq) ? cloth.waveFreq : 10;

  const group = new THREE.Group();
  group.name = "RoundCloth_v2";

  // 1) 상판(원형)은 "보의 완성 지름" 그대로
  const topGeom = new THREE.CircleGeometry(r, 96);
  const topMat = new THREE.MeshStandardMaterial({ metalness: 0.05, roughness: 0.85 });
  const top = new THREE.Mesh(topGeom, topMat);
  top.rotation.x = -Math.PI / 2;
  top.position.y = topY;
  top.castShadow = top.receiveShadow = true;
  group.add(top);

  const edges = new THREE.EdgesGeometry(topGeom);
  const line = new THREE.LineSegments(edges, new THREE.LineBasicMaterial());
  line.rotation.x = -Math.PI / 2;
  line.position.y = topY + 0.001;
  group.add(line);

  // 2) 스커트: 보 외곽을 따라 가변 드롭
  const path = edgePathCircle(r, 96);
  const N = path.length;

  const pos = new Float32Array(N * 2 * 3);
  const idx = [];

  // 상단 링: 약간 내려서 지오메트리 접합선 z-fighting 방지
  const seamDown = 0.2;

  for (let i = 0; i < N; i++) {
    const { x, z, nx, nz, t } = path[i];

    // 가변 드롭: 테이블과의 여유거리 기반
    const h = effectiveDrop(table, meas, x, z, baseDrop, /*threshold*/ 12);

    // 상단
    pos[i * 3 + 0] = x;
    pos[i * 3 + 1] = topY - seamDown; // 살짝만 아래
    pos[i * 3 + 2] = z;

    // 하단 + 웨이브(하단 쪽만)
    const amp = waveAmp * (h / Math.max(baseDrop || 1, 1)) * 0.8;
    const phase = t * Math.PI * 2 * waveFreq;
    const outward = amp * Math.sin(phase);

    const bi = N + i;
    pos[bi * 3 + 0] = x + nx * outward;
    pos[bi * 3 + 1] = topY - h;
    pos[bi * 3 + 2] = z + nz * outward;
  }

  for (let i = 0; i < N; i++) {
    const a = i, b = (i + 1) % N, c = N + i, d2 = N + ((i + 1) % N);
    idx.push(a, c, b, b, c, d2);
  }

  const geom = new THREE.BufferGeometry();
  geom.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  geom.setIndex(idx);
  geom.computeVertexNormals();

  const mat = new THREE.MeshStandardMaterial({
    metalness: 0.05, roughness: 0.9, side: THREE.DoubleSide
  });
  const skirt = new THREE.Mesh(geom, mat);
  skirt.castShadow = skirt.receiveShadow = true;
  group.add(skirt);

  return group;
}
