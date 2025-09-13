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
const thickness = Number(r.depth ?? 0.3);      // cm
const hover = Math.max(1.0, thickness + 0.2); 

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
 const topFlatLen = Math.max(0, Math.min(L, Number.isFinite(r.topFlat) ? Number(r.topFlat) : (Ltbl + 2)));
 const halfFlat   = topFlatLen / 2;

  const group = new THREE.Group();
  group.name = 'Runner';

  // ===== 1) 상판 지오메트리(러너의 평면) =====
  // ===== 1) 상판 지오메트리(러너의 평면) =====
let geomTop;
if (shape === 'rect') {
  const segX = Math.max(28, Math.ceil(L / 6));
  const segZ = Math.max(2,  Math.ceil(W / 20));
  geomTop = new THREE.PlaneGeometry(L, W, segX, segZ);
  geomTop.rotateX(-Math.PI / 2); // XY → XZ
} else {
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

// === (기존처럼) 힌지/드롭 변형을 "geomTop"에 먼저 적용 ===
const pos = geomTop.attributes.position;

// 1) 힌지선 스냅
const seamSnap = 2;
for (let i = 0; i < pos.count; i++) {
  const x = pos.getX(i);
  const dx = Math.abs(Math.abs(x) - halfFlat);
  if (dx <= seamSnap) pos.setX(i, Math.sign(x) * halfFlat);
}

// 2) 드롭
const clothClear = 1.5;
const outExtra   = Math.min(drop, 5.0);
const xEdge      = Math.max(halfFlat, halfTable) + clothClear + outExtra; // 항상 테이블 밖

for (let i = 0; i < pos.count; i++) {
  const x = pos.getX(i);
  if (Math.abs(x) <= halfFlat + 1e-4) continue; // 상판 구간 유지
  const y = pos.getY(i);
  pos.setY(i, y - drop);
  pos.setX(i, (Math.sign(x) || 1) * xEdge);
}

pos.needsUpdate = true;
geomTop.computeVertexNormals();

// === 변형이 끝난 "지금" 두께를 부여 ===
const geomSolid = solidify(geomTop, thickness);

// === 솔리드 메쉬로 교체 추가 ===
const mat = new THREE.MeshStandardMaterial({
  color: r.color ?? 0xaa2a2a,
  metalness: 0.05,
  roughness: 0.85,
  side: THREE.DoubleSide
});

const runner = new THREE.Mesh(geomSolid, mat);
runner.position.set(0, topY, 0);  // ↑ topY만 주면 됨 (top 참조 불필요)
runner.castShadow = true;
runner.receiveShadow = true;
group.add(runner);

// 원하면 geomTop은 이제 불필요 → 메모리 정리
geomTop.dispose();


  // (선택) 변형 후에 외곽선이 필요하면 여기서 새로 만들어 붙이기
  // const edges = new THREE.EdgesGeometry(geomTop);
  // const line  = new THREE.LineSegments(edges, new THREE.LineBasicMaterial({color:'#ffffff'}));
  // line.position.y = topY + 0.001;
  // group.add(line);
/**
 * geom: 변형을 마친 BufferGeometry (삼각형 인덱스 필수)
 * t   : 두께(+Y->-Y 방향으로 t만큼 아래에 바닥면 생성)
 */
function solidify(geom, t = 0.3) {
  // 안전장치: 인덱스/노멀 보장
  const g = geom.toNonIndexed ? geom.toNonIndexed() : geom.clone();
  g.computeVertexNormals();
  const pos = g.getAttribute('position');
  const uv  = g.getAttribute('uv'); // 있으면 복사
  const vCount = pos.count;

  // 1) 위/아래 면 버텍스 만들기
  const topPositions    = new Float32Array(vCount * 3);
  const bottomPositions = new Float32Array(vCount * 3);
  const topUVs    = uv ? new Float32Array(vCount * 2) : null;
  const bottomUVs = uv ? new Float32Array(vCount * 2) : null;

  for (let i = 0; i < vCount; i++) {
    const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
    topPositions[i*3+0] = x;
    topPositions[i*3+1] = y;
    topPositions[i*3+2] = z;

    // 두께만큼 "아래"로 내린 복제 (Y 축을 수직으로 쓰는 현재 씬에 맞춤)
    bottomPositions[i*3+0] = x;
    bottomPositions[i*3+1] = y - t;
    bottomPositions[i*3+2] = z;

    if (uv) {
      const u = uv.getX(i), v = uv.getY(i);
      topUVs[i*2+0] = u;  topUVs[i*2+1] = v;
      bottomUVs[i*2+0] = u; bottomUVs[i*2+1] = v;
    }
  }

  // 2) 위/아래 면 인덱스 (아래 면은 시계반전)
  // g는 NonIndexed 상태라서, 각 3버텍스가 한 삼각형이라 가정
  const triCount = vCount / 3;
  const topIndices = new Uint32Array(triCount * 3);
  const botIndices = new Uint32Array(triCount * 3);
  for (let i = 0; i < triCount; i++) {
    const a = i*3, b = i*3+1, c = i*3+2;
    // 위: 그대로
    topIndices[i*3+0] = a;
    topIndices[i*3+1] = b;
    topIndices[i*3+2] = c;
    // 아래: 반전 + 인덱스 오프셋(vCount)
    botIndices[i*3+0] = c + vCount;
    botIndices[i*3+1] = b + vCount;
    botIndices[i*3+2] = a + vCount;
  }

  // 3) 경계 에지 찾기 (한 번만 등장하는 에지가 외곽)
  // NonIndexed인 상태에서 에지 추출: 삼각형마다 (a,b),(b,c),(c,a)
  // 에지 키 정규화: "min-max"
  const edgeMap = new Map();
  function addEdge(i1, i2) {
    const a = Math.min(i1, i2), b = Math.max(i1, i2);
    const key = a + '_' + b;
    edgeMap.set(key, (edgeMap.get(key) || 0) + 1);
  }
  for (let i = 0; i < triCount; i++) {
    const a = i*3, b = i*3+1, c = i*3+2;
    addEdge(a, b); addEdge(b, c); addEdge(c, a);
  }

  // 4) 옆면 쿼드 생성 (경계 에지마다 두 삼각형)
  const sideQuads = [];
  edgeMap.forEach((count, key) => {
    if (count !== 1) return; // 내부 에지는 스킵
    const [aStr, bStr] = key.split('_');
    const a = Number(aStr), b = Number(bStr);
    const aTop = a, bTop = b;
    const aBot = a + vCount, bBot = b + vCount;

    // 법선/UV 자연스럽게 하려면 a→b 순서를 유지
    // 쿼드(aTop->bTop->bBot->aBot)를 두 삼각형으로
    sideQuads.push(aTop, bTop, bBot);
    sideQuads.push(aTop, bBot, aBot);
  });
  const sideIndices = new Uint32Array(sideQuads);

  // 5) 최종 병합
  const merged = new THREE.BufferGeometry();
  // 포지션: top + bottom
  const allPos = new Float32Array((vCount + vCount) * 3);
  allPos.set(topPositions, 0);
  allPos.set(bottomPositions, topPositions.length);
  merged.setAttribute('position', new THREE.BufferAttribute(allPos, 3));

  // UV 병합(있으면)
  if (uv) {
    const allUV = new Float32Array((vCount + vCount) * 2);
    allUV.set(topUVs, 0);
    allUV.set(bottomUVs, topUVs.length);
    merged.setAttribute('uv', new THREE.BufferAttribute(allUV, 2));
  }

  // 인덱스: top + bottom + sides
  const allIndex = new Uint32Array(topIndices.length + botIndices.length + sideIndices.length);
  allIndex.set(topIndices, 0);
  allIndex.set(botIndices, topIndices.length);
  allIndex.set(sideIndices, topIndices.length + botIndices.length);
  merged.setIndex(new THREE.BufferAttribute(allIndex, 1));

  merged.computeVertexNormals();
  merged.computeBoundingBox();
  merged.computeBoundingSphere();
  return merged;
}


  return group;
}
