import fixture from '../../scripts/fixtures/hong-kong-photographs-manifest.json'
import type { PhotographManifest } from '../../lib/apis/photographs/types'
import {
    applyPhotographProjectOrder,
    parsePhotographProjectOrderUpdate,
    storePhotographProjectOrder,
} from './photograph-project-order'

const baseManifest = fixture as PhotographManifest
const firstProject = baseManifest.sections[0].projects[0]
const secondProject = { ...firstProject, id: 'second-project', title: 'Second Editorial' }
const otherSection = {
    id: 'cover',
    title: 'Cover',
    projects: [{ ...firstProject, id: 'cover-project' }],
}
const manifest: PhotographManifest = {
    ...baseManifest,
    sections: [
        {
            ...baseManifest.sections[0],
            projects: [firstProject, secondProject],
        },
        otherSection,
    ],
}
const env = { PORTFOLIO_PREFIX: 'test' } as unknown as Env
const reverseUpdate = {
    sectionId: manifest.sections[0].id,
    projectIds: [secondProject.id, firstProject.id],
}

describe('parsePhotographProjectOrderUpdate', () => {
    it('trim한 section ID와 unique project ID 배열을 받는다', () => {
        expect(
            parsePhotographProjectOrderUpdate({
                sectionId: ` ${reverseUpdate.sectionId} `,
                projectIds: reverseUpdate.projectIds,
            }),
        ).toEqual(reverseUpdate)
    })

    it('빈 배열, duplicate, 빈 ID, 200개 초과를 거부한다', () => {
        expect(
            parsePhotographProjectOrderUpdate({ sectionId: 'editorial', projectIds: [] }),
        ).toBeNull()
        expect(
            parsePhotographProjectOrderUpdate({
                sectionId: 'editorial',
                projectIds: ['same', 'same'],
            }),
        ).toBeNull()
        expect(
            parsePhotographProjectOrderUpdate({
                sectionId: 'editorial',
                projectIds: ['valid', ' '],
            }),
        ).toBeNull()
        expect(
            parsePhotographProjectOrderUpdate({
                sectionId: 'editorial',
                projectIds: Array.from({ length: 201 }, (_, index) => `project-${index}`),
            }),
        ).toBeNull()
    })
})

describe('applyPhotographProjectOrder', () => {
    it('소주제 객체와 다른 대주제를 보존하며 배열 순서만 바꾼다', () => {
        const result = applyPhotographProjectOrder(manifest, reverseUpdate)

        expect(result.ok).toBe(true)
        if (!result.ok) return
        expect(result.hasChanges).toBe(true)
        expect(result.section.projects[0]).toBe(secondProject)
        expect(result.section.projects[1]).toBe(firstProject)
        expect(result.manifest.sections[1]).toBe(otherSection)
    })

    it('같은 순서는 manifest를 그대로 반환한다', () => {
        const result = applyPhotographProjectOrder(manifest, {
            sectionId: reverseUpdate.sectionId,
            projectIds: [firstProject.id, secondProject.id],
        })

        expect(result.ok).toBe(true)
        if (!result.ok) return
        expect(result.hasChanges).toBe(false)
        expect(result.manifest).toBe(manifest)
        expect(result.section).toBe(manifest.sections[0])
    })

    it('missing, extra, foreign ID와 없는 section을 거부한다', () => {
        const invalidUpdates = [
            { sectionId: reverseUpdate.sectionId, projectIds: [firstProject.id] },
            {
                sectionId: reverseUpdate.sectionId,
                projectIds: [firstProject.id, secondProject.id, 'extra'],
            },
            {
                sectionId: reverseUpdate.sectionId,
                projectIds: [firstProject.id, otherSection.projects[0].id],
            },
        ]

        invalidUpdates.forEach((update) => {
            expect(applyPhotographProjectOrder(manifest, update)).toEqual(
                expect.objectContaining({ ok: false, status: 400 }),
            )
        })
        expect(
            applyPhotographProjectOrder(manifest, {
                sectionId: 'missing',
                projectIds: reverseUpdate.projectIds,
            }),
        ).toEqual(expect.objectContaining({ ok: false, status: 404 }))
    })
})

describe('storePhotographProjectOrder', () => {
    it('변경 순서를 조건부 저장하고 section과 새 ETag을 반환한다', async () => {
        const put = jest.fn().mockResolvedValue({
            etag: 'next-etag',
            httpEtag: '"next-etag"',
        })
        const bucket = createBucket(put)

        const result = await storePhotographProjectOrder(
            bucket,
            env,
            '"current-etag"',
            reverseUpdate,
        )

        expect(result).toEqual(
            expect.objectContaining({ ok: true, status: 200, httpEtag: '"next-etag"' }),
        )
        expect(put).toHaveBeenCalledTimes(1)
    })

    it('같은 순서는 R2 put 없이 현재 ETag을 반환한다', async () => {
        const put = jest.fn()
        const bucket = createBucket(put)

        const result = await storePhotographProjectOrder(bucket, env, '"current-etag"', {
            sectionId: reverseUpdate.sectionId,
            projectIds: [firstProject.id, secondProject.id],
        })

        expect(result).toEqual(
            expect.objectContaining({ ok: true, status: 200, httpEtag: '"current-etag"' }),
        )
        expect(put).not.toHaveBeenCalled()
    })

    it('stale preflight이면 R2 put을 시도하지 않는다', async () => {
        const put = jest.fn()
        const bucket = createBucket(put)

        const result = await storePhotographProjectOrder(bucket, env, '"stale"', reverseUpdate)

        expect(result).toEqual(expect.objectContaining({ ok: false, status: 412 }))
        expect(put).not.toHaveBeenCalled()
    })

    it('최종 conditional put 충돌을 412로 반환한다', async () => {
        const put = jest.fn().mockResolvedValue(null)
        const bucket = createBucket(put)

        const result = await storePhotographProjectOrder(
            bucket,
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
