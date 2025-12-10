"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Pencil,
  Trash2,
  ChevronUp,
  ChevronDown,
  MoreHorizontal,
} from "lucide-react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

export interface Installment {
  id: number
  installmentNumber: number
  dueDate: string | Date
  isPaid: boolean
  status?: string
  amount: number
  loan?: {
    loanCode?: string
    bankName: string
    loanType: string
    monthlyPayment: number
    totalAmount: number
    numberOfInstallments?: number
  }
}

interface CalendarViewProps {
  installments: Installment[]
}

export function CalendarView({ installments }: CalendarViewProps) {
  const router = useRouter()
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedDay, setSelectedDay] = useState<number | null>(null)
  const [dayDetailsOpen, setDayDetailsOpen] = useState(false)
  const [selectedMonth, setSelectedMonth] = useState(currentDate.getMonth())
  const [selectedYear, setSelectedYear] = useState(currentDate.getFullYear())

  // Helper to normalize date comparison (ignore time)
  const isSameDay = (date1: Date, date2: Date) => {
    return (
      date1.getDate() === date2.getDate() &&
      date1.getMonth() === date2.getMonth() &&
      date1.getFullYear() === date2.getFullYear()
    )
  }

  const getDaysInMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate()
  }

  const getFirstDayOfMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay()
  }

  const getInstallmentsForDay = (day: number) => {
    const targetDate = new Date(selectedYear, selectedMonth, day)

    return installments.filter(inst => {
      // Fix: Parse the ISO string (YYYY-MM-DD) manually to avoid timezone shift.
      // E.g. "2025-12-10T00:00:00Z" -> Year: 2025, Month: 12, Day: 10
      // Then create new Date(2025, 11, 10) which is Dec 10th 00:00:00 Local Time.
      // This ensures it appears on the 10th regardless of visual offset.

      let instYear, instMonth, instDay;

      if (inst.dueDate instanceof Date) {
        instYear = inst.dueDate.getFullYear();
        instMonth = inst.dueDate.getMonth();
        instDay = inst.dueDate.getDate();
      } else {
        // Assume ISO string
        const dateStr = String(inst.dueDate).split('T')[0]; // "2025-12-10"
        const [y, m, d] = dateStr.split('-').map(Number);
        instYear = y;
        instMonth = m - 1; // 0-indexed month
        instDay = d;
      }

      // Check if this installment's "calendar date" matches the cell's date
      return (
        instDay === day &&
        instMonth === selectedMonth &&
        instYear === selectedYear
      )
    })
  }

  const navigateMonth = (direction: "prev" | "next") => {
    const newDate = new Date(currentDate)
    if (direction === "prev") {
      newDate.setMonth(newDate.getMonth() - 1)
    } else {
      newDate.setMonth(newDate.getMonth() + 1)
    }
    setCurrentDate(newDate)
    setSelectedMonth(newDate.getMonth())
    setSelectedYear(newDate.getFullYear())
  }

  const handleDayClick = (day: number) => {
    setSelectedDay(day)
    setDayDetailsOpen(true)
  }

  const handleMonthChange = (month: string) => {
    const monthIndex = parseInt(month)
    setSelectedMonth(monthIndex)
    setCurrentDate(new Date(selectedYear, monthIndex, 1))
  }

  const handleYearChange = (year: string) => {
    const yearValue = parseInt(year)
    setSelectedYear(yearValue)
    setCurrentDate(new Date(yearValue, selectedMonth, 1))
  }

  const renderCalendar = () => {
    const daysInMonth = getDaysInMonth(currentDate)
    const firstDay = getFirstDayOfMonth(currentDate)
    const days = []

    // Días vacíos al inicio
    for (let i = 0; i < firstDay; i++) {
      days.push(
        <div key={`empty-${i}`} className="h-20 w-full p-1">
          <div className="h-full w-full rounded-lg bg-gray-50 dark:bg-gray-900"></div>
        </div>
      )
    }

    // Días del mes
    for (let day = 1; day <= daysInMonth; day++) {
      const dayInstallments = getInstallmentsForDay(day)

      days.push(
        <div key={day} className={getDayClass(day)} onClick={() => handleDayClick(day)}>
          <div className="flex flex-col h-full">
            <div className="text-sm font-medium text-gray-900 dark:text-white mb-1">
              {day}
            </div>
            <div className="flex-1 space-y-1 overflow-hidden">
              {dayInstallments.slice(0, 2).map((inst, index) => {
                // Determine status flags
                const isPaid = inst.isPaid // Use boolean source of truth

                // Calculate overdue if not paid
                const today = new Date()
                today.setHours(0, 0, 0, 0)
                // Parse due date safely as we did in getInstallmentsForDay or just assume string comparison if ISO
                let instDate = new Date(inst.dueDate)
                // Adjust if necessary or just compare timestamps (assuming inst.dueDate is correct ISO from DB)
                // To be safe and consistent with getDays logic:
                const d = new Date(inst.dueDate)
                // Fix timezone offset for comparison if needed, or if it's already a Date object
                // If it's a string "YYYY-MM-DD...", new Date() returns UTC usually. 
                // Let's use simple comparison:
                const isOverdue = !isPaid && new Date(inst.dueDate) < today

                // Determine Badge Style
                let badgeClass = "text-xs px-1 py-0 truncate block border-transparent transition-colors shadow-sm text-white"
                let variant: "default" | "secondary" | "destructive" | "outline" = "default"

                if (isPaid) {
                  badgeClass += " bg-green-600 hover:bg-green-700"
                  variant = "secondary" // We override class anyway for specific green
                } else if (isOverdue) {
                  badgeClass += " bg-red-600 hover:bg-red-700"
                  variant = "destructive"
                } else {
                  badgeClass += " bg-yellow-600 hover:bg-yellow-700"
                  variant = "default"
                }

                // Determine Label Text
                // Identifier: Code > Bank > 'Préstamo'
                const identifier = inst.loan?.loanCode || inst.loan?.bankName || 'Préstamo'
                // Status Text
                const statusText = isPaid
                  ? "(Pagado ✅)"
                  : `(S/ ${Number(inst.amount).toFixed(2)})`

                return (
                  <TooltipProvider key={inst.id}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Badge
                          variant={variant}
                          className={badgeClass}
                        >
                          {/* Format: [ID] - C[Num] ([Status]) */}
                          <span className="truncate">
                            {identifier} - C{inst.installmentNumber} {statusText}
                          </span>
                        </Badge>
                      </TooltipTrigger>
                      <TooltipContent>
                        <div className="text-xs space-y-1">
                          <p className="font-semibold">{inst.loan?.bankName}</p>
                          <p>Código: {inst.loan?.loanCode || 'N/A'}</p>
                          <p>Cuota #{inst.installmentNumber} de {inst.loan?.numberOfInstallments ?? '?'}</p>
                          <p>Monto: S/ {Number(inst.amount).toFixed(2)}</p>
                          <p>Estado: {isPaid ? "Pagado" : isOverdue ? "Vencido" : "Pendiente"}</p>
                        </div>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )
              })}
              {dayInstallments.length > 2 && (
                <MoreHorizontal className="h-3 w-3 text-gray-500" />
              )}
            </div>
          </div>
        </div>
      )
    }

    return days
  }

  const getDayClass = (day: number) => {
    const dayInstallments = getInstallmentsForDay(day)
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const isToday =
      today.getDate() === day &&
      today.getMonth() === currentDate.getMonth() &&
      today.getFullYear() === currentDate.getFullYear()

    const cellDate = new Date(selectedYear, selectedMonth, day)
    cellDate.setHours(0, 0, 0, 0)

    // Calculate end of current week (assuming Saturday is end)
    const endOfWeek = new Date(today)
    endOfWeek.setDate(today.getDate() + (6 - today.getDay()))
    endOfWeek.setHours(23, 59, 59, 999)

    // Helper to determine status
    const hasUnpaid = dayInstallments.some(i => !i.isPaid)
    // Only verify "overdue" if it's strictly in the past (before today)
    const isOverdue = hasUnpaid && cellDate < today
    // Pending in current week: Unpaid AND (Today <= Date <= EndOfWeek)
    const isPendingThisWeek = hasUnpaid && cellDate >= today && cellDate <= endOfWeek

    // Base styling
    let baseClass = "h-20 w-full p-1 border rounded-lg transition-colors cursor-pointer flex flex-col"

    // Apply colors based on priority: Overdue (Red) > Pending This Week (Yellow) > Today (Blue) > Default (Gray)
    if (isOverdue) {
      // Red for overdue
      baseClass += " bg-red-50 dark:bg-red-900/40 border-red-200 dark:border-red-800 hover:bg-red-100 dark:hover:bg-red-900/60"
    } else if (isPendingThisWeek) {
      // Yellow for pending this week (including Today)
      baseClass += " bg-yellow-100 dark:bg-yellow-900/40 border-yellow-300 dark:border-yellow-800 hover:bg-yellow-200 dark:hover:bg-yellow-900/60"

      // Add extra visual cue if it is specifically Today + Pending
      if (isToday) {
        baseClass += " ring-2 ring-blue-400 dark:ring-blue-500" // subtle indicator it is still 'today' cursor
      }
    } else if (isToday) {
      // Normal Today (No debts or all paid) -> Blue
      baseClass += " bg-blue-100 dark:bg-blue-900/60 border-blue-300 dark:border-blue-700"
    } else {
      // Default
      baseClass += " border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800"
    }

    return baseClass
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <Button variant="outline" size="icon" onClick={() => navigateMonth("prev")}>
            <ChevronLeft className="h-4 w-4" />
          </Button>

          <h2 className="text-xl font-semibold capitalize">
            {currentDate.toLocaleDateString("es-ES", { month: "long", year: "numeric" })}
          </h2>

          <Button variant="outline" size="icon" onClick={() => navigateMonth("next")}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-7 gap-1 mb-4">
          {["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"].map((day) => (
            <div key={day} className="text-center text-sm font-medium text-gray-500 dark:text-gray-400 py-2">
              {day}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {renderCalendar()}
        </div>
        <div className="mt-4 flex flex-wrap gap-4 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-blue-100 dark:bg-blue-900 border border-blue-300 dark:border-blue-700 rounded"></div>
            <span>Hoy</span>
          </div>
        </div>
      </CardContent>

      <Dialog open={dayDetailsOpen} onOpenChange={setDayDetailsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Detalles del día {selectedDay} de {currentDate.toLocaleDateString("es-ES", { month: "long", year: "numeric" })}
            </DialogTitle>
            <DialogDescription>
              Cuotas programadas para este día
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {selectedDay && getInstallmentsForDay(selectedDay).map((inst) => (
              <div key={inst.id} className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <p className="font-medium">{inst.loan?.bankName || 'Unknown Bank'}</p>
                  <p className="text-sm text-muted-foreground">{inst.loan?.loanType || 'Type'}</p>
                  <p className="text-sm text-muted-foreground">Cuota mensual: S/ {Number(inst.loan?.monthlyPayment)?.toFixed(2) || '0.00'}</p>
                  <p className="text-sm text-muted-foreground">Total: S/ {Number(inst.loan?.totalAmount)?.toFixed(2) || '0.00'}</p>
                </div>
                <Badge variant={inst.status === 'Pagado' ? 'secondary' : inst.status === 'Vencido' ? 'destructive' : 'default'}>
                  {inst.status}
                </Badge>
              </div>
            ))}
            {selectedDay && getInstallmentsForDay(selectedDay).length > 0 && (
              <div className="flex justify-end pt-4 border-t">
                <div className="text-right">
                  <p className="text-lg font-semibold">
                    Total de pago: S/ {getInstallmentsForDay(selectedDay).reduce((sum, inst) => sum + (Number(inst.loan?.monthlyPayment) || 0), 0).toFixed(2)}
                  </p>
                </div>
              </div>
            )}
            {selectedDay && getInstallmentsForDay(selectedDay).length === 0 && (
              <p className="text-center text-muted-foreground py-4">No hay cuotas programadas para este día</p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  )
}
