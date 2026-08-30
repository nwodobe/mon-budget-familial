import {
  daysInMonth,
  dueDateOf,
  monthOf,
  monthsBetween,
  remainingDays,
  startOfWeek,
} from './dates'
import type {
  Charge,
  Expense,
  IsoDate,
  IsoMonth,
  Ledger,
} from './types'

/**
 * Moteur financier deterministe.
 *
 * Aucune fonction de ce fichier ne lit l'horloge, le reseau ou le stockage :
 * tout entre par les parametres. Deux appels avec les memes arguments rendent
 * exactement le meme resultat, ce qui les rend testables ligne a ligne.
 */

const alive = <T extends { deleted_at: string | null }>(rows: T[]): T[] =>
  rows.filter((r) => r.deleted_at === null)

/** Une charge est-elle due au cours de ce mois ? */
export function chargeIsDue(charge: Charge, month: IsoMonth): boolean {
  if (!charge.active) return false
  if (month < charge.start_month) return false
  const delta = monthsBetween(charge.start_month, month)
  switch (charge.frequency) {
    case 'mensuelle':
      return true
    case 'trimestrielle':
      return delta % 3 === 0
    case 'annuelle':
      return delta % 12 === 0
    case 'ponctuelle':
      return delta === 0
  }
}

export interface EnvelopeStatus {
  id: string
  name: string
  planned: number
  spent: number
  remaining: number
  /** Part consommee, en pourcentage arrondi. 0 quand rien n'est prevu. */
  usedPct: number
  state: 'sain' | 'attention' | 'depasse'
}

export interface ChargeStatus {
  id: string
  label: string
  amount: number
  dueDate: IsoDate
  paid: boolean
  paidDate: IsoDate | null
  paidAmount: number
  /** Non payee et echeance depassee a la date de reference. */
  late: boolean
}

export interface ScoreComponent {
  key: string
  label: string
  max: number
  earned: number
  applicable: boolean
  detail: string
}

export interface DisciplineScore {
  value: number
  band: 'excellent' | 'bonne' | 'a_surveiller' | 'fragile' | 'critique'
  label: string
  /** Faux quand aucune composante n'a de matiere : il n'y a rien a noter. */
  measurable: boolean
  components: ScoreComponent[]
}

export interface MonthSnapshot {
  month: IsoMonth
  reference: IsoDate
  daysTotal: number
  daysRemaining: number
  daysElapsed: number

  income: number
  /** Total sorti de la poche du mois, epargne exclue. */
  spent: number
  /** Depenses non liees au reglement d'une charge. */
  variableSpent: number
  chargesDue: number
  chargesPaid: number
  chargesRemaining: number
  savingsTarget: number
  savingsDone: number
  savingsRemaining: number

  /** Le chiffre central : ce qui peut encore etre depense sans casser le mois. */
  available: number
  dailyBudget: number
  averageDailySpend: number
  health: 'saine' | 'attention' | 'danger'
  healthReason: string

  envelopes: EnvelopeStatus[]
  charges: ChargeStatus[]
  score: DisciplineScore
}

/** Enveloppe planifiee pour ce mois : la redefinition du mois, sinon le montant par defaut. */
function plannedFor(ledger: Ledger, envelopeId: string, month: IsoMonth, fallback: number): number {
  const override = alive(ledger.budget_overrides).find(
    (o) => o.envelope_id === envelopeId && o.month === month,
  )
  return override ? override.planned : fallback
}

export function expensesOfMonth(ledger: Ledger, month: IsoMonth): Expense[] {
  return alive(ledger.expenses).filter((e) => monthOf(e.date) === month)
}

