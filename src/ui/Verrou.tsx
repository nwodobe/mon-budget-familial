import { useState } from 'react'
import { verifyPin } from '../data/pin'
import { useI18n } from '../i18n'

export default function Verrou({ onUnlock }: { onUnlock: () => void }) {
  const { t } = useI18n()
  const [pin, setPin] = useState('')
  const [error, setError] = useState('')
  const [attempts, setAttempts] = useState(0)

  async function submit(value: string) {
    if (await verifyPin(value)) {
      onUnlock()
      return
    }
    setAttempts((a) => a + 1)
    setError(t('lock.incorrect'))
    setPin('')
  }

  function press(digit: string) {
    setError('')
    const next = pin + digit
    setPin(next)
    if (next.length === 4) void submit(next)
  }

  return <div className="center-screen"><div className="center-card">
    <h1 className="brand-title">{t('app.title')}</h1>
    <p className="brand-sub">{t('lock.prompt')}</p>
    <div className="pin-display">{[0, 1, 2, 3].map((i) => <span key={i} className={`pin-dot ${i < pin.length ? 'filled' : ''}`} />)}</div>
    {error && <div className="banner err" style={{ marginBottom: 14 }}><span className="dot danger" />{error}{attempts >= 3 ? t('lock.retry') : ''}</div>}
    <div className="keypad">
      {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((d) => <button key={d} onClick={() => press(d)}>{d}</button>)}
      <button onClick={() => setPin('')}>C</button><button onClick={() => press('0')}>0</button><button onClick={() => setPin((p) => p.slice(0, -1))}>&larr;</button>
    </div>
  </div></div>
}
