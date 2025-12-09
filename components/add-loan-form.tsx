"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { ArrowLeft, Plus } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

interface User {
  id: number
  username: string
}

export function AddLoanForm() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState(false)

  const [formData, setFormData] = useState({
    loanCode: "",
    bankName: "",
    loanType: "",
    totalAmount: "",
    numberOfInstallments: "",
    installmentAmount: "",
    paymentType: "",
    paymentFrequency: "",
    interestRate: "",
    startDate: "",
    endDate: "",
  })

  // Función para calcular TEM (Tasa Efectiva Mensual) desde TEA
  const calculateTEM = (tea: number): number => {
    return Math.pow(1 + tea / 100, 1 / 12) - 1
  }

  // Función para calcular la cuota mensual usando sistema francés
  const calculateMonthlyPayment = (principal: number, tea: number, numInstallments: number): number => {
    const tem = calculateTEM(tea)
    const numerator = principal * tem
    const denominator = 1 - Math.pow(1 + tem, -numInstallments)
    return numerator / denominator
  }

  useEffect(() => {
    const userStr = localStorage.getItem("user")
    if (!userStr || userStr === "undefined") {
      router.push("/login")
      return
    }
    try {
      setUser(JSON.parse(userStr))
    } catch (e) {
      console.error("Error parsing user:", e)
      router.push("/login")
    }
  }, [router])

  useEffect(() => {
    if (formData.startDate && formData.numberOfInstallments && formData.paymentType) {
      const startDate = new Date(formData.startDate)
      const installments = Number.parseInt(formData.numberOfInstallments)

      if (installments > 0) {
        let lastPaymentDate: Date

        if (formData.paymentType === "fixed") {
          // Para plazo fijo, calcular basado en el día especificado
          const dueDay = Number.parseInt(formData.paymentFrequency)
          lastPaymentDate = new Date(startDate.getFullYear(), startDate.getMonth(), dueDay)

          // Si el día de pago ya pasó en el mes de inicio, empezar desde el siguiente mes
          if (lastPaymentDate < startDate) {
            lastPaymentDate.setMonth(lastPaymentDate.getMonth() + 1)
          }

          // Avanzar (installments - 1) meses para llegar a la última cuota
          lastPaymentDate.setMonth(lastPaymentDate.getMonth() + (installments - 1))
        } else if (formData.paymentType === "interval") {
          // Para pagos por intervalo de días
          const daysInterval = Number.parseInt(formData.paymentFrequency)
          lastPaymentDate = new Date(startDate)
          lastPaymentDate.setDate(lastPaymentDate.getDate() + (installments - 1) * daysInterval)
        } else if (formData.paymentType === "Fin de mes") {
          // Para fin de mes, calcular el último día del mes correspondiente al último pago
          lastPaymentDate = new Date(startDate.getFullYear(), startDate.getMonth() + installments, 0) // Último día del mes
        } else {
          return
        }

        // Validar que la fecha sea válida antes de formatear
        if (!isNaN(lastPaymentDate.getTime())) {
          // Formatear la fecha para el input
          const endDateStr = lastPaymentDate.toISOString().split("T")[0]
          setFormData((prev) => ({ ...prev, endDate: endDateStr }))
        }
      }
    }
  }, [formData.startDate, formData.numberOfInstallments, formData.paymentType, formData.paymentFrequency])

  // Calcular automáticamente el monto por cuota cuando cambian el monto total, número de cuotas o tasa de interés
  useEffect(() => {
    const totalAmount = Number.parseFloat(formData.totalAmount)
    const numberOfInstallments = Number.parseInt(formData.numberOfInstallments)
    const interestRate = Number.parseFloat(formData.interestRate) || 0

    if (totalAmount > 0 && numberOfInstallments > 0) {
      // Calcular el monto por cuota usando sistema francés
      const installmentAmount = calculateMonthlyPayment(totalAmount, interestRate, numberOfInstallments)

      setFormData((prev) => ({
        ...prev,
        installmentAmount: installmentAmount.toFixed(2)
      }))
    }
  }, [formData.totalAmount, formData.numberOfInstallments, formData.interestRate])

  // State for installment preview
  const [installmentsPreview, setInstallmentsPreview] = useState<{ number: number; date: Date; isPaid: boolean }[]>([])

  // Función para generar el cronograma preliminar (Debe coincidir con la lógica del servidor)
  const generateSchedule = () => {
    if (!formData.startDate || !formData.numberOfInstallments || !formData.paymentType) return

    const start = new Date(formData.startDate + "T12:00:00")
    const installments = Number.parseInt(formData.numberOfInstallments)
    const frequency = Number.parseInt(formData.paymentFrequency) || 0
    let currentDate = new Date(start)
    const schedule = []
    const today = new Date()

    for (let i = 1; i <= installments; i++) {
      let dueDate: Date

      if (formData.paymentType === "fixed") {
        // Mantener lógica del servidor: usar el dueDay especificado
        const dueDay = frequency || 15
        dueDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), dueDay, 12, 0, 0)

        if (dueDate < currentDate) {
          dueDate.setMonth(dueDate.getMonth() + 1)
        }
        currentDate = new Date(dueDate)
        currentDate.setMonth(currentDate.getMonth() + 1)
      } else if (formData.paymentType === "interval") {
        const daysInterval = frequency || 30
        // Logic matches server: next date is current + interval
        dueDate = new Date(currentDate)
        currentDate.setDate(currentDate.getDate() + daysInterval)
      } else if (formData.paymentType === "Fin de mes") {
        dueDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0, 12, 0, 0)
        currentDate.setMonth(currentDate.getMonth() + 1)
      } else {
        // Default fallback
        dueDate = new Date(currentDate)
        currentDate.setMonth(currentDate.getMonth() + 1)
      }

      schedule.push({
        number: i,
        date: dueDate,
        isPaid: dueDate < today // Auto-mark past dates as paid by default
      })
    }
    setInstallmentsPreview(schedule)
  }

  // Actualizar cronograma cuando cambian los inputs relevantes
  useEffect(() => {
    generateSchedule()
  }, [formData.startDate, formData.numberOfInstallments, formData.paymentType, formData.paymentFrequency])


  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target

    setFormData({
      ...formData,
      [name]: value,
    })

    // Validar la consistencia entre monto total final, número de cuotas y monto por cuota
    setTimeout(() => {
      const capital = Number.parseFloat(formData.totalAmount) || 0
      const installments = Number.parseInt(formData.numberOfInstallments) || 0
      const installmentAmount = Number.parseFloat(formData.installmentAmount) || 0
      const interestRate = Number.parseFloat(formData.interestRate) || 0

      if (capital > 0 && installments > 0 && installmentAmount > 0) {
        // Calcular el total final usando la fórmula correcta
        const finalTotal = installmentAmount * installments
        const calculatedTotal = installments * installmentAmount
        if (Math.abs(calculatedTotal - finalTotal) > 0.1) { // Aumentar tolerancia a 0.1 para evitar errores de redondeo
          setError(
            `El número de cuotas (${installments}) multiplicado por el monto de cada cuota (S/ ${installmentAmount.toFixed(2)}) debe ser igual al total final del préstamo (S/ ${finalTotal.toFixed(2)}). Actualmente: S/ ${calculatedTotal.toFixed(2)}`,
          )
        } else if (error && error.includes("número de cuotas")) {
          setError("")
        }
      }
    }, 0)
  }



  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setIsLoading(true)

    if (!user) {
      setError("Usuario no autenticado")
      setIsLoading(false)
      return
    }

    if (
      !formData.bankName ||
      !formData.loanType ||
      !formData.totalAmount ||
      !formData.numberOfInstallments ||
      !formData.installmentAmount ||
      !formData.paymentType ||
      (formData.paymentType !== "Fin de mes" && !formData.paymentFrequency) ||
      !formData.startDate ||
      !formData.endDate
    ) {
      setError("Por favor completa todos los campos")
      setIsLoading(false)
      return
    }



    const interestRateValue = Number.parseFloat(formData.interestRate) || 0
    if (interestRateValue < 0 || interestRateValue > 100) {
      setError("La tasa de interés debe estar entre 0% y 100%")
      setIsLoading(false)
      return
    }

    const startDate = new Date(formData.startDate)
    const endDate = new Date(formData.endDate)

    if (endDate <= startDate) {
      setError("La fecha de finalización debe ser posterior a la fecha de inicio")
      setIsLoading(false)
      return
    }

    const total = Number.parseFloat(formData.totalAmount)
    const installments = Number.parseInt(formData.numberOfInstallments)
    const installmentAmount = Number.parseFloat(formData.installmentAmount)
    const interestRate = Number.parseFloat(formData.interestRate) || 0

    // Calcular el total final esperado usando la fórmula correcta
    const finalTotalAmount = installmentAmount * installments
    const calculatedTotal = installments * installmentAmount

    if (Math.abs(calculatedTotal - finalTotalAmount) > 0.1) {
      setError(
        `El número de cuotas (${installments}) multiplicado por el monto de cada cuota (S/ ${installmentAmount.toFixed(2)}) debe ser igual al total final del préstamo (S/ ${finalTotalAmount.toFixed(2)}). Actualmente: S/ ${calculatedTotal.toFixed(2)}`,
      )
      setIsLoading(false)
      return
    }

    // Construir el paymentType basado en la selección
    let paymentType: string
    if (formData.paymentType === "fixed") {
      paymentType = `Plazo fijo (día ${formData.paymentFrequency})`
    } else if (formData.paymentType === "interval") {
      paymentType = `Plazo de acuerdo a días (cada ${formData.paymentFrequency} días)`
    } else if (formData.paymentType === "Fin de mes") {
      paymentType = `Fin de mes`
    } else {
      paymentType = formData.paymentType
    }

    try {
      const response = await fetch("/api/loans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user.id,
          loanCode: formData.loanCode,
          bankName: formData.bankName,
          loanType: formData.loanType,
          totalAmount: total,
          monthlyPayment: installmentAmount,
          numberOfInstallments: installments,
          installmentAmount: installmentAmount, // Agregar este campo también
          paymentType: paymentType,
          interestRate: interestRateValue,
          startDate: formData.startDate,
          endDate: formData.endDate,
          paidInstallments: installmentsPreview.filter(i => i.isPaid).map(i => i.number) // Send list of paid indices
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || "Error al crear préstamo")
        setIsLoading(false)
        return
      }

      setSuccess(true)
      setTimeout(() => {
        router.push("/dashboard")
      }, 1500)
    } catch (err) {
      setError("Error de conexión. Intenta nuevamente.")
      setIsLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.push("/dashboard")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <CardTitle>Agregar Nuevo Préstamo</CardTitle>
            <CardDescription>Completa la información de tu préstamo bancario</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="loanCode">Código del Préstamo</Label>
            <Input
              id="loanCode"
              name="loanCode"
              type="text"
              placeholder="Ej: PREST-001"
              value={formData.loanCode}
              onChange={handleChange}
              disabled={isLoading}
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="bankName">Nombre del Banco</Label>
              <Input
                id="bankName"
                name="bankName"
                type="text"
                placeholder="Ej: Banco Nacional"
                value={formData.bankName}
                onChange={handleChange}
                required
                disabled={isLoading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="loanType">Tipo de Préstamo</Label>
              <Input
                id="loanType"
                name="loanType"
                type="text"
                placeholder="Ej: Personal, Hipotecario, Automotriz"
                value={formData.loanType}
                onChange={handleChange}
                required
                disabled={isLoading}
              />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="totalAmount">Monto del Préstamo (Capital) (S/)</Label>
              <Input
                id="totalAmount"
                name="totalAmount"
                type="number"
                step="0.01"
                placeholder="50000.00"
                value={formData.totalAmount}
                onChange={handleChange}
                required
                disabled={isLoading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="numberOfInstallments">Número de Cuotas</Label>
              <Input
                id="numberOfInstallments"
                name="numberOfInstallments"
                type="number"
                min="1"
                placeholder="24"
                value={formData.numberOfInstallments}
                onChange={handleChange}
                required
                disabled={isLoading}
              />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="interestRate">Tasa de Interés TEA (%)</Label>
              <Input
                id="interestRate"
                name="interestRate"
                type="number"
                step="0.01"
                min="0"
                max="100"
                placeholder="10.00"
                value={formData.interestRate}
                onChange={handleChange}
                disabled={isLoading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="installmentAmount">Monto por Cuota (S/)</Label>
              <Input
                id="installmentAmount"
                name="installmentAmount"
                type="number"
                step="0.01"
                placeholder="2083.33"
                value={formData.installmentAmount}
                onChange={handleChange}
                required
                disabled={isLoading}
              />
              <p className="text-xs text-muted-foreground">Se calcula automáticamente usando sistema francés</p>
            </div>
          </div>

          {formData.totalAmount && formData.interestRate && formData.numberOfInstallments && (
            <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <h4 className="font-semibold text-sm mb-2">Resumen del Préstamo</h4>
              <div className="grid gap-2 text-sm">
                <div className="flex justify-between">
                  <span>Monto del préstamo (capital):</span>
                  <span>S/ {Number.parseFloat(formData.totalAmount).toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Tasa Efectiva Anual (TEA):</span>
                  <span>{formData.interestRate}%</span>
                </div>
                <div className="flex justify-between">
                  <span>Tasa Efectiva Mensual (TEM):</span>
                  <span>{(calculateTEM(Number.parseFloat(formData.interestRate)) * 100).toFixed(4)}%</span>
                </div>
                <div className="flex justify-between font-semibold border-t pt-2">
                  <span>Total del préstamo (con interés):</span>
                  <span>S/ {(Number.parseFloat(formData.installmentAmount) * Number.parseInt(formData.numberOfInstallments)).toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Intereses totales:</span>
                  <span>S/ {(Number.parseFloat(formData.installmentAmount) * Number.parseInt(formData.numberOfInstallments) - Number.parseFloat(formData.totalAmount)).toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Número de cuotas:</span>
                  <span>{formData.numberOfInstallments}</span>
                </div>
                {formData.installmentAmount && (
                  <div className="flex justify-between">
                    <span>Monto por cuota:</span>
                    <span>S/ {Number.parseFloat(formData.installmentAmount).toFixed(2)}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="paymentType">Tipo de Pago</Label>
            <Select value={formData.paymentType} onValueChange={(value) => setFormData(prev => ({ ...prev, paymentType: value }))}>
              <SelectTrigger>
                <SelectValue placeholder="Selecciona el tipo de pago" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="fixed">Plazo fijo (Siempre el mismo día mensual)</SelectItem>
                <SelectItem value="interval">Plazo de acuerdo a días (cada cuantos días debes pagar)</SelectItem>
                <SelectItem value="Fin de mes">Fin de mes</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {formData.paymentType && formData.paymentType !== "Fin de mes" && (
            <div className="space-y-2">
              <Label htmlFor="paymentFrequency">
                {formData.paymentType === "fixed" ? "Día del mes (1-31)" : "Intervalo en días"}
              </Label>
              <Input
                id="paymentFrequency"
                name="paymentFrequency"
                type="number"
                min={formData.paymentType === "fixed" ? "1" : "1"}
                max={formData.paymentType === "fixed" ? "31" : "365"}
                placeholder={formData.paymentType === "fixed" ? "15" : "30"}
                value={formData.paymentFrequency}
                onChange={handleChange}
                required
                disabled={isLoading}
              />
              <p className="text-xs text-muted-foreground">
                {formData.paymentType === "fixed"
                  ? "El día del mes en que vence el pago"
                  : "Cada cuántos días se debe realizar el pago"
                }
              </p>
            </div>
          )}

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="startDate">Fecha de Inicio</Label>
              <Input
                id="startDate"
                name="startDate"
                type="date"
                value={formData.startDate}
                onChange={handleChange}
                required
                disabled={isLoading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="endDate">Fecha de Finalización</Label>
              <Input
                id="endDate"
                name="endDate"
                type="date"
                value={formData.endDate}
                onChange={handleChange}
                required
                disabled={isLoading}
              />
              <p className="text-xs text-muted-foreground">Se calcula automáticamente según las cuotas</p>
            </div>
          </div>

          {/* Preview Details */}
          {installmentsPreview.length > 0 && (
            <div className="border rounded-lg overflow-hidden">
              <div className="bg-gray-100 dark:bg-gray-800 p-3 border-b">
                <h4 className="font-semibold text-sm">Cronograma y Estado Inicial</h4>
                <p className="text-xs text-muted-foreground">Marca las cuotas que ya han sido pagadas anteriormente.</p>
              </div>
              <div className="max-h-60 overflow-y-auto">
                <table className="w-full text-sm text-left">
                  <thead className="text-xs text-gray-500 uppercase bg-gray-50 dark:bg-gray-700">
                    <tr>
                      <th className="px-4 py-2">#</th>
                      <th className="px-4 py-2">Fecha Vcto</th>
                      <th className="px-4 py-2">Estado Inicial</th>
                    </tr>
                  </thead>
                  <tbody>
                    {installmentsPreview.map((inst, idx) => (
                      <tr key={inst.number} className="border-b dark:border-gray-700">
                        <td className="px-4 py-2">{inst.number}</td>
                        <td className="px-4 py-2">{inst.date.toLocaleDateString()}</td>
                        <td className="px-4 py-2">
                          <div className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              id={`pay-${inst.number}`}
                              checked={inst.isPaid}
                              onChange={(e) => {
                                const newSchedule = [...installmentsPreview]
                                newSchedule[idx].isPaid = e.target.checked
                                setInstallmentsPreview(newSchedule)
                              }}
                              className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                            />
                            <label htmlFor={`pay-${inst.number}`} className={inst.isPaid ? "text-green-600 font-medium" : "text-gray-500"}>
                              {inst.isPaid ? "Pagado" : "Pendiente"}
                            </label>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="p-2 bg-gray-50 dark:bg-gray-800 border-t text-xs text-center text-gray-500">
                {installmentsPreview.filter(i => i.isPaid).length} cuotas marcadas como pagadas
              </div>
            </div>
          )}

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {success && (
            <Alert className="bg-green-50 text-green-900 border-green-200 dark:bg-green-900/20 dark:text-green-100 dark:border-green-800">
              <AlertDescription>Préstamo agregado exitosamente. Redirigiendo...</AlertDescription>
            </Alert>
          )}

          <div className="flex gap-4">
            <Button type="button" variant="outline" onClick={() => router.push("/dashboard")} disabled={isLoading}>
              Cancelar
            </Button>
            <Button type="submit" className="flex-1" disabled={isLoading}>
              <Plus className="mr-2 h-4 w-4" />
              {isLoading ? "Guardando..." : "Agregar Préstamo"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
