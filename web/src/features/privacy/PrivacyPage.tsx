import { Card, Space, Typography } from 'antd'

const { Title, Paragraph, Text } = Typography

// Play 스토어 공개 배포(ADR 0012) 요건 — 기기 식별자·푸시 토큰·선택적 Google 계정을 수집하므로
// Play Console의 "Privacy policy URL" 등록에 필요. 이 페이지 자체가 그 URL이 가리키는 대상이다.
// 수집 항목은 전부 코드(UserSettings/AppUser 엔티티, SettingsRateLimiter)에서 실제로 확인한 내용만
// 적었다 — 法 자문이 아니라 일반적인 고지 템플릿이므로, 게시 전 한 번 검토가 필요하다.
const EFFECTIVE_DATE = '2026-10-07'
const CONTACT_EMAIL = 'powerhch@gmail.com'

export function PrivacyPage() {
  return (
    <Space direction="vertical" size={16} style={{ width: '100%' }}>
      <Title level={4} style={{ margin: 0 }}>
        개인정보처리방침
      </Title>

      <Card className="hoverable-card">
        <Space direction="vertical" size={20} style={{ width: '100%' }}>
          <Paragraph type="secondary" style={{ margin: 0 }}>
            시행일자: {EFFECTIVE_DATE}
          </Paragraph>

          <Paragraph style={{ margin: 0 }}>
            FireWatch(이하 &quot;서비스&quot;)는 이용자의 개인정보를 소중히 다루며, 아래와 같이 수집·이용·보관합니다.
          </Paragraph>

          <section>
            <Title level={5}>1. 수집하는 개인정보 항목</Title>
            <Paragraph style={{ marginBottom: 8 }}>
              <Text strong>필수(서비스 이용 시 자동/입력 수집)</Text>
            </Paragraph>
            <ul style={{ marginTop: 0 }}>
              <li>기기 식별자 — 로그인 없이 기기에서 자동 생성되는 익명 ID(앱/브라우저 최초 실행 시)</li>
              <li>푸시 알림 수신 희망 시간, 관심 키워드, 관심 종목 — 이용자가 직접 입력한 값</li>
              <li>푸시 알림 토큰 — 알림 발송을 위한 기기별 토큰(모바일 FCM 토큰, 웹 브라우저 푸시 구독 정보)</li>
              <li>접속 IP 주소 — 설정 저장 요청 시 남용 방지(요청 빈도 제한) 목적으로만 일시 처리되며, 운영 기록(감사 로그)에 남습니다</li>
            </ul>
            <Paragraph style={{ marginBottom: 8 }}>
              <Text strong>선택(Google 계정 연동 시에만)</Text>
            </Paragraph>
            <ul style={{ marginTop: 0, marginBottom: 0 }}>
              <li>Google 계정 고유 식별자, 이메일 주소 — 여러 기기 간 설정·문의·공지 숨김 상태 동기화와 운영자 권한 확인</li>
              <li>문제 신고·의견 제출 시 유형, 입력 내용, 앱/웹 버전, 접수 화면 경로, 처리 상태와 운영자 답변 — 문의 처리 목적으로 계정에 연결해 저장합니다. 개인 포트폴리오나 로그인 토큰은 자동 첨부하지 않습니다.</li>
              <li>오늘 하루 공지 숨김을 선택한 로그인 사용자의 숨김 만료 시각 — 계정에 저장하며, 비로그인 사용자는 해당 기기에만 저장합니다.</li>
              <li>가상투자 순위에 공개 등록한 경우 게임 닉네임, 수익률, 난이도·공매도·턴 조건, 등록 시각과 주간 우승 기록 — 계정에 연결해 저장합니다. 등록을 선택하고 동의한 기록만 공개하며 이메일과 상세 보유·매매 내역은 공개하지 않습니다.</li>
            </ul>
          </section>

          <section><Title level={5}>문의 정보의 열람과 삭제</Title><Paragraph>문의 내용은 본인과 서버에서 권한을 확인한 운영자만 열람할 수 있습니다. 계정 삭제 시 해당 계정의 문의·답변·공지 숨김 상태도 삭제합니다. 삭제 요청은 아래 연락처로도 접수할 수 있습니다. 비밀번호·인증 토큰·계좌번호 등 민감한 정보는 문의에 입력하지 마세요.</Paragraph></section>
          <section><Title level={5}>게임 순위 공개와 철회</Title><Paragraph>공개에 동의한 게임 기록은 다른 이용자가 순위·주간 우승자 화면에서 볼 수 있습니다. 내 공개 기록에서 철회하면 공개 목록에서 숨겨지며 재공개하지 않습니다. 철회한 기록은 중복 등록 방지와 내 기록 확인을 위해 계정 삭제 시까지 비공개로 보관합니다. 계정 삭제 시 닉네임·순위·우승자 연결 기록도 삭제합니다. 주간 우승자는 마감 후 확정하며 철회·삭제 시 다른 이용자를 소급해 우승자로 바꾸지 않습니다.</Paragraph></section>

          <section>
            <Title level={5}>2. 수집하지 않는 항목</Title>
            <Paragraph style={{ margin: 0 }}>
              비밀번호, 실명, 전화번호, 결제 정보, 위치 정보는 수집하지 않습니다. 서비스는 비밀번호 로그인 자체가 없습니다.
            </Paragraph>
          </section>

          <section>
            <Title level={5}>3. 개인정보의 이용 목적</Title>
            <ul style={{ margin: 0 }}>
              <li>매일 아침 증시 브리핑 푸시 알림 발송</li>
              <li>이용자가 설정한 관심 종목·키워드 저장 및 기기 간 동기화(계정 연동 시)</li>
              <li>비정상적인 요청(어뷰징) 방지</li>
            </ul>
          </section>

          <section>
            <Title level={5}>4. 보유 및 이용 기간, 계정·데이터 삭제</Title>
            <Paragraph style={{ margin: 0 }}>
              이용자가 앱을 삭제해도 서버에 저장된 데이터는 자동으로 삭제되지 않습니다. 삭제는 아래 두 가지 방법으로
              요청할 수 있습니다.
            </Paragraph>
            <ul style={{ marginBottom: 0 }}>
              <li>
                <Text strong>앱에서 직접 삭제</Text> — Google 계정을 연동한 경우, 모바일 앱의 설정 화면에서 &quot;계정
                삭제&quot;를 누르면 연동된 계정과 공유 설정이 서버에서 즉시 삭제됩니다.
              </li>
              <li>
                <Text strong>이메일로 요청</Text> — 앱을 삭제했거나 계정을 연동하지 않은 경우에도 아래 문의처로
                요청하시면 확인 후 지체 없이 삭제합니다.
              </li>
            </ul>
          </section>

          <section>
            <Title level={5}>5. 제3자 제공 및 처리 위탁</Title>
            <Paragraph style={{ margin: 0 }}>
              이용자의 개인정보를 판매하지 않습니다. 이용자가 선택해 동의한 게임 순위 기록은 서비스 이용자에게 공개합니다. 서비스 운영을 위해 아래 업체의 인프라를
              이용하며, 그 과정에서 일부 정보가 해당 업체 서버(국외 포함)에 저장·처리될 수 있습니다.
            </Paragraph>
            <ul>
              <li>Google(Firebase/Expo Push Service) — 푸시 알림 발송</li>
              <li>Google — 선택적 계정 연동(Google 로그인)</li>
              <li>Render, Supabase — 서버·데이터베이스 호스팅</li>
              <li>Cloudflare — 웹 페이지 호스팅</li>
            </ul>
          </section>

          <section>
            <Title level={5}>6. 안전성 확보조치</Title>
            <ul style={{ margin: 0 }}>
              <li>모든 통신은 HTTPS로 암호화됩니다.</li>
              <li>설정 변경 등 쓰기 요청은 기기 식별자 기반으로만 허용되며, IP 기준 요청 빈도 제한이 적용됩니다.</li>
              <li>Google 계정 연동은 Google 공식 라이브러리로 토큰 서명을 검증하며, 자체적으로 비밀번호를 보관하지 않습니다.</li>
            </ul>
          </section>

          <section>
            <Title level={5}>7. 이용자의 권리</Title>
            <Paragraph style={{ margin: 0 }}>
              이용자는 언제든지 자신의 데이터 열람·삭제를 요청할 수 있습니다. 아래 문의처로 연락해주세요.
            </Paragraph>
          </section>

          <section>
            <Title level={5}>8. 아동의 개인정보</Title>
            <Paragraph style={{ margin: 0 }}>
              이 서비스는 만 14세 미만 아동을 대상으로 하지 않으며, 아동의 개인정보를 의도적으로 수집하지 않습니다.
            </Paragraph>
          </section>

          <section>
            <Title level={5}>9. 문의처</Title>
            <Paragraph style={{ margin: 0 }}>{CONTACT_EMAIL}</Paragraph>
          </section>

          <section>
            <Title level={5}>10. 고지의 의무</Title>
            <Paragraph style={{ margin: 0 }}>
              이 방침은 법령·서비스 변경에 따라 개정될 수 있으며, 변경 시 이 페이지를 통해 고지합니다.
            </Paragraph>
          </section>
        </Space>
      </Card>
    </Space>
  )
}
