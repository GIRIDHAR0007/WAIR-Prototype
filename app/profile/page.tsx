import { AppShell, PageHeading } from "@/components/app-shell";
import { ProfileEditor } from "@/components/profile-editor";
import { getCurrentUser } from "@/lib/wardrobe/user";
export const dynamic = "force-dynamic";
export default async function ProfilePage() {
  const user = await getCurrentUser();
  return <AppShell><div className="content"><PageHeading eyebrow="A FIT THAT FEELS LIKE YOU" title="Your profile" description="A few details help Wair make more personal suggestions."/><ProfileEditor initialFaceShape={user?.faceShape ?? ""} initialBodyType={user?.bodyType ?? ""}/></div></AppShell>;
}
