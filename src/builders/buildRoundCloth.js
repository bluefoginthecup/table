// src/builders/buildRoundCloth.js
import * as THREE from 'three';

/**
 * params: {
 *   table: {...},                    // 필요 없지만 인터페이스 유지
 *   meas: { topY:number, sizeXZ:{x:number, z:number} }, // updateScene에서 측정
 *   cloth: { drop:number, waveAmp?:number, waveFreq?:number }
 * }
 * - 상판은 테이블 지름만 사용(diameter).
 * - 스커트는 edge에서 drop만큼 수직 하강.
 */
export function buildRoundCloth(params) {
  const { meas = {}, cloth = {} } = params || {};
  const topY = (meas.topY ?? 75) + 0.6; // 테이블 상판 + ε
  const sizeX = Math.max(1, meas.sizeXZ?.x ?? 180);
  const sizeZ = Math.max(1, meas.sizeXZ?.z ?? 180);
  const radius = Math.max(1, Math.min(sizeX, sizeZ) / 2); // 원탁은 min(x,z)/2

  const drop = Math.max(0, Number(cloth.drop ?? 15));
  const waveAmp  = Number.isFinite(cloth.waveAmp) ? cloth.waveAmp : 1.2;
  const waveFreq = Number.isFinite(cloth.waveFreq) ? cloth.waveFreq : 10;

  const group = new THREE.Group();
  group.name = 'RoundCloth';

  // 1) 상판(원형) - 정확히 테이블 상판 크기
  const topGeom = new THREE.CircleGeometry(radius, 64);
  const topMat  = new THREE.MeshStandardMaterial({ metalness: 0.05, roughness: 0.85 });
  const top = new THREE.Mesh(topGeom, topMat);
  top.rotation.x = -Math.PI / 2;
  top.position.y = topY;
  top.castShadow = top.receiveShadow = true;
  group.add(top);

  // 상단 가장자리 선
  const edges = new THREE.EdgesGeometry(topGeom);
  const line  = new THREE.LineSegments(edges, new THREE.LineBasicMaterial());
  line.rotation.x = -Math.PI / 2;
  line.position.y = topY + 0.001;
  group.add(line);

  // 2) 스커트(실린더 띠) — 상단 반지름 약간 확장해 z-fighting 방지
  const seg = 96;
  const rTop = radius + 0.2;
  const height = drop;

  // 실린더 띠 생성(상/하 캡 없음)
  const cylGeom = new THREE.CylinderGeometry(rTop, rTop, height, seg, 1, true);
  // 높이 중앙이 원점이므로, 상단이 topY가 되도록 위치
  const skirt = new THREE.Mesh(
    cylGeom,
    new THREE.MeshStandardMaterial({ metalness: 0.05, roughness: 0.9, side: THREE.DoubleSide })
  );
  skirt.position.y = topY - height / 2; // 상단이 topY에 맞도록
  group.add(skirt);

  // 하단 웨이브
  const pos = cylGeom.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
    const theta = Math.atan2(z, x);
    const t = ((skirt.position.y + height / 2) - y) / (height || 1); // 0~1
    const amp = waveAmp * Math.pow(Math.max(0, t), 1.2);
    const offset = amp * Math.sin(waveFreq * theta);
    const r = Math.hypot(x, z) || 1;
    pos.setXYZ(i, x + (x/r)*offset, y, z + (z/r)*offset);
  }
  pos.needsUpdate = true;
  cylGeom.computeVertexNormals();

  return group;
}
