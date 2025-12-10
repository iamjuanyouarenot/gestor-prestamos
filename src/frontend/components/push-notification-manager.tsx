'use client'

import { useState, useEffect } from 'react'
import { Switch } from '@/frontend/components/ui/switch'
import { Label } from '@/frontend/components/ui/label'
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

                            // SYNC: Ensure backend knows about this subscription for CURRENT user
                            // This fixes the issue where browser has sub but DB doesn't (different user or lost sync)
                            fetch('/api/notifications/subscribe', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                    subscription: sub,
                                    userId: userId
                                })
                            }).catch(e => console.error("Sync sub error:", e))
                        }
                    })
                })
                .catch(err => {
                    console.error('Service Worker registration failed:', err)
                })
        }
    }, [userId]) // Depend on userId to resync if user changes

    const subscribeToPush = async () => {
        setIsLoading(true)
        if (!registration) {
            toast.error('Error: Service Worker no registrado. Recarga la página.')
            setIsLoading(false)
            return
        }

        try {
            // FORCE hardcoded key to rule out Vercel Env Var issues
            let vapidKey = 'BFjA6kYo1Tvdcv2OjW3fUyjiA5s_uuZQJPtS1qPHbuJyzDrjylFM836LVHEKf1RXezn-Jfyicv90YFn4fmVzKms'

            // Clean the key just in case (remove quotes, whitespace)
            vapidKey = vapidKey.replace(/['"\s]/g, '')

            const convertedKey = urlBase64ToUint8Array(vapidKey)

            console.log('[DEBUG] Vapid Key Length:', convertedKey.length) // Should be 65 for P-256

            if (convertedKey.length !== 65) {
                console.error('[CRITICAL] VAPID Key length is incorrect!', convertedKey.length)
                throw new Error('Clave VAPID inválida (longitud incorrecta)')
            }

            // CRITICAL FIX: Unsubscribe existing ghost subscriptions first
            const existingSub = await registration.pushManager.getSubscription()
            if (existingSub) {
                console.log('[DEBUG] Unsubscribing existing subscription/ghost...')
                await existingSub.unsubscribe()
            }

            console.log('[DEBUG] Attempting subscribe...')
            const sub = await registration.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: convertedKey
            })
            console.log('[DEBUG] Subscribe success:', sub)

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
            } else if (error.message.includes('Registration failed')) {
                // Specific hint for Brave/Chrome issues
                toast.error('Error del navegador. Si usas Brave, habilita "Google Services for Push Messaging" en configuración.')
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

            {isSubscribed && (
                <button
                    onClick={async () => {
                        toast.promise(
                            fetch('/api/notifications/test', {
                                method: 'POST',
                                body: JSON.stringify({ userId }),
                            }).then(async r => {
                                if (!r.ok) {
                                    const text = await r.text()
                                    try {
                                        const json = JSON.parse(text)
                                        throw new Error(json.message || json.error || text)
                                    } catch (e: any) {
                                        throw new Error(text || e.message)
                                    }
                                }
                                return r.json()
                            }),
                            {
                                loading: 'Enviando prueba...',
                                success: '¡Enviada! Revisa tu barra de estado.',
                                error: (err) => `Error: ${err.message}`
                            }
                        )
                    }}
                    className="ml-4 text-xs bg-indigo-100 text-indigo-700 px-2 py-1 rounded border border-indigo-200 hover:bg-indigo-200"
                >
                    Probar
                </button>
            )}
        </div>
    )
}
