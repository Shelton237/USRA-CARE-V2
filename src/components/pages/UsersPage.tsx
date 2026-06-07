'use client'
import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useSession } from 'next-auth/react'
import { Modal, Field, Btn } from '@/components/ui'
import { useAppStore } from '@/store/app'
import { Search, Plus, Trash2, ShieldOff } from 'lucide-react'

// ─── Badges rôles ────────────────────────────────────────────────────
const ROLE_BADGE: Record<string, { label: string; bg: string; color: string }> = {
  admin:    { label: 'Super Admin', bg: '#EF4444', color: '#fff'    },
  dg:       { label: 'DG',          bg: '#EDE9FE', color: '#7C3AED' },
  operator: { label: 'Opérateur',   bg: '#CCFBF1', color: '#0D9488' },
}

// ─── Page Utilisateurs ────────────────────────────────────────────────
export function UsersPage() {
  const { data: session } = useSession()
  const { showToast } = useAppStore()
  const qc = useQueryClient()
  const isAdmin = session?.user?.role === 'admin'
  const isDG    = session?.user?.role === 'dg'

  if (session && session.user?.role === 'operator') {
    return (
      <div className="fade-in flex flex-col items-center justify-center py-20 text-slate-400">
        <ShieldOff size={40} style={{ marginBottom: 12, opacity: 0.4 }} />
        <p style={{ fontSize: 15, fontWeight: 600, color: '#64748B' }}>Accès réservé à l'administration</p>
        <p style={{ fontSize: 13, marginTop: 6 }}>Les opérateurs ne peuvent pas gérer les utilisateurs.</p>
      </div>
    )
  }

  const [search,   setSearch]   = useState('')
  const [creating, setCreating] = useState(false)
  const [editing,  setEditing]  = useState<any>(null)

  const B = process.env.NEXT_PUBLIC_APP_URL ?? ''

  const { data, isLoading } = useQuery({
    queryKey: ['users', search],
    queryFn:  () => fetch(`${B}/api/users?search=${encodeURIComponent(search)}`).then(r => r.json()),
  })
  const users: any[] = data?.data ?? []

  return (
    <div className="fade-in">

      {/* ── Header ──────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-5">
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: '#0F172A', lineHeight: 1.2 }}>
            Utilisateurs
          </h1>
          <p style={{ fontSize: 13, color: '#94A3B8', marginTop: 3 }}>
            {isLoading ? '...' : `${users.length} utilisateur(s)`}
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Search */}
          <div className="relative">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Rechercher..."
              style={{
                paddingLeft: 32, paddingRight: 12, paddingTop: 8, paddingBottom: 8,
                fontSize: 13, border: '1px solid #E2E8F0', borderRadius: 8,
                background: '#fff', color: '#1E293B', outline: 'none', width: 200,
              }}
            />
          </div>

          {/* Bouton nouveau */}
          {(isAdmin || isDG) && (
            <button
              onClick={() => setCreating(true)}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '8px 16px', fontSize: 13, fontWeight: 600,
                background: '#0D9488', color: '#fff', border: 'none',
                borderRadius: 8, cursor: 'pointer',
              }}
            >
              <Plus size={15} />
              Nouvel utilisateur
            </button>
          )}
        </div>
      </div>

      {/* ── Table card ──────────────────────────────────────── */}
      <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #E2E8F0', overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>

            {/* En-têtes */}
            <thead>
              <tr style={{ borderBottom: '1px solid #F1F5F9' }}>
                {['NOM','EMAIL','TÉLÉPHONE','RÔLE','PAYS','BUREAU','STATUT'].map(col => (
                  <th key={col} style={{
                    padding: '11px 20px', textAlign: 'left', fontSize: 11,
                    fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase',
                    letterSpacing: '0.07em', whiteSpace: 'nowrap', background: '#fff',
                  }}>
                    {col}
                  </th>
                ))}
              </tr>
            </thead>

            {/* Corps */}
            <tbody>
              {isLoading && (
                <tr><td colSpan={7} style={{ padding: 32, textAlign: 'center', color: '#94A3B8', fontSize: 13 }}>Chargement...</td></tr>
              )}
              {!isLoading && users.length === 0 && (
                <tr><td colSpan={7} style={{ padding: 32, textAlign: 'center', color: '#94A3B8', fontSize: 13 }}>Aucun utilisateur trouvé</td></tr>
              )}
              {users.map((u: any, i: number) => {
                const role = ROLE_BADGE[u.role] ?? { label: u.role, bg: '#E2E8F0', color: '#475569' }
                return (
                  <tr
                    key={u.id}
                    onClick={() => setEditing(u)}
                    style={{ borderBottom: i < users.length - 1 ? '1px solid #F8FAFC' : 'none', cursor: 'pointer' }}
                    onMouseEnter={e => (e.currentTarget.style.background = '#F8FAFC')}
                    onMouseLeave={e => (e.currentTarget.style.background = '#fff')}
                  >
                    {/* NOM */}
                    <td style={{ padding: '14px 20px', fontWeight: 500, color: '#1E293B', whiteSpace: 'nowrap' }}>
                      {u.firstName} {u.lastName}
                    </td>

                    {/* EMAIL */}
                    <td style={{ padding: '14px 20px', color: '#475569', whiteSpace: 'nowrap' }}>
                      {u.email}
                    </td>

                    {/* TÉLÉPHONE */}
                    <td style={{ padding: '14px 20px', color: '#475569', whiteSpace: 'nowrap' }}>
                      {u.phone || '—'}
                    </td>

                    {/* RÔLE */}
                    <td style={{ padding: '14px 20px', whiteSpace: 'nowrap' }}>
                      <span style={{
                        display: 'inline-block',
                        padding: '3px 12px', borderRadius: 999,
                        fontSize: 12, fontWeight: 600,
                        background: role.bg, color: role.color,
                      }}>
                        {role.label}
                      </span>
                    </td>

                    {/* PAYS */}
                    <td style={{ padding: '14px 20px', color: '#475569', whiteSpace: 'nowrap' }}>
                      {u.country?.name ?? '—'}
                    </td>

                    {/* BUREAU */}
                    <td style={{ padding: '14px 20px', color: '#475569', whiteSpace: 'nowrap' }}>
                      {u.office?.name ?? '—'}
                    </td>

                    {/* STATUT */}
                    <td style={{ padding: '14px 20px', whiteSpace: 'nowrap' }}>
                      <span style={{
                        display: 'inline-block',
                        padding: '2px 10px', borderRadius: 999,
                        fontSize: 12, fontWeight: 600,
                        background: u.active ? '#ECFDF5' : '#FEF2F2',
                        color:      u.active ? '#059669' : '#DC2626',
                      }}>
                        {u.active ? 'Actif' : 'Inactif'}
                      </span>
                    </td>

                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Modales ─────────────────────────────────────────── */}
      {(creating || editing) && (
        <UserForm
          user={editing}
          currentUserRole={session?.user?.role ?? 'operator'}
          currentUserCountryId={session?.user?.countryId ?? null}
          onClose={() => { setCreating(false); setEditing(null) }}
          onSaved={() => {
            qc.invalidateQueries({ queryKey: ['users'] })
            showToast(editing ? 'Utilisateur modifié' : 'Utilisateur créé')
          }}
        />
      )}
    </div>
  )
}

// ─── Formulaire (design exact du screenshot) ─────────────────────────
function UserForm({ user, currentUserRole, currentUserCountryId, onClose, onSaved }: {
  user?: any
  currentUserRole: string
  currentUserCountryId: number | null
  onClose: () => void
  onSaved: () => void
}) {
  const { showToast, showConfirm } = useAppStore()
  const qc = useQueryClient()
  const B = process.env.NEXT_PUBLIC_APP_URL ?? ''

  const { data: countriesData } = useQuery({
    queryKey: ['countries-list'],
    queryFn:  () => fetch(`${B}/api/countries`).then(r => r.json()),
  })
  const countries: any[] = (countriesData?.data ?? []).filter((c: any) => c.active)

  const [f, setF] = useState({
    firstName: user?.firstName ?? '',
    lastName:  user?.lastName  ?? '',
    email:     user?.email     ?? '',
    phone:     user?.phone     ?? '',
    role:      user?.role      ?? 'operator',
    countryId: user?.countryId ?? (currentUserRole === 'dg' ? currentUserCountryId : null),
    officeId:  user?.officeId  ?? null,
    active:    user?.active    ?? true,
    password:  '',
  })

  const u = (k: string) => (v: any) => setF(p => ({ ...p, [k]: v }))

  const selectedCountry = countries.find((c: any) => c.id === Number(f.countryId))
  const offices: any[] = selectedCountry?.offices ?? []

  const roleOptions = currentUserRole === 'admin'
    ? [
        { value: 'admin',    label: 'Super Admin'       },
        { value: 'dg',       label: 'Directeur Général' },
        { value: 'operator', label: 'Opérateur'         },
      ]
    : [{ value: 'operator', label: 'Opérateur' }]

  const save = async () => {
    if (!f.firstName || !f.lastName || !f.email) {
      showToast('Prénom, nom et email sont requis', 'error'); return
    }
    if (!user && !f.password) {
      showToast('Mot de passe requis', 'error'); return
    }
    const payload: any = {
      ...f,
      countryId: f.countryId ? Number(f.countryId) : null,
      officeId:  f.officeId  ? Number(f.officeId)  : null,
    }
    if (!payload.password) delete payload.password

    const res = await fetch(
      user ? `${B}/api/users/${user.id}` : `${B}/api/users`,
      { method: user ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }
    )
    if (res.ok) { onSaved(); onClose() }
    else {
      const e = await res.json()
      showToast(e.error ?? 'Erreur lors de la sauvegarde', 'error')
    }
  }

  const handleDelete = () => {
    showConfirm({
      title:   `Supprimer ${user.firstName} ${user.lastName} ?`,
      message: 'Cette action est irréversible. Le compte sera définitivement supprimé.',
      danger:  true,
      onConfirm: async () => {
        const res = await fetch(`${B}/api/users/${user.id}`, { method: 'DELETE' })
        if (res.ok) {
          qc.invalidateQueries({ queryKey: ['users'] })
          showToast('Utilisateur supprimé')
          onClose()
        } else {
          const e = await res.json()
          showToast(e.error ?? 'Impossible de supprimer', 'error')
        }
      },
    })
  }

  // ── Styles réutilisables ─────────────────────────────────────────
  const label: React.CSSProperties = {
    display: 'block', fontSize: 13, fontWeight: 500,
    color: '#374151', marginBottom: 5,
  }
  const input: React.CSSProperties = {
    width: '100%', padding: '9px 12px', fontSize: 13,
    border: '1px solid #D1D5DB', borderRadius: 7,
    background: '#fff', color: '#111827', outline: 'none',
    fontFamily: 'inherit', boxSizing: 'border-box',
  }
  const select: React.CSSProperties = { ...input, cursor: 'pointer' }

  return (
    <Modal
      title={user ? 'Modifier utilisateur' : 'Nouvel utilisateur'}
      onClose={onClose}
      size="lg"
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

        {/* ── Row 1 : Prénom | Nom ─────────────────────────── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          <div>
            <label style={label}>Prénom <span style={{ color: '#EF4444' }}>*</span></label>
            <input style={input} value={f.firstName} onChange={e => u('firstName')(e.target.value)} placeholder="Prénom" />
          </div>
          <div>
            <label style={label}>Nom <span style={{ color: '#EF4444' }}>*</span></label>
            <input style={input} value={f.lastName} onChange={e => u('lastName')(e.target.value)} placeholder="Nom" />
          </div>
        </div>

        {/* ── Row 2 : Email | Téléphone ────────────────────── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          <div>
            <label style={label}>Email <span style={{ color: '#EF4444' }}>*</span></label>
            <input style={input} type="email" value={f.email} onChange={e => u('email')(e.target.value)} placeholder="email@exemple.com" />
          </div>
          <div>
            <label style={label}>Téléphone</label>
            <input style={input} value={f.phone} onChange={e => u('phone')(e.target.value)} placeholder="+261 XX XX XX XX" />
          </div>
        </div>

        {/* ── Row 3 : Rôle | Pays | Bureau (3 cols) ─────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
          <div>
            <label style={label}>Rôle</label>
            <select style={select} value={f.role}
              onChange={e => setF(p => ({ ...p, role: e.target.value, countryId: e.target.value === 'admin' ? null : p.countryId, officeId: null }))}>
              {roleOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
          <div>
            <label style={label}>Pays</label>
            <select style={select} value={f.countryId ?? ''}
              onChange={e => setF(p => ({ ...p, countryId: e.target.value ? Number(e.target.value) : null, officeId: null }))}>
              <option value="">Tous les pays</option>
              {countries.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label style={label}>Bureau</label>
            <select style={{ ...select, color: !f.countryId ? '#9CA3AF' : '#111827' }}
              value={f.officeId ?? ''} disabled={!f.countryId}
              onChange={e => setF(p => ({ ...p, officeId: e.target.value ? Number(e.target.value) : null }))}>
              <option value="">Tous bureaux</option>
              {offices.map((o: any) => <option key={o.id} value={o.id}>{o.name}</option>)}
            </select>
          </div>
        </div>

        {/* ── Row 4 : Mot de passe (full width) ──────────────── */}
        <div>
          <label style={label}>Mot de passe</label>
          <input style={input} type="password" value={f.password}
            onChange={e => u('password')(e.target.value)}
            placeholder={user ? '••••••••' : 'Mot de passe'} />
          {user && (
            <p style={{ fontSize: 12, color: '#9CA3AF', marginTop: 5 }}>
              Laisser vide pour ne pas changer
            </p>
          )}
        </div>

        {/* ── Row 5 : Checkbox Compte actif ──────────────────── */}
        <label style={{ display: 'flex', alignItems: 'center', gap: 9, cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={f.active}
            onChange={e => setF(p => ({ ...p, active: e.target.checked }))}
            style={{ width: 16, height: 16, accentColor: '#0D9488', cursor: 'pointer' }}
          />
          <span style={{ fontSize: 13, color: '#374151' }}>Compte actif (peut se connecter)</span>
        </label>

      </div>

      {/* ── Footer ─────────────────────────────────────────────── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 24, paddingTop: 16, borderTop: '1px solid #F1F5F9' }}>

        {/* Supprimer (si édition + admin) */}
        <div>
          {user && currentUserRole === 'admin' && (
            <button onClick={handleDelete}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '7px 13px', fontSize: 13, fontWeight: 500,
                background: '#FEF2F2', color: '#DC2626',
                border: '1px solid #FECACA', borderRadius: 7, cursor: 'pointer',
              }}>
              <Trash2 size={14} />
              Supprimer
            </button>
          )}
        </div>

        {/* Annuler + Enregistrer */}
        <div style={{ display: 'flex', gap: 10 }}>
          <Btn variant="secondary" onClick={onClose}>Annuler</Btn>
          <Btn onClick={save}>{user ? 'Enregistrer' : "Créer l'utilisateur"}</Btn>
        </div>

      </div>
    </Modal>
  )
}
