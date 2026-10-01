"use client";
import { useState } from "react";
import { ArrowLeft, ArrowRight, Check, Heart, LoaderCircle, Moon, Sparkles, Sun, ThumbsDown, ThumbsUp } from "lucide-react";
import type { WardrobeRow } from "@/components/wardrobe-library";
import { TryOnPreview } from "@/components/try-on-preview";
import type { ColorMode, PlannerOccasion } from "@/data/outfit-rules";
import { getImageUrl } from "@/lib/storage/image-url";

type OutfitCard = { id: string; explanation: string; score: number; items: WardrobeRow[] };
const swatches = [{ name: "Black", hex: "#242424" }, { name: "White", hex: "#f4f2ec" }, { name: "Navy", hex: "#263b56" }, { name: "Blue", hex: "#4c78a8" }, { name: "Green", hex: "#647c59" }, { name: "Red", hex: "#b84b45" }, { name: "Beige", hex: "#c9b99d" }, { name: "Pink", hex: "#d58d9a" }];
const colorsFor = (raw: string) => { try { const parsed = JSON.parse(raw); return Array.isArray(parsed) ? parsed as {name:string;hex:string}[] : []; } catch { return []; } };

export function OutfitPlanner({ tryOnEnabled }: { tryOnEnabled: boolean }) {
  const [occasion, setOccasion] = useState<PlannerOccasion | "">("");
  const [colorMode, setColorMode] = useState<ColorMode | "">("");
  const [preferredColors, setPreferredColors] = useState<string[]>([]);
  const [outfits, setOutfits] = useState<OutfitCard[]>([]);
  const [feedbackMap, setFeedbackMap] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function generate() {
    if (!occasion || !colorMode) return;
    setLoading(true); setError("");
    try {
      const response = await fetch("/api/outfits", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ occasion, colorMode, preferredColors, excludeRecent: true }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Could not plan outfits.");
      setOutfits(result.outfits); setFeedbackMap({});
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Could not plan outfits."); setOutfits([]); }
    finally { setLoading(false); }
  }
  async function sendFeedback(outfitId: string, liked: boolean) {
    setFeedbackMap(current => ({ ...current, [outfitId]: liked }));
    try {
      const response = await fetch("/api/outfits", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ outfitId, liked }) });
      if (!response.ok) { const result = await response.json(); throw new Error(result.error ?? "Could not save feedback."); }
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Could not save feedback."); }
  }
  function selectColorMode(mode: ColorMode) { setColorMode(mode); if (mode !== "specific") setPreferredColors([]); }
  function toggleColor(color: string) { setPreferredColors(current => current.includes(color) ? current.filter(value => value !== color) : [...current, color]); }

  return <div className="planner-flow">
    {!outfits.length ? <div className="planner-layout"><section className="planner-card planner-steps">
      <div className="step-title"><span className="step-number">01</span><div><h2>What’s the occasion?</h2><p>Pick the mood and we’ll find the right pieces.</p></div></div>
      <div className="occasion-options">{(["Formal", "Informal"] as const).map(type => <button key={type} className={`occasion-card ${occasion === type ? "chosen" : ""}`} onClick={() => setOccasion(type)}><span className={`occasion-icon ${type === "Formal" ? "formal" : "relaxed"}`}>{type === "Formal" ? <Sun size={19}/> : <Moon size={19}/>}</span><b>{type}</b><small>{type === "Formal" ? "Polished & put-together" : "Easy, everyday style"}</small></button>)}</div>
      <div className="step-title step-two"><span className="step-number">02</span><div><h2>Any color direction?</h2><p>We can match your mood or go with the flow.</p></div></div>
      <div className="color-options">{([ ["harmonious", "Harmonious"], ["bold", "Bold & vibrant"], ["specific", "Choose colors"], ["skip", "Surprise me"] ] as [ColorMode, string][]).map(([mode, label]) => <button key={mode} disabled={!occasion} className={`color-chip ${colorMode === mode ? "selected" : ""}`} onClick={() => selectColorMode(mode)}>{mode === "harmonious" && <span className="color-pair"><i/><i/></span>}{mode === "bold" && <span className="color-pair bold"><i/><i/></span>}{label}{mode === "specific" && <span className="color-dots"><i/><i/><i/></span>}</button>)}</div>
      {colorMode === "specific" && <div className="specific-colors"><span>Pick one or more colors</span><div>{swatches.map(color => <button key={color.name} className={preferredColors.includes(color.name) ? "chosen" : ""} title={color.name} aria-label={color.name} onClick={() => toggleColor(color.name)}><i style={{ backgroundColor: color.hex }}/>{preferredColors.includes(color.name) && <Check size={12}/>}</button>)}</div></div>}
      {error && <p className="planner-error" role="status">{error}</p>}
      <button className="primary-button generate-button" disabled={!occasion || !colorMode || loading || (colorMode === "specific" && preferredColors.length === 0)} onClick={() => void generate()}>{loading ? <><LoaderCircle className="spin" size={16}/> Putting looks together…</> : <>Find my outfits <ArrowRight size={17}/></>}</button>
    </section><aside className="planner-aside"><div className="planner-illustration"><span className="orbit-ring"/><div className="mini-spark"><Sparkles size={26}/></div><div className="floating-heart"><Heart size={16} fill="currentColor"/></div><div className="outfit-stack"><div className="stack-card back"/><div className="stack-card mid"/><div className="stack-card front"><div className="stack-top"/><div className="stack-bottom"/></div></div></div><span className="eyebrow">MADE FOR YOUR WARDROBE</span><h3>Good style, less guesswork.</h3><p>Wair brings your pieces together and helps you see them in a new way.</p><div className="aside-foot">YOUR CLOSET, IN A NEW LIGHT <Sparkles size={13}/></div></aside></div> : <section className="outfit-results">
      <div className="results-heading"><button className="back-button" onClick={() => setOutfits([])}><ArrowLeft size={15}/> Change preferences</button><div className="results-title"><span className="eyebrow">YOUR PERSONAL EDIT · {occasion?.toUpperCase()}</span><h2>Three ways to wear it.</h2><p>Fresh combinations from your wardrobe, with no shared pieces.</p></div><button className="secondary-button regenerate" onClick={() => void generate()} disabled={loading}>{loading ? <LoaderCircle className="spin" size={14}/> : <Sparkles size={14}/>} Generate again</button></div>
      <div className="outfit-carousel">{outfits.map((outfit, index) => <article className="outfit-card" key={outfit.id}><header><div><span className="outfit-index">LOOK 0{index + 1}</span><span className="outfit-occasion">{occasion}</span></div><span className="outfit-score">{Math.round(outfit.score)}% match</span></header><div className="outfit-pieces">{outfit.items.map(item => { const first = colorsFor(item.colors)[0]; return <div key={item.id} className="outfit-piece"><div className="outfit-piece-image"><img src={getImageUrl(item.imageKey)} alt={item.subcategory}/></div><div className="outfit-piece-meta"><span>{item.category}</span><b>{item.subcategory}</b>{first && <small><i style={{backgroundColor:first.hex}}/>{first.name}</small>}</div></div>; })}</div><p className="outfit-explanation">{outfit.explanation}</p><TryOnPreview outfitId={outfit.id} items={outfit.items} enabled={tryOnEnabled}/><footer className="outfit-feedback"><span>How does this look feel?</span><div><button className={feedbackMap[outfit.id] === true ? "liked" : ""} aria-label="Like outfit" onClick={() => void sendFeedback(outfit.id, true)}><ThumbsUp size={15}/></button><button className={feedbackMap[outfit.id] === false ? "disliked" : ""} aria-label="Dislike outfit" onClick={() => void sendFeedback(outfit.id, false)}><ThumbsDown size={15}/></button></div></footer></article>)}</div>
      <div className="results-mobile-hint"><span/> Swipe to see all three looks <span/></div>
      {error && <p className="planner-error" role="status">{error}</p>}
      <button className="primary-button regenerate-bottom" onClick={() => void generate()} disabled={loading}>{loading ? <LoaderCircle className="spin" size={15}/> : <Sparkles size={15}/>} Generate again</button>
    </section>}
  </div>;
}
