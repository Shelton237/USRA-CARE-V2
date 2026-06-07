'use client'
import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { PageHeader, Card, Table, Tabs, Badge } from '@/components/ui'
import { useAppStore } from '@/store/app'
import { useSession } from 'next-auth/react'
import Image from 'next/image'

const TARGET_LABEL: Record<string, string> = {
  client:    'Client',
  candidate: 'Employé',
  user:      'Utilisateur interne',
}

const ACTION_LABEL: Record<string, string> = {
  LOGIN:               'Connexion',
  LOGOUT:              'Déconnexion',
  LOGIN_FAILED:        'Tentative échouée',
  CREATE:              'Création',
  UPDATE:              'Modification',
  DELETE:              'Suppression',
  VALIDATE:            'Validation',
  REJECT:              'Rejet',
  APPROVE:             'Approbation',
}

const ACTION_COLOR: Record<string, string> = {
  LOGIN:               '#0D9488',
  LOGOUT:              '#64748B',
  LOGIN_FAILED:        '#DC2626',
  CREATE:              '#2563EB',
  UPDATE:              '#D97706',
  DELETE:              '#DC2626',
  VALIDATE:            '#16A34A',
  REJECT:              '#DC2626',
  APPROVE:             '#16A34A',
}

// ─── Main page ───────────────────────────────────────────────────────────────
export function SettingsPage() {
  const [tab, setTab] = useState('notifications')

  return (
    <div className="fade-in space-y-4">
      <PageHeader title="Paramètres" />
      <Tabs tabs={[
        { id: 'notifications', label: 'Notifications' },
        { id: 'audit',         label: "Journal d'audit" },
        { id: 'about',         label: 'À propos' },
      ]} active={tab} onChange={setTab} />

      {tab === 'notifications' && <NotificationsTab />}
      {tab === 'audit'         && <AuditTab />}
      {tab === 'about'         && <AboutTab />}
    </div>
  )
}

