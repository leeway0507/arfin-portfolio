import fixture from '../../scripts/fixtures/hong-kong-photographs-manifest.json'
import type { PhotographManifest } from '../../lib/apis/photographs/types'
import {
    applyPhotographSectionDeletion,
    parsePhotographSectionDeletion,
    storePhotographSectionDeletion,
} from './photograph-section-delete'

const baseManifest = fixture as PhotographManifest
const editorialSection = baseManifest.sections[0]
const firstEmptySection = { id: 'cover', title: 'Cover Highlights', projects: [] }
const secondEmptySection = { id: 'advertising', title: 'Advertising', projects: [] }
const manifest: PhotographManifest = {
    ...baseManifest,
    sections: [firstEmptySection, editorialSection, secondEmptySection],
}
const env = { PORTFOLIO_PREFIX: 'test' } as unknown as Env

describe('parsePhotographSectionDeletion', () => {
    it('section ID를 trim해 받고 누락·빈 값을 거부한다', () => {
        expect(parsePhotographSectionDeletion({ sectionId: ' cover ' })).toEqual({
            sectionId: 'cover',
        })
        expect(parsePhotographSectionDeletion({ sectionId: '' })).toBeNull()
        expect(parsePhotographSectionDeletion({})).toBeNull()
    })
})

describe('applyPhotographSectionDeletion', () => {
    it.each([
        [firstEmptySection.id, [editorialSection, secondEmptySection]],
        [secondEmptySection.id, [firstEmptySection, editorialSection]],
    ])('빈 첫·마지막 대주제를 순서대로 삭제한다', (sectionId, expectedSections) => {
        const result = applyPhotographSectionDeletion(manifest, { sectionId })

        expect(result.ok).toBe(true)
        if (!result.ok) return
        expect(result.sections).toEqual(expectedSections)
    })

    it('빈 중간 대주제와 마지막 남은 빈 대주제도 삭제한다', () => {
        const middleManifest: PhotographManifest = {
            ...baseManifest,
            sections: [editorialSection, firstEmptySection, secondEmptySection],
        }
        const middleResult = applyPhotographSectionDeletion(middleManifest, {
            sectionId: firstEmptySection.id,
        })
        const lastResult = applyPhotographSectionDeletion(
            { ...baseManifest, sections: [firstEmptySection] },
            { sectionId: firstEmptySection.id },
        )

        expect(middleResult).toEqual(
            expect.objectContaining({ ok: true, sections: [editorialSection, secondEmptySection] }),
        )
        expect(lastResult).toEqual(expect.objectContaining({ ok: true, sections: [] }))
    })

    it('없는 section은 404, 소주제가 있는 section은 409를 반환한다', () => {
        expect(applyPhotographSectionDeletion(manifest, { sectionId: 'missing' })).toEqual(
            expect.objectContaining({ ok: false, status: 404 }),
        )
        expect(
            applyPhotographSectionDeletion(manifest, { sectionId: editorialSection.id }),
        ).toEqual(expect.objectContaining({ ok: false, status: 409 }))
    })
})

describe('storePhotographSectionDeletion', () => {
    it('빈 section만 조건부 저장하고 asset delete는 호출하지 않는다', async () => {
        const put = jest.fn().mockResolvedValue({
            etag: 'next-etag',
            httpEtag: '"next-etag"',
        })
        const deleteObject = jest.fn()

        const result = await storePhotographSectionDeletion(
            createBucket(put, deleteObject),
            env,
            '"current-etag"',
            { sectionId: firstEmptySection.id },
        )

        expect(result).toEqual(expect.objectContaining({ ok: true, httpEtag: '"next-etag"' }))
        expect(put).toHaveBeenCalledTimes(1)
        expect(deleteObject).not.toHaveBeenCalled()
    })

    it('non-empty delete는 R2 put 없이 409를 반환한다', async () => {
        const put = jest.fn()

        const result = await storePhotographSectionDeletion(
            createBucket(put),
            env,
            '"current-etag"',
            { sectionId: editorialSection.id },
        )

        expect(result).toEqual(expect.objectContaining({ ok: false, status: 409 }))
        expect(put).not.toHaveBeenCalled()
    })

    it('stale preflight이면 section 검사와 put 전에 412를 반환한다', async () => {
        const put = jest.fn()

        const result = await storePhotographSectionDeletion(createBucket(put), env, '"stale"', {
            sectionId: 'missing',
        })

        expect(result).toEqual(expect.objectContaining({ ok: false, status: 412 }))
        expect(put).not.toHaveBeenCalled()
    })

    it('최종 conditional put 충돌을 412로 반환한다', async () => {
        const put = jest.fn().mockResolvedValue(null)

        const result = await storePhotographSectionDeletion(
            createBucket(put),
            env,
            '"current-etag"',
            { sectionId: firstEmptySection.id },
        )

        expect(result).toEqual(expect.objectContaining({ ok: false, status: 412 }))
        expect(put).toHaveBeenCalledTimes(1)
    })
})

function createBucket(put: jest.Mock, deleteObject = jest.fn()): R2Bucket {
    const get = jest.fn().mockResolvedValue({
        body: true,
        json: jest.fn().mockResolvedValue(manifest),
        etag: 'current-etag',
        httpEtag: '"current-etag"',
    })
    return { get, put, delete: deleteObject } as unknown as R2Bucket
}
