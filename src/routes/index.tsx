import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Camera, ImageUp, ScanSearch, RotateCcw, CheckCircle2, XCircle, History, Trash2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { detect, preloadModel, TARGET_CLASS, type Detection } from "@/lib/yolo/detector";
import { frLabel } from "@/lib/yolo/classes";
import { addHistory, clearHistory, loadHistory, type HistoryEntry } from "@/lib/history";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "BottleScan — Détection de bouteilles par IA (YOLO)" },
      { name: "description", content: "Photographiez un objet : l'IA YOLO vérifie instantanément s'il s'agit d'une bouteille." },
      { property: "og:title", content: "BottleScan — Détection de bouteilles par IA" },
      { property: "og:description", content: "Vérifiez si un objet est une bouteille grâce à YOLOv8, directement dans votre navigateur." },
    ],
  }),
  component: Index,
});

type Result = { isBottle: boolean; best: Detection | null; all: Detection[]; annotated: string };

function drawAnnotated(img: HTMLImageElement, dets: Detection[]) {
  const c = document.createElement("canvas");
  c.width = img.naturalWidth;
  c.height = img.naturalHeight;
  const ctx = c.getContext("2d")!;
  ctx.drawImage(img, 0, 0);
  const lw = Math.max(3, c.width / 200);
  const fs = Math.max(16, c.width / 35);
  ctx.font = `600 ${fs}px JetBrains Mono, monospace`;
  for (const d of dets) {
    const bottle = d.label === TARGET_CLASS;
    const color = bottle ? "#22e08a" : "#8aa4b8";
    const [x, y, w, h] = d.box;
    ctx.strokeStyle = color;
    ctx.lineWidth = bottle ? lw : lw / 2;
    ctx.strokeRect(x, y, w, h);
    const text = `${frLabel(d.label)} ${Math.round(d.score * 100)}%`;
    const tw = ctx.measureText(text).width + 12;
    const ty = Math.max(0, y - fs - 8);
    ctx.fillStyle = color;
    ctx.fillRect(x, ty, tw, fs + 8);
    ctx.fillStyle = "#0b1a22";
    ctx.fillText(text, x + 6, ty + fs);
  }
  return c;
}

