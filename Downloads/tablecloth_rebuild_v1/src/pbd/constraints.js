/**
 * Build structural, shear, and bending constraints.
 */
export function buildConstraints(grid, bendWeight){
  const cons = [];
  const nx=grid.nx, nz=grid.nz;
  function add(a,b, w){ cons.push({a,b,rest: dist(a,b), w}); }
  function dist(i,j){
    const ia=i*3, jb=j*3;
    const dx = grid.pos[ia]-grid.pos[jb];
    const dy = grid.pos[ia+1]-grid.pos[jb+1];
    const dz = grid.pos[ia+2]-grid.pos[jb+2];
    return Math.hypot(dx,dy,dz);
  }
  for (let iz=0; iz<nz; iz++){
    for (let ix=0; ix<nx; ix++){
      const i = iz*nx+ix;
      if (!grid.mask[i]) continue;
      // structural
      if (ix+1<nx && grid.mask[i+1]) add(i, i+1, 1.0);
      if (iz+1<nz && grid.mask[i+nx]) add(i, i+nx, 1.0);
      // shear
      if (ix+1<nx && iz+1<nz && grid.mask[i+1+nx]) add(i, i+1+nx, 0.9);
      if (ix>0 && iz+1<nz && grid.mask[i-1+nx]) add(i, i-1+nx, 0.9);
      // bending (two apart)
      if (ix+2<nx && grid.mask[i+2]) add(i, i+2, bendWeight);
      if (iz+2<nz && grid.mask[i+2*nx]) add(i, i+2*nx, bendWeight);
    }
  }
  return cons;
}