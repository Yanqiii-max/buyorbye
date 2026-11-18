// 智能抠图（后台线程）：U²-Net-p 模型（Apache-2.0）+ onnxruntime-web 1.21（MIT）
// 收到 320×320 的 RGBA 像素，回传 320×320 的前景蒙版（0–255）
const base = new URL('./', self.location.href).href;
let ready = null;
function init() {
  return ready || (ready = (async () => {
    const ort = await import('./ort.wasm.bundle.min.mjs');
    // wasm 运行库用 gzip 压过（12.7MB→3.2MB），在这里解压
    const gz = await fetch(base + 'ort-wasm-simd-threaded.wasm.gz');
    if (!gz.ok) throw new Error('wasm ' + gz.status);
    let buf = await gz.arrayBuffer(); const b = new Uint8Array(buf, 0, 2);
    if (b[0] === 0x1f && b[1] === 0x8b) buf = await new Response(new Blob([buf]).stream().pipeThrough(new DecompressionStream('gzip'))).arrayBuffer();  // 服务器已自动解压时直接用
    ort.env.wasm.wasmBinary = buf;
    ort.env.wasm.wasmPaths = base; ort.env.wasm.numThreads = 1;
    const sess = await ort.InferenceSession.create(base + 'u2netp.onnx', { executionProviders: ['wasm'] });
    return { ort, sess };
  })().catch((e) => { ready = null; throw e; }));
}
self.onmessage = async (e) => {
  const { id, rgba, S, warm } = e.data;
  try {
    const { ort, sess } = await init();
    if (warm) return self.postMessage({ id, ok: 1 });
    const N = S * S, x = new Float32Array(3 * N), M = [0.485, 0.456, 0.406], D = [0.229, 0.224, 0.225];
    let mx = 1; for (let i = 0; i < N; i++) mx = Math.max(mx, rgba[i * 4], rgba[i * 4 + 1], rgba[i * 4 + 2]);
    for (let c = 0; c < 3; c++) for (let i = 0; i < N; i++) x[c * N + i] = (rgba[i * 4 + c] / mx - M[c]) / D[c];
    const out = await sess.run({ [sess.inputNames[0]]: new ort.Tensor('float32', x, [1, 3, S, S]) });
    const o = out[sess.outputNames[0]].data; let lo = Infinity, hi = -Infinity;
    for (let i = 0; i < N; i++) { if (o[i] < lo) lo = o[i]; if (o[i] > hi) hi = o[i]; }
    const mask = new Uint8Array(N); for (let i = 0; i < N; i++) mask[i] = Math.round((o[i] - lo) / (hi - lo + 1e-9) * 255);
    self.postMessage({ id, mask }, [mask.buffer]);
  } catch (er) { self.postMessage({ id, err: String((er && er.message) || er) }); }
};
