import { Crown, UserCog, Users } from "lucide-react";
import dayjs from "@/lib/dayjs";
import { listAdminUsers } from "@/lib/admin-users";

export const dynamic = "force-dynamic";

const ROLE_META = {
  super: { label: "슈퍼관리자", cls: "bg-[#0e299c]/10 text-[#0e299c]", Icon: Crown },
  staff: { label: "관리자", cls: "bg-gray-100 text-gray-600", Icon: UserCog },
} as const;

export default async function SuperAccountsPage() {
  const users = await listAdminUsers();
  const superCount = users.filter((u) => u.role === "super").length;
  const staffCount = users.filter((u) => u.role === "staff").length;

  return (
    <div className="flex flex-col gap-6">
      {/* 헤더 */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">계정 관리</h1>
        <p className="text-sm text-gray-500 mt-1">
          가입된 관리자 계정을 확인할 수 있어요.
        </p>
      </div>

      {/* 요약 카드 */}
      <div className="grid grid-cols-3 gap-3">
        <StatCard icon={<Users size={16} />} label="전체" value={users.length} />
        <StatCard
          icon={<Crown size={16} />}
          label="슈퍼관리자"
          value={superCount}
        />
        <StatCard
          icon={<UserCog size={16} />}
          label="관리자"
          value={staffCount}
        />
      </div>

      {/* 계정 목록 */}
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
          <span className="text-sm font-bold text-gray-700">
            가입 계정 ({users.length})
          </span>
        </div>

        {users.length === 0 ? (
          <p className="px-5 py-10 text-center text-sm text-gray-400">
            가입된 계정이 없어요.
          </p>
        ) : (
          <ul className="divide-y divide-gray-50">
            {users.map((u) => {
              const meta = ROLE_META[u.role] ?? ROLE_META.staff;
              const RoleIcon = meta.Icon;
              return (
                <li
                  key={u.id}
                  className="flex items-center justify-between gap-3 px-5 py-4"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">
                      {u.name}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5 truncate">
                      @{u.username}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span
                      className={`inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full ${meta.cls}`}
                    >
                      <RoleIcon size={12} />
                      {meta.label}
                    </span>
                    <span className="hidden sm:block text-xs text-gray-400 w-20 text-right">
                      {dayjs(u.created_at).format("YYYY.MM.DD")}
                    </span>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
}) {
  return (
    <div className="bg-white rounded-2xl shadow-sm px-4 py-4 flex flex-col gap-1.5">
      <span className="inline-flex items-center gap-1.5 text-xs text-gray-400">
        {icon}
        {label}
      </span>
      <span className="text-2xl font-bold text-gray-900">{value}</span>
    </div>
  );
}
