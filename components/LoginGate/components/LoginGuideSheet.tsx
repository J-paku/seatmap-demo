// 「ID・初期パスワードのご案内」(紙)の見本イラスト。どの欄を見ればよいかを示すためだけの図で、
// 色は配色定義ではなく図版の内容なので tokens 化の対象外(styles.md 2. の例外と同じ扱い)。
// 社名は公開デモ用に架空のものへ置き換えている
export function LoginGuideSheet() {
  return (
    <svg
      viewBox='0 0 320 208'
      className='h-auto w-full'
      role='img'
      aria-label='ID・初期パスワードのご案内(見本)。グループウェアの欄にログイン情報が記載されています'
    >
      <rect x='0.5' y='0.5' width='319' height='207' rx='5' fill='#ffffff' stroke='#d8dee7' />
      <text x='16' y='22' fill='#64748b' fontSize='7'>所　属：</text>
      <text x='16' y='33' fill='#64748b' fontSize='7'>社員番号：</text>
      <text x='16' y='44' fill='#64748b' fontSize='7'>ＰＣ番号：</text>
      <text x='306' y='21' textAnchor='end' fill='#e11d1d' fontSize='12' fontWeight='bold'>社外秘</text>
      <text x='306' y='37' textAnchor='end' fill='#64748b' fontSize='7'>サンプル株式会社</text>
      <text x='306' y='46' textAnchor='end' fill='#64748b' fontSize='7'>情報システム課</text>
      <text x='160' y='72' textAnchor='middle' fill='#1a1a1a' fontSize='14' fontWeight='bold'>
        ID・初期パスワードのご案内
      </text>
      <rect x='20' y='84' width='280' height='3' rx='1.5' fill='#eef1f5' />
      <rect x='20' y='92' width='280' height='3' rx='1.5' fill='#eef1f5' />
      <rect x='20' y='100' width='236' height='3' rx='1.5' fill='#eef1f5' />
      <text x='160' y='118' textAnchor='middle' fill='#334155' fontSize='9'>記</text>
      <rect x='14' y='124' width='292' height='80' fill='none' stroke='#cbd5e1' />
      <line x1='118' y1='124' x2='118' y2='204' stroke='#cbd5e1' />
      <line x1='212' y1='124' x2='212' y2='204' stroke='#cbd5e1' />
      <line x1='14' y1='144' x2='306' y2='144' stroke='#cbd5e1' />
      <line x1='14' y1='164' x2='306' y2='164' stroke='#cbd5e1' />
      <line x1='14' y1='184' x2='306' y2='184' stroke='#cbd5e1' />
      <rect x='14' y='124' width='292' height='20' fill='#28c3d7' />
      <text x='66' y='138' textAnchor='middle' fill='#ffffff' fontSize='8.5' fontWeight='bold'>システム名</text>
      <text x='165' y='138' textAnchor='middle' fill='#ffffff' fontSize='8.5' fontWeight='bold'>ID</text>
      <text x='259' y='138' textAnchor='middle' fill='#ffffff' fontSize='8.5' fontWeight='bold'>パスワード</text>
      <text x='22' y='157' fill='#334155' fontSize='8.5'>PCログイン</text>
      <rect x='124' y='150' width='82' height='8' rx='1' fill='#1e293b' />
      <rect x='218' y='150' width='82' height='8' rx='1' fill='#1e293b' />
      <text x='22' y='177' fill='#334155' fontSize='8.5'>ファイルサーバ</text>
      <rect x='150' y='170' width='56' height='8' rx='1' fill='#1e293b' />
      <rect x='244' y='170' width='56' height='8' rx='1' fill='#1e293b' />
      <rect x='15' y='185' width='103' height='18' fill='#fee2e2' />
      <text x='22' y='197' fill='#dc2626' fontSize='8.5' fontWeight='bold'>サイボウズ</text>
      <rect x='124' y='190' width='82' height='8' rx='1' fill='#1e293b' />
      <rect x='218' y='190' width='82' height='8' rx='1' fill='#1e293b' />
      <rect x='15' y='185' width='291' height='18' fill='none' stroke='#dc2626' strokeWidth='1.5' />
    </svg>
  )
}
