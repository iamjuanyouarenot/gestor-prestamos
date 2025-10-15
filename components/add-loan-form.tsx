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
    bankName: "",
    loanType: "",
    totalAmount: "",
    numberOfInstallments: "",
    installmentAmount: "",
    paymentType: "",
    paymentFrequency: "",
    startDate: "",
    endDate: "",
  })

  useEffect(() => {
    const userStr = localStorage.getItem("user")
    if (!userStr) {
      router.push("/login")
      return
    }
    setUser(JSON.parse(userStr))
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
        } else {
          return
        }

        // Formatear la fecha para el input
        const endDateStr = lastPaymentDate.toISOString().split("T")[0]
        setFormData((prev) => ({ ...prev, endDate: endDateStr }))
      }
    }
  }, [formData.startDate, formData.numberOfInstallments, formData.paymentType, formData.paymentFrequency])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target

    setFormData({
      ...formData,
      [name]: value,
    })

    if (name === "numberOfInstallments" || name === "installmentAmount" || name === "totalAmount") {
      const updatedData = { ...formData, [name]: value }
      const total = Number.parseFloat(updatedData.totalAmount) || 0
      const installments = Number.parseInt(updatedData.numberOfInstallments) || 0
      const installmentAmount = Number.parseFloat(updatedData.installmentAmount) || 0

      if (installments > 0 && installmentAmount > 0) {
        const calculatedTotal = installments * installmentAmount
        if (Math.abs(calculatedTotal - total) > 0.01 && total > 0) {
          setError(
            `El número de cuotas (${installments}) multiplicado por el monto de cada cuota (S/ ${installmentAmount.toFixed(2)}) debe ser igual al monto total (S/ ${total.toFixed(2)}). Actualmente: S/ ${calculatedTotal.toFixed(2)}`,
          )
        } else if (error.includes("número de cuotas")) {
          setError("")
        }
      }
    }
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
      !formData.paymentFrequency ||
      !formData.startDate ||
      !formData.endDate
    ) {
      setError("Por favor completa todos los campos")
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
    const calculatedTotal = installments * installmentAmount

    if (Math.abs(calculatedTotal - total) > 0.01) {
      setError(
        `El número de cuotas (${installments}) multiplicado por el monto de cada cuota (S/ ${installmentAmount.toFixed(2)}) debe ser igual al monto total (S/ ${total.toFixed(2)})`,
      )
      setIsLoading(false)
      return
    }

    // Construir el paymentType basado en la selección
    let paymentType: string
    if (formData.paymentType === "fixed") {
      paymentType = `Plazo fijo (día ${formData.paymentFrequency})`
    } else {
      paymentType = `Plazo de acuerdo a días (cada ${formData.paymentFrequency} días)`
    }

    try {
      const response = await fetch("/api/loans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user.id,
          bankName: formData.bankName,
          loanType: formData.loanType,
          totalAmount: total,
          monthlyPayment: installmentAmount,
          numberOfInstallments: installments,
          installmentAmount: installmentAmount, // Agregar este campo también
          paymentType: paymentType,
          startDate: formData.startDate,
          endDate: formData.endDate,
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

          <div className="space-y-2">
            <Label htmlFor="totalAmount">Monto Total del Préstamo (S/)</Label>
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

          <div className="grid gap-4 md:grid-cols-2">
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
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="paymentType">Tipo de Pago</Label>
            <Select value={formData.paymentType} onValueChange={(value) => setFormData(prev => ({ ...prev, paymentType: value }))}>
              <SelectTrigger>
                <SelectValue placeholder="Selecciona el tipo de pago" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="fixed">Plazo fijo (Siempre el mismo día mensual)</SelectItem>
                <SelectItem value="interval">Plazo de acuerdo a días (cada cuantos días debes pagar)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {formData.paymentType && (
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
