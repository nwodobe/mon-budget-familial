import { describe, expect, it } from 'vitest'
import {
  chargeIsDue,
  checkOverspend,
  computeGoals,
  computeMonth,
  computeMonthlyReport,
  computePockets,
  computeWeek,
  formatInt,
} from './engine'
import { daysInMonth, dueDateOf, monthsBetween, remainingDays, startOfWeek } from './dates'
import { emptyLedger, type Ledger } from './types'

const M = '2026-08'
const REF = '2026-08-16'

function ledger(): Ledger {
  return emptyLedger()
}

const meta = (id: string) => ({ id, updated_at: '2026-08-01T00:00:00.000Z', deleted_at: null })

function addIncome(l: Ledger, id: string, amount: number, date = `${M}-01`) {
  l.incomes.push({
    ...meta(id),
    date,
    amount,
    source: 'Salaire',
    method: 'banque',
    recurring: true,
    note: '',
  })
}

function addEnvelope(l: Ledger, id: string, name: string, planned: number, position = 0) {
  l.envelopes.push({ ...meta(id), name, planned, position })
}

function addExpense(
  l: Ledger,
  id: string,
  amount: number,
  date: string,
  envelope_id: string | null = null,
  charge_id: string | null = null,
) {
  l.expenses.push({
    ...meta(id),
    date,
    amount,
    envelope_id,
    method: 'especes',
    description: '',
    member: 'Moi',
    charge_id,
    override_reason: '',
  })
}

function addCharge(
  l: Ledger,
  id: string,
  label: string,
  amount: number,
  due_day: number,
  frequency: 'mensuelle' | 'trimestrielle' | 'annuelle' | 'ponctuelle' = 'mensuelle',
  start_month = '2026-01',
) {
  l.charges.push({ ...meta(id), label, amount, due_day, frequency, start_month, active: true })
}

function payCharge(l: Ledger, id: string, charge_id: string, amount: number, paid_date: string, expense_id: string | null) {
  l.charge_payments.push({ ...meta(id), charge_id, month: paid_date.slice(0, 7), paid_date, amount, expense_id })
}

function addSavings(l: Ledger, id: string, amount: number, date: string, pocket_id: string, kind: 'depot' | 'retrait' = 'depot') {
  l.savings.push({ ...meta(id), date, amount, pocket_id, kind, note: '' })
}

// ---------------------------------------------------------------------------
// Calendrier
// ---------------------------------------------------------------------------

describe('calendrier', () => {
  it('compte les jours du mois, annees bissextiles comprises', () => {
    expect(daysInMonth('2026-02')).toBe(28)
    expect(daysInMonth('2028-02')).toBe(29)
    expect(daysInMonth('2026-08')).toBe(31)
    expect(daysInMonth('2026-04')).toBe(30)
  })

  it('inclut le jour de reference dans les jours restants', () => {
    expect(remainingDays('2026-08', '2026-08-16')).toBe(16)
    expect(remainingDays('2026-08', '2026-08-31')).toBe(1)
    expect(remainingDays('2026-08', '2026-08-01')).toBe(31)
  })

  it('rend le mois entier avant, et zero apres', () => {
    expect(remainingDays('2026-08', '2026-07-20')).toBe(31)
    expect(remainingDays('2026-08', '2026-09-01')).toBe(0)
  })

  it("rabat l'echeance sur le dernier jour du mois quand le jour n'existe pas", () => {
    expect(dueDateOf('2026-02', 31)).toBe('2026-02-28')
    expect(dueDateOf('2026-08', 5)).toBe('2026-08-05')
    expect(dueDateOf('2026-08', 0)).toBe('2026-08-01')
  })

  it('compte les mois entre deux mois', () => {
    expect(monthsBetween('2026-08', '2027-11')).toBe(15)
    expect(monthsBetween('2026-08', '2026-08')).toBe(0)
    expect(monthsBetween('2026-08', '2026-05')).toBe(-3)
  })

  it('ramene au lundi de la semaine', () => {
    expect(startOfWeek('2026-08-16')).toBe('2026-08-10') // dimanche -> lundi precedent
    expect(startOfWeek('2026-08-10')).toBe('2026-08-10')
  })
})

