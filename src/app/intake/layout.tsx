// 광고주 준비자료 제출 폼은 링크로 진입하는 공개 화면이라
// 헤더/푸터 없이 풀스크린으로 보여준다. (holiday 회신 페이지와 동일 컨셉)
export default function IntakeLayout({
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
