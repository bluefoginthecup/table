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

    // 상판(원형)
    const topGeom = new THREE.CylinderGeometry(r, r, topTh, 64);
    const topMat  = new THREE.MeshStandardMaterial({ metalness: 0.1, roughness: 0.7 });
    const top = new THREE.Mesh(topGeom, topMat);
    top.position.y = tableH - topTh / 2;
    top.castShadow = top.receiveShadow = true;
    group.add(top);

    // 다리(원기둥) 4개: r*0.7 위치
    const legGeom = new THREE.CylinderGeometry(2, 2, legsH, 16);
    const legMat  = new THREE.MeshStandardMaterial({ metalness: 0.1, roughness: 0.8 });
    const off = r * 0.7;
    [
      [ off, legsH / 2,  off],
      [ off, legsH / 2, -off],
      [-off, legsH / 2,  off],
      [-off, legsH / 2, -off],
    ].forEach(([x, y, z]) => {
      const m = new THREE.Mesh(legGeom, legMat);
      m.position.set(x, y, z);
      m.castShadow = true;
      group.add(m);
    });

  } else {
    // ✅ 직사각은 width/length만 사용
    const w = Number(t.width  ?? 60);
    const l = Number(t.length ?? 180);

    // 상판(직사각)
    const topGeom = new THREE.BoxGeometry(w, topTh, l);
    const topMat  = new THREE.MeshStandardMaterial({ metalness: 0.1, roughness: 0.7 });
    const top = new THREE.Mesh(topGeom, topMat);
    top.position.y = tableH - topTh / 2;
    top.castShadow = top.receiveShadow = true;
    group.add(top);

    // 다리(박스) 4개
    const legSize = 4;
    const legGeom = new THREE.BoxGeometry(legSize, legsH, legSize);
    const legMat  = new THREE.MeshStandardMaterial({ metalness: 0.1, roughness: 0.8 });
    const x = w / 2 - legSize / 2;
    const z = l / 2 - legSize / 2;
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
