import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function fmt(amount: number, symbol = '') {
  return `${symbol} ${new Intl.NumberFormat('fr-FR').format(Math.round(amount))}`.trim()
}

export function fmtDate(date: string | Date | null | undefined) {
  if (!date) return '—'
  return new Date(date).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

export function currentPeriod() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

export function periodLabel(period: string) {
  const [year, month] = period.split('-')
  const d = new Date(parseInt(year), parseInt(month) - 1, 1)
  return d.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })
}

export function todayISO() {
  return new Date().toISOString().slice(0, 10)
}

export function pct(a: number, b: number) {
  if (!b) return 0
  return Math.round((a / b) * 100)
}

export function uid() {
  return Math.random().toString(36).slice(2, 10)
}

// Moteur de calcul de paie
export function calcIRSA(gross: number, brackets: { fromAmount: number; toAmount: number | null; rate: number }[]) {
  if (!brackets || brackets.length === 0) return 0
  let irsa = 0
  for (const b of brackets) {
    const to = b.toAmount == null ? Infinity : b.toAmount
    if (gross > b.fromAmount) {
      const taxable = Math.min(gross, to) - b.fromAmount
      irsa += taxable * (b.rate / 100)
    }
  }
  return Math.round(irsa)
}

export function calcContribution(value: number, mode: string, base: number, enabled: boolean) {
  if (!enabled) return 0
  if (mode === 'fixed') return Math.round(value)
  return Math.round(base * (value / 100))
}

export function computePayrollFromNet(
  netTarget: number,
  country: {
    contributions: { mode: string; value: number; part: string; enabled: boolean; label: string; code: string }[]
    irsaBrackets: { fromAmount: number; toAmount: number | null; rate: number }[]
  },
  extras: { overtimeAmount?: number; bonuses?: number; advances?: number; otherDeductions?: number; prorataCoef?: number } = {}
) {
  const { overtimeAmount = 0, bonuses = 0, advances = 0, otherDeductions = 0, prorataCoef = 1 } = extras
  const proratedNet = Math.round(netTarget * prorataCoef)
  const brackets = country.irsaBrackets || []
  const empContribs = (country.contributions || []).filter(c => c.part === 'employee')
  const emprContribs = (country.contributions || []).filter(c => c.part === 'employer')

  if (proratedNet <= 0) {
    return { netTarget, proratedNet: 0, gross: 0, employeeContribs: [], employerContribs: [], totalEmpCotis: 0, totalEmprCotis: 0, irsa: 0, netBase: 0, overtimeAmount, bonuses, advances, otherDeductions, netToPay: overtimeAmount + bonuses - advances - otherDeductions, massSalariale: 0, prorataCoef }
  }

  let lo = proratedNet, hi = proratedNet * 2.5, gross = proratedNet
  for (let i = 0; i < 60; i++) {
    gross = (lo + hi) / 2
    const empCotis = empContribs.reduce((s, c) => s + calcContribution(c.value, c.mode, gross, c.enabled), 0)
    const irsa = calcIRSA(gross - empCotis, brackets)
    const net = gross - empCotis - irsa
    if (Math.abs(net - proratedNet) < 1) break
    if (net < proratedNet) lo = gross; else hi = gross
  }
  gross = Math.round(gross)

  const employeeContribs = empContribs.map(c => ({ ...c, amount: calcContribution(c.value, c.mode, gross, c.enabled) }))
  const employerContribs = emprContribs.map(c => ({ ...c, amount: calcContribution(c.value, c.mode, gross, c.enabled) }))
  const totalEmpCotis = employeeContribs.reduce((s, c) => s + c.amount, 0)
  const totalEmprCotis = employerContribs.reduce((s, c) => s + c.amount, 0)
  const irsa = calcIRSA(gross - totalEmpCotis, brackets)
  const netBase = gross - totalEmpCotis - irsa
  const netToPay = netBase + overtimeAmount + bonuses - advances - otherDeductions
  const massSalariale = gross + totalEmprCotis

  return { netTarget, proratedNet, gross, employeeContribs, employerContribs, totalEmpCotis, totalEmprCotis, irsa, netBase, overtimeAmount, bonuses, advances, otherDeductions, netToPay, massSalariale, prorataCoef }
}

export const CANDIDATE_STATUSES = [
  { id: 'applied', label: 'Candidature reçue', color: '#3B82F6' },
  { id: 'interview_scheduled', label: 'Entretien planifié', color: '#F59E0B' },
  { id: 'interviewed', label: 'Entretien passé', color: '#7C3AED' },
  { id: 'validated', label: 'Disponible', color: '#10B981' },
  { id: 'placed', label: 'En mission', color: '#0D9488' },
  { id: 'suspended', label: 'Suspendu', color: '#F59E0B' },
  { id: 'blacklisted', label: 'Liste noire', color: '#EF4444' },
]

