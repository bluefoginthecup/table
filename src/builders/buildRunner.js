// src/builders/buildRunner.js
import * as THREE from 'three';

function smooth01(t) { t = THREE.MathUtils.clamp(t, 0, 1); return t*t*(3-2*t); }

/**
 * state: {
 *   table: { shape:'rect'|'round', width?, length?, diameter?, height? },
 *   runner:{ width, length, drop, rshape:'rect'|'hex', rtip? }
 * }
 */
export function buildRunner(state = {}) {
  const table = state.table || {};
  const r     = state.runner || {};
  const meas  = state.meas   || {}; // ← 테이블 상판 실측(바운딩박스)

// ✅ 테이블 상판 높이는 "측정값"을 사용 (관통/띄움 방지)
const hover = 1.0; // cm (원하면 UI로 빼도 됨)
  const topY = (meas.topY ?? (Number(table.height ?? 75))) + hover;
  // ✅ 끝선은 월드기준 X 길이(바운딩박스)로 계산 → round도 자동 OK
  const Ltbl = Math.max(1, (meas.sizeXZ?.x ?? ((table.shape === 'round')
                ? Number(table.diameter ?? 180)
                : Number(table.length ?? 180))));
  const halfTable = Ltbl / 2;

  
  // 러너 치수
  const W   = Math.max(1, Number(r.width  ?? 30));    // 러너 폭(Z)
  const L   = Math.max(1, Number(r.length ?? 210));   // 러너 길이(X, 끝→끝)
  const drop= Math.max(0, Number(r.drop   ?? 15));    // 떨어지는 높이
  const shape = r.rshape === 'hex' ? 'hex' : 'rect';
  const tipLen= Math.max(1, Number.isFinite(r.rtip) ? Number(r.rtip) : drop); // hex 팁 길이

  const group = new THREE.Group();
  group.name = 'Runner';

  // ===== 1) 상판 지오메트리(러너의 평면) =====
  let geomTop;
  if (shape === 'rect') {
    // PlaneGeometry(width=X, height=Z) → X축 분할을 크게 (드롭 꺾임 표현)
    const segX = Math.max(24, Math.ceil(L / 8));
    const segZ = Math.max(2,  Math.ceil(W / 20));
    geomTop = new THREE.PlaneGeometry(L, W, segX, segZ);
    geomTop.rotateX(-Math.PI / 2); // XY → XZ
  } else {
    // 육각 폴리곤: 중앙 직사각 + 양끝 삼각형(팁 길이=tipLen)
    const halfL = L / 2, halfW = W / 2;
    const s = new THREE.Shape();
    s.moveTo(-halfL - tipLen, 0);
    s.lineTo(-halfL, -halfW);
    s.lineTo( halfL, -halfW);
    s.lineTo( halfL + tipLen, 0);
    s.lineTo( halfL,  halfW);
    s.lineTo(-halfL,  halfW);
    s.lineTo(-halfL - tipLen, 0);
    const curveSeg = 96;
    geomTop = new THREE.ShapeGeometry(s, curveSeg);
    geomTop.rotateX(-Math.PI / 2); // XY → XZ
  }

  // 상판 메쉬
  const matTop = new THREE.MeshStandardMaterial({
    metalness: 0.05, roughness: 0.85, side: THREE.DoubleSide
  });
  const top = new THREE.Mesh(geomTop, matTop);
  top.position.y = topY;
  top.castShadow = top.receiveShadow = true;
  group.add(top);

 

  const pos = geomTop.attributes.position;
  // 힌지 폭을 아주 작게 → 엣지에서 바로 '수직'에 가깝게 떨어짐
  const hinge = Math.max(0.8, Math.min(1.5, drop * 0.12));   // 0.6~1.5cm
  const clothClear = 1.2;
  
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    // 테이블 끝 밖으로 나간 거리(로컬 X 기준)
    const over = Math.max(0, Math.abs(x) - halfTable);
    if (over <= 0) continue;
    const t  = smooth01(over / hinge);         // 0~1 (아주 짧은 구간에서 1이 됨)
    const dy = drop * t;
    pos.setY(i, y - dy);                       // 아래로 떨어뜨림
    // X는 거의 고정(수직 느낌). 살짝만 바깥으로 빼서 모서리 겹침 방지
    const sign = Math.sign(x) || 1;
    const outExtra = Math.min(drop, 5.0);           // 드롭에 비례해 최대 2cm 추가
const xEdge = halfTable + clothClear + outExtra;
    pos.setX(i, sign * xEdge);
  }


  pos.needsUpdate = true;
  geomTop.computeVertexNormals();


  // (선택) 변형 후에 외곽선이 필요하면 여기서 새로 만들어 붙이기
  // const edges = new THREE.EdgesGeometry(geomTop);
  // const line  = new THREE.LineSegments(edges, new THREE.LineBasicMaterial({color:'#ffffff'}));
  // line.position.y = topY + 0.001;
  // group.add(line);


  return group;
}
