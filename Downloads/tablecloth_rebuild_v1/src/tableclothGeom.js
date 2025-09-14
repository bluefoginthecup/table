import * as THREE from 'https://esm.sh/three@0.160.0';

export function buildRectClothGeom({ width, length }) {
  const geom = new THREE.PlaneGeometry(width, length, 1, 1);
  geom.rotateX(-Math.PI / 2); // 상단이 Y+, 평면이 XZ가 되도록 (선택)
  geom.userData.shape = { shape: 'rect', params: { width, length } };
  return geom;
}

export function buildRoundClothGeom({ diameter }) {
  const r = diameter * 0.5;
  const shape = new THREE.Shape();
  shape.absarc(0, 0, r, 0, Math.PI * 2);
  const extr = new THREE.ShapeGeometry(shape, 64);
  extr.rotateX(-Math.PI / 2);
  extr.userData.shape = { shape: 'round', params: { radius: r } };
  return extr;
}
