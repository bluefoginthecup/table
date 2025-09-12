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

 // ✅ 상판 위 ‘평평 구간’ 길이
 //    - r.topFlat가 있으면 그 값을 사용
 //    - 없으면 “테이블 길이 + 5cm”를 기본값으로(러너 총길이 L을 넘지 않게 clamp)
 const topFlatLen = Math.max(0, Math.min(L, Number.isFinite(r.topFlat) ? Number(r.topFlat) : (Ltbl + 10)));
 const halfFlat   = topFlatLen / 2;

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
  // 1) 힌지선 스냅: ±halfFlat 근처 버텍스를 힌지선에 정렬
 const seamSnap = 1.5;                           // 힌지 부근 버텍스 스냅 폭(cm)
 for (let i = 0; i < pos.count; i++) {
   const x = pos.getX(i);
   const dx = Math.abs(Math.abs(x) - halfFlat);
   if (dx <= seamSnap) pos.setX(i, Math.sign(x) * halfFlat);
 }
 // 2) 드롭: 힌지 바깥은 고정 X로 ‘바깥’에 두고 Y만 drop
 const clothClear = 1.5;                         // 테이블 모서리에서 띄움
 const outExtra   = Math.min(drop, 5.0);         // 살짝 더 바깥(옵션)
 const xEdge      = halfFlat + clothClear + outExtra;
 for (let i = 0; i < pos.count; i++) {
   const x = pos.getX(i);
   if (Math.abs(x) <= halfFlat + 1e-4) continue; // 상판 위 구간은 그대로
   const y = pos.getY(i);
   pos.setY(i, y - drop);
   pos.setX(i, (Math.sign(x) || 1) * xEdge);
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
