import type { FeedArticle, Portfolio } from './investing'

export interface RecommendationDetail { stockName: string; reason: string; risk: string; sourceNewsLinks: string[] }
export interface DiscoveryBriefing { briefingDate: string; recommendedStocks: string[]; recommendationDetails?: RecommendationDetail[]; news: FeedArticle[] }
export interface Sector { id: string; name: string; description: string; keywords: string[]; checks: string[] }
export interface Company { symbol: string; name: string; aliases: string[]; sectorId: string; region: 'KR' | 'US'; description: string; source: string }
export const catalogVerifiedAt = '2026-10-07'
// Editorial navigation groups, not exchange classifications or a recommendation ranking.
export const sectors: Sector[] = [
  { id: 'chips', name: '반도체·AI 인프라', description: 'AI와 전자기기를 움직이는 칩과 컴퓨팅', keywords: ['반도체', 'GPU', '메모리'], checks: ['고객 수요와 설비투자 변화', '수출 규제와 고객 집중도'] },
  { id: 'software', name: '플랫폼·소프트웨어', description: '검색, 클라우드와 업무용 소프트웨어', keywords: ['클라우드', '플랫폼', '소프트웨어'], checks: ['서비스 매출과 이용자 변화', 'AI 투자 비용과 경쟁'] },
  { id: 'mobility', name: '자동차·모빌리티', description: '완성차와 전기차, 이동 서비스', keywords: ['자동차', '전기차', '모빌리티'], checks: ['판매량과 제품별 수익성', '관세·환율·가격 경쟁'] },
  { id: 'battery', name: '배터리·에너지 저장', description: '전기차 배터리와 전력을 저장하는 ESS', keywords: ['배터리', '이차전지', 'ESS'], checks: ['수주와 공장 가동률', '원재료 비용과 고객 수요'] },
  { id: 'health', name: '바이오·헬스케어', description: '바이오의약품 개발과 위탁 생산', keywords: ['바이오', '의약품', 'CDMO'], checks: ['제품 허가와 계약 공시', '특허·개발 일정·생산 품질'] },
  { id: 'finance', name: '금융', description: '은행과 투자·보험 등 금융 서비스', keywords: ['은행', '금융', '대출'], checks: ['이자이익과 대손 비용', '자본 건전성과 주주환원 공시'] },
  { id: 'defense', name: '방산·항공우주', description: '방위 장비, 항공 기술과 우주 사업', keywords: ['방산', '항공', '우주'], checks: ['수주잔고와 납품 일정', '정부 예산과 수출 승인'] },
]
export const companies: Company[] = [
  { symbol: '005930.KS', name: '삼성전자', aliases: ['Samsung Electronics'], sectorId: 'chips', region: 'KR', description: '메모리·시스템 반도체와 전자기기를 만드는 기업', source: 'https://semiconductor.samsung.com/about-us/business-area/' },
  { symbol: 'NVDA', name: '엔비디아', aliases: ['NVIDIA', '엔비디아 코퍼레이션'], sectorId: 'chips', region: 'US', description: 'GPU와 AI 가속 컴퓨팅 플랫폼을 만드는 기업', source: 'https://www.nvidia.com/en-us/about-nvidia/' },
  { symbol: '035420.KS', name: 'NAVER', aliases: ['네이버', 'NAVER Corporation'], sectorId: 'software', region: 'KR', description: '검색·커머스·콘텐츠·클라우드 서비스를 제공하는 기업', source: 'https://www.navercorp.com/company/about' },
  { symbol: 'MSFT', name: '마이크로소프트', aliases: ['Microsoft', 'Microsoft Corporation'], sectorId: 'software', region: 'US', description: '업무 소프트웨어와 클라우드 서비스를 제공하는 기업', source: 'https://www.microsoft.com/en-us/investor/default' },
  { symbol: '005380.KS', name: '현대차', aliases: ['현대자동차', 'Hyundai Motor'], sectorId: 'mobility', region: 'KR', description: '완성차와 전기차 등 이동 수단을 만드는 기업', source: 'https://www.hyundai.com/worldwide/en' },
  { symbol: 'TSLA', name: '테슬라', aliases: ['Tesla', 'Tesla Inc.'], sectorId: 'mobility', region: 'US', description: '전기차와 에너지 저장 시스템을 만드는 기업', source: 'https://www.tesla.com/about' },
  { symbol: '373220.KS', name: 'LG에너지솔루션', aliases: ['LG Energy Solution'], sectorId: 'battery', region: 'KR', description: '전기차·ESS 등에 쓰이는 배터리를 만드는 기업', source: 'https://www.lgensol.com/kr/company/info-outline' },
  { symbol: '006400.KS', name: '삼성SDI', aliases: ['Samsung SDI'], sectorId: 'battery', region: 'KR', description: '전기차·ESS·소형 기기용 배터리를 만드는 기업', source: 'https://www.samsungsdi.com/business/index.html' },
  { symbol: '207940.KS', name: '삼성바이오로직스', aliases: ['Samsung Biologics'], sectorId: 'health', region: 'KR', description: '바이오의약품 위탁 개발·생산 서비스를 제공하는 기업', source: 'https://samsungbiologics.com/about/our-dna' },
  { symbol: '068270.KS', name: '셀트리온', aliases: ['Celltrion'], sectorId: 'health', region: 'KR', description: '바이오시밀러 등 바이오의약품을 개발·생산하는 기업', source: 'https://celltrion.com/en-us/company/celltrion/about' },
  { symbol: '105560.KS', name: 'KB금융', aliases: ['KB Financial Group', 'KB금융지주'], sectorId: 'finance', region: 'KR', description: '은행·증권·보험 등 금융 계열사를 둔 금융 그룹', source: 'https://www.kbfg.com/eng/ir/investor/list.jsp' },
  { symbol: 'JPM', name: 'JP모건체이스', aliases: ['JPMorgan Chase', 'JPMorgan', '제이피모건'], sectorId: 'finance', region: 'US', description: '은행과 투자금융 서비스를 제공하는 금융 그룹', source: 'https://www.jpmorganchase.com/about' },
  { symbol: '012450.KS', name: '한화에어로스페이스', aliases: ['Hanwha Aerospace'], sectorId: 'defense', region: 'KR', description: '방위 장비와 항공 엔진·우주 기술을 다루는 기업', source: 'https://www.hanwhaaerospace.com/eng/media/newsroom/view.do?seq=260' },
  { symbol: 'LMT', name: '록히드마틴', aliases: ['Lockheed Martin', '록히드 마틴'], sectorId: 'defense', region: 'US', description: '항공·방위·우주 시스템을 만드는 기업', source: 'https://www.lockheedmartin.com/en-us/who-we-are.html' },
]
const normalize = (value: string) => value.trim().toLocaleLowerCase().replace(/\s+/g, '')
export const findCompany = (value: string) => companies.find(company => [company.name, company.symbol, ...company.aliases].some(name => normalize(name) === normalize(value)))
export const companySector = (company: Company) => sectors.find(sector => sector.id === company.sectorId)!
export const qualifiedRecommendations = (briefing?: DiscoveryBriefing | null) => (briefing?.recommendationDetails ?? []).filter(detail => briefing?.recommendedStocks.includes(detail.stockName) && detail.reason.trim() && detail.risk.trim() && detail.sourceNewsLinks.some(link => /^https?:\/\//i.test(link) && briefing.news.some(news => news.link === link)))
export const isRecommended = (company: Company, briefing?: DiscoveryBriefing | null) => qualifiedRecommendations(briefing).some(detail => findCompany(detail.stockName)?.symbol === company.symbol)
export function searchCompanies(query: string, sectorId = 'all', region = 'all', onlyRecommended = false, briefing?: DiscoveryBriefing | null) {
  const key = normalize(query)
  return companies.filter(company => (sectorId === 'all' || sectorId === company.sectorId) && (region === 'all' || region === company.region) && (!onlyRecommended || isRecommended(company, briefing)) &&
    (!key || [company.name, company.symbol, ...company.aliases, company.description, companySector(company).name].some(value => normalize(value).includes(key))))
}
export const recommendationFor = (company: Company, briefing?: DiscoveryBriefing | null) => briefing?.recommendationDetails?.find(detail => findCompany(detail.stockName)?.symbol === company.symbol)
export function companyNews(company: Company, briefing?: DiscoveryBriefing | null) {
  const evidence = recommendationFor(company, briefing)?.sourceNewsLinks ?? []
  return (briefing?.news ?? []).filter(news => /^https?:\/\//i.test(news.link) && (evidence.includes(news.link) || [company.name, ...company.aliases].some(name => normalize(`${news.title} ${news.description ?? ''}`).includes(normalize(name))))).slice(0, 4)
}
export function portfolioContext(company: Company, portfolio?: Portfolio | null): string {
  if (!portfolio) return '포트폴리오를 등록하면 내 보유 기업과 비교할 수 있어요.'
  if (portfolio.holdings.some(row => row.holding.symbol === company.symbol)) return '이미 보유한 기업이에요. 추가 검토 전에 보유 수량과 비중을 확인하세요.'
  const peers = portfolio.holdings.filter(row => row.holding.assetClass === 'STOCK' && (findCompany(row.holding.symbol)?.sectorId === company.sectorId || row.holding.sector === companySector(company).name))
  return peers.length ? `같은 분야 기업 ${peers.length}개를 보유 중이에요. 분야가 겹치는지 확인하세요.` : '현재 등록한 개별주식과 다른 기업이에요. ETF 안에 포함된 기업은 별도로 확인하세요.'
}
