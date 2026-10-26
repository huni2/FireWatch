import { useState } from 'react'
import { Alert, Keyboard, Pressable, Text, TextInput, View } from 'react-native'
import DateTimePicker from '@react-native-community/datetimepicker'
import { useTheme } from '@/lib/theme'
import { ActionButton } from '@/components/ActionButton'
import { EditorFrame } from './PortfolioEditor'
import type { HoldingNote, HoldingNoteDraft, HoldingNoteRequest, Portfolio } from '../../../../shared/investing'
import { emptyHoldingNote, holdingNoteDateText, holdingNoteError, holdingNotePickerDate, holdingNoteRows, normalizedNote, noteDateLabel, noteDraft, noteIsEmpty } from '../../../../shared/holding-notes'

export function HoldingNotes({ portfolio, busy, edit }: { portfolio: Portfolio; busy: boolean; edit: (symbol: string, name: string) => void }) {
  const { colors: c } = useTheme()
  const [expanded, setExpanded] = useState(false)
  if (portfolio.holdingNotes === undefined || (!portfolio.holdings.length && !portfolio.holdingNotes.length)) return null
  const rows = holdingNoteRows(portfolio)
  const dueCount = rows.filter(row => row.due).length
  return <View accessibilityLabel="투자 메모와 복기" style={{ gap: 14, padding: 18, borderRadius: 16, borderWidth: 1, borderColor: c.border, backgroundColor: c.surface }}>
    <Text style={{ color: c.text, fontWeight: '700', fontSize: 18 }}>투자 메모와 복기</Text>
    <Text style={{ color: c.muted, lineHeight: 22 }}>보유한 이유를 남기고 다음 점검 때 돌아보세요. 재점검 날짜는 앱에서 표시하며 알림을 발송하지 않아요.</Text>
    {!!rows.length && <Text style={{ color: c.text }}>{dueCount ? `${dueCount}개 메모를 다시 확인해보세요.` : '지금 다시 확인할 메모는 없어요.'}</Text>}
    {!rows.length && <Text style={{ color: c.muted, lineHeight: 22 }}>보유 자산의 ‘투자 메모’에서 선택적으로 기록할 수 있어요.</Text>}
    {(expanded ? rows : rows.slice(0, 3)).map(({ note, name, archived }) => <View key={note.symbol} style={{ gap: 8, paddingVertical: 12, borderTopWidth: 1, borderTopColor: c.border }}>
      <Text style={{ color: c.text, fontWeight: '600' }}>{name}{archived ? ' · 이전 보유' : ''}</Text>
      <Text style={{ color: c.muted }}>{noteDateLabel(note)}</Text>
      {!!note.reason && <Text style={{ color: c.text, lineHeight: 22 }}>보유 이유 · {note.reason}</Text>}
      {!!note.nextCheck && <Text style={{ color: c.muted, lineHeight: 22 }}>다음 확인 · {note.nextCheck}</Text>}
      {!!note.reflection && <Text style={{ color: c.text, lineHeight: 22 }}>돌아본 내용 · {note.reflection}</Text>}
      <ActionButton label={`${name} 메모 읽기·수정`} disabled={busy} onPress={() => edit(note.symbol, name)} />
    </View>)}
    {rows.length > 3 && <ActionButton label={expanded ? '메모 접기' : `메모 전체 ${rows.length}개 보기`} onPress={() => setExpanded(!expanded)} />}
  </View>
}

