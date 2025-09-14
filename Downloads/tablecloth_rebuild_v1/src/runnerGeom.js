// runnerGeom.js
// runner는 grid.js가 해석할 수 있는 "shape descriptor"를 반환해야
// cap(육각/라운드)과 tip 길이비가 반영되고, 드롭도 시뮬레이터에서 적용됩니다.

export function buildRunnerGeometry({
  type = 'hex',           // 'hex' | 'round' (main.js의 state.runnerType와 매칭)
  width,                  // m
  length,                 // m
  tipLenRatio = 0.25      // 0~0.5 권장: 양 끝 팁에 전체 길이의 비율로 분배
}) {
  if (!Number.isFinite(width) || !Number.isFinite(length)) {
    throw new Error('buildRunnerGeometry: width/length (meters) are required');
  }
  const cap = (type === 'round') ? 'round' :
              (type === 'hex')   ? 'hex'   :
              'rect';
  return {
    shape: 'runner',
    params: { width, length, cap, tipLenRatio }
  };
}
