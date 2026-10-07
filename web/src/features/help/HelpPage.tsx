import { useState } from 'react'
import { Button, Collapse, Empty, Input } from 'antd'
import { ArrowRightOutlined, PlayCircleOutlined, SearchOutlined } from '@ant-design/icons'
import { Link, useSearchParams } from 'react-router-dom'
import { showFirstVisitGuide } from '../../components/guideEvents'
import { helpCategories, helpTopics } from './helpTopics'
import './help.css'

const shortcuts = [
  { to: '/', number: '01', title: '내 투자 기록 시작', description: '회사명·수량·매입가로 첫 자산을 등록하세요.', label: '내 포트폴리오' },
  { to: '/news', number: '02', title: '궁금한 회사의 소식', description: '관심 키워드와 날짜로 저장된 뉴스를 찾으세요.', label: '뉴스 찾기' },
  { to: '/game', number: '03', title: '게임머니로 연습', description: '가상 픽을 고르고 거래·턴 결과를 확인하세요.', label: '가상투자 게임' },
]

export function HelpPage() {
  const [searchParams] = useSearchParams()
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('all')
  const words = query.trim().toLocaleLowerCase().split(/\s+/).filter(Boolean)
  const visible = helpTopics.filter(topic => {
    if (category !== 'all' && topic.category !== category) return false
    const text = [topic.title, topic.summary, ...topic.paragraphs, ...(topic.steps ?? []), topic.keywords ?? '', helpCategories.find(c => c.id === topic.category)?.label].join(' ').toLocaleLowerCase()
    return words.every(word => text.includes(word))
  })
  const reset = () => { setQuery(''); setCategory('all') }
  const initialTopic = searchParams.get('topic')

  return <div className="help-page">
    <header className="help-intro">
      <div><span className="eyebrow">FIREWATCH / HELP</span><h1>FireWatch 도움말</h1><p>지금 하려는 일부터 선택하세요. 사용 방법과 막힌 순간의 답을 함께 모았어요.</p></div>
      <Button size="large" icon={<PlayCircleOutlined />} onClick={showFirstVisitGuide}>처음 사용 안내 다시 보기</Button>
    </header>
    <section className="help-answers" aria-labelledby="help-answer-title">
      <div className="help-search-row"><h2 id="help-answer-title">궁금한 점 찾기</h2><Input aria-label="도움말 검색" placeholder="예: 매수, 뉴스 날짜, 알림, 저장" allowClear size="large" value={query} onChange={e => setQuery(e.target.value)} prefix={<SearchOutlined />} maxLength={100} /></div>
      <div className="help-answer-layout">
        <nav className="help-categories" aria-label="도움말 주제">
          {[{ id: 'all', label: '전체' }, ...helpCategories].map(item => <button type="button" key={item.id} aria-pressed={category === item.id} onClick={() => setCategory(item.id)}>{item.label}<span>{item.id === 'all' ? helpTopics.length : helpTopics.filter(t => t.category === item.id).length}</span></button>)}
        </nav>
        <div className="help-results">
          <p className="help-result-count" role="status">{words.length ? `‘${query.trim()}’ 검색 · ` : ''}{visible.length}개의 도움말{category !== 'all' ? ` · ${helpCategories.find(c => c.id === category)?.label}` : ''}</p>
          {visible.length ? <Collapse className="help-faq" key={category + ':' + query} defaultActiveKey={initialTopic ? [initialTopic] : []} items={visible.map(topic => ({
            key: topic.id,
            label: <div className="help-question"><h3>{topic.title}</h3><p>{topic.summary}</p></div>,
            children: <div className="help-answer-body">
              {topic.paragraphs.map(p => <p key={p}>{p}</p>)}
              {topic.steps && <ol>{topic.steps.map(step => <li key={step}>{step}</li>)}</ol>}
              {topic.links && <div className="help-answer-links">{topic.links.map(link => <Link key={link.to} to={link.to}>{link.label}<ArrowRightOutlined /></Link>)}</div>}
            </div>,
          }))} /> : <div className="help-empty"><Empty description="일치하는 도움말이 없어요." /><p>다른 표현으로 검색하거나 주제 선택을 풀어보세요.</p><Button onClick={reset}>전체 도움말 보기</Button></div>}
        </div>
      </div>
    </section>
    <section className="help-shortcuts" aria-label="바로 시작하기">{shortcuts.map(item => <Link key={item.to} to={item.to} className="help-shortcut"><span className="help-shortcut-number" aria-hidden="true">{item.number}</span><h2>{item.title}</h2><p>{item.description}</p><span className="help-shortcut-action">{item.label}<ArrowRightOutlined /></span></Link>)}</section>
    <aside className="help-boundary"><strong>실제 투자 기록과 가상게임은 별개예요.</strong><p>투자 후보는 저장된 자료에 대한 AI 해석입니다. 게임의 가격·뉴스·픽은 가상 자료이며, 모든 게임 거래는 게임머니로 진행됩니다.</p><Link to="/privacy">개인정보·데이터 처리 안내 <ArrowRightOutlined /></Link></aside>
  </div>
}
