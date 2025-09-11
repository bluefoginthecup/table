// 상단에 추가
import * as THREE from 'three';
import { buildTable } from '../builders/buildTable.js';
import { buildRunner } from '../builders/buildRunner.js';
import { buildRectCloth, buildRoundCloth } from '../cloth/factory.js';

// 테이블의 실제 topY와 X/Z 크기(월드 기준)를 측정
function measureTableTop(tableObj) {
  const box = new THREE.Box3().setFromObject(tableObj);
  const size = new THREE.Vector3();
  box.getSize(size);            // size.x, size.y, size.z (월드 단위)
  const topY = box.max.y;       // 상판 최상단 Y
  return { topY, sizeXZ: { x: size.x, z: size.z } };
}

export function updateScene(scene, store) {
  // 1) 이전 루트 정리
  const prev = scene.getObjectByName('AppRoot');
  if (prev) {
    prev.traverse(obj => {
      if (obj.geometry) obj.geometry.dispose?.();
      if (obj.material) {
        if (Array.isArray(obj.material)) obj.material.forEach(m => m.dispose?.());
        else obj.material.dispose?.();
      }
    });
    scene.remove(prev);
  }
  const applyColor = (obj, hex) => {
    if (!hex) return;
    const c = new THREE.Color(hex);
    obj.traverse((n) => {
      if (n.isMesh && n.material && n.material.color) {
        n.material.color.copy(c);
        n.material.needsUpdate = true;
      }
    });
  };

  // 2) 상태 읽기
  const state = store.get(); // { table, product }
  const root = new THREE.Group();
  root.name = 'AppRoot';

  // 3) 테이블 생성 (state.table.shape: 'rect' | 'round')
  // buildTable이 state 전체를 기대한다면 그대로 전달하고, table만 받는다면 적절히 맞춰주세요.
  const table = buildTable(state);
   table.name = table.name || 'Table';
 table.userData.paintable = true;     // 🎨 클릭 페인트 대상으로 표시
 table.userData.paintId = 'table';
 root.add(table);

 // 저장된 색(있으면) 적용. 없으면 아무 것도 안 함.
 applyColor(table, state.paint?.table || state.table?.color);

  // 2) 실제 상단/폭/길이(또는 지름) 측정
  const t = measureTableTop(table); // {topY, sizeXZ:{x,z}}

  // 3) 제작 항목
 const prod = state.product || {};

if (prod.type === 'runner') {
  // (기존) 러너 생성...
  const dropStrength = Math.max(0, Math.min(1, Number(prod.drop ?? 15) / 40));
  const runnerState = {
    table: state.table,
    runner: {
      width: Number(prod.w ?? 24),
      length: Number(prod.l ?? 210),
      dropStrength
    }
  };
  const runner = buildRunner(runnerState);

  runner.name = runner.name || 'Runner';
    runner.userData.paintable = true;
    runner.userData.paintId = 'runner';
    root.add(runner);
    // 저장된 색(페인트/또는 UI 색) 적용 우선순위: store.paint > prod.color
    applyColor(runner, state.paint?.runner || prod.color);
   
}
else if (prod.type === 'rectcloth') {
    const cloth = { drop: Number(prod.drop || 0) };
    // 상판은 테이블 실제 크기, 스커트는 drop만큼
    const mesh = buildRectCloth({ table: state.table, cloth, meas: t });
    mesh.name = mesh.name || 'RectCloth';
    mesh.userData.paintable = true;
    mesh.userData.paintId = 'rectcloth';
    root.add(mesh);
    applyColor(mesh, state.paint?.rectcloth || prod.color);
   
}
else if (prod.type === 'roundcloth') {
    const cloth = { drop: Number(prod.drop || 0) };
    // 상판은 실제 테이블 지름(원형 기준 = min(x,z))
    const mesh = buildRoundCloth({ table: state.table, meas: t, cloth });
    mesh.name = mesh.name || 'RoundCloth';
    mesh.userData.paintable = true;
    mesh.userData.paintId = 'roundcloth';
    root.add(mesh);
    applyColor(mesh, state.paint?.roundcloth || prod.color);
  
}
else {
  console.warn('[updateScene] 알 수 없는 product.type —', prod);
}

  // 5) 루트 추가
  scene.add(root);
}
