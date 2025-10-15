import { sql } from "./db"
import bcrypt from 'bcryptjs'

export interface User {
  id: number
  username: string
  email: string
}

export async function validateUser(username: string, password: string): Promise<User | null> {
  try {
    const result = await sql`
      SELECT id, username, password, email
      FROM users
      WHERE username = ${username}
      LIMIT 1
    `

    if (result.length === 0) {
      return null
    }

    const user = result[0]
    const isValidPassword = await bcrypt.compare(password, user.password)

    if (!isValidPassword) {
      return null
    }

    return {
      id: user.id,
      username: user.username,
      email: user.email,
    }
  } catch (error) {
    console.error("Error validating user:", error)
    return null
  }
}
