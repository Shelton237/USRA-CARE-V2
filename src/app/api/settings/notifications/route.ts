import { prisma } from '@/lib/db'
import { ok, err, requireAuth } from '@/lib/api'

const NOTIF_DEFS = [
  { type: 'candidate_prescreened', label: 'Candidat pré-sélectionné',           target: 'candidate' },
  { type: 'candidate_placed',      label: 'Candidat placé en mission',           target: 'candidate' },
  { type: 'invoice_sent',          label: 'Facture émise au client',             target: 'client'    },
  { type: 'payment_reminder',      label: 'Relance paiement (échéance proche)',  target: 'client'    },
  { type: 'payment_received',      label: 'Paiement reçu',                       target: 'client'    },
  { type: 'payroll_paid',          label: 'Paie versée à l\'employé',            target: 'candidate' },
  { type: 'mission_ending',        label: 'Fin de mission proche',               target: 'client'    },
  { type: 'trial_ending',          label: 'Fin de période d\'essai proche',      target: 'user'      },
  { type: 'overtime_to_validate',  label: 'Heures sup à valider',               target: 'user'      },
  { type: 'advance_to_approve',    label: 'Avance à approuver',                 target: 'user'      },
  { type: 'complaint_received',    label: 'Nouvelle plainte reçue',             target: 'user'      },
  { type: 'evaluation_due',        label: 'Évaluation périodique due',           target: 'user'      },
] as const

export async function GET() {
  try {
    await requireAuth()
    const dbSettings = await prisma.notifSetting.findMany()
    const dbMap = Object.fromEntries(dbSettings.map(s => [s.type, s]))

    const settings = NOTIF_DEFS.map(def => ({
      type:      def.type,
      label:     def.label,
      target:    def.target,
      enabled:   dbMap[def.type]?.enabled ?? false,
      threshold: dbMap[def.type]?.threshold ?? 7,
    }))

    return ok(settings)
  } catch (e: any) {
    if (e.message === 'UNAUTHORIZED') return err('Non autorisé', 401)
    return err('Erreur serveur', 500)
  }
}

export async function PUT(req: Request) {
  try {
    const session = await requireAuth()
    if (session.user?.role !== 'admin') return err('Accès refusé', 403)

    const { type, enabled } = await req.json()
    if (!type) return err('Type requis', 400)

    const setting = await prisma.notifSetting.upsert({
      where:  { type },
      update: { enabled: Boolean(enabled) },
      create: { type, enabled: Boolean(enabled), threshold: 7 },
    })

    return ok(setting)
  } catch (e: any) {
    if (e.message === 'UNAUTHORIZED') return err('Non autorisé', 401)
    return err('Erreur serveur', 500)
  }
}
