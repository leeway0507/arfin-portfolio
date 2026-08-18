import { getAdminLoginMode, isLocalAdminHostname } from './local-admin'

describe('local admin login mode', () => {
    it.each(['localhost', '127.0.0.1', '::1', '[::1]'])('uses direct login on %s', (hostname) => {
        expect(isLocalAdminHostname(hostname)).toBe(true)
        expect(getAdminLoginMode(hostname)).toBe('local')
    })

    it.each(['localhost.example.com', '192.168.0.10', 'portfolio.example.com'])(
        'uses Google login on %s',
        (hostname) => {
            expect(isLocalAdminHostname(hostname)).toBe(false)
            expect(getAdminLoginMode(hostname)).toBe('google')
        },
    )
})
