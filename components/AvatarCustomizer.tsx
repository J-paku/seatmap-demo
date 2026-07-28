import { useEffect, useMemo, useRef, useState } from 'react'
import { PixelAvatar } from './PixelAvatar'
import { SEATMAP_BG_ID } from './SheetShell'
import type { AvatarConfig } from '@/lib/types'
import { useSelfAvatar } from '@/lib/self-avatar-context'
import { useBodyScrollLock } from '@/lib/use-body-scroll-lock'
import { useBackgroundInert } from '@/lib/use-background-inert'

// ── 定数(パーツ候補・色・プリセット・AI候補) ──────────────

const HAIR_OPTIONS: AvatarConfig['hair'][] = ['short', 'long', 'bob', 'ponytail', 'bald']
const FACE_OPTIONS: AvatarConfig['face'][] = ['smile', 'closed', 'serious', 'wink']
const OUTFIT_OPTIONS: AvatarConfig['outfit'][] = ['suit', 'shirt', 'hoodie', 'knit']

const HAIR_COLORS = ['#1F1B16', '#3B2B20', '#4A3728', '#6B4A2E', '#8C6239', '#B3B3B8', '#C2452F', '#4B3A6E']
const SKIN_COLORS = ['#F6D7B8', '#F1C9A5', '#E0A97F', '#C68A5A', '#8C5A33']
const OUTFIT_COLORS = ['#2F3B52', '#5B6B84', '#7C9E6F', '#B0552F', '#8A3B4A', '#3E7C7B', '#6E5AA0', '#4A4A4F']

const PRESETS: Array<{ id: string; label: string; config: AvatarConfig }> = [
  {
    id: 'male',
    label: '男性',
    config: { hair: 'short', face: 'smile', outfit: 'suit', palette: { hair: '#3B2B20', skin: '#F1C9A5', outfit: '#2F3B52' } },
  },
  {
    id: 'female',
    label: '女性',
    config: { hair: 'bob', face: 'wink', outfit: 'shirt', palette: { hair: '#4A3728', skin: '#F6D7B8', outfit: '#7C9E6F' } },
  },
]

// AI生成モックの固定候補12件(外見が重ならないようキュレーション)
const AI_CANDIDATES: AvatarConfig[] = [
  { hair: 'short', face: 'serious', outfit: 'suit', palette: { hair: '#1F1B16', skin: '#F1C9A5', outfit: '#2F3B52' } },
  { hair: 'long', face: 'smile', outfit: 'knit', palette: { hair: '#6B4A2E', skin: '#F6D7B8', outfit: '#8A3B4A' } },
  { hair: 'bob', face: 'wink', outfit: 'shirt', palette: { hair: '#4A3728', skin: '#E0A97F', outfit: '#7C9E6F' } },
  { hair: 'ponytail', face: 'smile', outfit: 'hoodie', palette: { hair: '#3B2B20', skin: '#F1C9A5', outfit: '#3E7C7B' } },
  { hair: 'bald', face: 'closed', outfit: 'suit', palette: { hair: '#8C6239', skin: '#C68A5A', outfit: '#4A4A4F' } },
  { hair: 'short', face: 'wink', outfit: 'knit', palette: { hair: '#C2452F', skin: '#F6D7B8', outfit: '#6E5AA0' } },
  { hair: 'long', face: 'serious', outfit: 'shirt', palette: { hair: '#1F1B16', skin: '#8C5A33', outfit: '#5B6B84' } },
  { hair: 'bob', face: 'smile', outfit: 'hoodie', palette: { hair: '#B3B3B8', skin: '#F1C9A5', outfit: '#B0552F' } },
  { hair: 'ponytail', face: 'closed', outfit: 'suit', palette: { hair: '#4B3A6E', skin: '#E0A97F', outfit: '#2F3B52' } },
  { hair: 'short', face: 'smile', outfit: 'hoodie', palette: { hair: '#6B4A2E', skin: '#C68A5A', outfit: '#3E7C7B' } },
  { hair: 'bald', face: 'serious', outfit: 'knit', palette: { hair: '#4A3728', skin: '#F6D7B8', outfit: '#8A3B4A' } },
  { hair: 'long', face: 'wink', outfit: 'suit', palette: { hair: '#8C6239', skin: '#F1C9A5', outfit: '#6E5AA0' } },
]

