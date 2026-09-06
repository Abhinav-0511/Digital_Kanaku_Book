import { SearchClient } from "@/components/search/SearchClient";
import { getCurrentProfile } from "@/lib/actions/profile";

export default async function SearchPage() {
  const { profile } = await getCurrentProfile();

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Search</h1>
      <SearchClient weightUnit={profile?.weightUnit ?? "kg"} />
    </div>
  );
}
