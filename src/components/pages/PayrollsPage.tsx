'use client'
import { useState, useEffect } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { PageHeader, Btn, Modal, Field, Card, FilterSelect } from '@/components/ui'
import { useAppStore } from '@/store/app'
import { useSession } from 'next-auth/react'
import { fmtDate } from '@/lib/utils'
import { Plus, Zap } from 'lucide-react'
import Image from 'next/image'

// ─── Helpers ──────────────────────────────────────────────────────────────────

const FR_MONTHS = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre']

function getPeriodInfo(period: string) {
  const [y, m] = period.split('-').map(Number)
  const lastDay = new Date(y, m, 0).getDate()
  const pad = (n: number) => String(n).padStart(2, '0')
  return {
    label: `${FR_MONTHS[m - 1]} ${y}`,
    range: `du ${pad(1)}/${pad(m)}/${y} au ${pad(lastDay)}/${pad(m)}/${y}`,
  }
}

const PAY_METHOD: Record<string, string> = {
  virement: 'Virement', cash: 'Espèces', mobile_money: 'Mobile Money', cheque: 'Chèque',
}

// ─── Badges ────────────────────────────────────────────────────────────────────

const PAY_STATUS: Record<string, { label: string; bg: string; color: string }> = {
  pending_validation: { label: 'À payer', bg: '#FEF3C7', color: '#D97706' },
  paid:               { label: 'Payée',   bg: '#CCFBF1', color: '#0D9488' },
  rejected:           { label: 'Rejetée', bg: '#FEE2E2', color: '#DC2626' },
}

function PayBadge({ status }: { status: string }) {
  const s = PAY_STATUS[status] ?? { label: status, bg: '#F1F5F9', color: '#64748B' }
  return (
    <span className="px-2 py-0.5 rounded-md text-[11px] font-semibold"
      style={{ background: s.bg, color: s.color }}>{s.label}</span>
  )
}

function ContractBadge({ type }: { type: string }) {
  const isMad = type !== 'placement'
  return (
    <span className="px-2 py-0.5 rounded-md text-[11px] font-semibold"
      style={{ background: isMad ? '#F5F3FF' : '#EFF6FF', color: isMad ? '#7C3AED' : '#3B82F6' }}>
      {isMad ? 'MAD' : 'Placement'}
    </span>
  )
}

// ─── Bulletin Modal ───────────────────────────────────────────────────────────

