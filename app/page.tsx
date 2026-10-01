"use client";
import { useState } from "react";
import { Shirt, Sparkles, ArrowRight } from "lucide-react";

export default function LoginPage() {
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [gender, setGender] = useState("OTHER");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function signIn(credentials: { name: string; password: string; gender: string }) {
    setError(""); setBusy(true);
    try {
      const response = await fetch("/api/auth", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(credentials) });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error ?? "Could not sign in.");
      localStorage.setItem("wair-user", JSON.stringify(result.user));
      window.location.assign("/wardrobe");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Could not sign in."); }
    finally { setBusy(false); }
  }
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await signIn({ name, password, gender });
  }
  return <main className="login-screen">
    <div className="login-photo" aria-hidden="true"><div className="photo-copy"><span className="eyebrow">A LITTLE MORE YOU, EVERY DAY</span><h2>Get dressed<br/>with intention.</h2><p>Your closet, reimagined as a daily source of inspiration.</p><div className="photo-dots"><i/><i/><i/></div></div></div>
    <section className="login-panel"><div className="brand"><span className="brand-icon"><Shirt size={19}/></span><span>wair</span></div><div className="login-form-wrap"><div className="round-icon"><Sparkles size={20}/></div><span className="eyebrow">YOUR PERSONAL STYLE, ORGANIZED</span><h1>Welcome to Wair</h1><p className="muted">Sign in or create an account to get started.</p>
      <form onSubmit={submit} className="login-form"><label>Your name<input value={name} onChange={e=>setName(e.target.value)} placeholder="e.g. Avery" required maxLength={60}/></label><label>Password<input value={password} onChange={e=>setPassword(e.target.value)} type="password" placeholder="Enter any password" required maxLength={100}/></label><label>Shop from<select value={gender} onChange={e=>setGender(e.target.value)}><option value="FEMALE">Women’s wardrobe</option><option value="MALE">Men’s wardrobe</option><option value="OTHER">Show me everything</option></select></label>{error&&<p className="error" role="alert">{error}</p>}<button className="primary-button" disabled={busy}>{busy?"Getting things ready…":"Continue"}<ArrowRight size={17}/></button></form><div className="demo-login-divider"><span>OR JUMP INTO THE DEMO</span></div><button type="button" className="secondary-button demo-login-button" onClick={() => void signIn({ name: "Avery", password: "wair-demo", gender: "OTHER" })} disabled={busy}><Sparkles size={15}/>{busy ? "Opening Wair…" : "Explore the demo as Avery"}</button><p className="login-footnote">No email needed · your demo wardrobe is ready</p>
    </div><span className="panel-caption">MAKE ROOM FOR YOURSELF</span></section>
  </main>;
}
