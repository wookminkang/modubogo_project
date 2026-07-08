import { redirect } from "next/navigation";
import { isAdmin } from "@/lib/admin";
import { listDesignRequests, listDesigners } from "@/lib/db";
import OutsourceView from "./OutsourceView";

export const dynamic = "force-dynamic";

export default async function OutsourcePage() {
  const admin = await isAdmin();
  if (!admin) redirect("/admin/login");

  const [requests, designers] = await Promise.all([
    listDesignRequests(),
    listDesigners(),
  ]);
  return <OutsourceView requests={requests} designers={designers} />;
}
