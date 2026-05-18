import { redirect } from "next/navigation";
import Link from "next/link";
import { isAdmin } from "@/lib/admin";
import { getAlimtalkLogs } from "@/lib/db";
import { ArrowLeft, Calendar, Phone } from "lucide-react";

export const dynamic = "force-dynamic";

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

export default async function AlimtalkLogsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const admin = await isAdmin();
  if (!admin) redirect("/admin/login");

  const { status } = await searchParams;
  const activeTab = status === "failed" ? "failed" : "success";

  const allLogs = await getAlimtalkLogs();
  const logs = allLogs.filter((l) => l.status === activeTab);

  const successCount = allLogs.filter((l) => l.status === "success").length;
  const failedCount = allLogs.filter((l) => l.status === "failed").length;

  return (
    <div className="min-h-screen bg-[#F0F4FA]">
      <div className="px-4 py-6 flex flex-col gap-5 pb-12">
        {/* 헤더 */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-[#0e299c]">알림톡 발송 이력</h1>
            <p className="text-sm text-gray-400 mt-0.5">총 {allLogs.length}건</p>
          </div>
          <Link
            href="/admin/dashboard"
            className="flex items-center gap-1 text-sm text-gray-500 bg-white px-3 py-2 rounded-xl shadow-sm"
          >
            <ArrowLeft size={14} />
            대시보드
          </Link>
        </div>

        {/* 탭 */}
        <div className="flex bg-white rounded-2xl shadow-sm p-1 gap-1">
          <Link
            href="/admin/alimtalk-logs?status=success"
            className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-semibold transition-colors ${
              activeTab === "success"
                ? "bg-[#0e299c] text-white shadow-sm"
                : "text-gray-400 hover:text-gray-600"
            }`}
          >
            발송 완료
            <span className={`text-xs px-1.5 py-0.5 rounded-full font-bold ${activeTab === "success" ? "bg-white/20 text-white" : "bg-gray-100 text-gray-500"}`}>
              {successCount}
            </span>
          </Link>
          <Link
            href="/admin/alimtalk-logs?status=failed"
            className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-semibold transition-colors ${
              activeTab === "failed"
                ? "bg-[#0e299c] text-white shadow-sm"
                : "text-gray-400 hover:text-gray-600"
            }`}
          >
            발송 실패
            <span className={`text-xs px-1.5 py-0.5 rounded-full font-bold ${activeTab === "failed" ? "bg-white/20 text-white" : "bg-gray-100 text-gray-500"}`}>
              {failedCount}
            </span>
          </Link>
        </div>

        {/* 로그 목록 */}
        {logs.length === 0 ? (
          <div className="bg-white rounded-2xl p-8 shadow-sm text-center text-gray-400 text-sm">
            {activeTab === "success" ? "발송 완료 이력이 없어요" : "발송 실패 이력이 없어요"}
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
            {logs.map((log, idx) => {
              const recipients = log.recipients as string[];
              const isSuccess = log.status === "success";
              return (
                <div
                  key={log.id}
                  className={`px-4 py-4 flex flex-col gap-2 ${idx !== logs.length - 1 ? "border-b border-gray-100" : ""}`}
                >
                  {/* 1행: 상호명 + 월 보고서 */}
                  <div className="flex items-baseline gap-2">
                    <span className="text-base font-bold text-gray-900">{log.company}</span>
                    <span className="text-sm text-gray-400">{log.month} 월 보고서</span>
                  </div>

                  {/* 2행: 날짜 + 건수 */}
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1 text-xs text-gray-400">
                      <Calendar size={12} />
                      {formatDate(log.sent_at)}
                    </span>
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${isSuccess ? "text-green-600 bg-green-50" : "text-red-500 bg-red-50"}`}>
                      {recipients.length}건 전송
                    </span>
                  </div>

                  {/* 실패 시 오류 메시지 */}
                  {!isSuccess && (
                    <p className="text-xs text-red-400">
                      {log.error_message ?? "발송에 실패했습니다."}
                    </p>
                  )}

                  {/* 3행: 수신자 번호 */}
                  <div className="flex flex-wrap gap-2">
                    {recipients.map((r, i) => (
                      <span key={i} className="flex items-center gap-1 text-xs text-gray-600 bg-gray-50 border border-gray-200 px-2 py-0.5 rounded-full">
                        <Phone size={11} className="text-gray-400" />
                        {r}
                      </span>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
