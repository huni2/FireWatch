// 분류 묶음을 선택해 실제 보유 기록과 관련 뉴스로 이어지는 연결 지도를 표시한다.
import { useId, useState } from 'react'
import { Link } from 'react-router-dom'
import { Segmented } from 'antd'
import type { Portfolio } from '../../../../shared/investing'
import { connectionLabels, portfolioConnections, type ConnectionKind } from '../../../../shared/portfolio-connections'
import { portfolioCoverageText } from '../../../../shared/holding-registration'

export function PortfolioConnections({ portfolio }: { portfolio: Portfolio }) {
  const [kind, setKind] = useState<ConnectionKind>('sector')
  const [key, setKey] = useState('')
  const detailId = useId()
  const groups = portfolioConnections(portfolio, kind)
  const selected = groups.find(group => group.key === key) ?? groups[0]
  return <section className="investment-map" aria-label="내 투자 연결 지도">
    <div className="portfolio-section-heading"><div><h3>내 투자 연결 지도</h3><p>서로 다른 자산에서, 같은 연결을 찾아보세요.</p></div><Segmented aria-label="투자 연결 기준" value={kind} options={Object.entries(connectionLabels).map(([value, label]) => ({ value, label }))} onChange={value => { setKind(value as ConnectionKind); setKey('') }} /></div>
    <div className="investment-map-layout"><div className="investment-map-groups" role="group" aria-label={`${connectionLabels[kind]}별 보유 묶음`}>
      {groups.map((group, index) => <button type="button" key={group.key} aria-pressed={selected?.key === group.key} aria-controls={detailId} onClick={() => setKey(group.key)}><span className={`connection-dot connection-tone-${index % 4}`} aria-hidden="true" /><span><strong>{group.label}</strong><small>등록 자산 {group.symbols.length}개</small></span><b>{group.weight == null ? '→' : `${group.weight.toLocaleString('ko-KR', { maximumFractionDigits: 1 })}%`}</b></button>)}
      {!groups.length && <p>등록한 ETF가 없어요. ETF의 지수명을 입력하면 함께 볼 수 있어요.</p>}
    </div><div className="investment-map-detail" id={detailId} aria-live="polite" aria-atomic="true">{selected && <>
      <span className="page-eyebrow">{connectionLabels[kind]}로 연결된 내 기록</span><h4>{selected.label}</h4>
      {kind === 'index' && selected.key !== '미입력' && selected.names.length > 1 && <p>다른 ETF를 등록했지만, 같은 지수명을 입력했어요.</p>}
      <div className="connection-network" aria-label={`${selected.label}에 연결된 등록 자산`}><div className="connection-hub"><span>{connectionLabels[kind]} 연결</span><strong>{selected.label}</strong><small>등록 기록 기준</small></div><div className="connection-nodes">{selected.symbols.map((symbol, index) => <Link key={symbol} to={`/stocks?symbol=${encodeURIComponent(symbol)}`}><strong>{selected.names[index]}</strong><span>기업·상품 확인 →</span></Link>)}</div></div>
      {selected.key !== '미입력' && <Link className="connection-news" to={`/news?q=${encodeURIComponent(kind === 'currency' ? selected.names[0] : selected.label)}`}>연결된 소식 찾아보기 →</Link>}
    </>}</div></div>
    <details className="connection-basis"><summary>어떤 자료로 연결했나요?</summary><p>{portfolioCoverageText(portfolio)}</p><p>직접 등록한 분야·거래 통화·지수명을 묶었어요. 비중은 서버에서 계산한 값이 있을 때만 표시해요. ETF의 실제 구성 종목·비중은 분석하지 않아요. 거래 통화와 실제 환율 노출은 달라요.</p></details>
  </section>
}
