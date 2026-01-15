'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const navItems = [
  { href: '/', label: 'Dashboard', icon: '📊' },
  { href: '/calls', label: 'Calls', icon: '📞' },
  { href: '/lag', label: 'Lag Analysis', icon: '⏱️' },
  { href: '/settings', label: 'Settings', icon: '⚙️' },
]

export function Navigation() {
  const pathname = usePathname()

  return (
    <nav className="bg-white border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex">
            {/* Logo */}
            <div className="flex-shrink-0 flex items-center">
              <span className="text-2xl">🎙️</span>
              <span className="ml-2 text-xl font-bold text-gray-900">Voice Analytics</span>
            </div>

            {/* Nav Links */}
            <div className="hidden sm:ml-8 sm:flex sm:space-x-4">
              {navItems.map((item) => {
                const isActive = pathname === item.href ||
                  (item.href !== '/' && pathname.startsWith(item.href))
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`inline-flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                      isActive
                        ? 'bg-indigo-100 text-indigo-700'
                        : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                    }`}
                  >
                    <span className="mr-2">{item.icon}</span>
                    {item.label}
                  </Link>
                )
              })}
            </div>
          </div>

          {/* Right side */}
          <div className="flex items-center space-x-4">
            <a
              href="https://harman-taphealth.vercel.app"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-gray-500 hover:text-indigo-600 transition-colors"
            >
              ← PM Dashboard
            </a>
            <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full">
              v0.1.0
            </span>
          </div>
        </div>
      </div>

      {/* Mobile nav */}
      <div className="sm:hidden border-t border-gray-200">
        <div className="flex justify-around py-2">
          {navItems.map((item) => {
            const isActive = pathname === item.href ||
              (item.href !== '/' && pathname.startsWith(item.href))
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex flex-col items-center px-3 py-2 text-xs font-medium ${
                  isActive ? 'text-indigo-700' : 'text-gray-600'
                }`}
              >
                <span className="text-xl mb-1">{item.icon}</span>
                {item.label}
              </Link>
            )
          })}
        </div>
      </div>
    </nav>
  )
}
