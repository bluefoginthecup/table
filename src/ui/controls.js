// src/ui/controls.js
// 새 UI 입력값 → store.set(...) → renderAll() 연동

export function bindControls(store, renderAll, runTestsCb) {
  const $ = (s) => document.querySelector(s);
  const on = (sel, evt, fn) => {
    const el = $(sel);
    if (!el) return false;
    el.addEventListener(evt, fn);
    return true;
  };

  // --- 요소 참조 ---
  const tableShape   = $('#tableShape');
  const tblW         = $('#tblW');
  const tblL         = $('#tblL');
  const tblD         = $('#tblD');
  const tblH         = $('#tblH');
  const tableColor   = $('#tableColor');

  const runnerW      = $('#runnerW');
  const runnerL      = $('#runnerL');
  const runnerDrop   = $('#runnerDrop');
  const $$ = (sel) => Array.from(document.querySelectorAll(sel));

  const runnerShapeRadios = $$('input[name="runnerShape"]');
  const runnerTip     = $('#runnerTip');
  const runnerHexOpts = $('#runnerHexOpts');

 const getRunnerShape = () => {
   let v = 'rect';
   runnerShapeRadios.forEach(r => { if (r.checked) v = r.value; });
   return v;
 };
 // 모양 바뀌면 팁 입력 표시/숨김
 runnerShapeRadios.forEach(r => r.addEventListener('change', () => {
   const isHex = getRunnerShape() === 'hex';
   runnerHexOpts && runnerHexOpts.classList.toggle('hidden', !isHex);
 }));

  const rectClothW   = $('#rectClothW');
  const rectClothL   = $('#rectClothL');
  const rectDrop     = $('#rectDrop');

   // 사용자가 직접 수정했는지 추적 (오토 채움 덮어쓰기 방지)
 let rectWDirty = false;
 let rectLDirty = false;


  const roundClothD  = $('#roundClothD');
  const roundDrop    = $('#roundDrop');

  const calcBtn      = $('#calcBtn');
  const applyBtn     = $('#applyBtn');
  const resetBtn     = $('#resetBtn');
  const calcMsg      = $('#calcMsg');
  const prodRadios   = Array.from(document.querySelectorAll('input[name="prod"]'));

  // 유틸
  const num = (v) => {
    const n = Number(v);
    return Number.isFinite(n) ? n : NaN;
  };
  const selProd = () => prodRadios.find(r => r.checked)?.value || 'runner';

 
   // 사각 테이블보 기본값 자동 채움
 function setRectClothDefaults(opts = {}) {
   const { force = false } = opts;
   const shape = (tableShape && tableShape.value === 'round') ? 'round' : 'rect';
   if (shape !== 'rect') return; // 직사각 테이블일 때만 계산

   const tW = num(tblW && tblW.value);
   const tL = num(tblL && tblL.value);
   const drop = num(rectDrop && rectDrop.value);
   if (!Number.isFinite(tW) || !Number.isFinite(tL) || !Number.isFinite(drop)) return;

   const cw = Math.round(tW + drop * 2);
   const cl = Math.round(tL + drop * 2);

   // force면 강제 채움, 아니면 사용자가 수정하지 않은 필드만 채움
   if (rectClothW && (force || (!rectWDirty && (rectClothW.value === '' || !Number.isFinite(num(rectClothW.value)))))) {
     rectClothW.value = String(cw);
   }
   if (rectClothL && (force || (!rectLDirty && (rectClothL.value === '' || !Number.isFinite(num(rectClothL.value)))))) {
     rectClothL.value = String(cl);
   }
}
 // 러너 기본 placeholder 갱신(폭=ceil(W*0.4), 길이=round(L+30))
  function setRunnerPlaceholders() {
    const W = num(tblW?.value);
    const L = num(tblL?.value);
    if (runnerW && Number.isFinite(W)) runnerW.placeholder = String(Math.ceil(W * 0.4));
    if (runnerL && Number.isFinite(L)) runnerL.placeholder = String(Math.round(L + 30));
  }
 // 사용자 입력시 dirty 플래그 설정
 if (rectClothW) rectClothW.addEventListener('input', () => { rectWDirty = true; });
 if (rectClothL) rectClothL.addEventListener('input', () => { rectLDirty = true; });



  function calculate() {
  const shape = (tableShape && tableShape.value === 'round') ? 'round' : 'rect';
  const prod  = selProd();

  const tW = num(tblW && tblW.value);
  const tL = num(tblL && tblL.value);
  const tD = num(tblD && tblD.value);
  const tH = num(tblH && tblH.value) || 75;   


  const readOrPh = (el, fallback) => {
    if (!el) return fallback;
    const v = (el.value || '').trim();
    if (v !== '') return num(v);
    if (el.placeholder) return num(el.placeholder);
    return fallback;
  };

  // ⛳ W030 회피: 단축평가 대신 if
  if (calcMsg) { calcMsg.textContent = ''; }

  if (prod === 'runner') {
    const drop = num(runnerDrop && runnerDrop.value) || 0;
    let rw = readOrPh(runnerW, Number.isFinite(tW) ? Math.ceil(tW * 0.4) : NaN);
    let rl = readOrPh(runnerL, Number.isFinite(tL) ? Math.round(tL + 30) : NaN);
     const rshape = getRunnerShape();              // 'rect' | 'hex'
     const rtip   = num(runnerTip?.value);         // cm (hex 전용, NaN이면 undefined)



    const msg = `러너 완성 사이즈는 ${rw} × ${rl} cm 입니다.` + (drop > 0 ? ` 테이블 밖으로 ${drop}cm 씩 떨어집니다.` : '');
    if (calcMsg) { calcMsg.textContent = msg; } // ⛳ W030 회피

    // ⛳ W014 회피: 삼항을 한 줄/괄호로
    return {
      table: (shape === 'rect') 
      ? { shape, width: tW, length: tL , height: tH} 
      : { shape, diameter: tD, height: tH},
      product: { type: 'runner', w: rw, l: rl, drop, rshape, rtip }
      
    };
  }

  if (prod === 'rectcloth') {
    const drop = num(rectDrop && rectDrop.value) || 0;
    let cw = readOrPh(rectClothW, Number.isFinite(tW) ? tW + drop * 2 : NaN);
    let cl = readOrPh(rectClothL, Number.isFinite(tL) ? tL + drop * 2 : NaN);

    const msg = `사각 테이블보 완성 사이즈는 ${cw} × ${cl} cm 입니다. 테이블 밖으로 ${drop}cm 씩 떨어집니다.`;
    if (calcMsg) { calcMsg.textContent = msg; } // ⛳ W030 회피

    return {
      table: (shape === 'rect') 
      ? { shape, width: tW, length: tL , height: tH} 
      : { shape, diameter: tD , height: tH},
      product: { type: 'rectcloth', w: cw, l: cl, drop }
    };
  }

  if (prod === 'roundcloth') {
    const drop = num(roundDrop && roundDrop.value) || 0;
    let cd = readOrPh(roundClothD, Number.isFinite(tD) ? tD + drop * 2 : NaN);

    const msg = `원탁보 완성 지름은 ${cd} cm 입니다. 테이블 밖으로 ${drop}cm 씩 떨어집니다.`;
    if (calcMsg) { calcMsg.textContent = msg; } // ⛳ W030 회피

    return {
      table: (shape === 'rect') 
      ? { shape, width: tW, length: tL } 
      : { shape, diameter: tD },
      product: { type: 'roundcloth', d: cd, drop }
    };
  }

  return null;
}

  // === [추가] 그룹 엘리먼트 ===
const rectTableGroup = document.querySelector('#rectTableGroup');
const roundTableGroup = document.querySelector('#roundTableGroup');
const runnerGroup     = document.querySelector('#runnerGroup');
const rectClothGroup  = document.querySelector('#rectClothGroup');
const roundClothGroup = document.querySelector('#roundClothGroup');

// === [추가] 토글 헬퍼 ===
const toggle = (el, show) => {
  if (!el) return;
  el.classList.toggle('hidden', !show);
};

// === [추가] 테이블 형태(직사각/원탁) UI 토글 ===
function updateTableShapeUI() {
  const shape = (tableShape && tableShape.value === 'round') ? 'round' : 'rect';
  toggle(rectTableGroup,  shape === 'rect');
  toggle(roundTableGroup, shape === 'round');
  setRunnerPlaceholders(); // 러너 placeholder도 함께 갱신
}

// === [추가] 제작 선택(러너/사각보/원탁보) UI 토글 ===
function updateProdUI() {
  const p = selProd(); // 'runner' | 'rectcloth' | 'roundcloth'
  toggle(runnerGroup,     p === 'runner');
  toggle(rectClothGroup,  p === 'rectcloth');
  toggle(roundClothGroup, p === 'roundcloth');
  if (p === 'rectcloth') {
     // 사각 테이블보 선택 시 기본값을 보이도록 강제 채움
     setRectClothDefaults({ force: true });
   }
}

// === [추가] 이벤트 바인딩 ===
if (tableShape) tableShape.addEventListener('change', updateTableShapeUI);
prodRadios.forEach(r => r.addEventListener('change', updateProdUI));

// === [추가] 초기 상태 반영 ===
updateTableShapeUI();
updateProdUI();

  

  // 이벤트 바인딩
  // 1) 계산 미리보기
  on('#calcBtn', 'click', () => {
    calculate();
  });

  // 2) 적용(3D): store.set(...) 후 renderAll()
  on('#applyBtn', 'click', () => {
    const res = calculate();
    if (!res) return;
     console.log('[apply] table=', res.table); // ← 확인용

    // store에 반영
    store.set({
      table:   res.table,
      product: res.product
    });


  // ✅ 테이블 색상도 저장 (paint 맵에 병합됨)
 const hex = tableColor?.value;
 if (hex) store.set({ paint: { table: hex } });


    // 3D 갱신
    renderAll();
  });

  // 3) 리셋은 UI 스크립트/마크업에 따라 동작이 다를 수 있으니 렌더만 동기화
  on('#resetBtn', 'click', () => {
    // 필요한 경우 store 초기화 로직 추가 가능
    rectWDirty = rectLDirty = false;  // 오토 채움 다시 가능
   // 값 초기화 후 기본값 강제 채움
   if (rectClothW) rectClothW.value = '';
   if (rectClothL) rectClothL.value = '';
   setRectClothDefaults({ force: true });
   
    renderAll();
  });

  // 4) 입력 변화 시 러너 placeholder 갱신(직사각 테이블일 때)
  if (tblW) tblW.addEventListener('input', setRunnerPlaceholders);
  setRectClothDefaults(); // 테이블 폭 바뀌면 사각보 기본값 갱신
  if (tblL) tblL.addEventListener('input', setRunnerPlaceholders);
  setRectClothDefaults(); // 테이블 폭 바뀌면 사각보 기본값 갱신
  if (tableShape) tableShape.addEventListener('change', setRunnerPlaceholders);
setRectClothDefaults({ force: true }); // 형태 전환 시 강제 채움
 // 드롭 바뀌면 사각보 기본값 갱신
 if (rectDrop) rectDrop.addEventListener('input', () => {
   setRectClothDefaults();
 }); 


  // 5) (선택) 테스트 버튼 호환
  const runTestsBtn = document.querySelector('#runTestsBtn');
  if (runTestsBtn && typeof runTestsCb === 'function') {
    runTestsBtn.addEventListener('click', () => runTestsCb());
  }

  // 초기 placeholder 세팅
  setRunnerPlaceholders();
  setRectClothDefaults({ force: true }); // 초기에도 기본값 넣어 보여주기
}
