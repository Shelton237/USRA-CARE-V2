import { Document, Page, View, Text, Image, StyleSheet, renderToBuffer } from '@react-pdf/renderer'
import path from 'path'
import { fmt as fmtBase, fmtDate, periodLabel } from '@/lib/utils'

const TEAL = '#0D9488'

// La police PDF par defaut n'a pas le glyphe des espaces insecables utilisees par Intl.NumberFormat('fr-FR')
const NBSP_RE = new RegExp('[' + String.fromCharCode(0xA0, 0x202F, 0x2009) + ']', 'g')
function fmt(amount: number, symbol = '') {
  return fmtBase(amount, symbol).replace(NBSP_RE, ' ')
}

const styles = StyleSheet.create({
  page: { padding: 32, fontSize: 10, color: '#1E293B', fontFamily: 'Helvetica' },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', borderBottomWidth: 3, borderBottomColor: TEAL, paddingBottom: 16, marginBottom: 20 },
  logo: { width: 70, height: 70, marginBottom: 8, objectFit: 'contain' },
  entityName: { fontSize: 12, fontWeight: 700, color: '#0F172A', marginBottom: 2 },
  muted: { color: '#64748B', fontSize: 9, lineHeight: 1.5 },
  title: { fontSize: 26, fontWeight: 700, color: TEAL, marginBottom: 6, textAlign: 'right' },
  refBold: { fontWeight: 700, fontSize: 11, textAlign: 'right', marginBottom: 6 },
  rightMuted: { textAlign: 'right', color: '#64748B', fontSize: 9 },
  badgesRow: { flexDirection: 'row', justifyContent: 'flex-end', gap: 6, marginTop: 6 },
  badge: { fontSize: 8, fontWeight: 700, paddingVertical: 3, paddingHorizontal: 8, borderRadius: 4 },
  twoCol: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 },
  label: { fontSize: 8, color: '#94A3B8', fontWeight: 700, textTransform: 'uppercase', marginBottom: 4, letterSpacing: 0.5 },
  clientName: { fontSize: 12, fontWeight: 700, color: '#0F172A', marginBottom: 2 },
  notes: { fontSize: 9, color: '#475569', fontStyle: 'italic', backgroundColor: '#F0FDFA', padding: 10, borderRadius: 6, marginBottom: 14 },
  table: { borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 4, marginBottom: 16 },
  tableHeader: { flexDirection: 'row', backgroundColor: TEAL, paddingVertical: 8, paddingHorizontal: 10 },
  tableHeaderText: { color: '#fff', fontSize: 9, fontWeight: 700 },
  tableRow: { flexDirection: 'row', paddingVertical: 8, paddingHorizontal: 10, borderTopWidth: 1, borderTopColor: '#F1F5F9' },
  colDesc: { flex: 1 },
  colQty: { width: 50, textAlign: 'center' },
  colUnit: { width: 90, textAlign: 'right' },
  colTotal: { width: 90, textAlign: 'right', fontWeight: 700 },
  totalsBox: { alignSelf: 'flex-end', width: 230, marginBottom: 20 },
  totalsRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 5, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  totalsLabel: { color: '#64748B', fontSize: 9 },
  totalsValue: { color: '#1E293B', fontSize: 9, fontWeight: 700 },
  grandTotalRow: { flexDirection: 'row', justifyContent: 'space-between', paddingTop: 8, marginTop: 4, borderTopWidth: 2, borderTopColor: TEAL },
  grandTotalLabel: { fontSize: 11, fontWeight: 700, color: '#0F172A' },
  grandTotalValue: { fontSize: 15, fontWeight: 700, color: TEAL },
  footer: { marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#E2E8F0' },
  footerCols: { flexDirection: 'row', justifyContent: 'space-between' },
  footerCol: { width: '48%' },
  footerTitle: { fontWeight: 700, fontSize: 9, color: '#334155', marginBottom: 4 },
  footerText: { fontSize: 8.5, color: '#64748B', lineHeight: 1.5 },
  footerCenter: { textAlign: 'center', marginTop: 14, fontSize: 8, color: '#94A3B8' },
})

const STATUS_LABEL: Record<string, string> = {
  draft: 'Brouillon', sent: 'Émise', partially_paid: 'Part. payée', paid: 'Payée', overdue: 'En retard',
}

