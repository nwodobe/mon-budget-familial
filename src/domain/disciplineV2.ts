import { elapsedDays, monthOf, monthsBetween } from './dates'
import { checkOverspend, computeMonth, type MonthSnapshot, type OverspendCheck } from './engine'
import type { DisciplineFlag, Expense, IsoDate, IsoMonth, Ledger, Provision } from './types'

const alive = <T extends { deleted_at: string | null }>(rows: T[]) => rows.filter((r) => r.deleted_at === null)

export interface ProvisionStatusV2 {
  id: string
  name: string
  target: number
  targetDate: IsoDate
  funded: number
  remaining: number
  monthsLeft: number
  monthlyNeeded: number
  fundedThisMonth: number
  reserveRemainingThisMonth: number
  progressPct: number
  pocketId: string | null
}

export interface ScoreComponentV2 {
  key: string
  label: string
  max: number
  earned: number
  applicable: boolean
  detail: string
  advice: string
}

export interface DisciplineScoreV2 {
  value: number
  label: string
  measurable: boolean
  components: ScoreComponentV2[]
}

export interface DisciplineSnapshot extends Omit<MonthSnapshot, 'score'> {
  incomeExpected: number
  incomePlanned: number
  spendable: number
  deficit: number
  todaySpent: number
  todayBudget: number
  todayRemaining: number
  todayOverBy: number
  envelopeCapacity: number
  envelopeAllocated: number
  envelopeAllocationGap: number
  envelopeAllocationStatus: 'equilibre' | 'impossible'
  provisionsReserveRemaining: number
  protectedReserveRemaining: number
  provisions: ProvisionStatusV2[]
  score: DisciplineScoreV2
}

function asOfLedger(ledger: Ledger, month: IsoMonth, reference: IsoDate): Ledger {
  return {
    ...ledger,
    incomes: ledger.incomes.filter((r) => r.deleted_at !== null || monthOf(r.date) !== month || r.date <= reference),
    expenses: ledger.expenses.filter((r) => r.deleted_at !== null || monthOf(r.date) !== month || r.date <= reference),
    savings: ledger.savings.filter((r) => r.deleted_at !== null || monthOf(r.date) !== month || r.date <= reference),
    charge_payments: ledger.charge_payments.filter((r) => r.deleted_at !== null || r.month !== month || r.paid_date <= reference),
  }
}

function provisionStatus(provision: Provision, ledger: Ledger, reference: IsoDate): ProvisionStatusV2 {
  const movements = provision.pocket_id
    ? alive(ledger.savings).filter((m) => m.pocket_id === provision.pocket_id && m.date <= reference)
    : []
  const balance = movements.reduce((sum, m) => sum + (m.kind === 'depot' ? m.amount : -m.amount), 0)
  const funded = Math.max(0, provision.initial_amount + balance)
  const remaining = Math.max(0, provision.target_amount - funded)
  const refMonth = reference.slice(0, 7)
  const targetMonth = provision.target_date.slice(0, 7)
  const monthsLeft = provision.target_date < reference ? 0 : Math.max(1, monthsBetween(refMonth, targetMonth) + 1)
  const monthlyNeeded = monthsLeft > 0 ? Math.ceil(remaining / monthsLeft) : remaining
  const fundedThisMonth = provision.pocket_id
    ? movements.filter((m) => monthOf(m.date) === refMonth).reduce((sum, m) => sum + (m.kind === 'depot' ? m.amount : -m.amount), 0)
    : 0
  const reserveRemainingThisMonth = Math.max(0, monthlyNeeded - Math.max(0, fundedThisMonth))
  return {
    id: provision.id,
    name: provision.name,
    target: provision.target_amount,
    targetDate: provision.target_date,
    funded,
    remaining,
    monthsLeft,
    monthlyNeeded,
    fundedThisMonth,
    reserveRemainingThisMonth,
    progressPct: provision.target_amount > 0 ? Math.min(100, Math.round((funded / provision.target_amount) * 100)) : 0,
    pocketId: provision.pocket_id,
  }
}

export function computeProvisionsV2(ledger: Ledger, reference: IsoDate): ProvisionStatusV2[] {
  return alive(ledger.provisions ?? [])
    .filter((p) => p.active)
    .map((p) => provisionStatus(p, ledger, reference))
    .sort((a, b) => a.targetDate.localeCompare(b.targetDate))
}