export function computeMonth(ledger: Ledger, month: IsoMonth, reference: IsoDate): MonthSnapshot {
  const daysTotal = daysInMonth(month)
  const daysRemaining = remainingDays(month, reference)
  const daysElapsed = daysTotal - daysRemaining

  const income = alive(ledger.incomes)
    .filter((i) => monthOf(i.date) === month)
    .reduce((s, i) => s + i.amount, 0)

  const expenses = expensesOfMonth(ledger, month)
  const expensesTotal = expenses.reduce((s, e) => s + e.amount, 0)
  const variableSpent = expenses
    .filter((e) => e.charge_id === null)
    .reduce((s, e) => s + e.amount, 0)

  const dueCharges = alive(ledger.charges).filter((c) => chargeIsDue(c, month))
  const chargesDue = dueCharges.reduce((s, c) => s + c.amount, 0)

  const payments = alive(ledger.charge_payments).filter((p) => p.month === month)
  const chargesPaid = payments.reduce((s, p) => s + p.amount, 0)
  const chargesRemaining = Math.max(0, chargesDue - chargesPaid)

  // Un reglement de charge saisi sans depense associee est quand meme sorti
  // de la tresorerie : il faut le compter une fois, et une seule.
  const paidOutsideExpenses = payments
    .filter((p) => p.expense_id === null)
    .reduce((s, p) => s + p.amount, 0)
  const spent = expensesTotal + paidOutsideExpenses

  const monthSavings = alive(ledger.savings).filter((s) => monthOf(s.date) === month)
  const savingsDone = monthSavings.reduce(
    (s, m) => s + (m.kind === 'depot' ? m.amount : -m.amount),
    0,
  )
  const savingsTarget = Math.round((income * ledger.settings.savings_rate_pct) / 100)
  const savingsRemaining = Math.max(0, savingsTarget - savingsDone)

  // Le coeur du produit. Chaque terme est sorti UNE seule fois :
  // une charge payee quitte "chargesRemaining" et entre dans "spent".
  const available = income - spent - savingsDone - chargesRemaining - savingsRemaining

  const dailyBudget = daysRemaining > 0 ? Math.floor(available / daysRemaining) : available
  const averageDailySpend = daysElapsed > 0 ? Math.round(variableSpent / daysElapsed) : 0

  let health: MonthSnapshot['health'] = 'saine'
  let healthReason = 'Vos charges, votre epargne et vos depenses tiennent dans vos revenus.'
  if (available < 0) {
    health = 'danger'
    healthReason = 'Vos engagements depassent vos revenus du mois.'
  } else if (daysRemaining > 0 && averageDailySpend > 0 && dailyBudget < averageDailySpend) {
    health = 'attention'
    healthReason = 'A votre rythme actuel de depense, le mois ne tiendra pas.'
  }

  const envelopes = alive(ledger.envelopes)
    .slice()
    .sort((a, b) => a.position - b.position)
    .map<EnvelopeStatus>((env) => {
      const planned = plannedFor(ledger, env.id, month, env.planned)
      const spentHere = expenses
        .filter((e) => e.envelope_id === env.id)
        .reduce((s, e) => s + e.amount, 0)
      const usedPct = planned > 0 ? Math.round((spentHere / planned) * 100) : 0
      const state: EnvelopeStatus['state'] =
        planned > 0 && spentHere > planned
          ? 'depasse'
          : planned > 0 && usedPct >= ledger.settings.warn_threshold_pct
            ? 'attention'
            : 'sain'
      return {
        id: env.id,
        name: env.name,
        planned,
        spent: spentHere,
        remaining: planned - spentHere,
        usedPct,
        state,
      }
    })

  const charges = dueCharges
    .map<ChargeStatus>((c) => {
      const dueDate = dueDateOf(month, c.due_day)
      const payment = payments.find((p) => p.charge_id === c.id)
      return {
        id: c.id,
        label: c.label,
        amount: c.amount,
        dueDate,
        paid: Boolean(payment),
        paidDate: payment ? payment.paid_date : null,
        paidAmount: payment ? payment.amount : 0,
        late: !payment && dueDate < reference,
      }
    })
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate))

  const score = computeScore({
    envelopes,
    charges,
    savingsTarget,
    savingsDone,
    expenses,
    reference,
    daysElapsed,
    // Un mois ou rien n'a ete declare ni depense n'est pas un mois mal tenu :
    // c'est un mois sans matiere. Il ne doit pas etre note.
    hasActivity:
      income > 0 || expenses.length > 0 || envelopes.length > 0 || dueCharges.length > 0,
  })

  return {
    month,
    reference,
    daysTotal,
    daysRemaining,
    daysElapsed,
    income,
    spent,
    variableSpent,
    chargesDue,
    chargesPaid,
    chargesRemaining,
    savingsTarget,
    savingsDone,
    savingsRemaining,
    available,
    dailyBudget,
    averageDailySpend,
    health,
    healthReason,
    envelopes,
    charges,
    score,
  }
}

