import { useState } from 'react'
import { isCloudConfigured } from '../data/supabase'
import { useApp } from '../state/AppContext'
import { Field } from './common'

/**
 * Connexion au compte cloud.
 *
 * L'application n'exige jamais de compte pour fonctionner : le mode local
 * seul est un choix legitime. Le compte ne sert qu'a sauvegarder et a
 * retrouver ses donnees sur un autre appareil.
 */
export default function Connexion({ onDone }: { onDone: () => void }) {
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
      setInfo("Compte cree. Si une confirmation par e-mail est exigee, validez-la puis connectez-vous.")
      setMode('connexion')
      return
    }
    onDone()
  }

  if (!isCloudConfigured) {
    return (
      <div className="card">
        <h2>Sauvegarde cloud</h2>
        <div className="banner warn">
          <span className="dot warn" />
          Aucun serveur n est configure dans cette version. L application fonctionne en local seul.
        </div>
        <button className="btn mt" onClick={onDone}>
          Revenir
        </button>
      </div>
    )
  }

  return (
    <div className="card">
      <h2>{mode === 'connexion' ? 'Connexion' : 'Creer un compte'}</h2>

      <Field label="Adresse e-mail">
        <input
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="vous@exemple.com"
        />
      </Field>
      <Field
        label="Mot de passe"
        hint={mode === 'creation' ? 'Au moins 8 caracteres. Ne reutilisez pas un mot de passe existant.' : undefined}
      >
        <input
          type="password"
          autoComplete={mode === 'creation' ? 'new-password' : 'current-password'}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </Field>

      {error && (
        <div className="banner err" style={{ marginBottom: 12 }}>
          <span className="dot danger" />
          {error}
        </div>
      )}
      {info && (
        <div className="banner" style={{ marginBottom: 12 }}>
          <span className="dot ok" />
          {info}
        </div>
      )}

      <button
        className="btn primary"
        disabled={busy || email.trim() === '' || password.length < 6}
        onClick={() => void submit()}
      >
        {busy ? 'Patientez...' : mode === 'connexion' ? 'Se connecter' : 'Creer le compte'}
      </button>

      <button
        className="btn ghost mt"
        onClick={() => {
          setMode(mode === 'connexion' ? 'creation' : 'connexion')
          setError('')
          setInfo('')
        }}
      >
        {mode === 'connexion' ? 'Je n ai pas encore de compte' : 'J ai deja un compte'}
      </button>

      <button className="btn ghost mt" onClick={onDone}>
        Continuer sans compte
      </button>

      <div className="tiny mt">
        Vos donnees financieres sont isolees par compte au niveau de la base : personne d autre ne peut les lire.
      </div>
    </div>
  )
}
