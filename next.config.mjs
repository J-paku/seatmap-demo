// @ts-check

// GitHub Pages(プロジェクトサイト /seatmap-demo/)配信時のみ basePath を付与。ローカル/Vercel は無効
const isPages = process.env.GITHUB_PAGES === 'true'
const repoBase = '/seatmap-demo'

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // 静的export: 本番ビルドのみ有効化(dev では無効)
  output: process.env.NODE_ENV === 'production' ? 'export' : undefined,
  // 静的export では画像最適化サーバーが無いため無効化
  images: { unoptimized: true },
  trailingSlash: true,
  ...(isPages ? { basePath: repoBase, assetPrefix: repoBase } : {}),
}

export default nextConfig
