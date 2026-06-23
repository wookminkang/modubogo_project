import { redirect } from "next/navigation";
import { isAdmin } from "@/lib/admin";
import { listIntakes } from "@/lib/db";
import IntakesView from "./IntakesView";

export const dynamic = "force-dynamic";

export default async function IntakesPage() {
  const admin = await isAdmin();
  if (!admin) redirect("/admin/login");

  const intakes = await listIntakes();
  return <IntakesView intakes={intakes} />;
}
