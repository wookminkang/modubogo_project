import { cookies } from 'next/headers';

export async function isAdmin(): Promise<boolean> {
  const cookieStore = await cookies();
  const session = cookieStore.get('admin_session');
  return !!process.env.ADMIN_PASSWORD && session?.value === process.env.ADMIN_PASSWORD;
}
