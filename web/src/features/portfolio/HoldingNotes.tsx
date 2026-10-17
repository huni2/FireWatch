import { useState } from 'react'
import { Alert, App, Button, ConfigProvider, DatePicker, Input, Space, Tag } from 'antd'
import koKR from 'antd/es/date-picker/locale/ko_KR'
import dayjs from 'dayjs'
import 'dayjs/locale/ko'
import { AppDrawer as Drawer } from '../../components/AppDrawer'
import type { HoldingNote, HoldingNoteDraft, HoldingNoteRequest, Portfolio } from '../../../../shared/investing'
import { emptyHoldingNote, holdingNoteDateText, holdingNoteError, holdingNoteRows, normalizedNote, noteDateLabel, noteDraft, noteIsEmpty } from '../../../../shared/holding-notes'

export function HoldingNotes({ portfolio, busy, edit }: { portfolio: Portfolio; busy: boolean; edit: (symbol: string, name: string) => void }) {
  const [expanded, setExpanded] = useState(false)
  if (portfolio.holdingNotes === undefined || (!portfolio.holdings.length && !portfolio.holdingNotes.length)) return null
  const rows = holdingNoteRows(portfolio)
  const dueCount = rows.filter(row => row.due).length
  return <section className="holding-notes" aria-label="투자 메모와 복기">
    <div className="portfolio-section-heading"><h3>투자 메모와 복기</h3>{!!rows.length && <span>{dueCount ? `${dueCount}개 메모를 다시 확인해보세요.` : '지금 다시 확인할 메모는 없어요.'}</span>}</div>
    <p>보유한 이유를 남기고, 다음에 확인한 내용을 돌아보세요. 날짜는 점검할 때 표시하며 알림을 발송하지 않아요.</p>
    {!rows.length && <p>보유 자산의 ‘투자 메모’에서 선택적으로 기록할 수 있어요.</p>}
    {(expanded ? rows : rows.slice(0, 3)).map(({ note, name, archived, due }) => <article key={note.symbol}>
      <div><strong>{name}</strong>{archived && <Tag>이전 보유</Tag>}<small>{noteDateLabel(note)}</small>{due && <Tag color="orange">다시 살펴보기</Tag>}</div>
      {note.reason && <p>보유 이유 · {note.reason.slice(0, 100)}{note.reason.length > 100 ? '…' : ''}</p>}
      {note.nextCheck && <p>다음 확인 · {note.nextCheck.slice(0, 100)}{note.nextCheck.length > 100 ? '…' : ''}</p>}
      {note.reflection && <p>돌아본 내용 · {note.reflection.slice(0, 100)}{note.reflection.length > 100 ? '…' : ''}</p>}
      <Button disabled={busy} onClick={() => edit(note.symbol, name)} aria-label={`${name} 투자 메모 읽기·수정`}>읽기·수정</Button>
    </article>)}
    {rows.length > 3 && <Button type="text" onClick={() => setExpanded(!expanded)}>{expanded ? '메모 접기' : `메모 전체 ${rows.length}개 보기`}</Button>}
  </section>
}

