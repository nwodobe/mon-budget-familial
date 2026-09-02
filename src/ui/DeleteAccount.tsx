import { useState } from 'react'
import { clearPin } from '../data/pin'
import { clearLocal } from '../data/storage'
import { supabase } from '../data/supabase'
import { useApp } from '../state/AppContext'
import { Card } from './common'

export default function DeleteAccount({ onDone }: { onDone: () => void }) {
  const { session, signOut } = useApp()
  const [confirmed, setConfirmed] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function removeAccount() {
    if (!supabase || !session || !confirmed) return
    setBusy(true)
    setError('')

    const { error: invokeError } = await supabase.functions.invoke('delete-account', {
      method: 'POST',
      body: {},
    })

    if (invokeError) {
      setBusy(false)
      setError("La suppression n'a pas pu être confirmée. Vérifiez votre connexion puis réessayez.")
      return
    }

    await signOut()
    clearLocal()
    clearPin()
    sessionStorage.removeItem('mbf_screen')
    window.location.reload()
  }

  if (!session) {
    return <Card title="Supprimer mon compte"><p>Vous devez être connecté au compte à supprimer.</p><button className="btn" onClick={onDone}>Retour</button></Card>
  }

  return <Card title="Supprimer mon compte">
    <div className="banner err" style={{ marginBottom: 14 }}>
      <span className="dot danger" />
      Cette action est définitive.
    </div>
    <p>Vous allez supprimer le compte <strong>{session.email}</strong> et ses données cloud : revenus, charges, dépenses, enveloppes, épargne, objectifs, provisions et paramètres synchronisés.</p>
    <p>Une copie locale peut être exportée avant suppression depuis <strong>Plus → Sauvegarde</strong>.</p>
    <label className="check-row" style={{ marginTop: 16 }}>
      <input type="checkbox" checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)} />
      <span>Je comprends que cette suppression est irréversible.</span>
    </label>
    {error && <div className="banner err mt"><span className="dot danger" />{error}</div>}
    <div className="btn-row mt">
      <button className="btn" disabled={busy} onClick={onDone}>Annuler</button>
      <button className="btn danger" disabled={!confirmed || busy} onClick={() => void removeAccount()}>
        {busy ? 'Suppression...' : 'Supprimer définitivement'}
      </button>
    </div>
    <div className="tiny mt">Après confirmation, le compte cloud est supprimé côté serveur puis les données locales de cet appareil sont effacées.</div>
  </Card>
}
