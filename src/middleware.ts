import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"

export async function middleware(request: NextRequest) {
    let response = NextResponse.next({
        request: {
            headers: request.headers,
        },
    })

    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co',
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder',
        {
            cookies: {
                getAll() {
                    return request.cookies.getAll()
                },
                setAll(cookiesToSet) {
                    cookiesToSet.forEach(({ name, value, options }) =>
                        request.cookies.set(name, value)
                    )
                    response = NextResponse.next({
                        request: {
                            headers: request.headers,
                        },
                    })
                    cookiesToSet.forEach(({ name, value, options }) =>
                        response.cookies.set(name, value, options)
                    )
                },
            },
        }
    )

    const {
        data: { user },
    } = await supabase.auth.getUser()

    const pathname = request.nextUrl.pathname

    // Auth pages (login / inscription)
    const isAuthPage = pathname.startsWith('/connexion') || pathname.startsWith('/inscription')

    // All protected routes (require authentication)
    const protectedPaths = [
        '/dashboard',
        '/marketplace',
        '/mes-dechets',
        '/wallet',
        '/profil',
        '/chat',
        '/notifications',
        '/abonnements',
        '/missions',
        '/reservations',
        '/carte',
        '/appels-offres',
        '/bourse',
        '/organisation',
        '/admin',
        '/city-os',
    ]
    const isDashboardRoute = protectedPaths.some(p => pathname.startsWith(p))

    if (!user && isDashboardRoute) {
        return NextResponse.redirect(new URL('/connexion', request.url))
    }

    if (user && isAuthPage) {
        return NextResponse.redirect(new URL('/dashboard', request.url))
    }

    // Admin role check (Strictly Super Admin for /admin)
    if (user && pathname.startsWith('/admin')) {
        const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single()

        if (profile?.role !== 'super_admin') {
            return NextResponse.redirect(new URL('/dashboard', request.url))
        }
    }

    return response
}

export const config = {
    matcher: [
        /*
         * Match all request paths except for the ones starting with:
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         * Feel free to modify this pattern to include more paths.
         */
        '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
    ],
}