export function HoldingNoteEditor({ symbol, name, initial, version, busy, error, close, save }: {
  symbol: string; name: string; initial?: HoldingNote; version: number; busy: boolean; error: string | null; close: () => void; save: (note: HoldingNoteRequest) => Promise<boolean>
}) {
  const { modal } = App.useApp()
  const [base] = useState(() => ({ draft: noteDraft(initial), version }))
  const [draft, setDraft] = useState<HoldingNoteDraft>(base.draft)
  const [validation, setValidation] = useState<string | null>(null)
  const [calendarOpen, setCalendarOpen] = useState(false)
  const changed = JSON.stringify(normalizedNote(draft)) !== JSON.stringify(normalizedNote(base.draft))
  const clearing = !!initial && noteIsEmpty(draft)
  function confirmDelete() {
    if (busy) return
    modal.confirm({ title: '이 종목의 투자 메모를 삭제할까요?', content: '보유 수량과 점검 기준은 그대로 유지돼요.', okText: '메모 삭제', cancelText: '유지하기', okButtonProps: { danger: true }, onOk: () => { void save({ ...emptyHoldingNote(), symbol, version: base.version }) } })
  }
  function cancel() {
    if (busy) return
    if (changed) modal.confirm({ title: '저장하지 않은 메모를 닫을까요?', content: '저장된 메모는 그대로 유지돼요.', okText: '입력 취소', cancelText: '계속 입력', onOk: close })
    else close()
  }
  function submit() {
    const problem = holdingNoteError(draft); setValidation(problem)
    if (!problem) {
      if (clearing) confirmDelete()
      else void save({ ...normalizedNote(draft), version: base.version, symbol })
    }
  }
  function change(field: keyof HoldingNoteDraft, value: string) { setDraft({ ...draft, [field]: value || (field === 'reviewDate' ? null : '') }); setValidation(null) }
  return <Drawer open title={`${name} · 투자 메모`} width="min(480px, 100vw)" onClose={cancel} maskClosable={!busy} keyboard={!busy && !calendarOpen} closable={!busy}
    footer={<Space direction="vertical" style={{ width: '100%' }}><Button block type="primary" size="large" danger={clearing} loading={busy} disabled={!changed} aria-label={clearing ? '메모 삭제 확인' : '투자 메모 저장'} onClick={submit}>{clearing ? '메모 삭제 확인' : '메모 저장'}</Button>{initial && !clearing && <Button block danger disabled={busy} onClick={confirmDelete}>메모 삭제</Button>}</Space>}>
    <div className="holding-note-fields">
      <p>모든 항목은 선택 입력이에요. 투자 이유를 기억하고 다음 점검 때 다시 확인해보세요.</p>
      {clearing && <Alert type="info" message="메모 내용을 모두 비웠어요. 삭제 확인 후 이 종목의 메모만 삭제해요." />}
      <label>보유 이유<Input.TextArea aria-label="보유 이유" rows={4} maxLength={500} showCount disabled={busy} value={draft.reason} placeholder="이 종목을 보유하는 이유는 무엇인가요?" onChange={e => change('reason', e.target.value)} /></label>
      <label>다음 확인할 내용<Input.TextArea aria-label="다음 확인할 내용" rows={4} maxLength={500} showCount disabled={busy} value={draft.nextCheck} placeholder="다음에 어떤 자료나 변화를 살펴볼까요?" onChange={e => change('nextCheck', e.target.value)} /></label>
      <div className="holding-note-date-field">
        <label htmlFor="holding-note-review-date">재점검 날짜</label>
        <div className="holding-note-date-control">
          <ConfigProvider theme={{ components: { DatePicker: { cellWidth: 40, cellHeight: 32 } } }}><DatePicker id="holding-note-review-date" aria-label="재점검 날짜" aria-describedby="holding-note-date-help" inputReadOnly allowClear={false} disabled={busy} locale={koKR}
            open={calendarOpen} onOpenChange={setCalendarOpen} onKeyDown={event => { if (event.key === 'Escape') event.stopPropagation() }}
            placeholder="날짜 선택 (선택 사항)" value={draft.reviewDate ? dayjs(draft.reviewDate).locale('ko') : null} minDate={dayjs('2000-01-01')} maxDate={dayjs('2100-12-31')}
            format={value => holdingNoteDateText(value.format('YYYY-MM-DD'))} onChange={value => change('reviewDate', value?.format('YYYY-MM-DD') ?? '')} /></ConfigProvider>
          {!!draft.reviewDate && <Button disabled={busy} aria-label="재점검 날짜 지우기" onClick={() => change('reviewDate', '')}>지우기</Button>}
        </div>
        <small id="holding-note-date-help">이 날짜에 앱에서 다시 확인해요. 알림은 보내지 않아요.</small>
      </div>
      <label>돌아본 내용 (선택)<Input.TextArea aria-label="돌아본 내용" rows={4} maxLength={1000} showCount disabled={busy} value={draft.reflection} placeholder="처음 생각과 달라진 점이나 확인한 내용을 남겨보세요." onChange={e => change('reflection', e.target.value)} /></label>
      {initial && <small>최근 저장 · {new Date(initial.updatedAt).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })}</small>}
      {(validation || error) && <Alert type="error" showIcon message={validation || error} description="입력한 메모는 유지돼요. 다른 화면의 변경으로 충돌했다면 내용을 복사해 둔 뒤 최신 기록을 다시 확인해주세요." />}
    </div>
  </Drawer>
}
