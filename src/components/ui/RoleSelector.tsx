import type { RasciRole } from '../../types'

const ALL_ROLES: RasciRole[] = ['R', 'A', 'S', 'C', 'I']

interface Props {
  selected: RasciRole[]
  onChange: (roles: RasciRole[]) => void
}

export default function RoleSelector({ selected, onChange }: Props) {
  const toggle = (role: RasciRole) => {
    const next = selected.includes(role)
      ? selected.filter(r => r !== role)
      : [...selected, role]
    onChange(next)
  }

  return (
    <div className="flex gap-1 flex-wrap">
      {ALL_ROLES.map(role => (
        <button
          key={role}
          type="button"
          onClick={() => toggle(role)}
          className={`badge-${role} cursor-pointer select-none transition-opacity ${selected.includes(role) ? 'opacity-100' : 'opacity-30 hover:opacity-60'}`}
        >
          {role}
        </button>
      ))}
    </div>
  )
}
