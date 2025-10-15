import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get("userId")

    if (!userId) {
      return NextResponse.json({ error: "userId es requerido" }, { status: 400 })
    }

    const loans = await sql`
      SELECT 
        l.*,
        (
          SELECT json_agg(i.*)
          FROM (
            SELECT * FROM installments 
            WHERE loan_id = l.id AND is_paid = false 
            ORDER BY due_date ASC 
            LIMIT 1
          ) i
        ) as installments
      FROM loans l
      WHERE l.user_id = ${Number.parseInt(userId)} AND l.is_active = true
      ORDER BY l.due_day ASC
    `

    console.log("[v0] Préstamos encontrados:", loans.length)

    return NextResponse.json({ loans })
  } catch (error) {
    console.error("Error fetching loans:", error)
    return NextResponse.json({ error: "Error al obtener préstamos" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      userId,
      bankName,
      loanType,
      totalAmount,
      installmentAmount,
      numberOfInstallments,
      dueDay,
      startDate,
      endDate,
    } = body

    if (
      !userId ||
      !bankName ||
      !loanType ||
      !totalAmount ||
      !installmentAmount ||
      !numberOfInstallments ||
      !dueDay ||
      !startDate ||
      !endDate
    ) {
      return NextResponse.json({ error: "Todos los campos son requeridos" }, { status: 400 })
    }

    const start = new Date(startDate)
    const end = new Date(endDate)

    if (end <= start) {
      return NextResponse.json(
        { error: "La fecha de finalización debe ser posterior a la fecha de inicio" },
        { status: 400 },
      )
    }

    console.log("[v0] Creando préstamo con", numberOfInstallments, "cuotas")

    // Crear el préstamo
    const loanResult = await sql`
      INSERT INTO loans (user_id, bank_name, loan_type, total_amount, monthly_payment, due_day, start_date, end_date, is_active)
      VALUES (${Number.parseInt(userId)}, ${bankName}, ${loanType}, ${totalAmount}, ${installmentAmount}, ${dueDay}, ${startDate}, ${endDate}, true)
      RETURNING *
    `

    const loan = loanResult[0]
    console.log("[v0] Préstamo creado con ID:", loan.id)

    // Crear cuotas basadas en el día de pago especificado
    let cuotasCreadas = 0
    const currentDate = new Date(start.getFullYear(), start.getMonth(), dueDay)

    // Si el día de pago ya pasó en el mes de inicio, empezar en el siguiente mes
    if (currentDate < start) {
      currentDate.setMonth(currentDate.getMonth() + 1)
    }

    for (let i = 1; i <= numberOfInstallments; i++) {
      // Verificar que no exceda la fecha de fin
      if (currentDate > end) {
        console.log("[v0] Fecha excede el fin del préstamo, deteniendo en cuota", i)
        break
      }

      const dueDateStr = currentDate.toISOString().split("T")[0]

      await sql`
        INSERT INTO installments (loan_id, installment_number, due_date, amount, is_paid)
        VALUES (${loan.id}, ${i}, ${dueDateStr}, ${installmentAmount}, false)
      `

      console.log("[v0] Cuota", i, "creada para:", dueDateStr, "día de pago:", dueDay)
      cuotasCreadas++

      // Avanzar al siguiente mes, manteniendo el mismo día
      currentDate.setMonth(currentDate.getMonth() + 1)
    }

    console.log("[v0] Total de cuotas creadas:", cuotasCreadas)

    // Obtener el préstamo con sus cuotas
    const loanWithInstallments = await sql`
      SELECT 
        l.*,
        (
          SELECT json_agg(i.* ORDER BY i.installment_number)
          FROM installments i
          WHERE i.loan_id = l.id
        ) as installments
      FROM loans l
      WHERE l.id = ${loan.id}
    `

    return NextResponse.json({ loan: loanWithInstallments[0] })
  } catch (error) {
    console.error("Error creating loan:", error)
    return NextResponse.json({ error: "Error al crear préstamo" }, { status: 500 })
  }
}
