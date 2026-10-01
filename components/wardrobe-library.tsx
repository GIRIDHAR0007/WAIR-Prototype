"use client";
import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowUpRight, Check, ImagePlus, LoaderCircle, Scissors, Shirt, Sparkles, Trash2, UploadCloud, X } from "lucide-react";
import { CLOTHING_GROUPS, TAXONOMY, type ClothingGroup, type Gender } from "@/data/taxonomy";
import { getImageUrl } from "@/lib/storage/image-url";

type Color = { name: string; hex: string };
export type WardrobeRow = { id: string; imageKey: string; category: string; subcategory: string; colors: string; fabric: string | null; seasons: string; formality: number; isTraditional: boolean };
const colorsFor = (value: string): Color[] => { try { const parsed = JSON.parse(value); return Array.isArray(parsed) ? parsed : []; } catch { return []; } };
const listFor = (value: string): string[] => { try { const parsed = JSON.parse(value); return Array.isArray(parsed) ? parsed : []; } catch { return []; } };
const categoryNames = ["All pieces", ...CLOTHING_GROUPS];
const seasonNames = ["Spring", "Summer", "Fall", "Winter", "All season"];

export function WardrobeLibrary({ initialItems, gender }: { initialItems: WardrobeRow[]; gender: Gender }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [items, setItems] = useState(initialItems);
  const [activeCategory, setActiveCategory] = useState("All pieces");
  const [removeBackground, setRemoveBackground] = useState(false);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState("");
  const [message, setMessage] = useState("");
  const [editing, setEditing] = useState<WardrobeRow | null>(null);
  const [saving, setSaving] = useState(false);
  const [demoLoading, setDemoLoading] = useState(false);

  const filtered = useMemo(() => activeCategory === "All pieces" ? items : items.filter(item => item.category === activeCategory), [items, activeCategory]);
  const subcategories = useMemo(() => {
    const groups = TAXONOMY[gender][(editing?.category ?? "Upper") as ClothingGroup] ?? {};
    return [...new Set(Object.values(groups).flat())];
  }, [editing?.category, gender]);

  async function processFiles(sourceFiles: FileList | File[]) {
    const files = Array.from(sourceFiles).filter(file => file.type.startsWith("image/"));
    if (!files.length) { setMessage("Choose image files to add."); return; }
    setMessage(""); setBusy(true);
    let candidates = files;
    if (removeBackground) {
      try {
        setProgress("Removing backgrounds in your browser…");
        const { removeBackground: remove } = await import("@imgly/background-removal");
        const processed: File[] = [];
        for (let index = 0; index < files.length; index++) {
          setProgress(`Removing background ${index + 1} of ${files.length}…`);
          const blob = await remove(files[index]!);
          processed.push(new File([blob], files[index]!.name.replace(/\.[^.]+$/, ".png"), { type: "image/png" }));
        }
        candidates = processed;
      } catch (error) {
        console.error("Background removal failed; using original images", error);
        setMessage("Background removal did not finish. Uploading original images instead.");
        candidates = files;
      }
    }
    const created: WardrobeRow[] = [];
    for (let offset = 0; offset < candidates.length; offset += 4) {
      const batch = candidates.slice(offset, offset + 4);
      setProgress(`Tagging ${Math.min(offset + batch.length, candidates.length)} of ${candidates.length} pieces…`);
      const form = new FormData();
      batch.forEach(file => form.append("files", file));
      try {
        const response = await fetch("/api/wardrobe", { method: "POST", body: form });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error ?? "Could not upload images.");
        created.push(...result.items as WardrobeRow[]);
        if (result.failed) setMessage(`${result.failed} image${result.failed === 1 ? "" : "s"} could not be processed.`);
      } catch (error) { setMessage(error instanceof Error ? error.message : "Could not upload images."); }
    }
    setItems(current => [...created, ...current]); setBusy(false); setProgress(""); window.dispatchEvent(new Event("wair-wardrobe-updated")); setTimeout(() => router.refresh(), 50);
  }

  function openEdit(item: WardrobeRow) { setEditing({ ...item }); }
  function changeEdit(patch: Partial<WardrobeRow>) { setEditing(current => current ? { ...current, ...patch } : current); }
  async function saveEdit() {
    if (!editing) return;
    setSaving(true);
    const result = { ...editing, colors: colorsFor(editing.colors), seasons: listFor(editing.seasons) };
    try {
      const response = await fetch("/api/wardrobe", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(result) });
      const body = await response.json(); if (!response.ok) throw new Error(body.error ?? "Could not save tags.");
      setItems(current => current.map(item => item.id === editing.id ? body.item : item)); setEditing(null);
    } catch (error) { setMessage(error instanceof Error ? error.message : "Could not save tags."); }
    finally { setSaving(false); }
  }
  async function removeItem(item: WardrobeRow) {
    if (!window.confirm(`Delete ${item.subcategory} from your wardrobe?`)) return;
    try {
      const response = await fetch(`/api/wardrobe?id=${encodeURIComponent(item.id)}`, { method: "DELETE" });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) { setMessage(result.error ?? "Could not delete item."); return; }
      setItems(current => current.filter(candidate => candidate.id !== item.id)); window.dispatchEvent(new Event("wair-wardrobe-updated"));
    } catch (error) { setMessage(error instanceof Error ? error.message : "Could not delete item."); }
  }
  async function loadDemoWardrobe() {
    setDemoLoading(true); setMessage("");
    try {
      const response = await fetch("/api/wardrobe/demo", { method: "POST" });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error ?? "Could not load demo wardrobe.");
      setItems(result.items as WardrobeRow[]);
      setActiveCategory("All pieces");
      setMessage(result.added ? `Loaded ${result.added} demo pieces. Edit or delete any item to make this wardrobe yours.` : "Your demo wardrobe is ready.");
      window.dispatchEvent(new Event("wair-wardrobe-updated"));
      router.refresh();
    } catch (error) { setMessage(error instanceof Error ? error.message : "Could not load demo wardrobe."); }
    finally { setDemoLoading(false); }
  }
  async function addColor() {
    if (!editing) return;
    const next = [...colorsFor(editing.colors), { name: "New color", hex: "#a0aa91" }];
    changeEdit({ colors: JSON.stringify(next.slice(0, 3)) });
  }
  const colorValues = editing ? colorsFor(editing.colors) : [];

  return <>
    <input ref={inputRef} className="visually-hidden" type="file" accept="image/*" multiple onChange={event => { if (event.target.files) void processFiles(event.target.files); event.target.value = ""; }}/>
    <div className="wardrobe-toolbar"><div className="category-filters">{categoryNames.map(name => <button key={name} onClick={() => setActiveCategory(name)} className={`filter-chip ${activeCategory === name ? "selected" : ""}`}>{name}<span>{name === "All pieces" ? items.length : items.filter(item => item.category === name).length}</span></button>)}</div><label className="remove-toggle"><input type="checkbox" checked={removeBackground} onChange={event => setRemoveBackground(event.target.checked)}/><span className="toggle-track"/><Scissors size={14}/><span>Remove background</span><i>Optional</i></label></div>
    {message && <div className="wardrobe-message" role="status">{message}<button onClick={() => setMessage("")} aria-label="Dismiss"><X size={14}/></button></div>}
    <button type="button" className={`upload-dropzone ${busy ? "is-busy" : ""}`} onClick={() => !busy && inputRef.current?.click()} onDragOver={event => event.preventDefault()} onDrop={event => { event.preventDefault(); if (!busy) void processFiles(event.dataTransfer.files); }} disabled={busy}>
      <span className="upload-symbol">{busy ? <LoaderCircle className="spin" size={23}/> : <UploadCloud size={23}/>}</span><span className="upload-copy"><b>{busy ? progress : "Add pieces to your wardrobe"}</b><small>{busy ? "AI is looking for the details" : "Drop photos here or browse · JPG, PNG or WebP · up to 20 at once"}</small></span>{!busy && <span className="upload-action"><ImagePlus size={15}/> Choose photos</span>}
    </button>
    <div className="section-head library-section-head"><div><h2>{activeCategory === "All pieces" ? "Your pieces" : activeCategory}</h2><p>{filtered.length} {filtered.length === 1 ? "piece" : "pieces"}{busy ? " · Uploading in progress" : ""}</p></div><button className="text-button" onClick={() => inputRef.current?.click()} disabled={busy}>Add photos <ArrowUpRight size={15}/></button></div>
    {filtered.length ? <div className="garment-grid">{filtered.map(item => {
      const itemColors = colorsFor(item.colors);
      return <article key={item.id} className="garment-card library-card"><button className="garment-image edit-image" onClick={() => openEdit(item)} aria-label={`Edit ${item.subcategory}`}><img src={getImageUrl(item.imageKey)} alt={item.subcategory}/><span className="image-edit-label">Edit tags</span></button><div className="garment-info"><div className="garment-copy"><b>{item.subcategory}</b><small>{item.category} · {item.formality}/10 formality</small><small className="fabric-line">{item.fabric ?? "Fabric unknown"} · {listFor(item.seasons).join(", ") || "All season"}</small></div><div className="swatches">{itemColors.slice(0, 3).map((color, index) => <i key={index} title={`${color.name} ${color.hex}`} style={{ backgroundColor: color.hex }}/>)}</div></div><div className="garment-card-actions"><button onClick={() => openEdit(item)}><span>Edit details</span></button><button className="delete-action" aria-label={`Delete ${item.subcategory}`} title={`Delete ${item.subcategory}`} onClick={() => void removeItem(item)}><Trash2 size={14}/><span>Delete</span></button></div></article>;
    })}</div> : <div className="empty-state library-empty"><div className="empty-icon"><Shirt size={24}/></div><h3>{items.length ? "Nothing in this category yet" : "Make it yours"}</h3><p>{items.length ? "Try another filter or add a few pieces." : "Start with a ready-to-wear sample closet, or add your own photos."}</p><div className="empty-actions"><button className="primary-button" onClick={() => void loadDemoWardrobe()} disabled={demoLoading}>{demoLoading ? <LoaderCircle className="spin" size={15}/> : <Sparkles size={15} />}{demoLoading ? "Loading demo pieces…" : "Load demo wardrobe"}</button><button className="secondary-button" onClick={() => inputRef.current?.click()} disabled={demoLoading}><ImagePlus size={15}/> Add photos</button></div></div>}
    {editing && <div className="modal-backdrop" role="presentation" onMouseDown={event => { if (event.target === event.currentTarget) setEditing(null); }}><section className="tag-editor" role="dialog" aria-modal="true" aria-labelledby="edit-title"><header className="editor-heading"><div><span className="eyebrow">WARDROBE DETAILS</span><h2 id="edit-title">Edit this piece</h2></div><button className="editor-close" onClick={() => setEditing(null)} aria-label="Close"><X size={18}/></button></header><div className="editor-body"><div className="editor-preview"><img src={getImageUrl(editing.imageKey)} alt="Selected garment"/></div><div className="editor-fields"><label>Category<select value={editing.category} onChange={event => { const category = event.target.value as ClothingGroup; changeEdit({ category, subcategory: (Object.values(TAXONOMY[gender][category] ?? {}).flat()[0] ?? "Other") as string }); }}>{CLOTHING_GROUPS.map(group => <option key={group}>{group}</option>)}</select></label><label>Subcategory<select value={editing.subcategory} onChange={event => changeEdit({ subcategory: event.target.value })}>{subcategories.map(value => <option key={value}>{value}</option>)}{!subcategories.includes(editing.subcategory) && <option>{editing.subcategory}</option>}</select></label><label>Fabric<input value={editing.fabric ?? ""} onChange={event => changeEdit({ fabric: event.target.value })} placeholder="e.g. Cotton"/></label><label>Formality <span className="range-value">{editing.formality}/10</span><input className="range-input" type="range" min="1" max="10" value={editing.formality} onChange={event => changeEdit({ formality: Number(event.target.value) })}/></label><fieldset className="season-picker"><legend>Season</legend><div>{seasonNames.map(season => { const current = listFor(editing.seasons); const checked = current.includes(season); return <label key={season}><input type="checkbox" checked={checked} onChange={() => changeEdit({ seasons: JSON.stringify(checked ? current.filter(value => value !== season) : [...current, season]) })}/>{season}</label>; })}</div></fieldset><fieldset className="color-editor"><legend>Colors <button type="button" onClick={() => void addColor()} disabled={colorValues.length >= 3}>+ Add</button></legend>{colorValues.map((color, index) => <div className="color-edit-row" key={index}><input aria-label="Color name" value={color.name} onChange={event => { const next = [...colorValues]; next[index] = { ...next[index]!, name: event.target.value }; changeEdit({ colors: JSON.stringify(next) }); }}/><input aria-label="Color hex" type="color" value={/^#[0-9a-f]{6}$/i.test(color.hex) ? color.hex : "#888888"} onChange={event => { const next = [...colorValues]; next[index] = { ...next[index]!, hex: event.target.value }; changeEdit({ colors: JSON.stringify(next) }); }}/><button type="button" aria-label="Remove color" onClick={() => changeEdit({ colors: JSON.stringify(colorValues.filter((_, itemIndex) => itemIndex !== index)) })}><X size={13}/></button></div>)}</fieldset><label className="traditional-check"><input type="checkbox" checked={editing.isTraditional} onChange={event => changeEdit({ isTraditional: event.target.checked })}/> Traditional garment</label></div></div><footer className="editor-footer"><button className="secondary-button" onClick={() => setEditing(null)}>Cancel</button><button className="primary-button" onClick={() => void saveEdit()} disabled={saving}>{saving ? <LoaderCircle className="spin" size={15}/> : <Check size={15}/>} Save changes</button></footer></section></div>}
  </>;
}
