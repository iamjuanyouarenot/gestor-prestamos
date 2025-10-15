"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Skeleton } from "@/components/ui/skeleton"
import {
  LogOut,
  Plus,
  Calendar,
  DollarSign,
  Building2,
  AlertCircle,
  Pencil,
  Trash2,
  ChevronDown,
  ChevronUp,
} from "lucide-react"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { CalendarView } from "@/components/calendar-view"

interface Loan {
  id: number
  bank_name: string
  loan_type: string
  total_amount: number
  monthly_payment: number
  due_day: number
  start_date: string
  end_date: string
  is_active: boolean
  next_due_date?: string
  days_until_due?: number
  is_overdue?: boolean
}

interface Installment {
  id: number
  loan_id: number
  due_date: string
  is_paid: boolean
}

interface User {
  id: number
  username: string
}

export function DashboardContent() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [loans, setLoans] = useState<Loan[]>([])
  const [installments, setInstallments] = useState<Installment[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState("")
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [loanToDelete, setLoanToDelete] = useState<number | null>(null)
  const [loansExpanded, setLoansExpanded] = useState(true)

  useEffect(() => {
    const userStr = localStorage.getItem("user")
    if (!userStr) {
      router.push("/login")
      return
    }

    const userData = JSON.parse(userStr)
    setUser(userData)

    loadData(userData.id)
  }, [router])

  const loadData = async (userId: number) => {
    try {
      const [loansResponse, installmentsResponse] = await Promise.all([
        fetch(`/api/loans?userId=${userId}`),
        fetch(`/api/installments?userId=${userId}`),
      ])

      const loansData = await loansResponse.json()
      const installmentsData = await installmentsResponse.json()

      if (!loansResponse.ok || !installmentsResponse.ok) {
        setError("Error al cargar datos")
        setIsLoading(false)
        return
      }

      console.log("[v0] Préstamos cargados:", loansData.loans.length)
      console.log("[v0] Cuotas cargadas:", installmentsData.installments.length)

      setInstallments(installmentsData.installments)

      const loansWithNextDue = loansData.loans.map((loan: Loan) => {
        const loanInstallments = installmentsData.installments.filter(
          (inst: Installment) => inst.loan_id === loan.id && !inst.is_paid,
        )

        if (loanInstallments.length === 0) {
          return { ...loan, next_due_date: null, days_until_due: null, is_overdue: false }
        }

        // Ordenar por fecha y tomar la primera cuota pendiente
        loanInstallments.sort(
          (a: Installment, b: Installment) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime(),
        )

        const nextInstallment = loanInstallments[0]
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        const dueDate = new Date(nextInstallment.due_date)
        dueDate.setHours(0, 0, 0, 0)

        const diffTime = dueDate.getTime() - today.getTime()
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

        console.log("[v0] Préstamo:", loan.bank_name, "Próxima cuota:", nextInstallment.due_date, "Días:", diffDays)

        return {
          ...loan,
          next_due_date: nextInstallment.due_date,
          days_until_due: diffDays,
          is_overdue: diffDays < 0,
        }
      })

      setLoans(loansWithNextDue)
      setIsLoading(false)
    } catch (err) {
      console.error("[v0] Error cargando datos:", err)
      setError("Error de conexión")
      setIsLoading(false)
    }
  }

  const handleLogout = () => {
    localStorage.removeItem("user")
    router.push("/login")
  }

  const formatCurrency = (amount: number) => {
    return `S/ ${new Intl.NumberFormat("es-PE", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount)}`
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("es-ES", {
      year: "numeric",
      month: "long",
      day: "numeric",
    })
  }

  const getStatusBadge = (loan: Loan) => {
    if (!loan.next_due_date) {
      return <Badge variant="secondary">Completado</Badge>
    }

    const daysUntil = loan.days_until_due ?? 0

    if (daysUntil < 0) {
      return <Badge variant="destructive">Vencido ({Math.abs(daysUntil)} días)</Badge>
    } else if (daysUntil === 0) {
      return <Badge variant="destructive">Vence hoy</Badge>
    } else if (daysUntil <= 3) {
      return <Badge className="bg-orange-500 hover:bg-orange-600">Próximo a vencer</Badge>
    } else if (daysUntil <= 7) {
      return <Badge className="bg-yellow-500 hover:bg-yellow-600">Esta semana</Badge>
    } else {
      return <Badge variant="secondary">Al día</Badge>
    }
  }

  const totalMonthlyPayment = loans.reduce((sum, loan) => sum + Number(loan.monthly_payment), 0)

  const nextDueInDays = loans
    .filter((loan) => loan.next_due_date && loan.days_until_due !== null)
    .reduce((min, loan) => {
      const days = loan.days_until_due ?? Number.POSITIVE_INFINITY
      return days < min ? days : min
    }, Number.POSITIVE_INFINITY)

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 p-4 md:p-8">
        <div className="max-w-6xl mx-auto space-y-6">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-60 w-full" />
        </div>
      </div>
    )
  }

  const handleDeleteLoan = async (loanId: number) => {
    try {
      const response = await fetch(`/api/loans/${loanId}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        const data = await response.json()
        setError(data.error || "Error al eliminar préstamo")
        return
      }

      if (user) {
        loadData(user.id)
      }
      setDeleteDialogOpen(false)
      setLoanToDelete(null)
    } catch (err) {
      setError("Error de conexión al eliminar préstamo")
    }
  }

  const confirmDelete = (loanId: number) => {
    setLoanToDelete(loanId)
    setDeleteDialogOpen(true)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 p-4 md:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white">
              Bienvenido, {user?.username}
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">Gestiona tus préstamos y pagos mensuales</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleLogout}>
              <LogOut className="mr-2 h-4 w-4" />
              Cerrar Sesión
            </Button>
          </div>
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Préstamos</CardTitle>
              <Building2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{loans.length}</div>
              <p className="text-xs text-muted-foreground">Préstamos activos</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pago Mensual Total</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(totalMonthlyPayment)}</div>
              <p className="text-xs text-muted-foreground">Suma de todas las cuotas</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Próximo Vencimiento</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {nextDueInDays === Number.POSITIVE_INFINITY
                  ? "N/A"
                  : nextDueInDays < 0
                    ? `${Math.abs(nextDueInDays)} días atrasado`
                    : `${nextDueInDays} días`}
              </div>
              <p className="text-xs text-muted-foreground">
                {nextDueInDays < 0 ? "Pago vencido" : "Hasta el próximo pago"}
              </p>
            </CardContent>
          </Card>
        </div>

        {user && <CalendarView userId={user.id} />}

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <CardTitle>Mis Préstamos</CardTitle>
                  <Button variant="ghost" size="sm" onClick={() => setLoansExpanded(!loansExpanded)}>
                    {loansExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </Button>
                </div>
                <CardDescription>Detalles de todos tus préstamos y fechas de pago</CardDescription>
              </div>
              <Button onClick={() => router.push("/dashboard/add-loan")} className="md:flex hidden">
                <Plus className="mr-2 h-4 w-4" />
                Agregar Préstamo
              </Button>
              <Button onClick={() => router.push("/dashboard/add-loan")} size="sm" className="md:hidden">
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          {loansExpanded && (
            <CardContent>
              {loans.length === 0 ? (
                <div className="text-center py-12">
                  <Building2 className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-4 text-lg font-semibold text-gray-900 dark:text-white">
                    No tienes préstamos registrados
                  </h3>
                  <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">Comienza agregando tu primer préstamo</p>
                  <Button className="mt-4" onClick={() => router.push("/dashboard/add-loan")}>
                    <Plus className="mr-2 h-4 w-4" />
                    Agregar Préstamo
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {loans
                    .sort((a, b) => {
                      const aDays = a.days_until_due ?? Number.POSITIVE_INFINITY
                      const bDays = b.days_until_due ?? Number.POSITIVE_INFINITY
                      return aDays - bDays
                    })
                    .map((loan) => {
                      return (
                        <div
                          key={loan.id}
                          className="flex flex-col md:flex-row md:items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors gap-4"
                        >
                          <div className="flex-1 space-y-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h3 className="font-semibold text-lg">{loan.bank_name}</h3>
                              {getStatusBadge(loan)}
                            </div>
                            <p className="text-sm text-muted-foreground">{loan.loan_type}</p>
                            <div className="flex flex-wrap gap-4 text-sm text-muted-foreground mt-2">
                              <span>
                                <strong>Cuota mensual:</strong> {formatCurrency(loan.monthly_payment)}
                              </span>
                              <span>
                                <strong>Vence el día:</strong> {loan.due_day} de cada mes
                              </span>
                              <span>
                                <strong>Total:</strong> {formatCurrency(loan.total_amount)}
                              </span>
                            </div>
                          </div>
                          <div className="flex flex-col items-end gap-2">
                            {loan.next_due_date ? (
                              <>
                                <div className="text-right">
                                  <p className="text-sm text-muted-foreground">
                                    {loan.is_overdue ? "Vencido hace" : "Próximo pago en"}
                                  </p>
                                  <p className="text-2xl font-bold">{Math.abs(loan.days_until_due ?? 0)} días</p>
                                </div>
                                <p className="text-xs text-muted-foreground">
                                  Próxima cuota: {formatDate(loan.next_due_date)}
                                </p>
                              </>
                            ) : (
                              <p className="text-sm text-muted-foreground">Todas las cuotas pagadas</p>
                            )}
                            <p className="text-xs text-muted-foreground">Finaliza: {formatDate(loan.end_date)}</p>
                            <div className="flex gap-2 mt-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => router.push(`/dashboard/edit-loan/${loan.id}`)}
                              >
                                <Pencil className="h-4 w-4 mr-1" />
                                Editar
                              </Button>
                              <Button variant="destructive" size="sm" onClick={() => confirmDelete(loan.id)}>
                                <Trash2 className="h-4 w-4 mr-1" />
                                Eliminar
                              </Button>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                </div>
              )}
            </CardContent>
          )}
        </Card>

        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
              <AlertDialogDescription>
                Esta acción no se puede deshacer. El préstamo será eliminado permanentemente.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => loanToDelete && handleDeleteLoan(loanToDelete)}
                className="bg-destructive text-white hover:bg-destructive/90"
              >
                Eliminar
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  )
}
