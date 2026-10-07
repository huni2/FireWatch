import { useEffect, useRef, useState } from 'react'
import { Button, Modal, Tour } from 'antd'
import { useLocation, useNavigate } from 'react-router-dom'
import { FIRST_VISIT_GUIDE_EVENT } from './guideEvents'

const STORAGE_KEY = 'firewatch-guide-v1'

const lessons = [
  { path: '/', target: 'portfolio-intro', title: '내 투자 기록부터 시작해요', description: 'FireWatch는 보유 자산과 목표를 직접 기록하고 점검하는 공간이에요. 실제 주식 주문이나 증권사 계좌 연동은 여기서 이루어지지 않아요.' },
  { path: '/', target: 'portfolio-holdings', title: '회사명 → 수량 → 평균 매입가', description: '자산 추가를 누르고 회사 이름을 검색한 뒤 보유 수량과 평균 매입가를 입력하세요. 저장하고 분석하기를 누르면 내 투자 구성을 확인할 수 있어요. 안내 중에는 입력이나 저장을 하지 않아요.' },
  { path: '/candidates', target: 'candidate-recommendations', title: '추천의 이유와 위험을 함께 읽어요', description: '분야별 기업을 둘러보고, 개별 종목 추천의 근거와 위험을 확인하세요. 기업을 선택하면 가격·그래프·관련 뉴스를 자세히 볼 수 있어요.' },
  { path: '/news', target: 'news-search', title: '그때의 뉴스도 다시 찾아봐요', description: '회사명이나 관심 키워드를 입력하고 날짜 범위를 선택하세요. 수집해 저장한 뉴스에서 투자 판단의 맥락을 찾아볼 수 있어요.' },
  { path: '/game', target: 'game-intro', title: '가상투자로 선택을 연습해요', description: '게임 시작 → AI 픽의 이유 확인 → 매수·매도 금액 확인 → 다음 턴 순서로 진행해요. 턴 결과에서 가격이 움직인 이유를 돌아보세요. 가격·뉴스·AI 픽은 모두 가상이며 실제 포트폴리오와 별개예요.' },
]
const entryPaths = new Set(['/', '/candidates', '/briefing', '/stocks', '/indices', '/news', '/short-term', '/game', '/guide', '/usage'])

export function GuidedTour() {
  const location = useLocation()
  const navigate = useNavigate()
  const [welcome, setWelcome] = useState(false)
  const [open, setOpen] = useState(false)
  const [current, setCurrent] = useState(0)
  const [target, setTarget] = useState<HTMLElement | null>(null)
  const origin = useRef('/')
  const [initialUnseen] = useState(() => {
    try { return localStorage.getItem(STORAGE_KEY) !== 'seen' } catch { return true }
  })
  const unseen = useRef(initialUnseen)
  const remember = () => {
    unseen.current = false
    try { localStorage.setItem(STORAGE_KEY, 'seen') } catch { /* The guide also works without persistent storage. */ }
  }

  useEffect(() => {
    if (!unseen.current || !entryPaths.has(location.pathname)) return
    const frame = requestAnimationFrame(() => { unseen.current = false; setWelcome(true) })
    return () => cancelAnimationFrame(frame)
  }, [location.pathname])
  useEffect(() => {
    const replay = () => setWelcome(true)
    window.addEventListener(FIRST_VISIT_GUIDE_EVENT, replay)
    return () => window.removeEventListener(FIRST_VISIT_GUIDE_EVENT, replay)
  }, [])
  useEffect(() => {
    if (!open) return
    // Lazy routes and API-dependent cards can appear after the step opens.
    const findTarget = () => setTarget(location.pathname === lessons[current].path
      ? document.querySelector<HTMLElement>(`[data-tour="${lessons[current].target}"]`) : null)
    const observer = new MutationObserver(findTarget)
    observer.observe(document.querySelector('.app-content') ?? document.body, { childList: true, subtree: true })
    const frame = requestAnimationFrame(findTarget)
    return () => { observer.disconnect(); cancelAnimationFrame(frame) }
  }, [open, current, location.pathname])

  const finish = () => { setOpen(false); setTarget(null); navigate(origin.current, { replace: true }) }
  const changeStep = (index: number) => {
    setTarget(null)
    setCurrent(index)
    navigate(lessons[index].path, { replace: true })
  }
  const start = () => {
    remember()
    origin.current = location.pathname + location.search + location.hash
    setWelcome(false)
    changeStep(0)
    setOpen(true)
  }
  const dismissWelcome = () => { remember(); setWelcome(false) }

  return <>
    <Modal open={welcome} title="FireWatch, 같이 둘러볼까요?" onCancel={dismissWelcome} width={480}
      footer={<><Button onClick={dismissWelcome}>나중에 볼게요</Button><Button type="primary" onClick={start}>안내 시작</Button></>}>
      <p className="guide-welcome">내 투자 기록부터 뉴스 검색, 가상투자 연습까지. 화면을 하나씩 짚으며 5단계로 알려드릴게요.</p>
      <p>언제든 건너뛸 수 있고, 하단의 <strong>처음 사용 안내</strong>나 도움말에서 다시 볼 수 있어요.</p>
    </Modal>
    <Tour open={open} current={current} onChange={changeStep} onClose={finish} onFinish={finish}
      rootClassName="first-visit-tour" disabledInteraction placement="bottom"
      scrollIntoViewOptions={{ block: 'center', behavior: 'instant' }}
      indicatorsRender={(index, total) => <span aria-live="polite">{index + 1} / {total}</span>}
      actionsRender={buttons => <><Button type="text" onClick={finish}>건너뛰기</Button>{buttons}</>}
      steps={lessons.map((lesson, index) => ({ title: lesson.title, description: lesson.description,
        target: index === current ? target : null,
        nextButtonProps: { children: index === lessons.length - 1 ? '안내 마치기' : '다음' },
        prevButtonProps: { children: '이전' },
      }))} />
  </>
}
