"use client";
import { useRef, useState } from "react";
import { Check, ChevronDown, ImageUp, LoaderCircle, LockKeyhole, ScanFace, Sparkles, Upload, X } from "lucide-react";

const faceShapes = ["Oval", "Round", "Square", "Heart", "Oblong"] as const;
const bodyTypes = ["Rectangle", "Pear", "Inverted triangle", "Hourglass", "Athletic"] as const;
type FaceShape = typeof faceShapes[number];
type BodyType = typeof bodyTypes[number];

function classifyFace(landmarks: Array<{ x: number; y: number }>): FaceShape {
  const at = (index: number) => landmarks[index] ?? { x: 0, y: 0 };
  const distance = (a: number, b: number) => Math.hypot(at(a).x - at(b).x, at(a).y - at(b).y);
  const forehead = distance(10, 152);
  const cheekbones = distance(234, 454);
  const jaw = distance(172, 397);
  const faceLength = distance(10, 152);
  const ratio = faceLength / Math.max(cheekbones, 0.001);
  const jawRatio = jaw / Math.max(cheekbones, 0.001);
  // Landmark ratio heuristics are intentionally approximate; user confirmation stays in the flow.
  if (ratio > 1.48) return "Oblong";
  if (jawRatio < 0.72) return "Heart";
  if (ratio < 1.13) return jawRatio > 0.84 ? "Square" : "Round";
  if (jawRatio > 0.88 && ratio < 1.27) return "Square";
  if (ratio >= 1.13 && ratio <= 1.48) return "Oval";
  return "Oval";
}

