"use client";

import { useState, useTransition } from "react";
import Toast from "@/components/Toast";
import type { MenuKey } from "@/lib/admin";
import { toggleMenuPermission } from "./actions";

export interface AccountRow {
  id: string;
  username: string;
  name: string;
  role: "super" | "staff";
  allowed_menus: string[] | null;
}

// 권한 토글 대상 메뉴. 새 제한 메뉴가 생기면 여기에 추가.
const MENUS: { key: MenuKey; label: string }[] = [
  { key: "holiday", label: "진료일정" },
];

export default function MenuPermissionEditor({
  accounts,
}: {
  accounts: AccountRow[];
}) {
  // 서버 revalidate 전 즉시 반영용 로컬 상태
  const [rows, setRows] = useState(accounts);
  const [toast, setToast] = useState("");
  const [, startTransition] = useTransition();

  const handleToggle = (row: AccountRow, menu: MenuKey, granted: boolean) => {
    setRows((prev) =>
      prev.map((r) => {
        if (r.id !== row.id) return r;
        const set = new Set(r.allowed_menus ?? []);
        if (granted) set.add(menu);
        else set.delete(menu);
        return { ...r, allowed_menus: Array.from(set) };
      })
    );
    startTransition(async () => {
      const result = await toggleMenuPermission(row.id, menu, granted);
      if (result.ok) {
        setToast(
          `${row.name} · ${MENUS.find((m) => m.key === menu)?.label} ${granted ? "허용" : "차단"}`
        );
      } else {
        // 실패 시 롤백
        setRows((prev) => prev.map((r) => (r.id === row.id ? row : r)));
        setToast(result.error ?? "저장에 실패했습니다.");
      }
    });
  };

  return (
    <div className="flex flex-col gap-3">
      {rows.map((row) => (
        <div key={row.id} className="bg-white rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-bold text-gray-900 truncate">
                  {row.name}
                </span>
                <span
                  className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-bold ${
                    row.role === "super"
                      ? "bg-[#0e299c]/10 text-[#0e299c]"
                      : "bg-gray-100 text-gray-500"
                  }`}
                >
                  {row.role === "super" ? "슈퍼관리자" : "관리자"}
                </span>
              </div>
              <p className="text-xs text-gray-400 mt-0.5">{row.username}</p>
            </div>

            <div className="flex shrink-0 items-center gap-4">
              {MENUS.map((menu) => {
                const granted =
                  row.role === "super" ||
                  (row.allowed_menus ?? []).includes(menu.key);
                return (
                  <label
                    key={menu.key}
                    className={`flex items-center gap-2 ${
                      row.role === "super" ? "opacity-50" : "cursor-pointer"
                    }`}
                  >
                    <span className="text-sm text-gray-600">{menu.label}</span>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={granted}
                      disabled={row.role === "super"}
                      onClick={() => handleToggle(row, menu.key, !granted)}
                      className={`relative h-6 w-11 rounded-full transition-colors ${
                        granted ? "bg-[#0e299c]" : "bg-gray-200"
                      }`}
                    >
                      <span
                        className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${
                          granted ? "left-[22px]" : "left-0.5"
                        }`}
                      />
                    </button>
                  </label>
                );
              })}
            </div>
          </div>
        </div>
      ))}

      {rows.length === 0 && (
        <div className="bg-white rounded-2xl p-8 text-center text-sm text-gray-400 shadow-sm">
          등록된 관리자 계정이 없습니다.
        </div>
      )}

      <p className="text-xs text-gray-400 px-1">
        슈퍼관리자는 모든 메뉴에 항상 접근할 수 있어요. 권한을 끄면 해당 계정의
        헤더에서 메뉴가 숨겨지고 페이지 접근도 차단됩니다.
      </p>

      {toast && <Toast message={toast} onDone={() => setToast("")} />}
    </div>
  );
}
