import path from "path";
import { fileURLToPath } from "url";
import createNextIntlPlugin from "next-intl/plugin";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

/** @type {import('next').NextConfig} */
const nextConfig = {
  // 홈 디렉터리의 stray lockfile 대신 이 폴더를 워크스페이스 루트로 고정
  outputFileTracingRoot: __dirname,
};

export default withNextIntl(nextConfig);
