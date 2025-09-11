// src/builders/buildRoundCloth.js
import * as THREE from 'three';

/**
 * params: {
 *   table: { diameter, height },
 *   cloth: { d, drop, waveAmp?, waveFreq? }
 * }
 * - 상판은 테이블 지름만 사용(diameter).
 * - 스커트는 edge에서 drop만큼 수직 하강.
 */
export function buildRoundCloth(params) {
  const { table = {}, cloth = {} } = params || {};
  const tableD = Number(table.diameter ?? 180);
  const topY   = Number(table.height ?? 75) + 0.6; // 테이블 윗면 + ε
  const drop   = Number(cloth.drop ?? 15);

  const group = new THREE.Group();
  group.name = 'RoundCloth';

  // 1) 상판(원형) — 테이블 지름만큼
  const topRadius = Math.max(1, tableD / 2);
  const topGeom = new THREE.CircleGeometry(topRadius, 64);
  const topMat  = new THREE.MeshStandardMaterial({ metalness: 0.05, roughness: 0.85 });
  const top = new THREE.Mesh(topGeom, topMat);
  top.rotation.x = -Math.PI / 2; // XY → XZ
  top.position.y = topY;
  top.castShadow = true;
  top.receiveShadow = true;
  group.add(top);

  // 가장자리 선(시각화)
  const topEdges = new THREE.EdgesGeometry(topGeom);
  const topLine  = new THREE.LineSegments(topEdges, new THREE.LineBasicMaterial());
  topLine.rotation.x = -Math.PI / 2;
  topLine.position.y = topY + 0.001;
  group.add(topLine);

  // 2) 스커트(실린더 띠) — edge에서 수직 드롭
  const seg = 96;
  // edge z-fighting 방지용으로 아주 미세하게 바깥쪽 반지름
  const rTop   = topRadius + 0.2;
  const height = Math.max(0, drop);

  // 실린더 띠 생성(상/하 캡 없음)
  const cylGeom = new THREE.CylinderGeometry(rTop, rTop, height, seg, 1, true);
  // 높이 중앙이 원점이므로, 상단이 topY가 되도록 위치
  const skirt = new THREE.Mesh(
    cylGeom,
    new THREE.MeshStandardMaterial({ metalness: 0.05, roughness: 0.9, side: THREE.DoubleSide })
  );
  skirt.position.y = topY - height / 2;
  group.add(skirt);

  // 웨이브(주름) — 하단쪽만 약하게
  const pos = cylGeom.attributes.position;
  const waveAmp  = Number.isFinite(cloth.waveAmp) ? cloth.waveAmp : 1.2; // cm 단위 느낌
  const waveFreq = Number.isFinite(cloth.waveFreq) ? cloth.waveFreq : 10; // 개수
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);

    // 각도
    const theta = Math.atan2(z, x);
    // 상단(=topY)에서 하단으로 내려갈수록 가중치↑
    const t = ( (skirt.position.y + height / 2) - y ) / height; // 0(top)~1(bottom)

    // 하단만 살짝 퍼지는 웨이브
    const amp = waveAmp * Math.pow(Math.max(0, t), 1.2);
    const offset = amp * Math.sin(waveFreq * theta);

    const r = Math.hypot(x, z);
    const nx = (x / r) || 0;
    const nz = (z / r) || 0;

    pos.setXYZ(i, x + nx * offset, y, z + nz * offset);
  }
  pos.needsUpdate = true;
  cylGeom.computeVertexNormals();

  return group;
}
