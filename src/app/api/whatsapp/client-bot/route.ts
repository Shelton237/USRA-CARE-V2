import { NextResponse, NextRequest } from 'next/server'
import { OpenAI } from 'openai'
// import { prisma } from '@/lib/db'

// Initialisation du client OpenAI
// S'assure que OPENAI_API_KEY est défini dans le .env
const openai = new OpenAI() 

export async function POST(req: NextRequest) {
  try {
    // 1. Authentification (Optionnelle ou similaire au bot RH)
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

    // 2. Prompt Système pour forcer la structure JSON et les règles d'extraction
    const systemPrompt = `
    Tu es un assistant virtuel pour une entreprise de services.
    Ton rôle est d'analyser le message d'un client et d'en extraire les informations clés au format JSON strict.
    
    Structure JSON attendue :
    {
      "category": (string) la catégorie générale (ex: Plomberie, Électricité, Menuiserie, Nettoyage, etc.),
      "subcategory": (string) la sous-catégorie ou équipement précis (ex: Évier, Prise, Fenêtre),
      "problem": (string) description courte et concise du problème (ex: Fuite d'eau, Court-circuit),
      "location": (string) le quartier, la ville ou l'adresse mentionnée (ex: Ivandry, Centre-ville),
      "urgency": (string) le niveau d'urgence déduit (Faible, Moyenne, Haute),
      "desired_date": (string) la date ou le moment souhaité (ex: Demain, Lundi prochain, Urgence immédiate)
    }
    
    RÈGLE ABSOLUE : Si une information est introuvable ou non explicite dans le message du client, la valeur correspondante DOIT être "null". N'invente jamais d'informations.
    `

    // 3. Appel à l'API OpenAI (modèle gpt-4o-mini)
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: cleanInput }
      ],
      temperature: 0.1, // Déterministe
    })

    // 4. Récupération et parsing du JSON
    const content = response.choices[0].message.content
    const extractedData = content ? JSON.parse(content) : null

    console.log(`[WhatsApp Client Bot] Message de ${from} analysé :`, extractedData)

    // TODO: Enregistrer ces données en base ou notifier un administrateur
    // await prisma.clientRequest.create({ data: { phone: from, ...extractedData } })

    // 5. Réponse
    return NextResponse.json({ 
      success: true, 
      extracted_data: extractedData 
    })

  } catch (error: any) {
    console.error('Erreur Client Bot WhatsApp:', error)
    return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 })
  }
}
