// 오프라인일 때 보여줄 마지막 브리핑 캐시. Design Ref: mobile-app.design.md §3.3.
import AsyncStorage from '@react-native-async-storage/async-storage'

import type { Briefing } from '@/lib/api'

const CACHE_KEY = 'firewatch:lastBriefing'

export interface CachedBriefing extends Briefing {
  cachedAt: string
}

export async function saveCachedBriefing(briefing: Briefing): Promise<void> {
  const cached: CachedBriefing = { ...briefing, cachedAt: new Date().toISOString() }
  await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(cached))
}

export async function loadCachedBriefing(): Promise<CachedBriefing | null> {
  const raw = await AsyncStorage.getItem(CACHE_KEY)
  if (!raw) return null
  return JSON.parse(raw) as CachedBriefing
}
