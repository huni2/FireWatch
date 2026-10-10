export interface CollectionAlert {
  id: string
  category: 'news' | 'financial' | 'stock' | 'briefing' | 'backup'
  message: string
  paused: boolean
  updatedAt: string
}
export const collectionNames: Record<CollectionAlert['category'], string> = {
  news: '뉴스', financial: '지수·환율', stock: '종목 시세', briefing: '브리핑', backup: 'DB 백업',
}
