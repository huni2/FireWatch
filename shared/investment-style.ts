export const investmentStyleVersion = 1
export const investmentStyleStorageKey = 'firewatch-investment-style-v1'
export const investmentStyleTitle = '나에게 맞는 투자 방식 찾기'
export interface StyleOption { id: string; label: string }
export interface StyleQuestion { id: string; title: string; help: string; options: StyleOption[] }
const options = (...items: [string, string][]): StyleOption[] => items.map(([id, label]) => ({ id, label }))
export const styleQuestions: StyleQuestion[] = [
  { id: 'goal', title: '이 돈을 모으는 가장 큰 이유는 무엇인가요?', help: '여러 목적이 있다면 이번에 점검할 돈 하나를 떠올려주세요.', options: options(['home', '집·교육 등 예정된 지출'], ['retirement', '먼 훗날의 생활비'], ['growth', '아직 용도를 정하지 않은 자산 형성'], ['unknown', '아직 잘 모르겠어요']) },
  { id: 'horizon', title: '이 돈을 언제쯤 사용할 예정인가요?', help: '투자 기간을 맞히는 문제가 아니라, 돈이 필요한 시점을 묻는 질문이에요.', options: options(['soon', '1년 안에 필요해요'], ['middle', '1~3년 안에 필요해요'], ['long', '3년 뒤에도 당장 쓰지 않을 수 있어요'], ['unknown', '아직 정하지 못했어요']) },
  { id: 'reserve', title: '예상하지 못한 지출에 쓸 돈은 따로 있나요?', help: '구체적인 자산이나 소득 금액은 입력하지 않아요.', options: options(['separate', '이 돈과 별도로 마련해뒀어요'], ['shared', '갑자기 돈이 필요하면 이 돈도 써야 해요'], ['unknown', '어느 정도 필요한지 아직 모르겠어요']) },
  { id: 'impact', title: '이 돈의 일부를 잃으면 생활에 어떤 영향이 있나요?', help: '수익을 얼마나 원하는지보다, 실제로 감당할 수 있는 상황을 떠올려주세요.', options: options(['large', '생활비나 예정된 지출에 큰 영향이 있어요'], ['some', '계획을 조정해야 하지만 생활은 가능해요'], ['small', '생활비와 예정된 지출은 별도로 준비돼 있어요'], ['unknown', '판단하기 어려워요']) },
  { id: 'reaction', title: '보유한 투자금이 크게 줄었을 때 어떻게 했나요?', help: '경험이 없다면 상상해서 답할 필요 없어요.', options: options(['sell', '불안해서 먼저 줄이거나 팔았어요'], ['wait', '결정을 미루고 지켜봤어요'], ['review', '처음 투자한 이유와 자료를 다시 확인했어요'], ['buy', '더 살 기회라고 생각했어요'], ['unknown', '그런 경험이 없거나 기억나지 않아요']) },
  { id: 'willingness', title: '수익의 가능성과 가격 변동 중 어떤 쪽을 더 중요하게 보나요?', help: '감수하고 싶은 마음을 묻는 질문이에요. 앞서 답한 생활 여유와는 따로 살펴봐요.', options: options(['steady', '수익 기대가 작아도 변동을 줄이고 싶어요'], ['balanced', '어느 정도 변동과 수익 가능성을 함께 생각해요'], ['growth', '더 큰 수익 가능성을 위해 큰 변동도 생각해요'], ['unknown', '아직 제 생각을 잘 모르겠어요']) },
  { id: 'time', title: '투자를 살펴보는 데 어느 정도 시간을 쓰고 싶나요?', help: '지금 실제로 지속할 수 있는 시간을 골라주세요.', options: options(['brief', '가끔 핵심만 짧게 확인하고 싶어요'], ['regular', '정해진 날에 시간을 내고 싶어요'], ['deep', '자료를 읽고 조사하는 데 시간을 쓰고 싶어요'], ['unknown', '아직 정하지 못했어요']) },
  { id: 'decision', title: '투자 결정을 할 때 어떤 과정이 편한가요?', help: '실력을 평가하는 질문이 아니에요.', options: options(['routine', '미리 세운 기준과 규칙을 따르는 과정'], ['compare', '여러 선택지를 표나 메모로 비교하는 과정'], ['research', '기업과 자료를 직접 깊이 알아보는 과정'], ['simple', '관리할 일을 줄이고 핵심만 확인하는 과정'], ['unknown', '어떤 과정이 맞는지 아직 모르겠어요']) },
  { id: 'experience', title: '투자 경험은 어느 정도인가요?', help: '경험이 많다고 더 좋은 유형이 나오는 것은 아니에요.', options: options(['none', '아직 시작하지 않았어요'], ['basic', '일부 상품을 사고 보유해본 적이 있어요'], ['varied', '여러 상품과 가격 변동을 경험했어요'], ['unknown', '어떻게 구분할지 모르겠어요']) },
  { id: 'influence', title: '주변에서 투자로 돈을 벌었다는 이야기를 들으면 어떤 편인가요?', help: '평소에 반복되는 행동에 가까운 답을 골라주세요.', options: options(['hurry', '기회를 놓칠까 봐 빨리 따라가고 싶어요'], ['research', '무엇에 투자했고 어떤 위험이 있는지 찾아봐요'], ['plan', '제 목표와 기준에 맞는지 먼저 확인해요'], ['unknown', '상황마다 다르거나 아직 모르겠어요']) },
]
export type StyleAnswers = Record<string, string>
export interface SavedStyle { version: number; savedAt: string; answers: StyleAnswers }
export function validStyleAnswers(value: unknown): value is StyleAnswers {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false
  const answer = value as Record<string, unknown>
  return Object.keys(answer).length === styleQuestions.length && styleQuestions.every(q => q.options.some(option => option.id === answer[q.id]))
}
export function parseSavedStyle(raw: string | null): SavedStyle | null {
  if (!raw) return null
  const data: unknown = JSON.parse(raw)
  if (!data || typeof data !== 'object') throw new Error('저장한 결과의 형식을 확인하지 못했어요.')
  const saved = data as SavedStyle
  if (saved.version !== investmentStyleVersion || !validStyleAnswers(saved.answers) || typeof saved.savedAt !== 'string' || !Number.isFinite(Date.parse(saved.savedAt))) throw new Error('저장한 결과의 형식을 확인하지 못했어요.')
  return { version: saved.version, savedAt: saved.savedAt, answers: Object.fromEntries(styleQuestions.map(q => [q.id, saved.answers[q.id]])) }
}
export function saveStyleSnapshot(answers: StyleAnswers, now = new Date()): SavedStyle {
  if (!validStyleAnswers(answers)) throw new Error('모든 질문에 답해주세요. 모르겠어요도 선택할 수 있어요.')
  return { version: investmentStyleVersion, savedAt: now.toISOString(), answers: { ...answers } }
}
const styles = {
  routine: { name: '루틴 관리형', description: '미리 정한 기준과 일정에 따라 돌아보는 과정을 선호해요.', method: '보유 이유와 확인할 내용을 적고, 지속할 수 있는 점검 날짜를 정해보세요.' },
  research: { name: '직접 탐구형', description: '자료를 직접 읽고 선택 근거를 만드는 과정을 선호해요.', method: '처음 생각과 반대되는 근거도 함께 기록하고, 확인한 자료의 출처와 날짜를 살펴보세요.' },
  compare: { name: '비교 정리형', description: '선택지를 비교하고 메모하면서 판단하는 과정을 선호해요.', method: '목적·비용·위험처럼 같은 기준으로 비교하고, 이미 보유한 자산과 겹치는 부분을 점검해보세요.' },
  simple: { name: '간편 점검형', description: '관리하는 일을 줄이고 핵심만 확인하는 과정을 선호해요.', method: '관리할 항목을 간단히 정리하고, 보유 이유와 점검 날짜처럼 꼭 필요한 기록부터 남겨보세요.' },
  exploring: { name: '나의 방식 탐색 중', description: '어떤 관리 과정이 편한지 아직 정하는 중이에요.', method: '보유 이유를 짧게 적는 것부터 해보고, 실제로 지속하기 편한 점검 방법을 찾아보세요.' },
}
export function investmentStyleResult(answers: StyleAnswers) {
  if (!validStyleAnswers(answers)) throw new Error('모든 질문에 답해주세요.')
  const kind = answers.decision === 'unknown' ? (answers.time === 'brief' ? 'simple' : 'exploring') : answers.decision as Exclude<keyof typeof styles, 'exploring'>
  const capacity = answers.horizon === 'soon' || answers.reserve === 'shared' || answers.impact === 'large' ? 'limited' : [answers.horizon, answers.reserve, answers.impact].includes('unknown') ? 'unclear' : 'considered'
  const willingness = answers.willingness === 'unknown' ? 'unclear' : answers.willingness === 'steady' || answers.reaction === 'sell' ? 'cautious' : answers.willingness === 'growth' ? 'accepting' : 'balanced'
  const notices: string[] = []
  if (answers.horizon === 'soon') notices.push('1년 안에 사용할 돈이라고 답했어요. 필요한 날짜와 목적을 먼저 구분해 적어보세요.')
  if (answers.reserve === 'shared') notices.push('갑작스러운 지출에도 이 돈을 사용한다고 답했어요. 생활에 필요한 돈과 투자 목적의 돈을 어떻게 구분할지 먼저 점검해보세요.')
  if (answers.impact === 'large') notices.push('손실이 생활에 큰 영향을 준다고 답했어요. 기대하는 수익과 별개로 생활에 미치는 영향을 먼저 살펴보세요.')
  if (capacity === 'limited' && willingness === 'accepting') notices.push('큰 변동을 감수하고 싶은 마음과 현재 생활 여유 사이에 차이가 있어요. 두 답변을 함께 다시 확인해보세요.')
  if (capacity === 'unclear') notices.push('사용 시점·예비 자금·손실 영향 중 아직 모르는 부분이 있어요. 이 부분을 확인한 뒤 다시 점검해보세요.')
  if (answers.decision === 'research' && answers.time === 'brief') notices.push('깊이 조사하는 방식을 선호하지만 쓸 시간은 짧다고 답했어요. 확인할 자료의 범위를 줄여 지속 가능한 방법인지 살펴보세요.')
  if (answers.influence === 'hurry') notices.push('주변의 수익 이야기에 서두르고 싶다고 답했어요. 결정하기 전에 내 보유 이유와 확인할 내용을 먼저 적어보세요.')
  if (!notices.length) notices.push('현재 답변을 앞으로도 감당할 수 있다는 보장으로 해석하지 말고, 목표나 생활 상황이 달라질 때 다시 확인해보세요.')
  const evidence = ['time', 'decision'].map(id => {
    const q = styleQuestions.find(item => item.id === id)!
    return { question: q.title, answer: q.options.find(option => option.id === answers[id])!.label }
  })
  return { kind, ...styles[kind], evidence, capacity, capacityText: capacity === 'limited' ? '생활에 필요한 돈과 사용 시점을 먼저 점검할 답변이 있어요.' : capacity === 'unclear' ? '손실을 감당할 상황을 더 확인해야 해요.' : '예비 자금·사용 시점·생활 영향을 구분해 답했어요. 손실을 감당할 금액이 확정된 것은 아니에요.', willingness, willingnessText: willingness === 'unclear' ? '감수하고 싶은 변동의 정도를 아직 정하지 않았어요.' : willingness === 'cautious' ? '변동을 줄이고 싶거나, 하락할 때 부담을 느꼈다고 답했어요.' : willingness === 'accepting' ? '큰 변동도 생각한다고 답했어요. 실제 감당할 여력과 따로 확인해야 해요.' : '변동과 수익 가능성을 함께 생각한다고 답했어요.', notices, learning: answers.experience === 'none' || answers.experience === 'unknown' ? '투자를 시작하기 전 손실 가능성·분산·비용의 의미부터 살펴보세요.' : '이미 보유한 자산의 투자 목적과 비중, 비용을 같은 기준으로 다시 살펴보세요.' }
}
