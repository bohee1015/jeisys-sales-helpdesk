import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 견적서 템플릿은 코드에서 import하지 않고 런타임에 파일로 읽기 때문에,
  // 배포 번들에 자동으로 포함되지 않는다. 해당 라우트에 명시적으로 넣어준다.
  outputFileTracingIncludes: {
    "/api/requests/[id]/lease-quote": ["./templates/**"],
  },
};

export default nextConfig;
