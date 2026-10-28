import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Alert, BackHandler, Pressable, ScrollView, Text, View } from 'react-native'
import { Stack, router } from 'expo-router'
import * as SecureStore from 'expo-secure-store'
import { ActionButton } from '@/components/ActionButton'
import { useTheme } from '@/lib/theme'
import { investmentStyleResult, investmentStyleStorageKey, investmentStyleTitle, parseSavedStyle, saveStyleSnapshot, styleQuestions, type SavedStyle, type StyleAnswers } from '../../../../shared/investment-style'

function Panel({ title, children }: { title: string; children: ReactNode }) {
  const { colors: c } = useTheme()
  return <View style={{ gap: 16, padding: 20, borderWidth: 1, borderColor: c.border, borderRadius: 16, backgroundColor: c.surface }}><Text accessibilityRole="header" style={{ color: c.text, fontSize: 20, fontWeight: '700', lineHeight: 28 }}>{title}</Text>{children}</View>
}
export function InvestmentStyleScreen() {
  const { colors: c } = useTheme()
  const [saved, setSaved] = useState<SavedStyle | null>(null)
  const [answers, setAnswers] = useState<StyleAnswers>({})
  const [view, setView] = useState<'intro' | 'questions' | 'result'>('intro')
  const [index, setIndex] = useState(0)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [hasStoredValue, setHasStoredValue] = useState(false)
  const [answersExpanded, setAnswersExpanded] = useState(false)
  const operation = useRef(false)
  const scroll = useRef<ScrollView>(null)
  useEffect(() => {
    let active = true
    SecureStore.getItemAsync(investmentStyleStorageKey).then(raw => {
      if (!active) return
      setHasStoredValue(!!raw)
      const snapshot = parseSavedStyle(raw)
      if (snapshot) { setSaved(snapshot); setAnswers(snapshot.answers); setView('result') }
    }).catch(() => { if (active) setError('이 기기에 저장한 결과를 읽지 못했어요. 저장 기능 없이 테스트를 진행할 수 있어요.') }).finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [])
  function leave() {
    if (busy) return
    const exit = () => { if (router.canGoBack()) router.back(); else router.replace('/') }
    if (view === 'questions' && Object.keys(answers).length) Alert.alert('테스트를 나갈까요?', '작성 중인 답변은 저장되지 않아요. 이전에 저장한 결과는 유지돼요.', [{ text: '계속 답하기', style: 'cancel' }, { text: '테스트 나가기', onPress: exit }])
    else exit()
  }
  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => { leave(); return true })
    return () => subscription.remove()
    // The current draft must be used by the hardware back action.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, answers, busy])
  useEffect(() => { scroll.current?.scrollTo({ y: 0, animated: false }) }, [index, view])
  async function persist() {
    if (operation.current) return
    operation.current = true; setBusy(true)
    try { const snapshot = saveStyleSnapshot(answers); await SecureStore.setItemAsync(investmentStyleStorageKey, JSON.stringify(snapshot)); setSaved(snapshot); setHasStoredValue(true); setError('') }
    catch { setError('결과를 저장하지 못했어요. 현재 답변과 결과는 화면에 유지돼요.') }
    finally { operation.current = false; setBusy(false) }
  }
  function remove() {
    if (busy) return
    Alert.alert('이 기기에 저장한 테스트 결과를 삭제할까요?', '서버의 보유 자산과 투자 메모는 그대로 유지돼요.', [{ text: '유지하기', style: 'cancel' }, { text: '저장 결과 삭제', style: 'destructive', onPress: async () => {
      if (operation.current) return
      operation.current = true; setBusy(true)
      try { await SecureStore.deleteItemAsync(investmentStyleStorageKey); setSaved(null); setHasStoredValue(false); setAnswers({}); setView('intro'); setError('') }
      catch { setError('저장한 결과를 삭제하지 못했어요. 다시 시도해주세요.') }
      finally { operation.current = false; setBusy(false) }
    } }])
  }
  const text = { color: c.text, fontSize: 16, lineHeight: 25 }
  const muted = { color: c.muted, fontSize: 14, lineHeight: 22 }
  const question = styleQuestions[index]
  const result = view === 'result' ? investmentStyleResult(answers) : null
  const matchesSaved = !!saved && JSON.stringify(saved.answers) === JSON.stringify(answers)
  return <View style={{ flex: 1, backgroundColor: c.canvas }}>
    <Stack.Screen options={{ title: '내 투자 방식 찾기', headerLeft: () => <Pressable accessibilityRole="button" accessibilityLabel="내 투자로 돌아가기" disabled={busy} onPress={leave} style={{ minHeight: 48, paddingRight: 12, justifyContent: 'center' }}><Text style={{ color: c.primary }}>← 돌아가기</Text></Pressable> }} />
    <ScrollView ref={scroll} contentContainerStyle={{ padding: 20, gap: 20, paddingBottom: 40 }}>
      <Text accessibilityRole="header" style={{ color: c.text, fontSize: 26, fontWeight: '700', lineHeight: 36 }}>{investmentStyleTitle}</Text><Text style={muted}>현재 답변으로 내 상황과 편한 관리 방식을 살펴봐요.</Text>
      {!!error && <Text accessibilityRole="alert" style={{ ...muted, color: c.danger }}>{error}</Text>}
      {loading ? <Text style={muted}>이 기기에 저장한 결과를 확인하고 있어요.</Text> : view === 'intro' ? <Panel title="10문항 · 약 2분 · 로그인 없이">
        <Text style={text}>어떤 방식이 더 우수한지 평가하지 않아요. 모르는 질문은 ‘모르겠어요’를 선택해도 괜찮아요.</Text>
        <Text style={text}>• 돈을 사용할 시점과 생활에 미치는 영향{`\n`}• 가격 변동을 대하는 마음과 경험{`\n`}• 내가 지속하기 편한 투자 관리 과정</Text>
        <Text style={muted}>답변을 정리하는 자기점검이에요. 수익률·종목·매매 시점을 추천하지 않아요. 답변은 결과 저장을 선택하기 전까지 이 화면에서만 사용하며 서버·AI에 보내지 않아요.</Text>
        <ActionButton fullWidth tone="primary" label="내 투자 방식 살펴보기" onPress={() => { setAnswers({}); setIndex(0); setView('questions') }} />
        {hasStoredValue && <ActionButton fullWidth label="이 기기의 저장 결과 삭제" disabled={busy} onPress={remove} />}
      </Panel> : null}
      {!loading && view === 'questions' && <>
        <Text accessibilityLiveRegion="polite" style={muted}>질문 {index + 1} / {styleQuestions.length}</Text>
        <View accessibilityLabel={`${styleQuestions.length}개 중 ${index}개 진행`} style={{ height: 6, backgroundColor: c.border, borderRadius: 6 }}><View style={{ height: 6, width: `${index / styleQuestions.length * 100}%`, backgroundColor: c.primary, borderRadius: 6 }} /></View>
        <Panel title={question.title}><Text style={muted}>{question.help}</Text><View accessibilityRole="radiogroup" accessibilityLabel={question.title} style={{ gap: 12 }}>{question.options.map(option => <Pressable key={option.id} accessibilityRole="radio" accessibilityState={{ checked: answers[question.id] === option.id }} onPress={() => setAnswers(current => ({ ...current, [question.id]: option.id }))} style={{ padding: 16, minHeight: 56, borderWidth: 1, borderRadius: 12, borderColor: answers[question.id] === option.id ? c.primary : c.border, backgroundColor: answers[question.id] === option.id ? c.primarySoft : c.surface }}><Text style={text}>{option.label}</Text></Pressable>)}</View></Panel>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12 }}><ActionButton label="이전 질문" disabled={index === 0} onPress={() => setIndex(index - 1)} /><ActionButton tone="primary" label={index === styleQuestions.length - 1 ? '내 결과 보기' : '다음 질문'} disabled={!answers[question.id]} onPress={() => { if (index === styleQuestions.length - 1) setView('result'); else setIndex(index + 1) }} /></View>
        <Text style={muted}>답변은 자동 저장되지 않아요. 나갔다가 돌아오면 다시 답해야 해요.</Text>
      </>}
      {!loading && result && <>
        <Panel title={result.name}><Text style={muted}>현재 답변으로 본 나의 관리 방식</Text><Text style={text}>{result.description}</Text><Text style={text}>{result.method}</Text>{result.evidence.map(item => <View key={item.question} style={{ gap: 4 }}><Text style={muted}>{item.question}</Text><Text style={text}>{item.answer}</Text></View>)}</Panel>
        <Panel title="마음과 상황을 따로 살펴봐요"><Text style={text}>감수하고 싶은 마음</Text><Text style={muted}>{result.willingnessText}</Text><Text style={text}>현재 생활과 사용 시점</Text><Text style={muted}>{result.capacityText}</Text></Panel>
        <Panel title="먼저 확인할 점">{result.notices.map(notice => <Text key={notice} style={text}>• {notice}</Text>)}</Panel>
        <Panel title="다음에 해볼 일"><Text style={text}>1. 돈을 모으는 목적과 사용할 시점을 적어보세요.{`\n`}2. 내 투자에서 보유 이유와 다음 확인할 내용을 남겨보세요.</Text><Text style={muted}>{result.learning}</Text><ActionButton fullWidth tone="primary" label="내 투자로 이동" onPress={() => router.replace('/')} /><ActionButton fullWidth label="투자 정보 이용안내 읽기" onPress={() => router.push('/investment-info')} /></Panel>
        <Panel title="이 기기에 결과 보관"><Text style={muted}>저장을 선택하면 답변과 저장 날짜가 이 기기에만 보관돼요. 계정·다른 기기에 동기화되지 않으며 서버·AI로 전송하지 않아요. 기존 투자 설정도 바꾸지 않아요.</Text>
          <ActionButton fullWidth label={matchesSaved ? '현재 결과 저장됨' : '결과 저장 (선택)'} disabled={busy || matchesSaved} busy={busy} onPress={() => void persist()} />
          {!!saved && <Text accessibilityLiveRegion="polite" style={muted}>최근 저장 · {new Date(saved.savedAt).toLocaleDateString('ko-KR', { timeZone: 'Asia/Seoul' })}{!matchesSaved ? ' · 현재 화면의 새 답변은 아직 저장하지 않았어요.' : ''}</Text>}
          {hasStoredValue && <ActionButton fullWidth label="저장 결과 삭제" disabled={busy} onPress={remove} />}
        </Panel>
        <ActionButton fullWidth label="답변 다시 보고 수정하기" disabled={busy} onPress={() => { setIndex(0); setView('questions') }} />
        <Pressable accessibilityRole="button" accessibilityState={{ expanded: answersExpanded }} onPress={() => setAnswersExpanded(!answersExpanded)} style={{ minHeight: 48, justifyContent: 'center' }}><Text style={{ color: c.primary }}>{answersExpanded ? '전체 답변 접기' : '전체 답변 보기'}</Text></Pressable>
        {answersExpanded && <Panel title="전체 답변">{styleQuestions.map(q => <View key={q.id} style={{ gap: 4 }}><Text style={muted}>{q.title}</Text><Text style={text}>{q.options.find(option => option.id === answers[q.id])?.label}</Text></View>)}</Panel>}
        <Text style={muted}>규칙으로 답변을 정리한 자기점검이에요. 투자 실력이나 상품 적합성을 판정하지 않으며, 생활과 목표가 달라지면 다시 확인해주세요.</Text>
      </>}
    </ScrollView>
  </View>
}