interface ScoreInput {
  envelopes: EnvelopeStatus[]
  charges: ChargeStatus[]
  savingsTarget: number
  savingsDone: number
  expenses: Expense[]
  reference: IsoDate
  daysElapsed: number
  hasActivity: boolean
}

/**
 * Score de discipline sur 100.
 *
 * Chaque composante annonce son bareme, ce qu'elle a accorde et pourquoi.
 * Une composante sans matiere (aucune enveloppe definie, aucune charge encore
 * echue) est declaree NON APPLICABLE et retiree du denominateur, plutot que
 * d'etre comptee comme un succes ou un echec imaginaire.
 */
export function computeScore(input: ScoreInput): DisciplineScore {
  const components: ScoreComponent[] = []

  // 1. Respect des enveloppes
  const totalPlanned = input.envelopes.reduce((s, e) => s + e.planned, 0)
  const overspend = input.envelopes.reduce((s, e) => s + Math.max(0, e.spent - e.planned), 0)
  if (totalPlanned > 0) {
    const ratio = overspend / totalPlanned
    const earned = Math.round(30 * Math.max(0, 1 - ratio * 2))
    components.push({
      key: 'enveloppes',
      label: 'Respect des enveloppes',
      max: 30,
      earned,
      applicable: true,
      detail:
        overspend === 0
          ? 'Aucune enveloppe depassee.'
          : `${formatInt(overspend)} FCFA depenses au-dela des enveloppes, sur ${formatInt(totalPlanned)} FCFA prevus.`,
    })
  } else {
    components.push({
      key: 'enveloppes',
      label: 'Respect des enveloppes',
      max: 30,
      earned: 0,
      applicable: false,
      detail: 'Aucune enveloppe budgetaire definie pour ce mois.',
    })
  }

  // 2. Taux d'epargne
  if (input.savingsTarget > 0) {
    const rate = Math.min(1, Math.max(0, input.savingsDone / input.savingsTarget))
    components.push({
      key: 'epargne',
      label: "Effort d'epargne",
      max: 25,
      earned: Math.round(25 * rate),
      applicable: true,
      detail: `${formatInt(Math.max(0, input.savingsDone))} FCFA epargnes sur les ${formatInt(input.savingsTarget)} FCFA vises.`,
    })
  } else {
    components.push({
      key: 'epargne',
      label: "Effort d'epargne",
      max: 25,
      earned: 0,
      applicable: false,
      detail: "Aucun revenu enregistre : l'objectif d'epargne du mois est nul.",
    })
  }

  // 3. Charges payees a temps
  const dueSoFar = input.charges.filter((c) => c.dueDate <= input.reference)
  if (dueSoFar.length > 0) {
    const onTime = dueSoFar.filter((c) => c.paid && c.paidDate !== null && c.paidDate <= c.dueDate)
    const earned = Math.round((20 * onTime.length) / dueSoFar.length)
    components.push({
      key: 'charges',
      label: 'Charges payees a temps',
      max: 20,
      earned,
      applicable: true,
      detail: `${onTime.length} charge(s) sur ${dueSoFar.length} reglee(s) avant l'echeance.`,
    })
  } else {
    components.push({
      key: 'charges',
      label: 'Charges payees a temps',
      max: 20,
      earned: 0,
      applicable: false,
      detail: "Aucune charge n'est encore arrivee a echeance ce mois.",
    })
  }

  // 4. Absence de depassement
  const overCount = input.envelopes.filter((e) => e.state === 'depasse').length
  if (input.envelopes.length > 0) {
    components.push({
      key: 'depassements',
      label: 'Aucun depassement',
      max: 10,
      earned: Math.max(0, 10 - 5 * overCount),
      applicable: true,
      detail:
        overCount === 0
          ? 'Aucune enveloppe en depassement.'
          : `${overCount} enveloppe(s) en depassement.`,
    })
  } else {
    components.push({
      key: 'depassements',
      label: 'Aucun depassement',
      max: 10,
      earned: 0,
      applicable: false,
      detail: 'Aucune enveloppe budgetaire definie.',
    })
  }

  // 5. Regularite de la saisie
  if (input.daysElapsed > 0 && input.hasActivity) {
    const days = new Set(input.expenses.map((e) => e.date))
    const coverage = days.size / input.daysElapsed
    const earned = Math.round(15 * Math.min(1, coverage / 0.6))
    components.push({
      key: 'regularite',
      label: 'Regularite de la saisie',
      max: 15,
      earned,
      applicable: true,
      detail: `${days.size} jour(s) avec au moins une saisie sur ${input.daysElapsed} jour(s) ecoule(s).`,
    })
  } else {
    components.push({
      key: 'regularite',
      label: 'Regularite de la saisie',
      max: 15,
      earned: 0,
      applicable: false,
      detail: input.hasActivity
        ? "Le mois n'a pas encore commence."
        : 'Aucun revenu, aucune charge ni enveloppe declares sur ce mois.',
    })
  }

  const applicableMax = components.filter((c) => c.applicable).reduce((s, c) => s + c.max, 0)
  const earned = components.filter((c) => c.applicable).reduce((s, c) => s + c.earned, 0)
  const value = applicableMax > 0 ? Math.round((100 * earned) / applicableMax) : 0

  const { band, label } = scoreBand(value, applicableMax)
  return { value, band, label, measurable: applicableMax > 0, components }
}

