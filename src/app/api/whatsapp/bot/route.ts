import { prisma } from '@/lib/db'
import { NextResponse, NextRequest } from 'next/server'
import fs from 'fs'
import path from 'path'
import os from 'os'

const SESSION_FILE = path.join(os.tmpdir(), 'whatsapp_sessions_usra.json')

function getSessions(): Record<string, any> {
  try {
    if (fs.existsSync(SESSION_FILE)) {
      return JSON.parse(fs.readFileSync(SESSION_FILE, 'utf-8'))
    }
  } catch (e) {
    console.error('Error reading sessions:', e)
  }
  return {}
}

function saveSessions(sessions: Record<string, any>) {
  try {
    fs.writeFileSync(SESSION_FILE, JSON.stringify(sessions, null, 2), 'utf-8')
  } catch (e) {
    console.error('Error writing sessions:', e)
  }
}

const MONTHS_FR = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
]

function getPeriodAndLabel() {
  const now = new Date()
  const year = now.getFullYear()
  const monthNum = now.getMonth() + 1
  const period = `${year}-${String(monthNum).padStart(2, '0')}`
  const label = `${MONTHS_FR[now.getMonth()]} ${year}`
  return { period, label }
}

export async function POST(req: NextRequest) {
  try {
    // Basic API key authorization
    const apiKey = req.headers.get('x-api-key')
    const expectedKey = '9f5cb38706cb4f6799960dec68a116b4EAB936QJMlHsBOzBNXovcIOguX0rx8NIMSATUR1996'
    
    if (apiKey !== expectedKey) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const { from, text } = await req.json()
    if (!from || !text) {
      return NextResponse.json({ success: false, error: 'Missing from or text' }, { status: 400 })
    }

    const cleanInput = text.trim()
    const cleanInputLower = cleanInput.toLowerCase()

    // Load session
    const sessions = getSessions()
    let session = sessions[from] || { state: 'IDLE' }
    
    // Check for cancel / reset commands
    if (cleanInputLower === 'annuler' || cleanInputLower === 'reset' || cleanInputLower === 'menu') {
      session = { state: 'IDLE' }
    }

    // Clean phone number from WhatsApp
    const cleanedFrom = from.replace(/\D/g, '')
    const suffix = cleanedFrom.slice(-9) // Last 9 digits for Cameroon or Madagascar

    // 1. Identify candidate
    const candidate = await prisma.candidate.findFirst({
      where: {
        phone: {
          contains: suffix
        }
      },
      include: {
        country: true,
        missions: {
          where: { status: 'active' }
        }
      }
    })

    if (!candidate) {
      return NextResponse.json({
        success: true,
        reply: `❌ Désolé, votre numéro (+${cleanedFrom}) n'est pas reconnu dans notre système. Veuillez contacter l'administration de USRA-CARE.`
      })
    }

    const activeMission = candidate.missions[0]
    const currency = candidate.country?.symbol || 'Ar'

    // Update session basic info
    session.candidateId = candidate.id
    session.candidateName = `${candidate.firstName} ${candidate.lastName}`
    session.currency = currency
    session.countryId = candidate.countryId
    session.missionId = activeMission?.id
    session.lastInteraction = Date.now()

    let reply = ''

    // Helper to format menu
    const getMainMenu = () => {
      let menu = `Bonjour ${session.candidateName} !\n\n`
      menu += `Que souhaitez-vous faire aujourd'hui ?\n`
      menu += `1️⃣ Déclarer ma présence (Pointage)\n`
      menu += `2️⃣ Demander une avance sur salaire\n`
      menu += `3️⃣ Consulter mon solde et bulletin\n\n`
      menu += `Répondez avec le numéro de l'option (1, 2 ou 3).`
      return menu
    }

    switch (session.state) {
      case 'IDLE':
        reply = getMainMenu()
        session.state = 'AWAITING_MENU_OPTION'
        break

      case 'AWAITING_MENU_OPTION':
        if (cleanInput === '1') {
          if (!session.missionId) {
            reply = `⚠️ Vous n'avez pas de mission active enregistrée actuellement. L'option de pointage n'est pas disponible. Contactez l'administration.\n\nTapez "menu" pour revenir.`
            break
          }
          const { period, label } = getPeriodAndLabel()
          
          // Check if attendance already exists
          const existingAttendance = await prisma.attendanceRecord.findFirst({
            where: {
              missionId: session.missionId,
              period: period
            }
          })

          if (existingAttendance) {
            reply = `⚠️ Vous avez déjà soumis un rapport de présence pour ce mois (${label}).\n`
            reply += `• Statut actuel : ${existingAttendance.status === 'validated' ? 'Validé ✅' : 'En attente ⏳'}\n\n`
            reply += `Tapez "menu" pour revenir au menu principal.`
            session.state = 'IDLE'
            break
          }

          session.period = period
          session.periodLabel = label
          session.state = 'POINTAGE_AWAITING_WORKED'
          reply = `📋 Déclaration de présence pour *${label}*\n\n`
          reply += `Veuillez saisir le nombre de jours travaillés ce mois (ex: 22) :`
        } else if (cleanInput === '2') {
          if (!session.missionId) {
            reply = `⚠️ Vous n'avez pas de mission active enregistrée actuellement. La demande d'avance n'est pas disponible.\n\nTapez "menu" pour revenir.`
            break
          }

          // Check if there is already a pending advance
          const pendingAdvance = await prisma.advance.findFirst({
            where: {
              candidateId: session.candidateId,
              status: 'pending'
            }
          })

          if (pendingAdvance) {
            reply = `⚠️ Vous avez déjà une demande d'avance de salaire en cours d'approbation.\n`
            reply += `• Montant : ${pendingAdvance.amount} ${session.currency}\n\n`
            reply += `Veuillez patienter qu'elle soit traitée avant d'en formuler une nouvelle.\n`
            reply += `Tapez "menu" pour revenir au menu principal.`
            session.state = 'IDLE'
            break
          }

          session.state = 'ADVANCE_AWAITING_AMOUNT'
          reply = `💰 Demande d'avance sur salaire\n\n`
          reply += `Veuillez saisir le montant de l'avance demandée en *${session.currency}* (ex: 50000) :`
        } else if (cleanInput === '3') {
          // Query last 3 payrolls
          const payrolls = await prisma.payroll.findMany({
            where: { candidateId: session.candidateId },
            orderBy: { period: 'desc' },
            take: 3
          })

          if (payrolls.length === 0) {
            reply = `📄 Aucun bulletin de paie n'est disponible pour le moment.\n\n`
            reply += `Tapez "menu" pour revenir au menu principal.`
          } else {
            reply = `📄 *Vos derniers bulletins de paie* :\n\n`
            for (const p of payrolls) {
              const statusLabel = p.status === 'paid' ? 'Payé ✅' : 'En attente de paiement ⏳'
              reply += `• Période : *${p.period}*\n`
              reply += `  Net à payer : *${p.netSalary.toLocaleString()} ${session.currency}*\n`
              reply += `  Statut : ${statusLabel}\n\n`
            }
            reply += `Tapez "menu" pour revenir au menu principal.`
          }
          session.state = 'IDLE'
        } else {
          reply = `⚠️ Option invalide.\n\n` + getMainMenu()
        }
        break

      case 'POINTAGE_AWAITING_WORKED':
        const daysWorked = parseInt(cleanInput, 10)
        if (isNaN(daysWorked) || daysWorked < 0 || daysWorked > 31) {
          reply = `⚠️ Saisie invalide. Veuillez saisir un nombre de jours correct entre 0 et 31 :`
        } else {
          session.daysWorked = daysWorked
          session.state = 'POINTAGE_AWAITING_ABS_JUSTIFIED'
          reply = `Nombre de jours d'absence *justifiée* (répondez 0 si aucun) :`
        }
        break

      case 'POINTAGE_AWAITING_ABS_JUSTIFIED':
        const absJustified = parseInt(cleanInput, 10)
        if (isNaN(absJustified) || absJustified < 0 || absJustified > 31) {
          reply = `⚠️ Saisie invalide. Saisissez un nombre correct entre 0 et 31 :`
        } else {
          session.absJustified = absJustified
          session.state = 'POINTAGE_AWAITING_ABS_UNJUSTIFIED'
          reply = `Nombre de jours d'absence *non justifiée* (répondez 0 si aucun) :`
        }
        break

      case 'POINTAGE_AWAITING_ABS_UNJUSTIFIED':
        const absUnjustified = parseInt(cleanInput, 10)
        if (isNaN(absUnjustified) || absUnjustified < 0 || absUnjustified > 31) {
          reply = `⚠️ Saisie invalide. Saisissez un nombre correct entre 0 et 31 :`
        } else {
          session.absUnjustified = absUnjustified
          session.state = 'POINTAGE_CONFIRM'
          
          reply = `📋 *Récapitulatif de votre déclaration (${session.periodLabel})* :\n`
          reply += `• Jours travaillés : *${session.daysWorked} jours*\n`
          reply += `• Absences justifiées : *${session.absJustified} jours*\n`
          reply += `• Absences non justifiées : *${session.absUnjustified} jours*\n\n`
          reply += `Confirmez-vous ce pointage ?\n`
          reply += `1️⃣ Oui, je confirme\n`
          reply += `2️⃣ Non, tout recommencer`
        }
        break

      case 'POINTAGE_CONFIRM':
        if (cleanInput === '1') {
          try {
            await prisma.attendanceRecord.create({
              data: {
                countryId: session.countryId,
                missionId: session.missionId,
                candidateId: session.candidateId,
                period: session.period,
                daysWorked: session.daysWorked,
                absJustified: session.absJustified,
                absUnjustified: session.absUnjustified,
                status: 'pending',
                prorataBase: 30
              }
            })
            reply = `✅ Votre rapport de présence pour *${session.periodLabel}* a bien été enregistré. Il sera vérifié par l'administration. Merci !\n\nTapez "menu" pour revenir.`
            session = { state: 'IDLE' }
          } catch (dbError) {
            console.error('Error saving attendance record:', dbError)
            reply = `❌ Une erreur réseau ou système est survenue lors de la sauvegarde. Veuillez réessayer ultérieurement.\n\nTapez "menu" pour revenir.`
            session = { state: 'IDLE' }
          }
        } else if (cleanInput === '2') {
          session.state = 'POINTAGE_AWAITING_WORKED'
          reply = `Recommençons. Veuillez saisir le nombre de jours travaillés ce mois (ex: 22) :`
        } else {
          reply = `⚠️ Choix invalide. Répondez avec :\n1️⃣ Oui, pour confirmer\n2️⃣ Non, pour recommencer`
        }
        break

      case 'ADVANCE_AWAITING_AMOUNT':
        const amount = parseFloat(cleanInput)
        if (isNaN(amount) || amount <= 0) {
          reply = `⚠️ Montant invalide. Veuillez saisir un nombre supérieur à 0 (ex: 50000) :`
        } else {
          session.advanceAmount = amount
          session.state = 'ADVANCE_AWAITING_REASON'
          reply = `Veuillez saisir le motif de votre demande d'avance (ex: Loyers, École, Santé...) :`
        }
        break

      case 'ADVANCE_AWAITING_REASON':
        if (!cleanInput) {
          reply = `⚠️ Le motif est obligatoire. Veuillez saisir la raison de votre demande :`
        } else {
          session.advanceReason = cleanInput
          session.state = 'ADVANCE_CONFIRM'

          reply = `💰 *Récapitulatif de votre demande d'avance* :\n`
          reply += `• Montant : *${session.advanceAmount.toLocaleString()} ${session.currency}*\n`
          reply += `• Motif : *${session.advanceReason}*\n\n`
          reply += `Confirmez-vous cette demande ?\n`
          reply += `1️⃣ Oui, je confirme\n`
          reply += `2️⃣ Non, annuler la demande`
        }
        break

      case 'ADVANCE_CONFIRM':
        if (cleanInput === '1') {
          try {
            await prisma.advance.create({
              data: {
                candidateId: session.candidateId,
                amount: session.advanceAmount,
                reason: session.advanceReason,
                status: 'pending',
                requestDate: new Date()
              }
            })
            reply = `✅ Votre demande d'avance de *${session.advanceAmount.toLocaleString()} ${session.currency}* a été enregistrée avec succès. Elle sera examinée par l'administration. Merci !\n\nTapez "menu" pour revenir.`
            session = { state: 'IDLE' }
          } catch (dbError) {
            console.error('Error saving advance:', dbError)
            reply = `❌ Une erreur réseau ou système est survenue lors de la soumission de la demande. Veuillez réessayer.\n\nTapez "menu" pour revenir.`
            session = { state: 'IDLE' }
          }
        } else if (cleanInput === '2') {
          reply = `❌ Demande d'avance annulée.\n\nTapez "menu" pour revenir au menu principal.`
          session = { state: 'IDLE' }
        } else {
          reply = `⚠️ Choix invalide. Répondez avec :\n1️⃣ Oui, pour confirmer\n2️⃣ Non, pour annuler`
        }
        break

      default:
        session = { state: 'IDLE' }
        reply = getMainMenu()
        session.state = 'AWAITING_MENU_OPTION'
        break
    }

    // Save session back
    sessions[from] = session
    saveSessions(sessions)

    return NextResponse.json({ success: true, reply })
  } catch (error: any) {
    console.error('Error in whatsapp bot handler:', error)
    return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 })
  }
}
