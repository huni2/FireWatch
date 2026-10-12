import { companyNewsGroups } from '../../../../../shared/company-news'
import { Alert, Button } from 'antd'
import { Link } from 'react-router-dom'
import { useApi } from '../../../lib/useApi'
import { fetchNewsFeed } from '../../../lib/investingApi'
import { RelatedNewsCard } from '../../news/components/RelatedNewsCard'

export function CompanyNews({ name }: { name: string }) {
  const result = useApi(() => fetchNewsFeed({ q: name, page: 0, size: 5 }), [name])
  const groups = companyNewsGroups(result.data?.news ?? [], name)
  return <>
    {result.error && <Alert type="error" message="관련 뉴스를 불러오지 못했습니다" action={<Button onClick={result.reload}>관련 뉴스 다시 확인</Button>} />}
    {!result.error && <RelatedNewsCard boxed={false} title={`${name} 이름이 제목에 있는 기사`} news={groups.headline} loading={result.loading} emptyDescription="회사 이름이 제목에 있는 저장 기사는 아직 없어요." />}
    {!result.loading && !result.error && groups.mentions.length > 0 && <details className="disclosure-panel"><summary>본문에서 언급된 기사 · {groups.mentions.length}개</summary><p>회사 이름이 본문에 포함된 검색 결과예요. 회사의 직접 소식인지 원문에서 확인해주세요.</p><RelatedNewsCard boxed={false} title={null} news={groups.mentions} loading={false} /></details>}
    <Link className="company-news-archive" to={`/news?q=${encodeURIComponent(name)}`}>날짜별 {name} 뉴스 찾아보기 →</Link>
  </>
}
