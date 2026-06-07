'use client'
import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { PageHeader, Btn, Modal, Field, Badge, ProgressBar } from '@/components/ui'
import { useAppStore } from '@/store/app'
import { useSession } from 'next-auth/react'
import { Plus, Pencil, Trash2 } from 'lucide-react'

// ─── Helpers période ──────────────────────────────────────────────────────
function getPeriodType(period: string): string {
  if (period.includes('-Q')) return 'quarterly'
  if (period.includes('-S')) return 'biannual'
  if (/^\d{4}-\d{2}$/.test(period)) return 'monthly'
  return 'yearly'
}

function periodLabel(period: string): string {
  if (period.includes('-Q')) {
    const [y, q] = period.split('-Q')
    return `T${q} ${y}`
  }
  if (period.includes('-S')) {
    const [y, s] = period.split('-S')
    return `${s === '1' ? '1er' : '2e'} sem. ${y}`
  }
  if (/^\d{4}-\d{2}$/.test(period)) {
    const MOIS = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre']
    const [y, m] = period.split('-')
    return `${MOIS[parseInt(m) - 1]} ${y}`
  }
  return period
}

function periodTypeLabel(pt: string): string {
  return pt === 'quarterly' ? 'Trimestriel' : pt === 'biannual' ? 'Semestriel' : pt === 'yearly' ? 'Annuel' : 'Mensuel'
}

function typeLabel(type: string): string {
  return type === 'placements' ? 'Placements'
    : type === 'revenue' ? "Chiffre d'affaires"
    : type === 'recruitments' ? 'Recrutements'
    : type === 'missions' ? 'Missions actives'
    : type === 'clients' ? 'Nouveaux clients'
    : type
}

function pctColor(pct: number): string {
  if (pct >= 100) return '#10B981'
  if (pct >= 70) return '#0D9488'
  if (pct >= 40) return '#F59E0B'
  return '#EF4444'
}

