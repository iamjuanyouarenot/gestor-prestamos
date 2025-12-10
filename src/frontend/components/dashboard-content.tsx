"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import {
  Bell,
  CreditCard,
  LogOut,
  Plus,
  Calendar,
  DollarSign,
  Building2,
  AlertCircle,
  Trash2,
  ChevronDown,
  ChevronUp,
} from "lucide-react"

// Importaciones de UI
import { Button } from "@/frontend/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/frontend/components/ui/card"
import { Alert, AlertDescription } from "@/frontend/components/ui/alert"
import { Progress } from "@/frontend/components/ui/progress"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/frontend/components/ui/alert-dialog"

// --- CORRECCIÓN DE IMPORTACIONES (SIN LLAVES) ---
import { LoanPaymentDialog } from "@/frontend/components/loan-payment-dialog"
import { NotificationSettingsDialog } from "@/frontend/components/notification-settings-dialog"
import { CalendarView } from "@/frontend/components/calendar-view"

// --- INTERFACES CORREGIDAS A CAMELCASE (Formato Prisma) ---
interface User {
  id: number // Prisma ID is Int
  username: string
  email: string
  phoneNumber?: string | null
  notificationsEnabled: boolean
}

interface Installment {
  id: number
  loanId: number      // Prisma: Int
  amount: number
  dueDate: string | Date
  isPaid: boolean
  installmentNumber: number
  loan?: { // Make optional initially to avoid strict parsing errors if some endpoints don't return it, but API/installments does.
    bankName: string
    loanType: string
    monthlyPayment: number
    totalAmount: number
  }
}

interface Loan {
  id: number // Prisma: Int
  userId: number      // Prisma: Int
  loanCode?: string
  bankName: string
  loanType: string
  amount: number // Not in Prisma schema explicitly? Schema has totalAmount. 
  // Wait, schema has totalAmount and monthlyPayment. 
  // 'amount' variable usage needs check.
  // In DashboardContent, 'amount' is used?
  // User added 'amount: number' in previous step.
  // Let's keep it safe or check usage. 
  // Actually, let's map it correctly based on usage. 
  // In 'getInstallmentsForDay' (CalendarView), it uses total_amount.
  // Here in Dashboard, let's look at usage.
  // It uses monthlyPayment and finalTotalAmount.
  // 'amount' might be 'totalAmount' alias?
  // Let's include totalAmount.
  totalAmount: number
  monthlyPayment: number
  paymentType: string
  startDate: string | Date
  endDate: string | Date
  finalTotalAmount: number
  nextDueDate?: string | Date
  daysUntilDue?: number
  isOverdue?: boolean
}

// --- FUNCIONES DE AYUDA ---
const formatCurrency = (amount: number | undefined) => {
  if (amount === undefined) return "S/ 0.00"
  return new Intl.NumberFormat("es-PE", { style: "currency", currency: "PEN" }).format(amount)
}

const formatDate = (date: string | Date | undefined) => {
  if (!date) return "N/A"
  const d = new Date(date)
  const userTimezoneOffset = d.getTimezoneOffset() * 60000
  const adjustedDate = new Date(d.getTime() + userTimezoneOffset)
  return adjustedDate.toLocaleDateString("es-PE", { day: "numeric", month: "long", year: "numeric" })
}

