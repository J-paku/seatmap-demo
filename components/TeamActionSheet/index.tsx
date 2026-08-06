import { PickerSheet } from '@/components/PickerSheet'

// チームラベルをタップしたときの操作選択。座席追加とグリッド再配置の入口

type TeamAction = 'add-seat' | 'relayout'

type Props = {
  isOpen: boolean
  teamName: string
  seatCount: number
  onSelect: (action: TeamAction) => void
  onClose: () => void
}

export const TeamActionSheet = ({ isOpen, teamName, seatCount, onSelect, onClose }: Props) => (
  <PickerSheet isOpen={isOpen} title={teamName} note={`${seatCount}席`} onClose={onClose}>
    <div className='obj-cat-list'>
      <button type='button' className='obj-cat-card' onClick={() => onSelect('add-seat')}>
        <span className='icon-msr-thin obj-cat-icon' aria-hidden='true'>
          add_box
        </span>
        <span className='obj-cat-text'>
          <span className='obj-cat-title'>座席を追加</span>
          <span className='obj-cat-desc'>最後の座席の右隣に空席を1つ足します</span>
        </span>
      </button>
      <button type='button' className='obj-cat-card' onClick={() => onSelect('relayout')}>
        <span className='icon-msr-thin obj-cat-icon' aria-hidden='true'>
          grid_view
        </span>
        <span className='obj-cat-text'>
          <span className='obj-cat-title'>行×列の再配置</span>
          <span className='obj-cat-desc'>座席を格子状に並べ直します</span>
        </span>
      </button>
    </div>
  </PickerSheet>
)
