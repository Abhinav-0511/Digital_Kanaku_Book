import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SetupRequired } from "@/components/common/SetupRequired";

export default async function RootPage() {
  let userExists = false;
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    userExists = Boolean(user);
  } catch {
    return <SetupRequired />;
  }

  redirect(userExists ? "/dashboard" : "/login");
}
