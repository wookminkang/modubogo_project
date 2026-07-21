// GEO 노출 리포트 공개 뷰는 링크로 진입하는 읽기 전용 화면이라
// 관리자 헤더/네비 없이 보여준다. (design·intake 공개 화면과 동일 컨셉)
export default function GeoReportLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className="min-h-screen bg-[#f5f6fa]">{children}</div>;
}
