import { LOCAL_ADMIN_TOKEN } from '../../lib/auth/local-admin'
import { verifyBearerToken } from './verify-auth'

const emptyEnv = {} as Env

describe('verifyBearerToken local admin', () => {
    it('localhost의 개발용 토큰만 허용한다', async () => {
        const request = new Request('http://localhost:8788/api/photographs', {
            headers: { Authorization: `Bearer ${LOCAL_ADMIN_TOKEN}` },
        })

        await expect(verifyBearerToken(request, emptyEnv)).resolves.toEqual({ allowed: true })
    })

    it('운영 hostname에서는 개발용 토큰으로 우회할 수 없다', async () => {
        const request = new Request('https://portfolio.example/api/photographs', {
            headers: { Authorization: `Bearer ${LOCAL_ADMIN_TOKEN}` },
        })

        const result = await verifyBearerToken(request, emptyEnv)

        expect(result.allowed).toBe(false)
        if (result.allowed) return
        expect(result.response.status).toBe(500)
    })
})
