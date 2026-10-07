# FireWatch Web

React 18·TypeScript·Vite 8·Ant Design 5 기반 웹 클라이언트입니다. 개인 투자 기록, 기업 탐색, 저장 뉴스, 별도 가상투자 게임, 계정·공지·문의 화면을 제공합니다.

[운영 웹](https://firewatch-eqp.pages.dev) · [프로젝트 소개](../README.md) · [개발 포트폴리오 사례](../docs/portfolio/firewatch-case-study.md)

## 개발과 검사

Node.js 22에서 `web/` 디렉터리 기준으로 실행합니다. `.env.example`을 참고해 로컬 `.env`를 구성합니다.

```powershell
npm ci
npm run dev
```

```powershell
npm run lint
npm run build
npm run preview
```

기본 로컬 백엔드 URL은 `.env.example`을 확인합니다. 환경변수의 `VITE_*` 값은 클라이언트 번들에 포함되므로 운영 비밀 키나 DB 자격증명을 넣지 않습니다.

## 구조와 상태

- `src/components`: 앱 셸·안내·공통 UI
- `src/features`: 포트폴리오·후보·종목·뉴스·게임·계정 등 기능별 화면
- `src/lib`: API·기기·로그인 세션·조회 훅·테마
- `../shared`: 투자/기업 도메인·디자인 토큰·공유 문구

서버가 저장 기록과 거래 장부의 기준이며 화면별 조회·편집·로딩·실패는 훅과 로컬 상태로 관리합니다. 기본 라이트 모드·오렌지 포인트와 선택형 다크 모드를 지원합니다. 반응형 레이아웃과 디자인 개선은 진행 중입니다.

## 배포와 확인 범위

Cloudflare Pages 직접 업로드를 사용합니다. GitHub push나 Render 배포만으로 웹 번들이 바뀌지 않습니다. [배포 안내](../DEPLOY.md)에 현재 환경변수와 명령을 정리했습니다.

Google 웹 로그인은 사용자 실제 성공 확인이 있고, 브라우저 회귀에는 fixture 검사가 포함됩니다. CI 성공은 현재 데이터 제공처의 수집 성공이나 Android 설치 동작을 보장하지 않습니다. 최신 기능/UI 점검은 [열린 과제](../llm-wiki/Next-Tasks.md)를 확인합니다.
