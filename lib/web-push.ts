import webpush from 'web-push'
import { prisma } from "@/lib/prisma"

// Configurar VAPID keys
// En producción deben venir de variables de entorno
const publicVapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || 'BFjA6kYo1Tvdcv2OjW3fUyjiA5s_uuZQJPtS1qPHbuJyzDrjylFM836LVHEKf1RXezn-Jfyicv90YFn4fmVzKms'
const privateVapidKey = process.env.VAPID_PRIVATE_KEY || 'lrdmCrAFGzNr3woVv3K9-Nr6oLOt7N3DBJFzCzhCQLI'

function initWebPush() {
    webpush.setVapidDetails(
        'mailto:tu@email.com',
        publicVapidKey,
        privateVapidKey
    )
}

interface PushPayload {
    title: string
    body: string
    url?: string
}

export async function sendNotificationToUser(userId: number, payload: PushPayload) {
    initWebPush()
    const subscriptions = await prisma.pushSubscription.findMany({
        where: { userId }
    })

    if (subscriptions.length === 0) {
        console.log(`[Push] No subscriptions found for user ${userId}`)
        return { success: false, count: 0 }
    }

    let sentCount = 0
    const errors = []

    for (const sub of subscriptions) {
        try {
            const pushSubscription = {
                endpoint: sub.endpoint,
                keys: {
                    p256dh: sub.p256dh,
                    auth: sub.auth
                }
            }

            await webpush.sendNotification(pushSubscription, JSON.stringify(payload))
            sentCount++
        } catch (error: any) {
            console.error(`[Push] Error sending to subscription ${sub.id}:`, error)
            errors.push(error)

            // Si la suscripción ya no es válida (410 Gone o 404 Not Found), borrarla
            if (error.statusCode === 410 || error.statusCode === 404) {
                console.log(`[Push] Removing invalid subscription ${sub.id}`)
                await prisma.pushSubscription.delete({
                    where: { id: sub.id }
                })
            }
        }
    }

    console.log(`[Push] Sent ${sentCount}/${subscriptions.length} notifications to user ${userId}`)
    return { success: sentCount > 0, count: sentCount, total: subscriptions.length, errors }
}

export async function sendPushNotification(subscription: any, payload: PushPayload) {
    initWebPush()
    // Legacy support or direct sending if needed
    return webpush.sendNotification(subscription, JSON.stringify(payload))
}