function BulletinModal({ id, onClose, canPay, onPaid, onModify }: {
  id: number; onClose: () => void; canPay: boolean; onPaid: () => void; onModify: () => void
}) {
  const B = process.env.NEXT_PUBLIC_APP_URL ?? ''
  const { showToast } = useAppStore()
  const [paying, setPaying] = useState(false)

  const { data, isLoading } = useQuery({
    queryKey: ['payroll-detail', id],
    queryFn: () => fetch(`${B}/api/payrolls/${id}`).then(r => r.json()),
  })

  const p = data?.data
  const period = p ? getPeriodInfo(p.period) : null
  const sym = p?.country?.symbol ?? 'Ar'
  const pct = p ? Math.round((p.prorataCoef ?? 1) * 100) : 0

  const markPaid = async () => {
    setPaying(true)
    const res = await fetch(`${B}/api/payrolls/${id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'pay' }),
    })
    setPaying(false)
    if (res.ok) { showToast('Bulletin marqué payé'); onPaid() }
    else showToast('Erreur', 'error')
  }

  return (
    <Modal
      title={p ? `Bulletin ${p.candidate?.firstName} ${p.candidate?.lastName}` : 'Bulletin de paie'}
      subtitle={period?.label}
      onClose={onClose}
      size="lg"
    >
      {isLoading ? (
        <div className="py-12 text-center text-slate-400 text-sm">Chargement...</div>
      ) : !p ? (
        <div className="py-12 text-center text-red-400 text-sm">Erreur de chargement</div>
      ) : (
        <div id="print-area">

          {/* ══ HEADER : logo + infos société — même style que la facture ══ */}
          <div className="flex justify-between mb-6 pb-5" style={{ borderBottom: '3px solid #0D9488' }}>
            {/* Gauche : logo + tagline */}
            <div>
              <Image src="/v2/logo.png" alt="USRA Care" width={100} height={100} unoptimized className="object-contain mb-3" />
              <div style={{ fontSize: 11, color: '#94A3B8', fontStyle: 'italic' }}>L&apos;humain au service de votre bien-être</div>
            </div>
            {/* Droite : infos légales société */}
            <div className="text-right">
              <div className="font-bold text-base text-slate-900">{p.country?.entityName ?? 'USRA CARE SARLU'}</div>
              <div className="text-sm text-slate-500 mt-1 leading-relaxed">
                {p.country?.taxId  && <div>NIF : {p.country.taxId}</div>}
                {p.country?.statId && <div>STAT : {p.country.statId}</div>}
                {p.country?.address && <div>{p.country.address}</div>}
                {p.country?.city   && <div>{p.country.city}</div>}
                {p.country?.entityPhone && <div>Tél : {p.country.entityPhone}</div>}
              </div>
            </div>
          </div>

          {/* ══ TITRE — même style que FACTURE ══ */}
          <div className="flex justify-between items-start mb-5">
            <div>
              <div className="text-4xl font-extrabold mb-2 tracking-wide" style={{ color: '#0D9488' }}>
                BULLETIN DE PAIE
              </div>
              <div className="text-sm text-slate-500">
                {period?.label} &mdash; {period?.range}
              </div>
            </div>
            <div className="text-right">
              <div className="font-mono font-bold text-slate-800 text-base">{p.period}</div>
              <div className="text-sm text-slate-500 mt-2">
                Statut : <strong className="text-slate-700">{
                  p.status === 'paid' ? 'Payé' :
                  p.status === 'pending_validation' ? 'En attente' : 'Rejeté'
                }</strong>
              </div>
              {p.paymentDate && (
                <div className="text-sm text-slate-500">
                  Payé le : <strong className="text-slate-700">{fmtDate(p.paymentDate)}</strong>
                </div>
              )}
            </div>
          </div>

          {/* ══ EMPLOYÉ + MISSION — même style que Facturé à / Période ══ */}
          <div className="flex justify-between mb-5">
            <div className="flex-1">
              <div className="text-[11px] text-slate-400 font-semibold uppercase tracking-wide mb-1.5">Employé</div>
              <div className="font-bold text-slate-900 text-base">
                {p.candidate?.firstName} {p.candidate?.lastName}
              </div>
              {p.candidate?.nationalId && (
                <div className="text-sm text-slate-500">CIN : {p.candidate.nationalId}</div>
              )}
              {p.candidate?.phone && (
                <div className="text-sm text-slate-500">Tél : {p.candidate.phone}</div>
              )}
            </div>
            <div className="text-right">
              <div className="text-[11px] text-slate-400 font-semibold uppercase tracking-wide mb-1.5">Mission</div>
              <div className="font-bold text-slate-900 text-base">{p.mission?.client?.name ?? '—'}</div>
              <div className="text-sm text-slate-500">
                {p.contractType === 'placement' ? 'Placement' : 'Mise à disposition'}
              </div>
              <div className="text-sm text-slate-500">
                Depuis le {p.mission?.startDate ? fmtDate(p.mission.startDate) : '—'}
              </div>
            </div>
          </div>

          {/* ══ TABLEAU DÉTAIL CALCUL — même style que le tableau lignes facture ══ */}
          <table className="w-full border-collapse mb-4">
            <thead>
              <tr style={{ background: '#0D9488', color: '#fff' }}>
                <th className="px-4 py-3 text-left text-sm font-semibold">Détail du calcul</th>
                <th className="px-4 py-3 text-right text-sm font-semibold w-48">Montant</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-slate-100">
                <td className="px-4 py-3 text-sm text-slate-600">Salaire de référence</td>
                <td className="px-4 py-3 text-right text-sm text-slate-700">
                  {(p.netTarget ?? 0).toLocaleString('fr-FR')} {sym}
                </td>
              </tr>
              <tr className="border-b border-slate-100">
                <td className="px-4 py-3 text-sm text-slate-600">Base de calcul</td>
                <td className="px-4 py-3 text-right text-sm text-slate-700">{p.prorataBase} jours ouvrés</td>
              </tr>
              <tr className="border-b border-slate-100">
                <td className="px-4 py-3 text-sm text-slate-600">Jours effectivement travaillés</td>
                <td className="px-4 py-3 text-right text-sm text-slate-700">{p.daysWorked} jours</td>
              </tr>
              <tr className="border-b border-slate-100">
                <td className="px-4 py-3 text-sm text-slate-600">Coefficient prorata</td>
                <td className="px-4 py-3 text-right text-sm font-semibold" style={{ color: '#0D9488' }}>
                  {p.daysWorked}/{p.prorataBase} = {pct}%
                </td>
              </tr>
              <tr className="border-b border-slate-200">
                <td className="px-4 py-3 text-sm font-semibold text-slate-700">Salaire proratisé</td>
                <td className="px-4 py-3 text-right text-sm font-semibold text-slate-800">
                  {(p.netBase ?? 0).toLocaleString('fr-FR')} {sym}
                </td>
              </tr>
              {(p.overtimeAmount ?? 0) > 0 && (
                <tr className="border-b border-slate-100">
                  <td className="px-4 py-3 text-sm text-slate-600">
                    Heures supplémentaires{(p.overtimeHours ?? 0) > 0 ? ` (${p.overtimeHours}h)` : ''}
                  </td>
                  <td className="px-4 py-3 text-right text-sm font-semibold" style={{ color: '#0D9488' }}>
                    +{(p.overtimeAmount ?? 0).toLocaleString('fr-FR')} {sym}
                  </td>
                </tr>
              )}
              {(p.deductions ?? 0) > 0 && (
                <tr className="border-b border-slate-100">
                  <td className="px-4 py-3 text-sm text-slate-600">Avances déduites</td>
                  <td className="px-4 py-3 text-right text-sm font-semibold" style={{ color: '#DC2626' }}>
                    -{(p.deductions ?? 0).toLocaleString('fr-FR')} {sym}
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          {/* ══ NET À PAYER — même style que TOTAL TTC ══ */}
          <div className="flex justify-end mb-5">
            <div className="w-72">
              <div className="flex justify-between py-2 mt-1" style={{ borderTop: '2px solid #0D9488' }}>
                <span className="font-bold text-base text-slate-900">NET À PAYER</span>
                <span className="font-extrabold text-xl" style={{ color: '#0D9488' }}>
                  {(p.netSalary ?? 0).toLocaleString('fr-FR')} {sym}
                </span>
              </div>
              {p.paymentMethod && (
                <div className="flex justify-between py-1 text-xs mt-1">
                  <span className="text-slate-500">Mode de paiement</span>
                  <span className="text-slate-600 font-semibold">{PAY_METHOD[p.paymentMethod] ?? p.paymentMethod}</span>
                </div>
              )}
            </div>
          </div>

          {/* ══ FOOTER — même style que la facture ══ */}
          <div className="mt-5 pt-4 border-t border-slate-200">
            <div className="grid grid-cols-2 gap-6 text-sm text-slate-500 leading-relaxed">
              <div>
                <div className="font-bold text-slate-700 mb-1.5 text-sm">Mission</div>
                <div>{p.mission?.client?.name ?? '—'}</div>
                {p.mission?.client?.address && <div>{p.mission.client.address}</div>}
              </div>
              <div>
                <div className="font-bold text-slate-700 mb-1.5 text-sm">Mentions légales</div>
                <div>{p.country?.legalMention ?? '—'}</div>
              </div>
            </div>
            <div className="text-center mt-4 text-xs text-slate-400">
              {[p.country?.entityName, p.country?.taxId && `NIF : ${p.country.taxId}`, p.country?.statId && `STAT : ${p.country.statId}`].filter(Boolean).join(' · ')}
            </div>
          </div>

          {/* ── Footer actions ── */}
          <div className="flex items-center justify-between pt-3 mt-3 border-t border-slate-200 no-print">
            <PayBadge status={p.status} />
            <div className="flex items-center gap-2">
              <Btn variant="secondary" onClick={() => window.print()}>Imprimer</Btn>
              <Btn variant="secondary" onClick={onModify}>Modifier</Btn>
              {canPay && p.status === 'pending_validation' && (
                <Btn onClick={markPaid} disabled={paying}>
                  {paying ? 'Enregistrement...' : 'Payer'}
                </Btn>
              )}
              <Btn variant="secondary" onClick={onClose}>Fermer</Btn>
            </div>
          </div>
        </div>
      )}
    </Modal>
  )
}

// ─── Modifier bulletin modal ──────────────────────────────────────────────────

function ModifierModal({ id, missions, onClose, onSaved }: {
  id: number; missions: any[]; onClose: () => void; onSaved: () => void
}) {
  const { showToast } = useAppStore()
  const B = process.env.NEXT_PUBLIC_APP_URL ?? ''
  const [saving, setSaving] = useState(false)
  const [initialized, setInitialized] = useState(false)

  const { data, isLoading } = useQuery({
    queryKey: ['payroll-detail', id],
    queryFn: () => fetch(`${B}/api/payrolls/${id}`).then(r => r.json()),
  })
  const p = data?.data

  const [missionId, setMissionId]           = useState('')
  const [period, setPeriod]                 = useState('')
  const [bonuses, setBonuses]               = useState('0')
  const [manualDeductions, setManualDeductions] = useState('0')
  const [paymentMethod, setPaymentMethod]   = useState('virement')
  const [status, setStatus]                 = useState('pending_validation')

  useEffect(() => {
    if (p && !initialized) {
      const implied = Math.max(0,
        (p.netBase ?? 0) + (p.overtimeAmount ?? 0) + (p.bonuses ?? 0) - (p.deductions ?? 0) - (p.netSalary ?? 0)
      )
      setMissionId(String(p.missionId))
      setPeriod(p.period)
      setBonuses(String(p.bonuses ?? 0))
      setManualDeductions(String(implied))
      setPaymentMethod(p.paymentMethod ?? 'virement')
      setStatus(p.status)
      setInitialized(true)
    }
  }, [p, initialized])

  const selectedMission = missions.find(m => String(m.id) === missionId)
  const sym = p?.country?.symbol ?? 'Ar'

  // Info box values — from existing payroll when mission unchanged, from mission obj when changed
  const missionChanged = p && missionId !== String(p.missionId)
  const infoBase      = missionChanged ? (selectedMission?.netSalary || selectedMission?.employeeRate || 0) : (p?.netTarget ?? 0)
  const infoJours     = missionChanged ? `${selectedMission?.prorataBase ?? 30} / ${selectedMission?.prorataBase ?? 30}` : `${p?.daysWorked ?? 0} / ${p?.prorataBase ?? 30}`
  const infoCoef      = missionChanged ? '100%' : `${Math.round((p?.prorataCoef ?? 1) * 100)}%`
  const infoSalaire   = missionChanged ? (selectedMission?.netSalary ?? 0) : (p?.netBase ?? 0)
  const infoAvances   = missionChanged ? 0 : (p?.deductions ?? 0)
  const infoType      = (selectedMission?.contractType ?? p?.contractType) === 'placement' ? 'Placement' : 'MAD'
  const infoHS        = missionChanged ? `0h (0 ${sym})` : `${p?.overtimeHours ?? 0}h (${(p?.overtimeAmount ?? 0).toLocaleString('fr-FR')} ${sym})`
  const infoMode      = PAY_METHOD[paymentMethod] ?? paymentMethod

  // Live NET À PAYER preview
  const netPreview = infoSalaire + (missionChanged ? 0 : (p?.overtimeAmount ?? 0)) + Number(bonuses || 0) - infoAvances - Number(manualDeductions || 0)

  const save = async () => {
    if (!p) return
    setSaving(true)
    try {
      const res = await fetch(`${B}/api/payrolls/${id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'modify',
          bonuses: Number(bonuses || 0),
          manualDeductions: Number(manualDeductions || 0),
          paymentMethod: paymentMethod || null,
          status,
        }),
      })
      if (res.ok) { onSaved() }
      else { const b = await res.json().catch(() => ({})); showToast(b?.error ?? 'Erreur', 'error') }
    } catch { showToast('Erreur réseau', 'error') }
    finally { setSaving(false) }
  }

  return (
    <Modal title="Modifier bulletin" onClose={onClose} size="lg">
      {isLoading || !initialized ? (
        <div className="py-12 text-center text-slate-400 text-sm">Chargement...</div>
      ) : (
        <div className="space-y-4">
          {/* Teal subtitle */}
          <p className="text-xs -mt-1" style={{ color: '#0D9488' }}>
            La sélection de mission recalcule automatiquement le prorata, heures sup et avances
          </p>

          {/* Mission + Période */}
          <div className="grid grid-cols-2 gap-3">
            <Field label="Mission *" value={missionId} onChange={setMissionId} options={[
              { value: '', label: '— Choisir —' },
              ...missions.map(m => ({
                value: String(m.id),
                label: `${m.candidate?.firstName} ${m.candidate?.lastName} — ${m.contractType === 'placement' ? 'Placement' : 'MAD'}`,
              })),
            ]} />
            <Field label="Période" type="month" value={period} onChange={setPeriod} />
          </div>

          {/* Info box */}
          <div className="rounded-lg p-3.5"
            style={{ background: 'rgba(13,148,136,0.06)', border: '1px solid rgba(13,148,136,0.15)' }}>
            <div className="grid grid-cols-2 gap-x-6 gap-y-1.5 text-[12px]">
              <div><strong>Base de référence :</strong> {infoBase.toLocaleString('fr-FR')} {sym}</div>
              <div><strong>Type :</strong> {infoType}</div>
              <div><strong>Jours travaillés :</strong> {infoJours}</div>
              <div><strong>Coefficient prorata :</strong> {infoCoef}</div>
              <div><strong>Salaire proratisé :</strong> {infoSalaire.toLocaleString('fr-FR')} {sym}</div>
              <div><strong>Heures sup :</strong> {infoHS}</div>
              <div><strong>Avances à déduire :</strong> {infoAvances.toLocaleString('fr-FR')} {sym}</div>
              <div><strong>Mode paiement :</strong> {infoMode}</div>
            </div>
          </div>

          {/* Primes + Autres déductions */}
          <div className="grid grid-cols-2 gap-3">
            <Field label="Primes" type="number" value={bonuses} onChange={setBonuses} suffix="Ar" />
            <Field label="Autres déductions" type="number" value={manualDeductions} onChange={setManualDeductions}
              suffix="Ar" hint="Sanctions, retenues, etc." />
          </div>

          {/* Méthode paiement + Statut */}
          <div className="grid grid-cols-2 gap-3">
            <Field label="Méthode paiement" value={paymentMethod} onChange={setPaymentMethod} options={[
              { value: 'virement', label: 'Virement' },
              { value: 'especes',  label: 'Espèces' },
              { value: 'mobile_money', label: 'Mobile Money' },
              { value: 'cheque',   label: 'Chèque' },
            ]} />
            <Field label="Statut" value={status} onChange={setStatus} options={[
              { value: 'pending_validation', label: 'À payer' },
              { value: 'paid',               label: 'Payée' },
              { value: 'rejected',           label: 'Rejetée' },
            ]} />
          </div>

          {/* NET À PAYER preview */}
          <div className="rounded-lg px-5 py-3.5 text-right"
            style={{ background: 'rgba(13,148,136,0.08)' }}>
            <div className="text-[10px] font-bold tracking-widest uppercase text-slate-400 mb-0.5">Net à payer</div>
            <div className="text-2xl font-black" style={{ color: '#0D9488' }}>
              {netPreview.toLocaleString('fr-FR')} {sym}
            </div>
          </div>

          {/* Buttons */}
          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <Btn variant="secondary" onClick={onClose}>Annuler</Btn>
            <Btn onClick={save} disabled={saving}>{saving ? 'Enregistrement...' : 'Enregistrer'}</Btn>
          </div>
        </div>
      )}
    </Modal>
  )
}