export function ProfileEditor({ initialFaceShape, initialBodyType }: { initialFaceShape: string; initialBodyType: string }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [faceShape, setFaceShape] = useState<FaceShape | "">(faceShapes.includes(initialFaceShape as FaceShape) ? initialFaceShape as FaceShape : "");
  const [bodyType, setBodyType] = useState<BodyType | "">(bodyTypes.includes(initialBodyType as BodyType) ? initialBodyType as BodyType : "");
  const [suggestion, setSuggestion] = useState<FaceShape | "">("");
  const [previewUrl, setPreviewUrl] = useState("");
  const [photoName, setPhotoName] = useState("");
  const [detecting, setDetecting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState(false);

  async function detect(file?: File) {
    if (!file) return;
    setMessage(""); setError(false); setSuggestion(""); setDetecting(true); setPhotoName(file.name);
    const localUrl = URL.createObjectURL(file); setPreviewUrl(localUrl);
    try {
      const image = new Image(); image.src = localUrl;
      await image.decode();
      const { FaceLandmarker, FilesetResolver } = await import("@mediapipe/tasks-vision");
      const vision = await FilesetResolver.forVisionTasks("https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.18/wasm");
      const detector = await FaceLandmarker.createFromOptions(vision, {
        baseOptions: { modelAssetPath: "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task", delegate: "CPU" },
        runningMode: "IMAGE", numFaces: 1, outputFaceBlendshapes: false, outputFacialTransformationMatrixes: false,
      });
      try {
        const results = detector.detect(image);
        const landmarks = results.faceLandmarks[0];
        if (!landmarks) throw new Error("No face was found. Try a clear, front-facing photo.");
        const found = classifyFace(landmarks);
        setSuggestion(found); setFaceShape(found); setMessage(`Wair estimates your face shape is ${found}. Confirm it or choose a different shape.`);
      } finally { detector.close(); }
    } catch (cause) {
      setError(true); setMessage(cause instanceof Error ? cause.message : "Could not analyze this photo. Please select a face shape manually.");
    } finally { setDetecting(false); }
  }

  async function save() {
    setSaving(true); setMessage(""); setError(false);
    try {
      const response = await fetch("/api/profile", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ faceShape: faceShape || null, bodyType: bodyType || null }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Could not save profile.");
      try {
        const raw = localStorage.getItem("wair-user");
        if (raw) localStorage.setItem("wair-user", JSON.stringify({ ...JSON.parse(raw), faceShape: result.user.faceShape, bodyType: result.user.bodyType }));
      } catch { /* Server profile is saved even if local display data is unavailable. */ }
      setMessage("Profile saved. Your selections are ready to guide future suggestions.");
    } catch (cause) { setError(true); setMessage(cause instanceof Error ? cause.message : "Could not save profile."); }
    finally { setSaving(false); }
  }

  function clearPhoto() {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(""); setPhotoName(""); setSuggestion(""); setMessage(""); setError(false);
  }

  return <div className="profile-stage"><input ref={inputRef} className="visually-hidden" type="file" accept="image/*" onChange={event => { void detect(event.target.files?.[0]); event.target.value = ""; }}/>
    <section className="profile-form-card"><div className="profile-card-heading"><span className="settings-icon"><Sparkles size={18}/></span><div><h2>Your fit preferences</h2><p>These details help Wair shape its recommendations around you.</p></div></div>
      <label className="profile-select-label">Face shape <span>Optional</span><div className="profile-select-wrap"><select value={faceShape} onChange={event => setFaceShape(event.target.value as FaceShape | "")}><option value="">Choose a face shape</option>{faceShapes.map(shape => <option key={shape}>{shape}</option>)}</select><ChevronDown size={16}/></div></label>
      <label className="profile-select-label">Body type <span>Optional</span><div className="profile-select-wrap"><select value={bodyType} onChange={event => setBodyType(event.target.value as BodyType | "")}><option value="">Choose a body type</option>{bodyTypes.map(type => <option key={type}>{type}</option>)}</select><ChevronDown size={16}/></div></label>
      <div className="body-type-hint"><span className="hint-glyph">↗</span><p>Pick the closest fit. This is for styling suggestions, not a measurement.</p></div>
      <button className="primary-button profile-save" onClick={() => void save()} disabled={saving}>{saving ? <LoaderCircle className="spin" size={15}/> : <Check size={15}/>} Save preferences</button>
      {message && <p className={`profile-message ${error ? "is-error" : ""}`} role="status">{message}</p>}
    </section>
    <section className="face-upload-card"><div className="face-upload-top"><span className="eyebrow">OPTIONAL · ON-DEVICE ANALYSIS</span><span className="privacy-chip"><LockKeyhole size={12}/> Private</span></div>
      <div className={`face-photo-stage ${previewUrl ? "has-photo" : ""}`}>{previewUrl ? <><img src={previewUrl} alt="Local face preview"/><button className="remove-photo" onClick={clearPhoto} aria-label="Remove photo"><X size={14}/></button>{detecting && <div className="photo-busy"><LoaderCircle className="spin" size={20}/> <span>Finding landmarks…</span></div>}</> : <><div className="face-orbit-art"><span className="orbit-a"/><span className="orbit-b"/><div className="face-scan-icon"><ScanFace size={51}/></div><span className="scan-star">✳</span></div><p>Choose a front-facing photo<br/>in clear, even light.</p></>}</div>
      <div className="face-upload-copy"><h2>Estimate your face shape</h2><p>MediaPipe checks facial landmark proportions right in your browser. The photo stays on this device.</p></div>
      <button className="secondary-button face-upload-button" onClick={() => inputRef.current?.click()} disabled={detecting}>{detecting ? <LoaderCircle className="spin" size={15}/> : previewUrl ? <ScanFace size={15}/> : <Upload size={15}/>} {detecting ? "Analyzing photo…" : previewUrl ? "Try another photo" : "Upload a face photo"}</button>
      {photoName && <div className="photo-filename"><ImageUp size={13}/><span>{photoName}</span>{!detecting && !error && suggestion && <Check size={13}/>}</div>}
      {suggestion && <div className="suggestion-card"><span className="suggestion-icon"><Sparkles size={15}/></span><div><small>MEDIAPIPE SUGGESTS</small><b>{suggestion} face shape</b></div><span className="suggestion-note">Confirm or adjust above</span></div>}
      {error && message && <p className="profile-message is-error face-error" role="status">{message}</p>}
      <div className="private-note"><LockKeyhole size={13}/><span>Photo analysis stays in this browser. Only your confirmed shape is saved.</span></div>
    </section>
  </div>;
}
