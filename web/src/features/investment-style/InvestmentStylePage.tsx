import { useEffect, useRef, useState } from 'react'
import { Alert, App, Button, Card, Radio, Space, Typography } from 'antd'
import { Link, useNavigate } from 'react-router-dom'
import { investmentStyleResult, investmentStyleShareText, investmentStyleStorageKey, investmentStyleTitle, parseSavedStyle, saveStyleSnapshot, styleQuestions, type SavedStyle, type StyleAnswers } from '../../../../shared/investment-style'
import { FirewatchIcon } from '../../components/FirewatchIcon'
import type { FirewatchIconName } from '../../../../shared/firewatch-icons'
import { shareOrCopy } from '../../lib/share'
import './investment-style.css'

// 결과 유형마다 장식용 심볼 — 게임 마스코트가 아니라 기존 추상 아이콘 세트를 재사용(실자산 화면 톤 유지).
const STYLE_ICONS: Record<string, FirewatchIconName> = { routine: 'rules', research: 'audit', compare: 'indices', simple: 'selected', exploring: 'notice' }

function readSaved() {
  try { return { saved: parseSavedStyle(localStorage.getItem(investmentStyleStorageKey)), error: '' } }
  catch { return { saved: null, error: '이 브라우저의 저장한 결과를 읽지 못했어요. 저장 기능 없이 테스트를 진행할 수 있어요.' } }
}
export function InvestmentStylePage() {
  const [{ saved: initial, error: initialError }] = useState(readSaved)
  const [saved, setSaved] = useState<SavedStyle | null>(initial)
  const [answers, setAnswers] = useState<StyleAnswers>(() => initial?.answers ?? {})
  const [view, setView] = useState<'intro' | 'questions' | 'result'>(initial ? 'result' : 'intro')
  const [index, setIndex] = useState(0)
  const [error, setError] = useState(initialError)
  const [hasStoredValue, setHasStoredValue] = useState(!!initial || !!initialError)
  const heading = useRef<HTMLHeadingElement>(null)
  const questionHeading = useRef<HTMLHeadingElement>(null)
  const { modal, message } = App.useApp()
  const navigate = useNavigate()
  const question = styleQuestions[index]
  useEffect(() => { (view === 'questions' ? questionHeading.current : heading.current)?.focus() }, [index, view])
  useEffect(() => {
    if (view !== 'questions' || !Object.keys(answers).length) return
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = '' }
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [view, answers])
  function leave() {
    if (view === 'questions' && Object.keys(answers).length) modal.confirm({ title: '테스트를 나갈까요?', content: '작성 중인 답변은 저장되지 않아요. 이전에 저장한 결과는 유지돼요.', okText: '테스트 나가기', cancelText: '계속 답하기', onOk: () => navigate('/') })
    else navigate('/')
  }
  function persist() {
    try {
      const snapshot = saveStyleSnapshot(answers)
      localStorage.setItem(investmentStyleStorageKey, JSON.stringify(snapshot)); setSaved(snapshot); setHasStoredValue(true); setError(''); message.success('이 브라우저에 결과를 저장했어요.')
    } catch { setError('결과를 저장하지 못했어요. 현재 답변과 결과는 화면에 유지돼요.') }
  }
  function remove() {
    modal.confirm({ title: '이 브라우저에 저장한 테스트 결과를 삭제할까요?', content: '서버의 보유 자산과 투자 메모는 그대로 유지돼요.', okText: '저장 결과 삭제', cancelText: '유지하기', okButtonProps: { danger: true }, onOk: () => {
      try { localStorage.removeItem(investmentStyleStorageKey); setSaved(null); setHasStoredValue(false); setError(''); setAnswers({}); setView('intro'); message.success('저장한 결과를 삭제했어요.') }
      catch { setError('저장한 결과를 삭제하지 못했어요. 다시 시도해주세요.') }
    } })
  }
  const result = view === 'result' ? investmentStyleResult(answers) : null
  async function shareResult() {
    if (!result) return
    const outcome = await shareOrCopy(investmentStyleShareText(result.name, `${window.location.origin}/investment-style`))
    if (outcome === 'copied') message.success('공유 문구를 클립보드에 복사했어요.')
    else if (outcome === 'failed') message.error('공유하지 못했어요. 다시 시도해주세요.')
  }
  const matchesSaved = !!saved && JSON.stringify(saved.answers) === JSON.stringify(answers)
  return <section className="investment-style-page">
    <Button type="text" onClick={leave}>← 내 투자로 돌아가기</Button>
    <header><Typography.Title ref={heading} tabIndex={-1} level={2}>{investmentStyleTitle}</Typography.Title><p>현재 답변으로 내 상황과 편한 관리 방식을 살펴봐요.</p></header>
    {error && <Alert type="warning" showIcon message={error} />}
    {view === 'intro' && <Card><div className="style-flow">
      <strong>10문항 · 약 2분 · 로그인 없이</strong>
      <p>어떤 방식이 더 우수한지 평가하지 않아요. 모르는 질문은 ‘모르겠어요’를 선택해도 괜찮아요.</p>
      <ul><li>돈을 사용할 시점과 생활에 미치는 영향</li><li>가격 변동을 대하는 마음과 경험</li><li>내가 지속하기 편한 투자 관리 과정</li></ul>
      <p>결과는 답변을 정리하는 자기점검이에요. 수익률·종목·매매 시점을 추천하지 않아요.</p>
      <p>답변은 결과 저장을 선택하기 전까지 이 화면에서만 사용해요. 서버·AI에 보내지 않고 기존 투자 설정을 바꾸지 않아요.</p>
      <Button type="primary" size="large" onClick={() => { setAnswers({}); setIndex(0); setView('questions') }}>내 투자 방식 살펴보기</Button>
      {hasStoredValue && <Button danger onClick={remove}>이 브라우저의 저장 결과 삭제</Button>}
    </div></Card>}
    {view === 'questions' && <section aria-label="투자 방식 질문" className="style-flow">
      <span role="status">질문 {index + 1} / {styleQuestions.length}</span><div className="style-steps" aria-hidden="true">{styleQuestions.map((q, i) => <div key={q.id} className={`style-step ${i < index ? 'done' : i === index ? 'current' : ''}`} />)}</div>
      <Card><div className="style-flow"><h3 ref={questionHeading} tabIndex={-1} id="style-question-title">{question.title}</h3><p id="style-question-help">{question.help}</p>
        <Radio.Group aria-labelledby="style-question-title" aria-describedby="style-question-help" value={answers[question.id]} onChange={event => setAnswers(current => ({ ...current, [question.id]: event.target.value }))} className="style-options">
          {question.options.map(option => <Radio key={option.id} value={option.id}>{option.label}</Radio>)}
        </Radio.Group>
      </div></Card>
      <div className="style-controls"><Button disabled={index === 0} onClick={() => setIndex(index - 1)}>이전 질문</Button><Button type="primary" disabled={!answers[question.id]} onClick={() => { if (index === styleQuestions.length - 1) setView('result'); else setIndex(index + 1) }}>{index === styleQuestions.length - 1 ? '내 결과 보기' : '다음 질문'}</Button></div>
      <small>답변은 자동 저장되지 않아요. 나갔다가 돌아오면 다시 답해야 해요.</small>
    </section>}
    {result && <section aria-label="나의 투자 방식 결과" className="style-flow">
      <Card><div className="style-flow"><span>현재 답변으로 본 나의 관리 방식</span><div className="style-result-badge"><div className="style-result-icon"><FirewatchIcon name={STYLE_ICONS[result.kind]} size={28} /></div><h3 className="style-result-name">{result.name}</h3></div><p>{result.description}</p><p>{result.method}</p><Button onClick={shareResult}>결과 공유하기</Button><details><summary>이 결과가 나온 답변 보기</summary>{result.evidence.map(item => <p key={item.question}>{item.question}<br /><strong>{item.answer}</strong></p>)}</details></div></Card>
      <Card title="마음과 상황을 따로 살펴봐요"><h4>감수하고 싶은 마음</h4><p>{result.willingnessText}</p><h4>현재 생활과 사용 시점</h4><p>{result.capacityText}</p></Card>
      <Card title="먼저 확인할 점"><ul>{result.notices.map(notice => <li key={notice}>{notice}</li>)}</ul></Card>
      <Card title="다음에 해볼 일"><ol><li>돈을 모으는 목적과 사용할 시점을 적어보세요.</li><li>내 투자에서 보유 이유와 다음 확인할 내용을 남겨보세요.</li></ol><p>{result.learning}</p><Space wrap><Button type="primary" onClick={() => navigate('/')}>내 투자로 이동</Button><Link to="/investment-info">투자 정보 이용안내 읽기</Link></Space></Card>
      <Card title="이 브라우저에 결과 보관"><p>저장을 선택하면 답변과 저장 날짜가 이 브라우저에만 보관돼요. 계정·다른 기기에 동기화되지 않으며 서버·AI로 전송하지 않아요.</p>
        <div className="style-controls"><Button disabled={matchesSaved} onClick={persist}>{matchesSaved ? '현재 결과 저장됨' : '결과 저장 (선택)'}</Button>{saved && <Button danger onClick={remove}>저장 결과 삭제</Button>}</div>
        {saved && <p>최근 저장 · {new Date(saved.savedAt).toLocaleDateString('ko-KR', { timeZone: 'Asia/Seoul' })}{!matchesSaved && ' · 현재 화면의 새 답변은 아직 저장하지 않았어요.'}</p>}
      </Card>
      <Button onClick={() => { setIndex(0); setView('questions') }}>답변 다시 보고 수정하기</Button>
      <details><summary>전체 답변 보기</summary>{styleQuestions.map(q => <p key={q.id}>{q.title}<br /><strong>{q.options.find(option => option.id === answers[q.id])?.label}</strong></p>)}</details>
      <small>규칙으로 답변을 정리한 자기점검이에요. 투자 실력이나 상품 적합성을 판정하지 않으며, 생활과 목표가 달라지면 다시 확인해주세요.</small>
    </section>}
  </section>
}
