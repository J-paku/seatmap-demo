// AI自由ピクセル生成プロンプトの組み立て — React非依存の純粋関数
// 16x16自由ピクセル例 — 初期プロンプト生成用のサンプル
const buildFreePixelExample = (): string => {
  const exampleConfig = {
    kind: 'pixels',
    size: 16,
    palette: { s: '#F5C9A0', h: '#3A2A1A', o: '#D4756C', e: '#2A2A2A' },
    rows: [
      '................',
      '...hhhhhhhhhh...',
      '.hhhhhhhhhhhhhh.',
      'hhhhhhhhhhhhhhhh',
      'hhhh.ssss.hhhhhh',
      'hhhh.ssss.hhhhhh',
      'hhhh.ee.e.hhhhhh',
      'hhhh.ssss.hhhhhh',
      'hhhh.ssss.hhhhhh',
      'hhhh.ssss.hhhhhh',
      '.hh.ssssssss.hh.',
      'oooooooooooooooo',
      'oooooooooooooooo',
      'oooooooooooooooo',
      'oooooooooooooooo',
      'oooooooooooooooo',
    ],
  }
  return [
    '要望: 茶髪の明るい女の子（ピンク系の服）',
    '```json',
    JSON.stringify(exampleConfig, null, 2),
    '```',
  ].join('\n')
}

// 入力済みの要望テキストを差し込み、生成AIへ渡す完成プロンプト文字列を返す
export const buildAiPromptText = (aiRequestText: string): string => {
  // 入力済みの要望があれば差し込み、空ならプレースホルダーを残す
  const requestBody =
    aiRequestText.trim().length > 0
      ? aiRequestText.trim()
      : '（ここに希望するアバターの雰囲気・髪型・表情などを直接書いてください）'
  return [
    '<役割>',
    'あなたは16x16ドット絵アバターを生成する専門AIです。ユーザーの「要望」を最大限に反映した自由なドット絵を1つだけ生成します。',
    '</役割>',
    '',
    '<事前調査>',
    '要望にキャラクター名・作品名・モチーフ(アニメ・ゲーム・職業・動物など)が含まれる場合、必要に応じてWeb検索でその外見的特徴(髪型・髪色・服の色・象徴的なアイテム)を調べ、ドット絵に反映してよい。調べられない場合は一般的なイメージで補う。',
    '</事前調査>',
    '',
    '<キャンバス規則>',
    '16x16ピクセル。顔と体の位置・比率は固定。それ以外のピクセル配置・髪型・装飾は完全に自由。',
    '- 顔マスク (必須・充填強制): row 4-9 (0始まり)、col 4-11。この6行×8列は必ず描く。空白は避ける(基準色で自動充填)。',
    '- 体マスク (必須・充填強制): row 12-15、col 0-15。この4行×16列は必ず描く。',
    '- 自由領域: row 0-3、row 10-11、および顔マスク外の col。要望に合わせて自由に配置。',
    '</キャンバス規則>',
    '',
    '<配色規則>',
    '- palette のキーは1文字で自由に命名 (例: s=肌、h=髪、o=服、f=顔、e=眼、g=眼鏡)。値は6桁HEX。',
    '- 「skin」と「outfit」キーは必須 (顔・体の未充填部分の基準色)。',
    '- 複数の髪色(h, h2)・服色(o, o2)など自由に追加可。「.」は透明。',
    '- 雰囲気に合う色を自由に決める。原色も可。',
    '</配色規則>',
    '',
    '<出力フォーマット>',
    '以下の形式の JSON だけを返す。この形以外は取り込めない。',
    JSON.stringify(
      {
        kind: 'pixels',
        size: 16,
        palette: { s: '#RRGGBB', h: '#RRGGBB', o: '#RRGGBB', e: '#RRGGBB' },
        rows: ['16文字×16行の文字列配列'],
      },
      null,
      2
    ),
    '- kind: 必ず「pixels」(文字列) / size: 必ず 16 (数値)',
    '- rows: 16個の文字列配列。各文字列は正確に16文字。各文字が palette のキー。',
    '</出力フォーマット>',
    '',
    '<例>',
    buildFreePixelExample(),
    '</例>',
    '',
    '<要望>',
    requestBody,
    '</要望>',
    '',
    '<最終指示>',
    '上記の要望に基づき、16x16ピクセルの PixelsAvatarConfig JSON だけを返す。説明・前置き・複数ブロックは不要。JSON単体またはコードブロック1つのみ。',
    '</最終指示>',
  ].join('\n')
}
