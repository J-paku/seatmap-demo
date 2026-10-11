// 軽量文字列ハッシュ(暗号強度は不要)。キャッシュ指紋とアバター既定プリセットの2箇所から使う
export const hashStringToInt = (value: string): number => {
  let hash = 0
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash * 31 + value.charCodeAt(i)) | 0
  }
  return hash
}

// 指紋表示用の36進表記
export const hashString = (value: string): string => hashStringToInt(value).toString(36)
