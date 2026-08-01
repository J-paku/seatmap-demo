// AIスタジオ各ビュー共通のスタイルトークン — アップル調 (カラーグロー排除 + ヘアライン/微細シャドウで奥行き表現)
import type { CSSProperties } from 'react'

// ヘアライン枠線と微細シャドウ — 各サーフェスの共通プリミティブ
const HAIRLINE = '1px solid color-mix(in srgb, var(--color-border) 68%, transparent)'
const SOFT_SHADOW = '0 1px 2px color-mix(in srgb, var(--color-text-primary) 7%, transparent)'

export const PANEL_STYLE: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'minmax(0, 1fr)',
  gap: 12,
}

// ホーム: 1つの主要 CTA + 控えめなリンク導線
export const LAUNCHER_STYLE: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'minmax(0, 1fr)',
  gap: 6,
}

// 主要アクション: フラットな塗りつぶし CTA (グロー無し)。狭い PC 左カラム(240px)でも 1 行に収める
export const PRIMARY_CTA_STYLE: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 8,
  width: '100%',
  minHeight: 52,
  padding: '0 14px',
  borderRadius: 14,
  border: 'none',
  background: 'var(--color-accent)',
  color: '#fff',
  fontSize: 13,
  fontWeight: 600,
  letterSpacing: '-0.01em',
  whiteSpace: 'nowrap',
  cursor: 'pointer',
  transition: 'opacity 140ms ease, transform 140ms ease',
}

// Gemini ブランドの「AI」バッジ — 白カプセル + 4色コニックグラデーション文字
export const AI_BADGE_STYLE: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '2px 7px',
  borderRadius: 999,
  background: '#ffffff',
  border: '1px solid color-mix(in srgb, #93c5fd 55%, #ffffff)',
  boxShadow: '0 0 2px color-mix(in srgb, #ffffff 55%, transparent)',
  flexShrink: 0,
  lineHeight: 1,
}

export const AI_BADGE_TEXT_STYLE: CSSProperties = {
  // Gemini の 4 色 (黄→赤→青→緑) コニックグラデーションで文字面を塗る
  backgroundImage:
    'conic-gradient(from 0deg at 50% 50%, #fabb05, #ea4335, #4285f4, #34a853, #fabb05)',
  WebkitBackgroundClip: 'text',
  backgroundClip: 'text',
  WebkitTextFillColor: 'transparent',
  color: 'transparent',
  fontSize: 12,
  fontWeight: 800,
  letterSpacing: '0.3px',
}

// 補助アクション: 塗り/枠の無いテキストリンク調の行
export const SECONDARY_LINK_STYLE: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 4,
  width: '100%',
  minHeight: 44,
  padding: '0 12px',
  border: 'none',
  background: 'transparent',
  color: 'var(--color-text-secondary)',
  fontSize: 13,
  fontWeight: 500,
  letterSpacing: '-0.01em',
  cursor: 'pointer',
  transition: 'color 140ms ease',
}

// 各ステップ共通カード — フラットなサーフェス + ヘアライン (初期スクロール抑制のため余白控えめ)
export const STEP_CARD_STYLE: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'minmax(0, 1fr)',
  gap: 10,
  padding: 14,
  borderRadius: 18,
  border: HAIRLINE,
  background: 'var(--color-surface)',
  boxShadow: SOFT_SHADOW,
}

export const STEP_HEADER_STYLE: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 10,
}

export const BACK_BUTTON_STYLE: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: 32,
  height: 32,
  borderRadius: 999,
  border: HAIRLINE,
  background: 'var(--color-surface)',
  color: 'var(--color-text-secondary)',
  cursor: 'pointer',
  flexShrink: 0,
  transition: 'background 140ms ease',
}

export const STEP_TITLE_STYLE: CSSProperties = {
  fontSize: 15,
  fontWeight: 600,
  letterSpacing: '-0.01em',
  color: 'var(--color-text-primary)',
}

export const STEP_DESCRIPTION_STYLE: CSSProperties = {
  fontSize: 13,
  lineHeight: 1.5,
  color: 'var(--color-text-secondary)',
}

export const COMPOSE_TEXTAREA_STYLE: CSSProperties = {
  width: '100%',
  minHeight: 120,
  padding: 14,
  borderRadius: 12,
  border: HAIRLINE,
  background: 'var(--color-surface)',
  color: 'var(--color-text-primary)',
  fontSize: 14,
  lineHeight: 1.6,
  resize: 'vertical',
}

