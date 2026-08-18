import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  // 같은 공유기 안의 다른 기기(폰·다른 PC·브라우저 확장)에서 LAN IP로 dev 서버 접속 시
  // Next 16이 /_next/* dev 리소스를 차단해 하이드레이션이 안 되는 문제 방지 (개발 전용).
  allowedDevOrigins: ["192.168.0.80"],
  experimental: {
    // 광고주 준비자료 폼은 사진/자격증 등 파일을 서버 액션으로 업로드한다.
    // 기본 1MB 제한으로는 부족하므로 상향.
    serverActions: {
      bodySizeLimit: "50mb",
    },
  },
};

export default nextConfig;