export const COMPLAINT_TYPES = [
  { id: 'retard', label: 'Retard / Absence injustifiée' },
  { id: 'comportement', label: 'Comportement irrespectueux' },
  { id: 'qualite', label: 'Mauvaise qualité du travail' },
  { id: 'malhonnetete', label: 'Malhonnêteté / Vol' },
  { id: 'negligence', label: 'Négligence' },
  { id: 'relationnel', label: 'Problème relationnel' },
  { id: 'materiel', label: 'Dommage matériel' },
  { id: 'autre', label: 'Autre' },
]

export const EVALUATION_CRITERIA = [
  { id: 'punctuality', label: 'Ponctualité' },
  { id: 'quality', label: 'Qualité du travail' },
  { id: 'behavior', label: 'Comportement' },
  { id: 'appearance', label: 'Présentation' },
  { id: 'instructions', label: 'Respect des consignes' },
  { id: 'discretion', label: 'Discrétion' },
  { id: 'honesty', label: 'Honnêteté' },
  { id: 'initiative', label: 'Initiative' },
  { id: 'hygiene', label: 'Hygiène' },
]

export function getStatusColor(status: string): { bg: string; text: string; border: string } {
  const map: Record<string, { bg: string; text: string; border: string }> = {
    applied:               { bg: '#EFF6FF', text: '#3B82F6', border: '#BFDBFE' },
    interview_scheduled:   { bg: '#FFFBEB', text: '#F59E0B', border: '#FDE68A' },
    interviewed:           { bg: '#F5F3FF', text: '#7C3AED', border: '#DDD6FE' },
    validated:             { bg: '#ECFDF5', text: '#10B981', border: '#A7F3D0' },
    placed:                { bg: '#CCFBF1', text: '#0D9488', border: '#99F6E4' },
    suspended:             { bg: '#FFFBEB', text: '#F59E0B', border: '#FDE68A' },
    blacklisted:           { bg: '#FEF2F2', text: '#EF4444', border: '#FECACA' },
    pending:               { bg: '#FFFBEB', text: '#F59E0B', border: '#FDE68A' },
    pending_validation:    { bg: '#FFFBEB', text: '#F59E0B', border: '#FDE68A' },
    pending_payment:       { bg: '#EFF6FF', text: '#3B82F6', border: '#BFDBFE' },
    active:                { bg: '#ECFDF5', text: '#10B981', border: '#A7F3D0' },
    paid:                  { bg: '#ECFDF5', text: '#10B981', border: '#A7F3D0' },
    completed:             { bg: '#ECFDF5', text: '#10B981', border: '#A7F3D0' },
    draft:                 { bg: '#F8FAFC', text: '#64748B', border: '#E2E8F0' },
    sent:                  { bg: '#EFF6FF', text: '#3B82F6', border: '#BFDBFE' },
    partially_paid:        { bg: '#FFFBEB', text: '#F59E0B', border: '#FDE68A' },
    overdue:               { bg: '#FEF2F2', text: '#EF4444', border: '#FECACA' },
    rejected:              { bg: '#FEF2F2', text: '#EF4444', border: '#FECACA' },
    cancelled:             { bg: '#FEF2F2', text: '#EF4444', border: '#FECACA' },
    received:              { bg: '#EFF6FF', text: '#3B82F6', border: '#BFDBFE' },
    in_progress:           { bg: '#FFFBEB', text: '#F59E0B', border: '#FDE68A' },
    confrontation:         { bg: '#F5F3FF', text: '#7C3AED', border: '#DDD6FE' },
    resolved:              { bg: '#ECFDF5', text: '#10B981', border: '#A7F3D0' },
    unfounded:             { bg: '#F8FAFC', text: '#64748B', border: '#E2E8F0' },
  }
  return map[status] ?? { bg: '#F8FAFC', text: '#64748B', border: '#E2E8F0' }
}

export function getStatusLabel(status: string): string {
  const map: Record<string, string> = {
    applied: 'Candidature reçue', interview_scheduled: 'Entretien planifié',
    interviewed: 'Entretien passé', validated: 'Disponible', placed: 'En mission',
    suspended: 'Suspendu', blacklisted: 'Liste noire', pending: 'En attente',
    pending_validation: 'À valider', pending_payment: 'À payer', active: 'Active',
    paid: 'Payé', completed: 'Terminée', draft: 'Brouillon', sent: 'Émise',
    partially_paid: 'Partiellement payée', overdue: 'En retard', rejected: 'Rejeté',
    cancelled: 'Annulée', received: 'Reçue', in_progress: 'En cours',
    confrontation: 'Confrontation', resolved: 'Résolue', unfounded: 'Sans suite',
  }
  return map[status] ?? status
}
