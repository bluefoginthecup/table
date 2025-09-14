import * as THREE from 'https://esm.sh/three@0.160.0';
import { buildGrid } from './grid.js';
import { buildConstraints } from './constraints.js';
import { integrate } from './integrator.js';
import { collide } from './collisions.js';

/**
 * Lightweight PBD cloth simulator orchestrator.
 */
export class ClothSimulator{
  constructor(grid, opts){
    this.grid = grid;
    this.options = Object.assign({
      gravity: new THREE.Vector3(0, -9.8, 0),
      iterations: 16,
      substeps: 4,
      damping: 0.06,
      airDrag: 0.5,            // 0..1 (0.5 권장)
      surfaceFriction: 0.75,   // 0..1 (마찰)
      bendWeight: 0.35,        // bending 제약 가중치
      strainMin: 0.88,         // 최소/최대 변형율
      strainMax: 1.12,
      thickness: 0.002,        // m (측면 pushout)
      support: null,           // {type:'rect'|'round', topY, halfW, halfL, radius, hover, expand}
      tabletop: null           // {type:'rect'|'round', topY, halfW, halfL, radius}
    }, opts || {});
    this.cons = buildConstraints(grid, this.options.bendWeight);
  }

  dispose(){ this.grid.geometry.dispose(); }
  static makeGridForShape(shape, res, topY){ return buildGrid(shape, res, topY); }

  step(dt, onUpdate){
    const sub = this.options.substeps|0;
    const h = dt / Math.max(1, sub);
    for (let k=0; k<sub; k++){
      integrate(this.grid, this.options, h);
      for (let it=0; it<this.options.iterations; it++){
        this._solveConstraints();
        collide(this.grid, this.options);
      }
    }
    const posAttr = this.grid.geometry.getAttribute('position');
    posAttr.array.set(this.grid.pos);
    this.grid.geometry.computeVertexNormals();
    if (onUpdate) onUpdate(this.grid.geometry);
  }

  _solveConstraints(){
    const {pos, invm} = this.grid;
    const smin = this.options.strainMin;
    const smax = this.options.strainMax;
    for (const c of this.cons){
      const a = c.a, b=c.b;
      if (invm[a]===0 && invm[b]===0) continue;
      const a3=a*3, b3=b*3;
      const ax=pos[a3], ay=pos[a3+1], az=pos[a3+2];
      const bx=pos[b3], by=pos[b3+1], bz=pos[b3+2];
      let dx=bx-ax, dy=by-ay, dz=bz-az;
      let len = Math.hypot(dx,dy,dz) || 1e-6;

      const rest = c.rest;
      let target = len;
      const minL = rest * smin;
      const maxL = rest * smax;
      if (len < minL) target = minL;
      else if (len > maxL) target = maxL;

      const diff = (len - target)/len;   // +: too long, -: too short
      const w1 = invm[a], w2=invm[b], wsum = w1+w2 || 1e-6;
      const k = (c.w ?? 1.0)*0.5;        // stiffness
      const cx = dx * (k*diff);
      const cy = dy * (k*diff);
      const cz = dz * (k*diff);
      if (w1>0){ pos[a3]   +=  cx*(w1/wsum); pos[a3+1] += cy*(w1/wsum); pos[a3+2] += cz*(w1/wsum); }
      if (w2>0){ pos[b3]   -=  cx*(w2/wsum); pos[b3+1] -= cy*(w2/wsum); pos[b3+2] -= cz*(w2/wsum); }
    }
  }
  
}

export { buildGrid }; // optional re-export for convenience