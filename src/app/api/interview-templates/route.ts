import { prisma } from '@/lib/db'
import { ok, err, requireAuth } from '@/lib/api'
import { NextRequest } from 'next/server'

const DEFAULT_TEMPLATES = [
  { name: 'menage',        label: 'Ménage / Entretien', sections: [{ title: 'Expérience', questions: [{ label: "Années d'expérience", type: 'number' }, { label: 'Types de logements', type: 'multiselect' }, { label: 'Produits maîtrisés', type: 'multiselect' }, { label: 'Références clients', type: 'textarea' }] }, { title: 'Compétences', questions: [{ label: 'Repassage', type: 'boolean' }, { label: 'Cuisine simple', type: 'boolean' }, { label: 'Garde enfants', type: 'boolean' }, { label: 'Langues', type: 'textarea' }] }, { title: 'Tests', questions: [{ label: 'Test dépoussiérage', type: 'rating5' }, { label: 'Test vitres', type: 'rating5' }, { label: 'Présentation', type: 'rating5' }, { label: 'Prétention salariale', type: 'number' }] }] },
  { name: 'cuisine',       label: 'Cuisine / Chef', sections: [{ title: 'Expérience', questions: [{ label: "Années d'expérience", type: 'number' }, { label: "Types d'établissements", type: 'multiselect' }, { label: 'Spécialités culinaires', type: 'multiselect' }, { label: 'Plats phares', type: 'textarea' }] }, { title: 'Compétences', questions: [{ label: 'Sait planifier des menus', type: 'boolean' }, { label: 'Gestion budget courses', type: 'boolean' }, { label: 'Formation hygiène (HACCP)', type: 'boolean' }, { label: 'Langues', type: 'textarea' }] }, { title: 'Tests', questions: [{ label: 'Test cuisine', type: 'rating20' }, { label: 'Plat préparé', type: 'text' }, { label: 'Présentation', type: 'rating5' }, { label: 'Prétention salariale', type: 'number' }] }] },
  { name: 'securite',      label: 'Agent de sécurité', sections: [{ title: 'Expérience', questions: [{ label: "Années d'expérience", type: 'number' }, { label: 'Secteurs gardés', type: 'multiselect' }, { label: 'Diplômes / certifications', type: 'textarea' }, { label: 'Références', type: 'textarea' }] }, { title: 'Compétences', questions: [{ label: 'Permis de conduire', type: 'boolean' }, { label: 'Maîtrise outil radio', type: 'boolean' }, { label: 'Premiers secours (SSIAP)', type: 'boolean' }, { label: 'Langues', type: 'textarea' }] }, { title: 'Tests', questions: [{ label: 'Aptitude physique', type: 'rating5' }, { label: 'Gestion stress', type: 'rating5' }, { label: 'Présentation', type: 'rating5' }, { label: 'Prétention salariale', type: 'number' }] }] },
  { name: 'chauffeur',     label: 'Chauffeur', sections: [{ title: 'Expérience', questions: [{ label: "Années d'expérience", type: 'number' }, { label: 'Types de véhicules', type: 'multiselect' }, { label: 'Catégorie de permis', type: 'multiselect' }, { label: 'Références', type: 'textarea' }] }, { title: 'Compétences', questions: [{ label: 'Connaissance de la ville', type: 'rating5' }, { label: 'Mécanique de base', type: 'boolean' }, { label: 'Conduite défensive', type: 'boolean' }, { label: 'Langues', type: 'textarea' }] }, { title: 'Tests', questions: [{ label: 'Test de conduite', type: 'rating20' }, { label: 'Code de la route', type: 'rating20' }, { label: 'Présentation', type: 'rating5' }, { label: 'Prétention salariale', type: 'number' }] }] },
  { name: 'garde_enfants', label: "Garde d'enfants", sections: [{ title: 'Expérience', questions: [{ label: "Années d'expérience", type: 'number' }, { label: "Tranches d'âge", type: 'multiselect' }, { label: 'Activités proposées', type: 'multiselect' }, { label: 'Références', type: 'textarea' }] }, { title: 'Compétences', questions: [{ label: 'Formation petite enfance', type: 'boolean' }, { label: 'Aide aux devoirs', type: 'boolean' }, { label: 'Premiers secours nourrissons', type: 'boolean' }, { label: 'Langues', type: 'textarea' }] }, { title: 'Tests', questions: [{ label: 'Interaction enfant', type: 'rating5' }, { label: 'Patience / empathie', type: 'rating5' }, { label: 'Présentation', type: 'rating5' }, { label: 'Prétention salariale', type: 'number' }] }] },
  { name: 'general',       label: 'Questionnaire général', sections: [{ title: 'Profil', questions: [{ label: "Niveau d'études", type: 'text' }, { label: "Années d'expérience", type: 'number' }, { label: 'Compétences clés', type: 'multiselect' }, { label: 'Références', type: 'textarea' }] }, { title: 'Aptitudes', questions: [{ label: 'Ponctualité', type: 'rating5' }, { label: 'Présentation', type: 'rating5' }, { label: 'Langues', type: 'textarea' }, { label: 'Prétention salariale', type: 'number' }] }] },
]

export async function GET() {
  try {
    await requireAuth()
    let templates = await prisma.interviewTemplate.findMany({ orderBy: { label: 'asc' } })
    if (templates.length === 0) {
      await prisma.interviewTemplate.createMany({ data: DEFAULT_TEMPLATES })
      templates = await prisma.interviewTemplate.findMany({ orderBy: { label: 'asc' } })
    }
    return ok(templates)
  } catch (e: any) {
    if (e.message === 'UNAUTHORIZED') return err('Non autorisé', 401)
    return err('Erreur serveur', 500)
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireAuth()
    if (session.user?.role === 'operator') return err('Accès refusé', 403)
    const body = await req.json()
    if (!body.label) return err('Libellé requis', 400)
    const name = body.name || body.label.toLowerCase().replace(/[^a-z0-9]/g, '_').replace(/_+/g, '_')
    const tpl = await prisma.interviewTemplate.create({
      data: { name, label: body.label, sections: body.sections ?? [] },
    })
    return ok(tpl, 201)
  } catch (e: any) {
    if (e.message === 'UNAUTHORIZED') return err('Non autorisé', 401)
    if (e.code === 'P2002') return err('Un template avec ce nom existe déjà', 409)
    return err('Erreur serveur', 500)
  }
}
