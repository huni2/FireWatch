import { FirewatchIcon } from '../../components/FirewatchIcon'
import { Button, Empty, Modal, Space } from 'antd'
import { Area, AreaChart, CartesianGrid, ReferenceDot, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import type { GameTurn, GameInstrumentType } from '../../lib/api'
import { historyChange, positionStats } from '../../../../shared/game-turn'

export interface GameDetailTarget { instrumentType: GameInstrumentType; symbol: string | null; name: string }
export function GameAssetDetail({ target, turn, close, order }: { target: GameDetailTarget | null; turn: GameTurn; close: () => void; order: (target: GameDetailTarget, side: 'BUY' | 'SELL') => void }) {
  const history = turn.assetHistories?.find(h => h.instrumentType === target?.instrumentType && h.symbol === target?.symbol)
  const holding = turn.holdings.find(h => h.instrumentType === target?.instrumentType && h.symbol === target?.symbol)
  const trades = turn.transactions.filter(t => t.instrumentType === target?.instrumentType && t.symbol === target?.symbol)
  const stats = target ? positionStats(turn.transactions, target.instrumentType, target.symbol, holding?.currentPrice ?? null) : null
  const change = historyChange(history)
  const money = (v: number | null | undefined) => v == null ? '미확정' : v.toLocaleString('ko-KR', { maximumFractionDigits: 2 })
  return <Modal title={target?.name} open={!!target} onCancel={close} width={720} footer={target && turn.status === 'ACTIVE' ? <Space><Button onClick={() => order(target, 'SELL')}>매도 주문에 담기</Button><Button type="primary" onClick={() => order(target, 'BUY')}>매수 주문에 담기</Button></Space> : null}>
    <h2>{money(history?.points.at(-1)?.price ?? holding?.currentPrice ?? (target?.symbol ? turn.stockPrices[target.symbol] : null))} 게임머니</h2>
    <p>직전 턴 가격 {change ? `${change.percent >= 0 ? '+' : ''}${change.percent.toFixed(2)}%` : '첫 턴 또는 이전 기록 없음'}</p>
    {holding && <p>보유 {holding.quantity}개 · 평균 진입 단가 {money(stats?.averagePrice)} · 평가손익 {money(stats?.profit)} 게임머니{stats?.returnPercent != null ? ` (${stats.returnPercent.toFixed(2)}%)` : ''}</p>}
    <p>날짜는 무작위입니다. 그래프는 턴 순서이며 미래 턴은 표시하지 않습니다.</p>
    {history?.points.length ? <ResponsiveContainer width="100%" height={260}><AreaChart data={history.points.map(p => ({ turn: p.turnIndex + 1, price: p.price }))} margin={{ left: 12, right: 16 }}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="turn" allowDecimals={false} label={{ value: '턴', position: 'insideBottomRight', offset: -4 }} /><YAxis domain={['auto', 'auto']} width={75} /><Tooltip labelFormatter={value => `턴 ${value}`} formatter={value => [money(Number(value)), '가상 가격']} /><Area dataKey="price" stroke="var(--ant-color-primary)" fill="var(--ant-color-primary)" fillOpacity={0.12} dot={history.points.length === 1} isAnimationActive={false} />{trades.map(t => <ReferenceDot key={t.id} x={t.turnIndex + 1} y={t.price} r={5} fill={t.action === 'BUY' ? '#f97316' : '#2563eb'} stroke="#fff" />)}</AreaChart></ResponsiveContainer> : <Empty image={<FirewatchIcon name="stocks" size={40} />} description="이 게임의 턴별 가격 기록이 아직 제공되지 않았습니다." />}
    <p>주황 표시: 매수 · 파랑 표시: 매도. 평가손익은 현재 보유분의 미실현 손익이며 확정 손익과 다릅니다.</p>
    <h3>이 자산의 체결 기록</h3>{trades.length ? trades.map(t => <p key={t.id}>턴 {t.turnIndex + 1} · {t.action === 'BUY' ? '매수' : '매도'} {t.quantity}개 · 단가 {money(t.price)} · 총액 {money(t.total)}</p>) : <p>아직 거래하지 않은 자산입니다.</p>}
  </Modal>
}