function scoreBand(value: number, applicableMax: number): { band: DisciplineScore['band']; label: string } {
  if (applicableMax === 0) return { band: 'a_surveiller', label: 'Pas encore mesurable' }
  if (value >= 90) return { band: 'excellent', label: 'Excellent' }
  if (value >= 75) return { band: 'bonne', label: 'Bonne discipline' }
  if (value >= 60) return { band: 'a_surveiller', label: 'A surveiller' }
  if (value >= 40) return { band: 'fragile', label: 'Situation fragile' }
  return { band: 'critique', label: 'Situation critique' }
}

/** Consequence d'une depense envisagee sur son enveloppe, AVANT enregistrement. */
export interface OverspendCheck {
  triggers: boolean
  envelopeName: string
  planned: number
  alreadySpent: number
  newAmount: number
  newTotal: number
  overBy: number
  /** Vrai quand la depense franchit seulement le seuil d'alerte, sans depasser. */
  warningOnly: boolean
}

export function checkOverspend(
  snapshot: MonthSnapshot,
  envelopeId: string | null,
  amount: number,
  warnThresholdPct: number,
): OverspendCheck | null {
  if (!envelopeId || amount <= 0) return null
  const env = snapshot.envelopes.find((e) => e.id === envelopeId)
  if (!env || env.planned <= 0) return null
  const newTotal = env.spent + amount
  const overBy = newTotal - env.planned
  const crossesWarning = (newTotal / env.planned) * 100 >= warnThresholdPct
  if (overBy <= 0 && !crossesWarning) return null
  return {
    triggers: true,
    envelopeName: env.name,
    planned: env.planned,
    alreadySpent: env.spent,
    newAmount: amount,
    newTotal,
    overBy: Math.max(0, overBy),
    warningOnly: overBy <= 0,
  }
}

