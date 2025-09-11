// src/builders_v2/clothUtils_v2.js
import * as THREE from "three";

// 부드러운 0~1 이행
export function smooth01(t) {
  const x = THREE.MathUtils.clamp(t, 0, 1);
  return x * x * (3 - 2 * x);
}

/**
 * 테이블(지지체)로부터의 수평 여유거리(cm)
 * - rect : 직사각 테이블(halfX, halfZ)
 * - round: 원탁 (radius)
 */
export function clearanceToTableXZ(table, meas, px, pz) {
  const shape = table?.shape === "round" ? "round" : "rect";

  if (shape === "round") {
    const radius = Math.max(1, Math.min(meas?.sizeXZ?.x ?? 0, meas?.sizeXZ?.z ?? 0) / 2);
    const radial = Math.hypot(px, pz);
    return Math.max(radial - radius, 0);
  } else {
    const hx = Math.max(1, (meas?.sizeXZ?.x ?? 0) / 2);
    const hz = Math.max(1, (meas?.sizeXZ?.z ?? 0) / 2);
    const dx = Math.max(Math.abs(px) - hx, 0);
    const dz = Math.max(Math.abs(pz) - hz, 0);
    // 직선/코너까지의 최소 거리
    return Math.hypot(dx, dz);
  }
}

/** 가변 드롭: 여유거리 0일 때 0, threshold 이상이면 baseDrop 근접 */
export function effectiveDrop(table, meas, px, pz, baseDrop, threshold = 12) {
  const c = clearanceToTableXZ(table, meas, px, pz);
  const k = smooth01(c / Math.max(1, threshold));
  return Math.max(0, baseDrop * k);
}

/** 원형 보 외곽 경로 (반지름 r, segments N) */
export function edgePathCircle(r, segments = 96) {
  const pts = [];
  for (let i = 0; i < segments; i++) {
    const t = (i / segments) * Math.PI * 2;
    const x = Math.cos(t) * r;
    const z = Math.sin(t) * r;
    // 바깥 법선 = 반지름 방향
    pts.push({ x, z, nx: Math.cos(t), nz: Math.sin(t), t: i / segments });
  }
  return pts;
}

/** 사각 보 외곽 경로 (W×L, 변당 분할 n) */
export function edgePathRect(W, L, n = 24) {
  const pts = [];
  const x0 = W / 2, x1 = -W / 2;
  const z0 = L / 2, z1 = -L / 2;

  // 코너 법선 (모서리 평균)
  const norm = {
    tr: { nx: +Math.SQRT1_2, nz: +Math.SQRT1_2 }, // top-right
    br: { nx: +Math.SQRT1_2, nz: -Math.SQRT1_2 }, // bottom-right
    bl: { nx: -Math.SQRT1_2, nz: -Math.SQRT1_2 }, // bottom-left
    tl: { nx: -Math.SQRT1_2, nz: +Math.SQRT1_2 }, // top-left
  };

  const segs = [];
  // 상 변: TL → TR (nz = +1)
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const x = THREE.MathUtils.lerp(x1, x0, t);
    const z = z0;
    let nx = 0, nz = +1;
    if (i === 0) ({ nx, nz } = norm.tl);
    if (i === n) ({ nx, nz } = norm.tr);
    segs.push({ x, z, nx, nz });
  }
  // 우 변: TR → BR (nx = +1)
  for (let i = 1; i <= n; i++) {
    const t = i / n;
    const x = x0;
    const z = THREE.MathUtils.lerp(z0, z1, t);
    let nx = +1, nz = 0;
    if (i === n) ({ nx, nz } = norm.br);
    segs.push({ x, z, nx, nz });
  }
  // 하 변: BR → BL (nz = -1)
  for (let i = 1; i <= n; i++) {
    const t = i / n;
    const x = THREE.MathUtils.lerp(x0, x1, t);
    const z = z1;
    let nx = 0, nz = -1;
    if (i === n) ({ nx, nz } = norm.bl);
    segs.push({ x, z, nx, nz });
  }
  // 좌 변: BL → TL (nx = -1)
  for (let i = 1; i < n; i++) {
    const t = i / n;
    const x = x1;
    const z = THREE.MathUtils.lerp(z1, z0, t);
    let nx = -1, nz = 0;
    segs.push({ x, z, nx, nz });
  }

  // 누적 길이로 0~1 파라미터 t 재계산(웨이브 위상용)
  let acc = 0;
  const lens = [0];
  for (let i = 1; i < segs.length; i++) {
    const dx = segs[i].x - segs[i - 1].x;
    const dz = segs[i].z - segs[i - 1].z;
    acc += Math.hypot(dx, dz);
    lens.push(acc);
  }
  for (let i = 0; i < segs.length; i++) segs[i].t = lens[i] / (acc || 1);
  return segs;
}
