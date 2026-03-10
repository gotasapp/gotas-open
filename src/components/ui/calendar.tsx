"use client"

import * as React from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export type CalendarProps = {
  mode?: "single" | "multiple" | "range"
  selected?: Date | Date[] | undefined
  onSelect?: (date: Date | undefined) => void
  disabled?: (date: Date) => boolean
  initialFocus?: boolean
  className?: string
}

export function Calendar({
  className,
  mode = "single",
  selected,
  onSelect,
  disabled,
  ...props
}: CalendarProps) {
  // Initialize as null to prevent hydration mismatch, set on client mount
  const [currentMonth, setCurrentMonth] = React.useState<Date | null>(null)

  // Set current date only on client-side to avoid SSR/client mismatch
  React.useEffect(() => {
    setCurrentMonth(new Date())
  }, [])
  
  const handleDateClick = (date: Date) => {
    if (disabled && disabled(date)) return
    if (onSelect) {
      onSelect(date)
    }
  }

  // Return early if currentMonth is not yet set (during SSR or initial client render)
  if (!currentMonth) {
    return <div className={cn("p-3", className)}>Loading...</div>
  }

  const monthStart = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1)
  const monthEnd = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0)
  const startDate = new Date(monthStart)
  startDate.setDate(startDate.getDate() - startDate.getDay())
  
  const dates = []
  const date = new Date(startDate)
  
  while (date <= monthEnd || dates.length % 7 !== 0) {
    dates.push(new Date(date))
    date.setDate(date.getDate() + 1)
  }
  
  const isSelected = (date: Date) => {
    if (!selected) return false
    if (mode === "single" && selected instanceof Date) {
      return date.toDateString() === selected.toDateString()
    }
    return false
  }
  
  const previousMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1))
  }
  
  const nextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1))
  }
  
  return (
    <div className={cn("p-3", className)} {...props}>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Button
            variant="outline"
            size="icon"
            className="h-7 w-7"
            onClick={previousMonth}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="text-sm font-medium">
            {currentMonth.toLocaleDateString("pt-BR", { month: "long", year: "numeric" })}
          </div>
          <Button
            variant="outline"
            size="icon"
            className="h-7 w-7"
            onClick={nextMonth}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        <div className="grid grid-cols-7 gap-1 text-center text-xs">
          {["D", "S", "T", "Q", "Q", "S", "S"].map((day, i) => (
            <div key={i} className="text-muted-foreground">
              {day}
            </div>
          ))}
          {dates.map((date, i) => {
            const isDisabled = disabled && disabled(date)
            const isCurrentMonth = date.getMonth() === currentMonth.getMonth()
            const isToday = date.toDateString() === new Date().toDateString()
            
            return (
              <Button
                key={i}
                variant={isSelected(date) ? "default" : "ghost"}
                size="sm"
                className={cn(
                  "h-8 w-8 p-0 font-normal",
                  !isCurrentMonth && "text-muted-foreground opacity-50",
                  isDisabled && "opacity-50 cursor-not-allowed",
                  isToday && "border border-primary",
                  isSelected(date) && "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground"
                )}
                disabled={isDisabled}
                onClick={() => handleDateClick(date)}
              >
                {date.getDate()}
              </Button>
            )
          })}
        </div>
      </div>
    </div>
  )
} 