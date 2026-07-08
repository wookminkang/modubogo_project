// 디자이너 작업 요청서 뷰는 링크로 진입하는 공개(읽기 전용) 화면이라
// 관리자 헤더/네비 없이 보여준다. (intake 공개 폼과 동일 컨셉)
export default function DesignLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col bg-[#F0F4FA]">{children}</div>
  );
}
