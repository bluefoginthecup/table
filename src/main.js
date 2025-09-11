// Entry: wire everything up
import { initThree } from './core/threeSetup.js';
import { startLoop, stopLoop } from './core/lifecycle.js';
import { store } from './core/store.js';
import { updateScene } from './systems/updateScene.js';
import { bindControls } from './ui/controls.js';
import { runSelfTests, renderTestList } from './systems/tests.js';

const appEl = document.getElementById('app');

const three = initThree({ mount: appEl });

function renderAll() {
  const s = store.get();
  console.log('[renderAll] table.height =', s.table?.height, s.table, 'product =', s.product);
  updateScene(three.scene, store);
}

bindControls(store, renderAll, () => {
  const results = runSelfTests(three.scene);
  renderTestList(results);
});


// ✅ 새 UI → 스토어 바인딩
window.addEventListener('ui:apply', (e) => {
  const { table, product } = e.detail || {};

  // store 구조에 맞춰 머지(예: store.table, store.product 사용)
  // 이미 store가 존재하니, 최소 변경으로 값만 갱신
  store.table = table;
  store.product = product;

  // 필요 시: 3D 갱신
  renderAll();
});


// first render
renderAll();
startLoop(three);

window.__TableApp = { three, store, renderAll, stop: () => stopLoop(three) };
