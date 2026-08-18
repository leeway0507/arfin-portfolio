export const LOCAL_ADMIN_SESSION_KEY = 'arfin-local-admin-session'
export const LOCAL_ADMIN_TOKEN = 'arfin-local-development-admin'

export type AdminLoginMode = 'local' | 'google'

export function getAdminLoginMode(hostname: string): AdminLoginMode {
    return isLocalAdminHostname(hostname) ? 'local' : 'google'
}

export function isLocalAdminHostname(hostname: string): boolean {
    return (
        hostname === 'localhost' ||
        hostname === '127.0.0.1' ||
        hostname === '::1' ||
        hostname === '[::1]'
    )
}
