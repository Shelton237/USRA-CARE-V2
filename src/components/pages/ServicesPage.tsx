'use client'
import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { PageHeader, Btn, Modal, Field, Badge } from '@/components/ui'
import { useAppStore } from '@/store/app'
import { useSession } from 'next-auth/react'
import {
  Plus, Pencil, Trash2, Settings, GripVertical,
  ChevronDown, ChevronUp, X,
  Shield, ShieldCheck, Eye, Lock,
  Home, Sparkles, Sofa, Wind,
  Baby, HeartHandshake, Heart,
  Car, Truck,
  UtensilsCrossed, ChefHat, Coffee,
  Zap, Wrench, Hammer, Pipette, Paintbrush, Sprout, Flower2,
  Calculator, BarChart3, ClipboardList, FileText,
  Monitor, Code, Cpu, Database,
  Phone, Headphones, Mail,
  Package, Briefcase, Building2, Users, Star,
} from 'lucide-react'

// ─── Icon registry ────────────────────────────────────────────────────
const ICON_MAP: Record<string, React.ElementType> = {
  shield: Shield, shield_check: ShieldCheck, eye: Eye, lock: Lock,
  home: Home, sparkles: Sparkles, sofa: Sofa, wind: Wind,
  baby: Baby, heart_hand: HeartHandshake, heart: Heart,
  car: Car, truck: Truck,
  utensils: UtensilsCrossed, chef: ChefHat, coffee: Coffee,
  zap: Zap, wrench: Wrench, hammer: Hammer, pipette: Pipette,
  paintbrush: Paintbrush, sprout: Sprout, flower: Flower2,
  calculator: Calculator, chart: BarChart3, clipboard: ClipboardList, file: FileText,
  monitor: Monitor, code: Code, cpu: Cpu, database: Database,
  phone: Phone, headphones: Headphones, mail: Mail,
  package: Package, briefcase: Briefcase, building: Building2, users: Users, star: Star,
}
const EMOJI_TO_SLUG: Record<string, string> = {
  '🔒': 'lock', '🛡': 'shield', '👶': 'baby', '🤝': 'heart_hand',
  '🚗': 'car', '🚌': 'truck', '🍳': 'utensils', '🍽': 'chef',
  '⚡': 'zap', '🔧': 'wrench', '🔨': 'hammer', '🎨': 'paintbrush',
  '🌿': 'sprout', '🧹': 'sparkles', '🏠': 'home', '🏢': 'building',
  '💻': 'monitor', '📊': 'chart', '📋': 'clipboard', '📱': 'phone',
  '👥': 'users', '💼': 'briefcase', '⭐': 'star',
}
const ICON_GROUPS = [
  { label: 'Sécurité',  icons: ['shield','shield_check','eye','lock'] },
  { label: 'Maison',    icons: ['home','sparkles','sofa','wind'] },
  { label: 'Care',      icons: ['baby','heart_hand','heart'] },
  { label: 'Transport', icons: ['car','truck'] },
  { label: 'Cuisine',   icons: ['utensils','chef','coffee'] },
  { label: 'Technique', icons: ['zap','wrench','hammer','pipette','paintbrush','sprout','flower'] },
  { label: 'Gestion',   icons: ['calculator','chart','clipboard','file'] },
  { label: 'IT',        icons: ['monitor','code','cpu','database'] },
  { label: 'Relation',  icons: ['phone','headphones','mail'] },
  { label: 'Divers',    icons: ['package','briefcase','building','users','star'] },
]
function resolveSlug(icon?: string | null): string {
  if (!icon) return 'briefcase'
  if (ICON_MAP[icon]) return icon
  return EMOJI_TO_SLUG[icon] ?? 'briefcase'
}
function ServiceIcon({ slug, size = 18 }: { slug: string; size?: number }) {
  const Comp = ICON_MAP[resolveSlug(slug)] ?? Briefcase
  return <Comp size={size} />
}
function IconPicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const slug = resolveSlug(value)
  return (
    <div className="border border-slate-200 rounded-lg p-2.5 space-y-2 max-h-44 overflow-y-auto">
      {ICON_GROUPS.map(g => (
        <div key={g.label}>
          <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-1">{g.label}</div>
          <div className="flex flex-wrap gap-1.5">
            {g.icons.map(k => {
              const Ic = ICON_MAP[k]!
              return (
                <button key={k} type="button" onClick={() => onChange(k)}
                  className={`p-1.5 rounded-lg border transition-all ${slug === k ? 'border-teal-500 bg-teal-50 text-teal-600' : 'border-slate-200 bg-white text-slate-400 hover:border-slate-300 hover:text-slate-600'}`}>
                  <Ic size={14} />
                </button>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}

// ─── Types ────────────────────────────────────────────────────────────
type QType = 'number'|'text'|'textarea'|'boolean'|'multiselect'|'rating5'|'rating20'
type TQuestion = { label: string; type: QType }
type TSection   = { title: string; questions: TQuestion[] }

const Q_TYPES: { value: QType; label: string }[] = [
  { value: 'text',        label: 'Texte court' },
  { value: 'textarea',    label: 'Texte long' },
  { value: 'number',      label: 'Nombre' },
  { value: 'boolean',     label: 'Oui / Non' },
  { value: 'multiselect', label: 'Choix multiples' },
  { value: 'rating5',     label: 'Note /5' },
  { value: 'rating20',    label: 'Note /20' },
]
const TYPE_BADGE: Record<string, string> = {
  number: 'bg-blue-50 text-blue-600', text: 'bg-slate-100 text-slate-600',
  textarea: 'bg-purple-50 text-purple-600', boolean: 'bg-green-50 text-green-600',
  multiselect: 'bg-amber-50 text-amber-600', rating5: 'bg-teal-50 text-teal-600',
  rating20: 'bg-orange-50 text-orange-600',
}

// ─── Categories ───────────────────────────────────────────────────────
const CATEGORIES = [
  { value: 'personnel_maison', label: 'Personnel de maison' },
  { value: 'securite',         label: 'Sécurité' },
  { value: 'qualifie',         label: 'Profils qualifiés' },
  { value: 'technique',        label: 'Métiers techniques' },
  { value: 'sante',            label: 'Santé / Care' },
  { value: 'transport',        label: 'Transport' },
  { value: 'restauration',     label: 'Restauration' },
  { value: 'autres',           label: 'Autres' },
]
const CAT_LABEL: Record<string, string> = Object.fromEntries(CATEGORIES.map(c => [c.value, c.label]))

// ─── Template Manager Modal ───────────────────────────────────────────
function TemplateEditor({ template, onClose, onSaved }: {
  template?: any; onClose: () => void; onSaved: () => void
}) {
  const { showToast } = useAppStore()
  const B = process.env.NEXT_PUBLIC_APP_URL ?? ''
  const [saving, setSaving] = useState(false)
  const [label, setLabel]   = useState(template?.label ?? '')
  const [sections, setSections] = useState<TSection[]>(
    template?.sections ?? [{ title: 'Section 1', questions: [] }]
  )

  const addSection = () =>
    setSections(p => [...p, { title: `Section ${p.length + 1}`, questions: [] }])

  const removeSection = (si: number) =>
    setSections(p => p.filter((_, i) => i !== si))

  const updateSectionTitle = (si: number, title: string) =>
    setSections(p => p.map((s, i) => i === si ? { ...s, title } : s))

  const addQuestion = (si: number) =>
    setSections(p => p.map((s, i) => i === si
      ? { ...s, questions: [...s.questions, { label: '', type: 'text' as QType }] }
      : s))

  const removeQuestion = (si: number, qi: number) =>
    setSections(p => p.map((s, i) => i === si
      ? { ...s, questions: s.questions.filter((_, j) => j !== qi) }
      : s))

  const updateQuestion = (si: number, qi: number, field: 'label'|'type', val: string) =>
    setSections(p => p.map((s, i) => i === si
      ? { ...s, questions: s.questions.map((q, j) => j === qi ? { ...q, [field]: val } : q) }
      : s))

  const moveSection = (si: number, dir: -1|1) => {
    const ni = si + dir
    if (ni < 0 || ni >= sections.length) return
    setSections(p => {
      const a = [...p]; [a[si], a[ni]] = [a[ni], a[si]]; return a
    })
  }

  const save = async () => {
    if (!label.trim()) { showToast('Libellé requis', 'error'); return }
    const emptyQ = sections.some(s => s.questions.some(q => !q.label.trim()))
    if (emptyQ) { showToast('Toutes les questions doivent avoir un libellé', 'error'); return }
    setSaving(true)
    try {
      const url    = template ? `${B}/api/interview-templates/${template.id}` : `${B}/api/interview-templates`
      const method = template ? 'PUT' : 'POST'
      const res = await fetch(url, {
        method, headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ label, sections }),
      })
      if (res.ok) { onSaved() }
      else { const b = await res.json().catch(() => ({})); showToast(b?.error ?? 'Erreur', 'error') }
    } catch { showToast('Erreur réseau', 'error') }
    finally { setSaving(false) }
  }

  const totalQ = sections.reduce((s, sec) => s + sec.questions.length, 0)

  return (
    <Modal title={template ? 'Modifier le template' : 'Nouveau template'} onClose={onClose} size="lg">
      <div className="space-y-4">
        <Field label="Libellé du template *" value={label} onChange={setLabel} placeholder="Ex: Garde d'enfants" />

        <div className="text-xs text-slate-500 font-medium">
          {sections.length} section(s) · {totalQ} question(s) au total
        </div>

        <div className="space-y-3 max-h-[55vh] overflow-y-auto pr-1">
          {sections.map((sec, si) => (
            <div key={si} className="border border-slate-200 rounded-xl overflow-hidden">
              {/* Section header */}
              <div className="flex items-center gap-2 bg-slate-50 px-3 py-2 border-b border-slate-200">
                <GripVertical size={14} className="text-slate-300 cursor-grab" />
                <input
                  value={sec.title}
                  onChange={e => updateSectionTitle(si, e.target.value)}
                  className="flex-1 text-sm font-semibold bg-transparent border-none outline-none text-slate-700 placeholder-slate-400"
                  placeholder="Titre de la section"
                />
                <div className="flex items-center gap-0.5">
                  <button onClick={() => moveSection(si, -1)} className="p-1 rounded hover:bg-slate-200 text-slate-400" title="Monter"><ChevronUp size={13}/></button>
                  <button onClick={() => moveSection(si,  1)} className="p-1 rounded hover:bg-slate-200 text-slate-400" title="Descendre"><ChevronDown size={13}/></button>
                  {sections.length > 1 && (
                    <button onClick={() => removeSection(si)} className="p-1 rounded hover:bg-red-50 hover:text-red-500 text-slate-400 ml-1"><X size={13}/></button>
                  )}
                </div>
              </div>

              {/* Questions */}
              <div className="p-3 space-y-2">
                {sec.questions.map((q, qi) => (
                  <div key={qi} className="flex gap-2 items-center">
                    <input
                      value={q.label}
                      onChange={e => updateQuestion(si, qi, 'label', e.target.value)}
                      placeholder="Libellé de la question..."
                      className="flex-1 text-sm border border-slate-200 rounded-lg px-3 py-1.5 outline-none focus:ring-1 focus:ring-teal-400 focus:border-teal-400"
                    />
                    <select
                      value={q.type}
                      onChange={e => updateQuestion(si, qi, 'type', e.target.value)}
                      className="text-xs border border-slate-200 rounded-lg px-2 py-1.5 bg-white outline-none focus:ring-1 focus:ring-teal-400 text-slate-600 w-36"
                    >
                      {Q_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                    </select>
                    <button onClick={() => removeQuestion(si, qi)} className="p-1.5 rounded-lg hover:bg-red-50 hover:text-red-500 text-slate-300">
                      <X size={13}/>
                    </button>
                  </div>
                ))}
                <button onClick={() => addQuestion(si)}
                  className="text-xs text-teal-600 hover:text-teal-700 font-medium flex items-center gap-1 mt-1">
                  <Plus size={12}/> Ajouter une question
                </button>
              </div>
            </div>
          ))}
        </div>

        <button onClick={addSection}
          className="w-full py-2 border-2 border-dashed border-slate-200 rounded-xl text-sm text-slate-400 hover:border-teal-300 hover:text-teal-500 transition-colors flex items-center justify-center gap-1.5">
          <Plus size={14}/> Ajouter une section
        </button>

        <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
          <Btn variant="secondary" onClick={onClose}>Annuler</Btn>
          <Btn onClick={save} disabled={saving}>{saving ? 'Enregistrement...' : 'Enregistrer'}</Btn>
        </div>
      </div>
    </Modal>
  )
}

function TemplateManagerModal({ onClose }: { onClose: () => void }) {
  const { showToast, showConfirm } = useAppStore()
  const { data: session, status: sessionStatus } = useSession()
  const role = (session?.user?.role ?? 'operator') as string
  const canEdit = sessionStatus === 'authenticated' && role !== 'operator'
  const qc = useQueryClient()
  const B = process.env.NEXT_PUBLIC_APP_URL ?? ''
  const [creating, setCreating]   = useState(false)
  const [editing, setEditing]     = useState<any>(null)
  const [expanded, setExpanded]   = useState<number | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['interview-templates'],
    queryFn: () => fetch(`${B}/api/interview-templates`).then(r => r.json()),
  })
  const templates: any[] = data?.data ?? []
  const refresh = () => qc.refetchQueries({ queryKey: ['interview-templates'] })

  const handleDelete = (t: any) => {
    showConfirm({
      title: `Supprimer "${t.label}" ?`,
      message: 'Les services utilisant ce template ne seront plus liés à un questionnaire.',
      danger: true,
      onConfirm: async () => {
        const res = await fetch(`${B}/api/interview-templates/${t.id}`, { method: 'DELETE' })
        if (res.ok) { refresh(); showToast('Template supprimé') }
        else showToast('Erreur', 'error')
      },
    })
  }

  if (creating) return (
    <TemplateEditor onClose={() => setCreating(false)}
      onSaved={async () => { await refresh(); showToast('Template créé'); setCreating(false) }} />
  )
  if (editing) return (
    <TemplateEditor template={editing} onClose={() => setEditing(null)}
      onSaved={async () => { await refresh(); showToast('Template modifié'); setEditing(null) }} />
  )

  return (
    <Modal title="Templates d'entretien" onClose={onClose} size="md">
      <div className="space-y-3">
        {canEdit && (
          <div className="flex justify-end">
            <Btn size="sm" icon={<Plus size={13}/>} onClick={() => setCreating(true)}>Nouveau template</Btn>
          </div>
        )}

        {isLoading ? (
          <div className="py-8 text-center text-slate-400 text-sm">Chargement...</div>
        ) : templates.length === 0 ? (
          <div className="py-8 text-center text-slate-400 text-sm">Aucun template configuré</div>
        ) : (
          <div className="space-y-2 max-h-[65vh] overflow-y-auto pr-1">
            {templates.map((t: any) => {
              const secs: TSection[] = Array.isArray(t.sections) ? t.sections : []
              const totalQ = secs.reduce((s, sec) => s + (sec.questions?.length ?? 0), 0)
              const open = expanded === t.id
              return (
                <div key={t.id} className="border border-slate-200 rounded-xl overflow-hidden">
                  <div className="flex items-center gap-3 px-4 py-3 bg-white hover:bg-slate-50 cursor-pointer"
                    onClick={() => setExpanded(open ? null : t.id)}>
                    <div className="flex-1">
                      <div className="font-semibold text-sm text-slate-800">{t.label}</div>
                      <div className="text-xs text-slate-400 mt-0.5">{secs.length} section(s) · {totalQ} question(s)</div>
                    </div>
                    {canEdit && (
                      <div className="flex gap-1" onClick={e => e.stopPropagation()}>
                        <button onClick={() => setEditing(t)} className="p-1.5 rounded-lg hover:bg-teal-50 hover:text-teal-600 text-slate-300"><Pencil size={13}/></button>
                        <button onClick={() => handleDelete(t)} className="p-1.5 rounded-lg hover:bg-red-50 hover:text-red-500 text-slate-300"><Trash2 size={13}/></button>
                      </div>
                    )}
                    <ChevronDown size={14} className={`text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} />
                  </div>

                  {open && (
                    <div className="border-t border-slate-100 px-4 py-3 bg-slate-50 space-y-3">
                      {secs.map((sec, si) => (
                        <div key={si}>
                          <div className="text-xs font-semibold text-teal-700 mb-1.5">
                            {sec.title} <span className="font-normal text-slate-400">({sec.questions?.length ?? 0} questions)</span>
                          </div>
                          <div className="grid grid-cols-2 gap-x-4 gap-y-0 border border-slate-200 rounded-lg overflow-hidden bg-white">
                            {(sec.questions ?? []).map((q: TQuestion, qi: number) => (
                              <div key={qi} className="flex items-center justify-between px-3 py-1.5 border-b border-slate-50">
                                <span className="text-xs text-slate-700">{q.label}</span>
                                <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${TYPE_BADGE[q.type] ?? 'bg-slate-100 text-slate-500'}`}>{q.type}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}

        <div className="flex justify-end pt-2 border-t border-slate-100">
          <Btn variant="secondary" onClick={onClose}>Fermer</Btn>
        </div>
      </div>
    </Modal>
  )
}

// ─── Service Form ─────────────────────────────────────────────────────
function ServiceForm({ service, templates, onClose, onSaved }: {
  service?: any; templates: any[]; onClose: () => void; onSaved: () => void
}) {
  const { showToast } = useAppStore()
  const B = process.env.NEXT_PUBLIC_APP_URL ?? ''
  const [saving, setSaving] = useState(false)
  const [tab, setTab]       = useState<'general'|'questionnaire'>('general')

  const existingTypes = service?.type
    ? service.type.split(',').map((t: string) => t.trim())
    : ['long_term']

  const [f, setF] = useState({
    name:              service?.name              ?? '',
    icon:              resolveSlug(service?.icon),
    category:          service?.category          ?? 'personnel_maison',
    interviewTemplate: service?.interviewTemplate ?? '',
    description:       service?.description       ?? '',
    active:            service?.active            ?? true,
    types:             existingTypes as string[],
  })
  const u = (k: string) => (v: any) => setF(p => ({ ...p, [k]: v }))

  const toggleType = (t: string) => {
    setF(p => {
      const has = p.types.includes(t)
      if (has && p.types.length === 1) return p
      return { ...p, types: has ? p.types.filter(x => x !== t) : [...p.types, t] }
    })
  }

  const selectedTemplate = templates.find(t => t.name === f.interviewTemplate) ?? null
  const secs: TSection[] = Array.isArray(selectedTemplate?.sections) ? selectedTemplate.sections : []
  const totalQ = secs.reduce((s, sec) => s + (sec.questions?.length ?? 0), 0)

  const save = async () => {
    if (!f.name) { showToast('Nom requis', 'error'); return }
    setSaving(true)
    try {
      const url    = service ? `${B}/api/services/${service.id}` : `${B}/api/services`
      const method = service ? 'PUT' : 'POST'
      const res = await fetch(url, {
        method, headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: f.name, icon: f.icon, category: f.category,
          description: f.description || null,
          interviewTemplate: f.interviewTemplate || null,
          active: f.active, type: f.types.join(','),
        }),
      })
      if (res.ok) { onSaved() }
      else { const b = await res.json().catch(() => ({})); showToast(b?.error ?? 'Erreur', 'error') }
    } catch { showToast('Erreur réseau', 'error') }
    finally { setSaving(false) }
  }

  return (
    <Modal title={service ? 'Modifier service' : 'Nouveau service'} onClose={onClose} size="md">
      <div>
        {/* Tabs */}
        <div className="flex border-b border-slate-200 mb-4 -mx-6 px-6">
          {(['general','questionnaire'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`pb-2.5 mr-6 text-sm font-medium border-b-2 transition-colors ${t === tab ? 'border-teal-500 text-teal-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>
              {t === 'general' ? 'Général' : `Questionnaire entretien${selectedTemplate ? ` (${totalQ} questions)` : ''}`}
            </button>
          ))}
        </div>

        {tab === 'general' && (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2">
                <Field label="Nom du service *" value={f.name} onChange={u('name')} placeholder="Ex: Femme de ménage" />
              </div>
              <div>
                <div className="text-xs font-semibold text-slate-600 mb-1.5">Icône</div>
                <div className="flex items-center gap-2 p-2 border border-slate-200 rounded-lg bg-slate-50 h-9">
                  <div className="p-1 rounded-lg bg-teal-50 text-teal-600"><ServiceIcon slug={f.icon} size={14} /></div>
                  <span className="text-xs text-slate-500">{f.icon}</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Catégorie" value={f.category} onChange={u('category')} options={CATEGORIES.map(c => ({ value: c.value, label: c.label }))} />
              <Field label="Template d'entretien" value={f.interviewTemplate} onChange={u('interviewTemplate')} options={[
                { value: '', label: 'Aucun' },
                ...templates.map(t => ({ value: t.name, label: t.label })),
              ]} />
            </div>

            <div>
              <div className="text-xs font-semibold text-slate-600 mb-1.5">Types de contrat proposés</div>
              <div className="flex gap-4">
                {[{ id: 'long_term', label: 'Placement' }, { id: 'short_term', label: 'Mise à disposition' }].map(t => (
                  <label key={t.id} className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={f.types.includes(t.id)} onChange={() => toggleType(t.id)}
                      className="w-4 h-4 rounded border-slate-300 accent-teal-600" />
                    <span className="text-sm text-slate-700">{t.label}</span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <div className="text-xs font-semibold text-slate-600 mb-1.5">Icône — sélectionner</div>
              <IconPicker value={f.icon} onChange={u('icon')} />
            </div>

            <Field label="Description" value={f.description} onChange={u('description')} textarea placeholder="Description du service, compétences attendues..." />
          </div>
        )}

        {tab === 'questionnaire' && (
          <div>
            {!selectedTemplate ? (
              <div className="py-8 px-4 bg-slate-50 border border-slate-200 rounded-lg text-center text-sm text-slate-500">
                Aucun template associé. Choisissez un template dans l&apos;onglet Général.
              </div>
            ) : (
              <div className="space-y-3">
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-sm space-y-0.5">
                  <div>Template : <strong>{selectedTemplate.label}</strong></div>
                  <div>Questions : <strong>{totalQ}</strong> · Sections : <strong>{secs.length}</strong></div>
                </div>
                {secs.map((sec, si) => (
                  <div key={si}>
                    <div className="text-sm font-semibold text-teal-700 mb-1.5">
                      {sec.title} <span className="font-normal text-slate-400">({sec.questions?.length ?? 0} questions)</span>
                    </div>
                    <div className="grid grid-cols-2 gap-x-4 border border-slate-200 rounded-lg overflow-hidden">
                      {(sec.questions ?? []).map((q: TQuestion, qi: number) => (
                        <div key={qi} className="flex items-center justify-between px-3 py-2 border-b border-slate-50">
                          <span className="text-sm text-slate-700">{q.label}</span>
                          <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${TYPE_BADGE[q.type] ?? 'bg-slate-100 text-slate-500'}`}>{q.type}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="flex justify-end gap-2 pt-4 border-t border-slate-100 mt-4">
          <Btn variant="secondary" onClick={onClose}>Annuler</Btn>
          <Btn onClick={save} disabled={saving}>{saving ? 'Enregistrement...' : 'Enregistrer'}</Btn>
        </div>
      </div>
    </Modal>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────
export function ServicesPage() {
  const { showToast, showConfirm } = useAppStore()
  const { data: session, status: sessionStatus } = useSession()
  const qc = useQueryClient()
  const B = process.env.NEXT_PUBLIC_APP_URL ?? ''
  const role = (session?.user?.role ?? 'operator') as string
  const canEdit = sessionStatus === 'authenticated' && role !== 'operator'

  const [creating, setCreating]         = useState(false)
  const [editing, setEditing]           = useState<any>(null)
  const [showTemplates, setShowTemplates] = useState(false)

  const { data, isLoading } = useQuery({
    queryKey: ['services'],
    queryFn: () => fetch(`${B}/api/services`).then(r => r.json()),
  })
  const { data: tplData } = useQuery({
    queryKey: ['interview-templates'],
    queryFn: () => fetch(`${B}/api/interview-templates`).then(r => r.json()),
  })
  const services: any[]  = data?.data ?? []
  const templates: any[] = tplData?.data ?? []
  const refresh = () => qc.refetchQueries({ queryKey: ['services'] })

  const handleDelete = (s: any) => {
    showConfirm({
      title: `Supprimer "${s.name}" ?`, message: 'Cette action est irréversible.', danger: true,
      onConfirm: async () => {
        const res = await fetch(`${B}/api/services/${s.id}`, { method: 'DELETE' })
        if (res.ok) { refresh(); showToast('Service supprimé') }
        else showToast('Erreur', 'error')
      },
    })
  }

  return (
    <div className="fade-in space-y-4">
      <PageHeader
        title="Services / Métiers"
        subtitle={`${services.length} service(s) configuré(s)`}
        actions={
          <div className="flex gap-2">
            {canEdit && (
              <Btn variant="secondary" icon={<Settings size={14}/>} onClick={() => setShowTemplates(true)}>
                Templates
              </Btn>
            )}
            {canEdit && (
              <Btn icon={<Plus size={14}/>} onClick={() => setCreating(true)}>Nouveau service</Btn>
            )}
          </div>
        }
      />

      {isLoading ? (
        <div className="py-12 text-center text-slate-400 text-sm">Chargement...</div>
      ) : services.length === 0 ? (
        <div className="py-12 text-center text-slate-400 text-sm">Aucun service configuré</div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {services.map((s: any) => {
            const slug  = resolveSlug(s.icon)
            const types = (s.type ?? 'long_term').split(',').map((t: string) => t.trim())
            const isP = types.includes('long_term'), isM = types.includes('short_term')
            const iconBg = isP && isM ? 'bg-purple-50 text-purple-600' : isP ? 'bg-teal-50 text-teal-600' : 'bg-blue-50 text-blue-600'
            return (
              <div key={s.id} className="group bg-white rounded-xl border border-slate-200 shadow-sm p-4 transition-all hover:shadow-md hover:-translate-y-0.5">
                <div className="flex items-start justify-between mb-3">
                  <div className={`p-2.5 rounded-xl ${iconBg}`}><ServiceIcon slug={slug} size={20} /></div>
                  {canEdit && (
                    <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => setEditing(s)} className="p-1 rounded hover:bg-teal-50 hover:text-teal-600 text-slate-300"><Pencil size={12}/></button>
                      <button onClick={() => handleDelete(s)} className="p-1 rounded hover:bg-red-50 hover:text-red-500 text-slate-300"><Trash2 size={12}/></button>
                    </div>
                  )}
                </div>
                <div className="font-semibold text-slate-800 text-sm mb-1">{s.name}</div>
                {s.category && <div className="text-xs text-slate-400 mb-2">{CAT_LABEL[s.category] ?? s.category}</div>}
                <div className="flex flex-wrap gap-1">
                  {isP && <Badge color="#0D9488">Placement</Badge>}
                  {isM && <Badge color="#3B82F6">Mise à dispo</Badge>}
                </div>
                {s.interviewTemplate && (
                  <div className="mt-2 text-[10px] text-slate-400">
                    📋 {templates.find(t => t.name === s.interviewTemplate)?.label ?? s.interviewTemplate}
                  </div>
                )}
                {!s.active && <div className="mt-1"><Badge color="#94A3B8">Inactif</Badge></div>}
              </div>
            )
          })}
        </div>
      )}

      {showTemplates && <TemplateManagerModal onClose={() => setShowTemplates(false)} />}
      {creating && (
        <ServiceForm templates={templates} onClose={() => setCreating(false)}
          onSaved={async () => { await refresh(); showToast('Service créé'); setCreating(false) }} />
      )}
      {editing && (
        <ServiceForm service={editing} templates={templates} onClose={() => setEditing(null)}
          onSaved={async () => { await refresh(); showToast('Service modifié'); setEditing(null) }} />
      )}
    </div>
  )
}
