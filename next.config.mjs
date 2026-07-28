// @ts-check

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // 静的export: 本番ビルドのみ有効化(dev では無効)
  output: process.env.NODE_ENV === 'production' ? 'export' : undefined,
  // 静的export では画像最適化サーバーが無いため無効化
  images: { unoptimized: true },
  trailingSlash: true,
}

export default nextConfig