// ─── Tab Notifications ────────────────────────────────────────────────────────
function NotificationsTab() {
  const { showToast } = useAppStore()
  const { data: session } = useSession()
  const qc = useQueryClient()
  const B = process.env.NEXT_PUBLIC_APP_URL ?? ''
  const isAdmin = session?.user?.role === 'admin'

  const { data, isLoading } = useQuery({
    queryKey: ['notif-settings'],
    queryFn: () => fetch(`${B}/api/settings/notifications`).then(r => r.json()),
  })
  const settings: any[] = data?.data ?? []

  const toggle = async (row: any) => {
    if (!isAdmin) return
    const newEnabled = !row.enabled
    // Optimistic update
    qc.setQueryData(['notif-settings'], (old: any) => ({
      ...old,
      data: old?.data?.map((s: any) => s.type === row.type ? { ...s, enabled: newEnabled } : s),
    }))
    const res = await fetch(`${B}/api/settings/notifications`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: row.type, enabled: newEnabled }),
    })
    if (res.ok) { showToast('Paramètre mis à jour') }
    else {
      qc.invalidateQueries({ queryKey: ['notif-settings'] })
      showToast('Erreur', 'error')
    }
  }

  const cols = [
    { key: 'label',  label: 'Événement' },
    { key: 'target', label: 'Destinataire', render: (r: any) => TARGET_LABEL[r.target] ?? r.target },
    {
      key: 'sms', label: 'SMS actif', align: 'center' as const,
      render: (r: any) => (
        <label className="inline-flex items-center cursor-pointer" onClick={e => { e.stopPropagation(); toggle(r) }}>
          <div className={`relative w-9 h-5 rounded-full transition-colors ${r.enabled ? 'bg-teal-500' : 'bg-slate-200'} ${!isAdmin ? 'opacity-50 cursor-not-allowed' : ''}`}>
            <div className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${r.enabled ? 'translate-x-4' : 'translate-x-0'}`} />
          </div>
        </label>
      ),
    },
  ]

  return (
    <Card title="Configuration des notifications SMS">
      <div className="rounded-lg px-3 py-2.5 text-xs mb-4" style={{ background: 'rgba(13,148,136,0.08)', color: '#0D9488' }}>
        SMS envoyés via Africa's Talking — couverture panafricaine. Configurez par événement.
      </div>
      {isLoading
        ? <div className="text-center py-8 text-slate-400 text-sm">Chargement...</div>
        : <Table columns={cols} data={settings} empty="Aucun paramètre" />
      }
    </Card>
  )
}

// ─── Tab Audit ────────────────────────────────────────────────────────────────
function AuditTab() {
  const B = process.env.NEXT_PUBLIC_APP_URL ?? ''
  const { data, isLoading } = useQuery({
    queryKey: ['audit-logs'],
    queryFn: () => fetch(`${B}/api/settings/audit`).then(r => r.json()),
  })
  const logs: any[] = data?.data ?? []

  const cols = [
    { key: 'timestamp', label: 'Date / heure',
      render: (r: any) => new Date(r.timestamp).toLocaleString('fr-FR') },
    { key: 'userName',  label: 'Utilisateur' },
    { key: 'action', label: 'Action',
      render: (r: any) => {
        const label = ACTION_LABEL[r.action] ?? r.action
        const color = ACTION_COLOR[r.action] ?? '#94A3B8'
        return (
          <span
            className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold"
            style={{ background: color + '1A', color }}
          >
            {label}
          </span>
        )
      }
    },
    { key: 'entity',    label: 'Entité',
      render: (r: any) => r.module ? `${r.module} #${r.entityId ?? '—'}` : '—' },
    { key: 'detail',    label: 'Détail',
      render: (r: any) => r.detail
        ? <span className="text-xs text-slate-500 truncate max-w-xs block">{r.detail}</span>
        : '—' },
  ]

  return (
    <Card title={`${logs.length} entrée(s) dans le journal`}>
      {isLoading
        ? <div className="text-center py-8 text-slate-400 text-sm">Chargement...</div>
        : <Table columns={cols} data={logs} empty="Aucune entrée" />
      }
    </Card>
  )
}

// ─── Tab À propos ─────────────────────────────────────────────────────────────
function AboutTab() {
  return (
    <Card title="À propos de USRA-CARE">
      <div className="flex items-start gap-5">
        {/* Logo */}
        <div className="flex-shrink-0 w-20 h-20 rounded-2xl overflow-hidden flex items-center justify-center" style={{ background: '#0D9488' }}>
          <Image src="/v2/logo.png" alt="USRA-CARE" width={80} height={80} className="object-contain w-full h-full" unoptimized />
        </div>

        {/* Text */}
        <div className="flex-1" style={{ fontSize: 12.5, lineHeight: 1.7, color: '#475569' }}>
          <div style={{ fontSize: 18, fontWeight: 800, color: '#0F172A', marginBottom: 4 }}>USRA-CARE</div>
          <div style={{ fontStyle: 'italic', color: '#D4A437', marginBottom: 10 }}>
            « L'humain au service de votre bien-être »
          </div>
          <div><strong>Version :</strong> 2.0 — Démo complète</div>
          <div><strong>Plateforme :</strong> CRM RH multi-pays Afrique</div>
          <div><strong>Métiers couverts :</strong> Placement de personnel, Mise à disposition</div>
          <div style={{ marginTop: 10 }}>
            <strong>Modules :</strong>{' '}
            Candidats avec entretien dynamique par métier, Clients, Missions avec période d'essai,
            Heures supplémentaires avec workflow de validation, Avances sur salaire,
            Fiches de présence mensuelles, Facturation automatique avec prorata,
            Paie avec prorata transparent et IRSA, Évaluations périodiques 9 critères,
            Plaintes clients avec workflow et décisions, Matériels remis avec restitution,
            Objectifs multi-périodes, Reporting consolidé.
          </div>
          <div className="mt-3 p-3 rounded-lg" style={{ background: '#F8FAFC', fontSize: 11.5 }}>
            <strong>USRA CARE SARLU</strong><br />
            NIF : 5018370696 — STAT : 81211 11 2023 0 11485<br />
            LOT IIP 154 JC Météo Avaradoha, Antananarivo 101<br />
            Tél : +261 38 262 02 50<br />
            <a href="https://www.usra-care.com" className="text-teal-600 hover:underline">www.usra-care.com</a>
          </div>
        </div>
      </div>
    </Card>
  )
}
