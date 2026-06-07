'use client'
import { cn, getStatusColor, getStatusLabel } from '@/lib/utils'
import { X, ChevronDown, Star, Check, AlertTriangle } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

// ─── BUTTON ───────────────────────────────────────────────────────────
const variantClass = {
  primary:   'bg-teal-600 text-white hover:bg-teal-700',
  secondary: 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50',
  ghost:     'bg-transparent text-slate-600 hover:bg-slate-100',
  danger:    'bg-red-500 text-white hover:bg-red-600',
  success:   'bg-emerald-500 text-white hover:bg-emerald-600',
  warning:   'bg-amber-500 text-white hover:bg-amber-600',
  purple:    'bg-violet-600 text-white hover:bg-violet-700',
}
const sizeClass = { sm: 'px-3 py-1.5 text-xs', md: 'px-4 py-2 text-sm', lg: 'px-5 py-2.5 text-base' }

export function Btn({
  children, onClick, variant = 'primary', size = 'md', icon, disabled, full = false, type = 'button', className = '',
}: {
  children?: React.ReactNode; onClick?: () => void; variant?: keyof typeof variantClass
  size?: keyof typeof sizeClass; icon?: React.ReactNode; disabled?: boolean; full?: boolean
  type?: 'button' | 'submit'; className?: string
}) {
  return (
    <button
      type={type} onClick={onClick} disabled={disabled}
      className={cn('inline-flex items-center gap-1.5 rounded-lg font-medium transition-all focus:outline-none focus:ring-2 focus:ring-teal-400 focus:ring-offset-1 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer',
        variantClass[variant], sizeClass[size], full && 'w-full justify-center', className)}
    >
      {icon}{children}
    </button>
  )
}

// ─── BADGE ────────────────────────────────────────────────────────────
export function Badge({ children, color = '#0D9488', solid = false }: { children: React.ReactNode; color?: string; solid?: boolean }) {
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold"
      style={{ background: solid ? color : `${color}18`, color: solid ? '#fff' : color }}>{children}</span>
  )
}

export function StatusBadge({ status }: { status: string }) {
  const c = getStatusColor(status)
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold"
      style={{ background: c.bg, color: c.text, border: `1px solid ${c.border}` }}>
      {getStatusLabel(status)}
    </span>
  )
}

// ─── CARD ─────────────────────────────────────────────────────────────
export function Card({ title, children, actions, className = '', noPad = false }: {
  title?: string; children: React.ReactNode; actions?: React.ReactNode; className?: string; noPad?: boolean
}) {
  return (
    <div className={cn('bg-white rounded-xl border border-slate-200 shadow-sm', className)}>
      {title && (
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
          <h3 className="text-sm font-semibold text-slate-800">{title}</h3>
          {actions && <div className="flex items-center gap-2">{actions}</div>}
        </div>
      )}
      <div className={noPad ? 'overflow-x-auto' : 'p-4'}>{children}</div>
    </div>
  )
}

// ─── STAT CARD ────────────────────────────────────────────────────────
export function StatCard({ label, value, sub, color = '#0D9488', icon, onClick }: {
  label: string; value: string | number; sub?: string; color?: string; icon?: React.ReactNode; onClick?: () => void
}) {
  return (
    <div onClick={onClick}
      className={cn('bg-white rounded-xl border border-slate-200 shadow-sm p-4 transition-all', onClick && 'cursor-pointer hover:shadow-md hover:-translate-y-0.5')}>
      <div className="flex items-start justify-between mb-2">
        <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">{label}</span>
        {icon && <span style={{ color }} className="opacity-70">{icon}</span>}
      </div>
      <div className="text-2xl font-bold" style={{ color }}>{value}</div>
      {sub && <div className="text-xs text-slate-400 mt-1">{sub}</div>}
    </div>
  )
}

