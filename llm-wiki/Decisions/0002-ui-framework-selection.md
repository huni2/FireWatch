---
source: "docs/specs/UI 디자인 프레임워크 추천 제안서.pdf (조합 A/B 비교) — [[log]] 2026-08-19"
verified: 2026-08-19
---

# 0002 — Web은 Ant Design v5, Mobile은 NativeWind (제안서의 "조합 A")

## 상태
채택

## 맥락

UI 프레임워크 제안서는 웹에 3가지(Shadcn+Tailwind / Ant Design / Mantine), 모바일에 3가지(NativeWind / Tamagui / Gluestack)를 제시하고, 최종적으로 "조합 A(생산성 중심: AntD + NativeWind)"와 "조합 B(트렌디·커스텀: Shadcn+Tailwind + NativeWind)" 두 묶음을 추천했다. 그런데 같은 프로젝트의 시스템 명세서 쪽은 이미 FR-04(실시간 지표 시각화)에서 "Ant Design 컴포넌트 기반" 대시보드를 요구사항으로 못박고 있고, 2.1절 기술 스택 표에도 UI Library로 Ant Design(antd v5)을 명시했다.

## 결정

**Web은 Ant Design v5(`darkAlgorithm`), Mobile은 NativeWind** — 제안서의 조합 A를 그대로 채택한다.

## 근거

- 명세서(요구사항 문서)가 제안서(참고 문서)보다 우선한다. FR-04가 이미 AntD를 요구사항으로 명시했으므로, 제안서의 "조합 B(Shadcn+Tailwind)"는 애초에 명세서와 충돌하는 선택지였다.
- 감사로그 뷰어(FR-07)가 `Statistic`/`Card`/`Table`/`Timeline`/`Tag`를 그대로 요구하는데, 이들은 AntD가 기본 내장한 컴포넌트다. Shadcn UI로 가면 이 컴포넌트들을 직접 조립해야 한다 — 1인 프로젝트에서 불필요한 비용.
- Mobile은 명세서 2.1절이 이미 NativeWind를 지정했고, 제안서의 두 조합 모두 Mobile 쪽은 NativeWind로 일치한다 — 이 축은 애초에 논쟁이 없었다.

## 결과·트레이드오프

**얻는 것** — CSS 스타일링에 시간을 쓰지 않고 금융 정보판을 빠르게 완성(제안서가 명시한 AntD의 장점). 명세서·제안서·구현이 전부 일치해 재설계 리스크가 없다.

**감수하는 것** — Shadcn UI 조합이 제공했을 "토스 스타일의 커스텀 자유도"는 포기한다. AntD 기본 톤에서 크게 벗어나는 브랜드 아이덴티티를 원하면 나중에 `ConfigProvider`의 테마 토큰을 깊게 커스터마이징해야 한다.

## 재검토 트리거

- 감사로그 화면 이외의 브리핑 콘텐츠 UI에서 AntD 기본 룩이 "토스 스타일" 요구(제안서 1-①절의 언급)와 크게 어긋난다고 판단될 때 → 부분적으로 Tailwind 커스텀 컴포넌트 혼용 검토.
