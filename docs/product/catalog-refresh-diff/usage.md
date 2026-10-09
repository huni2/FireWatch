# 기업 목록을 다시 확인할 때

1. shared/krx-companies.json을 별도 경로에 복사해 이전 스냅샷을 보관한다.
2. KIND의 KOSPI/KOSDAQ 상장법인 파일을 내려받고 실제 확인한 날짜로 생성한다. 원본 링크와 필드 범위는 [출처 문서](../krx-company-directory/data-source.md)를 따른다.
3. 출력된 추가/변경/누락을 확인하고 원본을 대조한다. 출처·행수·인코딩·코드 충돌이나 날짜 역행 오류가 나면 기존 파일을 보존한 채 입력을 바로잡는다.
4. 이전 스냅샷과 현재 파일을 --diff로 비교해 보고서를 따로 저장한다.
5. 생성 검사와 리소스 차이를 검토한 뒤 커밋/PR을 만든다. 기존 DB 회사명 변경의 반영은 BE-22의 별도 정책을 따른다.

```powershell
node scripts/build-krx-directory.cjs <KOSPI-원본> <KOSDAQ-원본> YYYY-MM-DD
node scripts/build-krx-directory.cjs --diff <이전-스냅샷.json> shared/krx-companies.json > report.json
node --test scripts/build-krx-directory.test.cjs scripts/compare-krx-directory.test.cjs
```

일반 생성 명령은 보고서 다음에 생성 완료 로그를 출력한다. JSON 파일로 저장할 때는 보고서만 출력하는 --diff 명령을 사용한다. --diff는 입력 파일과 서버 리소스를 쓰지 않는다.

| 보고 항목 | 의미 | 현재 서버의 처리 |
|---|---|---|
| added | 이전 원본에 없던 시장별 종목코드 | 기존 DB에 없는 코드만 추가 가능 |
| renamed | 같은 코드의 회사명 변경 | 검토 대상, 기존 행 자동 변경 없음 |
| industryChanged | 같은 코드의 공식 업종 변경 | 검토 대상, 기존 행 자동 변경 없음 |
| missing | 다음 원본에서 빠진 코드 | 기존 DB 기록 보존, 상장폐지 단정 없음 |
| unchanged | 회사명·업종이 그대로인 코드 | 확인 날짜만 달라져도 여기에 포함 |

동일 회사의 이름과 업종이 함께 바뀌면 renamed와 industryChanged에 각각 포함한다. 두 수를 더한 값은 변경 회사 수와 같지 않을 수 있다. 두 목록에서 같은 symbol을 묶어 확인한다. 시장 이동으로 suffix가 바뀐 코드는 현재 비교에서 missing과 added로 나타나며 기존 보유 기록을 자동 이전하지 않는다.

이 보고서는 두 공식 스냅샷의 차이다. DB에 이미 있는 편집 자료·시세·개인 투자 기록과 대조한 결과가 아니며 실제 수집 장애나 가격 변화도 판단하지 않는다.
