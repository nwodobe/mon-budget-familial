import { monthLabel } from '../domain/dates'
import { computeMonthlyReport } from '../domain/engine'
import { computeMonthV2, formatInt } from '../domain/disciplineV2'
import { formatMoney } from '../domain/currency'
import type { IsoMonth, Ledger } from '../domain/types'

/** Exports locaux : rien ne transite par un serveur. */

function escapeCsv(value: string | number): string {
  const s = String(value)
  return /[",;\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

export function expensesToCsv(ledger: Ledger, month: IsoMonth): string {
  const snapshot = computeMonthV2(ledger, month, `${month}-31`)
  const envelopeName = (id: string | null) =>
    id ? (snapshot.envelopes.find((e) => e.id === id)?.name ?? '') : ''
  const chargeLabel = (id: string | null) =>
    id ? (ledger.charges.find((c) => c.id === id)?.label ?? '') : ''

  const header = ['Date', `Montant ${ledger.settings.currency}`, 'Enveloppe', 'Charge réglée', 'Moyen', 'Personne', 'Description', 'Justification', 'Alertes discipline']
  const lines = ledger.expenses
    .filter((e) => e.deleted_at === null && e.date.slice(0, 7) === month)
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((e) =>
      [
        e.date,
        e.amount,
        envelopeName(e.envelope_id),
        chargeLabel(e.charge_id),
        e.method,
        e.member,
        e.description,
        e.override_reason,
        (e.discipline_flags ?? []).join(','),
      ]
        .map(escapeCsv)
        .join(';'),
    )
  return [header.join(';'), ...lines].join('\r\n')
}

export function monthlyReportToText(
  ledger: Ledger,
  month: IsoMonth,
  previous: IsoMonth | null,
  reference: string = `${month}-31`,
): string {
  const legacy = computeMonthlyReport(ledger, month, previous, reference)
  const s = computeMonthV2(ledger, month, reference)
  const money = (value: number) => formatMoney(value, ledger.settings.currency)
  const savingsRate = s.income > 0 ? Math.round((s.savingsDone / s.income) * 100) : 0
  const lines = [
    `RAPPORT MENSUEL - ${monthLabel(month).toUpperCase()}`,
    `Foyer : ${ledger.settings.household_name}`,
    `Devise : ${ledger.settings.currency}`,
    '',
    `Revenus encaissés       ${money(s.income)}`,
    `Revenus encore attendus ${money(s.incomeExpected)}`,
    `Charges obligatoires    ${money(s.chargesDue)}`,
    `Dépenses totales        ${money(s.spent)}`,
    `Épargne                 ${money(s.savingsDone)}`,
    `Taux d'épargne          ${savingsRate} %`,
    `Disponible sûr          ${money(s.spendable)}`,
    `Déficit à couvrir       ${money(s.deficit)}`,
    `Score de discipline     ${s.score.measurable ? `${s.score.value}/100 (${s.score.label})` : 'non mesurable'}`,
    '',
    'ENVELOPPES',
    ...s.envelopes.map(
      (e) => `  ${e.name.padEnd(22)} prévu ${money(e.planned)} / dépensé ${money(e.spent)} / reste ${money(e.remaining)}`,
    ),
    '',
    'À PRÉPARER',
    ...(s.provisions.length > 0
      ? s.provisions.map((p) => `  ${p.name.padEnd(22)} cible ${money(p.target)} / acquis ${money(p.funded)} / recommandé ${money(p.monthlyNeeded)}/mois`)
      : ['  Aucune provision active.']),
    '',
    'DÉTAIL DU SCORE',
    ...s.score.components.map(
      (c) => `  ${c.label.padEnd(30)} ${c.applicable ? `${c.earned}/${c.max}` : 'non applicable'} - ${c.detail} Conseil : ${c.advice}`,
    ),
    '',
    'CONCLUSION',
    `  ${s.healthReason}`,
    legacy.previous ? `  Mois précédent : taux d'épargne ${legacy.previous.savingsRatePct} %, dépenses ${money(legacy.previous.expenses)}.` : '',
  ].filter((line) => line !== '')
  return lines.join('\r\n')
}

export function backupJson(ledger: Ledger): string {
  return JSON.stringify({ version: 2, exported_at: new Date().toISOString(), ledger }, null, 2)
}

export function download(filename: string, content: string, mime: string): void {
  const blob = new Blob([content], { type: `${mime};charset=utf-8` })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
