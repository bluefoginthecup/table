// clothEdges.js — shared edge/thickness/hem builder for runner & tablecloth
// ESM module. Requires three r160+ via esm.sh or your bundler.
//
// Exported API:
//   buildSolidClothGeometry(shape:THREE.Shape, opts)
//   makeRectShape(w, h, cornerR=0)
//   makeRoundShape(diameter)
//
// opts = {
//   thickness: 0.2,      // cm
//   edgeBevel: 0.6,      // cm   (top/bottom rim roundness)
//   edgeSegments: 3,     // int  (rim smoothness)
//   hemBevel: 0.8,       // cm   (outer lower rim roundness for “sewn hem” look)
//   hemSegments: 3,      // int
//   curveSegments: 24,   // int  outline tesselation
//   materialGroups: true // set groups: 0=top,1=bottom,2=side
// }
//
// Usage (runner/tablecloth modules):
//   import { buildSolidClothGeometry, makeRectShape } from './clothEdges.js'
//   const shape = makeRectShape(width, length, cornerR)
//   const geom = buildSolidClothGeometry(shape, { thickness:0.2, edgeBevel:0.6, hemBevel:0.8 })
//
import * as THREE from 'https://esm.sh/three@0.160.0'

export function makeRectShape(width, height, cornerR = 0) {
  // width=x, height=y (cm). Centered at origin for convenience.
  const hw = width * 0.5
  const hh = height * 0.5
  const s = new THREE.Shape()
  if (cornerR <= 0) {
    s.moveTo(-hw, -hh)
    s.lineTo(hw, -hh)
    s.lineTo(hw, hh)
    s.lineTo(-hw, hh)
    s.lineTo(-hw, -hh)
    return s
  }
  const r = Math.min(cornerR, hw, hh)
  s.moveTo(-hw + r, -hh)
  s.lineTo(hw - r, -hh)
  s.quadraticCurveTo(hw, -hh, hw, -hh + r)
  s.lineTo(hw, hh - r)
  s.quadraticCurveTo(hw, hh, hw - r, hh)
  s.lineTo(-hw + r, hh)
  s.quadraticCurveTo(-hw, hh, -hw, hh - r)
  s.lineTo(-hw, -hh + r)
  s.quadraticCurveTo(-hw, -hh, -hw + r, -hh)
  return s
}

export function makeRoundShape(diameter) {
  const radius = diameter * 0.5
  const s = new THREE.Shape()
  s.absarc(0, 0, radius, 0, Math.PI * 2, false)
  return s
}

export function buildSolidClothGeometry(shape, opts = {}) {
  const thickness = n(opts.thickness, 0.2)
  const edgeBevel = n(opts.edgeBevel, 0.6)
  const edgeSegments = Math.max(0, (opts.edgeSegments|0) || 3)
  const hemBevel = n(opts.hemBevel, 0.8)
  const hemSegments = Math.max(0, (opts.hemSegments|0) || 3)
  const curveSegments = Math.max(8, (opts.curveSegments|0) || 24)
  const materialGroups = opts.materialGroups !== false

  // The idea: build a slightly inset top plate with standard bevel, then
  // extrude downward by thickness and add an extra lower outer bevel (hem look).
  // THREE.ExtrudeGeometry only supports a single bevel profile, so we emulate
  // the hem by doing two passes and merging: (A) edgeBevel rim, (B) a thin
  // skirt band with hemBevel at the lower edge.

  // Pass A: main solid with edgeBevel.
  const extrudeA = new THREE.ExtrudeGeometry(shape, {
    depth: thickness,           // along -Z by default, we will rotate later
    bevelEnabled: edgeBevel > 0,
    bevelSize: edgeBevel,
    bevelThickness: edgeBevel,
    bevelSegments: edgeSegments,
    curveSegments,
    steps: Math.max(1, Math.ceil(thickness / 0.1))
  })

  // Pass B: hem skirt — create a slightly *expanded* outline for the lower band
  // then extrude a very small depth with a larger bevel to fake the rolled hem.
  const hemScale = 1.0 + (hemBevel > 0 ? (hemBevel * 0.04) : 0) // small outward flare
  const hemShape = scaleShape(shape, hemScale)
  const hemDepth = Math.max(0.02, Math.min(thickness * 0.6, hemBevel * 0.6))
  const extrudeB = new THREE.ExtrudeGeometry(hemShape, {
    depth: hemDepth,
    bevelEnabled: hemBevel > 0,
    bevelSize: hemBevel,
    bevelThickness: hemBevel,
    bevelSegments: hemSegments,
    curveSegments,
    steps: Math.max(1, Math.ceil(hemDepth / 0.1))
  })

  // Transform: by default, Extrude extrudes +Z; we want +Y (thickness upward) with the top at Y=0.
  // We'll flip so that the *top* face is at Y=0 and the body goes downwards (negative Y) like real cloth depth.
  extrudeA.rotateX(-Math.PI / 2)
  extrudeB.rotateX(-Math.PI / 2)

  // Move B so that it attaches at the very bottom rim of A.
  extrudeB.translate(0, -thickness, 0)

  // Merge A and B.
  const merged = mergeGeometries([extrudeA, extrudeB])
  merged.computeVertexNormals()

  // Optional: assign material groups (top / bottom / side) for multi-materials.
  if (materialGroups) {
    // Reset groups and set one group for the whole geometry (single material by default)
    merged.clearGroups()
    merged.addGroup(0, Infinity, 0)
  }

  return merged
}

// ---------- helpers ----------
function n(v, d) { v = Number(v); return Number.isFinite(v) ? v : d }

function scaleShape(shape, k = 1) {
  if (k === 1) return shape
  const s = new THREE.Shape()
  const pts = shape.getPoints(64)
  for (let i = 0; i < pts.length; i++) {
    const p = pts[i]
    pts[i] = new THREE.Vector2(p.x * k, p.y * k)
  }
  s.setFromPoints(pts)
  return s
}

function mergeGeometries(geoms) {
  // Tiny BufferGeometryUtils replacement to avoid extra import.
  const g = new THREE.BufferGeometry()
  let pos = []
  let norm = []
  let idx = []
  let off = 0
  for (const gm of geoms) {
    gm.computeVertexNormals()
    const aPos = gm.getAttribute('position')
    const aNorm = gm.getAttribute('normal')
    const aIdx = gm.getIndex()
    for (let i = 0; i < aPos.count; i++) {
      pos.push(aPos.getX(i), aPos.getY(i), aPos.getZ(i))
      norm.push(aNorm.getX(i), aNorm.getY(i), aNorm.getZ(i))
    }
    if (aIdx) {
      for (let i = 0; i < aIdx.count; i++) idx.push(aIdx.getX(i) + off)
    } else {
      for (let i = 0; i < aPos.count; i++) idx.push(i + off)
    }
    off += aPos.count
  }
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
  g.setAttribute('normal', new THREE.Float32BufferAttribute(norm, 3))
  g.setIndex(idx)
  g.computeBoundingBox()
  g.computeBoundingSphere()
  return g
}
