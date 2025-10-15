import nodemailer from 'nodemailer'

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_APP_PASSWORD
  }
})

export async function sendPasswordResetCode(email: string, code: string) {
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: email,
    subject: 'Código de verificación para cambio de contraseña',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Código de Verificación</h2>
        <p>Has solicitado cambiar tu contraseña. Tu código de verificación es:</p>
        <div style="background-color: #f4f4f4; padding: 20px; text-align: center; margin: 20px 0;">
          <h1 style="color: #007bff; font-size: 32px; margin: 0;">${code}</h1>
        </div>
        <p>Este código expirará en 5 minutos.</p>
        <p>Si no solicitaste este cambio, ignora este mensaje.</p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
        <p style="color: #666; font-size: 12px;">Loan Tracker App</p>
      </div>
    `
  }

  await transporter.sendMail(mailOptions)
}
