import nodemailer from 'nodemailer'

let transporter: nodemailer.Transporter | null = null

function getTransporter() {
  if (!transporter) {
    const port = Number(process.env.MAIL_PORT ?? 587)
    transporter = nodemailer.createTransport({
      host: process.env.MAIL_HOST,
      port,
      secure: port === 465,
      requireTLS: port === 587,
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
