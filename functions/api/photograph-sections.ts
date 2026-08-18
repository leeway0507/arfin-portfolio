import type { PhotographSectionMetadata } from '../../lib/apis/photographs/types'
import {
    parsePhotographSectionCreation,
    storePhotographSectionCreation,
} from '../lib/photograph-section-create'
import {
    parsePhotographSectionDeletion,
    storePhotographSectionDeletion,
} from '../lib/photograph-section-delete'
import {
    parsePhotographSectionRename,
    storePhotographSectionRename,
} from '../lib/photograph-section-rename'
import { verifyBearerToken } from '../lib/verify-auth'

export const onRequestPost: PagesFunction<Env> = async (context) => {
    const auth = await verifyBearerToken(context.request, context.env as Env)
    if (!auth.allowed) return auth.response

    const expectedEtag = context.request.headers.get('If-Match')
    if (!expectedEtag) {
        return Response.json({ error: 'If-Match 헤더가 필요합니다.' }, { status: 428 })
    }

    let body: unknown
    try {
        body = await context.request.json()
    } catch {
        return Response.json({ error: 'JSON body가 필요합니다.' }, { status: 400 })
    }

    const creation = parsePhotographSectionCreation(body)
    if (!creation) {
        return Response.json(
            { error: '대주제 이름은 1자 이상 120자 이하로 입력해 주세요.' },
            { status: 400 },
        )
    }

    try {
        const env = context.env as Env
        const result = await storePhotographSectionCreation(
            env.PORTFOLIO,
            env,
            expectedEtag,
            creation,
        )
        if (!result.ok) {
            return Response.json({ error: result.error }, { status: result.status })
        }

        return Response.json(
            { section: result.section },
            {
                status: result.status,
                headers: {
                    ETag: result.httpEtag,
                    'Cache-Control': 'no-store',
                },
            },
        )
    } catch (error) {
        console.error('Photographs 대주제 생성 실패:', error)
        return Response.json({ error: 'Photographs 대주제를 만들지 못했습니다.' }, { status: 500 })
    }
}

export const onRequestPatch: PagesFunction<Env> = async (context) => {
    const auth = await verifyBearerToken(context.request, context.env as Env)
    if (!auth.allowed) return auth.response

    const expectedEtag = context.request.headers.get('If-Match')
    if (!expectedEtag) {
        return Response.json({ error: 'If-Match 헤더가 필요합니다.' }, { status: 428 })
    }

    let body: unknown
    try {
        body = await context.request.json()
    } catch {
        return Response.json({ error: 'JSON body가 필요합니다.' }, { status: 400 })
    }

    const rename = parsePhotographSectionRename(body)
    if (!rename) {
        return Response.json(
            { error: '대주제 식별자와 1자 이상 120자 이하 이름이 필요합니다.' },
            { status: 400 },
        )
    }

    try {
        const env = context.env as Env
        const result = await storePhotographSectionRename(env.PORTFOLIO, env, expectedEtag, rename)
        if (!result.ok) {
            return Response.json({ error: result.error }, { status: result.status })
        }
        return createSectionsResponse(result.sections, result.httpEtag, result.status)
    } catch (error) {
        console.error('Photographs 대주제 이름 수정 실패:', error)
        return Response.json(
            { error: 'Photographs 대주제 이름을 수정하지 못했습니다.' },
            { status: 500 },
        )
    }
}

export const onRequestDelete: PagesFunction<Env> = async (context) => {
    const auth = await verifyBearerToken(context.request, context.env as Env)
    if (!auth.allowed) return auth.response

    const expectedEtag = context.request.headers.get('If-Match')
    if (!expectedEtag) {
        return Response.json({ error: 'If-Match 헤더가 필요합니다.' }, { status: 428 })
    }

    let body: unknown
    try {
        body = await context.request.json()
    } catch {
        return Response.json({ error: 'JSON body가 필요합니다.' }, { status: 400 })
    }

    const deletion = parsePhotographSectionDeletion(body)
    if (!deletion) {
        return Response.json({ error: '삭제할 대주제 식별자가 필요합니다.' }, { status: 400 })
    }

    try {
        const env = context.env as Env
        const result = await storePhotographSectionDeletion(
            env.PORTFOLIO,
            env,
            expectedEtag,
            deletion,
        )
        if (!result.ok) {
            return Response.json({ error: result.error }, { status: result.status })
        }
        return createSectionsResponse(result.sections, result.httpEtag, result.status)
    } catch (error) {
        console.error('Photographs 대주제 삭제 실패:', error)
        return Response.json(
            { error: 'Photographs 대주제를 삭제하지 못했습니다.' },
            { status: 500 },
        )
    }
}

function createSectionsResponse(
    sections: PhotographSectionMetadata[],
    httpEtag: string,
    status: number,
): Response {
    return Response.json(
        { sections },
        {
            status,
            headers: {
                ETag: httpEtag,
                'Cache-Control': 'no-store',
            },
        },
    )
}