export interface GoalStatus {
  id: string
  name: string
  target: number
  saved: number
  remaining: number
  progressPct: number
  targetDate: IsoDate
  monthsLeft: number
  monthlyNeeded: number
  reachable: boolean
}

export function computeGoals(ledger: Ledger, reference: IsoDate): GoalStatus[] {
  const refMonth = reference.slice(0, 7)
  return alive(ledger.goals).map<GoalStatus>((g) => {
    const pocketBalance = g.pocket_id
      ? alive(ledger.savings)
          .filter((s) => s.pocket_id === g.pocket_id && s.date <= reference)
          .reduce((sum, s) => sum + (s.kind === 'depot' ? s.amount : -s.amount), 0)
      : 0
    const saved = Math.max(0, g.initial_amount + pocketBalance)
    const remaining = Math.max(0, g.target_amount - saved)
    const monthsLeft = Math.max(0, monthsBetween(refMonth, g.target_date.slice(0, 7)))
    const monthlyNeeded = monthsLeft > 0 ? Math.ceil(remaining / monthsLeft) : remaining
    return {
      id: g.id,
      name: g.name,
      target: g.target_amount,
      saved,
      remaining,
      progressPct: g.target_amount > 0 ? Math.min(100, Math.round((saved / g.target_amount) * 100)) : 0,
      targetDate: g.target_date,
      monthsLeft,
      monthlyNeeded,
      reachable: remaining === 0 || monthsLeft > 0,
    }
  })
}

export interface PocketBalance {
  id: string
  name: string
  balance: number
}

export function computePockets(ledger: Ledger, reference: IsoDate): PocketBalance[] {
  const movements = alive(ledger.savings).filter((s) => s.date <= reference)
  return alive(ledger.pockets)
    .slice()
    .sort((a, b) => a.position - b.position)
    .map((p) => ({
      id: p.id,
      name: p.name,
      balance: movements
        .filter((m) => m.pocket_id === p.id)
        .reduce((s, m) => s + (m.kind === 'depot' ? m.amount : -m.amount), 0),
    }))
}

export interface WeeklyReport {
  from: IsoDate
  to: IsoDate
  spent: number
  expectedPace: number
  gap: number
  topEnvelopes: { name: string; amount: number }[]
  savings: number
  projectedMonthEnd: number
  willHold: boolean
  verdict: string
}

export function computeWeek(ledger: Ledger, snapshot: MonthSnapshot, reference: IsoDate): WeeklyReport {
  const from = startOfWeek(reference)
  const expenses = alive(ledger.expenses).filter(
    (e) => e.date >= from && e.date <= reference && e.charge_id === null,
  )
  const spent = expenses.reduce((s, e) => s + e.amount, 0)
  const daysCovered = Math.max(1, dayDiff(from, reference) + 1)

  const plannedVariable = snapshot.envelopes.reduce((s, e) => s + e.planned, 0)
  const expectedPace = Math.round((plannedVariable / snapshot.daysTotal) * daysCovered)

  const byEnvelope = new Map<string, number>()
  for (const e of expenses) {
    const name = snapshot.envelopes.find((x) => x.id === e.envelope_id)?.name ?? 'Hors enveloppe'
    byEnvelope.set(name, (byEnvelope.get(name) ?? 0) + e.amount)
  }
  const topEnvelopes = [...byEnvelope.entries()]
    .map(([name, amount]) => ({ name, amount }))
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 3)

  const savings = alive(ledger.savings)
    .filter((s) => s.date >= from && s.date <= reference)
    .reduce((s, m) => s + (m.kind === 'depot' ? m.amount : -m.amount), 0)

  const projectedMonthEnd = snapshot.averageDailySpend * snapshot.daysRemaining
  const willHold = projectedMonthEnd <= snapshot.available

  return {
    from,
    to: reference,
    spent,
    expectedPace,
    gap: spent - expectedPace,
    topEnvelopes,
    savings,
    projectedMonthEnd,
    willHold,
    verdict: willHold
      ? `A ce rythme, il vous resterait environ ${formatInt(snapshot.available - projectedMonthEnd)} FCFA en fin de mois.`
      : `A ce rythme, il vous manquerait environ ${formatInt(projectedMonthEnd - snapshot.available)} FCFA avant la fin du mois.`,
  }
}

