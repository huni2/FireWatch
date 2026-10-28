// 보유 자산 구성(ETF/개별주식/기타)을 막대 대신 도넛으로 보여준다 — 색은 기존 분야 연결(--fw-connection)·시장 근거(--fw-market) 역할을 그대로 재사용.
import { Cell, Pie, PieChart, ResponsiveContainer } from 'recharts'

const ALLOCATION_COLOR: Record<string, string> = {
  ETF: 'var(--fw-connection)',
  STOCK: 'var(--fw-market)',
}
const FALLBACK_COLOR = 'var(--ant-color-text-secondary)'

export function AllocationDonut({ allocation, holdingsCount }: { allocation: Record<string, number>; holdingsCount: number }) {
  const data = Object.entries(allocation).filter(([, value]) => value > 0).map(([key, value]) => ({ key, value }))
  if (!data.length) return null
  return <div className="allocation-donut" aria-hidden="true">
    <ResponsiveContainer width={160} height={160}>
      <PieChart>
        <Pie data={data} dataKey="value" nameKey="key" innerRadius={52} outerRadius={78} paddingAngle={data.length > 1 ? 2 : 0} stroke="none" isAnimationActive={false}>
          {data.map(row => <Cell key={row.key} fill={ALLOCATION_COLOR[row.key] ?? FALLBACK_COLOR} />)}
        </Pie>
      </PieChart>
    </ResponsiveContainer>
    <div className="allocation-donut-hole"><strong>{holdingsCount}</strong><span>개 자산</span></div>
  </div>
}