export const PRIMARY_ACTION_STYLE: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 6,
  minHeight: 44,
  padding: '0 20px',
  borderRadius: 12,
  border: 'none',
  background: 'var(--color-accent)',
  color: 'var(--color-accent-contrast)',
  fontSize: 14,
  fontWeight: 600,
  letterSpacing: '-0.01em',
  cursor: 'pointer',
  transition: 'opacity 140ms ease, transform 140ms ease',
}

export const PRIMARY_ACTION_DISABLED_STYLE: CSSProperties = {
  ...PRIMARY_ACTION_STYLE,
  opacity: 0.4,
  cursor: 'not-allowed',
}

export const ACTION_ROW_STYLE: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'flex-end',
  gap: 8,
  flexWrap: 'wrap',
}

export const GHOST_ACTION_STYLE: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 6,
  minHeight: 44,
  padding: '0 16px',
  borderRadius: 12,
  border: HAIRLINE,
  background: 'var(--color-surface)',
  color: 'var(--color-text-primary)',
  fontSize: 13,
  fontWeight: 500,
  cursor: 'pointer',
}

export const CODE_BLOCK_WRAPPER_STYLE: CSSProperties = {
  position: 'relative',
}

export const CODE_BLOCK_STYLE: CSSProperties = {
  margin: 0,
  padding: '40px 12px 12px',
  minHeight: 132,
  maxHeight: 200,
  overflowY: 'auto',
  overflowX: 'hidden',
  borderRadius: 14,
  border: HAIRLINE,
  background: 'var(--color-surface-sunken)',
  color: 'var(--color-text-primary)',
  fontSize: 12,
  lineHeight: 1.6,
  whiteSpace: 'pre-wrap',
  wordBreak: 'normal',
  overflowWrap: 'break-word',
  cursor: 'pointer',
  boxShadow: SOFT_SHADOW,
  scrollbarGutter: 'stable',
}

export const CODE_BLOCK_OVERLAY_STYLE: CSSProperties = {
  position: 'absolute',
  top: 12,
  left: 12,
  display: 'inline-flex',
  alignItems: 'center',
  gap: 6,
  padding: '7px 11px',
  borderRadius: 999,
  background: 'color-mix(in srgb, var(--color-surface) 72%, transparent)',
  border: HAIRLINE,
  backdropFilter: 'blur(8px)',
  WebkitBackdropFilter: 'blur(8px)',
  color: 'var(--color-text-secondary)',
  fontSize: 10,
  fontWeight: 600,
  pointerEvents: 'none',
}

export const IMPORT_TEXTAREA_STYLE: CSSProperties = {
  ...COMPOSE_TEXTAREA_STYLE,
  minHeight: 104,
  fontSize: 13,
}

// エラー時のテキストエリア — 落ち着いた赤のヘアラインで該当箇所を示す
export const IMPORT_TEXTAREA_ERROR_STYLE: CSSProperties = {
  ...IMPORT_TEXTAREA_STYLE,
  border: '1px solid color-mix(in srgb, #e5484d 55%, transparent)',
}

// toss 調の控えめなエラーカード — 警告色は最小限、文言で「何がなぜ」を伝える
export const IMPORT_ERROR_STYLE: CSSProperties = {
  display: 'flex',
  alignItems: 'flex-start',
  gap: 8,
  padding: '10px 12px',
  borderRadius: 12,
  border: '1px solid color-mix(in srgb, #e5484d 32%, transparent)',
  background: 'color-mix(in srgb, #e5484d 8%, var(--color-surface))',
  color: 'var(--color-text-primary)',
  fontSize: 12,
  lineHeight: 1.5,
}

export const IMPORT_ERROR_ICON_STYLE: CSSProperties = {
  fontSize: 18,
  color: '#e5484d',
  flexShrink: 0,
  marginTop: 1,
}

// メッセージ内の改行 (\n) を活かしつつ、行内は自然に折り返す。flex で潰れないよう幅を確保
export const IMPORT_ERROR_TEXT_STYLE: CSSProperties = {
  flex: 1,
  minWidth: 0,
  whiteSpace: 'pre-line',
  overflowWrap: 'break-word',
  // 対応ブラウザでは行末の孤立文字 (1文字だけの行) を避ける
  textWrap: 'pretty',
}
