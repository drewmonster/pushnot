import { redirect } from "next/navigation";
import { CampaignDashboard } from "@/components/CampaignDashboard";
import { getCurrentSession } from "@/lib/session";

export default function Page() {
  const session = getCurrentSession();

  if (!session) {
    redirect("/login");
  }

  return <CampaignDashboard />;
}
