interface StatsCardProps {
  title: string
  value: string | number
  subtitle?: string
  icon: string
  trend?: 'up' | 'down' | 'neutral'
  trendValue?: string
}

export function StatsCard({ title, value, subtitle, icon, trend, trendValue }: StatsCardProps) {
  const trendColor = trend === 'up' ? 'text-green-600' : trend === 'down' ? 'text-red-600' : 'text-gray-500'
  const trendIcon = trend === 'up' ? '↑' : trend === 'down' ? '↓' : ''

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-500">{title}</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
          {subtitle && (
            <p className="text-xs text-gray-400 mt-1">{subtitle}</p>
          )}
          {trendValue && (
            <p className={`text-xs mt-2 ${trendColor}`}>
              {trendIcon} {trendValue}
            </p>
          )}
        </div>
        <div className="text-3xl">{icon}</div>
      </div>
    </div>
  )
}
