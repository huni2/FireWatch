// 기기의 공유 시트를 쓸 수 있으면 그걸 쓰고, 없으면 클립보드 복사로 대신한다.
// 클립보드 쓰기 권한 프롬프트가 응답 없이 멈추는 환경이 있어, 무한 대기 대신 실패로 처리해 버튼이 영영 멈춰있지 않게 한다.
function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([promise, new Promise<T>((_, reject) => setTimeout(() => reject(new Error('timeout')), ms))])
}
export async function shareOrCopy(text: string): Promise<'shared' | 'cancelled' | 'copied' | 'failed'> {
  if (navigator.share) {
    try { await navigator.share({ text }); return 'shared' }
    catch (e) { if (e instanceof Error && e.name === 'AbortError') return 'cancelled' }
  }
  try { await withTimeout(navigator.clipboard.writeText(text), 3000); return 'copied' }
  catch { return 'failed' }
}