export function HoldingNoteEditor({ symbol, name, initial, version, busy, error, close, save }: {
  symbol: string; name: string; initial?: HoldingNote; version: number; busy: boolean; error: string | null; close: () => void; save: (note: HoldingNoteRequest) => Promise<boolean>
}) {
  const { colors: c } = useTheme()
  const [base] = useState(() => ({ draft: noteDraft(initial), version }))
  const [draft, setDraft] = useState<HoldingNoteDraft>(base.draft)
  const [validation, setValidation] = useState<string | null>(null)
  const [calendar, setCalendar] = useState(false)
  const changed = JSON.stringify(normalizedNote(draft)) !== JSON.stringify(normalizedNote(base.draft))
  const clearing = !!initial && noteIsEmpty(draft)
  function confirmDelete() {
    if (busy) return
    Keyboard.dismiss()
    Alert.alert('이 종목의 메모를 삭제할까요?', '보유 수량과 점검 기준은 유지돼요.', [{ text: '유지하기', style: 'cancel' }, { text: '메모 삭제', style: 'destructive', onPress: () => { void save({ ...emptyHoldingNote(), symbol, version: base.version }) } }])
  }
  function change(field: keyof HoldingNoteDraft, value: string) { setDraft({ ...draft, [field]: value || (field === 'reviewDate' ? null : '') }); setValidation(null) }
  function submit() { const problem = holdingNoteError(draft); setValidation(problem); if (!problem) { if (clearing) confirmDelete(); else void save({ ...normalizedNote(draft), symbol, version: base.version }) } }
  return <EditorFrame title={`${name} · 투자 메모`} saving={busy} changed={changed} submitDisabled={!changed} error={validation || error} close={close} submit={submit} button={clearing ? '메모 삭제 확인' : '메모 저장'}>
    <Text style={{ color: c.muted, lineHeight: 22 }}>모든 항목은 선택 입력이에요.</Text>
    {clearing && <Text accessibilityRole="alert" style={{ color: c.text, lineHeight: 22 }}>메모 내용을 모두 비웠어요. 삭제 확인 후 이 종목의 메모만 삭제해요.</Text>}
    {(['reason', 'nextCheck'] as const).map(field => <View key={field} style={{ gap: 8 }}>
      <Text style={{ color: c.text, fontWeight: '600' }}>{field === 'reason' ? '보유 이유' : '다음 확인할 내용'}</Text>
      <TextInput accessibilityLabel={field === 'reason' ? '보유 이유' : '다음 확인할 내용'} multiline textAlignVertical="top" maxLength={500} editable={!busy} value={draft[field]} onChangeText={value => change(field, value)}
        placeholder={field === 'reason' ? '이 종목을 보유하는 이유는 무엇인가요?' : '다음에 어떤 자료나 변화를 살펴볼까요?'} placeholderTextColor={c.muted} style={{ borderWidth: 1, borderColor: c.border, borderRadius: 12, padding: 14, color: c.text, minHeight: 120 }} />
      <Text style={{ color: c.muted }}>{draft[field].length}/500</Text>
    </View>)}
    <View style={{ gap: 8 }}><Text style={{ color: c.text, fontWeight: '600' }}>재점검 날짜</Text>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <Pressable accessibilityRole="button" accessibilityLabel={`재점검 날짜 · ${holdingNoteDateText(draft.reviewDate)}`} accessibilityHint="달력을 열어 날짜를 선택하거나 변경해요." accessibilityState={{ disabled: busy, expanded: calendar }} disabled={busy} onPress={() => { Keyboard.dismiss(); setCalendar(true) }} style={{ flex: 1, minHeight: 56, justifyContent: 'center', borderWidth: 1, borderColor: c.border, borderRadius: 12, padding: 14 }}>
          <Text style={{ color: draft.reviewDate ? c.text : c.muted }}>{holdingNoteDateText(draft.reviewDate)}</Text>
        </Pressable>
        {!!draft.reviewDate && <Pressable accessibilityRole="button" accessibilityLabel="재점검 날짜 지우기" accessibilityState={{ disabled: busy }} disabled={busy} onPress={() => change('reviewDate', '')} style={{ minHeight: 48, justifyContent: 'center', paddingHorizontal: 12 }}><Text style={{ color: c.muted }}>지우기</Text></Pressable>}
      </View>
      <Text style={{ color: c.muted, lineHeight: 22 }}>이 날짜에 앱에서 다시 확인해요. 알림은 보내지 않아요.</Text>
      {calendar && <DateTimePicker value={holdingNotePickerDate(draft.reviewDate)} mode="date" minimumDate={new Date(2000, 0, 1)} maximumDate={new Date(2100, 11, 31)} onChange={(event, date) => { setCalendar(false); if (event.type === 'set' && date) change('reviewDate', `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`) }} />}
    </View>
    <View style={{ gap: 8 }}><Text style={{ color: c.text, fontWeight: '600' }}>돌아본 내용 (선택)</Text><TextInput accessibilityLabel="돌아본 내용" multiline textAlignVertical="top" maxLength={1000} editable={!busy} value={draft.reflection} onChangeText={value => change('reflection', value)} placeholder="처음 생각과 달라진 점이나 확인한 내용을 남겨보세요." placeholderTextColor={c.muted} style={{ color: c.text, borderWidth: 1, borderColor: c.border, borderRadius: 12, padding: 14, minHeight: 120 }} /><Text style={{ color: c.muted }}>{draft.reflection.length}/1000</Text></View>
    {initial && <><Text style={{ color: c.muted }}>최근 저장 · {new Date(initial.updatedAt).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })}</Text>{!clearing && <Pressable accessibilityRole="button" disabled={busy} onPress={confirmDelete} style={{ minHeight: 48, justifyContent: 'center' }}><Text style={{ color: c.danger }}>메모 삭제</Text></Pressable>}</>}
  </EditorFrame>
}
