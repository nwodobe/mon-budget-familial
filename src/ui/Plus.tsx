import { isCloudConfigured } from '../data/supabase'
import { useI18n, type Language } from '../i18n'
import { useApp } from '../state/AppContext'
import { Card, MenuItem } from './common'

const PRIVACY_URLS = {
  fr: 'https://nwodobe.github.io/mon-budget-familial/privacy.html',
  en: 'https://nwodobe.github.io/mon-budget-familial/privacy-en.html',
} as const

const LANGUAGE_OPTIONS: Array<{ code: Language; label: string }> = [
  { code: 'fr', label: 'Français' },
  { code: 'en', label: 'English' },
  { code: 'es', label: 'Español' },
  { code: 'ar', label: 'العربية' },
  { code: 'pt', label: 'Português' },
]

export default function Plus({ go }: { go: (screen: string) => void }) {
  const { session, online } = useApp()
  const { language, setLanguage, t } = useI18n()
  const privacyUrl = language === 'fr' ? PRIVACY_URLS.fr : PRIVACY_URLS.en

  return (
    <div className="more-page">
      <Card title="🌐 Langue / Language / Idioma / اللغة" className="menu-card">
        <div className="chips" role="group" aria-label="Language selector">
          {LANGUAGE_OPTIONS.map((option) => (
            <button
              key={option.code}
              className={`chip ${language === option.code ? 'on' : ''}`}
              onClick={() => setLanguage(option.code)}
              aria-pressed={language === option.code}
            >
              {option.label}
            </button>
          ))}
        </div>
      </Card>

      <Card title="Premium" className="menu-card premium-menu-card">
        <MenuItem icon="target" title="Mon Budget Familial Premium" subtitle={t('premium.priceInPlay')} onClick={() => go('premium')} />
      </Card>

      <Card title={t('more.plan')} className="menu-card">
        <MenuItem icon="income" title={t('app.income')} subtitle={t('more.incomeSubtitle')} onClick={() => go('revenus')} />
        <MenuItem icon="charges" title={t('app.bills')} subtitle={t('more.billsSubtitle')} onClick={() => go('charges')} />
        <MenuItem icon="savings" title={t('app.savings')} subtitle={t('more.savingsSubtitle')} onClick={() => go('epargne')} />
        <MenuItem icon="target" title={t('app.goals')} subtitle={t('more.goalsSubtitle')} onClick={() => go('objectifs')} />
        <MenuItem icon="prepare" title={t('app.prepare')} subtitle={t('more.prepareSubtitle')} onClick={() => go('preparer')} />
      </Card>

      <Card title={t('more.analyze')} className="menu-card">
        <MenuItem icon="report" title={t('more.reportsTitle')} subtitle={t('more.reportsSubtitle')} onClick={() => go('rapport')} />
      </Card>

      <Card title={t('app.account')} className="menu-card">
        <MenuItem icon="user" title={t('app.profile')} subtitle={t('more.profileSubtitle')} onClick={() => go('profil')} />
        <MenuItem
          icon="cloud"
          title={t('more.sync')}
          subtitle={!isCloudConfigured ? t('more.cloudNotConfigured') : session ? (online ? t('more.accountConnected') : t('app.offline')) : t('more.loginRequired')}
          onClick={() => go(session ? 'profil' : 'connexion')}
        />
        <MenuItem icon="shield" title={t('more.security')} subtitle={t('more.securitySubtitle')} onClick={() => go('profil')} />
        <MenuItem icon="backup" title={t('more.backup')} subtitle={t('more.backupSubtitle')} onClick={() => go('profil')} />
        <MenuItem icon="shield" title={t('more.privacy')} subtitle={t('more.privacySubtitle')} onClick={() => window.open(privacyUrl, '_blank', 'noopener,noreferrer')} />
        {session && <MenuItem icon="alert" title={t('app.deleteAccount')} subtitle={t('more.deleteSubtitle')} onClick={() => go('suppression')} />}
      </Card>

      <div className="app-version">{t('more.version')}</div>
    </div>
  )
}
