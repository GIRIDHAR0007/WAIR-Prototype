import Link from "next/link";
import { AppShell, PageHeading } from "@/components/app-shell";
import { WardrobeLibrary, type WardrobeRow } from "@/components/wardrobe-library";
import { db } from "@/lib/db";
import { wardrobeItems } from "@/lib/db/schema";
import { desc, eq } from "drizzle-orm";
import { getCurrentUser } from "@/lib/wardrobe/user";
import { ArrowUpRight, Sparkles, Sun } from "lucide-react";
export const dynamic = "force-dynamic";
export default async function WardrobePage() {
  const user = await getCurrentUser();
  const items = user ? await db.select().from(wardrobeItems).where(eq(wardrobeItems.userId, user.id)).orderBy(desc(wardrobeItems.createdAt)) : [];
  return <AppShell><div className="content"><PageHeading eyebrow="YOUR PERSONAL COLLECTION" title="Your wardrobe" description="A little outfit inspiration, right at your fingertips."/>
    <section className="welcome-banner"><div className="banner-glow"/><div className="banner-copy"><span className="banner-label"><Sun size={14}/> YOUR DAILY EDIT</span><h2>Good morning{user?.name?`, ${user.name}`:""}.</h2><p>Let’s find something that feels like you today.</p><Link className="banner-button" href="/planner">Plan an outfit <ArrowUpRight size={15}/></Link></div><div className="banner-mark"><Sparkles size={38}/><span>✳</span></div><div className="banner-number">01 <small>/ DAILY NOTE</small></div></section>
    <WardrobeLibrary initialItems={items as WardrobeRow[]} gender={(user?.gender ?? "OTHER") as "MALE" | "FEMALE" | "OTHER"}/>
  </div></AppShell>;
}
