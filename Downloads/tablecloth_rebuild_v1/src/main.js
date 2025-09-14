import * as THREE from 'https://esm.sh/three@0.160.0';
import { OrbitControls } from 'https://esm.sh/three@0.160.0/examples/jsm/controls/OrbitControls.js';
import { buildRectTable, buildRoundTable, pickTableMeshes } from './table.js';
//import { ClothSimulator } from './2pbd.js';
import { makeRunnerPanel, makeRectClothPanel, makeRoundClothPanel } from './panels.js';
import { buildRunnerGeometry } from './runnerGeom.js';
import { buildRectClothGeom, buildRoundClothGeom } from './tableclothGeom.js';
import { ClothSimulator} from './pbd/ClothSimulator.js';


// --- renderer & scene ---
const canvas = document.getElementById('three');
const renderer = new THREE.WebGLRenderer({ canvas, antialias:true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0b0c10);
const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 200);
camera.position.set(1.6, 1.2, 1.8);

const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(0, 0.75, 0);
controls.enableDamping = true;

const hemi = new THREE.HemisphereLight(0xffffff, 0x334466, 0.8);
scene.add(hemi);
const dir = new THREE.DirectionalLight(0xffffff, 0.8);
dir.position.set(2, 3, 1);
scene.add(dir);

// ground
const ground = new THREE.Mesh(new THREE.PlaneGeometry(10,10), new THREE.MeshStandardMaterial({color:0x111217, roughness:.95, metalness:0}));
ground.rotation.x = -Math.PI/2;
ground.position.y = 0;
scene.add(ground);

const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

// State
const state = {
  table: { type:'rect', width:0.9, length:1.8, height:0.75, thick:0.03, diameter:1.5, baseR:0.35 },
  colors: { table:'#9e6b3f', cloth:'#d8d0c6' },
  cloth: null,         // THREE.Mesh for visual
  clothSim: null,      // ClothSimulator instance
  clothKind: 'runner', // 'runner' | 'tablecloth'
  runnerType: 'rect',  // 'rect' | 'hex'
  tableclothType: 'rect', // 'rect' | 'round'
  // geometry params
  runner: { W:0.40, L:2.20, drop:0.15, thick:0.002, res:26 },
  rectCloth: { W:1.40, L:2.40, drop:0.25, thick:0.002, res:40 },
  roundCloth: { D:2.20, drop:0.25, thick:0.002, res:56 },
};

// Scene groups
const world = new THREE.Group();
scene.add(world);
let tableGroup = new THREE.Group(); world.add(tableGroup);

// Helpers: meters<->cm
const m = (cm)=> cm/100;

// Build / rebuild table
function rebuildTable() {
  // clear
  tableGroup.removeFromParent();
  tableGroup = new THREE.Group(); world.add(tableGroup);

  if (state.table.type === 'rect') {
    const grp = buildRectTable({
      width: state.table.width,
      length: state.table.length,
      height: state.table.height,
      thick: state.table.thick,
      color: state.colors.table,
    });
    tableGroup.add(grp);
  } else {
    const grp = buildRoundTable({
      diameter: state.table.diameter,
      height: state.table.height,
      thick: state.table.thick,
      baseR: state.table.baseR,
      color: state.colors.table,
    });
    tableGroup.add(grp);
  }
  updateClothSupportCollider();
}

// Support collider expands tabletop by +5cm to force vertical drop after that line
const support = {
  type:'rect', // or 'round'
  topY: 0.0,
  halfW: 0.45,
  halfL: 0.90,
  radius: 0.75,
  hover: 0.009,
  expand: 0.05, // 5cm
};

function updateClothSupportCollider(){
  support.type = (state.table.type === 'rect') ? 'rect' : 'round';
  support.topY = state.table.height + state.table.thick + support.hover;
  if (support.type === 'rect') {
    support.halfW = state.table.width*0.5 + support.expand;
    support.halfL = state.table.length*0.5 + support.expand;
  } else {
    support.radius = (state.table.diameter*0.5) + support.expand;
  }
}

