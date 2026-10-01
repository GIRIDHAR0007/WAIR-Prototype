"use client";
import { useEffect, useRef, useState } from "react";
import { Check, LoaderCircle, LockKeyhole, ScanFace, Sparkles, Upload, X } from "lucide-react";
import type { WardrobeRow } from "@/components/wardrobe-library";
import { getImageUrl } from "@/lib/storage/image-url";

type GarmentImage = { item: WardrobeRow; blob: Blob; url: string };

function rasterize(blob: Blob, maxSide = 1200): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const sourceUrl = URL.createObjectURL(blob);
    const image = new Image();
    image.onload = () => {
      const scale = Math.min(1, maxSide / Math.max(image.naturalWidth, image.naturalHeight));
      const canvas = document.createElement("canvas"); canvas.width = Math.max(1, Math.round(image.naturalWidth * scale)); canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
      const context = canvas.getContext("2d");
      if (!context) { URL.revokeObjectURL(sourceUrl); reject(new Error("Could not read this image.")); return; }
      context.drawImage(image, 0, 0, canvas.width, canvas.height); URL.revokeObjectURL(sourceUrl);
      canvas.toBlob(output => output ? resolve(output) : reject(new Error("Could not prepare this image.")), "image/png");
    };
    image.onerror = () => { URL.revokeObjectURL(sourceUrl); reject(new Error("Could not read this image.")); };
    image.src = sourceUrl;
  });
}

function Silhouette({ garments }: { garments: GarmentImage[] }) {
  const first = (category: string) => garments.find(garment => garment.item.category === category);
  const upper = first("Upper"), lower = first("Lower"), fullBody = first("Full Body"), outerwear = first("Outerwear"), shoes = first("Footwear"), accessory = first("Accessories");
  return <div className="silhouette-stage"><svg className="body-silhouette" viewBox="0 0 280 450" aria-hidden="true"><ellipse cx="140" cy="435" rx="79" ry="8" fill="#dcdcd4"/><path d="M116 65c0-22 10-36 24-36s24 14 24 36v26c16 8 30 16 42 29 13 13 20 27 26 47l25 87c3 10-2 18-12 22-9 3-16-2-20-11l-29-69-10 99-6 71H100l-6-71-10-99-29 69c-4 9-11 14-20 11-10-4-15-12-12-22l25-87c6-20 13-34 26-47 12-13 26-21 42-29z" fill="#deded7"/><path d="M109 94c9 8 20 12 31 12s22-4 31-12" fill="none" stroke="#d0d0c8" strokeWidth="3" strokeLinecap="round"/><path d="M101 335h78M96 383h88" stroke="#d2d2ca" strokeWidth="2" strokeLinecap="round"/></svg>
    {fullBody && <img className="silhouette-garment garment-fullbody" src={fullBody.url} alt=""/>}
    {upper && !fullBody && <img className="silhouette-garment garment-upper" src={upper.url} alt=""/>}
    {lower && !fullBody && <img className="silhouette-garment garment-lower" src={lower.url} alt=""/>}
    {outerwear && <img className="silhouette-garment garment-outerwear" src={outerwear.url} alt=""/>}
    {shoes && <img className="silhouette-garment garment-shoes" src={shoes.url} alt=""/>}
    {accessory && <img className="silhouette-garment garment-accessory" src={accessory.url} alt=""/>}
  </div>;
}

