import { useState } from 'react'
import { backupJson, download } from '../data/exporter'
import { clearLocal } from '../data/storage'
import { clearPin, pinIsSet, setPin } from '../data/pin'
import { isCloudConfigured } from '../data/supabase'
import { currencyMeta, SUPPORTED_CURRENCIES, type CurrencyCode } from '../domain/currency'
import { emptyLedger, type Ledger } from '../domain/types'
import { currencyText, useI18n } from '../i18n'
import { useApp } from '../state/AppContext'
import { Card, Field, Sheet } from './common'

export default function Profil({ go }: { go: (s: string) => void }) {
  const {
    ledger,
    meta,
    session,
    online,
    syncing,
    lastSync,
    hideAmounts,
    setHideAmounts,
    updateSettings,
    replaceLedger,
    runSync,
    signOut,
  } = useApp()
  const { language, locale, setLanguage, t } = useI18n()
  const [newMember, setNewMember] = useState('')
  const [pinSheet, setPinSheet] = useState(false)
  const [currencySheet, setCurrencySheet] = useState(false)
  const [hasPin, setHasPin] = useState(pinIsSet())
  const [confirmReset, setConfirmReset] = useState(false)
  const [importError, setImportError] = useState('')

  function importBackup(file: File) {
    const reader = new FileReader()
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result)) as { ledger?: Ledger }
        if (!parsed.ledger || !Array.isArray(parsed.ledger.expenses)) {
          setImportError(t('profile.badBackup'))
          return
        }
        replaceLedger({ ...emptyLedger(), ...parsed.ledger, settings: { ...emptyLedger().settings, ...(parsed.ledger.settings ?? {}) } })
        setImportError('')
      } catch {
        setImportError(t('profile.unreadable'))
      }
    }
    reader.readAsText(file)
  }

  const selectedCurrency = currencyMeta(ledger.settings.currency)
  const currencyName = currencyText(language, selectedCurrency.code, 'currency', selectedCurrency.name)
  const currencyRegion = currencyText(language, selectedCurrency.code, 'region', selectedCurrency.region)

  return (
    <>
      <Card title={t('profile.language')}>
        <div className="chips">
          <button className={`chip ${language === 'fr' ? 'on' : ''}`} onClick={() => setLanguage('fr')}>{t('profile.french')}</button>
          <button className={`chip ${language === 'en' ? 'on' : ''}`} onClick={() => setLanguage('en')}>{t('profile.english')}</button>
        </div>
        <div className="tiny mt">{t('profile.languageAuto')}</div>
      </Card>

      <Card title={t('profile.household')}>
        <Field label={t('profile.householdName')}>
          <input value={ledger.settings.household_name} onChange={(e) => updateSettings({ household_name: e.target.value })} />
        </Field>
        <Field label={t('profile.members')} hint={t('profile.membersHint')}>
          <div className="chips">
            {ledger.settings.members.map((m) => (
              <button key={m} className="chip on" onClick={() => {
                if (ledger.settings.members.length > 1) updateSettings({ members: ledger.settings.members.filter((x) => x !== m) })
              }}>{m}</button>
            ))}
          </div>
        </Field>
        <div className="field-2">
          <Field label={t('profile.addMember')}><input value={newMember} onChange={(e) => setNewMember(e.target.value)} placeholder={t('profile.partner')} /></Field>
          <Field label=" "><button className="btn" disabled={newMember.trim() === '' || ledger.settings.members.includes(newMember.trim())} onClick={() => { updateSettings({ members: [...ledger.settings.members, newMember.trim()] }); setNewMember('') }}>{t('common.add')}</button></Field>
        </div>
      </Card>

      <Card title={t('profile.currency')}>
        <div className="currency-current">
          <div><strong>{selectedCurrency.symbol} · {selectedCurrency.code}</strong><small>{currencyName} · {currencyRegion}</small></div>
          <button className="btn" onClick={() => setCurrencySheet(true)}>{t('profile.changeCurrency')}</button>
        </div>
        <div className="tiny">{t('profile.currencyBody')}</div>
      </Card>

      <Card title={t('profile.pilotSettings')}>
        <Field label={t('profile.savingsRate', { pct: ledger.settings.savings_rate_pct })}>
          <input type="range" min={0} max={50} value={ledger.settings.savings_rate_pct} onChange={(e) => updateSettings({ savings_rate_pct: Number(e.target.value) })} />
        </Field>
        <Field label={t('profile.envelopeAlert', { pct: ledger.settings.warn_threshold_pct })} hint={t('profile.envelopeAlertHint')}>
          <input type="range" min={50} max={100} step={5} value={ledger.settings.warn_threshold_pct} onChange={(e) => updateSettings({ warn_threshold_pct: Number(e.target.value) })} />
        </Field>
      </Card>

      <Card title={t('profile.otherScreens')}>
        <div className="btn-row" style={{ marginBottom: 10 }}><button className="btn" onClick={() => go('revenus')}>{t('app.income')}</button><button className="btn" onClick={() => go('charges')}>{t('app.bills')}</button></div>
        <div className="btn-row" style={{ marginBottom: 10 }}><button className="btn" onClick={() => go('epargne')}>{t('app.savings')}</button><button className="btn" onClick={() => go('historique')}>{t('profile.history')}</button></div>
        <button className="btn" onClick={() => go('rapport')}>{t('profile.reportsScore')}</button>
      </Card>

      <Card title={t('profile.security')}>
        <div className="btn-row" style={{ marginBottom: 10 }}>
          <button className="btn" onClick={() => setHideAmounts(!hideAmounts)}>{hideAmounts ? t('app.showAmounts') : t('app.hideAmounts')}</button>
          <button className="btn" onClick={() => setPinSheet(true)}>{hasPin ? t('profile.changePin') : t('profile.definePin')}</button>
        </div>
        {hasPin && <button className="btn danger" onClick={() => { clearPin(); setHasPin(false) }}>{t('profile.removePin')}</button>}
        <div className="tiny mt">{t('profile.pinBody')}</div>
      </Card>

      <Card title={t('profile.cloud')}>
        {!isCloudConfigured ? <div className="banner warn"><span className="dot warn" />{t('profile.noCloud')}</div> : session ? <>
          <div className="rows">
            <div className="row"><div className="k">{t('common.account')}</div><div className="v" style={{ fontWeight: 400, fontSize: 14 }}>{session.email}</div></div>
            <div className="row"><div className="k">{t('profile.network')}</div><div className="v" style={{ fontWeight: 400, fontSize: 14 }}>{online ? t('common.online') : t('common.offline')}</div></div>
            <div className="row"><div className="k">{t('profile.lastSync')}</div><div className="v" style={{ fontWeight: 400, fontSize: 14 }}>{meta.last_push ? new Date(meta.last_push).toLocaleString(locale) : t('common.never')}</div></div>
          </div>
          {lastSync && <div className={`banner mt ${lastSync.ok ? '' : 'err'}`}><span className={`dot ${lastSync.ok ? 'ok' : 'danger'}`} />{lastSync.message}</div>}
          <div className="btn-row mt"><button className="btn primary" disabled={syncing || !online} onClick={() => void runSync()}>{syncing ? t('profile.syncing') : t('profile.sync')}</button><button className="btn" onClick={() => void signOut()}>{t('profile.signOut')}</button></div>
        </> : <><div className="banner warn"><span className="dot warn" />{t('profile.notSignedIn')}</div><button className="btn primary mt" onClick={() => go('connexion')}>{t('profile.signIn')}</button></>}
      </Card>

      <Card title={t('profile.backupExport')}>
        <div className="btn-row" style={{ marginBottom: 10 }}>
          <button className="btn" onClick={() => download(`sauvegarde-budget-${new Date().toISOString().slice(0, 10)}.json`, backupJson(ledger), 'application/json')}>{t('profile.export')}</button>
          <label className="btn" style={{ cursor: 'pointer' }}>{t('profile.import')}<input type="file" accept="application/json" style={{ display: 'none' }} onChange={(e) => { const f = e.target.files?.[0]; if (f) importBackup(f) }} /></label>
        </div>
        {importError && <div className="banner err"><span className="dot danger" />{importError}</div>}
        <div className="tiny mt">{t('profile.importBody')}</div>
      </Card>

      <Card title={t('profile.dangerZone')}>
        {confirmReset ? <><div className="banner err" style={{ marginBottom: 10 }}><span className="dot danger" />{t('profile.resetWarning')}</div><div className="btn-row"><button className="btn" onClick={() => setConfirmReset(false)}>{t('common.cancel')}</button><button className="btn danger" onClick={() => { clearLocal(); clearPin(); window.location.reload() }}>{t('profile.erase')}</button></div></> : <button className="btn danger" onClick={() => setConfirmReset(true)}>{t('profile.reset')}</button>}
      </Card>

      {currencySheet && <CurrencySheet current={ledger.settings.currency} onClose={() => setCurrencySheet(false)} onSelect={(currency) => { updateSettings({ currency }); setCurrencySheet(false) }} />}
      {pinSheet && <PinSheet onClose={() => setPinSheet(false)} onSave={async (pin) => { await setPin(pin); setHasPin(true); setPinSheet(false) }} />}
    </>
  )
}

