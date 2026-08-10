"use client";

import { useState, useTransition } from "react";
import Toast from "@/components/Toast";
import type { MenuKey } from "@/lib/admin";
import { toggleMenuPermission, toggleEmployeeMenuPermission } from "./actions";

export interface AccountRow {
  id: string;
  username: string;
  name: string;
  role: "super" | "staff";
  allowed_menus: string[] | null;
}

export interface EmployeeAccountRow {
  id: string;
  username: string;
  name: string;
  allowed_menus: string[] | null;
}

// 관리자 헤더 탭 전체 — Header.tsx TABS와 키를 맞춘다.
const ADMIN_MENUS: { key: MenuKey; label: string }[] = [
  { key: "ledger", label: "입금·소진 관리" },
  { key: "hospital", label: "병원목록" },
  { key: "report", label: "보고서" },
  { key: "holiday", label: "진료일정" },
  { key: "outsource", label: "외주 관리" },
  { key: "site-analysis", label: "사이트 분석" },
  { key: "geo-check", label: "GEO 체크" },
  { key: "employees", label: "직원 관리" },
];

// 직원 사이드바 확장 메뉴 — EmployeeSidebar.tsx EXTRA_NAV와 키를 맞춘다.
const EMPLOYEE_MENUS: { key: string; label: string }[] = [
  { key: "holiday", label: "진료일정" },
];

function ToggleSwitch({
  granted,
  disabled,
  onClick,
}: {
  granted: boolean;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={granted}
      disabled={disabled}
      onClick={onClick}
      className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${
        granted ? "bg-[#0e299c]" : "bg-gray-200"
      } ${disabled ? "opacity-50" : ""}`}
    >
      <span
        className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${
          granted ? "left-[22px]" : "left-0.5"
        }`}
      />
    </button>
  );
}

export default function MenuPermissionEditor({
  accounts,
  employees,
}: {
  accounts: AccountRow[];
  employees: EmployeeAccountRow[];
}) {
  // 서버 revalidate 전 즉시 반영용 로컬 상태
  const [adminRows, setAdminRows] = useState(accounts);
  const [empRows, setEmpRows] = useState(employees);
  const [toast, setToast] = useState("");
  const [, startTransition] = useTransition();

  const toggleLocal = <T extends { id: string; allowed_menus: string[] | null }>(
    rows: T[],
    id: string,
    menu: string,
    granted: boolean
  ) =>
    rows.map((r) => {
      if (r.id !== id) return r;
      const set = new Set(r.allowed_menus ?? []);
      if (granted) set.add(menu);
      else set.delete(menu);
      return { ...r, allowed_menus: Array.from(set) };
    });

  const handleAdminToggle = (row: AccountRow, menu: MenuKey, granted: boolean) => {
    setAdminRows((prev) => toggleLocal(prev, row.id, menu, granted));
    startTransition(async () => {
      const result = await toggleMenuPermission(row.id, menu, granted);
      if (result.ok) {
        const label = ADMIN_MENUS.find((m) => m.key === menu)?.label;
        setToast(`${row.name} · ${label} ${granted ? "허용" : "차단"}`);
      } else {
        setAdminRows((prev) => prev.map((r) => (r.id === row.id ? row : r)));
        setToast(result.error ?? "저장에 실패했습니다.");
      }
    });
  };

  const handleEmployeeToggle = (
    row: EmployeeAccountRow,
    menu: string,
    granted: boolean
  ) => {
    setEmpRows((prev) => toggleLocal(prev, row.id, menu, granted));
    startTransition(async () => {
      const result = await toggleEmployeeMenuPermission(row.id, menu, granted);
      if (result.ok) {
        const label = EMPLOYEE_MENUS.find((m) => m.key === menu)?.label;
        setToast(`${row.name} · ${label} ${granted ? "허용" : "차단"}`);
      } else {
        setEmpRows((prev) => prev.map((r) => (r.id === row.id ? row : r)));
        setToast(result.error ?? "저장에 실패했습니다.");
      }
    });
  };

  return (
    <div className="flex flex-col gap-5">
      {/* 관리자 계정 — 상단 헤더 탭 권한 */}
      <section className="flex flex-col gap-3">
        <h2 className="px-1 text-sm font-bold text-gray-500">
          관리자 계정 (상단 헤더 메뉴)
        </h2>
        {adminRows.map((row) => (
          <div key={row.id} className="bg-white rounded-2xl p-4 shadow-sm">
            <div className="flex items-center gap-2">
              <span className="font-bold text-gray-900 truncate">{row.name}</span>
              <span
                className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-bold ${
                  row.role === "super"
                    ? "bg-[#0e299c]/10 text-[#0e299c]"
                    : "bg-gray-100 text-gray-500"
                }`}
              >
                {row.role === "super" ? "슈퍼관리자" : "관리자"}
              </span>
              <span className="text-xs text-gray-400">{row.username}</span>
            </div>

            {row.role === "super" ? (
              <p className="mt-2 text-xs text-gray-400">
                슈퍼관리자는 모든 메뉴에 항상 접근할 수 있어요.
              </p>
            ) : (
              <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2.5">
                {ADMIN_MENUS.map((menu) => {
                  const granted = (row.allowed_menus ?? []).includes(menu.key);
                  return (
                    <label
                      key={menu.key}
                      className="flex cursor-pointer items-center justify-between gap-2"
                    >
                      <span className="text-sm text-gray-600">{menu.label}</span>
                      <ToggleSwitch
                        granted={granted}
                        onClick={() => handleAdminToggle(row, menu.key, !granted)}
                      />
                    </label>
                  );
                })}
              </div>
            )}
          </div>
        ))}
      </section>

      {/* 직원 계정 — 사이드바 확장 메뉴 권한 */}
      <section className="flex flex-col gap-3">
        <h2 className="px-1 text-sm font-bold text-gray-500">
          직원 계정 (사이드바 확장 메뉴)
        </h2>
        {empRows.map((row) => (
          <div key={row.id} className="bg-white rounded-2xl p-4 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-2">
                <span className="font-bold text-gray-900 truncate">{row.name}</span>
                <span className="text-xs text-gray-400">{row.username}</span>
              </div>
              <div className="flex shrink-0 items-center gap-4">
                {EMPLOYEE_MENUS.map((menu) => {
                  const granted = (row.allowed_menus ?? []).includes(menu.key);
                  return (
                    <label
                      key={menu.key}
                      className="flex cursor-pointer items-center gap-2"
                    >
                      <span className="text-sm text-gray-600">{menu.label}</span>
                      <ToggleSwitch
                        granted={granted}
                        onClick={() =>
                          handleEmployeeToggle(row, menu.key, !granted)
                        }
                      />
                    </label>
                  );
                })}
              </div>
            </div>
          </div>
        ))}
        {empRows.length === 0 && (
          <div className="bg-white rounded-2xl p-8 text-center text-sm text-gray-400 shadow-sm">
            승인된 직원 계정이 없습니다.
          </div>
        )}
      </section>

      <p className="text-xs text-gray-400 px-1">
        권한을 끄면 해당 계정의 메뉴가 숨겨지고 페이지 접근도 차단됩니다. 직원
        계정의 진료일정은 직원 로그인 후 왼쪽 사이드바에 노출됩니다.
      </p>

      {toast && <Toast message={toast} onDone={() => setToast("")} />}
    </div>
  );
}
