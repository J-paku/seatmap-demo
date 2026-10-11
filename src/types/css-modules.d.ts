// CSS Modules の型宣言。next-env.d.ts は .gitignore 対象で CI のチェックアウトには存在せず、
// そこ経由の next 型に頼ると typecheck だけが CI で TS2307 になる。宣言をリポジトリ側に持つ
declare module '*.module.css' {
  const classes: { readonly [key: string]: string }
  export default classes
}
