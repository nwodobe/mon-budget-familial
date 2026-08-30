import { monthLabel } from '../domain/dates'
import { computeMonth, computeMonthlyReport, formatInt } from '../domain/engine'
import type { IsoMonth, Ledger } from '../domain/types'

/** Exports locaux : rien ne transite par un serveur. */

function escapeCsv(value: string | number): string {
  const s = String(value)
  return /[",;\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

export function expensesToCsv(ledger: Ledger, month: IsoMonth): string {
  const snapshot = computeMonth(ledger, month, `${month}-31`)
  const envelopeName = (id: string | null) =>
    id ? (snapshot.envelopes.find((e) => e.id === id)?.name ?? '') : ''
  const chargeLabel = (id: string | null) =>
    id ? (ledger.charges.find((c) => c.id === id)?.label ?? '') : ''

  const header = ['Date', 'Montant FCFA', 'Enveloppe', 'Charge reglee', 'Moyen', 'Personne', 'Description', 'Justification']
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
      ]
        .map(escapeCsv)
        .join(';'),
    )
  return [header.join(';'), ...lines].join('\r\n')
}

export function monthlyReportToText(ledger: Ledger, month: IsoMonth, previous: IsoMonth | null): string {
  const r = computeMonthlyReport(ledger, month, previous, `${month}-31`)
  const s = computeMonth(ledger, month, `${month}-31`)
  const lines = [
    `RAPPORT MENSUEL - ${monthLabel(month).toUpperCase()}`,
    `Foyer : ${ledger.settings.household_name}`,
    '',
    `Revenus                 ${formatInt(r.income)} FCFA`,
    `Charges obligatoires    ${formatInt(r.charges)} FCFA`,
    `Depenses totales        ${formatInt(r.expenses)} FCFA`,
    `Epargne                 ${formatInt(r.savings)} FCFA`,
    `Taux d'epargne          ${r.savingsRatePct} %`,
    `Solde final             ${formatInt(r.balance)} FCFA`,
    `Score de discipline     ${s.score.value}/100 (${s.score.label})`,
    '',
    'ENVELOPPES',
    ...s.envelopes.map(
      (e) => `  ${e.name.padEnd(22)} prevu ${formatInt(e.planned)} / depense ${formatInt(e.spent)} / reste ${formatInt(e.remaining)}`,
    ),
    '',
    'DETAIL DU SCORE',
    ...s.score.components.map(
      (c) => `  ${c.label.padEnd(28)} ${c.applicable ? `${c.earned}/${c.max}` : 'non applicable'} - ${c.detail}`,
    ),
    '',
    'CONCLUSION',
    `  ${r.conclusion}`,
  ]
  return lines.join('\r\n')
}

export function backupJson(ledger: Ledger): string {
  return JSON.stringify({ version: 1, exported_at: new Date().toISOString(), ledger }, null, 2)
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
