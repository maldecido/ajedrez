/** @type {import('next').NextConfig} */
const nextConfig = {
  // Los paquetes del monorepo se publican como TypeScript sin compilar,
  // asi que Next los transpila el mismo.
  transpilePackages: ["@ajedrez/chess-engine", "@ajedrez/voice"],
};

export default nextConfig;
