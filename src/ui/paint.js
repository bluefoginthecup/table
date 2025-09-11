// src/ui/paint.js
import * as THREE from 'three';

export function bindPaint(three, store, renderAll) {
  const paintToggle = document.querySelector('#paintMode');
  const paintColor  = document.querySelector('#paintColor');

  const raycaster = new THREE.Raycaster();
  const mouseNDC = new THREE.Vector2();

  // 모드 토글 → 바디 클래스
  const setPaintClass = () => {
    if (paintToggle?.checked) document.body.classList.add('paint-mode');
    else document.body.classList.remove('paint-mode');
  };
  paintToggle?.addEventListener('change', setPaintClass);
  setPaintClass();

  // 렌더러 캔버스 확보 (fallback: #app 내 canvas)
  const canvas =
    three?.renderer?.domElement ||
    document.querySelector('#app canvas') ||
    document.querySelector('canvas');

  if (!canvas) return; // 렌더러가 아직 없으면 조용히 종료

  // 클릭 → 피킹 → 상위 paintable 그룹 찾기
  canvas.addEventListener('pointerdown', (e) => {
    if (!paintToggle?.checked) return;

    const rect = canvas.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    const y = -((e.clientY - rect.top)  / rect.height) * 2 + 1;
    mouseNDC.set(x, y);

    const camera = three?.camera;
    if (!camera) return;

    raycaster.setFromCamera(mouseNDC, camera);
    const hits = raycaster.intersectObjects(three.scene.children, true);
    if (!hits.length) return;

    // 첫 번째 맞은 메쉬에서 paintable 그룹까지 올라감
    let node = hits[0].object;
    while (node && node !== three.scene) {
      if (node.userData?.paintable || /Runner|RectCloth|RoundCloth/i.test(node.name)) break;
      node = node.parent;
    }
    if (!node || node === three.scene) return;

    // 색 얻기
    const hex = (paintColor && paintColor.value) || '#ffcc66';

    // 재질 공유 방지 + 일괄 적용
    applyColorToGroup(node, hex);

    // store에 보존(타입 키로 저장)
    const paintId = node.userData?.paintId || inferPaintId(node.name);
    if (paintId) {
      const next = Object.assign({}, store.get().paint || {}, { [paintId]: hex });
      store.set({ paint: next });
    }

    // 즉시 리렌더(조명반응 등 업데이트)
    renderAll?.();
  }, { passive: true });
}

// 그룹 전체에 색 적용 (재질 복제 안전 처리)
function applyColorToGroup(group, hex) {
  const col = new THREE.Color(hex);
  group.traverse((n) => {
    if (n.isMesh && n.material) {
      // 공유 재질 방지
      if (!n.material.isMeshStandardMaterial && !n.material.isMeshPhongMaterial) return;
      if (!n.material.__clonedForPaint) {
        n.material = n.material.clone();
        n.material.__clonedForPaint = true;
      }
      if (n.material.color) {
        n.material.color.copy(col);
        n.material.needsUpdate = true;
      }
    }
  });
}

function inferPaintId(name = '') {
  if (/Runner/i.test(name)) return 'runner';
  if (/RectCloth/i.test(name)) return 'rectcloth';
  if (/RoundCloth/i.test(name)) return 'roundcloth';
  if (/Table/i.test(name)) return 'table';
  return null;
}