// アバターの不変クローン(palette までコピー)
const cloneAvatar = (a: AvatarConfig): AvatarConfig => ({ ...a, palette: { ...a.palette } })

// 要望テキスト → 12候補のインデックス(同一テキスト=同一結果)
const aiIndexOf = (text: string): number => {
  let sum = 0
  for (const ch of text) sum += ch.codePointAt(0) ?? 0
  return sum % AI_CANDIDATES.length
}

type AiView = 'home' | 'compose' | 'loading'

// ── ミニプレビュー付きパーツチップ行 ───────────────────

type PartRowProps<T extends string> = {
  label: string
  options: T[]
  current: T
  render: (opt: T) => AvatarConfig
  onPick: (opt: T) => void
}

const PartChipRow = <T extends string>({ label, options, current, render, onPick }: PartRowProps<T>) => (
  <div className='ac-part-row'>
    <span className='ac-part-label'>{label}</span>
    <div className='ac-chip-scroll'>
      {options.map((opt) => (
        <button
          key={opt}
          type='button'
          className={`ac-chip${opt === current ? ' is-selected' : ''}`}
          aria-pressed={opt === current}
          aria-label={opt}
          onClick={() => onPick(opt)}
        >
          <PixelAvatar config={render(opt)} size={40} />
        </button>
      ))}
    </div>
  </div>
)

// ── 色スワッチ行(radiogroup) ─────────────────────────

type SwatchRowProps = {
  label: string
  colors: string[]
  current: string
  onPick: (color: string) => void
}

const SwatchRow = ({ label, colors, current, onPick }: SwatchRowProps) => (
  <div className='ac-part-row'>
    <span className='ac-part-label'>{label}</span>
    <div className='ac-chip-scroll' role='radiogroup' aria-label={label}>
      {colors.map((color) => (
        <button
          key={color}
          type='button'
          role='radio'
          aria-checked={color.toLowerCase() === current.toLowerCase()}
          aria-label={color}
          className={`ac-swatch${color.toLowerCase() === current.toLowerCase() ? ' is-selected' : ''}`}
          style={{ background: color }}
          onClick={() => onPick(color)}
        />
      ))}
    </div>
  </div>
)

// ── モーダル本体(開いている間だけマウント) ──────────────

type ModalProps = {
  initial: AvatarConfig
  onSave: (config: AvatarConfig) => void
  onClose: () => void
}