// ─── Nouveau bulletin modal ───────────────────────────────────────────────────

function NouveauBulletinModal({ missions, onClose, onSaved }: {
  missions: any[]; onClose: () => void; onSaved: () => void
}) {
  const { showToast } = useAppStore()
  const B = process.env.NEXT_PUBLIC_APP_URL ?? ''
  const [saving, setSaving] = useState(false)
  const currentPeriod = (() => {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
  })()
  const [missionId, setMissionId] = useState('')
  const [period, setPeriod] = useState(currentPeriod)

  const selected = missions.find(m => String(m.id) === missionId)

  const save = async () => {
    if (!missionId) { showToast('Mission requise', 'error'); return }
    if (!period)    { showToast('Période requise', 'error'); return }
    if (!selected)  return
    setSaving(true)
    try {
      const res = await fetch(`${B}/api/payrolls`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          missionId:    selected.id,
          candidateId:  selected.candidateId,
          countryId:    selected.countryId,
          contractType: selected.contractType,
          netTarget:    selected.netSalary || selected.employeeRate || 0,
          prorataBase:  selected.prorataBase ?? 30,
          period,
        }),
      })
      if (res.ok) { onSaved() }
      else { const b = await res.json().catch(() => ({})); showToast(b?.error ?? 'Erreur', 'error') }
    } catch { showToast('Erreur réseau', 'error') }
    finally { setSaving(false) }
  }

  return (
    <Modal title="Nouveau bulletin de paie" onClose={onClose} size="md">
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Mission *" value={missionId} onChange={setMissionId} options={[
            { value: '', label: '— Choisir —' },
            ...missions.map(m => ({
              value: String(m.id),
              label: `${m.candidate?.firstName} ${m.candidate?.lastName} — ${m.contractType === 'placement' ? 'Placement' : 'MAD'}`,
            })),
          ]} />
          <Field label="Période *" type="month" value={period} onChange={setPeriod} />
        </div>

        {selected && (
          <div className="p-2.5 rounded-lg text-xs" style={{ background: 'rgba(13,148,136,0.08)' }}>
            <div className="font-semibold text-teal-700 mb-1">
              {selected.candidate?.firstName} {selected.candidate?.lastName}
            </div>
            <div className="text-slate-600">
              Net cible :{' '}
              <strong>{(selected.netSalary || selected.employeeRate || 0).toLocaleString('fr-FR')} {selected.country?.symbol ?? 'Ar'}</strong>
              {' · '}Base : <strong>{selected.prorataBase ?? 30} jours</strong>
            </div>
          </div>
        )}

        <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-700">
          ⚠️ Le bulletin sera calculé automatiquement en intégrant les heures sup validées et les avances approuvées.
        </div>

        <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
          <Btn variant="secondary" onClick={onClose}>Annuler</Btn>
          <Btn onClick={save} disabled={saving}>{saving ? 'Calcul...' : 'Générer le bulletin'}</Btn>
        </div>
      </div>
    </Modal>
  )
}