// Build runner
function buildRunner() {
  destroyCloth();
  const geo = buildRunnerGeometry({
    type: state.runnerType,
    width: state.runner.W,
    length: state.runner.L,
    topY: support.topY,
  });
  startClothFromPanel(geo, state.runner.thick, state.runner.res);
}

// Build tablecloth
function buildTablecloth() {
  destroyCloth();
  let geo;
  if (state.tableclothType === 'rect') {
    geo = buildRectClothGeom({ width: state.rectCloth.W, length: state.rectCloth.L, topY: support.topY });
    startClothFromPanel(geo, state.rectCloth.thick, state.rectCloth.res);
  } else {
    geo = buildRoundClothGeom({ diameter: state.roundCloth.D, topY: support.topY });
    startClothFromPanel(geo, state.roundCloth.thick, state.roundCloth.res);
  }
}

function destroyCloth(){
  if (state.cloth) { state.cloth.geometry.dispose(); state.cloth.material.dispose(); state.cloth.removeFromParent(); state.cloth=null; }
  if (state.clothSim) { state.clothSim.dispose(); state.clothSim=null; }
}

function startClothFromPanel(panelGeom, thickness, res){
  // ✨ descriptor 또는 geometry.userData.shape 모두 수용
  const shapeDesc = (panelGeom && panelGeom.userData && panelGeom.userData.shape) ? panelGeom.userData.shape : panelGeom;

  const grid = ClothSimulator.makeGridForShape(shapeDesc, res, support.topY);
  const mat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(state.colors.cloth),
    roughness: 0.85, metalness: 0.05, side: THREE.DoubleSide
  });
  const mesh = new THREE.Mesh(grid.geometry, mat);
  mesh.castShadow = true; mesh.receiveShadow = true;
  world.add(mesh);

  const sim = new ClothSimulator(grid, {
    gravity: new THREE.Vector3(0, -9.8, 0),
    iterations: 10,
    substeps: 2,
    damping: 0.02,
    thickness: thickness,
    support: support,
    tabletop: {
      type: state.table.type,
      topY: state.table.height + state.table.thick,
      halfW: state.table.width * 0.5,
      halfL: state.table.length * 0.5,
      radius: state.table.diameter * 0.5,
    }
  });

  state.cloth = mesh;
  state.clothSim = sim;
}


// Simple color picking
function onCanvasClick(ev){
  const rect = renderer.domElement.getBoundingClientRect();
  mouse.x = ((ev.clientX - rect.left)/rect.width)*2 - 1;
  mouse.y = -((ev.clientY - rect.top)/rect.height)*2 + 1;
  raycaster.setFromCamera(mouse, camera);
  const meshes = [];
  const picks = pickTableMeshes(tableGroup);
  meshes.push(...picks);
  if (state.cloth) meshes.push(state.cloth);
  const hits = raycaster.intersectObjects(meshes, false);
  if (hits.length>0){
    const hit = hits[0].object;
    if (hit === state.cloth){
      // assign cloth color picker
      const col = document.getElementById('clothColor').value;
      hit.material.color.set(col);
    } else {
      const col = document.getElementById('tableColor').value;
      hit.material.color.set(col);
    }
  }
}
renderer.domElement.addEventListener('click', onCanvasClick);

// UI wiring
function $(id){ return document.getElementById(id); }

function syncVisibility(){
  const tableType = document.querySelector('input[name="tableType"]:checked').value;
  state.table.type = tableType;
  $('rectInputs').style.display = (tableType==='rect')?'block':'none';
  $('roundInputs').style.display = (tableType==='round')?'block':'none';

  const ck = document.querySelector('input[name="clothKind"]:checked').value;
  state.clothKind = ck;
  $('runnerInputs').style.display = (ck==='runner')?'block':'none';
  $('tableclothInputs').style.display = (ck==='tablecloth')?'block':'none';

  const tct = document.querySelector('input[name="tableclothType"]:checked').value;
  state.tableclothType = tct;
  $('rectClothGrid').style.display = (tct==='rect')?'grid':'none';
  $('roundClothGrid').style.display = (tct==='round')?'block':'none';
}

