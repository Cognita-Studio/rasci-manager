import type { RasciRole } from '../../types'

const ROLE_DESC: Record<RasciRole, string> = {
  R: 'Responsible – wykonuje zadanie',
  A: 'Accountable – odpowiada za wynik',
  S: 'Support – wspiera wykonanie',
  C: 'Consulted – jest konsultowany',
  I: 'Informed – jest informowany',
}

export default function RoleBadge({ role }: { role: RasciRole }) {
  return (
    <span className={`badge-${role}`} title={ROLE_DESC[role]}>
      {role}
    </span>
  )
}
