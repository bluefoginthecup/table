export function startLoop(three) {
  if (three.__loop) return;
  three.__loop = true;
  const tick = () => {
    if (!three.__loop) return;
    three.controls.update();
    three.renderer.render(three.scene, three.camera);
    three.__raf = requestAnimationFrame(tick);
  };
  tick();
}

export function stopLoop(three) {
  three.__loop = false;
  if (three.__raf) cancelAnimationFrame(three.__raf);
}
