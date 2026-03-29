import { config } from '../config.js'

interface EmailOptions {
  to: string
  subject: string
  html: string
}

async function sendEmail(opts: EmailOptions): Promise<void> {
  if (config.isDev) {
    console.log('\n[DEV EMAIL]')
    console.log(`  To: ${opts.to}`)
    console.log(`  Subject: ${opts.subject}`)
    console.log(`  Body: ${opts.html.replace(/<[^>]+>/g, '')}`)
    console.log('')
    return
  }

  const { Resend } = await import('resend')
  const resend = new Resend(config.resendApiKey)
  await resend.emails.send({
    from: 'HackSuite <noreply@hacksuite.app>',
    to: opts.to,
    subject: opts.subject,
    html: opts.html,
  })
}

export async function sendWelcomeEmail(to: string, orgName: string): Promise<void> {
  await sendEmail({
    to,
    subject: `Welcome to HackSuite — ${orgName} is ready`,
    html: `
      <h1>Welcome to HackSuite!</h1>
      <p>Your organization <strong>${orgName}</strong> has been created.</p>
      <p>Start building your hackathon at <a href="${config.appUrl}">${config.appUrl}</a>.</p>
    `,
  })
}

export async function sendInviteEmail(
  to: string,
  orgName: string,
  role: string,
  acceptUrl: string
): Promise<void> {
  await sendEmail({
    to,
    subject: `You've been invited to join ${orgName} on HackSuite`,
    html: `
      <h1>You're invited!</h1>
      <p>You've been invited to join <strong>${orgName}</strong> as a <strong>${role}</strong>.</p>
      <p><a href="${acceptUrl}">Accept Invitation</a></p>
      <p>This link expires in 72 hours.</p>
    `,
  })
}

export async function sendConfirmationEmail(to: string, eventName: string): Promise<void> {
  await sendEmail({
    to,
    subject: `Application received — ${eventName}`,
    html: `
      <h1>Application Received!</h1>
      <p>We received your application for <strong>${eventName}</strong>.</p>
      <p>We'll be in touch soon with updates on your application status.</p>
    `,
  })
}

export async function sendAcceptanceEmail(
  to: string,
  eventName: string,
  qrCode: string
): Promise<void> {
  await sendEmail({
    to,
    subject: `You're accepted to ${eventName}!`,
    html: `
      <h1>You're in!</h1>
      <p>Congratulations! You've been accepted to <strong>${eventName}</strong>.</p>
      <p>Your check-in QR code: <strong><code>${qrCode}</code></strong></p>
      <p>Please bring this code on event day for check-in.</p>
    `,
  })
}

export async function sendWaitlistEmail(
  to: string,
  eventName: string,
  position: number
): Promise<void> {
  await sendEmail({
    to,
    subject: `You're on the waitlist for ${eventName}`,
    html: `
      <h1>You're on the Waitlist</h1>
      <p>You're on the waitlist for <strong>${eventName}</strong> at position <strong>${position}</strong>.</p>
      <p>We'll notify you if a spot opens up.</p>
    `,
  })
}
