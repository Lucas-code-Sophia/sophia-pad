"use client"

import { forwardRef } from "react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

interface TimeInputProps {
  value?: string
  onChange?: (value: string) => void
  className?: string
}

const TimeInput = forwardRef<HTMLDivElement, TimeInputProps>(
  ({ value, onChange, className }, ref) => {
    // Générer toutes les heures avec minutes par 15
    const generateTimeOptions = () => {
      const options = []
      for (let hour = 0; hour < 24; hour++) {
        for (let minute = 0; minute < 60; minute += 15) {
          const time = `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`
          options.push(time)
        }
      }
      return options
    }

    const currentValue = value || ""

    return (
      <Select value={currentValue} onValueChange={onChange}>
        <SelectTrigger className={className}>
          <SelectValue placeholder="--:--">
            {currentValue || "--:--"}
          </SelectValue>
        </SelectTrigger>
        <SelectContent className="bg-slate-800 border-slate-700 max-h-60">
          {generateTimeOptions().map((time) => (
            <SelectItem 
              key={time} 
              value={time}
              className="text-white hover:bg-slate-700"
            >
              {time}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    )
  }
)

TimeInput.displayName = "TimeInput"

export { TimeInput }