export function TryOnPreview({ outfitId, items, enabled }: { outfitId: string; items: WardrobeRow[]; enabled: boolean }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const localUrls = useRef(new Set<string>());
  const [open, setOpen] = useState(false);
  const [garments, setGarments] = useState<GarmentImage[]>([]);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoUrl, setPhotoUrl] = useState("");
  const [tryOnImage, setTryOnImage] = useState("");
  const [preparing, setPreparing] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [message, setMessage] = useState("");
  const [hasBackgroundsRemoved, setHasBackgroundsRemoved] = useState(false);
  const [useSilhouette, setUseSilhouette] = useState(true);

  useEffect(() => () => { localUrls.current.forEach(url => URL.revokeObjectURL(url)); }, []);
  const trackUrl = (blob: Blob) => { const url = URL.createObjectURL(blob); localUrls.current.add(url); return url; };

  async function openPreview() {
    setOpen(true); setMessage("");
    if (garments.length || preparing) return;
    setPreparing(true);
    const urls: string[] = [];
    try {
      const processing = (async () => {
        const { removeBackground } = await import("@imgly/background-removal");
        return Promise.all(items.slice(0, 8).map(async item => {
        const path = getImageUrl(item.imageKey);
        const source = await fetch(path);
        if (!source.ok) throw new Error("A wardrobe image could not be loaded.");
        const raster = await rasterize(await source.blob());
        try {
          const transparent = await removeBackground(raster);
          const url = trackUrl(transparent); urls.push(url);
          return { item, blob: transparent, url };
        } catch {
          const url = trackUrl(raster); urls.push(url);
          return { item, blob: raster, url };
        }
        }));
      })();
      const processed = await Promise.race([processing, new Promise<never>((_, reject) => window.setTimeout(() => reject(new Error("Background removal timed out.")), 30_000))]);
      setGarments(processed); setHasBackgroundsRemoved(true);
    } catch (cause) {
      urls.forEach(url => URL.revokeObjectURL(url));
      const fallback = await Promise.all(items.slice(0, 8).map(async item => {
        const path = getImageUrl(item.imageKey);
        const response = await fetch(path); const raster = await rasterize(await response.blob());
        const url = trackUrl(raster); urls.push(url);
        return { item, blob: raster, url };
      })).catch(() => [] as GarmentImage[]);
      setGarments(fallback); setMessage("Background removal wasn’t available, so the original pieces are shown on the silhouette.");
      console.error("Try-on preview background removal failed", cause);
    } finally { setPreparing(false); }
  }

  async function choosePhoto(file?: File) {
    if (!file) return;
    setMessage(""); setTryOnImage("");
    try {
      const raster = await rasterize(file, 1400);
      const prepared = new File([raster], "full-body-photo.png", { type: "image/png" });
      setPhotoFile(prepared);
      setPhotoUrl(current => { if (current) { URL.revokeObjectURL(current); localUrls.current.delete(current); } return trackUrl(prepared); });
    } catch { setMessage("We couldn’t read that photo. Please try another image."); }
  }

  async function generateTryOn() {
    if (!photoFile) return;
    setGenerating(true); setMessage("This can take up to a minute. Your photo is only sent now, after you chose this option."); setTryOnImage(""); setUseSilhouette(true);
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 60_000);
    try {
      const form = new FormData(); form.append("outfitId", outfitId); form.append("photo", photoFile);
      garments.forEach((garment, index) => form.append("garments", new File([garment.blob], `garment-${index + 1}.png`, { type: "image/png" })));
      const response = await fetch("/api/try-on", { method: "POST", body: form, signal: controller.signal });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "We couldn’t create that preview.");
      setTryOnImage(result.image); setUseSilhouette(false); setMessage("");
    } catch (cause) {
      setUseSilhouette(true);
      setMessage(cause instanceof Error && cause.name === "AbortError" ? "That took longer than a minute. Here’s the silhouette preview instead." : `${cause instanceof Error ? cause.message : "The try-on couldn’t finish."} Here’s the silhouette preview instead.`);
    } finally { window.clearTimeout(timeout); setGenerating(false); }
  }

  return <>
    <button className="tryon-open-button" onClick={() => void openPreview()}><ScanFace size={14}/> Preview this look</button>
    {open && <div className="tryon-backdrop" role="presentation" onMouseDown={event => { if (event.target === event.currentTarget && !generating) setOpen(false); }}><section className="tryon-dialog" role="dialog" aria-modal="true" aria-labelledby={`tryon-title-${outfitId}`}>
      <header className="tryon-dialog-head"><div><span className="eyebrow">A PREVIEW FOR YOU</span><h2 id={`tryon-title-${outfitId}`}>See the pieces together</h2></div><button onClick={() => !generating && setOpen(false)} aria-label="Close preview" className="editor-close"><X size={18}/></button></header>
      <div className="tryon-dialog-body"><div className="tryon-result-stage">{tryOnImage && !useSilhouette ? <img className="tryon-generated-image" src={tryOnImage} alt="AI virtual try-on result"/> : preparing ? <div className="tryon-preparing"><LoaderCircle className="spin" size={22}/><b>Preparing the outfit preview…</b><small>Removing garment backgrounds in your browser</small></div> : <Silhouette garments={garments}/>}</div>
        <div className="tryon-side"><span className="eyebrow">THIS OUTFIT</span><div className="tryon-item-list">{items.map(item => <div key={item.id}><i/>{item.subcategory}</div>)}</div><p className="tryon-side-copy">Garment backgrounds are removed in your browser where supported, then the pieces are layered on a neutral silhouette.</p>
          {enabled && <div className="personal-tryon"><div className="personal-tryon-title"><Sparkles size={15}/><b>Personal try-on</b></div><p>Use a full-body photo to create a generated preview on you. This is optional and may take up to 60 seconds.</p>{photoUrl && <div className="photo-picked"><img src={photoUrl} alt="Your selected full-body photo"/><span>Your photo is ready</span><Check size={13}/></div>}<input ref={inputRef} className="visually-hidden" type="file" accept="image/*" onChange={event => { void choosePhoto(event.target.files?.[0]); event.target.value = ""; }}/><button className="secondary-button choose-fullbody" onClick={() => inputRef.current?.click()} disabled={generating}><Upload size={14}/>{photoFile ? "Choose a different photo" : "Choose full-body photo"}</button><button className="primary-button see-on-me" onClick={() => void generateTryOn()} disabled={!photoFile || !garments.length || generating}>{generating ? <><LoaderCircle className="spin" size={15}/> Creating preview…</> : <>See it on me <Sparkles size={14}/></>}</button><div className="photo-consent"><LockKeyhole size={13}/><span>Your photo and garment images are sent to OpenAI only when you press “See it on me.” They are not saved by Wair.</span></div></div>}
        </div></div>
      {message && <div className={`tryon-message ${generating ? "is-loading" : ""}`} role="status">{generating && <LoaderCircle className="spin" size={14}/>}<span>{message}</span></div>}
      <footer className="tryon-dialog-foot"><span>{hasBackgroundsRemoved ? "Background removal is handled locally when available." : "Silhouette preview works without an API key."}</span><button className="secondary-button" onClick={() => !generating && setOpen(false)}>Done</button></footer>
    </section></div>}
  </>;
}
