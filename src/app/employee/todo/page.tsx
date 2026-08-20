import { requireEmployee } from "@/lib/employee";
import { getTodosByEmployee } from "@/lib/db";
import TodoBoard from "./TodoBoard";

export const dynamic = "force-dynamic";

/** 직원 개인 투두리스트 — 본인 것만 보이고 본인만 관리하는 칸반보드. */
export default async function EmployeeTodoPage() {
  const me = await requireEmployee();
  const todos = await getTodosByEmployee(me.id);
  const today = new Date().toLocaleDateString("sv-SE", { timeZone: "Asia/Seoul" });

  const doneCount = todos.filter((t) => t.status === "done").length;

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-xl font-bold text-gray-900">투두리스트</h1>
        <p className="text-sm text-gray-500 mt-1">
          나만 보는 개인 할 일 보드예요. 카드를 드래그해 상태를 옮길 수 있어요.
          {todos.length > 0 && (
            <>
              {" · "}
              <span className="font-semibold text-[#0e299c]">
                {doneCount}/{todos.length} 완료
              </span>
            </>
          )}
        </p>
      </div>
      <TodoBoard todos={todos} today={today} />
    </div>
  );
}
