
import { type NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { sendSMS } from "@/lib/sms"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get("userId")

    if (!userId) {
      return NextResponse.json({ error: "userId es requerido" }, { status: 400 })
    }

    const loans = await prisma.loan.findMany({
      where: {
        userId: Number(userId),
        isActive: true
      },
      include: {
        installments: {
          where: { isPaid: false },
          orderBy: { dueDate: 'asc' },
          take: 1
        }
      },
      orderBy: { paymentType: 'asc' }
    })

    const loansWithDetails = loans.map(loan => {
      let daysUntilDue = null
      let nextDueDate = null
      let isOverdue = false

      // Get "Today" in Peru Timezone (YYYY-MM-DD)
      const peruDateStr = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Lima' })
      const todayPeru = new Date(peruDateStr) // This creates a Date at 00:00:00 UTC for that date string

      const nextInstallment = loan.installments[0] // We took 1 ordered by asc

      if (nextInstallment) {
        // Parse installment due date safely
        const dueDate = new Date(nextInstallment.dueDate)
        const dueDateStr = dueDate.toISOString().split('T')[0]
        const duePeru = new Date(dueDateStr) // Normalize to YYYY-MM-DD treated as UTC midnight

        // Calculate difference in milliseconds
        const diffTime = duePeru.getTime() - todayPeru.getTime()
        // Convert to days
        daysUntilDue = Math.round(diffTime / (1000 * 60 * 60 * 24))

        nextDueDate = nextInstallment.dueDate
        isOverdue = daysUntilDue < 0
      }

      return {
        ...loan,
        daysUntilDue,
        nextDueDate,
        isOverdue
      }
    })

    console.log("[v0] Préstamos procesados con Timezone Lima:", loansWithDetails.length)

    return NextResponse.json({ loans: loansWithDetails })
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
      loanCode,
      bankName,
      loanType,
      totalAmount,
      installmentAmount,
      numberOfInstallments,
      paymentType,
      interestRate,
      startDate,
      endDate,
      paidInstallments, // Array of numbers [1, 2, ...]
    } = body

    if (
      !userId ||
      !bankName ||
      !loanType ||
      !totalAmount ||
      !installmentAmount ||
      !numberOfInstallments ||
      !paymentType ||
      !startDate ||
      !endDate
    ) {
      return NextResponse.json({ error: "Todos los campos son requeridos" }, { status: 400 })
    }

    const start = new Date(`${startDate}T12:00:00`)
    const end = new Date(`${endDate}T12:00:00`)

    if (end <= start) {
      return NextResponse.json(
        { error: "La fecha de finalización debe ser posterior a la fecha de inicio" },
        { status: 400 },
      )
    }

    console.log("[v0] Creando préstamo con", numberOfInstallments, "cuotas")

    const finalTotalAmount = Number(installmentAmount) * Number(numberOfInstallments)

    // Crear el préstamo y cuotas en transacción
    const loan = await prisma.$transaction(async (tx) => {
      const newLoan = await tx.loan.create({
        data: {
          userId: Number(userId),
          loanCode,
          bankName,
          loanType,
          totalAmount: Number(totalAmount),
          finalTotalAmount: Number(finalTotalAmount),
          monthlyPayment: Number(installmentAmount),
          paymentType,
          interestRate: Number(interestRate),
          startDate: new Date(startDate),
          endDate: new Date(endDate),
          isActive: true
        }
      })

      // Crear cuotas
      // Usar fecha base con hora fija al mediodía para evitar saltos de zona horaria
      let currentDate = new Date(start)

      for (let i = 1; i <= numberOfInstallments; i++) {
        if (currentDate > end) break

        let dueDate: Date

        if (paymentType.includes("Plazo fijo")) {
          const match = paymentType.match(/día (\d+)/);
          const dueDay = match ? parseInt(match[1]) : 15;
          // Set year/month/day but KEEP hour at 12:00:00
          dueDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), dueDay, 12, 0, 0);
          if (dueDate < currentDate) {
            dueDate.setMonth(dueDate.getMonth() + 1);
          }
          // Update currentDate for next iteration
          currentDate = new Date(dueDate);
          currentDate.setMonth(currentDate.getMonth() + 1);
        } else if (paymentType.includes("Plazo de acuerdo a días")) {
          const match = paymentType.match(/cada (\d+) días/);
          const daysInterval = match ? parseInt(match[1]) : 30;
          dueDate = new Date(currentDate);
          currentDate.setDate(currentDate.getDate() + daysInterval);
        } else if (paymentType === "Fin de mes") {
          // Last day of next month, at 12:00:00
          dueDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0, 12, 0, 0);
          currentDate.setMonth(currentDate.getMonth() + 1);
        } else {
          // Default: exactly 1 month later
          dueDate = new Date(currentDate);
          currentDate.setMonth(currentDate.getMonth() + 1);
        }

        await tx.installment.create({
          data: {
            loanId: newLoan.id,
            installmentNumber: i,
            dueDate: dueDate,
            amount: Number(installmentAmount),
            isPaid: Array.isArray(paidInstallments) && paidInstallments.includes(i)
          }
        })
      }

      return newLoan
    })

    console.log("[v0] Préstamo creado con ID:", loan.id)

    const loanWithInstallments = await prisma.loan.findUnique({
      where: { id: loan.id },
      include: {
        user: true,
        installments: {
          orderBy: { installmentNumber: 'asc' }
        }
      }
    })

    // Verificar si hay cuota hoy y enviar SMS inmediato
    if (loanWithInstallments && loanWithInstallments.user) {
      const user = loanWithInstallments.user
      console.log(`[New Loan Debug] User: ${user.username}, Phone: ${user.phoneNumber}, Notifs: ${user.notificationsEnabled}`)

      if (user.notificationsEnabled && user.phoneNumber) {
        // Use Start/End of day comparison instead of string equality to avoid timezone mismatch
        const todayStart = new Date()
        todayStart.setHours(0, 0, 0, 0)
        const todayEnd = new Date()
        todayEnd.setHours(23, 59, 59, 999)

        console.log(`[New Loan Debug] Checking range: ${todayStart.toISOString()} - ${todayEnd.toISOString()}`)

        const dueToday = loanWithInstallments.installments.find(inst => {
          const d = new Date(inst.dueDate)
          // Also set d to local midnight comparison or simply compare timestamps
          // Ideally d should fall between start and end.
          return d >= todayStart && d <= todayEnd
        })

        if (dueToday) {
          const message = `Hoy tienes que pagar ${loanWithInstallments.bankName} S/ ${dueToday.amount}`
          console.log(`[New Loan SMS] Sending immediate alert to ${user.username}`)
          try {
            await sendSMS(user.phoneNumber, message)
            console.log("[New Loan SMS] Sent successfully")
          } catch (err) {
            console.error("[New Loan SMS] Failed:", err)
          }
        } else {
          console.log("[New Loan Debug] No installment found due today.")
        }
      } else {
        console.log("[New Loan Debug] Notifications disabled or no phone number.")
      }
    }

    return NextResponse.json({ loan: loanWithInstallments })
  } catch (error) {
    console.error("Error creating loan:", error)
    return NextResponse.json({ error: "Error al crear préstamo" }, { status: 500 })
  }
}
