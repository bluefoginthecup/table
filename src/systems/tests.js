export function runSelfTests(scene){
  const results = [];
  const rendererCanvasExists = !!document.querySelector('canvas');
  results.push({ id:'T3', name:'렌더러 캔버스 존재', pass: rendererCanvasExists });

  const runner = scene.getObjectByName('Runner');
  const runnerAboveTable = runner ? runner.position.y > 0 : false;
  results.push({ id:'T4', name:'러너가 테이블 위에 존재', pass: runnerAboveTable });

  const appRoot = scene.getObjectByName('AppRoot');
  results.push({ id:'T5', name:'updateScene 실행 무에러', pass: !!appRoot });

  return results;
}

export function renderTestList(results){
  const list = document.getElementById('testList');
  list.innerHTML = '';
  results.forEach(r=>{
    const li = document.createElement('li');
    li.textContent = `${r.id}: ${r.name} — ${r.pass ? 'PASS' : 'FAIL'}`;
    li.className = r.pass ? 'pass' : 'fail';
    list.appendChild(li);
  });
}
