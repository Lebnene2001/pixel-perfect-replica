<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- Object detection runs client-side with onnxruntime-web + a YOLOv8 ONNX model (src/lib/yolo); the platform cannot host a Python backend. Swap models via MODEL_URL/CLASSES/TARGET_CLASS in detector.ts.
- Analysis history is stored in browser localStorage (src/lib/history.ts) to avoid requiring a backend.