// ─── TABLE ────────────────────────────────────────────────────────────
export function Table<T extends Record<string, any>>({
  columns, data, onRowClick, empty = 'Aucune donnée',
}: {
  columns: { key: string; label: string; render?: (row: T) => React.ReactNode; align?: 'left' | 'right' | 'center' }[]
  data: T[]; onRowClick?: (row: T) => void; empty?: string
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-100">
            {columns.map(c => (
              <th key={c.key} className={cn('px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap', c.align === 'right' ? 'text-right' : c.align === 'center' ? 'text-center' : 'text-left')}>
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.length === 0 ? (
            <tr><td colSpan={columns.length} className="px-4 py-8 text-center text-slate-400 text-sm">{empty}</td></tr>
          ) : data.map((row, i) => (
            <tr key={i} onClick={() => onRowClick?.(row)}
              className={cn('border-b border-slate-50 transition-colors', onRowClick && 'cursor-pointer hover:bg-slate-50')}>
              {columns.map(c => (
                <td key={c.key} className={cn('px-4 py-3 text-slate-700', c.align === 'right' ? 'text-right' : c.align === 'center' ? 'text-center' : '')}>
                  {c.render ? c.render(row) : row[c.key] ?? '—'}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ─── MODAL ────────────────────────────────────────────────────────────
const modalSize = { sm: 'max-w-md', md: 'max-w-lg', lg: 'max-w-2xl', xl: 'max-w-4xl' }

export function Modal({ title, subtitle, onClose, children, size = 'md' }: {
  title: string; subtitle?: string; onClose: () => void; children: React.ReactNode; size?: keyof typeof modalSize
}) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className={cn('relative bg-white w-full rounded-t-2xl sm:rounded-2xl shadow-2xl slide-in flex flex-col max-h-[95vh] sm:max-h-[90vh]', modalSize[size])}>
        <div className="flex items-start justify-between p-5 border-b border-slate-100 flex-shrink-0">
          <div>
            <h2 className="text-base font-bold text-slate-900">{title}</h2>
            {subtitle && <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>}
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors ml-4 flex-shrink-0">
            <X size={16} className="text-slate-500" />
          </button>
        </div>
        <div className="overflow-y-auto flex-1 p-5">{children}</div>
      </div>
    </div>
  )
}

// ─── TABS ─────────────────────────────────────────────────────────────
export function Tabs({ tabs, active, onChange }: {
  tabs: { id: string; label: string }[]; active: string; onChange: (id: string) => void
}) {
  return (
    <div className="flex gap-1 border-b border-slate-200 mb-4 overflow-x-auto">
      {tabs.map(t => (
        <button key={t.id} onClick={() => onChange(t.id)}
          className={cn('px-3 py-2 text-xs font-semibold whitespace-nowrap border-b-2 transition-colors -mb-px',
            active === t.id ? 'border-teal-600 text-teal-700' : 'border-transparent text-slate-500 hover:text-slate-700')}>
          {t.label}
        </button>
      ))}
    </div>
  )
}

// ─── FIELD ────────────────────────────────────────────────────────────
export function Field({ label, value, onChange, type = 'text', placeholder, options, textarea, disabled, required, hint, suffix, className = '' }: {
  label?: string; value?: any; onChange?: (v: string) => void; type?: string
  placeholder?: string; options?: { value: any; label: string }[]
  textarea?: boolean; disabled?: boolean; required?: boolean; hint?: string; suffix?: string; className?: string
}) {
  const base = 'w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-teal-400 focus:border-teal-400 transition disabled:bg-slate-50 disabled:text-slate-400'
  return (
    <div className={cn('flex flex-col gap-1', className)}>
      {label && <label className="text-xs font-semibold text-slate-600">{label}{required && <span className="text-red-500 ml-0.5">*</span>}</label>}
      <div className="relative">
        {options ? (
          <select value={value ?? ''} onChange={e => onChange?.(e.target.value)} disabled={disabled} className={base}>
            {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        ) : textarea ? (
          <textarea value={value ?? ''} onChange={e => onChange?.(e.target.value)} placeholder={placeholder}
            disabled={disabled} rows={3} className={cn(base, 'resize-none')} />
        ) : (
          <input type={type} value={value ?? ''} onChange={e => onChange?.(e.target.value)}
            placeholder={placeholder} disabled={disabled} className={cn(base, suffix && 'pr-8')} />
        )}
        {suffix && <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400">{suffix}</span>}
      </div>
      {hint && <p className="text-xs text-slate-400">{hint}</p>}
    </div>
  )
}

// ─── STAR RATING ──────────────────────────────────────────────────────
export function StarRating({ value = 0, max = 5, onChange, size = 16, readonly = false }: {
  value?: number; max?: number; onChange?: (v: number) => void; size?: number; readonly?: boolean
}) {
  return (
    <div className="flex gap-0.5">
      {Array.from({ length: max }, (_, i) => (
        <Star key={i} size={size} fill={i < value ? '#D4A437' : 'none'} color={i < value ? '#D4A437' : '#CBD5E1'}
          className={cn('transition-transform', !readonly && 'cursor-pointer hover:scale-110')}
          onClick={() => !readonly && onChange?.(i + 1)} />
      ))}
    </div>
  )
}

// ─── PROGRESS BAR ─────────────────────────────────────────────────────
export function ProgressBar({ value, max, color = '#0D9488', height = 6 }: {
  value: number; max: number; color?: string; height?: number
}) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0
  return (
    <div className="w-full rounded-full bg-slate-100 overflow-hidden" style={{ height }}>
      <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: color }} />
    </div>
  )
}

// ─── BAR CHART ────────────────────────────────────────────────────────
export function BarChart({ data, height = 140, color = '#0D9488' }: {
  data: { label: string; value: number }[]; height?: number; color?: string
}) {
  const max = Math.max(...data.map(d => d.value), 1)
  return (
    <div className="flex items-end gap-2" style={{ height }}>
      {data.map((d, i) => (
        <div key={i} className="flex-1 flex flex-col items-center gap-1">
          <span className="text-xs text-slate-500">{d.value.toLocaleString('fr-FR')}</span>
          <div className="w-full rounded-t transition-all" style={{ height: `${(d.value / max) * (height - 40)}px`, background: color, minHeight: 4 }} />
          <span className="text-xs text-slate-400 truncate w-full text-center">{d.label}</span>
        </div>
      ))}
    </div>
  )
}

// ─── SEARCH BOX ───────────────────────────────────────────────────────
export function SearchBox({ value, onChange, placeholder = 'Rechercher...' }: {
  value: string; onChange: (v: string) => void; placeholder?: string
}) {
  return (
    <div className="relative">
      <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
        <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
      </svg>
      <input value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        className="pl-8 pr-3 py-1.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-400 bg-white w-48 md:w-56" />
    </div>
  )
}

// ─── PAGE HEADER ──────────────────────────────────────────────────────
export function PageHeader({ title, subtitle, actions }: {
  title: string; subtitle?: string; actions?: React.ReactNode
}) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
      <div>
        <h1 className="text-xl font-bold text-slate-900">{title}</h1>
        {subtitle && <p className="text-sm text-slate-500 mt-0.5">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  )
}

// ─── TOAST ────────────────────────────────────────────────────────────
export function Toast({ message, type = 'success' }: { message: string; type?: 'success' | 'error' | 'warning' }) {
  const colors = { success: 'bg-emerald-600', error: 'bg-red-600', warning: 'bg-amber-500' }
  return (
    <div className={cn('fixed bottom-5 right-5 z-[100] px-4 py-3 rounded-xl text-white text-sm font-medium shadow-lg slide-in flex items-center gap-2 max-w-sm', colors[type])}>
      {type === 'success' && <Check size={16} />}
      {type === 'error' && <X size={16} />}
      {type === 'warning' && <AlertTriangle size={16} />}
      {message}
    </div>
  )
}

// ─── CONFIRM DIALOG ───────────────────────────────────────────────────
export function ConfirmDialog({ title, message, onConfirm, onCancel, danger = false }: {
  title: string; message: string; onConfirm: () => void; onCancel: () => void; danger?: boolean
}) {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onCancel} />
      <div className="relative bg-white rounded-2xl shadow-2xl p-6 max-w-sm w-full slide-in">
        <h3 className="font-bold text-slate-900 mb-2">{title}</h3>
        <p className="text-sm text-slate-600 mb-5">{message}</p>
        <div className="flex gap-3 justify-end">
          <Btn variant="secondary" onClick={onCancel}>Annuler</Btn>
          <Btn variant={danger ? 'danger' : 'primary'} onClick={onConfirm}>Confirmer</Btn>
        </div>
      </div>
    </div>
  )
}

// ─── INFO ROW ─────────────────────────────────────────────────────────
export function InfoRow({ label, value, strong = false }: { label: string; value?: string | null; strong?: boolean }) {
  return (
    <div className="flex justify-between py-1.5 border-b border-slate-50 last:border-0">
      <span className="text-xs text-slate-500">{label}</span>
      <span className={cn('text-xs text-slate-800 text-right max-w-[60%] break-words', strong && 'font-semibold')}>{value || '—'}</span>
    </div>
  )
}

// ─── FILTER SELECT ────────────────────────────────────────────────────
export function FilterSelect({ value, onChange, options }: {
  value: string; onChange: (v: string) => void
  options: { value: string; label: string }[]
}) {
  return (
    <select value={value} onChange={e => onChange(e.target.value)}
      className="px-3 py-1.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-400 bg-white text-slate-700">
      {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  )
}
