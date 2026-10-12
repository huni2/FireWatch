import { articleText } from './article-text'

export function companyNewsGroups<T extends { title: string }>(news: T[], name: string): { headline: T[]; mentions: T[] } {
  const normalized = articleText(name).replace(/\s+/g, '').toLocaleLowerCase()
  const headline: T[] = [], mentions: T[] = []
  for (const article of news) {
    const title = articleText(article.title).replace(/\s+/g, '').toLocaleLowerCase()
    ;(normalized && title.includes(normalized) ? headline : mentions).push(article)
  }
  return { headline, mentions }
}
