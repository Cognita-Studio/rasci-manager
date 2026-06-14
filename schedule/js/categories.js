export const CATEGORIES = [
  { id: 'office',       label: 'Office',                  cssVar: '--c-office' },
  { id: 'wfh_no',       label: 'WFH — Norway',            cssVar: '--c-wfh_no' },
  { id: 'wfh_pl',       label: 'WFH — Poland',            cssVar: '--c-wfh_pl' },
  { id: 'holiday',      label: 'Holiday',                 cssVar: '--c-holiday' },
  { id: 'absence',      label: 'Absence (time in lieu)',  cssVar: '--c-absence' },
  { id: 'official',     label: 'Official free day',       cssVar: '--c-official' },
  { id: 'tnp_planned',  label: 'Travel NO→PL — planned',  cssVar: '--c-tnp_planned', marker: 'dot' },
  { id: 'tnp_actual',   label: 'Travel NO→PL — actual',   cssVar: '--c-tnp_actual',  marker: 'dot' },
  { id: 'tpn_planned',  label: 'Travel PL→NO — planned',  cssVar: '--c-tpn_planned', marker: 'dot' },
  { id: 'tpn_actual',   label: 'Travel PL→NO — actual',   cssVar: '--c-tpn_actual',  marker: 'dot' },
]

export const CAT_BY_ID = Object.fromEntries(CATEGORIES.map(c => [c.id, c]))
export const STRIPE_CATS = CATEGORIES.filter(c => c.marker !== 'dot').map(c => c.id)
export const TRAVEL_PAIRS = [
  { planned: 'tnp_planned', actual: 'tnp_actual', splitClass: 'np' },
  { planned: 'tpn_planned', actual: 'tpn_actual', splitClass: 'pn' },
]
