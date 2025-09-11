// src/ui/paint.js
import * as THREE from 'three';

export function bindPaint(three, store, renderAll) {
  const wheel = document.getElementById('colorWheel');
  const vSlider = document.getElementById('wheelV');
  const swatch = document.getElementById('paintSwatch');
  const statusEl = document.getElementById('paintStatus');

  if (!wheel || !vSlider) return; // UI 없으면 종료

  const ctx = wheel.getContext('2d');
  const W = wheel.width, H = wheel.height;
  const CX = W / 2, CY = H / 2, R = Math.min(CX, CY) - 1;

  // 현재 선택 색(HSV)
  const state = {
    h: 30 / 360,  // 0~1
    s: 0.8,       // 0~1
    v: (Number(vSlider.value) || 85) / 100,
    hex: '#ffcc66'
  };

  // ===== 색상환 그리기 =====
  function drawWheel() {
    // 바탕: HS 원 (V=1)
    const image = ctx.createImageData(W, H);
    const data = image.data;
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const dx = x - CX, dy = y - CY;
        const rr = Math.sqrt(dx*dx + dy*dy);
        const idx = (y*W + x) * 4;
        if (rr > R) { data[idx+3] = 0; continue; }
        const h = (Math.atan2(dy, dx) / (2*Math.PI) + 1) % 1; // 0~1
        const s = Math.min(rr / R, 1);
        const { r, g, b } = hsv2rgb(h, s, 1);
        data[idx] = r; data[idx+1] = g; data[idx+2] = b; data[idx+3] = 255;
      }
    }
    ctx.putImageData(image, 0, 0);
    drawCursor();
  }

  function drawCursor() {
    // 선택 지점 표시(작은 원)
    const x = CX + Math.cos(state.h * 2*Math.PI) * state.s * R;
    const y = CY + Math.sin(state.h * 2*Math.PI) * state.s * R;
    ctx.save();
    ctx.beginPath();
    ctx.arc(x, y, 6, 0, Math.PI*2);
    ctx.lineWidth = 2;
    ctx.strokeStyle = 'white';
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(x, y, 7.5, 0, Math.PI*2);
    ctx.strokeStyle = 'rgba(0,0,0,0.45)';
    ctx.stroke();
    ctx.restore();
  }

  function setHSV(h, s, v) {
    state.h = THREE.MathUtils.clamp(h, 0, 1);
    state.s = THREE.MathUtils.clamp(s, 0, 1);
    state.v = THREE.MathUtils.clamp(v, 0, 1);
    const { r, g, b } = hsv2rgb(state.h, state.s, state.v);
    state.hex = rgbToHex(r, g, b);
    swatch && (swatch.style.background = state.hex);
    // 휠 커서 갱신
    ctx.clearRect(0,0,W,H);
    drawWheel();
  }

  // 초기 그리기
  drawWheel();
  swatch && (swatch.style.background = state.hex);

  // 밝기 변경
  vSlider.addEventListener('input', () => {
    const v = (Number(vSlider.value) || 85) / 100;
    setHSV(state.h, state.s, v);
  });

  // 휠 조작
  let dragging = false;
  function onPointer(e) {
    const rect = wheel.getBoundingClientRect();
    const x = e.clientX - rect.left, y = e.clientY - rect.top;
    const dx = x - CX, dy = y - CY;
    const rr = Math.sqrt(dx*dx + dy*dy);
    if (rr > R + 2) return;
    const h = (Math.atan2(dy, dx) / (2*Math.PI) + 1) % 1;
    const s = Math.min(rr / R, 1);
    setHSV(h, s, state.v);
  }
  wheel.addEventListener('pointerdown', (e) => { dragging = true; onPointer(e); });
  window.addEventListener('pointermove', (e) => { if (dragging) onPointer(e); });
  window.addEventListener('pointerup',   () => { dragging = false; });

  // ===== 클릭-페인트 + 스포이드 + 하이라이트 =====
  const raycaster = new THREE.Raycaster();
  const mouseNDC = new THREE.Vector2();
  let highlighted = null;

  // 하이라이트 적용/해제(에미시브)
  function applyHighlight(group, on) {
    if (!group) return;
    group.traverse((n) => {
      if (n.isMesh && n.material && 'emissive' in n.material) {
        if (!n.material.__clonedForPaint) {
          n.material = n.material.clone();
          n.material.__clonedForPaint = true;
        }
        if (on) {
          if (!n.material.__savedEmi) {
            n.material.__savedEmi = { c: n.material.emissive.clone(), i: n.material.emissiveIntensity ?? 1 };
          }
          n.material.emissive.setHex(0xffffff);
          n.material.emissiveIntensity = 0.25;
          n.material.needsUpdate = true;
        } else if (n.material.__savedEmi) {
          n.material.emissive.copy(n.material.__savedEmi.c);
          n.material.emissiveIntensity = n.material.__savedEmi.i;
          n.material.needsUpdate = true;
        }
      }
    });
  }

  function setStatus(group) {
    const id = group?.userData?.paintId || inferPaintId(group?.name);
    const label = id ? labelById(id) : '없음';
    if (statusEl) statusEl.textContent = `선택: ${label}`;
  }

  // 렌더러 캔버스
  const canvas =
    three?.renderer?.domElement ||
    document.querySelector('#app canvas') ||
    document.querySelector('canvas');

  if (!canvas) return;

  canvas.addEventListener('pointerdown', (e) => {
    // 레이캐스트
    const rect = canvas.getBoundingClientRect();
    mouseNDC.set(
      ((e.clientX - rect.left) / rect.width) * 2 - 1,
      -((e.clientY - rect.top) / rect.height) * 2 + 1
    );
    const camera = three?.camera;
    if (!camera) return;
    raycaster.setFromCamera(mouseNDC, camera);
    const hits = raycaster.intersectObjects(three.scene.children, true);
    if (!hits.length) return;

    // paintable 그룹까지 승격
    let node = hits[0].object;
    while (node && node !== three.scene) {
      if (node.userData?.paintable || /Runner|RectCloth|RoundCloth|Table/i.test(node.name)) break;
      node = node.parent;
    }
    if (!node || node === three.scene) return;

    // 하이라이트 갱신
    if (highlighted && highlighted !== node) applyHighlight(highlighted, false);
    highlighted = node;
    applyHighlight(highlighted, true);
    setStatus(highlighted);

    if (e.altKey) {
      // ===== 스포이드: 클릭한 오브젝트의 현재 색을 색상환에 반영
      const hex = pickGroupColor(node) || '#ffffff';
      const { h, s, v } = hexToHSV(hex);
      vSlider.value = String(Math.round(v * 100));
      setHSV(h, s, v);
      return; // 칠하지 않음
    }

    // ===== 페인트: 현재 색상환 색을 적용
    applyColorToGroup(node, state.hex);

    // store에 저장 (엔진 v1/v2 공통 유지)
    const paintId = node.userData?.paintId || inferPaintId(node.name);
    if (paintId) {
      const next = Object.assign({}, store.get().paint || {}, { [paintId]: state.hex });
      store.set({ paint: next });
    }

    renderAll?.();
  }, { passive: true });
}