function dayDiff(a: IsoDate, b: IsoDate): number {
  const [ya, ma, da] = a.split('-').map(Number)
  const [yb, mb, db] = b.split('-').map(Number)
  const ta = Date.UTC(ya, ma - 1, da)
  const tb = Date.UTC(yb, mb - 1, db)
  return Math.round((tb - ta) / 86400000)
}

export interface MonthlyReport {
  month: IsoMonth
  income: number
  charges: number
  expenses: number
  savings: number
  savingsRatePct: number
  balance: number
  overspentEnvelopes: { name: string; over: number }[]
  previous: { income: number; savings: number; savingsRatePct: number; expenses: number } | null
  conclusion: string
}

export function computeMonthlyReport(
  ledger: Ledger,
  month: IsoMonth,
  previousMonth: IsoMonth | null,
  reference: IsoDate,
): MonthlyReport {
  const snap = computeMonth(ledger, month, reference)
  const savingsRatePct = snap.income > 0 ? Math.round((snap.savingsDone / snap.income) * 100) : 0
  const overspentEnvelopes = snap.envelopes
    .filter((e) => e.spent > e.planned && e.planned > 0)
    .map((e) => ({ name: e.name, over: e.spent - e.planned }))
    .sort((a, b) => b.over - a.over)

  let previous: MonthlyReport['previous'] = null
  if (previousMonth) {
    const prev = computeMonth(ledger, previousMonth, `${previousMonth}-28`)
    previous = {
      income: prev.income,
      savings: prev.savingsDone,
      savingsRatePct: prev.income > 0 ? Math.round((prev.savingsDone / prev.income) * 100) : 0,
      expenses: prev.spent,
    }
  }

  const parts: string[] = []
  if (snap.income > 0) {
    parts.push(`Vous avez epargne ${savingsRatePct} % de vos revenus ce mois-ci`)
    if (previous) parts[0] += `, contre ${previous.savingsRatePct} % le mois precedent`
    parts[0] += '.'
  } else {
    parts.push("Aucun revenu n'a ete enregistre sur ce mois.")
  }
  if (overspentEnvelopes.length > 0) {
    const worst = overspentEnvelopes[0]
    parts.push(
      `Votre principal depassement vient de la categorie ${worst.name}, pour ${formatInt(worst.over)} FCFA.`,
    )
    if (snap.income > 0) {
      const potential = Math.round(((snap.savingsDone + worst.over) / snap.income) * 100)
      parts.push(
        `En la ramenant dans son enveloppe le mois prochain, votre taux d'epargne atteindrait ${potential} %.`,
      )
    }
  } else if (snap.envelopes.length > 0) {
    parts.push('Aucune enveloppe budgetaire n\'a ete depassee.')
  }

  return {
    month,
    income: snap.income,
    charges: snap.chargesDue,
    expenses: snap.spent,
    savings: snap.savingsDone,
    savingsRatePct,
    balance: snap.income - snap.spent - snap.savingsDone,
    overspentEnvelopes,
    previous,
    conclusion: parts.join(' '),
  }
}

export function formatInt(n: number): string {
  const sign = n < 0 ? '-' : ''
  const digits = Math.abs(Math.round(n)).toString()
  return sign + digits.replace(/\B(?=(\d{3})+(?!\d))/g, ' ')
}
