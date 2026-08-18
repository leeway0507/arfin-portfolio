import fixture from '../../scripts/fixtures/hong-kong-photographs-manifest.json'
import type { PhotographManifest } from '../../lib/apis/photographs/types'
import {
    applyPhotographSectionRename,
    parsePhotographSectionRename,
    storePhotographSectionRename,
} from './photograph-section-rename'

const baseManifest = fixture as PhotographManifest
const editorialSection = baseManifest.sections[0]
const coverSection = { id: 'cover', title: 'Cover Highlights', projects: [] }
const manifest: PhotographManifest = {
    ...baseManifest,
    sections: [editorialSection, coverSection],
}
const env = { PORTFOLIO_PREFIX: 'test' } as unknown as Env

describe('parsePhotographSectionRename', () => {
    it('section ID와 제목을 trim해 받는다', () => {
        expect(
            parsePhotographSectionRename({
                sectionId: ' editorial ',
                title: ' Editorial Highlights ',
            }),
        ).toEqual({ sectionId: 'editorial', title: 'Editorial Highlights' })
    })

    it('누락·빈 값·120자 초과 제목을 거부한다', () => {
        expect(parsePhotographSectionRename({ sectionId: '', title: 'Title' })).toBeNull()
        expect(parsePhotographSectionRename({ sectionId: 'editorial', title: ' ' })).toBeNull()
        expect(
            parsePhotographSectionRename({ sectionId: 'editorial', title: 'a'.repeat(121) }),
        ).toBeNull()
    })
})

describe('applyPhotographSectionRename', () => {
    it('ID·projects·배열 위치와 다른 대주제를 보존하며 제목만 바꾼다', () => {
        const result = applyPhotographSectionRename(manifest, {
            sectionId: editorialSection.id,
            title: 'Editorial Highlights',
        })

        expect(result.ok).toBe(true)
        if (!result.ok) return
        expect(result.hasChanges).toBe(true)
        expect(result.sections[0]).toEqual({
            ...editorialSection,
            title: 'Editorial Highlights',
        })
        expect(result.sections[0].projects).toBe(editorialSection.projects)
        expect(result.sections[1]).toBe(coverSection)
    })

    it('저장 문자열과 정확히 같은 제목만 no-op으로 처리한다', () => {
        const exactResult = applyPhotographSectionRename(manifest, {
            sectionId: editorialSection.id,
            title: editorialSection.title,
        })
        const displayChangeResult = applyPhotographSectionRename(manifest, {
            sectionId: editorialSection.id,
            title: editorialSection.title.toUpperCase(),
        })

        expect(exactResult).toEqual(
            expect.objectContaining({ ok: true, hasChanges: false, manifest }),
        )
        expect(displayChangeResult).toEqual(expect.objectContaining({ ok: true, hasChanges: true }))
    })

    it('없는 section은 404, 정규화 기준 다른 section과 중복이면 409를 반환한다', () => {
        expect(
            applyPhotographSectionRename(manifest, {
                sectionId: 'missing',
                title: 'Missing',
            }),
        ).toEqual(expect.objectContaining({ ok: false, status: 404 }))
        expect(
            applyPhotographSectionRename(manifest, {
                sectionId: editorialSection.id,
                title: 'ｃｏｖｅｒ   highlights',
            }),
        ).toEqual(expect.objectContaining({ ok: false, status: 409 }))
    })
})

describe('storePhotographSectionRename', () => {
    it('정규화값만 같은 표시 변경도 조건부 저장한다', async () => {
        const put = jest.fn().mockResolvedValue({
            etag: 'next-etag',
            httpEtag: '"next-etag"',
        })

        const result = await storePhotographSectionRename(
            createBucket(put),
            env,
            '"current-etag"',
            { sectionId: editorialSection.id, title: editorialSection.title.toUpperCase() },
        )

        expect(result).toEqual(expect.objectContaining({ ok: true, httpEtag: '"next-etag"' }))
        expect(put).toHaveBeenCalledTimes(1)
    })

    it('exact no-op은 R2 put 없이 현재 ETag을 반환한다', async () => {
        const put = jest.fn()

        const result = await storePhotographSectionRename(
            createBucket(put),
            env,
            '"current-etag"',
            { sectionId: editorialSection.id, title: editorialSection.title },
        )

        expect(result).toEqual(expect.objectContaining({ ok: true, httpEtag: '"current-etag"' }))
        expect(put).not.toHaveBeenCalled()
    })

    it('stale preflight이면 semantic validation과 put 전에 412를 반환한다', async () => {
        const put = jest.fn()

        const result = await storePhotographSectionRename(createBucket(put), env, '"stale"', {
            sectionId: 'missing',
            title: 'Missing',
        })

        expect(result).toEqual(expect.objectContaining({ ok: false, status: 412 }))
        expect(put).not.toHaveBeenCalled()
    })

    it('최종 conditional put 충돌을 412로 반환한다', async () => {
        const put = jest.fn().mockResolvedValue(null)

        const result = await storePhotographSectionRename(
            createBucket(put),
            env,
            '"current-etag"',
            { sectionId: editorialSection.id, title: 'Editorial Highlights' },
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
