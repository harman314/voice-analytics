import { auth } from '@/lib/auth'
import { NextResponse } from 'next/server'

/**
 * Wrapper for API route handlers that require authentication.
 * Returns 401 Unauthorized if user is not authenticated.
 */
export function withAuth<T>(
  handler: (request: Request, session: { user: { email: string; name?: string; image?: string } }) => Promise<NextResponse<T>>
) {
  return async (request: Request) => {
    const session = await auth()

    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    return handler(request, session as { user: { email: string; name?: string; image?: string } })
  }
}
