
import { prisma } from "./prisma"
import bcrypt from 'bcryptjs'

export interface User {
  id: number
  username: string
  email: string
  phoneNumber?: string | null
  notificationsEnabled: boolean
}

export async function validateUser(username: string, password: string): Promise<User | null> {
  try {
    const user = await prisma.user.findUnique({
      where: { username }
    })

    if (!user) {
      return null
    }

    const isValidPassword = await bcrypt.compare(password, user.password)

    if (!isValidPassword) {
      // Incrementar contador de intentos fallidos
      const newAttempts = user.failedLoginAttempts + 1

      await prisma.user.update({
        where: { id: user.id },
        data: { failedLoginAttempts: newAttempts }
      })

      const remainingAttempts = 3 - newAttempts
      console.log(`[SECURITY] Intento fallido de login para: ${username}, intentos restantes: ${remainingAttempts}`)
      throw new Error(`Contraseña incorrecta. Te quedan ${remainingAttempts} intentos.`)
    }

    // Resetear contador de intentos fallidos en login exitoso
    if (user.failedLoginAttempts > 0) {
      await prisma.user.update({
        where: { id: user.id },
        data: { failedLoginAttempts: 0, loginBlockedUntil: null }
      })
    }

    return {
      id: user.id,
      username: user.username,
      email: user.email,
      phoneNumber: user.phoneNumber,
      notificationsEnabled: user.notificationsEnabled,
    }
  } catch (error) {
    console.error("Error validating user:", error)
    throw error
  }
}
