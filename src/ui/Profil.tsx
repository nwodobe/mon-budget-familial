import { useState } from 'react'
import { backupJson, download } from '../data/exporter'
import { clearLocal } from '../data/storage'
import { clearPin, pinIsSet, setPin } from '../data/pin'
import { isCloudConfigured } from '../data/supabase'
import { emptyLedger, type Ledger } from '../domain/types'
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
  const [newMember, setNewMember] = useState('')
  const [pinSheet, setPinSheet] = useState(false)
  const [hasPin, setHasPin] = useState(pinIsSet())
  const [confirmReset, setConfirmReset] = useState(false)
  const [importError, setImportError] = useState('')

  function importBackup(file: File) {
    const reader = new FileReader()
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result)) as { ledger?: Ledger }
        if (!parsed.ledger || !Array.isArray(parsed.ledger.expenses)) {
          setImportError("Ce fichier n est pas une sauvegarde de Mon Budget Familial.")
          return
        }
        replaceLedger({ ...emptyLedger(), ...parsed.ledger })
        setImportError('')
      } catch {
        setImportError('Fichier illisible.')
      }
    }
    reader.readAsText(file)
  }

  return (
    <>
      <Card title="Foyer">
        <Field label="Nom du foyer">
          <input
            value={ledger.settings.household_name}
            onChange={(e) => updateSettings({ household_name: e.target.value })}
          />
        </Field>
        <Field label="Membres" hint="Chaque depense peut etre rattachee a un membre.">
          <div className="chips">
            {ledger.settings.members.map((m) => (
              <button
                key={m}
                className="chip on"
                onClick={() => {
                  if (ledger.settings.members.length > 1) {
                    updateSettings({ members: ledger.settings.members.filter((x) => x !== m) })
                  }
                }}
              >
                {m}
              </button>
            ))}
          </div>
        </Field>
        <div className="field-2">
          <Field label="Ajouter un membre">
            <input value={newMember} onChange={(e) => setNewMember(e.target.value)} placeholder="Conjoint" />
          </Field>
          <Field label=" ">
            <button
              className="btn"
              disabled={newMember.trim() === '' || ledger.settings.members.includes(newMember.trim())}
              onClick={() => {
                updateSettings({ members: [...ledger.settings.members, newMember.trim()] })
                setNewMember('')
              }}
            >
              Ajouter
            </button>
          </Field>
        </div>
      </Card>

      <Card title="Reglages du pilotage">
        <Field label={`Taux d epargne minimum : ${ledger.settings.savings_rate_pct} %`}>
          <input
            type="range"
            min={0}
            max={50}
            value={ledger.settings.savings_rate_pct}
            onChange={(e) => updateSettings({ savings_rate_pct: Number(e.target.value) })}
          />
        </Field>
        <Field
          label={`Seuil d alerte sur une enveloppe : ${ledger.settings.warn_threshold_pct} %`}
          hint="L application previent des que ce pourcentage de l enveloppe est atteint."
        >
          <input
            type="range"
            min={50}
            max={100}
            step={5}
            value={ledger.settings.warn_threshold_pct}
            onChange={(e) => updateSettings({ warn_threshold_pct: Number(e.target.value) })}
          />
        </Field>
      </Card>

      <Card title="Autres ecrans">
        <div className="btn-row" style={{ marginBottom: 10 }}>
          <button className="btn" onClick={() => go('revenus')}>
            Revenus
          </button>
          <button className="btn" onClick={() => go('charges')}>
            Charges
          </button>
        </div>
        <div className="btn-row" style={{ marginBottom: 10 }}>
          <button className="btn" onClick={() => go('epargne')}>
            Epargne
          </button>
          <button className="btn" onClick={() => go('historique')}>
            Historique
          </button>
        </div>
        <button className="btn" onClick={() => go('rapport')}>
          Rapports et score
        </button>
      </Card>

      <Card title="Securite">
        <div className="btn-row" style={{ marginBottom: 10 }}>
          <button className="btn" onClick={() => setHideAmounts(!hideAmounts)}>
            {hideAmounts ? 'Afficher les montants' : 'Masquer les montants'}
          </button>
          <button className="btn" onClick={() => setPinSheet(true)}>
            {hasPin ? 'Changer le code' : 'Definir un code'}
          </button>
        </div>
        {hasPin && (
          <button
            className="btn danger"
            onClick={() => {
              clearPin()
              setHasPin(false)
            }}
          >
            Retirer le code PIN
          </button>
        )}
        <div className="tiny mt">
          Le code n est jamais stocke : seule son empreinte l est. Il protege l ecran, il ne chiffre pas la base
          locale et ne remplace pas le verrouillage de votre telephone.
        </div>
      </Card>

      <Card title="Sauvegarde cloud">
        {!isCloudConfigured ? (
          <div className="banner warn">
            <span className="dot warn" />
            Aucun serveur configure. Vos donnees restent sur cet appareil : pensez a exporter une sauvegarde.
          </div>
        ) : session ? (
          <>
            <div className="rows">
              <div className="row">
                <div className="k">Compte</div>
                <div className="v" style={{ fontWeight: 400, fontSize: 14 }}>
                  {session.email}
                </div>
              </div>
              <div className="row">
                <div className="k">Etat du reseau</div>
                <div className="v" style={{ fontWeight: 400, fontSize: 14 }}>
                  {online ? 'En ligne' : 'Hors connexion'}
                </div>
              </div>
              <div className="row">
                <div className="k">Derniere synchronisation</div>
                <div className="v" style={{ fontWeight: 400, fontSize: 14 }}>
                  {meta.last_push ? new Date(meta.last_push).toLocaleString('fr-FR') : 'jamais'}
                </div>
              </div>
            </div>
            {lastSync && (
              <div className={`banner mt ${lastSync.ok ? '' : 'err'}`}>
                <span className={`dot ${lastSync.ok ? 'ok' : 'danger'}`} />
                {lastSync.message}
              </div>
            )}
            <div className="btn-row mt">
              <button className="btn primary" disabled={syncing || !online} onClick={() => void runSync()}>
                {syncing ? 'Synchronisation...' : 'Synchroniser'}
              </button>
              <button className="btn" onClick={() => void signOut()}>
                Se deconnecter
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="banner warn">
              <span className="dot warn" />
              Vous n etes pas connecte : rien n est sauvegarde hors de cet appareil.
            </div>
            <button className="btn primary mt" onClick={() => go('connexion')}>
              Se connecter
            </button>
          </>
        )}
      </Card>

      <Card title="Sauvegarde et export">
        <div className="btn-row" style={{ marginBottom: 10 }}>
          <button
            className="btn"
            onClick={() => download(`sauvegarde-budget-${new Date().toISOString().slice(0, 10)}.json`, backupJson(ledger), 'application/json')}
          >
            Exporter
          </button>
          <label className="btn" style={{ cursor: 'pointer' }}>
            Importer
            <input
              type="file"
              accept="application/json"
              style={{ display: 'none' }}
              onChange={(e) => {
                const f = e.target.files?.[0]
                if (f) importBackup(f)
              }}
            />
          </label>
        </div>
        {importError && (
          <div className="banner err">
            <span className="dot danger" />
            {importError}
          </div>
        )}
        <div className="tiny mt">L import remplace entierement les donnees de cet appareil.</div>
      </Card>

      <Card title="Zone sensible">
        {confirmReset ? (
          <>
            <div className="banner err" style={{ marginBottom: 10 }}>
              <span className="dot danger" />
              Cette action efface toutes les donnees de cet appareil. Exportez d abord une sauvegarde.
            </div>
            <div className="btn-row">
              <button className="btn" onClick={() => setConfirmReset(false)}>
                Annuler
              </button>
              <button
                className="btn danger"
                onClick={() => {
                  clearLocal()
                  clearPin()
                  window.location.reload()
                }}
              >
                Effacer definitivement
              </button>
            </div>
          </>
        ) : (
          <button className="btn danger" onClick={() => setConfirmReset(true)}>
            Reinitialiser cet appareil
          </button>
        )}
      </Card>

      {pinSheet && (
        <PinSheet
          onClose={() => setPinSheet(false)}
          onSave={async (pin) => {
            await setPin(pin)
            setHasPin(true)
            setPinSheet(false)
          }}
        />
      )}
    </>
  )
}

function PinSheet({ onClose, onSave }: { onClose: () => void; onSave: (pin: string) => Promise<void> }) {
  const [pin, setPinValue] = useState('')
  const [confirm, setConfirm] = useState('')
  const mismatch = confirm.length === pin.length && pin !== confirm

  return (
    <Sheet title="Code de securite" onClose={onClose}>
      <Field label="Nouveau code a 4 chiffres">
        <input
          inputMode="numeric"
          maxLength={4}
          value={pin}
          onChange={(e) => setPinValue(e.target.value.replace(/\D/g, '').slice(0, 4))}
          autoFocus
        />
      </Field>
      <Field label="Confirmer le code">
        <input
          inputMode="numeric"
          maxLength={4}
          value={confirm}
          onChange={(e) => setConfirm(e.target.value.replace(/\D/g, '').slice(0, 4))}
        />
      </Field>
      {mismatch && (
        <div className="banner err" style={{ marginBottom: 12 }}>
          <span className="dot danger" />
          Les deux codes different.
        </div>
      )}
      <button className="btn primary" disabled={pin.length !== 4 || pin !== confirm} onClick={() => void onSave(pin)}>
        Enregistrer le code
      </button>
    </Sheet>
  )
}
