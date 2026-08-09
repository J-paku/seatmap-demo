// 会議データの判定式。生成側(scripts/generate-mocks.mjs)と検証側(scripts/verify-schedule-facility.mjs)が
// 同じ式を使うためにここへ集約する。同じ概念を2か所で別々に判定すると、片方だけ直った時に
// 生成物と検査が静かにずれる(検査が通るのに画面が壊れる)

// 会議の同一性キー。同時刻・同件名の予定は「1つの会議が参加者それぞれの予定表に出ている」状態なので、
// このキーが一致する予定は同じ会議として扱う(押さえる室も1つ)
export const meetingKey = (ev) => `${ev.start}#${ev.end}#${ev.title}`

// 同じ会議か。二重予約判定で「同じ会議の別参加者ぶん」を除外するのに使う
export const isSameMeeting = (a, b) => meetingKey(a) === meetingKey(b)

// 時間帯が重なるか。開始/終了は大小比較さえできれば型を問わない
// (ISO8601 文字列は同一タイムゾーンなら辞書順=時刻順、epoch ms は数値順で同じ式が成り立つ)
export const isOverlapping = (aStart, aEnd, bStart, bEnd) => aStart < bEnd && bStart < aEnd

// 定員を満たすか。capacity 未設定の施設は0名扱いにして会議室として使わせない
export const fitsCapacity = (facility, groupSize) => (facility?.capacity ?? 0) >= groupSize
