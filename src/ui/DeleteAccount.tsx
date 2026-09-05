import { useState } from 'react'
import { clearPin } from '../data/pin'
import { clearLocal } from '../data/storage'
import { supabase } from '../data/supabase'
import { useI18n } from '../i18n'
import { useApp } from '../state/AppContext'
import { Card } from './common'

export default function DeleteAccount({ onDone }: { onDone: () => void }) {
  const { t } = useI18n()
  const { session, signOut } = useApp()
  const [confirmed, setConfirmed] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function removeAccount() {
    if (!supabase || !session || !confirmed) return
    setBusy(true)
    setError('')
    const { error: invokeError } = await supabase.functions.invoke('delete-account', { method: 'POST', body: {} })
    if (invokeError) {
      setBusy(false)
      setError(t('delete.failed'))
      return
    }
    await signOut()
    clearLocal()
    clearPin()
    sessionStorage.removeItem('mbf_screen')
    window.location.reload()
  }

  if (!session) return <Card title={t('delete.title')}><p>{t('delete.mustSignIn')}</p><button className="btn" onClick={onDone}>{t('delete.back')}</button></Card>

  return <Card title={t('delete.title')}>
    <div className="banner err" style={{ marginBottom: 14 }}><span className="dot danger" />{t('delete.final')}</div>
    <p>{t('delete.body', { email: session.email ?? '' })}</p>
    <p>{t('delete.export')}</p>
    <label className="check-row" style={{ marginTop: 16 }}><input type="checkbox" checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)} /><span>{t('delete.confirm')}</span></label>
    {error && <div className="banner err mt"><span className="dot danger" />{error}</div>}
    <div className="btn-row mt"><button className="btn" disabled={busy} onClick={onDone}>{t('common.cancel')}</button><button className="btn danger" disabled={!confirmed || busy} onClick={() => void removeAccount()}>{busy ? t('delete.busy') : t('delete.action')}</button></div>
    <div className="tiny mt">{t('delete.after')}</div>
  </Card>
}
