'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

export async function loginAdmin(formData: FormData) {
  const password = formData.get('password') as string;

  if (password && password === process.env.ADMIN_PASSWORD) {
    const cookieStore = await cookies();
    cookieStore.set('admin_session', password, {
      httpOnly: true,
      maxAge: 60 * 60 * 24 * 7,
      path: '/',
    });
    redirect('/report');
  }

  redirect('/admin/login?error=1');
}

export async function logoutAdmin() {
  const cookieStore = await cookies();
  cookieStore.delete('admin_session');
  redirect('/report');
}
