// very small reactive store
const listeners = new Set();

// ✅ 새 스키마: table + product
// - table: { shape:'rect'|'round', width,length,diameter?, height }
// - product: { type:'runner'|'rectcloth'|'roundcloth', w?, l?, d?, drop? }
const _state = {
  table: { shape: 'rect', width: 60, length: 180, height: 75 }, // 원탁이면 diameter 사용
  product: { type: 'runner', w: 24, l: 210, drop: 15 },
  paint: {} // runner/rectcloth/roundcloth 색 저장
};

export const store = {
  get: () => structuredClone(_state),
  set(patch) {
    if (patch.table) Object.assign(_state.table, patch.table);
    if (patch.product) Object.assign(_state.product, patch.product);
    if (patch.paint) Object.assign(_state.paint, patch.paint);
     listeners.forEach(fn => fn(store.get()));
  },
  subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); }
};