const AvatarCustomizerModal = ({ initial, onSave, onClose }: ModalProps) => {
  const [draft, setDraft] = useState<AvatarConfig>(() => cloneAvatar(initial))
  const [aiView, setAiView] = useState<AiView>('home')
  const [aiRequestText, setAiRequestText] = useState('')
  const [loadingPhase, setLoadingPhase] = useState(0)
  const [toast, setToast] = useState<string | null>(null)
  const dialogRef = useRef<HTMLDivElement>(null)
  const closeBtnRef = useRef<HTMLButtonElement>(null)
  const backdropRef = useRef<HTMLDivElement>(null)
  const swipe = useRef({ startY: 0, active: false })

  useBodyScrollLock(true)
  useBackgroundInert(true, SEATMAP_BG_ID)

  // 開いた直後に閉じるボタンへフォーカス
  useEffect(() => {
    const id = requestAnimationFrame(() => closeBtnRef.current?.focus())
    return () => cancelAnimationFrame(id)
  }, [])

  // Escape で閉じる
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  // 背景膜の native touchmove/wheel を遮断
  useEffect(() => {
    const el = backdropRef.current
    if (!el) return
    const block = (e: Event) => e.preventDefault()
    el.addEventListener('touchmove', block, { passive: false })
    el.addEventListener('wheel', block, { passive: false })
    return () => {
      el.removeEventListener('touchmove', block)
      el.removeEventListener('wheel', block)
    }
  }, [])

  const setHair = (hair: AvatarConfig['hair']) => setDraft((d) => ({ ...d, hair }))
  const setFace = (face: AvatarConfig['face']) => setDraft((d) => ({ ...d, face }))
  const setOutfit = (outfit: AvatarConfig['outfit']) => setDraft((d) => ({ ...d, outfit }))
  const setHairColor = (hair: string) => setDraft((d) => ({ ...d, palette: { ...d.palette, hair } }))
  const setSkinColor = (skin: string) => setDraft((d) => ({ ...d, palette: { ...d.palette, skin } }))
  const setOutfitColor = (outfit: string) => setDraft((d) => ({ ...d, palette: { ...d.palette, outfit } }))

  const applyPreset = (config: AvatarConfig) => setDraft(cloneAvatar(config))

  // 現在の draft がプリセットと完全一致するか
  const activePresetId = useMemo(() => {
    const match = PRESETS.find(
      (p) =>
        p.config.hair === draft.hair &&
        p.config.face === draft.face &&
        p.config.outfit === draft.outfit &&
        p.config.palette.hair === draft.palette.hair &&
        p.config.palette.skin === draft.palette.skin &&
        p.config.palette.outfit === draft.palette.outfit
    )
    return match?.id ?? null
  }, [draft])

  const runReset = () => {
    setDraft(cloneAvatar(initial))
    setAiView('home')
    setAiRequestText('')
  }

  const runSave = () => {
    onSave(cloneAvatar(draft))
    setToast('保存しました')
    window.setTimeout(onClose, 700)
  }

  // AI生成モック(1.5秒の演出→固定候補適用)
  const runGenerate = () => {
    if (!aiRequestText.trim()) return
    setAiView('loading')
    setLoadingPhase(0)
    window.setTimeout(() => setLoadingPhase(1), 750)
    window.setTimeout(() => {
      const picked = AI_CANDIDATES[aiIndexOf(aiRequestText)]
      setDraft(cloneAvatar(picked))
      setAiView('home')
      setToast('生成しました')
      window.setTimeout(() => setToast(null), 1400)
    }, 1500)
  }

  const isLoading = aiView === 'loading'

  // モバイル下方スワイプで閉じる(ハンドル起点)
  const onHandleDown = (e: React.PointerEvent) => {
    if (e.pointerType === 'mouse') return
    swipe.current = { startY: e.clientY, active: true }
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
  }
  const onHandleMove = (e: React.PointerEvent) => {
    if (!swipe.current.active) return
    const dy = e.clientY - swipe.current.startY
    if (dialogRef.current) dialogRef.current.style.transform = dy > 0 ? `translateY(${dy}px)` : ''
  }
  const onHandleUp = (e: React.PointerEvent) => {
    if (!swipe.current.active) return
    swipe.current.active = false
    const dy = e.clientY - swipe.current.startY
    if (dialogRef.current) dialogRef.current.style.transform = ''
    if (dy > 90) onClose()
  }

  return (
    <div className='ac-overlay'>
      <div ref={backdropRef} className='ac-backdrop' onClick={onClose} />
      <div
        ref={dialogRef}
        className='ac-dialog'
        role='dialog'
        aria-modal='true'
        aria-label='アバター編集'
      >
        <div
          className='ac-handle-strip'
          data-handle='true'
          onPointerDown={onHandleDown}
          onPointerMove={onHandleMove}
          onPointerUp={onHandleUp}
        >
          <span className='ac-handle-bar' />
        </div>
        <div className='ac-header'>
          <h2 className='ac-title'>アバター編集</h2>
          <button ref={closeBtnRef} type='button' className='ac-close' aria-label='閉じる' onClick={onClose}>
            ✕
          </button>
        </div>

        <div className='ac-scroll'>
          <div className='ac-columns'>
            <div className='ac-col-left'>
              {/* プレビュー */}
              <div className='ac-preview'>
                <PixelAvatar config={draft} size={140} />
              </div>

              {/* クイックスタート */}
              <div className='ac-quickstart'>
                {PRESETS.map((p) => (
                  <button
                    key={p.id}
                    type='button'
                    className={`ac-preset-chip${activePresetId === p.id ? ' is-selected' : ''}`}
                    aria-pressed={activePresetId === p.id}
                    onClick={() => applyPreset(p.config)}
                  >
                    <PixelAvatar config={p.config} size={32} />
                    <span>{p.label}</span>
                  </button>
                ))}
              </div>

              {/* AIスタジオ(モック) */}
              <div className='ac-ai-studio'>
                {aiView === 'home' && (
                  <button type='button' className='ac-ai-cta' onClick={() => setAiView('compose')}>
                    <span className='ac-ai-badge'>AI</span>
                    AIキャラを作る（Beta）
                  </button>
                )}
                {aiView === 'compose' && (
                  <div className='ac-ai-compose'>
                    <p className='ac-ai-title'>どんなキャラクターにしたいですか？</p>
                    <textarea
                      className='ac-ai-textarea'
                      value={aiRequestText}
                      onChange={(e) => setAiRequestText(e.target.value)}
                      placeholder='ここに希望するアバターの雰囲気・髪型・表情などを直接書いてください'
                    />
                    <div className='ac-ai-actions'>
                      <button type='button' className='ac-btn-ghost' onClick={() => setAiView('home')}>
                        戻る
                      </button>
                      <button
                        type='button'
                        className='ac-btn-primary'
                        disabled={!aiRequestText.trim()}
                        onClick={runGenerate}
                      >
                        生成する
                      </button>
                    </div>
                  </div>
                )}
                {aiView === 'loading' && (
                  <div className='ac-ai-loading'>
                    <span className='ac-spinner' />
                    <span>{loadingPhase === 0 ? 'イメージを解析中…' : 'ドットを配置中…'}</span>
                  </div>
                )}
              </div>
            </div>

            <div className='ac-col-right'>
              {/* ヘア + ヘアカラー */}
              <div className='ac-group'>
                <PartChipRow
                  label='ヘア'
                  options={HAIR_OPTIONS}
                  current={draft.hair}
                  render={(opt) => ({ ...draft, hair: opt })}
                  onPick={setHair}
                />
                <SwatchRow label='ヘアカラー' colors={HAIR_COLORS} current={draft.palette.hair} onPick={setHairColor} />
              </div>

              {/* スキン + フェイス */}
              <div className='ac-group'>
                <SwatchRow label='スキン' colors={SKIN_COLORS} current={draft.palette.skin} onPick={setSkinColor} />
                <PartChipRow
                  label='フェイス'
                  options={FACE_OPTIONS}
                  current={draft.face}
                  render={(opt) => ({ ...draft, face: opt })}
                  onPick={setFace}
                />
              </div>

              {/* コスチューム + コスチュームカラー */}
              <div className='ac-group'>
                <PartChipRow
                  label='コスチューム'
                  options={OUTFIT_OPTIONS}
                  current={draft.outfit}
                  render={(opt) => ({ ...draft, outfit: opt })}
                  onPick={setOutfit}
                />
                <SwatchRow
                  label='コスチュームカラー'
                  colors={OUTFIT_COLORS}
                  current={draft.palette.outfit}
                  onPick={setOutfitColor}
                />
              </div>
            </div>
          </div>
        </div>

        {/* フッター(スクロール外・常時固定) */}
        <div className='ac-footer'>
          <button type='button' className='ac-btn-ghost' onClick={runReset} disabled={isLoading}>
            リセット
          </button>
          <button type='button' className='ac-btn-primary' onClick={runSave} disabled={isLoading}>
            保存
          </button>
        </div>

        {toast && <div className='ac-toast'>{toast}</div>}
      </div>
    </div>
  )
}

// 開いている時だけモーダルをマウント(hooks の on/off を開閉に一致)
export const AvatarCustomizer = () => {
  const { isEditorOpen, selfAvatar, save, closeEditor } = useSelfAvatar()
  if (!isEditorOpen || !selfAvatar) return null
  return (
    <AvatarCustomizerModal
      initial={selfAvatar}
      onSave={save}
      onClose={closeEditor}
    />
  )
}
