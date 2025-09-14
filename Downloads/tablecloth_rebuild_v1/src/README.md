# PBD Cloth Split

This splits the original `pbd.js` into modular files:

- `grid.js` — shape grids (`runner`, `rect`, `round`)
- `constraints.js` — structural/shear/bending constraint builder
- `integrator.js` — Verlet integration with damping/air drag
- `collisions.js` — support/tabletop contact & side pushout
- `ClothSimulator.js` — orchestrator class

## Usage (ES Modules)
```html
<script type="module">
  import * as THREE from 'https://esm.sh/three@0.160.0';
  import { ClothSimulator, buildGrid } from './ClothSimulator.js';

  // 1) build grid
  const topY = 0.75 + 0.02; // example
  const grid = buildGrid(
    { shape:'runner', params:{ width:0.35, length:2.0, cap:'hex', tipLenRatio:0.25 } },
    64,
    topY
  );

  // 2) simulator
  const sim = new ClothSimulator(grid, {
    support: { type:'rect', topY:0.75, halfW:0.40, halfL:0.90 },
    tabletop:{ type:'rect', topY:0.75, halfW:0.40, halfL:0.90 },
    thickness: 0.002
  });

  // 3) step
  function animate(){
    sim.step(1/60);
    requestAnimationFrame(animate);
  }
  animate();
</script>
```