import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // Build autocontido para a imagem Docker (deploy/Dockerfile copia .next/standalone).
  output: 'standalone',
  // Cache Components: `use cache` + cacheTag/revalidateTag (SPEC-foundation §2, amendment ao ADR-001).
  cacheComponents: true,
}

export default nextConfig
