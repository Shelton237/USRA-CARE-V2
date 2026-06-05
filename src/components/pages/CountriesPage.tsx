'use client'
import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { PageHeader, Btn, Modal, Tabs, Field, Badge } from '@/components/ui'
import { useAppStore } from '@/store/app'
import { Plus, X } from 'lucide-react'

// ─── Main page ───────────────────────────────────────────────────────────────
export function CountriesPage() {
  const { showToast } = useAppStore()
  const qc = useQueryClient()
  const B = process.env.NEXT_PUBLIC_APP_URL ?? ''
  const [editing, setEditing] = useState<any>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['countries-all'],
    queryFn: () => fetch(`${B}/api/countries?all=true`).then(r => r.json()),
  })
  const countries = data?.data ?? []

  const handleSaved = () => {
    qc.invalidateQueries({ queryKey: ['countries-all'] })
    qc.invalidateQueries({ queryKey: ['countries-list'] })
    showToast('Configuration mise à jour')
    setEditing(null)
  }

  return (
    <div className="fade-in space-y-4">
      <PageHeader
        title="Pays / Entités"
        subtitle={`${countries.length} pays — configurations administratives, taux légaux, mobile money`}
      />

      {isLoading ? (
        <div className="text-center py-16 text-slate-400 text-sm">Chargement...</div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 14 }}>
          {countries.map((c: any) => (
            <CountryCard key={c.id} country={c} onClick={() => setEditing(c)} />
          ))}
        </div>
      )}

      {editing && (
        <CountryConfigModal
          country={editing}
          onClose={() => setEditing(null)}
          onSaved={handleSaved}
        />
      )}
    </div>
  )
}

