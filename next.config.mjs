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
  // 親フォルダの lockfile によるワークスペースルート誤検出を防ぐ(このフォルダを明示)
  turbopack: { root: import.meta.dirname },
  // WSL2 から /mnt/c(Windows NTFS)を見ると inotify が発火しないため、監視がファイル変更を
  // 一切受け取れない。ポーリングで代替する(dev のみ。build には影響しない)
  watchOptions: { pollIntervalMs: 1000 },
  ...(isPages ? { basePath: repoBase, assetPrefix: repoBase } : {}),
}

export default nextConfig