function readInputs(){
  // table
  if (state.table.type==='rect'){
    state.table.width = parseFloat($('rectW').value)/100;
    state.table.length = parseFloat($('rectL').value)/100;
    state.table.height = parseFloat($('rectH').value)/100;
    state.table.thick = parseFloat($('rectT').value)/100;
  } else {
    state.table.diameter = parseFloat($('roundD').value)/100;
    state.table.height = parseFloat($('roundH').value)/100;
    state.table.thick = parseFloat($('roundT').value)/100;
    state.table.baseR = parseFloat($('roundBaseR').value)/100;
  }
  // colors
  state.colors.table = $('tableColor').value;
  state.colors.cloth = $('clothColor').value;
  // runner/tablecloth sub
  state.runnerType = document.querySelector('input[name="runnerType"]:checked').value;
  state.tableclothType = document.querySelector('input[name="tableclothType"]:checked').value;

  state.runner.W = parseFloat($('runnerW').value)/100;
  state.runner.L = parseFloat($('runnerL').value)/100;
  state.runner.drop = parseFloat($('runnerDrop').value)/100;
  state.runner.thick = parseFloat($('runnerThick').value)/1000;
  state.runner.res = parseInt($('runnerRes').value);

  state.rectCloth.W = parseFloat($('clothW').value)/100;
  state.rectCloth.L = parseFloat($('clothL').value)/100;
  state.rectCloth.drop = parseFloat($('clothDrop').value)/100;
  state.rectCloth.thick = parseFloat($('clothThick').value)/1000;
  state.rectCloth.res = parseInt($('clothRes').value);

  state.roundCloth.D = parseFloat($('clothD').value)/100;
  state.roundCloth.drop = parseFloat($('clothDropR').value)/100;
  state.roundCloth.thick = parseFloat($('clothThickR').value)/1000;
  state.roundCloth.res = parseInt($('clothResR').value);
}

function bindUI(){
  document.querySelectorAll('input[name="tableType"]').forEach(el=> el.addEventListener('change', ()=>{ syncVisibility(); readInputs(); rebuildTable(); }));
  $('rebuildTable').addEventListener('click', ()=>{ readInputs(); rebuildTable(); });

  document.querySelectorAll('input[name="clothKind"]').forEach(el=> el.addEventListener('change', ()=>{ syncVisibility(); readInputs(); }));
  document.querySelectorAll('input[name="runnerType"]').forEach(el=> el.addEventListener('change', ()=>{ readInputs(); }));
  document.querySelectorAll('input[name="tableclothType"]').forEach(el=> el.addEventListener('change', ()=>{ syncVisibility(); readInputs(); }));

  $('buildRunnerBtn').addEventListener('click', ()=>{ readInputs(); updateClothSupportCollider(); buildRunner(); });
  $('buildClothBtn').addEventListener('click', ()=>{ readInputs(); updateClothSupportCollider(); buildTablecloth(); });

  $('clothColor').addEventListener('input', ()=>{ if(state.cloth) state.cloth.material.color.set($('clothColor').value); });
  // Table color is applied at rebuild
  $('tableColor').addEventListener('input', ()=>{ readInputs(); rebuildTable(); });
}

bindUI(); syncVisibility(); readInputs(); rebuildTable();

// animate
let last = performance.now();
function tick(now){
  const dt = Math.min(0.033, (now-last)/1000); last = now;
  controls.update();
  if (state.clothSim) state.clothSim.step(dt, (meshGeo)=>{
    if (state.cloth) state.cloth.geometry.attributes.position.needsUpdate = true;
  });
  resize();
  renderer.render(scene, camera);
  requestAnimationFrame(tick);
}
requestAnimationFrame(tick);

function resize(){
  const w = canvas.clientWidth, h = canvas.clientHeight;
  if (canvas.width !== w || canvas.height !== h){
    renderer.setSize(w,h,false);
    camera.aspect = w/h; camera.updateProjectionMatrix();
  }
}

// expose for debugging
window._state = state;
