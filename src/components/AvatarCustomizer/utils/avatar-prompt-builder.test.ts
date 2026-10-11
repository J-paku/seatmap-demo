import { describe, it, expect } from 'vitest'
import { buildAiPromptText } from './avatar-prompt-builder'
import { parseAiImportedConfig } from '@/utils/avatar/avatar-import-parser'

type Section = { tag: string; body: string[] }

type PixelsJson = {
  kind: string
  size: number
  palette: Record<string, string>
  rows: string[]
}

// 「<タグ>・本文・</タグ>」の節が空行1行ずつで区切られて並ぶ形を読む。
// 節の中に空行がある・閉じタグが合わない・本文が無い、のどれかなら形が崩れているので null を返す
const readSections = (prompt: string): Section[] | null => {
  const sections = prompt.split('\n\n').map(block => {
    const lines = block.split('\n')
    const tag = /^<([^/>]+)>$/.exec(lines[0])?.[1]
    const body = lines.slice(1, -1)
    const wellFormed =
      tag !== undefined &&
      lines[lines.length - 1] === `</${tag}>` &&
      body.length > 0 &&
      body.every(line => line.trim().length > 0)
    return wellFormed ? { tag, body } : null
  })
  const valid = sections.filter((section): section is Section => section !== null)
  return valid.length === sections.length ? valid : null
}

const bodyOf = (prompt: string, tag: string): string[] =>
  readSections(prompt)?.find(section => section.tag === tag)?.body ?? []

// <例> の本文は「要望の1行 + コードフェンスで包んだ JSON」。フェンスごとの JSON 部分を返す
const exampleCode = (prompt: string): string => bodyOf(prompt, '例').slice(1).join('\n')

const exampleJson = (prompt: string): PixelsJson =>
  JSON.parse(exampleCode(prompt).replace(/^```json\n|\n```$/g, '')) as PixelsJson

// <出力フォーマット> の本文から、行頭の { から } までの JSON を取り出して読む
const formatTemplate = (prompt: string): PixelsJson => {
  const body = bodyOf(prompt, '出力フォーマット')
  return JSON.parse(body.slice(body.indexOf('{'), body.indexOf('}') + 1).join('\n')) as PixelsJson
}

describe('buildAiPromptText', () => {
  it('役割から最終指示までの節が決まった順に並び、どの節も本文を持つ', () => {
    const sections = readSections(buildAiPromptText('黒髪の剣士'))
    expect(sections?.map(section => section.tag)).toEqual([
      '役割',
      '事前調査',
      'キャンバス規則',
      '配色規則',
      '出力フォーマット',
      '例',
      '要望',
      '最終指示',
    ])
  })

  it('入力した要望は前後の空白を除いて <要望> 節に1行で入る', () => {
    expect(bodyOf(buildAiPromptText('  黒髪の剣士  '), '要望')).toEqual(['黒髪の剣士'])
  })

  it('要望が空・空白だけなら、<要望> 節には書き込み先を案内する同じプレースホルダーが入る', () => {
    const empty = bodyOf(buildAiPromptText(''), '要望')
    const blank = bodyOf(buildAiPromptText(' \n\t '), '要望')
    expect(empty).toHaveLength(1)
    expect(blank).toEqual(empty)
  })

  it('<例> の JSON は取り込み口がそのまま受け付け、絵の文字はすべてパレットの色を指す', () => {
    const prompt = buildAiPromptText('')
    const result = parseAiImportedConfig(exampleCode(prompt))
    if (!result.ok || result.config.kind !== 'pixels') throw new Error('例を取り込めない')
    const { palette, rows } = result.config
    // 顔・体の枠を例が自分で満たしているので、取り込み時の自動充填で行が書き換わらない
    expect(rows).toEqual(exampleJson(prompt).rows)
    const usedKeys = new Set(rows.join('').replace(/\./g, ''))
    expect([...usedKeys].filter(key => !(key in palette))).toEqual([])
  })

  it('<出力フォーマット> の JSON は例と同じ形(kind・size・キーの並び)を示し、色は6桁の HEX で表す', () => {
    const prompt = buildAiPromptText('')
    const template = formatTemplate(prompt)
    const example = exampleJson(prompt)
    expect(Object.keys(template)).toEqual(Object.keys(example))
    expect(template.kind).toBe(example.kind)
    expect(template.size).toBe(example.size)
    expect(Object.keys(template.palette)).toEqual(Object.keys(example.palette))
    expect(Object.values(template.palette).every(color => /^#\w{6}$/.test(color))).toBe(true)
    expect(template.rows.length).toBeGreaterThan(0)
    expect(template.rows.every(row => row.trim().length > 0)).toBe(true)
  })
})
