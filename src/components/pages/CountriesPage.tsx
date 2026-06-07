'use client'
import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { PageHeader, Btn, Modal, Tabs, Field, Badge } from '@/components/ui'
import { useSession } from 'next-auth/react'
import { useAppStore } from '@/store/app'
import { Plus, X, Trash2, RefreshCw, Check, Pencil, ShieldOff } from 'lucide-react'

const B = process.env.NEXT_PUBLIC_APP_URL ?? ''

const EMPTY_COUNTRY = {
  name: '', code: '', active: true,
  currency: '', currencyName: '', symbol: '', exchangeToEur: 1,
  phonePrefix: '', invoicePrefix: '', prorataBase: 30, vatRate: 20,
  syntheticTaxEnabled: false, syntheticTaxRate: 0,
  entityName: '', taxId: '', statId: '', address: '', city: '',
  entityPhone: '', entityEmail: '', bankName: '', bankAccount: '',
  legalMention: '', mobileMoneyProviders: '',
  contributions: [], irsaBrackets: [],
}

// ─── Taux de change section ───────────────────────────────────────────────────

function ExchangeRates({ countries, onUpdated }: { countries: any[]; onUpdated: () => void }) {
  const { showToast } = useAppStore()
  const [editingId, setEditingId] = useState<number | null>(null)
  const [inputVal, setInputVal] = useState('')
  const [saving, setSaving] = useState(false)

  const startEdit = (c: any) => {
    // User enters "1 € = X symbol" — so we show Math.round(1/exchangeToEur)
    const inverse = c.exchangeToEur > 0 ? Math.round(1 / c.exchangeToEur) : 1
    setInputVal(String(inverse))
    setEditingId(c.id)
  }

  const cancelEdit = () => { setEditingId(null); setInputVal('') }

  const saveRate = async (countryId: number) => {
    const inverse = parseFloat(inputVal)
    if (!inverse || inverse <= 0) { showToast('Taux invalide', 'error'); return }
    const exchangeToEur = 1 / inverse
    setSaving(true)
    try {
      const res = await fetch(`${B}/api/countries/${countryId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ exchangeToEur }),
      })
      if (res.ok) {
        onUpdated()
        showToast('Taux de change mis à jour — tous les calculs sont recalculés')
        setEditingId(null)
      } else {
        const j = await res.json().catch(() => ({}))
        showToast(j?.error ?? 'Erreur', 'error')
      }
    } catch { showToast('Erreur réseau', 'error') }
    finally { setSaving(false) }
  }

  return (
    <div style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: 12, overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ padding: '12px 16px', borderBottom: '1px solid #F1F5F9', display: 'flex', alignItems: 'center', gap: 10 }}>
        <RefreshCw size={14} style={{ color: '#0D9488' }} />
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#0F172A' }}>Taux de change</div>
          <div style={{ fontSize: 11, color: '#94A3B8', marginTop: 1 }}>
            S'applique partout : Trésorerie · Reporting · Objectifs · Paie consolidée
          </div>
        </div>
      </div>

      {/* Rows */}
      <div>
        {countries.filter((c: any) => c.active).map((c: any, i: number) => {
          const isEditing = editingId === c.id
          const inverse = c.exchangeToEur > 0 ? (1 / c.exchangeToEur) : 1
          // Format inverse nicely
          const displayed = inverse >= 100
            ? Math.round(inverse).toLocaleString('fr-FR')
            : inverse.toFixed(4)

          return (
            <div key={c.id} style={{
              display: 'flex', alignItems: 'center', gap: 12,
              padding: '10px 16px',
              borderTop: i > 0 ? '1px solid #F8FAFC' : undefined,
            }}>
              {/* Country + symbol */}
              <div style={{ minWidth: 140 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#0F172A' }}>{c.name}</div>
                <div style={{ fontSize: 11, color: '#94A3B8' }}>{c.currency} · {c.symbol}</div>
              </div>

              {/* Rate display / edit */}
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 8 }}>
                {isEditing ? (
                  <>
                    <span style={{ fontSize: 12, color: '#64748B', whiteSpace: 'nowrap' }}>1 € =</span>
                    <input
                      type="number"
                      value={inputVal}
                      onChange={e => setInputVal(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') saveRate(c.id); if (e.key === 'Escape') cancelEdit() }}
                      autoFocus
                      step="any"
                      style={{
                        width: 120, padding: '4px 8px', fontSize: 13, fontWeight: 600,
                        border: '1.5px solid #0D9488', borderRadius: 6, outline: 'none',
                        background: '#F0FDFA', color: '#0F172A',
                      }}
                    />
                    <span style={{ fontSize: 12, color: '#64748B' }}>{c.symbol}</span>
                    <button
                      onClick={() => saveRate(c.id)} disabled={saving}
                      style={{ padding: '4px 10px', borderRadius: 6, border: 'none', cursor: 'pointer', background: '#0D9488', color: '#fff', fontSize: 12, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
                      <Check size={12} /> Valider
                    </button>
                    <button
                      onClick={cancelEdit}
                      style={{ padding: '4px 8px', borderRadius: 6, border: '1px solid #E2E8F0', cursor: 'pointer', background: '#fff', color: '#64748B', fontSize: 12 }}>
                      <X size={12} />
                    </button>
                  </>
                ) : (
                  <>
                    <span style={{ fontSize: 13, color: '#475569' }}>
                      1 € = <strong style={{ color: '#0F172A' }}>{displayed} {c.symbol}</strong>
                    </span>
                    <span style={{ fontSize: 11, color: '#94A3B8' }}>
                      (1 {c.symbol} = {c.exchangeToEur.toFixed(6)} €)
                    </span>
                  </>
                )}
              </div>

              {/* Edit button */}
              {!isEditing && (
                <button
                  onClick={() => startEdit(c)}
                  style={{ padding: '4px 10px', borderRadius: 6, border: '1px solid #E2E8F0', cursor: 'pointer', background: '#F8FAFC', color: '#64748B', fontSize: 12, display: 'flex', alignItems: 'center', gap: 5 }}>
                  <Pencil size={11} /> Modifier
                </button>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export function CountriesPage() {
  const { data: session } = useSession()
  const { showToast } = useAppStore()
  const qc = useQueryClient()

  if (session && session.user?.role !== 'admin') {
    return (
      <div className="fade-in flex flex-col items-center justify-center py-20 text-slate-400">
        <ShieldOff size={40} style={{ marginBottom: 12, opacity: 0.4 }} />
        <p style={{ fontSize: 15, fontWeight: 600, color: '#64748B' }}>Accès réservé au Super Admin</p>
        <p style={{ fontSize: 13, marginTop: 6 }}>Seul l'administrateur principal peut gérer les pays et entités.</p>
      </div>
    )
  }
  const [editing, setEditing] = useState<any>(null)
  const [adding, setAdding]   = useState(false)

  const { data, isLoading } = useQuery({
    queryKey: ['countries-all'],
    queryFn: () => fetch(`${B}/api/countries?all=true`).then(r => r.json()),
  })
  const countries = data?.data ?? []

  const refresh = () => {
    qc.refetchQueries({ queryKey: ['countries-all'] })
    qc.refetchQueries({ queryKey: ['countries-list'] })
    qc.refetchQueries({ queryKey: ['cash'] })
    qc.refetchQueries({ queryKey: ['dashboard'] })
  }

  const handleSaved    = () => { refresh(); showToast('Configuration mise à jour'); setEditing(null) }
  const handleCreated  = () => { refresh(); showToast('Pays ajouté avec succès'); setAdding(false) }

  const handleDelete = async (id: number) => {
    const res = await fetch(`${B}/api/countries/${id}`, { method: 'DELETE' })
    if (res.ok) { refresh(); showToast('Pays supprimé'); setEditing(null) }
    else showToast('Erreur lors de la suppression', 'error')
  }

  return (
    <div className="fade-in space-y-4">
      <PageHeader
        title="Pays / Entités"
        subtitle={`${countries.length} pays — configurations administratives, taux légaux, mobile money`}
        actions={<Btn icon={<Plus size={14} />} onClick={() => setAdding(true)}>Ajouter un pays</Btn>}
      />

      {/* Taux de change — visible en premier, car impact global */}
      {!isLoading && countries.length > 0 && (
        <ExchangeRates countries={countries} onUpdated={refresh} />
      )}

      {isLoading ? (
        <div className="text-center py-16 text-slate-400 text-sm">Chargement...</div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 14 }}>
          {countries.map((c: any) => (
            <CountryCard key={c.id} country={c}
              onClick={() => setEditing(c)}
              onDelete={() => handleDelete(c.id)}
            />
          ))}
        </div>
      )}

      {editing && (
        <CountryConfigModal
          country={editing} isNew={false}
          onClose={() => setEditing(null)}
          onSaved={handleSaved}
          onDelete={() => handleDelete(editing.id)}
        />
      )}

      {adding && (
        <CountryConfigModal
          country={{ ...EMPTY_COUNTRY }} isNew
          onClose={() => setAdding(false)}
          onSaved={handleCreated}
        />
      )}
    </div>
  )
}

// ─── Country card ─────────────────────────────────────────────────────────────

function CountryCard({ country, onClick, onDelete }: { country: any; onClick: () => void; onDelete: () => void }) {
  const providers = country.mobileMoneyProviders
    ? country.mobileMoneyProviders.split(',').map((s: string) => s.trim()).filter(Boolean)
    : []

  const inverse = country.exchangeToEur > 0 ? Math.round(1 / country.exchangeToEur) : '—'

  return (
    <div
      onClick={onClick}
      className="group cursor-pointer transition-all hover:shadow-md hover:-translate-y-0.5"
      style={{ padding: 16, background: '#fff', border: '1px solid #E2E8F0', borderRadius: 12 }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-1">
        <span style={{ fontSize: 16, fontWeight: 800, color: '#0F172A' }}>{country.name}</span>
        <div className="flex items-center gap-1.5">
          <button
            onClick={e => { e.stopPropagation(); onDelete() }}
            className="p-1 rounded-md transition-colors text-slate-300 hover:text-red-500 hover:bg-red-50 opacity-0 group-hover:opacity-100"
            title="Supprimer ce pays"
          >
            <Trash2 size={13} />
          </button>
          <Badge color={country.active ? '#10B981' : '#94A3B8'} solid={country.active}>
            {country.active ? 'Actif' : 'Inactif'}
          </Badge>
        </div>
      </div>

      {country.entityName && (
        <div style={{ fontSize: 12, color: '#94A3B8', marginBottom: 10 }}>{country.entityName}</div>
      )}

      {/* Info rows */}
      <div style={{ fontSize: 12, color: '#475569', lineHeight: 1.9 }}>
        <div>Devise : {country.currency} ({country.symbol}) · 1€ = {typeof inverse === 'number' ? inverse.toLocaleString('fr-FR') : inverse} {country.symbol}</div>
        {country.taxId && <div>{country.taxId}</div>}
        {(country.address || country.city) && (
          <div>{[country.address, country.city].filter(Boolean).join(', ')}</div>
        )}
        <div style={{ marginBottom: 2 }}>
          {country.offices?.length ?? 0} bureau(x)
        </div>
      </div>

      {/* Mobile money */}
      <div style={{ borderTop: '1px solid #E2E8F0', marginTop: 10, paddingTop: 10 }}>
        {providers.length > 0 ? (
          <div style={{ fontSize: 12, color: '#475569' }}>
            <strong>Mobile Money :</strong> {providers.join(', ')}
          </div>
        ) : (
          <div style={{ fontSize: 12, color: '#94A3B8' }}><strong>Mobile Money :</strong> —</div>
        )}
      </div>
    </div>
  )
}

// ─── Config modal ─────────────────────────────────────────────────────────────

function CountryConfigModal({ country, isNew, onClose, onSaved, onDelete }: {
  country: any; isNew: boolean; onClose: () => void; onSaved: () => void; onDelete?: () => void
}) {
  const { showToast } = useAppStore()
  const [tab, setTab] = useState('admin')
  const [saving, setSaving] = useState(false)

  const [f, setF] = useState<any>({
    name:                 country.name,
    code:                 country.code,
    active:               country.active,
    currency:             country.currency,
    currencyName:         country.currencyName,
    symbol:               country.symbol,
    exchangeToEur:        country.exchangeToEur,
    phonePrefix:          country.phonePrefix,
    invoicePrefix:        country.invoicePrefix,
    prorataBase:          country.prorataBase,
    vatRate:              country.vatRate,
    syntheticTaxEnabled:  country.syntheticTaxEnabled,
    syntheticTaxRate:     country.syntheticTaxRate,
    entityName:           country.entityName ?? '',
    taxId:                country.taxId ?? '',
    statId:               country.statId ?? '',
    address:              country.address ?? '',
    city:                 country.city ?? '',
    entityPhone:          country.entityPhone ?? '',
    entityEmail:          country.entityEmail ?? '',
    bankName:             country.bankName ?? '',
    bankAccount:          country.bankAccount ?? '',
    legalMention:         country.legalMention ?? '',
    mobileMoneyProviders: country.mobileMoneyProviders ?? '',
    contributions: country.contributions?.map((c: any) => ({ ...c })) ?? [],
    irsaBrackets:  country.irsaBrackets?.map((b: any) => ({ ...b })) ?? [],
  })

  const u = (k: string) => (v: any) => setF((p: any) => ({ ...p, [k]: v }))

  const addContrib = () => setF((p: any) => ({
    ...p,
    contributions: [...p.contributions, { code: `contrib_${Date.now()}`, label: '', mode: 'percent', value: 0, part: 'employee', enabled: true }],
  }))
  const removeContrib = (i: number) => setF((p: any) => ({
    ...p, contributions: p.contributions.filter((_: any, idx: number) => idx !== i),
  }))
  const updateContrib = (i: number, k: string, v: any) => setF((p: any) => ({
    ...p, contributions: p.contributions.map((c: any, idx: number) => idx === i ? { ...c, [k]: v } : c),
  }))

  const addBracket = () => setF((p: any) => ({
    ...p, irsaBrackets: [...p.irsaBrackets, { fromAmount: 0, toAmount: null, rate: 0 }],
  }))
  const removeBracket = (i: number) => setF((p: any) => ({
    ...p, irsaBrackets: p.irsaBrackets.filter((_: any, idx: number) => idx !== i),
  }))
  const updateBracket = (i: number, k: string, v: any) => setF((p: any) => ({
    ...p, irsaBrackets: p.irsaBrackets.map((b: any, idx: number) => idx === i ? { ...b, [k]: v } : b),
  }))

  const save = async () => {
    setSaving(true)
    try {
      const url    = isNew ? `${B}/api/countries` : `${B}/api/countries/${country.id}`
      const method = isNew ? 'POST' : 'PUT'
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...f,
          contributions: f.contributions.map((c: any) => ({
            code:    c.code,
            label:   c.label,
            mode:    c.mode,
            value:   parseFloat(c.value) || 0,
            base:    c.base || 'gross',
            part:    c.part,
            enabled: c.enabled !== false,
          })),
          irsaBrackets: f.irsaBrackets.map((b: any) => ({
            fromAmount: parseFloat(b.fromAmount) || 0,
            toAmount:   b.toAmount !== '' && b.toAmount != null ? parseFloat(b.toAmount) : null,
            rate:       parseFloat(b.rate) || 0,
          })),
        }),
      })
      if (res.ok) { onSaved() }
      else showToast('Erreur lors de la sauvegarde', 'error')
    } finally {
      setSaving(false)
    }
  }

  const TABS = [
    { id: 'admin',   label: 'Infos administratives' },
    { id: 'finance', label: 'Devise et change' },
    { id: 'social',  label: 'Charges sociales' },
    { id: 'irsa',    label: 'Impôt salaires' },
    { id: 'mobile',  label: 'Mobile Money' },
  ]

  return (
    <Modal title={isNew ? 'Nouveau pays — Configuration' : `${country.name} — Configuration`}
      subtitle={isNew ? undefined : (f.entityName || undefined)}
      onClose={onClose} size="xl">
      <Tabs tabs={TABS} active={tab} onChange={setTab} />

      {tab === 'admin' && (
        <div className="space-y-3">
          <div className="rounded-lg px-3 py-2.5 text-xs" style={{ background: 'rgba(13,148,136,0.08)', color: '#0D9488' }}>
            Ces informations apparaîtront sur toutes les factures et bulletins de paie émis depuis ce pays.
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="Nom de l'entité légale" value={f.entityName} onChange={u('entityName')} className="col-span-full" />
            <Field label="Identifiant fiscal" value={f.taxId} onChange={u('taxId')} placeholder="NIF, IFU, n° fiscal..." />
            <Field label="Identifiant statistique / RCCM" value={f.statId} onChange={u('statId')} />
            <Field label="Adresse" value={f.address} onChange={u('address')} className="col-span-full" />
            <div className="col-span-full grid grid-cols-1 sm:grid-cols-3 gap-3">
              <Field label="Ville" value={f.city} onChange={u('city')} />
              <Field label="Téléphone" value={f.entityPhone} onChange={u('entityPhone')} />
              <Field label="Email" value={f.entityEmail} onChange={u('entityEmail')} type="email" />
            </div>
            <Field label="Compte bancaire (IBAN)" value={f.bankAccount} onChange={u('bankAccount')} className="col-span-full" />
            <Field label="Mention légale (apparaît en pied de facture/bulletin)" value={f.legalMention} onChange={u('legalMention')} textarea className="col-span-full" />
            <div className="col-span-full flex items-center gap-3">
              <label className="flex items-center gap-2 cursor-pointer text-sm text-slate-700">
                <input type="checkbox" checked={f.active} onChange={e => u('active')(e.target.checked)}
                  className="w-4 h-4 rounded accent-teal-600" />
                Pays actif
              </label>
            </div>
          </div>
        </div>
      )}

      {tab === 'finance' && (
        <div className="space-y-3">
          {/* Taux de change — highlight */}
          <div className="rounded-lg p-3" style={{ background: '#F0FDFA', border: '1px solid #99F6E4' }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#0D9488', marginBottom: 6 }}>
              Taux de change vers l'Euro
            </div>
            <div style={{ fontSize: 11, color: '#475569', marginBottom: 8, lineHeight: 1.6 }}>
              Ce taux est utilisé partout dans le projet pour consolider les montants en €.<br />
              Format : combien vaut <strong>1 unité de la devise locale</strong> en €.
              <br />Ex. : <code>0.0002</code> pour l'Ariary (1 Ar = 0.0002 €, soit 1 € = 5 000 Ar)
            </div>
            <Field
              label={`Taux (1 ${f.symbol || 'devise'} = ? €)`}
              value={f.exchangeToEur}
              onChange={u('exchangeToEur')}
              type="number"
              hint={f.exchangeToEur > 0 ? `1 € ≈ ${Math.round(1 / f.exchangeToEur).toLocaleString('fr-FR')} ${f.symbol}` : ''}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Field label="Code devise (ISO)" value={f.currency} onChange={u('currency')} placeholder="MGA, XAF..." />
            <Field label="Nom devise" value={f.currencyName} onChange={u('currencyName')} placeholder="Ariary, Franc CFA..." />
            <Field label="Symbole" value={f.symbol} onChange={u('symbol')} placeholder="Ar, FCFA..." />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Préfixe téléphonique" value={f.phonePrefix} onChange={u('phonePrefix')} placeholder="+261, +237..." />
            <Field label="Préfixe facture" value={f.invoicePrefix} onChange={u('invoicePrefix')} placeholder="MG, CM, CI..." />
          </div>
          <Field label="Base prorata par défaut (jours)" value={f.prorataBase} onChange={u('prorataBase')} type="number"
            hint="30 jours calendaires ou 22 jours ouvrés" />
          <div className="grid grid-cols-2 gap-3">
            <Field label="Taux TVA (%)" value={f.vatRate} onChange={u('vatRate')} type="number" suffix="%" />
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-600">Impôt synthétique</label>
              <div className="flex items-center gap-3 mt-1.5">
                <label className="flex items-center gap-2 cursor-pointer text-sm text-slate-700">
                  <input type="checkbox" checked={f.syntheticTaxEnabled} onChange={e => u('syntheticTaxEnabled')(e.target.checked)}
                    className="w-4 h-4 rounded accent-teal-600" />
                  Activé
                </label>
                {f.syntheticTaxEnabled && (
                  <div className="flex-1">
                    <Field value={f.syntheticTaxRate} onChange={u('syntheticTaxRate')} type="number" suffix="%" />
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {tab === 'social' && (
        <div className="space-y-3">
          <div className="rounded-lg px-3 py-2.5 text-xs" style={{ background: '#FFFBEB', color: '#F59E0B' }}>
            Taux de cotisations sociales appliqués aux contrats Mise à Disposition (employés déclarés).
          </div>
          <div className="grid gap-2 text-xs font-semibold text-slate-500 px-1"
            style={{ gridTemplateColumns: '2fr 1fr 1fr auto' }}>
            <span>Nom de la cotisation</span>
            <span>Taux (%)</span>
            <span>Partie</span>
            <span className="w-8" />
          </div>
          {f.contributions.map((c: any, i: number) => (
            <div key={i} className="grid gap-2 p-2.5 rounded-lg"
              style={{ gridTemplateColumns: '2fr 1fr 1fr auto', background: '#F8FAFC', alignItems: 'center' }}>
              <input value={c.label} onChange={e => updateContrib(i, 'label', e.target.value)}
                placeholder="Nom de la cotisation"
                className="w-full rounded-md border border-slate-200 px-2.5 py-1.5 text-sm text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-teal-400" />
              <input type="number" step="0.001" value={c.value} onChange={e => updateContrib(i, 'value', e.target.value)}
                className="w-full rounded-md border border-slate-200 px-2.5 py-1.5 text-sm text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-teal-400" />
              <select value={c.part} onChange={e => updateContrib(i, 'part', e.target.value)}
                className="w-full rounded-md border border-slate-200 px-2 py-1.5 text-sm text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-teal-400">
                <option value="employee">Salarié</option>
                <option value="employer">Patronal</option>
              </select>
              <button onClick={() => removeContrib(i)}
                className="p-1.5 rounded-md text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors">
                <X size={14} />
              </button>
            </div>
          ))}
          <Btn size="sm" variant="secondary" icon={<Plus size={12} />} onClick={addContrib}>
            Ajouter cotisation
          </Btn>
        </div>
      )}

      {tab === 'irsa' && (
        <div className="space-y-3">
          <div className="rounded-lg px-3 py-2.5 text-xs" style={{ background: '#FFFBEB', color: '#F59E0B' }}>
            Tranches d'imposition sur le revenu salarial (IRSA). Le calcul se fait sur le brut imposable mensuel.
          </div>
          <div className="grid gap-2 text-xs font-semibold text-slate-500 px-1"
            style={{ gridTemplateColumns: '1fr 1fr 1fr auto' }}>
            <span>De</span>
            <span>Jusqu'à (vide = ∞)</span>
            <span>Taux %</span>
            <span className="w-8" />
          </div>
          {f.irsaBrackets.map((b: any, i: number) => (
            <div key={i} className="grid gap-2 p-2.5 rounded-lg"
              style={{ gridTemplateColumns: '1fr 1fr 1fr auto', background: '#F8FAFC', alignItems: 'center' }}>
              <input type="number" value={b.fromAmount} onChange={e => updateBracket(i, 'fromAmount', e.target.value)}
                className="w-full rounded-md border border-slate-200 px-2.5 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-teal-400" placeholder="0" />
              <input type="number" value={b.toAmount ?? ''} onChange={e => updateBracket(i, 'toAmount', e.target.value === '' ? null : e.target.value)}
                className="w-full rounded-md border border-slate-200 px-2.5 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-teal-400" placeholder="∞" />
              <input type="number" step="0.01" value={b.rate} onChange={e => updateBracket(i, 'rate', e.target.value)}
                className="w-full rounded-md border border-slate-200 px-2.5 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-teal-400" placeholder="0" />
              <button onClick={() => removeBracket(i)}
                className="p-1.5 rounded-md text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors">
                <X size={14} />
              </button>
            </div>
          ))}
          <Btn size="sm" variant="secondary" icon={<Plus size={12} />} onClick={addBracket}>
            Ajouter tranche
          </Btn>
        </div>
      )}

      {tab === 'mobile' && (
        <div className="space-y-3">
          <div className="rounded-lg px-3 py-2.5 text-xs" style={{ background: '#EFF6FF', color: '#3B82F6' }}>
            Opérateurs Mobile Money disponibles dans ce pays.
          </div>
          <Field
            label="Opérateurs (séparés par des virgules)"
            value={f.mobileMoneyProviders}
            onChange={u('mobileMoneyProviders')}
            placeholder="Ex: Mvola, Orange Money, Airtel Money"
          />
          <div className="rounded-lg p-3" style={{ background: '#F8FAFC' }}>
            <div className="text-xs font-semibold text-slate-700 mb-2">Actuellement configurés :</div>
            <div className="flex flex-wrap gap-1.5">
              {f.mobileMoneyProviders
                ? f.mobileMoneyProviders.split(',').map((p: string) => p.trim()).filter(Boolean).map((p: string, i: number) => (
                    <Badge key={i} color="#0D9488">{p}</Badge>
                  ))
                : <span className="text-xs text-slate-400">Aucun</span>
              }
            </div>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between mt-5 pt-4 border-t border-slate-100">
        <div>
          {!isNew && onDelete && (
            <Btn variant="danger" icon={<Trash2 size={13} />} onClick={onDelete}>
              Supprimer ce pays
            </Btn>
          )}
        </div>
        <div className="flex gap-2">
          <Btn variant="secondary" onClick={onClose}>Annuler</Btn>
          <Btn onClick={save} disabled={saving}>{saving ? 'Enregistrement...' : 'Enregistrer'}</Btn>
        </div>
      </div>
    </Modal>
  )
}