function InvoiceDocument({ invoice }: { invoice: any }) {
  const { client, country, lines = [], payments = [] } = invoice
  const sym = country?.symbol ?? '€'
  const paidAmount = payments.reduce((s: number, p: any) => s + p.amount, 0)
  const logoPath = path.join(process.cwd(), 'public', 'logo.png')

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.headerRow}>
          <View style={{ maxWidth: 280 }}>
            <Image src={logoPath} style={styles.logo} />
            {country?.entityName && <Text style={styles.entityName}>{country.entityName}</Text>}
            <View style={styles.muted}>
              {country?.address && <Text>{country.address}</Text>}
              {country?.city && <Text>{country.city}</Text>}
              {country?.entityPhone && <Text>Tél : {country.entityPhone}</Text>}
              {country?.entityEmail && <Text>Email : {country.entityEmail}</Text>}
              {(country?.taxId || country?.statId) && (
                <Text style={{ marginTop: 3 }}>{[country.taxId, country.statId].filter(Boolean).join(' · ')}</Text>
              )}
            </View>
          </View>
          <View>
            <Text style={styles.title}>FACTURE</Text>
            <Text style={styles.refBold}>{invoice.reference}</Text>
            <Text style={styles.rightMuted}>Date : {fmtDate(invoice.date)}</Text>
            <Text style={styles.rightMuted}>Échéance : {fmtDate(invoice.dueDate)}</Text>
            <View style={styles.badgesRow}>
              <Text style={[styles.badge, { backgroundColor: '#CCFBF1', color: TEAL }]}>
                {STATUS_LABEL[invoice.status] ?? invoice.status}
              </Text>
              <Text style={[styles.badge, { backgroundColor: '#EFF6FF', color: '#3B82F6' }]}>
                {invoice.invoiceType === 'mise_a_disposition' ? 'MAD' : 'Placement'}
              </Text>
            </View>
          </View>
        </View>

        {/* Client + Period */}
        <View style={styles.twoCol}>
          <View style={{ maxWidth: 280 }}>
            <Text style={styles.label}>Facturé à</Text>
            <Text style={styles.clientName}>{client?.name}</Text>
            <View style={styles.muted}>
              {client?.companyName && <Text>{client.companyName}</Text>}
              {client?.address && <Text>{client.address}</Text>}
              {client?.phone && <Text>Tél : {client.phone}</Text>}
              {client?.nif && <Text>NIF : {client.nif}</Text>}
            </View>
          </View>
          {invoice.period && (
            <View>
              <Text style={styles.label}>Période</Text>
              <Text style={styles.clientName}>{periodLabel(invoice.period)}</Text>
            </View>
          )}
        </View>

        {/* Notes */}
        {invoice.notes && <Text style={styles.notes}>{invoice.notes}</Text>}

        {/* Lines */}
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={[styles.tableHeaderText, styles.colDesc]}>Description</Text>
            <Text style={[styles.tableHeaderText, styles.colQty]}>Qté</Text>
            <Text style={[styles.tableHeaderText, styles.colUnit]}>P.U.</Text>
            <Text style={[styles.tableHeaderText, styles.colTotal]}>Total HT</Text>
          </View>
          {lines.map((l: any, i: number) => (
            <View key={i} style={styles.tableRow}>
              <Text style={styles.colDesc}>{l.description}</Text>
              <Text style={styles.colQty}>{l.quantity}</Text>
              <Text style={styles.colUnit}>{fmt(l.unitPrice, sym)}</Text>
              <Text style={styles.colTotal}>{fmt(l.totalHT, sym)}</Text>
            </View>
          ))}
          {lines.length === 0 && (
            <View style={styles.tableRow}>
              <Text style={{ flex: 1, textAlign: 'center', color: '#94A3B8' }}>Aucune ligne</Text>
            </View>
          )}
        </View>

        {/* Totals */}
        <View style={styles.totalsBox}>
          <View style={styles.totalsRow}>
            <Text style={styles.totalsLabel}>Sous-total HT</Text>
            <Text style={styles.totalsValue}>{fmt(invoice.subtotalHT, sym)}</Text>
          </View>
          {(invoice.vatRate ?? 0) > 0 && (
            <View style={styles.totalsRow}>
              <Text style={styles.totalsLabel}>TVA ({invoice.vatRate}%)</Text>
              <Text style={styles.totalsValue}>{fmt(invoice.vatAmount, sym)}</Text>
            </View>
          )}
          {(invoice.syntheticTax ?? 0) > 0 && (
            <View style={styles.totalsRow}>
              <Text style={styles.totalsLabel}>Impôt synthétique</Text>
              <Text style={styles.totalsValue}>{fmt(invoice.syntheticTax, sym)}</Text>
            </View>
          )}
          <View style={styles.grandTotalRow}>
            <Text style={styles.grandTotalLabel}>TOTAL TTC</Text>
            <Text style={styles.grandTotalValue}>{fmt(invoice.total, sym)}</Text>
          </View>
          {(invoice.acompteAmount ?? 0) > 0 && (
            <>
              <View style={[styles.totalsRow, { borderBottomWidth: 0, marginTop: 4, backgroundColor: '#FFFBEB', paddingHorizontal: 4 }]}>
                <Text style={[styles.totalsLabel, { color: '#B45309' }]}>
                  {`Acompte recu${invoice.acompteDate ? ' (' + fmtDate(invoice.acompteDate) + ')' : ''}`}
                </Text>
                <Text style={[styles.totalsValue, { color: '#B45309' }]}>{`-${fmt(invoice.acompteAmount, sym)}`}</Text>
              </View>
              <View style={[styles.grandTotalRow, { marginTop: 4 }]}>
                <Text style={styles.grandTotalLabel}>NET A PAYER</Text>
                <Text style={styles.grandTotalValue}>{fmt(invoice.total - invoice.acompteAmount, sym)}</Text>
              </View>
            </>
          )}
          {paidAmount > 0 && (invoice.acompteAmount ?? 0) === 0 && (
            <View style={[styles.totalsRow, { borderBottomWidth: 0, marginTop: 4 }]}>
              <Text style={styles.totalsLabel}>Encaisse</Text>
              <Text style={[styles.totalsValue, { color: TEAL }]}>{fmt(paidAmount, sym)}</Text>
            </View>
          )}
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <View style={styles.footerCols}>
            <View style={styles.footerCol}>
              <Text style={styles.footerTitle}>Modalités de paiement</Text>
              {client?.paymentTermsDays != null && (
                <Text style={styles.footerText}>Délai : {client.paymentTermsDays} jours à compter de la date de facture.</Text>
              )}
              {/* ── RIB bancaire (ex: Madagascar) ── */}
              {(country?.bankCode || country?.iban || country?.bic) ? (
                <>
                  {country?.bankName && (
                    <Text style={styles.footerText}>{country.bankName}{country?.agencyCode ? ` — ${country.agencyCode}` : ''}</Text>
                  )}
                  {(country?.bankCode || country?.agencyCode || country?.ribKey) && (
                    <Text style={styles.footerText}>
                      {[
                        country.bankCode    ? `Banque : ${country.bankCode}`    : null,
                        country.agencyCode  ? `Agence : ${country.agencyCode}`  : null,
                        country.bankAccount ? `N° : ${country.bankAccount}`     : null,
                        country.ribKey      ? `Cle : ${country.ribKey}`         : null,
                      ].filter(Boolean).join(' | ')}
                    </Text>
                  )}
                  {country?.bic  && <Text style={styles.footerText}>BIC : {country.bic}</Text>}
                  {country?.iban && <Text style={styles.footerText}>IBAN : {country.iban}</Text>}
                </>
              ) : country?.mobileMoneyAccount ? (
                /* ── Mobile Money (ex: Cameroun) ── */
                <>
                  <Text style={[styles.footerText, { fontWeight: 700, color: '#F97316' }]}>Orange Money</Text>
                  <Text style={styles.footerText}>{country.mobileMoneyAccount}</Text>
                </>
              ) : country?.bankName ? (
                /* ── Banque simple sans RIB ── */
                <Text style={styles.footerText}>{country.bankName}{country?.bankAccount ? ` — ${country.bankAccount}` : ''}</Text>
              ) : null}

            </View>
            <View style={styles.footerCol}>
              <Text style={styles.footerTitle}>Mentions légales</Text>
              <Text style={styles.footerText}>{country?.legalMention ?? '—'}</Text>
            </View>
          </View>
          <Text style={styles.footerCenter}>
            {[country?.entityName, country?.taxId, country?.statId].filter(Boolean).join(' · ')}
          </Text>
        </View>
      </Page>
    </Document>
  )
}

export async function renderInvoicePdf(invoice: any): Promise<Buffer> {
  return renderToBuffer(<InvoiceDocument invoice={invoice} />)
}
