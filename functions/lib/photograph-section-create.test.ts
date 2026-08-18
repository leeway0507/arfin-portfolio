import fixture from '../../scripts/fixtures/hong-kong-photographs-manifest.json'
import type { PhotographManifest } from '../../lib/apis/photographs/types'
import { MAX_PHOTOGRAPH_SECTIONS } from './photograph-constraints'
import {
    applyPhotographSectionCreation,
    parsePhotographSectionCreation,
    storePhotographSectionCreation,
} from './photograph-section-create'

const baseManifest = fixture as PhotographManifest
const env = { PORTFOLIO_PREFIX: 'test' } as unknown as Env

describe('parsePhotographSectionCreation', () => {
    it('대주제 이름을 trim해 받는다', () => {
        expect(parsePhotographSectionCreation({ title: '  Cover Highlights  ' })).toEqual({
            title: 'Cover Highlights',
        })
    })

    it('빈 이름과 120자 초과 이름을 거부한다', () => {
        expect(parsePhotographSectionCreation({ title: ' ' })).toBeNull()
        expect(parsePhotographSectionCreation({ title: 'a'.repeat(121) })).toBeNull()
        expect(parsePhotographSectionCreation(null)).toBeNull()
    })
})

describe('applyPhotographSectionCreation', () => {
    it('기존 대주제를 보존하고 빈 대주제를 마지막에 추가한다', () => {
        const result = applyPhotographSectionCreation(baseManifest, {
            id: 'section-cover',
            title: 'Cover Highlights',
        })

        expect(result.ok).toBe(true)
        if (!result.ok) return
        expect(result.manifest.sections.slice(0, -1)).toEqual(baseManifest.sections)
        expect(result.manifest.sections.at(-1)).toEqual({
            id: 'section-cover',
            title: 'Cover Highlights',
            projects: [],
        })
    })

    it('NFKC·대소문자·연속 공백 기준 중복 이름과 중복 ID를 거부한다', () => {
        const duplicateTitleManifest: PhotographManifest = {
            ...baseManifest,
            sections: [
                ...baseManifest.sections,
                { id: 'section-cover', title: 'Cover   Highlights', projects: [] },
            ],
        }

        expect(
            applyPhotographSectionCreation(duplicateTitleManifest, {
                id: 'section-other',
                title: 'ｃｏｖｅｒ highlights',
            }),
        ).toEqual(expect.objectContaining({ ok: false, status: 409 }))
        expect(
            applyPhotographSectionCreation(duplicateTitleManifest, {
                id: 'section-cover',
                title: 'New Section',
            }),
        ).toEqual(expect.objectContaining({ ok: false, status: 409 }))
    })

    it('대주제 공용 최대 개수를 넘는 생성을 거부한다', () => {
        const fullManifest: PhotographManifest = {
            ...baseManifest,
            sections: Array.from({ length: MAX_PHOTOGRAPH_SECTIONS }, (_, index) => ({
                id: `section-${index}`,
                title: `Section ${index}`,
                projects: [],
            })),
        }

        expect(
            applyPhotographSectionCreation(fullManifest, {
                id: 'section-new',
                title: 'New Section',
            }),
        ).toEqual(expect.objectContaining({ ok: false, status: 409 }))
    })
})

describe('storePhotographSectionCreation', () => {
    it('UUID 충돌을 건너뛰고 조건부 저장한 section과 새 ETag을 반환한다', async () => {
        const manifest: PhotographManifest = {
            ...baseManifest,
            sections: [
                ...baseManifest.sections,
                { id: 'section-collision', title: 'Existing', projects: [] },
            ],
        }
        const put = jest.fn().mockResolvedValue({
            etag: 'next-etag',
            httpEtag: '"next-etag"',
        })
        const createUuid = jest
            .fn<ReturnType<() => string>, Parameters<() => string>>()
            .mockReturnValueOnce('collision')
            .mockReturnValueOnce('unique')

        const result = await storePhotographSectionCreation(
            createBucket(manifest, put),
            env,
            '"current-etag"',
            { title: 'Cover Highlights' },
            createUuid,
        )

        expect(result).toEqual(
            expect.objectContaining({
                ok: true,
                status: 201,
                httpEtag: '"next-etag"',
                section: expect.objectContaining({ id: 'section-unique' }),
            }),
        )
        expect(createUuid).toHaveBeenCalledTimes(2)
        expect(put).toHaveBeenCalledTimes(1)
    })

    it('stale preflight이면 중복 검사나 R2 put 전에 412를 반환한다', async () => {
        const put = jest.fn()
        const bucket = createBucket(baseManifest, put)

        const result = await storePhotographSectionCreation(bucket, env, '"stale"', {
            title: baseManifest.sections[0].title,
        })

        expect(result).toEqual(expect.objectContaining({ ok: false, status: 412 }))
        expect(put).not.toHaveBeenCalled()
    })

    it('중복 이름이면 R2 put 없이 409를 반환한다', async () => {
        const put = jest.fn()

        const result = await storePhotographSectionCreation(
            createBucket(baseManifest, put),
            env,
            '"current-etag"',
            { title: ` ${baseManifest.sections[0].title.toUpperCase()} ` },
            () => 'unique',
        )

        expect(result).toEqual(expect.objectContaining({ ok: false, status: 409 }))
        expect(put).not.toHaveBeenCalled()
    })

    it('최종 conditional put 충돌을 412로 반환한다', async () => {
        const put = jest.fn().mockResolvedValue(null)

        const result = await storePhotographSectionCreation(
            createBucket(baseManifest, put),
            env,
            '"current-etag"',
            { title: 'Cover Highlights' },
            () => 'unique',
        )

        expect(result).toEqual(expect.objectContaining({ ok: false, status: 412 }))
        expect(put).toHaveBeenCalledTimes(1)
    })
})

function createBucket(manifest: PhotographManifest, put: jest.Mock): R2Bucket {
    const get = jest.fn().mockResolvedValue({
        body: true,
        json: jest.fn().mockResolvedValue(manifest),
        etag: 'current-etag',
        httpEtag: '"current-etag"',
    })
    return { get, put } as unknown as R2Bucket
}