/* ---------- 유틸들 ---------- */

function applyColorToGroup(group, hex) {
  const col = new THREE.Color(hex);
  group.traverse((n) => {
    if (n.isMesh && n.material && n.material.color) {
      if (!n.material.__clonedForPaint) {
        n.material = n.material.clone();
        n.material.__clonedForPaint = true;
      }
      n.material.color.copy(col);
      n.material.needsUpdate = true;
    }
  });
}

function pickGroupColor(group) {
  // 첫 Mesh의 color를 대표색으로 사용
  let hex = null;
  group.traverse((n) => {
    if (!hex && n.isMesh && n.material && n.material.color) {
      hex = '#' + n.material.color.getHexString();
    }
  });
  return hex;
}

function inferPaintId(name = '') {
  if (/Runner/i.test(name)) return 'runner';
  if (/RectCloth/i.test(name)) return 'rectcloth';
  if (/RoundCloth/i.test(name)) return 'roundcloth';
  if (/Table/i.test(name)) return 'table';
  return null;
}
function labelById(id) {
  return ({ table:'테이블', runner:'러너', rectcloth:'사각 테이블보', roundcloth:'원탁 테이블보' }[id]) || id;
}

// --- 색 변환 ---
function hsv2rgb(h, s, v) {
  const i = Math.floor(h * 6);
  const f = h * 6 - i;
  const p = v * (1 - s);
  const q = v * (1 - f * s);
  const t = v * (1 - (1 - f) * s);
  let r, g, b;
  switch (i % 6) {
    case 0: r=v; g=t; b=p; break;
    case 1: r=q; g=v; b=p; break;
    case 2: r=p; g=v; b=t; break;
    case 3: r=p; g=q; b=v; break;
    case 4: r=t; g=p; b=v; break;
    case 5: r=v; g=p; b=q; break;
  }
  return { r: Math.round(r*255), g: Math.round(g*255), b: Math.round(b*255) };
}
function rgbToHex(r,g,b) {
  return '#' + [r,g,b].map(x => x.toString(16).padStart(2,'0')).join('');
}
function hexToHSV(hex) {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!m) return { h:0, s:0, v:0 };
  const r = parseInt(m[1],16)/255, g=parseInt(m[2],16)/255, b=parseInt(m[3],16)/255;
  const max = Math.max(r,g,b), min = Math.min(r,g,b);
  let h, s, v = max;
  const d = max - min;
  s = max === 0 ? 0 : d / max;
  if (max===min) h = 0;
  else {
    switch (max) {
      case r: h = (g-b)/d + (g<b?6:0); break;
      case g: h = (b-r)/d + 2; break;
      case b: h = (r-g)/d + 4; break;
    }
    h /= 6;
  }
  return { h, s, v };
}