// ─── Country card ─────────────────────────────────────────────────────────────
function CountryCard({ country, onClick }: { country: any; onClick: () => void }) {
  const providers = country.mobileMoneyProviders
    ? country.mobileMoneyProviders.split(',').map((s: string) => s.trim()).filter(Boolean)
    : []

  return (
    <div
      onClick={onClick}
      className="cursor-pointer transition-all hover:shadow-md hover:-translate-y-0.5"
      style={{ padding: 16, background: '#fff', border: '1px solid #E2E8F0', borderRadius: 12 }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-1">
        <span style={{ fontSize: 16, fontWeight: 800, color: '#0F172A' }}>{country.name}</span>
        <Badge color={country.active ? '#10B981' : '#94A3B8'} solid={country.active}>
          {country.active ? 'Actif' : 'Inactif'}
        </Badge>
      </div>

      {country.entityName && (
        <div style={{ fontSize: 12, color: '#94A3B8', marginBottom: 10 }}>{country.entityName}</div>
      )}

      {/* Info rows */}
      <div style={{ fontSize: 12, color: '#475569', lineHeight: 1.9 }}>
        <div>Devise : {country.currency} ({country.symbol})</div>
        {country.taxId && <div>{country.taxId}</div>}
        {(country.address || country.city) && (
          <div>{[country.address, country.city].filter(Boolean).join(', ')}</div>
        )}
        <div style={{ marginBottom: 2 }}>
          {country.offices?.length ?? 0} bureau(x)
        </div>
      </div>

      {/* Mobile money separator */}
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
function CountryConfigModal({ country, onClose, onSaved }: {
  country: any; onClose: () => void; onSaved: () => void
}) {
  const { showToast } = useAppStore()
  const B = process.env.NEXT_PUBLIC_APP_URL ?? ''
  const [tab, setTab] = useState('admin')
  const [saving, setSaving] = useState(false)

  // Flatten country into editable form state
  const [f, setF] = useState<any>({
    // Basic
    name:                 country.name,
    code:                 country.code,
    active:               country.active,
    // Devise
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
    // Admin
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
    // Mobile money (join array → string for editing)
    mobileMoneyProviders: country.mobileMoneyProviders ?? '',
    // Relations
    contributions: country.contributions?.map((c: any) => ({ ...c })) ?? [],
    irsaBrackets:  country.irsaBrackets?.map((b: any) => ({ ...b })) ?? [],
  })

  const u = (k: string) => (v: any) => setF((p: any) => ({ ...p, [k]: v }))

  // ── Contributions helpers ──
  const addContrib = () => setF((p: any) => ({
    ...p,
    contributions: [...p.contributions, { code: `contrib_${Date.now()}`, label: '', mode: 'percent', value: 0, part: 'employee', enabled: true }],
  }))
  const removeContrib = (i: number) => setF((p: any) => ({
    ...p,
    contributions: p.contributions.filter((_: any, idx: number) => idx !== i),
  }))
  const updateContrib = (i: number, k: string, v: any) => setF((p: any) => ({
    ...p,
    contributions: p.contributions.map((c: any, idx: number) => idx === i ? { ...c, [k]: v } : c),
  }))

  // ── IRSA bracket helpers ──
  const addBracket = () => setF((p: any) => ({
    ...p,
    irsaBrackets: [...p.irsaBrackets, { fromAmount: 0, toAmount: null, rate: 0 }],
  }))
  const removeBracket = (i: number) => setF((p: any) => ({
    ...p,
    irsaBrackets: p.irsaBrackets.filter((_: any, idx: number) => idx !== i),
  }))
  const updateBracket = (i: number, k: string, v: any) => setF((p: any) => ({
    ...p,
    irsaBrackets: p.irsaBrackets.map((b: any, idx: number) => idx === i ? { ...b, [k]: v } : b),
  }))

  const save = async () => {
    setSaving(true)
    try {
      const res = await fetch(`${B}/api/countries/${country.id}`, {
        method: 'PUT',
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
    <Modal title={`${country.name} — Configuration`} subtitle={f.entityName || undefined} onClose={onClose} size="xl">
      <Tabs tabs={TABS} active={tab} onChange={setTab} />

      {/* ── Tab 1 : Infos administratives ── */}
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
            <Field label="Ville" value={f.city} onChange={u('city')} />
            <Field label="Téléphone" value={f.entityPhone} onChange={u('entityPhone')} />
            <Field label="Email" value={f.entityEmail} onChange={u('entityEmail')} type="email" />
            <Field label="Compte bancaire (IBAN)" value={f.bankAccount} onChange={u('bankAccount')} className="col-span-full" />
            <Field label="Mention légale (pied de facture / bulletin)" value={f.legalMention} onChange={u('legalMention')} textarea className="col-span-full" />
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

      {/* ── Tab 2 : Devise et change ── */}
      {tab === 'finance' && (
        <div className="space-y-3">
          <div className="grid grid-cols-3 gap-3">
            <Field label="Code devise (ISO)" value={f.currency} onChange={u('currency')} placeholder="MGA, XAF..." />
            <Field label="Nom devise" value={f.currencyName} onChange={u('currencyName')} placeholder="Ariary, Franc CFA..." />
            <Field label="Symbole" value={f.symbol} onChange={u('symbol')} placeholder="Ar, FCFA..." />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Taux de change vers EUR" value={f.exchangeToEur} onChange={u('exchangeToEur')} type="number" />
            <Field label="Préfixe téléphonique" value={f.phonePrefix} onChange={u('phonePrefix')} placeholder="+261, +237..." />
          </div>
          <Field label="Préfixe facture" value={f.invoicePrefix} onChange={u('invoicePrefix')} placeholder="MG, CM, CI..." />
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

      {/* ── Tab 3 : Charges sociales ── */}
      {tab === 'social' && (
        <div className="space-y-3">
          <div className="rounded-lg px-3 py-2.5 text-xs" style={{ background: '#FFFBEB', color: '#F59E0B' }}>
            Taux de cotisations sociales appliqués aux contrats Mise à Disposition (employés déclarés).
          </div>

          {/* Column headers */}
          <div className="grid gap-2 text-xs font-semibold text-slate-500 px-1"
            style={{ gridTemplateColumns: '2fr 1fr 1fr auto auto' }}>
            <span>Nom de la cotisation</span>
            <span>Taux (%)</span>
            <span>Partie</span>
            <span className="w-8" />
          </div>

          {f.contributions.map((c: any, i: number) => (
            <div key={i} className="grid gap-2 p-2.5 rounded-lg" style={{ gridTemplateColumns: '2fr 1fr 1fr auto', background: '#F8FAFC', alignItems: 'center' }}>
              <input
                value={c.label}
                onChange={e => updateContrib(i, 'label', e.target.value)}
                placeholder="Nom de la cotisation"
                className="w-full rounded-md border border-slate-200 px-2.5 py-1.5 text-sm text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-teal-400"
              />
              <input
                type="number" step="0.001"
                value={c.value}
                onChange={e => updateContrib(i, 'value', e.target.value)}
                className="w-full rounded-md border border-slate-200 px-2.5 py-1.5 text-sm text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-teal-400"
              />
              <select
                value={c.part}
                onChange={e => updateContrib(i, 'part', e.target.value)}
                className="w-full rounded-md border border-slate-200 px-2 py-1.5 text-sm text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-teal-400"
              >
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

      {/* ── Tab 4 : IRSA ── */}
      {tab === 'irsa' && (
        <div className="space-y-3">
          <div className="rounded-lg px-3 py-2.5 text-xs" style={{ background: '#FFFBEB', color: '#F59E0B' }}>
            Tranches d'imposition sur le revenu salarial (IRSA). Le calcul se fait sur le brut imposable mensuel.
          </div>

          {/* Column headers */}
          <div className="grid gap-2 text-xs font-semibold text-slate-500 px-1"
            style={{ gridTemplateColumns: '1fr 1fr 1fr auto' }}>
            <span>De</span>
            <span>Jusqu'à (vide = ∞)</span>
            <span>Taux %</span>
            <span className="w-8" />
          </div>

          {f.irsaBrackets.map((b: any, i: number) => (
            <div key={i} className="grid gap-2 p-2.5 rounded-lg" style={{ gridTemplateColumns: '1fr 1fr 1fr auto', background: '#F8FAFC', alignItems: 'center' }}>
              <input
                type="number"
                value={b.fromAmount}
                onChange={e => updateBracket(i, 'fromAmount', e.target.value)}
                className="w-full rounded-md border border-slate-200 px-2.5 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-teal-400"
                placeholder="0"
              />
              <input
                type="number"
                value={b.toAmount ?? ''}
                onChange={e => updateBracket(i, 'toAmount', e.target.value === '' ? null : e.target.value)}
                className="w-full rounded-md border border-slate-200 px-2.5 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-teal-400"
                placeholder="∞"
              />
              <input
                type="number" step="0.01"
                value={b.rate}
                onChange={e => updateBracket(i, 'rate', e.target.value)}
                className="w-full rounded-md border border-slate-200 px-2.5 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-teal-400"
                placeholder="0"
              />
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

      {/* ── Tab 5 : Mobile Money ── */}
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

      {/* Footer */}
      <div className="flex justify-end gap-2 mt-5 pt-4 border-t border-slate-100">
        <Btn variant="secondary" onClick={onClose}>Annuler</Btn>
        <Btn onClick={save} disabled={saving}>{saving ? 'Enregistrement...' : 'Enregistrer'}</Btn>
      </div>
    </Modal>
  )
}
