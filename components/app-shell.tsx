"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Shirt, UserRound, Sparkles, Search, Menu, LogOut, X } from "lucide-react";

const links = [{ href: "/wardrobe", label: "Wardrobe", icon: Shirt }, { href: "/profile", label: "Profile", icon: UserRound }, { href: "/planner", label: "Outfit Planner", icon: Sparkles }];
export function AppShell({ children }: { children: React.ReactNode }) {
  const path = usePathname(); const router = useRouter();
  const [user, setUser] = useState<{ name: string; gender: string } | null>(null);
  const [wardrobeCount, setWardrobeCount] = useState<number | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  useEffect(() => {
    try { const raw = localStorage.getItem("wair-user"); if (raw) setUser(JSON.parse(raw)); } catch { /* Ignore stale local demo data. */ }
    const refreshCount = () => { void fetch("/api/wardrobe").then(response => response.ok ? response.json() : null).then(result => { if (result && Array.isArray(result.items)) setWardrobeCount(result.items.length); }).catch(() => {}); };
    window.addEventListener("wair-wardrobe-updated", refreshCount);
    refreshCount();
    return () => window.removeEventListener("wair-wardrobe-updated", refreshCount);
  }, [path]);
  const initial = user?.name?.charAt(0).toUpperCase() ?? "W";
  function signOut() { localStorage.removeItem("wair-user"); document.cookie="wair-user=; Max-Age=0; path=/"; setMobileMenuOpen(false); router.push("/"); }
  return <div className="app-frame"><aside className="sidebar"><Link href="/wardrobe" className="brand"><span className="brand-icon"><Shirt size={19}/></span><span>wair</span><span className="brand-dot">.</span></Link><div className="side-label">YOUR SPACE</div><nav>{links.map(({href,label,icon:Icon})=><Link key={href} href={href} className={`nav-link ${path===href?"active":""}`}><Icon size={18}/><span>{label}</span>{href==="/wardrobe"&&<span className="nav-count">{wardrobeCount ?? "—"}</span>}</Link>)}</nav><div className="sidebar-bottom"><div className="weather-card"><div className="sun">☼</div><div><b>Dress for the day</b><small>A good outfit starts here.</small></div></div><button className="user-row" onClick={signOut}><span className="avatar">{initial}</span><span className="user-meta"><b>{user?.name??"Your profile"}</b><small>{user?.gender?.toLowerCase()??"Style space"}</small></span><LogOut size={15}/></button></div></aside>
    <header className="mobile-header"><Link href="/wardrobe" className="brand"><span className="brand-icon"><Shirt size={18}/></span>wair</Link><button aria-label={mobileMenuOpen ? "Close menu" : "Open menu"} aria-expanded={mobileMenuOpen} className="mobile-menu" onClick={()=>setMobileMenuOpen(value=>!value)}>{mobileMenuOpen ? <X size={20}/> : <Menu size={20}/>}</button></header>
    {mobileMenuOpen && <div className="mobile-drawer-backdrop" onClick={()=>setMobileMenuOpen(false)}><section className="mobile-drawer" onClick={event=>event.stopPropagation()}><div className="mobile-drawer-user"><span className="avatar">{initial}</span><div className="user-meta"><b>{user?.name??"Your profile"}</b><small>{user?.gender?.toLowerCase()??"Style space"}</small></div></div><nav>{links.map(({href,label,icon:Icon})=><Link key={href} href={href} onClick={()=>setMobileMenuOpen(false)} className={`nav-link ${path===href?"active":""}`}><Icon size={18}/><span>{label}</span>{href==="/wardrobe"&&<span className="nav-count">{wardrobeCount ?? "—"}</span>}</Link>)}</nav><button className="user-row" onClick={signOut}><span className="avatar">{initial}</span><span className="user-meta"><b>Sign out</b><small>Return to the welcome screen</small></span><LogOut size={15}/></button></section></div>}
    <main className="main-area"><div className="topbar"><div className="breadcrumb">MY SPACE <span>/</span> {links.find(l=>l.href===path)?.label.toUpperCase()??"WARDROBE"}</div><div className="top-actions"><button className="icon-button" aria-label="Search"><Search size={17}/></button><span className="avatar small">{initial}</span></div></div>{children}</main>
    <nav className="bottom-nav">{links.map(({href,label,icon:Icon})=><Link key={href} href={href} className={path===href?"active":""}><Icon size={19}/><span>{label}</span></Link>)}</nav>
  </div>;
}
export function PageHeading({ eyebrow, title, description, action }: { eyebrow: string; title: string; description: string; action?: React.ReactNode }) { return <div className="page-heading"><div><div className="eyebrow">{eyebrow}</div><h1>{title}</h1><p>{description}</p></div>{action}</div>; }
