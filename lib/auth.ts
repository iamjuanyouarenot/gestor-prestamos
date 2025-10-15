import { sql } from "./db"

export interface User {
  id: number
  username: string
}

export async function validateUser(username: string, password: string): Promise<User | null> {
  try {
    const result = await sql`
      SELECT id, username 
      FROM users 
      WHERE username = ${username} AND password = ${password}
      LIMIT 1
    `

    if (result.length === 0) {
      return null
    }

    return {
      id: result[0].id,
      username: result[0].username,
    }
  } catch (error) {
    console.error("Error validating user:", error)
    return null
  }
}
