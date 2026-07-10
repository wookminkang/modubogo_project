import { redirect } from "next/navigation";
import { isAdmin } from "@/lib/admin";
import { listDesignRequests, listDesigners, listOutsourcePosts } from "@/lib/db";
import OutsourceView from "./OutsourceView";

export const dynamic = "force-dynamic";

export default async function OutsourcePage() {
  const admin = await isAdmin();
  if (!admin) redirect("/admin/login");

  const [requests, designers, posts] = await Promise.all([
    listDesignRequests(),
    listDesigners(),
    listOutsourcePosts(),
  ]);
  return (
    <OutsourceView requests={requests} designers={designers} posts={posts} />
  );
}
