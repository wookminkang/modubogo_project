import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  experimental: {
    // 광고주 준비자료 폼은 사진/자격증 등 파일을 서버 액션으로 업로드한다.
    // 기본 1MB 제한으로는 부족하므로 상향.
    serverActions: {
      bodySizeLimit: "50mb",
    },
  },
};

export default nextConfig;
