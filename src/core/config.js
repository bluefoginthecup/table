// 런타임 플래그 (URL ?engine= , localStorage 'engine')
export const flags = {
  get engine() {
    const url = new URL(window.location.href);
    const q = url.searchParams.get('engine');
    const ls = localStorage.getItem('engine');
    return (q || ls || 'v1').toLowerCase(); // 기본 v1
  }
};

// 런타임으로 엔진 바꾸기 (옵션: URL 갱신/로컬 저장)
export function setEngine(val, { persist = true, updateUrl = false } = {}) {
  const v = String(val).toLowerCase();
  if (persist) localStorage.setItem('engine', v);
  if (updateUrl) {
    const u = new URL(window.location.href);
    u.searchParams.set('engine', v);
    history.replaceState(null, '', u);
  }
  window.dispatchEvent(new CustomEvent('engine:changed', { detail: { engine: v } }));
}
