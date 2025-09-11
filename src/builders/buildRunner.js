import * as THREE from 'three';

// Placeholder runner: a thin plane above the table.
// TODO: replace with segmented geometry + drop/edge fold algorithm.
export function buildRunner(state) {
  const { length, width } = state.runner;
  const { height } = state.table;

  const geo = new THREE.PlaneGeometry(length, width, 10, 1);
  const mat = new THREE.MeshStandardMaterial({
    color: 0x3366aa, roughness: 0.7, metalness: 0.0, side: THREE.DoubleSide
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.y = height + 0.6;
  mesh.name = 'Runner';
  return mesh;
}
