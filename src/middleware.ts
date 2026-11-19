import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"

/**
 * MIDDLEWARE — authentification & contrôle d'accès par rôle
 *
 * Performances (cause principale de la lenteur du web) :
 *  - Avant : un appel réseau getUser() vers Supabase sur CHAQUE requête
 *    (pages publiques, préchargements RSC, API...) + une requête profiles.
 *  - Maintenant : rien n'est fait sur les pages publiques ; sur les pages
 *    protégées, getClaims() vérifie le jeton localement quand c'est possible,
 *    et le rôle est mis en cache 5 min dans un cookie signé (HMAC).
 */

const PROTECTED_PREFIXES = [
    '/dashboard', '/marketplace', '/mes-dechets', '/wallet', '/profil', '/chat',
    '/notifications', '/abonnements', '/missions', '/reservations', '/carte',
    '/appels-offres', '/bourse', '/organisation', '/flotte', '/impact-rse',
    '/admin', '/city-os',
]
const AUTH_PREFIXES = ['/connexion', '/inscription']

// Règles d'accès par rôle (le reste des pages protégées est ouvert à tout connecté)
const ROLE_RULES: { prefix: string; roles: string[] }[] = [
    { prefix: '/admin', roles: ['super_admin'] },
    { prefix: '/city-os', roles: ['mairie', 'super_admin'] },
    { prefix: '/organisation', roles: ['organisation_admin', 'mairie', 'super_admin'] },
    { prefix: '/flotte', roles: ['organisation_admin', 'mairie', 'super_admin'] },
    { prefix: '/mes-dechets/publier', roles: ['organisation_admin', 'super_admin'] },
]

const ROLE_COOKIE = 'cz_role'
const ROLE_TTL_SECONDS = 300

const startsWithAny = (path: string, prefixes: string[]) =>
    prefixes.some(p => path === p || path.startsWith(p + '/'))

// ---------- Cookie de rôle signé (HMAC-SHA256, Web Crypto / Edge) ----------
function roleSecret(): string | null {
    return process.env.ROLE_COOKIE_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY || null
}

function b64url(bytes: ArrayBuffer): string {
    let bin = ''
    for (const b of new Uint8Array(bytes)) bin += String.fromCharCode(b)
    return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

async function hmac(payload: string, secret: string): Promise<string> {
    const key = await crypto.subtle.importKey(
        'raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
    )
    return b64url(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(payload)))
}

async function readRoleCookie(req: NextRequest, uid: string): Promise<{ role: string; status: string } | null> {
    const secret = roleSecret()
    const raw = req.cookies.get(ROLE_COOKIE)?.value
    if (!secret || !raw) return null
    const parts = raw.split('.')
    if (parts.length !== 2) return null
    const [payload, sig] = parts
    if ((await hmac(payload, secret)) !== sig) return null
    const [cUid, role, status, exp] = decodeURIComponent(payload).split('|')
    if (cUid !== uid || Number(exp) < Math.floor(Date.now() / 1000)) return null
    return { role, status }
}

async function writeRoleCookie(res: NextResponse, uid: string, role: string, status: string) {
    const secret = roleSecret()
    if (!secret) return
    const exp = Math.floor(Date.now() / 1000) + ROLE_TTL_SECONDS
    const payload = encodeURIComponent(`${uid}|${role}|${status}|${exp}`)
    res.cookies.set(ROLE_COOKIE, `${payload}.${await hmac(payload, secret)}`, {
        httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production',
        path: '/', maxAge: ROLE_TTL_SECONDS,
    })
}

export async function middleware(request: NextRequest) {
    const { pathname, search } = request.nextUrl
    const host = request.headers.get('host') || ''
    const protocol = request.headers.get('x-forwarded-proto') || 'https'
    const isLocal = host.includes('localhost') || host.includes('127.0.0.1')

    // HTTPS + www, SANS changer de domaine (l'ancien code renvoyait vers
    // cleanzone.com alors que le site est déclaré sur cleanzone.tech)
    if (!isLocal && !host.endsWith('.vercel.app')) {
        const isApex = /^cleanzone\.(com|tech)$/.test(host)
        if (protocol === 'http' || isApex) {
            const targetHost = isApex ? `www.${host}` : host
            return NextResponse.redirect(`https://${targetHost}${pathname}${search}`, 301)
        }
    }

    const isProtected = startsWithAny(pathname, PROTECTED_PREFIXES)
    const isAuthPage = startsWithAny(pathname, AUTH_PREFIXES)

    // Pages publiques : aucun appel Supabase
    if (!isProtected && !isAuthPage) return NextResponse.next()

    let response = NextResponse.next({ request: { headers: request.headers } })

    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co',
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder',
        {
            cookies: {
                getAll() {
                    return request.cookies.getAll()
                },
                setAll(cookiesToSet) {
                    cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
                    response = NextResponse.next({ request: { headers: request.headers } })
                    cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options))
                },
            },
        }
    )

    // Vérification locale du JWT si la clé est asymétrique, sinon repli réseau
    const { data: claimsData } = await supabase.auth.getClaims()
    const uid = (claimsData?.claims?.sub as string | undefined) ?? null

    // Redirections conservant les cookies de session rafraîchis
    const redirectTo = (path: string) => {
        const res = NextResponse.redirect(new URL(path, request.url))
        response.cookies.getAll().forEach(c => res.cookies.set(c))
        return res
    }

    if (!uid) {
        if (isProtected) {
            const url = `/connexion?next=${encodeURIComponent(pathname + search)}`
            return redirectTo(url)
        }
        return response
    }

    // Rôle + statut : cookie signé, sinon lecture du profil (puis mise en cache)
    let access = await readRoleCookie(request, uid)
    if (!access) {
        const { data: profile } = await supabase
            .from('profiles')
            .select('role, status')
            .eq('id', uid)
            .single()
        access = { role: profile?.role ?? '', status: profile?.status ?? 'Actif' }
        await writeRoleCookie(response, uid, access.role, access.status)
    }

    // Compte suspendu : uniquement la page de connexion (avec message)
    if (access.status === 'Suspendu') {
        if (isAuthPage) return response
        return redirectTo('/connexion?suspendu=1&message=' + encodeURIComponent("Votre compte est suspendu. Contactez l'administration."))
    }

    if (isAuthPage) return redirectTo('/dashboard')

    const rule = ROLE_RULES
        .filter(r => startsWithAny(pathname, [r.prefix]))
        .sort((a, b) => b.prefix.length - a.prefix.length)[0]
    if (rule && !rule.roles.includes(access.role)) {
        return redirectTo('/dashboard')
    }

    return response
}

export const config = {
    matcher: [
        // Tout sauf les fichiers statiques, les images et les routes API
        '/((?!_next/static|_next/image|api/|favicon.ico|manifest.json|robots.txt|sitemap.xml|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
    ],
}
