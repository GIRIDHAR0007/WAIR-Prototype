import { AppShell, PageHeading } from "@/components/app-shell";
import { OutfitPlanner } from "@/components/outfit-planner";
export default function PlannerPage() {
  const tryOnEnabled = process.env.ENABLE_VIRTUAL_TRY_ON === "true" && Boolean(process.env.OPENAI_API_KEY);
  return <AppShell><div className="content"><PageHeading eyebrow="A FRESH WAY TO GET DRESSED" title="Outfit planner" description="Tell us what the day has in store. We’ll take it from there."/><OutfitPlanner tryOnEnabled={tryOnEnabled}/></div></AppShell>;
}
