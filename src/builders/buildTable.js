// src/builders/buildTable.js
import * as THREE from 'three';

export function buildTable(state = {}) {
  const t = state.table || {};
  const shape = t.shape === 'round' ? 'round' : 'rect';
  const tableH = Number(t.height ?? 75);
  const topTh  = 5;                 // 상판 두께
  const legsH  = Math.max(10, tableH - topTh);  // 다리 높이(바닥~상판)

  const group = new THREE.Group();
  group.name = 'Table';
  group.scale.set(1, 1, 1); // 부모 스케일 영향 방지용 기본값(비필수)

  if (shape === 'round') {
    // ✅ 원탁은 "지름"만 사용
    const d = Number(t.diameter ?? 180);
    const r = Math.max(1, d / 2);

    const tableH = Number(t.height ?? 75);
  const topTh  = 5;                       // 상판 두께
  const legsH  = Math.max(10, tableH - topTh); // 바닥~상판 하부까지 높이

    // 상판(원형)
    const topGeom = new THREE.CylinderGeometry(r, r, topTh, 64);
    const topMat  = new THREE.MeshStandardMaterial({ metalness: 0.1, roughness: 0.7 });
    const top = new THREE.Mesh(topGeom, topMat);
    top.position.y = tableH - topTh / 2;
    top.castShadow = top.receiveShadow = true;
    group.add(top);

     // ===== 중앙 원기둥 다리 + 원형 받침 =====
  // 다리 굵기/베이스 비율은 지름에 비례(최소값 보정)
  const pedR    = Math.max(4, r * 0.12);     // 중앙 다리 반지름(상단)
  const baseR   = Math.max(18, pedR * 3.5);             // 받침(베이스) 반지름
  const baseTh  = 3;                         // 받침 두께
  const shaftH  = Math.max(6, legsH - baseTh); // 다리 기둥 높이(받침 위로)

  const legMat  = new THREE.MeshStandardMaterial({ metalness: 0.1, roughness: 0.8 });

   // (1) 받침(원판)
  const baseGeom = new THREE.CylinderGeometry(baseR, baseR, baseTh, 48);
  const base = new THREE.Mesh(baseGeom, legMat);
  base.position.y = baseTh / 2;              // 바닥에서 살짝 올라오게
  base.castShadow = true;
  base.receiveShadow = true;
  group.add(base);

  // (2) 중앙 기둥(살짝 테이퍼)
  const shaftGeom = new THREE.CylinderGeometry(pedR * 0.95, pedR, shaftH, 48);
  const shaft = new THREE.Mesh(shaftGeom, legMat);
  shaft.position.y = baseTh + shaftH / 2;    // 받침 위에 앉도록
  shaft.castShadow = true;
  shaft.receiveShadow = true;
  group.add(shaft);

  } else {
    // ✅ 직사각은 width/length만 사용
    const w = Number(t.width  ?? 60);
    const l = Number(t.length ?? 180);

    // 상판(직사각)
    const topGeom = new THREE.BoxGeometry(l, topTh, w);
    const topMat  = new THREE.MeshStandardMaterial({ metalness: 0.1, roughness: 0.7 });
    const top = new THREE.Mesh(topGeom, topMat);
    top.position.y = tableH - topTh / 2;
    top.castShadow = top.receiveShadow = true;
    group.add(top);

    // 다리(박스) 4개
    const legSize = 4;
    const legGeom = new THREE.BoxGeometry(legSize, legsH, legSize);
    const legMat  = new THREE.MeshStandardMaterial({ metalness: 0.1, roughness: 0.8 });
    const x = l / 2 - legSize / 2;
    const z = w / 2 - legSize / 2;
    [
      [ x, legsH / 2,  z],
      [ x, legsH / 2, -z],
      [-x, legsH / 2,  z],
      [-x, legsH / 2, -z],
    ].forEach(([lx, ly, lz]) => {
      const m = new THREE.Mesh(legGeom, legMat);
      m.position.set(lx, ly, lz);
      m.castShadow = true;
      group.add(m);
    });
  }

  return group;
}
