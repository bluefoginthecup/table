import * as THREE from 'https://esm.sh/three@0.160.0';

export function buildRectTable({width,length,height,thick,color}){
  const g = new THREE.Group();

  // Top
  const top = new THREE.Mesh(new THREE.BoxGeometry(width, thick, length), new THREE.MeshStandardMaterial({color, roughness:.7, metalness:0.05}));
  top.position.set(0, height + thick/2, 0);
  g.add(top);

  // Legs (4)
  const legW = Math.min(width, length) * 0.05;
  const leg = new THREE.BoxGeometry(legW, height, legW);
  const mat = new THREE.MeshStandardMaterial({color: new THREE.Color(color).offsetHSL(0, -0.15, -0.1), roughness:.9});
  const offsX = (width/2 - legW/2 - 0.02);
  const offsZ = (length/2 - legW/2 - 0.02);
  const legPos = [
    [+offsX, height/2, +offsZ],
    [-offsX, height/2, +offsZ],
    [+offsX, height/2, -offsZ],
    [-offsX, height/2, -offsZ],
  ];
  for (const p of legPos){
    const m = new THREE.Mesh(leg, mat);
    m.position.set(p[0], p[1], p[2]);
    g.add(m);
  }
  return g;
}

export function buildRoundTable({diameter,height,thick,baseR,color}){
  const g = new THREE.Group();
  const radius = diameter/2;

  // Top
  const top = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, thick, 64), new THREE.MeshStandardMaterial({color, roughness:.7, metalness:0.05}));
  top.position.set(0, height + thick/2, 0);
  g.add(top);

  // Pedestal
  const poleR = Math.min(0.08, radius*0.25);
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(poleR*0.8, poleR, height, 32), new THREE.MeshStandardMaterial({color: new THREE.Color(color).offsetHSL(0,-0.15,-0.1), roughness:.9}));
  pole.position.set(0, height/2, 0);
  g.add(pole);

  // Base (round foot)
  const base = new THREE.Mesh(new THREE.CylinderGeometry(baseR, baseR*0.92, 0.05, 48), new THREE.MeshStandardMaterial({color: new THREE.Color(color).offsetHSL(0, -0.1,-0.2), roughness:.9}));
  base.position.set(0, 0.025, 0);
  g.add(base);

  return g;
}

export function pickTableMeshes(group){
  const meshes = [];
  group.traverse(obj=>{ if (obj.isMesh) meshes.push(obj); });
  return meshes;
}
