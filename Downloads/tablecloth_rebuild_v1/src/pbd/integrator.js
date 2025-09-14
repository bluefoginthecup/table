/**
 * Verlet integration step with damping and air drag.
 */
export function integrate(grid, options, h){
  const {pos, prev, invm} = grid;
  const g = options.gravity;
  const damp = options.damping;
  const drag = Math.max(0, Math.min(1, options.airDrag));
  const dragScale = (1.0 - 0.3*drag);
  for (let i=0;i<invm.length;i++){
    if (invm[i]===0) continue;
    const i3 = i*3;
    const x = pos[i3], y=pos[i3+1], z=pos[i3+2];
    const px = prev[i3], py=prev[i3+1], pz=prev[i3+2];
    let vx = (x-px)*(1.0-damp)*dragScale;
    let vy = (y-py)*(1.0-damp)*dragScale;
    let vz = (z-pz)*(1.0-damp)*dragScale;
    prev[i3]=x; prev[i3+1]=y; prev[i3+2]=z;
    pos[i3]   = x + vx + g.x*h*h;
    pos[i3+1] = y + vy + g.y*h*h;
    pos[i3+2] = z + vz + g.z*h*h;
  }
}