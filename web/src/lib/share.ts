// 기기의 공유 시트를 쓸 수 있으면 그걸 쓰고, 없으면 클립보드 복사로 대신한다.
export async function shareOrCopy(text: string): Promise<'shared' | 'cancelled' | 'copied'> {
  if (navigator.share) {
    try { await navigator.share({ text }); return 'shared' }
    catch (e) { if (e instanceof Error && e.name === 'AbortError') return 'cancelled' }
  }
  await navigator.clipboard.writeText(text)
  return 'copied'
}