export function computeMonthV2(ledger: Ledger, month: IsoMonth, reference: IsoDate): DisciplineSnapshot {
  const scoped = asOfLedger(ledger, month, reference)
  const base = computeMonth(scoped, month, reference)
  const monthIncomes = alive(ledger.incomes).filter((i) => monthOf(i.date) === month)
  const incomeExpected = monthIncomes.filter((i) => i.date > reference).reduce((s, i) => s + i.amount, 0)
  const provisions = computeProvisionsV2(scoped, reference)
  const provisionsReserveRemaining = monthOf(reference) === month
    ? provisions.reduce((s, p) => s + p.reserveRemainingThisMonth, 0)
    : 0

  // Les provisions sont une forme d'epargne protegee. On retient le plus fort
  // besoin entre objectif d'epargne et provisions, jamais leur somme.
  const protectedReserveRemaining = Math.max(base.savingsRemaining, provisionsReserveRemaining)
  const available = base.available - Math.max(0, protectedReserveRemaining - base.savingsRemaining)
  const spendable = Math.max(0, available)
  const deficit = Math.max(0, -available)

  const todaySpent = monthOf(reference) === month
    ? scoped.expenses.filter((e) => e.deleted_at === null && e.date === reference).reduce((s, e) => s + e.amount, 0)
    : 0
  const dailyBudget = base.daysRemaining > 0 ? Math.floor(available / base.daysRemaining) : available
  const todayBudget = monthOf(reference) === month && base.daysRemaining > 0
    ? Math.max(0, Math.floor((available + todaySpent) / base.daysRemaining))
    : 0
  const todayRemaining = Math.max(0, todayBudget - todaySpent)
  const todayOverBy = Math.max(0, todaySpent - todayBudget)

  const calendarElapsed = elapsedDays(month, reference)
  const hasExpenseToday = scoped.expenses.some((e) => e.deleted_at === null && e.date === reference && e.charge_id === null)
  const daysElapsed = monthOf(reference) === month
    ? Math.max(0, calendarElapsed - 1 + (hasExpenseToday ? 1 : 0))
    : calendarElapsed
  const averageDailySpend = daysElapsed > 0 ? Math.round(base.variableSpent / daysElapsed) : 0

  const envelopeAllocated = base.envelopes.reduce((s, e) => s + e.planned, 0)
  const provisionTarget = provisions.reduce((s, p) => s + p.monthlyNeeded, 0)
  const protectedMonthlyTarget = Math.max(base.savingsTarget, provisionTarget)
  const envelopeCapacity = Math.max(0, base.income - base.chargesDue - protectedMonthlyTarget)
  const envelopeAllocationGap = envelopeCapacity - envelopeAllocated

  let health = base.health
  let healthReason = base.healthReason
  if (available < 0) {
    health = 'danger'
    healthReason = `Il manque ${formatInt(deficit)} FCFA pour couvrir vos engagements proteges.`
  } else if (base.daysRemaining > 0 && averageDailySpend > 0 && Math.max(0, dailyBudget) < averageDailySpend) {
    health = 'attention'
    healthReason = 'A votre rythme actuel de depense, le mois risque de ne pas tenir.'
  }

  const withCore = {
    ...base,
    incomeExpected,
    incomePlanned: base.income + incomeExpected,
    available,
    spendable,
    deficit,
    dailyBudget,
    daysElapsed,
    averageDailySpend,
    todaySpent,
    todayBudget,
    todayRemaining,
    todayOverBy,
    envelopeCapacity,
    envelopeAllocated,
    envelopeAllocationGap,
    envelopeAllocationStatus: envelopeAllocationGap < 0 ? 'impossible' as const : 'equilibre' as const,
    provisionsReserveRemaining,
    protectedReserveRemaining,
    provisions,
    health,
    healthReason,
  }

  return { ...withCore, score: computeScoreV2(scoped, withCore, reference) }
}

function component(key: string, label: string, max: number, earned: number, applicable: boolean, detail: string, advice: string): ScoreComponentV2 {
  return { key, label, max, earned, applicable, detail, advice }
}

