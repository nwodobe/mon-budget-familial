import { useState } from 'react'
import { verifyPin } from '../data/pin'

/** Ecran de verrouillage par code PIN. */
export default function Verrou({ onUnlock }: { onUnlock: () => void }) {
  const [pin, setPin] = useState('')
  const [error, setError] = useState('')
  const [attempts, setAttempts] = useState(0)

  async function submit(value: string) {
    if (await verifyPin(value)) {
      onUnlock()
      return
    }
    setAttempts((a) => a + 1)
    setError('Code incorrect.')
    setPin('')
  }

  function press(d: string) {
    setError('')
    const next = pin + d
    setPin(next)
    if (next.length === 4) void submit(next)
  }

  return (
    <div className="center-screen">
      <div className="center-card">
        <h1 className="brand-title">Mon Budget Familial</h1>
        <p className="brand-sub">Saisissez votre code pour acceder a vos donnees.</p>

        <div className="pin-display">
          {[0, 1, 2, 3].map((i) => (
            <span key={i} className={`pin-dot ${i < pin.length ? 'filled' : ''}`} />
          ))}
        </div>

        {error && (
          <div className="banner err" style={{ marginBottom: 14 }}>
            <span className="dot danger" />
            {error}
            {attempts >= 3 ? ' Vos donnees restent intactes : reessayez calmement.' : ''}
          </div>
        )}

        <div className="keypad">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((d) => (
            <button key={d} onClick={() => press(d)}>
              {d}
            </button>
          ))}
          <button onClick={() => setPin('')}>C</button>
          <button onClick={() => press('0')}>0</button>
          <button onClick={() => setPin((p) => p.slice(0, -1))}>&larr;</button>
        </div>
      </div>
    </div>
  )
}
