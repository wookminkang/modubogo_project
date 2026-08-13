import { requireEmployee } from "@/lib/employee";
import { getTasksByEmployee } from "@/lib/db";
import EmployeeTaskBoard from "./EmployeeTaskBoard";

export const dynamic = "force-dynamic";

export default async function EmployeeTasksPage() {
  const employee = await requireEmployee();
  const tasks = await getTasksByEmployee(employee.id);

  return (
    <div className="flex flex-col gap-5 max-w-[1080px]">
      <div>
        <h1 className="text-xl font-bold text-gray-900">할당 업무</h1>
        <p className="text-sm text-gray-500 mt-1">
          카드를 끌어서 옮기거나 버튼으로 진행 상태를 갱신하세요
        </p>
      </div>

      {tasks.length === 0 ? (
        <p className="text-sm text-gray-400 bg-white rounded-2xl p-4 shadow-sm">
          아직 배정받은 업무가 없어요.
        </p>
      ) : (
        <EmployeeTaskBoard tasks={tasks} />
      )}
    </div>
  );
}