// ---------------------------------------------------------------------------
// Echeancier des charges
// ---------------------------------------------------------------------------

describe('echeancier des charges', () => {
  it('honore les periodicites', () => {
    const l = ledger()
    addCharge(l, 'c1', 'Loyer', 300000, 5, 'mensuelle', '2026-01')
    addCharge(l, 'c2', 'Assurance', 90000, 10, 'trimestrielle', '2026-02')
    addCharge(l, 'c3', 'Scolarite', 450000, 15, 'annuelle', '2026-09')
    addCharge(l, 'c4', 'Reparation', 60000, 20, 'ponctuelle', '2026-08')

    expect(chargeIsDue(l.charges[0], '2026-08')).toBe(true)
    expect(chargeIsDue(l.charges[1], '2026-08')).toBe(true) // fev + 6 mois
    expect(chargeIsDue(l.charges[1], '2026-09')).toBe(false)
    expect(chargeIsDue(l.charges[2], '2026-08')).toBe(false) // pas encore commence
    expect(chargeIsDue(l.charges[2], '2027-09')).toBe(true)
    expect(chargeIsDue(l.charges[3], '2026-08')).toBe(true)
    expect(chargeIsDue(l.charges[3], '2026-09')).toBe(false)
  })

  it('ignore une charge desactivee', () => {
    const l = ledger()
    addCharge(l, 'c1', 'Canal+', 25000, 5)
    l.charges[0].active = false
    expect(chargeIsDue(l.charges[0], M)).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// Disponible a depenser : le coeur du produit
// ---------------------------------------------------------------------------

describe('disponible a depenser', () => {
  it("retient l'epargne et les charges avant tout", () => {
    const l = ledger()
    l.settings.savings_rate_pct = 15
    addIncome(l, 'i1', 1500000)
    addCharge(l, 'c1', 'Loyer', 300000, 5)
    addCharge(l, 'c2', 'Ecole', 150000, 10)

    const s = computeMonth(l, M, REF)
    expect(s.income).toBe(1500000)
    expect(s.chargesDue).toBe(450000)
    expect(s.chargesRemaining).toBe(450000)
    expect(s.savingsTarget).toBe(225000)
    expect(s.savingsRemaining).toBe(225000)
    // 1 500 000 - 0 depense - 0 epargne faite - 450 000 charges - 225 000 epargne a reserver
    expect(s.available).toBe(825000)
  })

  it('etale le disponible sur les jours restants, jour courant inclus', () => {
    const l = ledger()
    l.settings.savings_rate_pct = 0
    addIncome(l, 'i1', 320000)
    const s = computeMonth(l, M, REF) // 16 jours restants
    expect(s.daysRemaining).toBe(16)
    expect(s.dailyBudget).toBe(20000)
  })

  it('arrondit le budget quotidien vers le bas, jamais vers le haut', () => {
    const l = ledger()
    l.settings.savings_rate_pct = 0
    addIncome(l, 'i1', 100000)
    const s = computeMonth(l, M, REF) // 16 jours
    expect(s.dailyBudget).toBe(6250)

    const l2 = ledger()
    l2.settings.savings_rate_pct = 0
    addIncome(l2, 'i1', 100001)
    // 6250,06 -> 6250 : promettre 6251 par jour ferait terminer le mois a decouvert.
    expect(computeMonth(l2, M, REF).dailyBudget).toBe(6250)
  })

  it("ne compte pas deux fois une charge payee : elle sort des engagements et entre dans les depenses", () => {
    const l = ledger()
    l.settings.savings_rate_pct = 0
    addIncome(l, 'i1', 1000000)
    addCharge(l, 'c1', 'Loyer', 300000, 5)

    const avant = computeMonth(l, M, REF)
    expect(avant.available).toBe(700000)

    addExpense(l, 'e1', 300000, `${M}-05`, null, 'c1')
    payCharge(l, 'p1', 'c1', 300000, `${M}-05`, 'e1')

    const apres = computeMonth(l, M, REF)
    expect(apres.chargesRemaining).toBe(0)
    expect(apres.spent).toBe(300000)
    // Le disponible ne bouge pas : le meme argent n'est pas soustrait deux fois.
    expect(apres.available).toBe(700000)
  })

  it("compte le reglement d'une charge saisi sans depense associee", () => {
    const l = ledger()
    l.settings.savings_rate_pct = 0
    addIncome(l, 'i1', 1000000)
    addCharge(l, 'c1', 'Loyer', 300000, 5)
    payCharge(l, 'p1', 'c1', 300000, `${M}-05`, null)

    const s = computeMonth(l, M, REF)
    expect(s.spent).toBe(300000)
    expect(s.chargesRemaining).toBe(0)
    expect(s.available).toBe(700000)
  })

  it("ne compte pas deux fois l'epargne : ce qui est verse cesse d'etre a reserver", () => {
    const l = ledger()
    l.settings.savings_rate_pct = 20
    addIncome(l, 'i1', 1000000)
    l.pockets.push({ ...meta('po1'), name: 'Securite', position: 0 })

    const avant = computeMonth(l, M, REF)
    expect(avant.savingsTarget).toBe(200000)
    expect(avant.available).toBe(800000)

    addSavings(l, 's1', 200000, `${M}-02`, 'po1')
    const apres = computeMonth(l, M, REF)
    expect(apres.savingsDone).toBe(200000)
    expect(apres.savingsRemaining).toBe(0)
    expect(apres.available).toBe(800000)
  })

  it("compte l'epargne au-dela de l'objectif comme de l'argent reellement sorti", () => {
    const l = ledger()
    l.settings.savings_rate_pct = 10
    addIncome(l, 'i1', 1000000)
    l.pockets.push({ ...meta('po1'), name: 'Securite', position: 0 })
    addSavings(l, 's1', 300000, `${M}-02`, 'po1')

    const s = computeMonth(l, M, REF)
    expect(s.savingsTarget).toBe(100000)
    expect(s.savingsRemaining).toBe(0)
    expect(s.available).toBe(700000)
  })

  it('un retrait d epargne revient dans le disponible, sans depasser l objectif', () => {
    const l = ledger()
    l.settings.savings_rate_pct = 10
    addIncome(l, 'i1', 1000000)
    l.pockets.push({ ...meta('po1'), name: 'Securite', position: 0 })
    addSavings(l, 's1', 150000, `${M}-02`, 'po1')
    addSavings(l, 's2', 50000, `${M}-10`, 'po1', 'retrait')

    const s = computeMonth(l, M, REF)
    expect(s.savingsDone).toBe(100000)
    expect(s.savingsRemaining).toBe(0)
    expect(s.available).toBe(900000)
  })

  it('rend un disponible negatif quand les engagements depassent le revenu', () => {
    const l = ledger()
    l.settings.savings_rate_pct = 0
    addIncome(l, 'i1', 400000)
    addCharge(l, 'c1', 'Loyer', 300000, 5)
    addEnvelope(l, 'en1', 'Alimentation', 200000)
    addExpense(l, 'e1', 250000, `${M}-10`, 'en1')

    const s = computeMonth(l, M, REF)
    expect(s.available).toBe(-150000)
    expect(s.health).toBe('danger')
  })

  it('signale un rythme de depense intenable avant meme le decouvert', () => {
    const l = ledger()
    l.settings.savings_rate_pct = 0
    addIncome(l, 'i1', 1000000)
    addEnvelope(l, 'en1', 'Alimentation', 900000)
    // 15 jours ecoules, 850 000 depenses : 56 666/j alors qu'il reste 150 000 pour 16 jours.
    addExpense(l, 'e1', 850000, `${M}-10`, 'en1')

    const s = computeMonth(l, M, REF)
    expect(s.available).toBe(150000)
    expect(s.averageDailySpend).toBe(56667)
    expect(s.dailyBudget).toBe(9375)
    expect(s.health).toBe('attention')
  })

  it('ne divise pas par zero le dernier jour passe', () => {
    const l = ledger()
    addIncome(l, 'i1', 500000)
    const s = computeMonth(l, M, '2026-09-02')
    expect(s.daysRemaining).toBe(0)
    expect(s.dailyBudget).toBe(s.available)
    expect(Number.isFinite(s.dailyBudget)).toBe(true)
  })

  it('ignore les lignes effacees', () => {
    const l = ledger()
    addIncome(l, 'i1', 500000)
    addIncome(l, 'i2', 500000)
    l.incomes[1].deleted_at = '2026-08-10T00:00:00.000Z'
    expect(computeMonth(l, M, REF).income).toBe(500000)
  })

  it('ignore les mouvements des autres mois', () => {
    const l = ledger()
    addIncome(l, 'i1', 500000, '2026-07-30')
    addIncome(l, 'i2', 600000, '2026-08-01')
    addExpense(l, 'e1', 100000, '2026-07-31')
    const s = computeMonth(l, M, REF)
    expect(s.income).toBe(600000)
    expect(s.spent).toBe(0)
  })
})

// ---------------------------------------------------------------------------
// Enveloppes
// ---------------------------------------------------------------------------

describe('enveloppes', () => {
  it('mesure la consommation et les etats', () => {
    const l = ledger()
    l.settings.warn_threshold_pct = 80
    addEnvelope(l, 'en1', 'Alimentation', 250000, 0)
    addEnvelope(l, 'en2', 'Transport', 120000, 1)
    addEnvelope(l, 'en3', 'Loisirs', 60000, 2)
    addExpense(l, 'e1', 175000, `${M}-05`, 'en1') // 70 %
    addExpense(l, 'e2', 100000, `${M}-06`, 'en2') // 83 %
    addExpense(l, 'e3', 85000, `${M}-07`, 'en3') // 141 %

    const s = computeMonth(l, M, REF)
    expect(s.envelopes[0]).toMatchObject({ name: 'Alimentation', spent: 175000, remaining: 75000, usedPct: 70, state: 'sain' })
    expect(s.envelopes[1].state).toBe('attention')
    expect(s.envelopes[2]).toMatchObject({ remaining: -25000, state: 'depasse' })
  })

  it('applique la redefinition du mois quand elle existe', () => {
    const l = ledger()
    addEnvelope(l, 'en1', 'Alimentation', 250000)
    l.budget_overrides.push({ ...meta('bo1'), month: M, envelope_id: 'en1', planned: 300000 })
    expect(computeMonth(l, M, REF).envelopes[0].planned).toBe(300000)
    expect(computeMonth(l, '2026-09', '2026-09-10').envelopes[0].planned).toBe(250000)
  })

  it('respecte l ordre d affichage', () => {
    const l = ledger()
    addEnvelope(l, 'a', 'Zebre', 1000, 2)
    addEnvelope(l, 'b', 'Alpha', 1000, 0)
    addEnvelope(l, 'c', 'Milieu', 1000, 1)
    expect(computeMonth(l, M, REF).envelopes.map((e) => e.name)).toEqual(['Alpha', 'Milieu', 'Zebre'])
  })
})

// ---------------------------------------------------------------------------
// Garde-fou de depassement
// ---------------------------------------------------------------------------

describe('alerte de depassement', () => {
  it('annonce le depassement AVANT enregistrement, avec les chiffres exacts', () => {
    const l = ledger()
    addEnvelope(l, 'en1', 'Restaurant', 60000)
    addExpense(l, 'e1', 55000, `${M}-05`, 'en1')
    const s = computeMonth(l, M, REF)

    const check = checkOverspend(s, 'en1', 30000, 80)
    expect(check).not.toBeNull()
    expect(check).toMatchObject({
      envelopeName: 'Restaurant',
      planned: 60000,
      alreadySpent: 55000,
      newAmount: 30000,
      newTotal: 85000,
      overBy: 25000,
      warningOnly: false,
    })
  })

  it('signale le franchissement du seuil d alerte sans depassement', () => {
    const l = ledger()
    addEnvelope(l, 'en1', 'Carburant', 100000)
    addExpense(l, 'e1', 40000, `${M}-05`, 'en1')
    const s = computeMonth(l, M, REF)

    const check = checkOverspend(s, 'en1', 45000, 80)
    expect(check?.warningOnly).toBe(true)
    expect(check?.overBy).toBe(0)
  })

  it('se tait quand la depense reste largement dans l enveloppe', () => {
    const l = ledger()
    addEnvelope(l, 'en1', 'Carburant', 100000)
    const s = computeMonth(l, M, REF)
    expect(checkOverspend(s, 'en1', 10000, 80)).toBeNull()
  })

  it('se tait hors enveloppe ou sans budget prevu', () => {
    const l = ledger()
    addEnvelope(l, 'en1', 'Divers', 0)
    const s = computeMonth(l, M, REF)
    expect(checkOverspend(s, null, 50000, 80)).toBeNull()
    expect(checkOverspend(s, 'en1', 50000, 80)).toBeNull()
    expect(checkOverspend(s, 'inconnue', 50000, 80)).toBeNull()
  })
})

// ---------------------------------------------------------------------------
// Score de discipline
// ---------------------------------------------------------------------------

describe('score de discipline', () => {
  it('accorde le maximum a un mois parfaitement tenu', () => {
    const l = ledger()
    l.settings.savings_rate_pct = 10
    addIncome(l, 'i1', 1000000)
    addEnvelope(l, 'en1', 'Alimentation', 200000)
    addCharge(l, 'c1', 'Loyer', 300000, 5)
    payCharge(l, 'p1', 'c1', 300000, `${M}-03`, null)
    l.pockets.push({ ...meta('po1'), name: 'Securite', position: 0 })
    addSavings(l, 's1', 100000, `${M}-02`, 'po1')
    for (let d = 1; d <= 15; d++) {
      addExpense(l, `e${d}`, 5000, `${M}-${String(d).padStart(2, '0')}`, 'en1')
    }

    const s = computeMonth(l, M, REF)
    expect(s.score.value).toBe(100)
    expect(s.score.band).toBe('excellent')
  })

  it('sanctionne le depassement, le defaut d epargne et le retard de charge', () => {
    const l = ledger()
    l.settings.savings_rate_pct = 20
    addIncome(l, 'i1', 1000000)
    addEnvelope(l, 'en1', 'Restaurant', 100000)
    addExpense(l, 'e1', 200000, `${M}-05`, 'en1')
    addCharge(l, 'c1', 'Loyer', 300000, 5) // echue le 05, non payee au 16

    const s = computeMonth(l, M, REF)
    const byKey = Object.fromEntries(s.score.components.map((c) => [c.key, c]))
    expect(byKey.enveloppes.earned).toBe(0) // 100 % de depassement
    expect(byKey.epargne.earned).toBe(0)
    expect(byKey.charges.earned).toBe(0)
    expect(byKey.depassements.earned).toBe(5)
    expect(s.score.value).toBeLessThan(40)
    expect(s.score.band).toBe('critique')
  })

  it('retire du bareme les composantes sans matiere au lieu de les inventer', () => {
    const l = ledger()
    addIncome(l, 'i1', 500000)
    l.settings.savings_rate_pct = 0
    const s = computeMonth(l, M, REF)
    const applicables = s.score.components.filter((c) => c.applicable).map((c) => c.key)
    expect(applicables).toEqual(['regularite'])
    expect(s.score.components.every((c) => c.detail.length > 0)).toBe(true)
  })

  it('ne note pas un mois sans aucune donnee au lieu de le declarer critique', () => {
    const s = computeMonth(ledger(), M, REF)
    expect(s.score.measurable).toBe(false)
    expect(s.score.label).toBe('Pas encore mesurable')
    expect(s.score.components.every((c) => !c.applicable)).toBe(true)
  })

  it('redevient mesurable des qu une enveloppe est declaree, meme sans revenu', () => {
    const l = ledger()
    addEnvelope(l, 'en1', 'Alimentation', 100000)
    const s = computeMonth(l, M, REF)
    expect(s.score.measurable).toBe(true)
  })

  it('compte une charge payee en retard comme non tenue', () => {
    const l = ledger()
    addCharge(l, 'c1', 'Electricite', 75000, 5)
    payCharge(l, 'p1', 'c1', 75000, `${M}-12`, null)
    const s = computeMonth(l, M, REF)
    const charges = s.score.components.find((c) => c.key === 'charges')
    expect(charges?.applicable).toBe(true)
    expect(charges?.earned).toBe(0)
  })

  it('ne juge pas une charge dont l echeance n est pas arrivee', () => {
    const l = ledger()
    addCharge(l, 'c1', 'Internet', 30000, 28)
    const s = computeMonth(l, M, REF) // reference au 16
    expect(s.score.components.find((c) => c.key === 'charges')?.applicable).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// Objectifs et poches
// ---------------------------------------------------------------------------

describe('objectifs', () => {
  it("calcule l'effort mensuel necessaire", () => {
    const l = ledger()
    l.pockets.push({ ...meta('po1'), name: 'Vacances', position: 0 })
    addSavings(l, 's1', 750000, '2026-06-10', 'po1')
    l.goals.push({
      ...meta('g1'),
      name: 'Vacances Thailande',
      target_amount: 3000000,
      target_date: '2027-11-30',
      pocket_id: 'po1',
      initial_amount: 0,
    })

    const [g] = computeGoals(l, REF)
    expect(g.saved).toBe(750000)
    expect(g.remaining).toBe(2250000)
    expect(g.progressPct).toBe(25)
    expect(g.monthsLeft).toBe(15)
    expect(g.monthlyNeeded).toBe(150000)
    expect(g.reachable).toBe(true)
  })

  it("declare non atteignable un objectif dont la date est passee et le montant non reuni", () => {
    const l = ledger()
    l.goals.push({
      ...meta('g1'),
      name: 'Retard',
      target_amount: 1000000,
      target_date: '2026-07-01',
      pocket_id: null,
      initial_amount: 200000,
    })
    const [g] = computeGoals(l, REF)
    expect(g.monthsLeft).toBe(0)
    expect(g.monthlyNeeded).toBe(800000)
    expect(g.reachable).toBe(false)
  })

  it('ignore les versements posterieurs a la date de reference', () => {
    const l = ledger()
    l.pockets.push({ ...meta('po1'), name: 'Voiture', position: 0 })
    addSavings(l, 's1', 100000, `${M}-25`, 'po1')
    expect(computePockets(l, REF)[0].balance).toBe(0)
    expect(computePockets(l, `${M}-31`)[0].balance).toBe(100000)
  })
})

// ---------------------------------------------------------------------------
// Rapports
// ---------------------------------------------------------------------------

describe('rapports', () => {
  it('projette la fin de mois a partir du rythme observe', () => {
    const l = ledger()
    l.settings.savings_rate_pct = 0
    addIncome(l, 'i1', 1000000)
    addEnvelope(l, 'en1', 'Alimentation', 310000)
    addExpense(l, 'e1', 60000, `${M}-10`, 'en1')
    addExpense(l, 'e2', 40000, `${M}-14`, 'en1')

    const s = computeMonth(l, M, REF)
    const w = computeWeek(l, s, REF)
    expect(w.from).toBe('2026-08-10')
    expect(w.spent).toBe(100000)
    expect(w.topEnvelopes[0]).toEqual({ name: 'Alimentation', amount: 100000 })
    expect(w.willHold).toBe(true)
  })

  it("compare au mois precedent et nomme le premier depassement", () => {
    const l = ledger()
    l.settings.savings_rate_pct = 15
    l.pockets.push({ ...meta('po1'), name: 'Securite', position: 0 })
    addIncome(l, 'i0', 1000000, '2026-07-01')
    addSavings(l, 's0', 80000, '2026-07-05', 'po1')
    addIncome(l, 'i1', 1000000)
    addSavings(l, 's1', 120000, `${M}-05`, 'po1')
    addEnvelope(l, 'en1', 'Restaurant', 50000)
    addExpense(l, 'e1', 85000, `${M}-09`, 'en1')

    const r = computeMonthlyReport(l, M, '2026-07', REF)
    expect(r.savingsRatePct).toBe(12)
    expect(r.previous?.savingsRatePct).toBe(8)
    expect(r.overspentEnvelopes[0]).toEqual({ name: 'Restaurant', over: 35000 })
    expect(r.conclusion).toContain('12 %')
    expect(r.conclusion).toContain('8 %')
    expect(r.conclusion).toContain('Restaurant')
  })

  it('se passe de mois precedent sans casser', () => {
    const l = ledger()
    addIncome(l, 'i1', 500000)
    const r = computeMonthlyReport(l, M, null, REF)
    expect(r.previous).toBeNull()
    expect(r.conclusion.length).toBeGreaterThan(0)
  })
})

describe('formatage', () => {
  it('separe les milliers par une espace', () => {
    expect(formatInt(1500000)).toBe('1 500 000')
    expect(formatInt(0)).toBe('0')
    expect(formatInt(-25000)).toBe('-25 000')
    expect(formatInt(999)).toBe('999')
  })
})

// ---------------------------------------------------------------------------
// Le parcours complet demande : revenu -> charges -> epargne -> depenses
// ---------------------------------------------------------------------------

describe('parcours complet', () => {
  it('recalcule le disponible a chaque etape du parcours', () => {
    const l = ledger()
    l.settings.savings_rate_pct = 15

    // 1. Salaire
    addIncome(l, 'i1', 1500000)
    expect(computeMonth(l, M, REF).available).toBe(1275000)

    // 2. Loyer et ecole declares comme charges
    addCharge(l, 'c1', 'Loyer', 300000, 5)
    addCharge(l, 'c2', 'Ecole', 150000, 10)
    expect(computeMonth(l, M, REF).available).toBe(825000)

    // 3. Epargne versee : deja retenue, le disponible ne bouge pas
    l.pockets.push({ ...meta('po1'), name: 'Securite', position: 0 })
    addSavings(l, 's1', 225000, `${M}-02`, 'po1')
    expect(computeMonth(l, M, REF).available).toBe(825000)

    // 4. Loyer paye : sort des engagements, entre dans les depenses
    addExpense(l, 'e1', 300000, `${M}-05`, null, 'c1')
    payCharge(l, 'p1', 'c1', 300000, `${M}-05`, 'e1')
    expect(computeMonth(l, M, REF).available).toBe(825000)

    // 5. Depenses courantes
    addEnvelope(l, 'en1', 'Alimentation', 250000)
    addExpense(l, 'e2', 175000, `${M}-12`, 'en1')
    const s = computeMonth(l, M, REF)
    expect(s.available).toBe(650000)
    expect(s.dailyBudget).toBe(40625)
    expect(s.envelopes[0].remaining).toBe(75000)
    expect(s.charges.find((c) => c.label === 'Loyer')?.paid).toBe(true)
    expect(s.charges.find((c) => c.label === 'Ecole')?.paid).toBe(false)
  })
})
