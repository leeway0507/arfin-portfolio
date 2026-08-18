import fixture from '../../scripts/fixtures/hong-kong-photographs-manifest.json'
import type { PhotographManifest } from '../../lib/apis/photographs/types'
import { MAX_PHOTOGRAPH_SECTIONS } from './photograph-constraints'
import {
    applyPhotographSectionOrder,
    parsePhotographSectionOrderUpdate,
    storePhotographSectionOrder,
} from './photograph-section-order'

const baseManifest = fixture as PhotographManifest
const editorialSection = baseManifest.sections[0]
const coverSection = {
    id: 'cover',
    title: 'Cover Highlights',
    projects: editorialSection.projects.map((project) => ({
        ...project,
        id: `cover-${project.id}`,
    })),
}
const manifest: PhotographManifest = {
    ...baseManifest,
    sections: [editorialSection, coverSection],
}
const env = { PORTFOLIO_PREFIX: 'test' } as unknown as Env
const reverseUpdate = { sectionIds: [coverSection.id, editorialSection.id] }

describe('parsePhotographSectionOrderUpdate', () => {
    it('unique section ID 배열을 받는다', () => {
        expect(parsePhotographSectionOrderUpdate(reverseUpdate)).toEqual(reverseUpdate)
    })

    it('빈 배열, duplicate, 빈 ID, 최대 개수 초과를 거부한다', () => {
        expect(parsePhotographSectionOrderUpdate({ sectionIds: [] })).toBeNull()
        expect(parsePhotographSectionOrderUpdate({ sectionIds: ['same', 'same'] })).toBeNull()
        expect(parsePhotographSectionOrderUpdate({ sectionIds: ['valid', ' '] })).toBeNull()
        expect(
            parsePhotographSectionOrderUpdate({
                sectionIds: Array.from(
                    { length: MAX_PHOTOGRAPH_SECTIONS + 1 },
                    (_, index) => `section-${index}`,
                ),
            }),
        ).toBeNull()
    })
})

describe('applyPhotographSectionOrder', () => {
    it('중첩 프로젝트 metadata를 보존하며 대주제 배열 순서만 바꾼다', () => {
        const result = applyPhotographSectionOrder(manifest, reverseUpdate)

        expect(result.ok).toBe(true)
        if (!result.ok) return
        expect(result.hasChanges).toBe(true)
        expect(result.sections[0]).toBe(coverSection)
        expect(result.sections[1]).toBe(editorialSection)
        expect(result.sections[1].projects[0]).toBe(editorialSection.projects[0])
    })

    it('같은 순서는 manifest와 sections를 그대로 반환한다', () => {
        const result = applyPhotographSectionOrder(manifest, {
            sectionIds: [editorialSection.id, coverSection.id],
        })

        expect(result.ok).toBe(true)
        if (!result.ok) return
        expect(result.hasChanges).toBe(false)
        expect(result.manifest).toBe(manifest)
        expect(result.sections).toBe(manifest.sections)
    })

    it('missing, extra, duplicate, unknown ID를 거부한다', () => {
        const invalidUpdates = [
            { sectionIds: [editorialSection.id] },
            { sectionIds: [editorialSection.id, coverSection.id, 'extra'] },
            { sectionIds: [editorialSection.id, editorialSection.id] },
            { sectionIds: [editorialSection.id, 'unknown'] },
        ]

        invalidUpdates.forEach((update) => {
            expect(applyPhotographSectionOrder(manifest, update)).toEqual(
                expect.objectContaining({ ok: false, status: 400 }),
            )
        })
    })
})

describe('storePhotographSectionOrder', () => {
    it('변경 순서를 조건부 저장하고 전체 sections와 새 ETag을 반환한다', async () => {
        const put = jest.fn().mockResolvedValue({
            etag: 'next-etag',
            httpEtag: '"next-etag"',
        })

        const result = await storePhotographSectionOrder(
            createBucket(put),
            env,
            '"current-etag"',
            reverseUpdate,
        )

        expect(result).toEqual(
            expect.objectContaining({
                ok: true,
                status: 200,
                sections: [coverSection, editorialSection],
                httpEtag: '"next-etag"',
            }),
        )
        expect(put).toHaveBeenCalledTimes(1)
    })

    it('같은 순서는 R2 put 없이 현재 ETag을 반환한다', async () => {
        const put = jest.fn()

        const result = await storePhotographSectionOrder(createBucket(put), env, '"current-etag"', {
            sectionIds: [editorialSection.id, coverSection.id],
        })

        expect(result).toEqual(
            expect.objectContaining({ ok: true, status: 200, httpEtag: '"current-etag"' }),
        )
        expect(put).not.toHaveBeenCalled()
    })

    it('stale preflight이면 semantic validation과 R2 put보다 먼저 412를 반환한다', async () => {
        const put = jest.fn()

        const result = await storePhotographSectionOrder(createBucket(put), env, '"stale"', {
            sectionIds: ['invalid'],
        })

        expect(result).toEqual(expect.objectContaining({ ok: false, status: 412 }))
        expect(put).not.toHaveBeenCalled()
    })

    it('최종 conditional put 충돌을 412로 반환한다', async () => {
        const put = jest.fn().mockResolvedValue(null)

        const result = await storePhotographSectionOrder(
            createBucket(put),
            env,
            '"current-etag"',
            reverseUpdate,
        )

        expect(result).toEqual(expect.objectContaining({ ok: false, status: 412 }))
        expect(put).toHaveBeenCalledTimes(1)
    })
})

function createBucket(put: jest.Mock): R2Bucket {
    const get = jest.fn().mockResolvedValue({
        body: true,
        json: jest.fn().mockResolvedValue(manifest),
        etag: 'current-etag',
        httpEtag: '"current-etag"',
    })
    return { get, put } as unknown as R2Bucket
}
