/**
 * YOLOv8 object detector running fully in the browser (onnxruntime-web / WASM).
 * Swap the model: replace MODEL_URL with a custom YOLOv8 ONNX export
 * (`yolo export format=onnx`) and update CLASSES / TARGET_CLASS accordingly.
 */
import modelAsset from "@/assets/yolov8n.onnx.asset.json";
import { COCO_CLASSES } from "./classes";

export const MODEL_URL = modelAsset.url;
export const CLASSES = COCO_CLASSES;
export const TARGET_CLASS = "bottle";
const INPUT = 640;
const CONF_THRESHOLD = 0.25;
const IOU_THRESHOLD = 0.45;

export type Detection = {
  label: string;
  score: number;
  box: [number, number, number, number]; // x, y, w, h in original image pixels
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let sessionPromise: Promise<any> | null = null;

async function getSession() {
  if (!sessionPromise) {
    sessionPromise = (async () => {
      const ort = await import("onnxruntime-web");
      ort.env.wasm.wasmPaths = "https://cdn.jsdelivr.net/npm/onnxruntime-web@1.31.1/dist/";
      ort.env.wasm.numThreads = 1;
      const session = await ort.InferenceSession.create(MODEL_URL, { executionProviders: ["wasm"] });
      return { ort, session };
    })().catch((e) => {
      sessionPromise = null;
      throw e;
    });
  }
  return sessionPromise;
}

export const preloadModel = () => getSession();

/** Letterbox the image into a 640x640 float tensor (CHW, RGB, 0-1). */
function preprocess(img: HTMLImageElement) {
  const scale = Math.min(INPUT / img.naturalWidth, INPUT / img.naturalHeight);
  const w = Math.round(img.naturalWidth * scale);
  const h = Math.round(img.naturalHeight * scale);
  const canvas = document.createElement("canvas");
  canvas.width = INPUT;
  canvas.height = INPUT;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "rgb(114,114,114)";
  ctx.fillRect(0, 0, INPUT, INPUT);
  ctx.drawImage(img, 0, 0, w, h);
  const { data } = ctx.getImageData(0, 0, INPUT, INPUT);
  const size = INPUT * INPUT;
  const out = new Float32Array(3 * size);
  for (let i = 0; i < size; i++) {
    out[i] = data[i * 4] / 255;
    out[i + size] = data[i * 4 + 1] / 255;
    out[i + 2 * size] = data[i * 4 + 2] / 255;
  }
  return { tensorData: out, scale };
}

function iou(a: Detection["box"], b: Detection["box"]) {
  const x1 = Math.max(a[0], b[0]);
  const y1 = Math.max(a[1], b[1]);
  const x2 = Math.min(a[0] + a[2], b[0] + b[2]);
  const y2 = Math.min(a[1] + a[3], b[1] + b[3]);
  const inter = Math.max(0, x2 - x1) * Math.max(0, y2 - y1);
  return inter / (a[2] * a[3] + b[2] * b[3] - inter);
}

/** Run detection and return all objects (after NMS), sorted by confidence. */
export async function detect(img: HTMLImageElement): Promise<Detection[]> {
  const { ort, session } = await getSession();
  const { tensorData, scale } = preprocess(img);
  const input = new ort.Tensor("float32", tensorData, [1, 3, INPUT, INPUT]);
  const results = await session.run({ [session.inputNames[0]]: input });
  const output = results[session.outputNames[0]];
  const [, channels, anchors] = output.dims as number[]; // [1, 4+nc, 8400]
  const d = output.data as Float32Array;
  const nc = channels - 4;

  const candidates: (Detection & { cls: number })[] = [];
  for (let i = 0; i < anchors; i++) {
    let best = 0;
    let cls = -1;
    for (let c = 0; c < nc; c++) {
      const s = d[(4 + c) * anchors + i];
      if (s > best) {
        best = s;
        cls = c;
      }
    }
    if (best < CONF_THRESHOLD) continue;
    const cx = d[i], cy = d[anchors + i], w = d[2 * anchors + i], h = d[3 * anchors + i];
    candidates.push({
      cls,
      label: CLASSES[cls] ?? `class_${cls}`,
      score: best,
      box: [(cx - w / 2) / scale, (cy - h / 2) / scale, w / scale, h / scale],
    });
  }

  candidates.sort((a, b) => b.score - a.score);
  const kept: typeof candidates = [];
  for (const c of candidates) {
    if (kept.every((k) => k.cls !== c.cls || iou(k.box, c.box) < IOU_THRESHOLD)) kept.push(c);
  }
  return kept.map(({ label, score, box }) => ({ label, score, box }));
}
