import { useState } from 'react'
import { isCloudConfigured } from '../data/supabase'
import { useI18n } from '../i18n'
import { useApp } from '../state/AppContext'
import { Field } from './common'

export default function Connexion({ onDone }: { onDone: () => void }) {
  const { t } = useI18n()
  const { signIn, signUp } = useApp()
  const [mode, setMode] = useState<'connexion' | 'creation'>('connexion')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')

  async function submit() {
    setBusy(true)
    setError('')
    setInfo('')
    const err = mode === 'connexion' ? await signIn(email.trim(), password) : await signUp(email.trim(), password)
    setBusy(false)
    if (err) {
      setError(err)
      return
    }
    if (mode === 'creation') {
      setInfo(t('auth.created'))
      setMode('connexion')
      return
    }
    onDone()
  }

  if (!isCloudConfigured) {
    return <div className="card"><h2>{t('auth.cloudBackup')}</h2><div className="banner warn"><span className="dot warn" />{t('auth.noServer')}</div><button className="btn mt" onClick={onDone}>{t('auth.back')}</button></div>
  }

  return <div className="card">
    <h2>{mode === 'connexion' ? t('auth.signIn') : t('auth.create')}</h2>
    <Field label={t('auth.email')}><input type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" /></Field>
    <Field label={t('auth.password')} hint={mode === 'creation' ? t('auth.passwordHint') : undefined}><input type="password" autoComplete={mode === 'creation' ? 'new-password' : 'current-password'} value={password} onChange={(e) => setPassword(e.target.value)} /></Field>
    {error && <div className="banner err" style={{ marginBottom: 12 }}><span className="dot danger" />{error}</div>}
    {info && <div className="banner" style={{ marginBottom: 12 }}><span className="dot ok" />{info}</div>}
    <button className="btn primary" disabled={busy || email.trim() === '' || password.length < 6} onClick={() => void submit()}>{busy ? t('auth.wait') : mode === 'connexion' ? t('auth.signInAction') : t('auth.createAction')}</button>
    <button className="btn ghost mt" onClick={() => { setMode(mode === 'connexion' ? 'creation' : 'connexion'); setError(''); setInfo('') }}>{mode === 'connexion' ? t('auth.noAccount') : t('auth.haveAccount')}</button>
    <button className="btn ghost mt" onClick={onDone}>{t('auth.continueLocal')}</button>
    <div className="tiny mt">{t('auth.privacy')}</div>
  </div>
}