function Index() {
  const [image, setImage] = useState<string | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cameraOn, setCameraOn] = useState(false);
  const [modelReady, setModelReady] = useState(false);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setHistory(loadHistory());
    preloadModel().then(() => setModelReady(true)).catch(() => setError("Impossible de charger le modèle YOLO. Vérifiez votre connexion."));
    return () => stopCamera();
  }, []);

  function stopCamera() {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setCameraOn(false);
  }

  async function startCamera() {
    setError(null);
    try {
      const s = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
      streamRef.current = s;
      setCameraOn(true);
      setResult(null);
      setImage(null);
      requestAnimationFrame(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = s;
          videoRef.current.play();
        }
      });
    } catch {
      setError("Accès à la caméra refusé ou indisponible. Utilisez « Importer une image ».");
    }
  }

  function capture() {
    const v = videoRef.current;
    if (!v) return;
    const c = document.createElement("canvas");
    c.width = v.videoWidth;
    c.height = v.videoHeight;
    c.getContext("2d")!.drawImage(v, 0, 0);
    setImage(c.toDataURL("image/jpeg", 0.92));
    stopCamera();
  }

  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    if (!f.type.startsWith("image/")) return setError("Ce fichier n'est pas une image.");
    stopCamera();
    setError(null);
    setResult(null);
    const r = new FileReader();
    r.onload = () => setImage(r.result as string);
    r.readAsDataURL(f);
  }

  async function analyze() {
    if (!image) return;
    setBusy(true);
    setError(null);
    try {
      const img = new Image();
      img.src = image;
      await img.decode();
      const all = await detect(img);
      const bottles = all.filter((d) => d.label === TARGET_CLASS);
      const best = bottles[0] ?? null;
      const canvas = drawAnnotated(img, all);
      const annotated = canvas.toDataURL("image/jpeg", 0.9);
      setResult({ isBottle: !!best, best, all, annotated });
      // small thumbnail for history
      const t = document.createElement("canvas");
      const k = 320 / Math.max(canvas.width, canvas.height);
      t.width = canvas.width * k;
      t.height = canvas.height * k;
      t.getContext("2d")!.drawImage(canvas, 0, 0, t.width, t.height);
      setHistory(addHistory({ id: crypto.randomUUID(), date: new Date().toISOString(), isBottle: !!best, confidence: best?.score ?? null, thumbnail: t.toDataURL("image/jpeg", 0.7) }));
    } catch (e) {
      console.error(e);
      setError("L'analyse a échoué. Réessayez avec une autre image.");
    } finally {
      setBusy(false);
    }
  }

  function reset() {
    stopCamera();
    setImage(null);
    setResult(null);
    setError(null);
  }

  const others = result?.all.filter((d) => d.label !== TARGET_CLASS) ?? [];

  return (
    <main className="mx-auto max-w-5xl px-4 py-10">
      <header className="mb-10 text-center">
        <p className="font-mono text-xs uppercase tracking-[0.3em] text-primary">YOLOv8 · Vision par ordinateur</p>
        <h1 className="mt-3 text-5xl font-bold tracking-tight md:text-6xl">BottleScan</h1>
        <p className="mt-3 text-muted-foreground">Photographiez un objet — l'IA vous dit si c'est une bouteille.</p>
        <p className="mt-2 font-mono text-xs text-muted-foreground">
          {modelReady ? <span className="text-success">● modèle chargé</span> : <span>○ chargement du modèle…</span>}
        </p>
      </header>

      <div className="grid gap-6 md:grid-cols-[1.4fr_1fr]">
        <section className="rounded-xl border border-border bg-card p-4">
          <div className="relative flex aspect-[4/3] items-center justify-center overflow-hidden rounded-lg bg-muted">
            {cameraOn ? (
              <video ref={videoRef} playsInline muted className="h-full w-full object-cover" />
            ) : result ? (
              <img src={result.annotated} alt="Image analysée" className="h-full w-full object-contain" />
            ) : image ? (
              <img src={image} alt="Image à analyser" className="h-full w-full object-contain" />
            ) : (
              <div className="text-center text-muted-foreground">
                <ScanSearch className="mx-auto mb-2 h-10 w-10" />
                <p className="text-sm">Aucune image</p>
              </div>
            )}
            {busy && <div className="scan-line" />}
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {cameraOn ? (
              <Button onClick={capture} className="col-span-2"><Camera /> Capturer</Button>
            ) : (
              <Button variant="secondary" onClick={startCamera}><Camera /> Prendre une photo</Button>
            )}
            {!cameraOn && (
              <Button variant="secondary" onClick={() => fileRef.current?.click()}><ImageUp /> Importer une image</Button>
            )}
            <Button onClick={analyze} disabled={!image || busy || !!result || !modelReady}>
              {busy ? <Loader2 className="animate-spin" /> : <ScanSearch />} Analyser l'image
            </Button>
            <Button variant="outline" onClick={reset}><RotateCcw /> Nouvelle analyse</Button>
          </div>
          <input ref={fileRef} type="file" accept="image/*" hidden onChange={onFile} />
          {error && <p className="mt-3 rounded-md bg-destructive/15 p-3 text-sm text-destructive">{error}</p>}
        </section>

        <section className="rounded-xl border border-border bg-card p-5">
          <h2 className="font-mono text-xs uppercase tracking-widest text-muted-foreground">Résultat</h2>
          {!result ? (
            <p className="mt-6 text-sm text-muted-foreground">Prenez ou importez une photo, puis lancez l'analyse.</p>
          ) : result.isBottle ? (
            <div className="mt-4 rounded-lg border border-success/40 bg-success/10 p-5">
              <CheckCircle2 className="h-8 w-8 text-success" />
              <p className="mt-2 text-2xl font-bold text-success">BOUTEILLE DÉTECTÉE</p>
              <p className="mt-1 text-sm">Bouteille détectée avec une confiance de <b className="font-mono">{Math.round(result.best!.score * 100)} %</b>.</p>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted">
                <div className="h-full bg-success" style={{ width: `${result.best!.score * 100}%` }} />
              </div>
            </div>
          ) : (
            <div className="mt-4 rounded-lg border border-destructive/40 bg-destructive/10 p-5">
              <XCircle className="h-8 w-8 text-destructive" />
              <p className="mt-2 text-2xl font-bold text-destructive">CE N'EST PAS UNE BOUTEILLE</p>
              <p className="mt-1 text-sm">Aucune bouteille n'a été détectée sur l'image.</p>
            </div>
          )}
          {result && others.length > 0 && (
            <div className="mt-5">
              <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">Autres objets reconnus</p>
              <ul className="mt-2 space-y-1 font-mono text-sm">
                {others.slice(0, 6).map((d, i) => (
                  <li key={i} className="flex justify-between"><span>{frLabel(d.label)}</span><span className="text-muted-foreground">{Math.round(d.score * 100)} %</span></li>
                ))}
              </ul>
            </div>
          )}
        </section>
      </div>

      <section className="mt-10">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-xl font-semibold"><History className="h-5 w-5" /> Historique</h2>
          {history.length > 0 && (
            <Button variant="ghost" size="sm" onClick={() => { clearHistory(); setHistory([]); }}><Trash2 /> Effacer</Button>
          )}
        </div>
        {history.length === 0 ? (
          <p className="text-sm text-muted-foreground">Aucune analyse pour le moment.</p>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-5">
            {history.map((h) => (
              <div key={h.id} className="overflow-hidden rounded-lg border border-border bg-card">
                <img src={h.thumbnail} alt="Analyse" className="aspect-square w-full object-cover" />
                <div className="p-2 text-xs">
                  <p className={h.isBottle ? "font-semibold text-success" : "font-semibold text-destructive"}>
                    {h.isBottle ? "Bouteille" : "Pas une bouteille"}{h.confidence != null && ` · ${Math.round(h.confidence * 100)} %`}
                  </p>
                  <p className="font-mono text-muted-foreground">{new Date(h.date).toLocaleString("fr-FR")}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <footer className="mt-12 text-center font-mono text-xs text-muted-foreground">
        Analyse 100 % locale dans votre navigateur · YOLOv8n (COCO) · aucune image envoyée
      </footer>
    </main>
  );
}
