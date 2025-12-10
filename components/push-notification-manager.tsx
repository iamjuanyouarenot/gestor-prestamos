'use client'

import { useState, useEffect } from 'react'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'

// Helper to convert keys because specific browsers require Uint8Array
function urlBase64ToUint8Array(base64String: string) {
    const padding = '='.repeat((4 - base64String.length % 4) % 4)
    const base64 = (base64String + padding)
        .replace(/\-/g, '+')
        .replace(/_/g, '/')

    const rawData = window.atob(base64)
    const outputArray = new Uint8Array(rawData.length)

    for (let i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i)
    }
    return outputArray
}

export function PushNotificationManager({ userId }: { userId: number }) {
    const [isSubscribed, setIsSubscribed] = useState(false)
    const [subscription, setSubscription] = useState<PushSubscription | null>(null)
    const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(null)
    const [isLoading, setIsLoading] = useState(false)

    useEffect(() => {
        if ('serviceWorker' in navigator && 'PushManager' in window) {
            navigator.serviceWorker.register('/sw.js')
                .then(reg => {
                    setRegistration(reg)
                    reg.pushManager.getSubscription().then(sub => {
                        if (sub) {
                            setSubscription(sub)
                            setIsSubscribed(true)
                        }
                    })
                })
                .catch(err => {
                    console.error('Service Worker registration failed:', err)
                })
        }
    }, [])

    const subscribeToPush = async () => {
        setIsLoading(true)
        if (!registration) {
            toast.error('Error: Service Worker no registrado. Recarga la página.')
            setIsLoading(false)
            return
        }

        try {
            // Use env var or fallback to the new key
            let vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || 'BFjA6kYo1Tvdcv2OjW3fUyjiA5s_uuZQJPtS1qPHbuJyzDrjylFM836LVHEKf1RXezn-Jfyicv90YFn4fmVzKms'

            // Clean the key just in case (remove quotes, whitespace)
            vapidKey = vapidKey.replace(/['"\s]/g, '')

            console.log('[DEBUG] Vapid Key being used (first 10 chars):', vapidKey.substring(0, 10))
            const convertedKey = urlBase64ToUint8Array(vapidKey)

            const sub = await registration.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: convertedKey
            })

            setSubscription(sub)
            setIsSubscribed(true)

            await fetch('/api/notifications/subscribe', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    subscription: sub,
                    userId: userId
                })
            })

            toast.success('Notificaciones activadas correctamente')
        } catch (error: any) {
            console.error('Error subscribing to push:', error)

            if (error.name === 'NotAllowedError') {
                toast.error('Permiso denegado. Habilita notificaciones en tu navegador.')
            } else {
                toast.error(`Error al activar: ${error.message || 'Desconocido'}`)
            }
        } finally {
            setIsLoading(false)
        }
    }

    const unsubscribeFromPush = async () => {
        if (!subscription) return

        setIsLoading(true)
        try {
            await subscription.unsubscribe()
            setSubscription(null)
            setIsSubscribed(false)
            toast.info('Notificaciones desactivadas')
        } catch (error) {
            console.error('Error unsubscribing:', error)
            toast.error('Error al desactivar notificaciones')
        } finally {
            setIsLoading(false)
        }
    }

    const handleToggle = (checked: boolean) => {
        if (checked) {
            subscribeToPush()
        } else {
            unsubscribeFromPush()
        }
    }

    return (
        <div className="flex items-center space-x-2">
            <Switch
                id="push-notifications"
                checked={isSubscribed}
                onCheckedChange={handleToggle}
                disabled={isLoading}
            />
            <Label htmlFor="push-notifications" className={isLoading ? 'opacity-50' : ''}>
                {isLoading
                    ? 'Procesando...'
                    : (isSubscribed ? 'Notificaciones activadas' : 'Activar notificaciones')
                }
            </Label>
        </div>
    )
}
