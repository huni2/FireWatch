import { Tag } from 'antd'
import type { AuditStatus } from '../../../lib/api'
import { AUDIT_STATUS_TAG_COLOR } from '../../../lib/theme'

// Design Ref: llm-wiki/design.md §1 — 감사로그 상태 색상 고정값
export function AuditStatusTag({ status }: { status: AuditStatus }) {
  return <Tag color={AUDIT_STATUS_TAG_COLOR[status]}>{status}</Tag>
}
