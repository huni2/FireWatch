import { Button, Modal, Space, Spin } from 'antd'
import type { GameTurn } from '../../lib/api'
import { replayChoices, replayIndicators, replayPicks, replayResults } from '../../../../shared/game-replay'
import scout from '../../../../shared/assets/firewatch-scout.png'

export interface ReplayState { before: GameTurn; after: GameTurn | null }
export function GameReplay({ value, close }: { value: ReplayState | null; close: () => void }) {
  const change = value?.after?.portfolioValue != null && value.before.portfolioValue != null ? value.after.portfolioValue - value.before.portfolioValue : null
  const changePercent = change != null && value?.before.portfolioValue != null && value.before.portfolioValue > 0 ? change / value.before.portfolioValue * 100 : null
  const drivers = value?.after ? replayResults(value.before, value.after).filter(r => r.carried !== 0 && r.driver) : []
  const money = (v: number | null | undefined) => v == null ? '미확정' : v.toLocaleString('ko-KR', { maximumFractionDigits: 2 })
  const pct = (v: number | null) => v == null ? '미확정' : `${v >= 0 ? '+' : ''}${v.toFixed(2)}%`
  return <Modal title={value?.after ? '이번 턴의 주마등' : '내 선택을 돌아보는 중'} open={!!value} onCancel={close} width={760} footer={<Button onClick={close}>{value?.after ? '다음 선택으로' : '연출 건너뛰기'}</Button>}>
    {value && <div className="game-replay"><div className="replay-guide"><img src={scout} alt="FireWatch 불꽃 정찰대" /><div><span className="eyebrow">TURN {value.before.turnIndex + 1} → {value.after ? value.after.turnIndex + 1 : '?'}</span><h2>{value.after ? '내 선택에, 시장이 답했습니다.' : '내 거래를 챙겨 다음 턴으로.'}</h2><p>{value.after ? '게임의 실제 가격 규칙으로 복기합니다.' : '서버 요청은 이미 진행 중입니다. 건너뛰어도 턴 진행은 계속됩니다.'}</p></div></div>
      {value.after && <section className="replay-outcome"><span>이번 턴 총자산 변화</span><h2 className={(change ?? 0) < 0 ? 'negative' : 'positive'}>{change == null ? '평가 미확정' : `${change >= 0 ? '+' : ''}${money(change)} 게임머니`}</h2><strong>{pct(changePercent)}</strong><p>{drivers.length ? drivers[0].driver?.newsTitle : change === 0 ? '현금 또는 가격 변화가 없는 포지션으로 총자산 변화가 없습니다.' : '자산별 변동과 보유 수량이 반영됐습니다. 아래 상세에서 확인하세요.'}</p></section>}
      <section><h3>내가 남긴 선택</h3>{replayChoices(value.before).length ? replayChoices(value.before).map((t, i) => <p key={i}>{t.name} · {t.action === 'BUY' ? '매수' : '매도'} {t.quantity}개 · 총 {money(t.total)} 게임머니</p>) : <p>이번 턴에는 새 거래 없이 보유 포지션을 유지했습니다.</p>}</section>
      {!value.after ? <div className="replay-wait"><Spin /><p>지난 픽: {value.before.briefing.recommendedStocks.join(', ') || '없음'}<br />새 사건과 가격은 서버가 확정한 뒤 보여드립니다.</p></div> : <>
        <section><h3>새 턴의 가상 속보</h3>{value.after.briefing.news.map((n, i) => <p key={i}>{n.title}</p>)}<div className="market-readings">{replayIndicators(value.before, value.after).map(item => <div key={item.name}><span>{item.name}</span><strong>{money(item.current)}</strong><small>{pct(item.percent)}</small></div>)}</div></section>
        <section><h3>내 자산에 일어난 일</h3>{replayResults(value.before, value.after).length ? replayResults(value.before, value.after).map(item => <article className="replay-asset" key={`${item.instrumentType}:${item.symbol}`}><Space wrap><strong>{item.name}</strong><span className={(item.percent ?? 0) < 0 ? 'negative' : 'positive'}>{pct(item.percent)}</span></Space><p>{money(item.previous)} → {money(item.current)} 게임머니</p><p>{item.carried ? `넘긴 포지션 ${item.carried}개 · 이번 턴 손익 ${money(item.profit)} 게임머니` : '매도 후 가격 관찰입니다. 현재 보유분의 턴 손익은 0입니다.'}</p>{item.driver && <><p>{item.driver.newsTitle}</p><small>{item.driver.halted ? '거래정지: 직전 가격 유지' : `가격 규칙: 시장 ${pct(item.driver.marketPercent)} + 업종 ${pct(item.driver.sectorPercent)} + 자산별 변동 ${pct(item.driver.assetPercent)}`}</small></>}</article>) : <p>현금으로 시장을 관찰했습니다.</p>}</section>
        <section><h3>지난 턴 픽도 복기</h3>{replayPicks(value.before, value.after).map(item => <p key={item.name}>{item.name} · {pct(item.percent)}</p>)}<p>픽 이후 가격 변화이며, 내 매매 수익률과는 다릅니다.</p></section>
        <section><h3>총자산 {money(value.after.portfolioValue)} 게임머니</h3><p>직전 총자산 {money(value.before.portfolioValue)} · 새 턴의 픽과 위험을 확인하고 다음 선택을 해보세요.</p></section>
      </>}
    </div>}
  </Modal>
}