function CurrencySheet({ current, onClose, onSelect }: { current: CurrencyCode; onClose: () => void; onSelect: (currency: CurrencyCode) => void }) {
  const { language, t } = useI18n()
  const [query, setQuery] = useState('')
  const q = query.trim().toLowerCase()
  const rows = SUPPORTED_CURRENCIES.filter((c) => !q || `${c.code} ${c.label} ${currencyText(language, c.code, 'currency', c.name)} ${currencyText(language, c.code, 'region', c.region)}`.toLowerCase().includes(q))
  return <Sheet title={t('profile.currencyQuestion')} onClose={onClose}>
    <div className="currency-warning">{t('profile.currencyWarning')}</div>
    <Field label={t('profile.currencySearch')}><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t('profile.currencyPlaceholder')} autoFocus /></Field>
    <div className="currency-list">{rows.map((c) => <button key={c.code} className={`currency-option ${c.code === current ? 'active' : ''}`} onClick={() => onSelect(c.code)}><span><strong>{c.symbol} · {c.code}</strong><small>{currencyText(language, c.code, 'currency', c.name)} · {currencyText(language, c.code, 'region', c.region)}</small></span><span>{c.code === current ? '✓' : '›'}</span></button>)}</div>
  </Sheet>
}

function PinSheet({ onClose, onSave }: { onClose: () => void; onSave: (pin: string) => Promise<void> }) {
  const { t } = useI18n()
  const [pin, setPinValue] = useState('')
  const [confirm, setConfirm] = useState('')
  const mismatch = confirm.length === pin.length && pin !== confirm
  return <Sheet title={t('profile.pinTitle')} onClose={onClose}>
    <Field label={t('profile.pinNew')}><input inputMode="numeric" maxLength={4} value={pin} onChange={(e) => setPinValue(e.target.value.replace(/\D/g, '').slice(0, 4))} autoFocus /></Field>
    <Field label={t('profile.pinConfirm')}><input inputMode="numeric" maxLength={4} value={confirm} onChange={(e) => setConfirm(e.target.value.replace(/\D/g, '').slice(0, 4))} /></Field>
    {mismatch && <div className="banner err" style={{ marginBottom: 12 }}><span className="dot danger" />{t('profile.pinMismatch')}</div>}
    <button className="btn primary" disabled={pin.length !== 4 || pin !== confirm} onClick={() => void onSave(pin)}>{t('profile.pinSave')}</button>
  </Sheet>
}
