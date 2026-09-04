import { isCloudConfigured } from '../data/supabase'
import { useApp } from '../state/AppContext'
import { Card, MenuItem } from './common'

const PRIVACY_URL = 'https://nwodobe.github.io/mon-budget-familial/privacy.html'

export default function Plus({ go }: { go: (screen: string) => void }) {
  const { session, online } = useApp()

  return (
    <div className="more-page">
      <Card title="Premium" className="menu-card premium-menu-card">
        <MenuItem icon="target" title="Mon Budget Familial Premium" subtitle="1 500 FCFA/mois ou 12 000 FCFA/an" onClick={() => go('premium')} />
      </Card>

      <Card title="Planifier" className="menu-card">
        <MenuItem icon="income" title="Revenus" subtitle="Salaire et autres entrées" onClick={() => go('revenus')} />
        <MenuItem icon="charges" title="Charges" subtitle="Loyer, factures et échéances" onClick={() => go('charges')} />
        <MenuItem icon="savings" title="Épargne" subtitle="Poches et mouvements d'épargne" onClick={() => go('epargne')} />
        <MenuItem icon="target" title="Objectifs" subtitle="Projets financiers à atteindre" onClick={() => go('objectifs')} />
        <MenuItem icon="prepare" title="À préparer" subtitle="Assurance, scolarité, entretien, voyage" onClick={() => go('preparer')} />
      </Card>

      <Card title="Analyser" className="menu-card">
        <MenuItem icon="report" title="Rapports et score" subtitle="Bilan mensuel et discipline financière" onClick={() => go('rapport')} />
      </Card>

      <Card title="Compte" className="menu-card">
        <MenuItem icon="user" title="Foyer et préférences" subtitle="Membres, seuils et réglages" onClick={() => go('profil')} />
        <MenuItem
          icon="cloud"
          title="Synchronisation"
          subtitle={!isCloudConfigured ? 'Cloud non configuré' : session ? (online ? 'Compte connecté' : 'Hors connexion') : 'Connexion requise'}
          onClick={() => go(session ? 'profil' : 'connexion')}
        />
        <MenuItem icon="shield" title="Sécurité" subtitle="Code PIN et confidentialité" onClick={() => go('profil')} />
        <MenuItem icon="backup" title="Sauvegarde" subtitle="Exporter ou restaurer les données" onClick={() => go('profil')} />
        <MenuItem icon="shield" title="Politique de confidentialité" subtitle="Données, sécurité et droits utilisateur" onClick={() => window.open(PRIVACY_URL, '_blank', 'noopener,noreferrer')} />
        {session && <MenuItem icon="alert" title="Supprimer mon compte" subtitle="Effacer définitivement le compte et les données cloud" onClick={() => go('suppression')} />}
      </Card>

      <div className="app-version">Mon Budget Familial · Discipline Financière V2</div>
    </div>
  )
}
