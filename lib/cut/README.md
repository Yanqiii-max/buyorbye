智能抠图用的文件（js/gfx.js 的 G.aiCutout 调用）：
- u2netp.onnx — U²-Net (portable) 显著物体分割模型，Apache-2.0，来自 https://github.com/xuebinqin/U-2-Net（ONNX 版取自 rembg 发布页）
- ort.wasm.bundle.min.mjs / ort-wasm-simd-threaded.mjs / ort-wasm-simd-threaded.wasm.gz — onnxruntime-web 1.21.0，MIT。wasm 用 gzip -9 压过，worker 里解压。
- worker.mjs — 后台线程推理
