import nodemailer from 'nodemailer'

let transporter: nodemailer.Transporter | null = null

function getTransporter() {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: process.env.MAIL_HOST,
      port: Number(process.env.MAIL_PORT ?? 465),
      secure: (process.env.MAIL_ENCRYPTION ?? 'ssl') === 'ssl',
      auth: { user: process.env.MAIL_USERNAME, pass: process.env.MAIL_PASSWORD },
    })
  }
  return transporter
}

export async function sendMail(opts: { to: string; subject: string; html: string; attachments?: { filename: string; content: Buffer }[] }) {
  const from = process.env.MAIL_FROM_ADDRESS
    ? `"${process.env.MAIL_FROM_NAME ?? 'USRA CARE'}" <${process.env.MAIL_FROM_ADDRESS}>`
    : process.env.MAIL_USERNAME
  return getTransporter().sendMail({ from, ...opts })
}
