// src/builders/buildRoundTablecloth.js
import * as THREE from 'three';

/**
 * 원형 기준 테이블보(pleat + hem scallop) 메쉬 생성.
 * - 타원 테이블에 쓸 땐, 호출한 쪽(buildTable)에서 cloth.scale.set(a/baseR, 1, b/baseR) 적용
 * @param {{radius:number, height:number}} param0  radius: 원 기준 반경(baseR), height: 상판 높이
 * @param {object} options
 * @returns {THREE.Mesh}
 */
export function buildRoundTablecloth({ radius, height }, options = {}) {
  const {
    drop = 28,          // 늘어뜨리기 길이(cm)
    pleatCount = 20,    // 주름 개수
    pleatDepth = 0.08,  // 주름 깊이(반지름 대비 비율)
    hemScallop = 2.5,   // 밑단 물결 깊이(cm)
    hemFreq = 40,       // 밑단 물결 개수
    segmentsRadial = 128,
    segmentsHeight = 6,
    color = 0xffffff
  } = options;

  const topR = radius * 1.02;
  const bottomR = radius * 1.05;
  const H = height + drop; // 천 전체 높이

  const geo = new THREE.CylinderGeometry(
    topR, bottomR, H,
    segmentsRadial, segmentsHeight,
    true // openEnded: 밑면 열림 → 덮개 느낌
  );

  // 주름/밑단 변형
  const pos = geo.attributes.position;
  const v = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    v.set(pos.getX(i), pos.getY(i), pos.getZ(i));

    const theta = Math.atan2(v.z, v.x);        // -π ~ π
    const y01 = (v.y + H / 2) / H;             // 위=1, 아래=0

    // 아래쪽에서 주름이 더 크게
    const pleat = 1 + pleatDepth * (1 - y01) * Math.cos(pleatCount * theta);
    v.x *= pleat;
    v.z *= pleat;

    // 밑단 스캘럽(물결)
    if (y01 < 0.15) {
      const t = 1 - y01 / 0.15;
      v.y -= hemScallop * t * Math.max(0, Math.cos(hemFreq * theta));
    }

    pos.setXYZ(i, v.x, v.y, v.z);
  }
  pos.needsUpdate = true;
  geo.computeVertexNormals();

  const mat = new THREE.MeshStandardMaterial({
    color, roughness: 0.9, metalness: 0.0, side: THREE.DoubleSide
  });

  const cloth = new THREE.Mesh(geo, mat);
  cloth.name = 'Tablecloth';
  // 상판 높이에 맞춰 위치(상판 y = height)
  cloth.position.y = H / 2 - (drop / 2);

  return cloth;
}
