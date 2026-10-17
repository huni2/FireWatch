import { useState } from 'react'
import { Alert, Button, Tag } from 'antd'
import { Link } from 'react-router-dom'
import type { Portfolio } from '../../../../shared/investing'
import { checkpointDate, portfolioCheckup, type CheckupFinding } from '../../../../shared/portfolio-checkup'

const actionLabels = { largest: '비중 계산 보기', index: 'ETF 지수명 비교', sector: '분야별 비중 보기', currency: '거래 통화 보기' }
const percent = (value: number) => value.toLocaleString('ko-KR', { maximumFractionDigits: 1 })
export function PortfolioCheckup({ portfolio, busy, refreshing, onRefresh, onInspect, onEdit, onReview }: { portfolio: Portfolio; busy: boolean; refreshing: boolean; onRefresh: () => void; onInspect: (kind: CheckupFinding['kind']) => void; onEdit: (symbol: string) => void; onReview: () => void }) {
  const [findingsExpanded, setFindingsExpanded] = useState(false)
  const [changesExpanded, setChangesExpanded] = useState(false)
  const check = portfolioCheckup(portfolio)
  const total = check.complete ? portfolio.totalValueKrw : check.includedValue
  return <div className="checkup-content">
    <div className="checkup-heading"><div><h3>내 투자 점검</h3><p>등록한 자산에서 확인할 점을 먼저 살펴보세요.</p></div><Button aria-label="자료 다시 확인" aria-busy={refreshing} loading={refreshing} disabled={busy || refreshing} onClick={onRefresh}>자료 다시 확인</Button></div>
    <div className="checkup-data" aria-label="평가 자료 확인 상태">
      <div><span>{check.complete ? '등록한 자산 평가액' : '확인된 자산과 현금 평가액 · 일부'}</span><strong>{check.pricedCount || portfolio.cash > 0 ? `${total?.toLocaleString('ko-KR')}원` : '평가 자료 확인 중'}</strong><small>보유 종목 {portfolio.holdings.length}개 · 가격·환율 확인 {check.pricedCount}개</small><small>{check.asOf}</small></div>
      <p>증권사 자동 연동 없이 직접 기록한 보유 내역이에요. 매수·매도 후에는 현재 수량을 수정해주세요.</p>
    </div>
    {check.missing.length > 0 && <Alert type="info" showIcon message={`${check.missing.length}개 종목의 평가 자료가 아직 없어요.`}
      description={<><p>{check.missing.slice(0, 3).map(row => `${row.holding.name} · ${row.currentPrice == null ? '시세 확인 필요' : '환율·평가액 확인 필요'}`).join(' / ')}{check.missing.length > 3 ? ` 외 ${check.missing.length - 3}개` : ''}</p><p>전체 평가액을 확정하지 않았어요. 비중은 {check.basis}이에요. 다시 확인해도 시세가 준비되지 않으면 금액이 바로 표시되지 않을 수 있어요.</p></>} />}
    {(check.stale.length > 0 || check.staleFx) && <Alert type="warning" showIcon message="일부 시세·환율의 날짜를 확인해주세요."
      description={`${check.stale.length ? `${check.stale.slice(0, 3).map(row => row.holding.name).join(' · ')}의 시세 기준 날짜가 오래됐거나 확인이 필요해요. ` : ''}${check.staleFx ? '달러 환산에 사용한 환율 날짜도 확인이 필요해요. ' : ''}휴장일 여부와 아래 기준 날짜를 함께 확인해주세요.`} />}
    {check.findings.length > 0 ? <div className="checkup-findings" aria-label="내 보유 자산에서 발견한 점">{(findingsExpanded ? check.findings : check.findings.slice(0, 2)).map(finding => <article key={finding.kind}>
      <span>{finding.kind === 'largest' ? '가장 큰 보유 비중' : finding.kind === 'index' ? '같은 지수명' : finding.kind === 'sector' ? '등록된 분야' : '거래 통화'}</span><h4>{finding.title}</h4><p>{finding.detail}</p>
      <div><Button type="link" onClick={() => onInspect(finding.kind)}>{actionLabels[finding.kind]}</Button>{finding.symbol && <Link to={`/stocks?symbol=${encodeURIComponent(finding.symbol)}`}>종목 자료 보기 →</Link>}</div>
    </article>)}</div> : <div className="checkup-no-prices"><strong>보유 기록은 저장됐어요.</strong><p>{portfolio.holdings.length ? '평가 자료가 준비되면 가장 큰 보유 비중을 보여드릴게요. 지금도 수량과 관련 소식을 확인할 수 있어요.' : '현재는 현금 기록만 있어요. 보유 종목을 등록하면 비중과 관련 소식을 함께 점검할 수 있어요.'}</p></div>}
    {check.findings.length > 2 && <Button aria-expanded={findingsExpanded} onClick={() => setFindingsExpanded(!findingsExpanded)}>{findingsExpanded ? '추가 점검 접기' : `다른 확인할 점 ${check.findings.length - 2}개 보기`}</Button>}
    {portfolio.reviewCheckpoint !== undefined && <section className="checkup-comparison" aria-label="지난 점검 이후 변화">
      <div className="checkup-heading"><h4>지난 점검 이후</h4>{check.checkpoint && <small>기준 · {checkpointDate(check.checkpoint.reviewedAt)}</small>}</div>
      {check.checkpoint ? <>
        <p><small>이전 점검 자료 · {check.baselineAsOf}</small></p>
        {check.recordChanges.length > 0 ? <><strong>보유 기록이 달라졌어요.</strong><ul>{(changesExpanded ? check.recordChanges : check.recordChanges.slice(0, 3)).map(change => <li key={change}>{change}</li>)}</ul>{check.recordChanges.length > 3 && !changesExpanded && <p>외 {check.recordChanges.length - 3}개 기록 변경</p>}</> : <p>종목·수량·평균 구매 가격과 현금 기록은 그대로예요.</p>}
        {check.canCompareWeights ? check.weightChanges.length ? <><strong>보유 비중 변화</strong><ul>{(changesExpanded ? check.weightChanges : check.weightChanges.slice(0, 3)).map(change => <li key={change.symbol}>{change.name} · {percent(change.before)}% → {percent(change.after)}% <b>({change.difference > 0 ? '+' : ''}{percent(change.difference)}%p)</b></li>)}</ul><small>%p는 비중의 차이예요. 수익률이 아니며, 기록 수정·시세·환율 변화가 함께 반영돼요.</small></> : <p>확인된 자료에서 0.1%p 이상 달라진 종목 비중은 없어요.</p> : <p>이전 또는 현재 점검의 평가 자료가 부족해 비중 변화는 계산하지 않았어요.</p>}
        {(check.recordChanges.length > 3 || check.weightChanges.length > 3) && <Button aria-expanded={changesExpanded} onClick={() => setChangesExpanded(!changesExpanded)}>{changesExpanded ? '변화 요약만 보기' : '지난 점검 변화 전체 보기'}</Button>}
        <p>현재 연결된 소식 중 지난 점검 뒤 발행된 새 자료 {check.newNewsCount}개</p>
      </> : <p>첫 점검을 마치면 다음 방문에서 보유 기록·비중·새 자료를 비교할 수 있어요.</p>}
      <div className="checkup-review-action"><Button type="primary" aria-label={check.checkpoint ? '이번 점검 마치기' : '첫 점검 마치기'} aria-busy={busy} loading={busy} disabled={busy || refreshing} onClick={onReview}>{check.checkpoint ? '이번 점검 마치기' : '첫 점검 마치기'}</Button><small>현재 기록과 확인된 시세를 다음 비교 기준으로 저장해요. 보유 내역은 변경하지 않아요.</small></div>
    </section>}
    <section className="checkup-news" aria-label="보유 종목 관련 소식"><div className="checkup-heading"><h4>보유 종목 관련 소식</h4><Link to="/news">저장 뉴스 더 보기 →</Link></div>
      {check.news.length ? check.news.slice(0, 2).map(article => <article key={article.link}><div>{article.isNew && <Tag color="orange">지난 점검 이후</Tag>}<small>{article.pubDate && Number.isFinite(Date.parse(article.pubDate)) ? new Date(article.pubDate).toLocaleDateString('ko-KR', { timeZone: 'Asia/Seoul' }) : '발행일 확인 필요'}</small></div><a href={article.link} target="_blank" rel="noopener noreferrer">{article.title} ↗</a></article>) : <p>아직 연결된 소식이 없어요. 보유 종목 이름으로 저장 뉴스를 찾아볼 수 있어요.</p>}
      <small>보유 종목 이름·별칭으로 연결한 자료예요. 관련성과 발행일을 확인해주세요.</small>
    </section>
    <div className="checkup-record-actions"><span>매수·매도한 내역이 있나요?</span>{portfolio.holdings.slice(0, 3).map(row => <Button key={row.holding.symbol} disabled={busy} onClick={() => onEdit(row.holding.symbol)}>{row.holding.name} 수량 수정</Button>)}</div>
  </div>
}
