
"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { CheckCircle2, AlertCircle } from "lucide-react"

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

const COUNTRY_CODES = [
    { code: "+51", country: "Perú 🇵🇪" },
    { code: "+1", country: "USA 🇺🇸" },
    { code: "+52", country: "México 🇲🇽" },
    { code: "+57", country: "Colombia 🇨🇴" },
    { code: "+56", country: "Chile 🇨🇱" },
    { code: "+54", country: "Argentina 🇦🇷" },
    { code: "+34", country: "España 🇪🇸" },
]

export function NotificationSettingsDialog({ open, onOpenChange, user, onUpdateSuccess }: NotificationSettingsDialogProps) {
    const [phoneNumber, setPhoneNumber] = useState("")
    const [countryCode, setCountryCode] = useState("+51")
    const [enabled, setEnabled] = useState(false)
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState("")
    const [success, setSuccess] = useState("")

    useEffect(() => {
        if (user) {
            setEnabled(user.notificationsEnabled || false)

            if (user.phoneNumber) {
                // Intentar detectar el código de país
                const foundCode = COUNTRY_CODES.find(c => user.phoneNumber?.startsWith(c.code))
                if (foundCode) {
                    setCountryCode(foundCode.code)
                    setPhoneNumber(user.phoneNumber.replace(foundCode.code, ""))
                } else {
                    // Si no coincide, dejarlo como está o asumir por defecto (aquí dejamos el raw si no tiene match)
                    setPhoneNumber(user.phoneNumber)
                }
            } else {
                setPhoneNumber("")
                setCountryCode("+51")
            }
        }
    }, [user])

    const handleSubmit = async () => {
        setIsLoading(true)
        setError("")
        setSuccess("")

        try {
            // Combinar código y número
            const fullPhoneNumber = `${countryCode}${phoneNumber}`

            const response = await fetch("/api/auth/profile", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    id: user?.id,
                    phoneNumber: fullPhoneNumber,
                    notificationsEnabled: enabled
                }),
            })

            const data = await response.json()

            if (!response.ok) {
                throw new Error(data.error || "Error al actualizar perfil")
            }

            setSuccess("Preferencias actualizadas")
            setTimeout(() => {
                setSuccess("")
                onUpdateSuccess(data)
                onOpenChange(false)
            }, 1500)
        } catch (err: any) {
            setError(err.message)
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Configurar Notificaciones</DialogTitle>
                    <DialogDescription>
                        Recibe alertas por SMS cuando tus cuotas estén por vencer.
                    </DialogDescription>
                </DialogHeader>

                <div className="grid gap-4 py-4">
                    <div className="flex items-center space-x-2">
                        <Switch id="notifications" checked={enabled} onCheckedChange={setEnabled} />
                        <Label htmlFor="notifications">Activar notificaciones</Label>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="phone">Número de Celular</Label>
                        <div className="flex gap-2">
                            <Select value={countryCode} onValueChange={setCountryCode} disabled={!enabled}>
                                <SelectTrigger className="w-[110px]">
                                    <SelectValue placeholder="País" />
                                </SelectTrigger>
                                <SelectContent>
                                    {COUNTRY_CODES.map((c) => (
                                        <SelectItem key={c.code} value={c.code}>
                                            {c.code} {c.country.split(" ")[1]}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <Input
                                id="phone"
                                placeholder="999 999 999"
                                value={phoneNumber}
                                onChange={(e) => setPhoneNumber(e.target.value)}
                                disabled={!enabled}
                                className="flex-1"
                            />
                        </div>
                        <p className="text-xs text-muted-foreground">
                            Selecciona tu código de país e ingresa tu número.
                        </p>
                    </div>
                </div>

                {error && (
                    <Alert variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>{error}</AlertDescription>
                    </Alert>
                )}

                {success && (
                    <Alert className="bg-green-50 text-green-900 border-green-200">
                        <CheckCircle2 className="h-4 w-4" />
                        <AlertDescription>{success}</AlertDescription>
                    </Alert>
                )}

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
                        Cancelar
                    </Button>
                    <Button onClick={handleSubmit} disabled={isLoading}>
                        {isLoading ? "Guardando..." : "Guardar Cambios"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
