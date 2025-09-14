// Simple panel descriptors used to seed a cloth grid.
// Each function returns an object { shape:'rect'|'hex'|'round', params:{...} }
// type: 'rect' | 'hex' | 'round'  (round = 둥근 팁)
export function makeRunnerPanel(type, width, length, topY, tipLenRatio = 0.25){
  if (type === 'rect') {
    return { shape:'rect', params:{ width, length, topY } };
  }
  // 'runner' 전용 도형으로 생성 (cap: 'hex' | 'round')
  const cap = (type === 'round') ? 'round' : 'hex';
  return { shape:'runner', params:{ width, length, topY, cap, tipLenRatio } };
}


export function makeRectClothPanel(width, length, topY){
  return { shape:'rect', params:{ width, length, topY } };
}
export function makeRoundClothPanel(diameter, topY){
  return { shape:'round', params:{ radius: diameter*0.5, topY } };
}