export function computeScoreV2(ledger: Ledger, snapshot: Omit<DisciplineSnapshot, 'score'>, reference: IsoDate): DisciplineScoreV2 {
  const parts: ScoreComponentV2[] = []
  const planned = snapshot.envelopes.reduce((s, e) => s + e.planned, 0)
  const over = snapshot.envelopes.reduce((s, e) => s + Math.max(0, e.spent - e.planned), 0)
  parts.push(planned > 0
    ? component('budgets', 'Respect des budgets', 25, Math.round(25 * (1 - Math.min(1, over / planned))), true,
        over === 0 ? 'Aucune enveloppe depassee.' : `${formatInt(over)} FCFA depenses au-dela des enveloppes.`,
        over === 0 ? 'Gardez ce cap.' : 'Reduisez en priorite la categorie qui depasse le plus.')
    : component('budgets', 'Respect des budgets', 25, 0, false, 'Aucune enveloppe definie.', 'Creez vos principales enveloppes.'))

  const savingsTarget = Math.max(snapshot.savingsTarget, snapshot.provisions.reduce((s, p) => s + p.monthlyNeeded, 0))
  parts.push(savingsTarget > 0
    ? component('epargne', 'Epargne realisee', 20, Math.round(20 * Math.min(1, Math.max(0, snapshot.savingsDone) / savingsTarget)), true,
        `${formatInt(Math.max(0, snapshot.savingsDone))} FCFA proteges sur ${formatInt(savingsTarget)} FCFA vises.`,
        snapshot.savingsDone >= savingsTarget ? 'Objectif atteint.' : `Il reste ${formatInt(Math.max(0, savingsTarget - snapshot.savingsDone))} FCFA a proteger.`)
    : component('epargne', 'Epargne realisee', 20, 0, false, "Aucun objectif d'epargne mesurable.", 'Definissez un taux ou une provision.'))

  const due = snapshot.charges.filter((c) => c.dueDate <= reference)
  const onTime = due.filter((c) => c.paid && c.paidDate !== null && c.paidDate <= c.dueDate)
  parts.push(due.length > 0
    ? component('charges', 'Charges payees a temps', 15, Math.round(15 * onTime.length / due.length), true,
        `${onTime.length} charge(s) sur ${due.length} reglee(s) a temps.`,
        onTime.length === due.length ? 'Aucun retard a corriger.' : 'Priorisez les charges avant les depenses variables.')
    : component('charges', 'Charges payees a temps', 15, 0, false, "Aucune charge n'est encore echue.", 'Aucun effort necessaire pour le moment.'))

  const expenses = alive(ledger.expenses).filter((e) => monthOf(e.date) === snapshot.month && e.date <= reference)
  if (expenses.length > 0) {
    const total = expenses.reduce((s, e) => s + e.amount, 0)
    const unplanned = expenses.filter((e) => e.envelope_id === null && e.charge_id === null).reduce((s, e) => s + e.amount, 0)
    parts.push(component('planification', 'Depenses planifiees', 15, Math.round(15 * (1 - Math.min(1, unplanned / Math.max(1, total)))), true,
      unplanned === 0 ? 'Toutes les depenses sont rattachees a un plan.' : `${formatInt(unplanned)} FCFA depenses hors enveloppe.`,
      unplanned === 0 ? 'Continuez a decider avant de depenser.' : 'Rattachez chaque depense recurrente a une enveloppe.'))
    const danger = expenses.filter((e) => (e.discipline_flags ?? []).includes('global-danger')).length
    const warning = expenses.filter((e) => (e.discipline_flags ?? []).includes('global-warning')).length
    const earned = Math.max(0, 15 - danger * 5 - warning * 2)
    parts.push(component('safe_to_spend', 'Respect du Disponible a depenser', 15, earned, true,
      danger === 0 && warning === 0 ? 'Aucune depense forcee contre une alerte globale.' : `${danger} depense(s) en zone danger et ${warning} avertissement(s).`,
      earned === 15 ? 'Votre marge globale est respectee.' : 'Reduisez ou reportez les depenses qui declenchent une alerte globale.'))
  } else {
    parts.push(component('planification', 'Depenses planifiees', 15, 0, false, 'Aucune depense a analyser.', 'Ce critere deviendra mesurable avec vos depenses.'))
    parts.push(component('safe_to_spend', 'Respect du Disponible a depenser', 15, 0, false, 'Aucune depense a analyser.', 'Ce critere deviendra mesurable avec vos depenses.'))
  }

  const days = new Set(expenses.map((e) => e.date))
  parts.push(snapshot.daysElapsed > 0 && (snapshot.income > 0 || expenses.length > 0)
    ? component('regularite', 'Regularite du suivi', 10, Math.round(10 * Math.min(1, (days.size / snapshot.daysElapsed) / 0.6)), true,
        `${days.size} jour(s) avec saisie sur ${snapshot.daysElapsed} jour(s) observes.`,
        days.size / Math.max(1, snapshot.daysElapsed) >= 0.6 ? 'Votre suivi est regulier.' : 'Saisissez les depenses au fil de la journee.')
    : component('regularite', 'Regularite du suivi', 10, 0, false, 'Pas assez de donnees pour mesurer la regularite.', 'Commencez par enregistrer vos mouvements reels.'))

  const applicable = parts.filter((p) => p.applicable)
  const max = applicable.reduce((s, p) => s + p.max, 0)
  const earned = applicable.reduce((s, p) => s + p.earned, 0)
  const value = max > 0 ? Math.round(100 * earned / max) : 0
  const label = max === 0 ? 'Pas encore mesurable' : value >= 90 ? 'Excellent' : value >= 75 ? 'Bonne discipline' : value >= 60 ? 'A surveiller' : value >= 40 ? 'Situation fragile' : 'Situation critique'
  return { value, label, measurable: max > 0, components: parts }
}

