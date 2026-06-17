'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { getReportFromDB, resolveCompanyParam } from '@/lib/db';

export async function verifyReportPassword(
  reportId: number,
  company: string,
  month: string,
  formData: FormData
) {
  const input = (formData.get('password') as string) ?? '';
  const decoded = await resolveCompanyParam(company);
  const report = await getReportFromDB(decoded, month);

  if (report?.password && report.password === input) {
    const cookieStore = await cookies();
    cookieStore.set(`report_auth_${reportId}`, input, {
      httpOnly: true,
      maxAge: 60 * 60 * 24,
      path: '/',
    });
    redirect(`/report/${company}/${month}`);
  }

  redirect(`/report/${company}/${month}?auth_error=1`);
}
