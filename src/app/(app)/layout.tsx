import { redirect } from "next/navigation";
import { getAuthedUser } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/actions/profile";
import { Sidebar } from "@/components/layout/Sidebar";
import { BottomNav } from "@/components/layout/BottomNav";
import { Header } from "@/components/layout/Header";
import { SetupRequired } from "@/components/common/SetupRequired";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  let user;
  try {
    user = await getAuthedUser();
  } catch {
    return <SetupRequired />;
  }

  if (!user) {
    redirect("/login");
  }

  // getCurrentProfile() reuses this same request's cached getAuthedUser()
  // call — no second round trip to the Auth server.
  const { profile, email } = await getCurrentProfile();

  return (
    <div className="flex min-h-svh">
      <Sidebar />
      <div className="flex min-h-svh flex-1 flex-col">
        <Header name={profile?.name ?? ""} email={email} />
        <main className="flex-1 overflow-y-auto pb-20 md:pb-0">
          <div className="mx-auto w-full max-w-5xl px-4 py-6 md:px-6">{children}</div>
        </main>
        <BottomNav />
      </div>
    </div>
  );
}
