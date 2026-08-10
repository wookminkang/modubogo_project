import { getAdminUser } from "@/lib/admin";
import { HolidayChrome } from "./HolidayChrome";

export default async function HolidayLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getAdminUser();
  return (
    <HolidayChrome user={user && { name: user.name, role: user.role, allowedMenus: user.allowed_menus }}>
      {children}
    </HolidayChrome>
  );
}
