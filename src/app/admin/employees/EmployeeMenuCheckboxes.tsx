"use client";

import { useState, useTransition } from "react";
import { Check } from "lucide-react";
import Toast from "@/components/Toast";
import { EMPLOYEE_MENUS } from "@/lib/employee-menus";
import { setEmployeeMenusAction } from "@/lib/employee-actions";

/**
 * 직원 카드 안의 메뉴 권한 체크박스. 체크 즉시 저장(낙관적 반영 → 실패 시 롤백+Toast).
 * `/admin/accounts`의 슈퍼관리자 토글과 같은 `employees.allowed_menus` 컬럼을 다룬다.
 */
export default function EmployeeMenuCheckboxes({
  employeeId,
  employeeName,
  initialMenus,
}: {
  employeeId: string;
  employeeName: string;
  initialMenus: string[];
}) {
  const [menus, setMenus] = useState<string[]>(initialMenus);
  const [toast, setToast] = useState("");
  const [isPending, startTransition] = useTransition();

  const toggle = (key: string, checked: boolean) => {
    const prev = menus;
    const next = checked ? Array.from(new Set([...prev, key])) : prev.filter((m) => m !== key);
    setMenus(next);
    startTransition(async () => {
      const result = await setEmployeeMenusAction(employeeId, next);
      if (result.ok) {
        const label = EMPLOYEE_MENUS.find((m) => m.key === key)?.label ?? key;
        setToast(`${employeeName} · ${label} ${checked ? "허용" : "차단"}`);
      } else {
        setMenus(prev);
        setToast(result.error ?? "저장에 실패했습니다.");
      }
    });
  };

  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-gray-100 pt-3">
      <span className="text-xs text-gray-400 shrink-0">메뉴 권한</span>
      {EMPLOYEE_MENUS.map((menu) => {
        const checked = menus.includes(menu.key);
        return (
          <label
            key={menu.key}
            title={menu.description}
            className={`flex cursor-pointer select-none items-center gap-1.5 text-xs font-medium ${
              checked ? "text-[#0e299c]" : "text-gray-500"
            } ${isPending ? "opacity-60" : ""}`}
          >
            <input
              type="checkbox"
              className="sr-only"
              checked={checked}
              disabled={isPending}
              onChange={(e) => toggle(menu.key, e.target.checked)}
            />
            <span
              aria-hidden
              className={`flex h-4 w-4 items-center justify-center rounded border transition-colors ${
                checked
                  ? "border-[#0e299c] bg-[#0e299c] text-white"
                  : "border-gray-300 bg-white"
              }`}
            >
              {checked && <Check size={12} strokeWidth={3} />}
            </span>
            {menu.label}
          </label>
        );
      })}
      {toast && <Toast message={toast} onDone={() => setToast("")} />}
    </div>
  );
}
