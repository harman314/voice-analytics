'use client'

import { format, subDays, addDays, isToday } from 'date-fns'

interface DatePickerProps {
  selectedDate: Date
  onChange: (date: Date) => void
}

export function DatePicker({ selectedDate, onChange }: DatePickerProps) {
  const handlePrevious = () => {
    onChange(subDays(selectedDate, 1))
  }

  const handleNext = () => {
    if (!isToday(selectedDate)) {
      onChange(addDays(selectedDate, 1))
    }
  }

  const handleToday = () => {
    onChange(new Date())
  }

  return (
    <div className="flex items-center space-x-2">
      <button
        onClick={handlePrevious}
        className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
        title="Previous day"
      >
        ←
      </button>

      <div className="flex items-center space-x-2">
        <input
          type="date"
          value={format(selectedDate, 'yyyy-MM-dd')}
          onChange={(e) => onChange(new Date(e.target.value))}
          max={format(new Date(), 'yyyy-MM-dd')}
          className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
        {!isToday(selectedDate) && (
          <button
            onClick={handleToday}
            className="px-3 py-2 text-sm bg-indigo-100 text-indigo-700 rounded-lg hover:bg-indigo-200 transition-colors"
          >
            Today
          </button>
        )}
      </div>

      <button
        onClick={handleNext}
        disabled={isToday(selectedDate)}
        className={`p-2 rounded-lg border border-gray-200 transition-colors ${
          isToday(selectedDate)
            ? 'opacity-50 cursor-not-allowed'
            : 'hover:bg-gray-50'
        }`}
        title="Next day"
      >
        →
      </button>
    </div>
  )
}
