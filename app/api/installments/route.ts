
import { type NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get("userId")
    const month = searchParams.get("month")
    const year = searchParams.get("year")

    if (!userId) {
      return NextResponse.json({ error: "userId es requerido" }, { status: 400 })
    }

    let whereClause: any = {
      loan: {
        userId: Number(userId),
        isActive: true
      }
    }

    if (month && year) {
      const monthNum = Number.parseInt(month)
      const yearNum = Number.parseInt(year)
      // Correctly handle last day of month. 
      // JS Month is 0-indexed for Date constructor but 1-based in common usage? 
      // searchParams month usually (1-12).
      // new Date(year, month, 0) gives last day of prev month in JS if month is 1-based index? 
      // No, new Date(2023, 1, 0) -> Jan 31? Yes.
      // If query month is 1 (Jan), we want Jan 1 to Jan 31.
      // JS Date month is 0-11.

      // Assuming frontend sends 1-12.
      const startDate = new Date(yearNum, monthNum - 1, 1) // 00:00:00
      const endDate = new Date(yearNum, monthNum, 0, 23, 59, 59) // Last day of month

      whereClause = {
        ...whereClause,
        dueDate: {
          gte: startDate,
          lte: endDate
        }
      }
    }

    const installments = await prisma.installment.findMany({
      where: whereClause,
      include: {
        loan: {
          select: {
            id: true,
            bankName: true,
            loanType: true,
            loanCode: true,
            monthlyPayment: true,
            totalAmount: true
          }
        }
      },
      orderBy: [
        { dueDate: 'asc' },
        { loan: { bankName: 'asc' } }
      ]
    })

    // Map to include 'status' calculated field for frontend
    const mappedInstallments = installments.map(i => {
      let status = 'Pendiente'
      if (i.isPaid) status = 'Pagado'
      else if (new Date(i.dueDate) < new Date() && !i.isPaid) status = 'Vencido'

      return {
        ...i,
        status,
        loan: i.loan
      }
    })

    console.log("[v0] Cuotas encontradas:", installments.length)

    return NextResponse.json({ installments: mappedInstallments })
  } catch (error) {
    console.error("Error fetching installments:", error)
    return NextResponse.json({ error: "Error al obtener cuotas" }, { status: 500 })
  }
}
