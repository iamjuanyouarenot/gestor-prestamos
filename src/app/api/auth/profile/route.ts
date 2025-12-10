import { NextResponse } from "next/server"
import { prisma } from "@/backend/lib/prisma"
import { sendNotificationToUser } from "@/backend/lib/web-push"

export const dynamic = 'force-dynamic'

export async function PUT(request: Request) {
    try {
        const body = await request.json()
        const { id, phoneNumber, notificationsEnabled } = body

        if (!id) {
            return NextResponse.json({ error: "ID de usuario requerido" }, { status: 400 })
        }

        // Formatear número de teléfono (agregar +51 si es necesario)
        let formattedPhoneNumber = phoneNumber
        if (phoneNumber && phoneNumber.length === 9 && !phoneNumber.startsWith("+")) {
            formattedPhoneNumber = `+51${phoneNumber}`
        }

        const updateData: any = {
            phoneNumber: formattedPhoneNumber
        }

        // Only update notificationsEnabled if strictly provided (true/false), avoid undefined -> false
        if (notificationsEnabled !== undefined && notificationsEnabled !== null) {
            updateData.notificationsEnabled = Boolean(notificationsEnabled)
        }

        const updatedUser = await prisma.user.update({
            where: { id: Number(id) },
            data: updateData,
        })

        if (Boolean(notificationsEnabled)) {
            // Send welcome notification to all devices
            await sendNotificationToUser(Number(id), {
                title: 'Gestor de Prestamos',
                body: 'Tus notificaciones están activas en todos tus dispositivos.'
            })
        }

        // Exclude password from response
        const { password: _, ...userWithoutPassword } = updatedUser

        return NextResponse.json(userWithoutPassword)
    } catch (error) {
        console.error("Error updating profile:", error)
        return NextResponse.json({ error: "Error al actualizar perfil" }, { status: 500 })
    }
}

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url)
        const id = searchParams.get("id")

        if (!id) {
            return NextResponse.json({ error: "ID de usuario requerido" }, { status: 400 })
        }

        const user = await prisma.user.findUnique({
            where: { id: Number(id) },
        })

        if (!user) {
            return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 })
        }

        const { password: _, ...userWithoutPassword } = user

        return NextResponse.json(userWithoutPassword)
    } catch (error) {
        console.error("Error fetching profile:", error)
        return NextResponse.json({ error: "Error al obtener perfil" }, { status: 500 })
    }
}
