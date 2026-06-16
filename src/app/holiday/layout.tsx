import { isAdmin } from "@/lib/admin";
import { HolidayChrome } from "./HolidayChrome";

export default async function HolidayLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const admin = await isAdmin();
  return <HolidayChrome admin={admin}>{children}</HolidayChrome>;
}
