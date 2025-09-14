/**
 * Collision & contact:
 * 1) Support plane (stick & slide with friction)
 * 2) Table side pushout (thickness-aware)
 */
export function collide(grid, options){
  const s = options.support;
  const t = options.tabletop;
  if (!s || !t) return;
  const {pos, prev, invm} = grid;
  const thickness = Math.max(0.0005, options.thickness || 0.002);

  // 1) Support plane (+expanded): stick & slide with friction
  for (let i=0;i<invm.length;i++){
    if (invm[i]===0) continue;
    const i3=i*3;
    const x=pos[i3], y=pos[i3+1], z=pos[i3+2];
    let inside=false;
    if (s.type==='rect'){
      inside = (Math.abs(x)<=s.halfW && Math.abs(z)<=s.halfL);
    } else {
      inside = (x*x+z*z <= s.radius*s.radius);
    }
    if (inside && y < s.topY){
      pos[i3+1] = s.topY;
      prev[i3+1] = s.topY;
      const mu = (options.surfaceFriction ?? 0.7);
      const tx = pos[i3]-prev[i3];
      const tz = pos[i3+2]-prev[i3+2];
      prev[i3]   = pos[i3]   - tx*(1.0 - mu);
      prev[i3+2] = pos[i3+2] - tz*(1.0 - mu);
    }
  }

  // 2) Table side pushout by thickness
  for (let i=0;i<invm.length;i++){
    if (invm[i]===0) continue;
    const i3=i*3;
    let x=pos[i3], y=pos[i3+1], z=pos[i3+2];
    const topY = t.topY;
    if (t.type==='rect'){
      const hw=t.halfW, hl=t.halfL;
      if (y<=topY+1e-5){
        if (Math.abs(x)<hw && Math.abs(z)<hl){
          const px = Math.max(-hw, Math.min(hw, x));
          const pz = Math.max(-hl, Math.min(hl, z));
          let dx = x-px, dz = z-pz;
          const len = Math.hypot(dx,dz)||1e-6;
          if (len>0){
            const nx = dx/len, nz = dz/len;
            pos[i3] = px + nx*thickness;
            pos[i3+2] = pz + nz*thickness;
          }
        }
      }
    } else {
      const r = t.radius;
      if (y<=topY+1e-5){
        const rr = Math.hypot(x,z);
        if (rr<r){
          const nx = x/(rr||1e-6), nz=z/(rr||1e-6);
          pos[i3]=nx*(r+thickness);
          pos[i3+2]=nz*(r+thickness);
        }
      }
    }
  }
}