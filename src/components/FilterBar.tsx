'use client'

interface FilterBarProps {
  callType: 'all' | 'welcome' | 'daily'
  onCallTypeChange: (type: 'all' | 'welcome' | 'daily') => void
  excludeInternalUsers: boolean
  onExcludeInternalUsersChange: (exclude: boolean) => void
}

export function FilterBar({
  callType,
  onCallTypeChange,
  excludeInternalUsers,
  onExcludeInternalUsersChange,
}: FilterBarProps) {
  return (
    <div className="flex flex-wrap items-center gap-4">
      {/* Call Type Filter */}
      <div className="flex items-center space-x-1 bg-gray-100 rounded-lg p-1">
        {[
          { value: 'all' as const, label: 'All Calls' },
          { value: 'welcome' as const, label: '👋 Welcome' },
          { value: 'daily' as const, label: '📅 Daily' },
        ].map((option) => (
          <button
            key={option.value}
            onClick={() => onCallTypeChange(option.value)}
            className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
              callType === option.value
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>

      {/* Internal Users Toggle */}
      <label className="flex items-center space-x-2 cursor-pointer">
        <input
          type="checkbox"
          checked={excludeInternalUsers}
          onChange={(e) => onExcludeInternalUsersChange(e.target.checked)}
          className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
        />
        <span className="text-sm text-gray-600">Exclude internal users</span>
      </label>
    </div>
  )
}
