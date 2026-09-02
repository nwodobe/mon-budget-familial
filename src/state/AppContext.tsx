import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { currentMonth, todayIso } from '../domain/dates'
import {
  computeGoals,
  computePockets,
  type GoalStatus,
  type PocketBalance,
} from '../domain/engine'
import { computeMonthV2, type DisciplineSnapshot } from '../domain/disciplineV2'
import type { CollectionName, Ledger, Settings } from '../domain/types'
import {
  loadLedger,
  loadMeta,
  newId,
  nowIso,
  saveLedger,
  saveMeta,
  type SyncMeta,
} from '../data/storage'
import { synchronize, type SyncResult } from '../data/sync'
import { isCloudConfigured, supabase } from '../data/supabase'

type Row = { id: string; updated_at: string; deleted_at: string | null }

interface AppState {
  ledger: Ledger
  meta: SyncMeta
  month: string
  today: string
  snapshot: DisciplineSnapshot
  goals: GoalStatus[]
  pockets: PocketBalance[]
  hideAmounts: boolean
  online: boolean
  syncing: boolean
  lastSync: SyncResult | null
  session: { email: string; id: string } | null

  setMonth: (m: string) => void
  setHideAmounts: (v: boolean) => void
  create: <K extends CollectionName>(collection: K, row: Omit<Ledger[K][number], keyof Row>) => string
  update: <K extends CollectionName>(collection: K, id: string, patch: Partial<Ledger[K][number]>) => void
  remove: (collection: CollectionName, id: string) => void
  updateSettings: (patch: Partial<Settings>) => void
  replaceLedger: (l: Ledger) => void
  runSync: () => Promise<SyncResult>
  signIn: (email: string, password: string) => Promise<string | null>
  signUp: (email: string, password: string) => Promise<string | null>
  signOut: () => Promise<void>
}

const Ctx = createContext<AppState | null>(null)
const HIDE_KEY = 'mbf.hide.v1'

export function AppProvider({ children }: { children: ReactNode }) {
  const [ledger, setLedger] = useState<Ledger>(() => loadLedger())
  const [meta, setMeta] = useState<SyncMeta>(() => loadMeta())
  const [month, setMonth] = useState<string>(() => currentMonth())
  const [today, setToday] = useState<string>(() => todayIso())
  const [hideAmounts, setHideAmountsState] = useState<boolean>(() => localStorage.getItem(HIDE_KEY) === '1')
  const [online, setOnline] = useState<boolean>(() => navigator.onLine)
  const [syncing, setSyncing] = useState(false)
  const [lastSync, setLastSync] = useState<SyncResult | null>(null)
  const [session, setSession] = useState<{ email: string; id: string } | null>(null)
  const pendingSync = useRef(false)

  useEffect(() => saveLedger(ledger), [ledger])
  useEffect(() => saveMeta(meta), [meta])

  useEffect(() => {
    const t = setInterval(() => {
      const d = todayIso()
      setToday((prev) => (prev === d ? prev : d))
    }, 60000)
    return () => clearInterval(t)
  }, [])

  useEffect(() => {
    const up = () => setOnline(true)
    const down = () => setOnline(false)
    window.addEventListener('online', up)
    window.addEventListener('offline', down)
    return () => {
      window.removeEventListener('online', up)
      window.removeEventListener('offline', down)
    }
  }, [])

  useEffect(() => {
    if (!supabase) return
    supabase.auth.getSession().then(({ data }) => {
      const u = data.session?.user
      setSession(u ? { email: u.email ?? '', id: u.id } : null)
    })
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      const u = s?.user
      setSession(u ? { email: u.email ?? '', id: u.id } : null)
    })
    return () => sub.subscription.unsubscribe()
  }, [])

  const runSync = useCallback(async (): Promise<SyncResult> => {
    if (pendingSync.current) return { ok: false, pushed: 0, pulled: 0, message: 'Synchronisation deja en cours.' }
    pendingSync.current = true
    setSyncing(true)
    try {
      const out = await synchronize(loadLedger(), loadMeta())
      setLedger(out.ledger)
      setMeta(out.meta)
      setLastSync(out.result)
      return out.result
    } finally {
      pendingSync.current = false
      setSyncing(false)
    }
  }, [])

  useEffect(() => {
    if (online && session && isCloudConfigured) void runSync()
  }, [online, session, runSync])

  const create = useCallback<AppState['create']>((collection, row) => {
    const id = newId()
    const full = { ...row, id, updated_at: nowIso(), deleted_at: null }
    setLedger((prev) => ({ ...prev, [collection]: [...(prev[collection] as unknown[]), full] }) as Ledger)
    return id
  }, [])

  const update = useCallback<AppState['update']>((collection, id, patch) => {
    setLedger((prev) => {
      const rows = prev[collection] as unknown as Row[]
      return {
        ...prev,
        [collection]: rows.map((r) => (r.id === id ? { ...r, ...patch, updated_at: nowIso() } : r)),
      } as Ledger
    })
  }, [])

  const remove = useCallback<AppState['remove']>((collection, id) => {
    setLedger((prev) => {
      const rows = prev[collection] as unknown as Row[]
      const stamp = nowIso()
      return {
        ...prev,
        [collection]: rows.map((r) => (r.id === id ? { ...r, deleted_at: stamp, updated_at: stamp } : r)),
      } as Ledger
    })
  }, [])

  const updateSettings = useCallback((patch: Partial<Settings>) => {
    setLedger((prev) => ({ ...prev, settings: { ...prev.settings, ...patch, updated_at: nowIso() } }))
  }, [])

  const replaceLedger = useCallback((l: Ledger) => setLedger(l), [])
  const setHideAmounts = useCallback((v: boolean) => {
    setHideAmountsState(v)
    localStorage.setItem(HIDE_KEY, v ? '1' : '0')
  }, [])

  const signIn = useCallback(async (email: string, password: string) => {
    if (!supabase) return "Aucun serveur n'est configure."
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) return error.message
    await runSync()
    return null
  }, [runSync])

  const signUp = useCallback(async (email: string, password: string) => {
    if (!supabase) return "Aucun serveur n'est configure."
    const { error } = await supabase.auth.signUp({ email, password })
    if (error) return error.message
    return null
  }, [])

  const signOut = useCallback(async () => {
    if (supabase) await supabase.auth.signOut({ scope: 'local' })
    setSession(null)
  }, [])

  const snapshot = useMemo(() => computeMonthV2(ledger, month, today), [ledger, month, today])
  const goals = useMemo(() => computeGoals(ledger, today), [ledger, today])
  const pockets = useMemo(() => computePockets(ledger, today), [ledger, today])

  const value: AppState = {
    ledger, meta, month, today, snapshot, goals, pockets, hideAmounts, online, syncing, lastSync, session,
    setMonth, setHideAmounts, create, update, remove, updateSettings, replaceLedger, runSync, signIn, signUp, signOut,
  }

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useApp(): AppState {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useApp doit etre utilise dans AppProvider')
  return ctx
}
