// 웹과 앱이 공유하는 FireWatch 전용 불꽃 메뉴 아이콘의 벡터 원본이다.
export const firewatchIconNames = ['record', 'companies', 'news', 'game', 'account', 'settings', 'help', 'more', 'briefing', 'stocks', 'indices', 'short-term', 'audit', 'rankings', 'rules', 'publish', 'replay', 'exit', 'moon', 'sun'] as const
export type FirewatchIconName = typeof firewatchIconNames[number]
export interface FirewatchIconPath { d: string; accent?: boolean; solid?: boolean; transform?: string }

// 길게 뻗은 불씨와 둥근 바닥을 모든 메뉴의 공통 서명으로 사용한다.
const ember = (x: number, y: number): FirewatchIconPath => ({ d: 'M4 0C4.5 3 7 3.5 7 6A3.5 3.5 0 0 1 0 6C0 4 1.5 3 2 2.5C2 4 3 4.5 3.5 4.5C4.5 3.5 4.5 2 4 0Z', transform: `translate(${x} ${y})`, accent: true, solid: true })
export const firewatchIcons: Record<FirewatchIconName, readonly FirewatchIconPath[]> = {
  record: [{ d: 'M7 6H23A3 3 0 0 1 26 9V26H9A3 3 0 0 1 6 23V9A3 3 0 0 1 9 6M6 21H26M11 12H16M11 16H20' }, ember(19, 1)],
  companies: [{ d: 'M4 26V14L12 10V26M12 26V6L21 3V26M21 26V15L28 12V26M3 27H29M8 16V19M16 9V12M16 17V20M25 18V21' }, ember(2, 1)],
  news: [{ d: 'M5 7H24V23A4 4 0 0 0 28 27H9A4 4 0 0 1 5 23ZM24 12H28V23A4 4 0 0 1 24 27M10 13H18M10 18H19M10 22H16' }, ember(19, 1)],
  game: [{ d: 'M11 10H21C25 10 26 14 27 18L28 23C28.5 27 24.5 28 22 24L20 22H12L10 24C7.5 28 3.5 27 4 23L5 18C6 14 7 10 11 10ZM9 16V21M6.5 18.5H11.5M22 17H22.1M25 20H25.1' }, ember(12.5, 0)],
  account: [{ d: 'M23 11A7 7 0 0 1 9 11A7 7 0 0 1 23 11ZM5 28V25C5 20 10 18 16 18S27 20 27 25V28M12 28H20' }, ember(12.5, 4)],
  settings: [{ d: 'M5 8H27M5 16H27M5 24H27M10 5V11M22 13V19M12 21V27' }, { d: 'M8 8H12M20 16H24', accent: true }, ember(17, 20)],
  help: [{ d: 'M27 17V9A5 5 0 0 0 22 4H10A5 5 0 0 0 5 9V21A5 5 0 0 0 10 26H13L18 29V26H22A5 5 0 0 0 27 21M12 11C12 6 20 6 20 11C20 14 16 14 16 17M16 21H16.1' }, ember(24, 15)],
  more: [{ d: 'M5 7H27M5 16H21M5 25H15' }, ember(21, 19)],
  briefing: [{ d: 'M6 5H21L26 10V27H6ZM21 5V11H26M10 14H21M10 19H19M10 23H16' }, ember(0, 1)],
  stocks: [{ d: 'M5 5V27H28M9 22L14 16L19 19L26 10' }, { d: 'M21 10H26V15', accent: true }, ember(9, 2)],
  indices: [{ d: 'M5 27V19H10V27M14 27V13H19V27M23 27V6H28V27M3 28H30' }, ember(4, 3)],
  'short-term': [{ d: 'M17 5A11 11 0 1 1 6 16M5 6V13H12M14 11L10 19H16L14 24L23 15H17L20 10' }, ember(1, 1)],
  audit: [{ d: 'M6 5H21L26 10V27H6ZM21 5V11H26M10 14H15M10 19H14M16 22L19 25L25 19' }, ember(0, 1)],
  rankings: [{ d: 'M9 6H23V13C23 19 20 22 16 22S9 19 9 13ZM9 9H4V13C4 17 7 18 10 18M23 9H28V13C28 17 25 18 22 18M16 22V27M11 28H21' }, ember(12.5, 8)],
  rules: [{ d: 'M16 8C12 4 7 4 3 6V25C7 23 12 23 16 27C20 23 25 23 29 25V6C25 4 20 4 16 8V27M7 12L12 13M7 17L12 18M21 18L25 17' }, ember(20, 7)],
  publish: [{ d: 'M5 19V27H27V19M16 21V7M10 13L16 7L22 13' }, ember(23, 2)],
  replay: [{ d: 'M5 13A11 11 0 1 1 5 21M5 6V13H12M16 10V17L21 20' }, ember(1, 19)],
  exit: [{ d: 'M14 5H6V27H14M13 16H28M23 11L28 16L23 21' }, ember(8, 11)],
  moon: [{ d: 'M24 22A11 11 0 0 1 10 5A11 11 0 1 0 24 22Z' }, ember(22, 3)],
  sun: [{ d: 'M16 2V5M16 27V30M2 16H5M27 16H30M6 6L8 8M24 24L26 26M6 26L8 24M24 8L26 6M23 16A7 7 0 1 1 9 16A7 7 0 1 1 23 16Z' }, ember(12.5, 10)],
}
