import { NextResponse } from 'next/server'
import { prisma } from '@/backend/lib/prisma'

export async function POST(request: Request) {
    try {
        const { subscription, userId } = await request.json()

        if (!subscription || !userId) {
            return NextResponse.json({ error: 'Subscription and User ID required' }, { status: 400 })
        }

        // Check if subscription already exists for this user
        const existing = await prisma.pushSubscription.findFirst({
            where: {
                userId: Number(userId),
                endpoint: subscription.endpoint
            }
        })

        if (existing) {
            // Even if existing, ensure the user has notifications enabled
            await prisma.user.update({
                where: { id: Number(userId) },
                data: { notificationsEnabled: true }
            })
            return NextResponse.json({ message: 'Subscription already exists' })
        }

        await prisma.pushSubscription.create({
            data: {
                userId: Number(userId),
                endpoint: subscription.endpoint,
                p256dh: subscription.keys.p256dh,
                auth: subscription.keys.auth
            }
        })

        // Automatically enable notifications for the user
        await prisma.user.update({
            where: { id: Number(userId) },
            data: { notificationsEnabled: true }
        })

        return NextResponse.json({ message: 'Subscription saved and notifications enabled' })
    } catch (error) {
        console.error('Error saving subscription:', error)
        return NextResponse.json({ error: 'Error saving subscription' }, { status: 500 })
    }
}
