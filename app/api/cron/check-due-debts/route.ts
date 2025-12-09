
import { type NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { sendSMS } from "@/lib/sms"

export async function GET(request: NextRequest) {
    try {
        console.log("[CRON] Checking for due debts...")

        const timeZone = 'America/Lima'
        const todayLima = new Date().toLocaleDateString('en-CA', { timeZone }) // "YYYY-MM-DD"

        console.log(`[CRON] Server Time: ${new Date().toISOString()}`)
        console.log(`[CRON] Lima Date: ${todayLima}`)

        // Create range for that specific calendar day in UTC
        // This assumes the DB stores the 'correct' calendar date (e.g. 2025-12-09T12:00:00Z)
        const startOfDay = new Date(`${todayLima}T00:00:00.000Z`)
        const endOfDay = new Date(`${todayLima}T23:59:59.999Z`)

        const dueInstallments = await prisma.installment.findMany({
            where: {
                dueDate: {
                    gte: startOfDay,
                    lte: endOfDay
                },
                isPaid: false,
                loan: {
                    isActive: true,
                    user: {
                        notificationsEnabled: true,
                        phoneNumber: { not: null }
                    }
                }
            },
            include: {
                loan: {
                    include: {
                        user: true
                    }
                }
            }
        })

        console.log(`[CRON] Found ${dueInstallments.length} installments due today.`)

        const notificationsSent = []

        for (const installment of dueInstallments) {
            const user = installment.loan.user
            if (user.phoneNumber) {
                const message = `Hoy tienes que pagar ${installment.loan.bankName} S/ ${installment.amount}`
                const result = await sendSMS(user.phoneNumber, message)
                console.log(`[SMS] Result for ${user.username}:`, result)

                notificationsSent.push({
                    user: user.username,
                    phone: user.phoneNumber,
                    message: message,
                    status: result.success ? "SENT" : "FAILED",
                    error: result.error
                })
            }
        }

        return NextResponse.json({
            success: true,
            processed: dueInstallments.length,
            notifications: notificationsSent
        })

    } catch (error) {
        console.error("[CRON] Error:", error)
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
    }
}
