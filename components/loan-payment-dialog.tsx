
"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { CheckCircle2, AlertCircle, Copy } from "lucide-react"

interface Installment {
    id: number
    installmentNumber: number
    dueDate: string | Date
    amount: number
    isPaid: boolean
}

interface Loan {
    id: number
    bankName: string
    loanType: string
}

interface LoanPaymentDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    loan: Loan | null
    installments: Installment[]
    onPaymentSuccess: () => void
}

export function LoanPaymentDialog({ open, onOpenChange, loan, installments, onPaymentSuccess }: LoanPaymentDialogProps) {
    const [selectedInstallment, setSelectedInstallment] = useState<string>("")
    const [paymentMethod, setPaymentMethod] = useState("Transferencia")
    const [notes, setNotes] = useState("")
    // New state for dynamic forms
    const [operationNumber, setOperationNumber] = useState("")
    const [cardLastDigits, setCardLastDigits] = useState("")
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState("")
    const [success, setSuccess] = useState("")

    const pendingInstallments = installments.filter(i => !i.isPaid).sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())

    const handleSubmit = async () => {
        if (!selectedInstallment) {
            setError("Selecciona una cuota para pagar")
            return
        }

        setIsLoading(true)
        setError("")
        setSuccess("")

        try {
            // Concatenate extra info to notes
            let finalNotes = notes
            if (paymentMethod === "Transferencia" && operationNumber) {
                finalNotes = `[Op: ${operationNumber}] ${finalNotes}`.trim()
            }
            if (paymentMethod === "Tarjeta" && cardLastDigits) {
                finalNotes = `[Card: **${cardLastDigits}] ${finalNotes}`.trim()
            }

            // Ensure Op Number is present if Transferencia (simple client-side check)
            if (paymentMethod === "Transferencia" && !operationNumber) {
                setError("Debes ingresar el Número de Operación para transferencias.")
                setIsLoading(false)
                return
            }

            const response = await fetch(`/api/installments/${selectedInstallment}/pay`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ paymentMethod, notes: finalNotes }),
            })

            const data = await response.json()

            if (!response.ok) {
                throw new Error(data.error || "Error al procesar el pago")
            }

            setSuccess("Pago registrado exitosamente")
            setTimeout(() => {
                setSuccess("")
                setSelectedInstallment("")
                setNotes("")
                onPaymentSuccess()
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
                    <DialogTitle>Registrar Pago - {loan?.bankName}</DialogTitle>
                    <DialogDescription>
                        {pendingInstallments.length > 0
                            ? `Tienes ${pendingInstallments.length} cuotas pendientes.`
                            : "No hay cuotas pendientes para este préstamo."}
                    </DialogDescription>
                </DialogHeader>

                {pendingInstallments.length > 0 ? (
                    <div className="grid gap-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="installment">Cuota a Pagar</Label>
                            <Select value={selectedInstallment} onValueChange={setSelectedInstallment}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Selecciona una cuota" />
                                </SelectTrigger>
                                <SelectContent>
                                    {pendingInstallments.map((inst) => (
                                        <SelectItem key={inst.id} value={inst.id.toString()}>
                                            Cuota {inst.installmentNumber} - S/ {Number(inst.amount).toFixed(2)} - Vence: {new Date(inst.dueDate).toLocaleDateString()}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="method">Método de Pago</Label>
                            <Select value={paymentMethod} onValueChange={(val) => {
                                setPaymentMethod(val)
                                // Reset specialized fields when changing method
                                setOperationNumber("")
                                setCardLastDigits("")
                            }}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Selecciona método" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Transferencia">Transferencia Bancaria</SelectItem>
                                    <SelectItem value="Efectivo">Efectivo</SelectItem>
                                    <SelectItem value="Yape/Plin">Yape / Plin</SelectItem>
                                    <SelectItem value="Tarjeta">Tarjeta de Crédito/Débito</SelectItem>
                                    <SelectItem value="Otro">Otro</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Dynamic Content based on Payment Method */}
                        {paymentMethod === "Yape/Plin" && (
                            <div className="flex flex-col items-center gap-2 py-2 border rounded-lg bg-gray-50 dark:bg-gray-800/50">
                                <div className="bg-white p-2 rounded-lg shadow-sm">
                                    {/* Using a placeholder if image missing, or assume it works as requested */}
                                    <img
                                        src="/qr-yape.jpg"
                                        alt="QR Yape/Plin"
                                        className="w-48 h-48 object-contain"
                                        onError={(e) => {
                                            // Fallback if image not found
                                            e.currentTarget.style.display = 'none';
                                            e.currentTarget.parentElement!.innerHTML += '<span class="text-xs text-red-500">QR no encontrado (/qr-yape.jpg)</span>'
                                        }}
                                    />
                                </div>
                                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Escanea para pagar</p>
                            </div>
                        )}

                        {paymentMethod === "Transferencia" && (
                            <div className="space-y-3">
                                <div className="p-3 border rounded-lg bg-gray-50 dark:bg-gray-800 flex items-center justify-between">
                                    <div>
                                        <p className="text-xs font-semibold text-gray-500 uppercase">BCP - Soles</p>
                                        <p className="font-mono font-medium text-sm">193-98231234-0-12</p>
                                        <p className="text-xs text-gray-400 mt-1">Titular: Juan Alegria</p>
                                    </div>
                                    <Button
                                        size="icon"
                                        variant="ghost"
                                        className="h-8 w-8"
                                        onClick={() => navigator.clipboard.writeText("193-98231234-0-12")}
                                        title="Copiar número de cuenta"
                                    >
                                        <Copy className="h-4 w-4" />
                                    </Button>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="opNum" className="text-sm font-medium text-gray-700">
                                        Número de Operación <span className="text-red-500">*</span>
                                    </Label>
                                    <Input
                                        id="opNum"
                                        placeholder="Ej: 0012345"
                                        value={operationNumber}
                                        onChange={(e) => setOperationNumber(e.target.value)}
                                        className="border-blue-200 focus:border-blue-500"
                                    />
                                </div>
                            </div>
                        )}

                        {paymentMethod === "Tarjeta" && (
                            <div className="space-y-2">
                                <Label htmlFor="cardDigits">Últimos 4 dígitos (Opcional)</Label>
                                <div className="flex items-center gap-2">
                                    <div className="flex gap-1 text-gray-400">
                                        <span>****</span><span>****</span><span>****</span>
                                    </div>
                                    <Input
                                        id="cardDigits"
                                        placeholder="1234"
                                        maxLength={4}
                                        className="w-20 text-center font-mono"
                                        value={cardLastDigits}
                                        onChange={(e) => setCardLastDigits(e.target.value.replace(/\D/g, '').slice(0, 4))}
                                    />
                                </div>
                            </div>
                        )}

                        {paymentMethod === "Efectivo" && (
                            <Alert className="bg-blue-50 text-blue-900 border-blue-200 p-3">
                                <AlertCircle className="h-4 w-4" />
                                <AlertDescription className="text-xs ml-2">
                                    Recuerda guardar tu comprobante de pago físico o firmar el cuaderno de control.
                                </AlertDescription>
                            </Alert>
                        )}

                        <div className="space-y-2">
                            <Label htmlFor="notes">Notas Adicionales</Label>
                            <Input
                                id="notes"
                                placeholder="Comentarios extra..."
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                            />
                        </div>
                    </div>
                ) : (
                    <div className="py-6 text-center text-muted-foreground">
                        <CheckCircle2 className="mx-auto h-12 w-12 text-green-500 mb-2" />
                        <p>Este préstamo está completamente pagado.</p>
                    </div>
                )}

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
                    {pendingInstallments.length > 0 && (
                        <Button onClick={handleSubmit} disabled={isLoading || !selectedInstallment}>
                            {isLoading ? "Procesando..." : "Registrar Pago"}
                        </Button>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
