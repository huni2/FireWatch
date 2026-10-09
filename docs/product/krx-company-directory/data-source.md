# 한국 기업 검색 목록의 출처와 범위

2026-10-09 KIND의 상장법인 다운로드를 확인했다. 법인 이름·시장·종목코드·업종만 shared/krx-companies.json에 보관한다. 원본 URL·바이트 수·SHA-256·행수·고유 회사 수·반복 행수는 같은 파일의 sources에 기록한다. 대표자·홈페이지·제품 등의 원본 전체는 저장소에 넣지 않는다.

| 시장 | 원본 행 | 고유 법인 | 일치하는 반복 행 |
|---|---|---|---|
| KOSPI | 846 | 831 | 15 |
| KOSDAQ | 1,842 | 1,820 | 22 |
| 합계 | 2,688 | 2,651 | 37 |

공식 출처는 https://kind.krx.co.kr/corpgeneral/corpList.do?method=download&marketType=stockMkt 및 https://kind.krx.co.kr/corpgeneral/corpList.do?method=download&marketType=kosdaqMkt 이다. 이 수치는 법인 목록이며 모든 종류의 주식·우선주·ETF·코넥스·해외 전 시장의 개수가 아니다. SPAC 등 법인도 원문대로 포함한다.

원본의 EUC-KR 표에서 필수 네 열을 검증한다. 이름·시장·코드·업종이 손상되면 생성을 중단한다. 이번 KOSDAQ 원본의 저장하지 않는 제품 필드 한 곳에는 디코딩 대체 문자가 있었으며 최소 저장 필드에는 없었다. 필수 필드가 같은 반복 행만 합치고 같은 코드의 이름·업종이 다르면 충돌로 중단한다. 새 영숫자 여섯 자리 코드도 허용한다.

## 저장과 검색

기존 기업26·ETF5 편집 정보가 우선한다. 공식 목록에서 없는 코드만 250행씩 묶어 추가하며 재시작 시 기존 코드를 한 번 조회해 이미 저장된 목록은 다시 쓰지 않는다. PostgreSQL은 ON CONFLICT DO NOTHING으로 동시 추가도 보호한다. 시세·투자 원장·가상게임·기존 외부 입력 행은 수정하거나 삭제하지 않는다.

분야는 추정하지 않고 미분류로 둔다. 분야별26기업 탐색 목록은 기존 편집 목록이며 전 시장 분야 분류라고 표시하지 않는다. 회사 검색과 상품 카탈로그에서 새 법인을 찾을 수 있다. 정확한 이름 일치를 먼저 반환하고 기존 페이지당 최대50개를 유지한다. 저장된 이름 검색은 외부 시세 제공처를 호출하지 않는다. 목록 추가는 가격·차트의 제공을 보장하지 않으며 없는 시세는 null로 유지한다.

## 갱신 절차

자동 갱신과 상장폐지 판정은 아직 구현하지 않았다. Render 시작에 공식 파일을 다운로드하지 않고 검증된 정적 목록만 사용한다. 다음 확인 시 KIND 원본 두 파일을 로컬에 내려받아 아래 명령으로 생성하고 출처·행수·차이를 리뷰한다.

```powershell
node scripts/build-krx-directory.cjs <KOSPI-원본-경로> <KOSDAQ-원본-경로> YYYY-MM-DD
node --test scripts/build-krx-directory.test.cjs
node scripts/build-krx-directory.cjs
```

생성 명령은 기존 스냅샷과 새 자료의 추가·회사명/업종 변경·원본 누락을 JSON 보고서로 출력한 후 파일을 저장한다. 기존보다 이전 날짜는 저장 전에 거절한다. 날짜만 다른 같은 회사는 unchanged로 집계한다. 변경된 다음 파일을 이미 보관하고 있다면 읽기 전용으로도 비교할 수 있다.

```powershell
node scripts/build-krx-directory.cjs --diff <이전-스냅샷.json> <다음-스냅샷.json>
node --test scripts/compare-krx-directory.test.cjs
```

보고서의 renamed/industryChanged는 현재 DB의 변경을 의미하지 않는다. missing은 원본에서 빠졌다는 뜻이며 상장폐지 판정이 아니다. 현재 서버의 directory 입력은 추가만 수행하므로 기존 회사 정보/시세/투자 기록은 자동 수정·삭제하지 않는다. 회사명 변경·상장폐지·새 별칭의 DB 반영은 별도 정책과 업데이트 경로가 필요하다. BE-22에 해외/ETF 확대·갱신 반영 정책·운영 규모 측정을 유지한다.
