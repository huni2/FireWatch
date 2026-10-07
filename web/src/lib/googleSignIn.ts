interface GoogleIdentity {
  initialize(config: { client_id: string; callback: (response: { credential: string }) => void; auto_select: boolean; ux_mode: 'popup' }): void
  renderButton(element: HTMLElement, config: { type: 'standard'; theme: 'outline'; size: 'large'; text: 'continue_with'; width: number; locale: 'ko' }): void
  disableAutoSelect(): void
}
declare global { interface Window { google?: { accounts: { id: GoogleIdentity } } } }
let pending: Promise<GoogleIdentity> | null = null
export function loadGoogleSignIn(): Promise<GoogleIdentity> {
  if (window.google?.accounts.id) return Promise.resolve(window.google.accounts.id)
  if (pending) return pending
  pending = new Promise((resolve, reject) => {
    const script = document.createElement('script')
    script.src = 'https://accounts.google.com/gsi/client'; script.async = true
    const timer = window.setTimeout(() => { script.remove(); pending = null; reject(new Error('Google 로그인 화면을 불러오지 못했습니다. 다시 시도해주세요.')) }, 15000)
    script.onload = () => { clearTimeout(timer); const id = window.google?.accounts.id; if (id) resolve(id); else { pending = null; reject(new Error('Google 로그인 초기화에 실패했습니다.')) } }
    script.onerror = () => { clearTimeout(timer); script.remove(); pending = null; reject(new Error('Google 로그인 연결을 확인해주세요.')) }
    document.head.appendChild(script)
  })
  return pending
}