// ─── Générer bulletins auto modal ─────────────────────────────────────────────

function GenererAutoModal({ missions, onClose, onSaved }: {
  missions: any[]; onClose: () => void; onSaved: () => void
}) {
  const { showToast } = useAppStore()
  const B = process.env.NEXT_PUBLIC_APP_URL ?? ''
  const [generating, setGenerating] = useState(false)
  const [preview, setPreview] = useState<number | null>(null)
  const currentPeriod = (() => {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
  })()
  const [period, setPeriod] = useState(currentPeriod)

  const generate = async () => {
    if (!period) { showToast('Période requise', 'error'); return }
    setGenerating(true)
    let success = 0, fail = 0
    for (const m of missions) {
      try {
        const res = await fetch(`${B}/api/payrolls`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            missionId: m.id, candidateId: m.candidateId, countryId: m.countryId,
            contractType: m.contractType, netTarget: m.netSalary || m.employeeRate || 0,
            prorataBase: m.prorataBase ?? 30, period, autoGenerated: true,
          }),
        })
        if (res.ok) success++; else fail++
      } catch { fail++ }
    }
    setGenerating(false)
    showToast(`${success} bulletin(s) générés${fail > 0 ? `, ${fail} erreur(s)` : ''}`)
    onSaved()
  }

  return (
    <Modal title="Générer bulletins automatiques" onClose={onClose} size="md">
      <div className="space-y-3">
        <div className="p-3 rounded-lg text-xs" style={{ background: '#F5F3FF', color: '#5B21B6' }}>
          <strong>Génération automatique</strong> — Cette action crée des bulletins pour toutes les missions
          actives sur la période sélectionnée. Les heures sup validées et avances approuvées seront intégrées automatiquement.
        </div>

        <Field label="Période *" type="month" value={period} onChange={setPeriod} />

        {preview !== null && (
          <div className="p-2.5 rounded-lg text-xs" style={{ background: 'rgba(13,148,136,0.08)' }}>
            <strong className="text-teal-700">{preview} mission(s) active(s)</strong>{' '}
            seront traitées pour <strong>{getPeriodInfo(period).label}</strong>.
          </div>
        )}

        <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
          <Btn variant="secondary" onClick={onClose}>Annuler</Btn>
          {preview === null ? (
            <button onClick={() => setPreview(missions.length)}
              className="px-3 py-1.5 rounded-lg text-[13px] font-semibold text-white"
              style={{ background: '#7C3AED' }}>
              Calculer aperçu
            </button>
          ) : (
            <button onClick={generate} disabled={generating}
              className="px-3 py-1.5 rounded-lg text-[13px] font-semibold text-white disabled:opacity-60"
              style={{ background: '#7C3AED' }}>
              {generating ? 'Génération...' : `Générer ${preview} bulletin(s)`}
            </button>
          )}
        </div>
      </div>
    </Modal>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

const STATUS_OPTS = [
  { value: 'all',                label: 'Tous statuts' },
  { value: 'pending_validation', label: 'À payer' },
  { value: 'paid',               label: 'Payées' },
  { value: 'rejected',           label: 'Rejetées' },
]

export function PayrollsPage() {
  const { showToast, adminCountryFilter } = useAppStore()
  const { data: session, status: sessionStatus } = useSession()
  const qc = useQueryClient()
  const B = process.env.NEXT_PUBLIC_APP_URL ?? ''
  const role = (session?.user?.role ?? 'operator') as string
  const canPay = sessionStatus === 'authenticated' && role !== 'operator'
  const countryQ = adminCountryFilter !== 'all' ? '?countryId=' + adminCountryFilter : ''

  const [statusF, setStatusF]     = useState('all')
  const [periodF, setPeriodF]     = useState('all')
  const [creating, setCreating]     = useState(false)
  const [generating, setGenerating] = useState(false)
  const [selectedId, setSelectedId]   = useState<number | null>(null)
  const [modifyingId, setModifyingId] = useState<number | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['payrolls', adminCountryFilter],
    queryFn: () => fetch(`${B}/api/payrolls${countryQ}`).then(r => r.json()),
  })
  const { data: missionsData } = useQuery({
    queryKey: ['missions-active'],
    queryFn: () => fetch(`${B}/api/missions?status=active`).then(r => r.json()),
  })

  const all: any[]      = data?.data ?? []
  const missions: any[] = missionsData?.data ?? []

  const periods = [...new Set(all.map((p: any) => p.period as string))].sort().reverse()
  const periodOpts = [
    { value: 'all', label: 'Toutes périodes' },
    ...periods.map(p => ({ value: p, label: getPeriodInfo(p).label })),
  ]

  const payrolls = all.filter((p: any) =>
    (statusF === 'all' || p.status === statusF) &&
    (periodF === 'all' || p.period === periodF)
  )

  const refresh = () => qc.refetchQueries({ queryKey: ['payrolls'] })

  const markPaid = async (e: React.MouseEvent, id: number) => {
    e.stopPropagation()
    const res = await fetch(`${B}/api/payrolls/${id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'pay' }),
    })
    if (res.ok) { refresh(); showToast('Bulletin marqué payé') }
    else showToast('Erreur', 'error')
  }

  return (
    <div className="fade-in space-y-4">
      <PageHeader
        title="Bulletins de paie"
        subtitle={`${all.length} bulletin(s)`}
        actions={
          <div className="flex items-center gap-2">
            {canPay && (
              <button
                onClick={() => setGenerating(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[13px] font-semibold text-white transition-colors"
                style={{ background: '#7C3AED' }}>
                <Zap size={14} />
                Générer auto période
              </button>
            )}
            {canPay && (
              <Btn icon={<Plus size={14} />} onClick={() => setCreating(true)}>
                Nouveau bulletin
              </Btn>
            )}
          </div>
        }
      />

      <div className="flex gap-2">
        <FilterSelect value={statusF} onChange={setStatusF} options={STATUS_OPTS} />
        <FilterSelect value={periodF} onChange={setPeriodF} options={periodOpts} />
      </div>

      <Card noPad>
        {isLoading ? (
          <div className="py-12 text-center text-slate-400 text-sm">Chargement...</div>
        ) : payrolls.length === 0 ? (
          <div className="py-12 text-center text-slate-400 text-sm">Aucun bulletin de paie</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100">
                {['Période', 'Employé', 'Contrat', 'Jours', 'Net à payer', 'Statut', ''].map(h => (
                  <th key={h} className="text-left px-4 py-2.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {payrolls.map((p: any) => {
                const hasExtras = (p.overtimeAmount ?? 0) > 0 || (p.deductions ?? 0) > 0
                const pct = Math.round((p.prorataCoef ?? 1) * 100)
                const sym = p.country?.symbol ?? 'Ar'
                const contractType = p.contractType ?? p.mission?.contractType ?? ''
                return (
                  <tr
                    key={p.id}
                    className="border-b border-slate-50 hover:bg-slate-50/60 transition-colors cursor-pointer"
                    onClick={() => setSelectedId(p.id)}
                  >
                    {/* Période */}
                    <td className="px-4 py-3 text-[12px] font-medium text-slate-600 whitespace-nowrap">
                      {getPeriodInfo(p.period).label}
                    </td>

                    {/* Employé — teal + red dot */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        {hasExtras && (
                          <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: '#EF4444' }} />
                        )}
                        <span className="text-[13px] font-semibold" style={{ color: '#0D9488' }}>
                          {p.candidate?.firstName} {p.candidate?.lastName}
                        </span>
                      </div>
                    </td>

                    {/* Contrat */}
                    <td className="px-4 py-3"><ContractBadge type={contractType} /></td>

                    {/* Jours */}
                    <td className="px-4 py-3 text-[12px] text-slate-600 whitespace-nowrap">
                      {p.daysWorked}/{p.prorataBase} ({pct}%)
                    </td>

                    {/* Net à payer */}
                    <td className="px-4 py-3 text-[13px] font-bold text-slate-800 whitespace-nowrap">
                      {(p.netSalary ?? 0).toLocaleString('fr-FR')} {sym}
                    </td>

                    {/* Statut */}
                    <td className="px-4 py-3"><PayBadge status={p.status} /></td>

                    {/* Actions */}
                    <td className="px-4 py-3">
                      {canPay && p.status === 'pending_validation' && (
                        <button
                          onClick={e => markPaid(e, p.id)}
                          className="px-2.5 py-1 rounded-md text-[11px] font-semibold text-white transition-colors"
                          style={{ background: '#0D9488' }}>
                          Payer
                        </button>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </Card>

      {selectedId !== null && (
        <BulletinModal
          id={selectedId}
          onClose={() => setSelectedId(null)}
          canPay={canPay}
          onPaid={async () => { await refresh(); setSelectedId(null) }}
          onModify={() => { setModifyingId(selectedId); setSelectedId(null) }}
        />
      )}

      {modifyingId !== null && (
        <ModifierModal
          id={modifyingId}
          missions={missions}
          onClose={() => setModifyingId(null)}
          onSaved={async () => {
            await refresh()
            qc.refetchQueries({ queryKey: ['payroll-detail', modifyingId] })
            showToast('Bulletin modifié')
            setModifyingId(null)
          }}
        />
      )}

      {creating && (
        <NouveauBulletinModal
          missions={missions}
          onClose={() => setCreating(false)}
          onSaved={async () => { await refresh(); showToast('Bulletin créé'); setCreating(false) }}
        />
      )}

      {generating && (
        <GenererAutoModal
          missions={missions}
          onClose={() => setGenerating(false)}
          onSaved={async () => { await refresh(); setGenerating(false) }}
        />
      )}
    </div>
  )
}