// --- COMPONENTE PRINCIPAL ---
export default function DashboardContent() { // Agregado 'default' por si acaso lo necesitas importar así
  const router = useRouter()

  // Estados
  const [user, setUser] = useState<User | null>(null)
  const [loans, setLoans] = useState<Loan[]>([])
  const [installments, setInstallments] = useState<Installment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Estados UI
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false)
  const [selectedLoanForPayment, setSelectedLoanForPayment] = useState<Loan | null>(null)
  const [selectedLoanInstallments, setSelectedLoanInstallments] = useState<Installment[]>([])
  const [notificationSettingsOpen, setNotificationSettingsOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [loanToDelete, setLoanToDelete] = useState<number | null>(null) // Changed to number
  const [loansExpanded, setLoansExpanded] = useState(true)
  const [showPasswordReset, setShowPasswordReset] = useState(false)
  const [resetStep, setResetStep] = useState('request')

  // Carga de datos
  const loadData = async (userId: string) => {
    setLoading(true)
    setError(null)
    try {
      console.log("🔄 Conectando con API (CamelCase)...", userId)

      const loansRes = await fetch(`/api/loans?userId=${userId}`)
      if (!loansRes.ok) throw new Error("Error cargando préstamos")
      const loansData = await loansRes.json()
      const rawLoans = loansData.loans || []

      // Enriquecer préstamos con cálculos de vencimiento
      const enrichedLoans = rawLoans.map((loan: any) => {
        const nextInstallment = loan.installments && loan.installments.length > 0 ? loan.installments[0] : null
        let nextDueDate = undefined
        let daysUntilDue = undefined
        let isOverdue = false

        if (nextInstallment) {
          nextDueDate = nextInstallment.dueDate
          const due = new Date(nextDueDate)
          const today = new Date()
          // Reset hours for accurate day calc
          today.setHours(0, 0, 0, 0)
          due.setHours(0, 0, 0, 0)

          const diffTime = due.getTime() - today.getTime()
          daysUntilDue = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
          isOverdue = daysUntilDue < 0
        }

        return {
          ...loan,
          nextDueDate,
          daysUntilDue,
          isOverdue
        }
      })

      setLoans(enrichedLoans)

      const instRes = await fetch(`/api/installments?userId=${userId}`)
      if (instRes.ok) {
        const instData = await instRes.json()
        setInstallments(instData.installments || [])
      } else {
        setInstallments([])
      }

    } catch (err) {
      console.error(" Error:", err)
      setError("No se pudieron cargar los datos.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const storedUser = localStorage.getItem("user")
    if (storedUser) {
      const parsedUser = JSON.parse(storedUser)
      setUser(parsedUser)
      loadData(parsedUser.id)
    } else {
      router.push("/login")
    }
  }, [])

  // Handlers
  const handleLogout = () => {
    localStorage.removeItem("user")
    router.push("/login")
  }

  const handleOpenPayment = (loan: Loan) => {
    setSelectedLoanForPayment(loan)
    // Filtramos usando loanId (CamelCase)
    const loanInst = installments.filter(i => i.loanId === loan.id)
    setSelectedLoanInstallments(loanInst)
    setPaymentDialogOpen(true)
  }

  const handlePaymentSuccess = () => {
    if (user) loadData(user.id.toString())
    setPaymentDialogOpen(false)
  }

  const handleNotificationUpdate = (updatedUser: User) => {
    setUser(updatedUser)
    localStorage.setItem("user", JSON.stringify(updatedUser))
  }

  const confirmDelete = (loanId: number) => { // Typed as number
    setLoanToDelete(loanId)
    setDeleteDialogOpen(true)
  }

  const handleDeleteLoan = async () => { // Removed arg, use state
    if (!loanToDelete) return

    try {
      const res = await fetch(`/api/loans/${loanToDelete}`, { method: "DELETE" })
      if (!res.ok) throw new Error("Failed to delete")

      if (user) loadData(user.id.toString()) // Ensure string conversion if needed
      setDeleteDialogOpen(false)
      setLoanToDelete(null)
    } catch (err) {
      console.error(err)
      setError("Error al eliminar el préstamo")
    }
  }

  const resetPasswordDialog = () => {
    if (!showPasswordReset) return null;
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-xl max-w-sm w-full">
          <h2 className="text-xl font-bold mb-4">Gestión de Contraseña</h2>
          <p className="mb-4 text-sm text-gray-600">Contacta soporte para cambiar tu contraseña.</p>
          <Button onClick={() => setShowPasswordReset(false)} className="w-full">Cerrar</Button>
        </div>
      </div>
    )
  }

  // Cálculos actualizados a CamelCase
  const totalMonthlyPayment = loans.reduce((acc, loan) => acc + Number(loan.monthlyPayment || 0), 0)

  const nextDueInDays = (() => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    // Filter pending installments that are due today or in the future
    const upcoming = installments
      .filter(i => !i.isPaid)
      .map(i => {
        const d = new Date(i.dueDate)
        // Normalize to local midnight to avoid timezone issues
        // d.get... uses local time if d was created from string without Z? 
        // API sends ISO string potentially.
        // Let's rely on standard Date comparison but zero out hours just in case
        const due = new Date(i.dueDate)
        // Adjust for timezone offset if needed (API returns T00:00:00.000Z usually?)
        // Ideally we treat the date string as local YYYY-MM-DD.
        // Let's use the explicit components to be safe:
        const dueLocal = new Date(due.getFullYear(), due.getMonth(), due.getDate())
        // Actually, if we use the same helper 'formatDate' logic:
        // const userTimezoneOffset = due.getTimezoneOffset() * 60000
        // const adjustedDate = new Date(due.getTime() + userTimezoneOffset)
        // For comparison, let's keep it simple: normalize 'due' to midnight local.

        // Fix: If Date is 2023-12-18T00:00:00Z and local is UTC-5, it becomes 17th 19:00.
        // We want it to be 18th.
        // The safest way is to use the string parts if available, or add offset.
        // Given existing code uses `new Date(dueDate)`, let's stick to consistent logic.
        // We can add offset to be safe.
        const offsetCheck = new Date(due.getTime() + due.getTimezoneOffset() * 60000)
        offsetCheck.setHours(0, 0, 0, 0)
        return offsetCheck
      })
      .filter(d => d >= today)
      .sort((a, b) => a.getTime() - b.getTime())

    if (upcoming.length === 0) return Number.POSITIVE_INFINITY

    const nextDate = upcoming[0]
    const diff = nextDate.getTime() - today.getTime()
    return Math.ceil(diff / (1000 * 60 * 60 * 24))
  })()

  const getStatusBadge = (loan: Loan) => {
    if (loan.isOverdue) return <span className="bg-red-100 text-red-800 text-xs px-2 py-1 rounded font-medium border border-red-200">Vencido</span>
    if ((loan.daysUntilDue ?? 999) <= 7) return <span className="bg-yellow-100 text-yellow-800 text-xs px-2 py-1 rounded font-medium border border-yellow-200">Próximo</span>
    return <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded font-medium border border-green-200">Al día</span>
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 p-4 md:p-8 transition-all">
      <div className="max-w-6xl mx-auto space-y-6">

        {/* Encabezado */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white">
              Bienvenido, {user?.username}
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">Gestiona tus préstamos y pagos mensuales</p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button variant="outline" onClick={() => setNotificationSettingsOpen(true)} className="bg-white/50 backdrop-blur-sm">
              <Bell className="mr-2 h-4 w-4" /> Notificaciones
            </Button>
            <Button variant="outline" onClick={() => { setResetStep('request'); setShowPasswordReset(true); }} className="bg-white/50 backdrop-blur-sm">
              Cambiar Contraseña
            </Button>
            <Button variant="outline" onClick={handleLogout} className="bg-white/50 backdrop-blur-sm hover:bg-red-50 hover:text-red-600 border-red-200">
              <LogOut className="mr-2 h-4 w-4" /> Cerrar Sesión
            </Button>
          </div>
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Tarjetas de Métricas */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card className="bg-white/80 backdrop-blur-sm shadow-sm hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Préstamos</CardTitle>
              <Building2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{loans.length}</div>
              <p className="text-xs text-muted-foreground">Préstamos activos</p>
            </CardContent>
          </Card>

          <Card className="bg-white/80 backdrop-blur-sm shadow-sm hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pago Mensual Total</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(totalMonthlyPayment)}</div>
              <p className="text-xs text-muted-foreground">Suma de todas las cuotas</p>
            </CardContent>
          </Card>

          <Card className="bg-white/80 backdrop-blur-sm shadow-sm hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Próximo Vencimiento</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${nextDueInDays < 0 ? 'text-red-600' : ''}`}>
                {nextDueInDays === Number.POSITIVE_INFINITY
                  ? "N/A"
                  : nextDueInDays < 0
                    ? `${Math.abs(nextDueInDays)} días atrasado`
                    : nextDueInDays === 0 ? "¡Vence Hoy!" : `${nextDueInDays} días`}
              </div>
              <p className="text-xs text-muted-foreground">
                {nextDueInDays < 0 ? "Pago vencido, ¡atención!" : "Hasta el próximo pago"}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Si userId sigue marcando error, prueba cambiar userId={user.id} por user={user} */}
        {user && <CalendarView installments={installments} />}

        {/* Lista de Préstamos */}
        <Card className="shadow-md">
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
              <Button onClick={() => router.push("/dashboard/add-loan")} className="md:flex hidden bg-blue-600 hover:bg-blue-700">
                <Plus className="mr-2 h-4 w-4" /> Agregar Préstamo
              </Button>
              <Button onClick={() => router.push("/dashboard/add-loan")} size="sm" className="md:hidden bg-blue-600">
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
                  <Button className="mt-4" onClick={() => router.push("/dashboard/add-loan")}>
                    <Plus className="mr-2 h-4 w-4" /> Agregar Préstamo
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {loans.sort((a, b) => (a.daysUntilDue ?? 999) - (b.daysUntilDue ?? 999)).map((loan) => {
                    let cardStyle = "border rounded-lg hover:bg-accent/50 transition-all duration-200"
                    const daysUntil = loan.daysUntilDue ?? 999

                    if (loan.nextDueDate) {
                      if (daysUntil < 0) {
                        cardStyle = "border-l-4 border-l-red-500 bg-red-50 dark:bg-red-900/10 shadow-sm"
                      } else if (daysUntil <= 7) {
                        cardStyle = "border-l-4 border-l-yellow-500 bg-yellow-50 dark:bg-yellow-900/10 shadow-sm"
                      } else {
                        cardStyle = "border-l-4 border-l-blue-500/0 hover:border-l-blue-500 bg-white dark:bg-gray-800 shadow-sm"
                      }
                    } else {
                      cardStyle = "border-l-4 border-l-green-500 bg-green-50/50 dark:bg-green-900/10 opacity-75"
                    }

                    return (
                      <div key={loan.id} className={`flex flex-col md:flex-row md:items-center justify-between p-4 gap-4 ${cardStyle}`}>
                        <div className="flex-1 space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            {loan.loanCode && <span className="text-xs font-mono bg-white dark:bg-gray-800 px-2 py-0.5 rounded border text-gray-500">{loan.loanCode}</span>}
                            <h3 className="font-semibold text-lg text-gray-900 dark:text-gray-100">{loan.bankName}</h3>
                            {getStatusBadge(loan)}
                          </div>
                          <p className="text-sm text-muted-foreground">{loan.loanType}</p>
                          <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-gray-600 dark:text-gray-300 mt-2">
                            <span><strong className="font-medium text-gray-900 dark:text-gray-100">Cuota:</strong> {formatCurrency(loan.monthlyPayment)}</span>
                            <span><strong className="font-medium text-gray-900 dark:text-gray-100">Total:</strong> {formatCurrency(loan.finalTotalAmount)}</span>
                          </div>

                          {/* Progress Section */}
                          <div className="mt-3 space-y-1.5">
                            {(() => {
                              // Calculate progress based on installments linked to this loan
                              // Note: installments state contains ALL user installments. Filter by loanId.
                              const loanInst = installments.filter(i => i.loanId === loan.id)
                              const totalInst = loanInst.length
                              const paidInst = loanInst.filter(i => i.isPaid).length
                              const percent = totalInst > 0 ? (paidInst / totalInst) * 100 : 0

                              // Only show if we have installments loaded
                              if (totalInst === 0) return null

                              return (
                                <>
                                  <div className="flex justify-between text-xs text-muted-foreground mb-1">
                                    <span>Progreso de Pagos</span>
                                    <span className="font-medium text-gray-700 dark:text-gray-200">{paidInst} de {totalInst} cuotas ({Math.round(percent)}%)</span>
                                  </div>
                                  <Progress value={percent} className="h-2" />
                                </>
                              )
                            })()}
                          </div>
                        </div>

                        <div className="flex flex-col items-end gap-2 min-w-[140px]">
                          {loan.nextDueDate ? (
                            <div className="text-right">
                              <p className="text-xs text-muted-foreground uppercase tracking-wide">{loan.isOverdue ? "Vencido hace" : "Vence en"}</p>
                              <p className={`text-2xl font-bold tabular-nums ${loan.isOverdue ? 'text-red-600' : 'text-gray-900 dark:text-white'}`}>
                                {Math.abs(daysUntil)} <span className="text-sm font-normal text-gray-500">días</span>
                              </p>
                              <p className="text-xs text-gray-500">{formatDate(loan.nextDueDate)}</p>
                            </div>
                          ) : <div className="text-right px-3 py-2 bg-green-100 text-green-700 rounded-md font-medium text-sm">¡Pagado Totalmente!</div>}

                          <div className="flex gap-2 mt-1 w-full justify-end">
                            {loan.nextDueDate && (
                              <Button size="sm" onClick={() => handleOpenPayment(loan)} className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm">
                                <CreditCard className="h-3.5 w-3.5 mr-1.5" /> Pagar
                              </Button>
                            )}
                            <Button variant="ghost" size="sm" onClick={() => confirmDelete(loan.id)} className="text-gray-400 hover:text-red-600 hover:bg-red-50">
                              <Trash2 className="h-4 w-4" />
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

        {/* Diálogos */}
        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>¿Estás seguro de eliminar?</AlertDialogTitle>
              <AlertDialogDescription>
                Esta acción borrará el préstamo y todo su historial de pagos. No se puede deshacer.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={handleDeleteLoan} className="bg-red-600 hover:bg-red-700 text-white">
                Sí, Eliminar
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {resetPasswordDialog()}

        <LoanPaymentDialog
          open={paymentDialogOpen}
          onOpenChange={setPaymentDialogOpen}
          loan={selectedLoanForPayment}
          installments={selectedLoanInstallments}
          onPaymentSuccess={handlePaymentSuccess}
        />

        <NotificationSettingsDialog
          open={notificationSettingsOpen}
          onOpenChange={setNotificationSettingsOpen}
          user={user}
          onUpdateSuccess={handleNotificationUpdate}
        />
      </div>
    </div>
  )
}
