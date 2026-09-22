// GEO 병원 정보 폼은 링크로 진입하는 공개 화면이라
// 헤더/푸터 없이 풀스크린으로 보여준다. (준비자료 폼 /intake 와 동일 컨셉)
export default function GeoIntakeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col bg-[var(--seed-color-bg-layer-default)]">
      {children}
    </div>
  );
}
