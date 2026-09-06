import { redirect } from "next/navigation";
import { getAuthedUser } from "@/lib/supabase/server";
import { SetupRequired } from "@/components/common/SetupRequired";

export default async function RootPage() {
  let userExists = false;
  try {
    userExists = Boolean(await getAuthedUser());
  } catch {
    return <SetupRequired />;
  }

  redirect(userExists ? "/dashboard" : "/login");
}
