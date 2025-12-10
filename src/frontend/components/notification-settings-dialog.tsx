
"use client"

import { Button } from "@/frontend/components/ui/button"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/frontend/components/ui/dialog"
import { PushNotificationManager } from "@/frontend/components/push-notification-manager"

interface User {
    id: number
    username: string
    email: string
    phoneNumber?: string | null
    notificationsEnabled: boolean
}

interface NotificationSettingsDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    user: User | null
    onUpdateSuccess: (updatedUser: User) => void
}

export function NotificationSettingsDialog({ open, onOpenChange, user }: NotificationSettingsDialogProps) {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Configurar Notificaciones</DialogTitle>
                    <DialogDescription>
                        Recibe alertas en tu dispositivo cuando tus cuotas estén por vencer.
                    </DialogDescription>
                </DialogHeader>

                <div className="grid gap-4 py-4">
                    <div className="space-y-4">
                        <div className="border p-4 rounded-md bg-muted/20">
                            <h4 className="text-sm font-medium mb-2">Notificaciones Push</h4>
                            <p className="text-xs text-muted-foreground mb-4">
                                Activa las notificaciones en este dispositivo para recibir alertas de pago.
                            </p>
                            {user && <PushNotificationManager userId={user.id} />}
                        </div>
                    </div>
                </div>

                <DialogFooter>
                    <Button onClick={() => onOpenChange(false)}>
                        Cerrar
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