function currentPeriod(): string {
  const n = new Date()
  return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}`
}

// ─── Sélecteur de période ─────────────────────────────────────────────────
const MOIS_LABELS = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre']

function PeriodSelector({ pType, value, onChangePType, onChange }: {
  pType: string; value: string
  onChangePType: (t: string) => void
  onChange: (v: string) => void
}) {
  const now  = new Date()
  const year = now.getFullYear()

  // Extraire année et sous-période depuis value
  const selYear = value.includes('-Q') ? parseInt(value.split('-Q')[0])
    : value.includes('-S') ? parseInt(value.split('-S')[0])
    : /^\d{4}-\d{2}$/.test(value) ? parseInt(value.split('-')[0])
    : parseInt(value) || year

  const selSub = value.includes('-Q') ? parseInt(value.split('-Q')[1])
    : value.includes('-S') ? parseInt(value.split('-S')[1])
    : /^\d{4}-\d{2}$/.test(value) ? parseInt(value.split('-')[1])
    : 1

  const switchType = (t: string) => {
    onChangePType(t)
    if (t === 'yearly')    onChange(String(year))
    else if (t === 'quarterly') onChange(`${year}-Q1`)
    else if (t === 'biannual')  onChange(`${year}-S1`)
    else onChange(currentPeriod())
  }

  const setYear = (y: number) => {
    if (pType === 'yearly')    onChange(String(y))
    else if (pType === 'quarterly') onChange(`${y}-Q${selSub}`)
    else if (pType === 'biannual')  onChange(`${y}-S${selSub}`)
    else onChange(`${y}-${String(selSub).padStart(2,'0')}`)
  }

  const setSub = (s: number) => {
    if (pType === 'quarterly') onChange(`${selYear}-Q${s}`)
    else if (pType === 'biannual')  onChange(`${selYear}-S${s}`)
    else onChange(`${selYear}-${String(s).padStart(2,'0')}`)
  }

  const selectCls = "rounded-md border border-slate-200 px-2 py-1.5 text-sm text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-teal-400"

  return (
    <div className="space-y-1.5">
      <label className="text-xs font-semibold text-slate-600">Période</label>
      <div className="flex gap-2">
        {/* Type */}
        <select value={pType} onChange={e => switchType(e.target.value)} className={selectCls}>
          <option value="monthly">Mensuel</option>
          <option value="quarterly">Trimestriel</option>
          <option value="biannual">Semestriel</option>
          <option value="yearly">Annuel</option>
        </select>

        {/* Année */}
        <select value={selYear} onChange={e => setYear(parseInt(e.target.value))} className={selectCls}>
          {[year-1, year, year+1].map(y => <option key={y} value={y}>{y}</option>)}
        </select>

        {/* Sous-période */}
        {pType === 'monthly' && (
          <select value={selSub} onChange={e => setSub(parseInt(e.target.value))} className={selectCls}>
            {MOIS_LABELS.map((m, i) => <option key={i+1} value={i+1}>{m}</option>)}
          </select>
        )}
        {pType === 'quarterly' && (
          <select value={selSub} onChange={e => setSub(parseInt(e.target.value))} className={selectCls}>
            {[1,2,3,4].map(q => <option key={q} value={q}>T{q}</option>)}
          </select>
        )}
        {pType === 'biannual' && (
          <select value={selSub} onChange={e => setSub(parseInt(e.target.value))} className={selectCls}>
            <option value={1}>1er sem.</option>
            <option value={2}>2e sem.</option>
          </select>
        )}
      </div>
    </div>
  )
}

// ─── Formulaire objectif ──────────────────────────────────────────────────
function TargetForm({ target, onClose, onSaved }: {
  target?: any; onClose: () => void; onSaved: () => void
}) {
  const { showToast } = useAppStore()
  const B = process.env.NEXT_PUBLIC_APP_URL ?? ''
  const year = new Date().getFullYear()

  const { data: usersData } = useQuery({
    queryKey: ['users-list'],
    queryFn: () => fetch(`${B}/api/users`).then(r => r.json()),
  })
  const users = usersData?.data ?? []

  const [saving, setSaving] = useState(false)
  const [pType, setPType] = useState(target ? getPeriodType(target.period) : 'monthly')
  const [f, setF] = useState({
    userId:      target?.userId      ?? '',
    period:      target?.period      ?? currentPeriod(),
    type:        target?.type        ?? 'placements',
    targetValue: target?.targetValue ?? 0,
    countryId:   target?.countryId   ?? null,
  })
  const u = (k: string) => (v: any) => setF(p => ({ ...p, [k]: v }))

  const save = async () => {
    if (!f.userId || f.userId === '') { showToast('Utilisateur requis', 'error'); return }
    if (!f.targetValue || Number(f.targetValue) <= 0) { showToast('Valeur objectif requise', 'error'); return }
    setSaving(true)
    try {
      const url    = target ? `${B}/api/targets/${target.id}` : `${B}/api/targets`
      const method = target ? 'PUT' : 'POST'
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId:      Number(f.userId),
          period:      f.period,
          type:        f.type,
          targetValue: Number(f.targetValue),
          countryId:   f.countryId ?? null,
        }),
      })
      if (res.ok) {
        onSaved()
      } else {
        const body = await res.json().catch(() => ({}))
        showToast(body?.error ?? 'Erreur lors de la sauvegarde', 'error')
      }
    } catch (e) {
      showToast('Erreur réseau', 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal title={target ? 'Modifier objectif' : 'Nouvel objectif'} onClose={onClose} size="md">
      <div className="space-y-3">
        <Field
          label="Utilisateur"
          value={String(f.userId)}
          onChange={u('userId')}
          options={[
            { value: '', label: 'Sélectionner...' },
            ...users.map((u: any) => ({ value: String(u.id), label: `${u.firstName} ${u.lastName} (${u.role})` })),
          ]}
        />
        <PeriodSelector
          pType={pType}
          value={f.period}
          onChangePType={t => {
            setPType(t)
            setF(p => ({
              ...p,
              period: t === 'yearly' ? String(year) : t === 'quarterly' ? `${year}-Q1` : t === 'biannual' ? `${year}-S1` : currentPeriod(),
            }))
          }}
          onChange={u('period')}
        />
        <Field
          label="Type d'objectif"
          value={f.type}
          onChange={u('type')}
          options={[
            { value: 'placements',   label: 'Placements' },
            { value: 'revenue',      label: "Chiffre d'affaires (EUR)" },
            { value: 'recruitments', label: 'Recrutements' },
            { value: 'missions',     label: 'Missions actives' },
            { value: 'clients',      label: 'Nouveaux clients' },
          ]}
        />
        <div className="grid grid-cols-2 gap-3">
          <Field label="Valeur objectif" type="number" value={f.targetValue} onChange={u('targetValue')} />
          <Field label="Valeur réalisée (auto)" type="number" value={target?.actualValue ?? 0} disabled hint="Calculée automatiquement" />
        </div>
        <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
          <Btn variant="secondary" onClick={onClose}>Annuler</Btn>
          <Btn onClick={save} disabled={saving}>{saving ? 'Enregistrement...' : 'Enregistrer'}</Btn>
        </div>
      </div>
    </Modal>
  )
}

// ─── Page principale ──────────────────────────────────────────────────────
export function TargetsPage() {
  const { showToast, showConfirm } = useAppStore()
  const { data: session, status: sessionStatus } = useSession()
  const qc = useQueryClient()
  const B = process.env.NEXT_PUBLIC_APP_URL ?? ''
  const role = (session?.user?.role ?? 'operator') as string
  const canEdit = sessionStatus === 'authenticated' && role !== 'operator'

  const [filter, setFilter] = useState('all')
  const [creating, setCreating] = useState(false)
  const [editing, setEditing] = useState<any>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['targets'],
    queryFn: () => fetch(`${B}/api/targets`).then(r => r.json()),
  })

  const targets = (data?.data ?? [])
    .filter((t: any) => filter === 'all' || getPeriodType(t.period) === filter)
    .sort((a: any, b: any) => (b.period ?? '').localeCompare(a.period ?? ''))

  const refresh = () => qc.refetchQueries({ queryKey: ['targets'] })

  const handleDelete = (id: number, e: React.MouseEvent) => {
    e.stopPropagation()
    showConfirm({
      title: 'Supprimer cet objectif ?',
      message: 'Cette action est irréversible.',
      danger: true,
      onConfirm: async () => {
        const res = await fetch(`${B}/api/targets/${id}`, { method: 'DELETE' })
        if (res.ok) { refresh(); showToast('Objectif supprimé') }
        else showToast('Erreur lors de la suppression', 'error')
      },
    })
  }

  return (
    <div className="fade-in space-y-4">
      <PageHeader
        title="Objectifs"
        subtitle={`${targets.length} objectif(s)`}
        actions={canEdit ? (
          <Btn icon={<Plus size={14} />} onClick={() => setCreating(true)}>Nouvel objectif</Btn>
        ) : undefined}
      />

      {/* Filtre période */}
      <div className="flex gap-2">
        <select
          value={filter}
          onChange={e => setFilter(e.target.value)}
          className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-teal-400"
        >
          <option value="all">Toutes périodes</option>
          <option value="monthly">Mensuel</option>
          <option value="quarterly">Trimestriel</option>
          <option value="biannual">Semestriel</option>
          <option value="yearly">Annuel</option>
        </select>
      </div>

      {/* Grille cards */}
      {isLoading ? (
        <div className="text-center py-16 text-slate-400 text-sm">Chargement...</div>
      ) : targets.length === 0 ? (
        <div className="text-center py-16 text-slate-400 text-sm">
          Aucun objectif{filter !== 'all' ? ' pour ce filtre' : ''}
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 14 }}>
          {targets.map((t: any) => {
            const actual = t.actualValue ?? 0
            const pct = t.targetValue > 0 ? Math.min(100, Math.round(actual / t.targetValue * 100)) : 0
            const color = pctColor(pct)
            const pt = getPeriodType(t.period)
            const isRevenue = t.type === 'revenue'
            const fmtVal = (v: number) => isRevenue
              ? `${new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(v)} €`
              : String(Math.round(v))

            return (
              <div
                key={t.id}
                className="group transition-all hover:shadow-md hover:-translate-y-0.5"
                style={{ padding: 14, background: '#fff', border: '1px solid #E2E8F0', borderRadius: 10 }}
              >
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <div style={{ fontSize: 11, color: '#94A3B8', textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.03em' }}>
                      {periodTypeLabel(pt)} — {periodLabel(t.period)}
                    </div>
                    <div style={{ fontWeight: 700, fontSize: 13.5, marginTop: 3, color: '#0F172A' }}>
                      {t.user?.firstName} {t.user?.lastName}
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {canEdit && (
                      <button
                        onClick={() => setEditing(t)}
                        className="p-1 rounded text-slate-300 hover:text-teal-600 hover:bg-teal-50 transition-colors opacity-0 group-hover:opacity-100"
                        title="Modifier"
                      ><Pencil size={13} /></button>
                    )}
                    {canEdit && (
                      <button
                        onClick={e => handleDelete(t.id, e)}
                        className="p-1 rounded text-slate-300 hover:text-red-500 hover:bg-red-50 transition-colors opacity-0 group-hover:opacity-100"
                        title="Supprimer"
                      ><Trash2 size={13} /></button>
                    )}
                    <Badge color={color} solid>{pct}%</Badge>
                  </div>
                </div>

                <div style={{ fontSize: 12, color: '#475569', marginBottom: 8 }}>{typeLabel(t.type)}</div>
                <ProgressBar value={actual} max={t.targetValue} color={color} />
                <div className="flex justify-between mt-1.5" style={{ fontSize: 11.5 }}>
                  <span style={{ color: '#94A3B8' }}>
                    Actuel : <strong style={{ color: '#0F172A' }}>{fmtVal(actual)}</strong>
                  </span>
                  <span style={{ color: '#94A3B8' }}>
                    Objectif : <strong style={{ color: '#0F172A' }}>{fmtVal(t.targetValue)}</strong>
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {creating && (
        <TargetForm
          onClose={() => setCreating(false)}
          onSaved={async () => { await refresh(); showToast('Objectif créé'); setCreating(false) }}
        />
      )}
      {editing && (
        <TargetForm
          target={editing}
          onClose={() => setEditing(null)}
          onSaved={async () => { await refresh(); showToast('Objectif modifié'); setEditing(null) }}
        />
      )}
    </div>
  )
}
