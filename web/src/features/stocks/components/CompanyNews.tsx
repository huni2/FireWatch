import { Alert, Button } from 'antd'
import { Link } from 'react-router-dom'
import { useApi } from '../../../lib/useApi'
import { fetchNewsFeed } from '../../../lib/investingApi'
import { RelatedNewsCard } from '../../news/components/RelatedNewsCard'

export function CompanyNews({ name }: { name: string }) {
  const result = useApi(() => fetchNewsFeed({ q: name, page: 0, size: 5 }), [name])
  return <>
    {result.error && <Alert type="error" message="관련 뉴스를 불러오지 못했습니다" action={<Button onClick={result.reload}>관련 뉴스 다시 확인</Button>} />}
    {!result.error && <RelatedNewsCard boxed={false} title={`${name} 관련 뉴스`} news={result.data?.news ?? []} loading={result.loading} emptyDescription="이 회사에 관한 저장된 뉴스가 아직 없습니다." />}
    <Link className="company-news-archive" to={`/news?q=${encodeURIComponent(name)}`}>날짜별 {name} 뉴스 찾아보기 →</Link>
  </>
}
