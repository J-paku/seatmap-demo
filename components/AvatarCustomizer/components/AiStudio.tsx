import { AI_LOADING_MESSAGES } from '../utils/ai-candidates'
import type { AiView } from '../type'

// AIスタジオ(モック): home→compose→loading の3ビューで遷移する

type Props = {
  view: AiView
  requestText: string
  loadingPhase: number
  onChangeView: (view: AiView) => void
  onChangeText: (text: string) => void
  onGenerate: () => void
}

export const AiStudio = ({ view, requestText, loadingPhase, onChangeView, onChangeText, onGenerate }: Props) => (
  <div className='ac-ai-studio'>
    {view === 'home' && (
      <button type='button' className='ac-ai-cta' onClick={() => onChangeView('compose')}>
        <span className='ac-ai-badge'>AI</span>
        AIキャラを作る（Beta）
      </button>
    )}

    {view === 'compose' && (
      <div className='ac-ai-compose'>
        <h3 className='ac-ai-title'>どんなキャラクターにしたいですか？</h3>
        <textarea
          className='ac-ai-textarea'
          value={requestText}
          onChange={(e) => onChangeText(e.target.value)}
          placeholder='ここに希望するアバターの雰囲気・髪型・表情などを直接書いてください'
        />
        <div className='ac-ai-actions'>
          <button type='button' className='ac-btn-ghost' onClick={() => onChangeView('home')}>
            戻る
          </button>
          <button type='button' className='ac-btn-primary' disabled={!requestText.trim()} onClick={onGenerate}>
            生成する
          </button>
        </div>
      </div>
    )}

    {view === 'loading' && (
      <div className='ac-ai-compose'>
        <div className='ac-ai-loading'>
          <span className='ac-spinner' aria-hidden='true' />
          <span>{AI_LOADING_MESSAGES[loadingPhase]}</span>
        </div>
        <div className='ac-ai-actions'>
          <button type='button' className='ac-btn-ghost' disabled>
            戻る
          </button>
          <button type='button' className='ac-btn-primary' disabled>
            生成する
          </button>
        </div>
      </div>
    )}
  </div>
)