export interface ExpenseSimulationV2 {
  before: DisciplineSnapshot
  after: DisciplineSnapshot
  availableBefore: number
  availableAfter: number
  dailyBefore: number
  dailyAfter: number
  envelope: OverspendCheck | null
  globalRisk: 'none' | 'warning' | 'danger'
  flags: DisciplineFlag[]
  reasons: string[]
}

export function simulateExpenseV2(ledger: Ledger, month: IsoMonth, reference: IsoDate, input: { amount: number; envelopeId: string | null; date: IsoDate }): ExpenseSimulationV2 {
  const before = computeMonthV2(ledger, month, reference)
  if (input.amount <= 0) return { before, after: before, availableBefore: before.available, availableAfter: before.available, dailyBefore: before.dailyBudget, dailyAfter: before.dailyBudget, envelope: null, globalRisk: 'none', flags: [], reasons: [] }

  const synthetic: Expense = {
    id: '__simulation__', updated_at: `${reference}T00:00:00.000Z`, deleted_at: null,
    date: input.date, amount: input.amount, envelope_id: input.envelopeId, method: 'autre',
    description: '__simulation__', member: 'Moi', charge_id: null, override_reason: '', discipline_flags: [],
  }
  const after = computeMonthV2({ ...ledger, expenses: [...ledger.expenses, synthetic] }, month, reference)
  const envelope = checkOverspend(before, input.envelopeId, input.amount, ledger.settings.warn_threshold_pct)
  const flags: DisciplineFlag[] = []
  const reasons: string[] = []
  if (envelope?.warningOnly) flags.push('envelope-warning')
  if (envelope && !envelope.warningOnly) flags.push('envelope-over')

  let globalRisk: ExpenseSimulationV2['globalRisk'] = 'none'
  if (after.available < 0) {
    globalRisk = 'danger'
    flags.push('global-danger')
    reasons.push(`Cette depense cree un deficit de ${formatInt(after.deficit)} FCFA.`)
  } else if ((before.health === 'saine' && after.health === 'attention') || after.todayOverBy > 0) {
    globalRisk = 'warning'
    flags.push('global-warning')
    reasons.push(after.todayOverBy > 0
      ? `Le budget conseille aujourd'hui serait depasse de ${formatInt(after.todayOverBy)} FCFA.`
      : 'Cette depense degrade votre rythme de fin de mois.')
  }
  return { before, after, availableBefore: before.available, availableAfter: after.available, dailyBefore: before.dailyBudget, dailyAfter: after.dailyBudget, envelope, globalRisk, flags: [...new Set(flags)], reasons }
}

export function formatInt(n: number): string {
  const sign = n < 0 ? '-' : ''
  return sign + Math.abs(Math.round(n)).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ')
}
