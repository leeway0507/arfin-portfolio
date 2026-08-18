import fixture from '../../scripts/fixtures/hong-kong-photographs-manifest.json'
import type {
    PhotographImageMetadata,
    PhotographManifest,
    PhotographProjectMetadata,
} from '../../lib/apis/photographs/types'
import { cleanupPhotographAssetObjectKeys } from './photograph-asset-cleanup'
import {
    applyPhotographProjectDeletion,
    parsePhotographProjectDeletion,
    storePhotographProjectDeletion,
} from './photograph-project-delete'

const fixtureManifest = fixture as PhotographManifest
const fixtureProject = fixtureManifest.sections[0].projects[0]
const sharedImage = createImage('shared', 'photographs/assets/shared.webp')
const crossSectionImage = createImage('cross', 'photographs/assets/cross.webp')
const uniqueImage = createImage('unique', 'photographs/assets/unique.webp')
const duplicateKeyImage = createImage('duplicate-key', uniqueImage.objectKey)
const unsafeImage = createImage('unsafe', 'photographs/manifest.json')
const deletedProject: PhotographProjectMetadata = {
    ...fixtureProject,
    id: 'deleted-project',
    title: 'Deleted Project',
    heroImageId: sharedImage.id,
    galleryImageIds: [uniqueImage.id, duplicateKeyImage.id, crossSectionImage.id, unsafeImage.id],
    images: [sharedImage, uniqueImage, duplicateKeyImage, crossSectionImage, unsafeImage],
}
const retainedProject: PhotographProjectMetadata = {
    ...fixtureProject,
    id: 'retained-project',
    title: 'Retained Project',
    heroImageId: 'retained-shared',
    galleryImageIds: [],
    images: [{ ...sharedImage, id: 'retained-shared' }],
}
const otherSection = {
    id: 'cover',
    title: 'Cover',
    projects: [
        {
            ...fixtureProject,
            id: 'cover-project',
            heroImageId: crossSectionImage.id,
            galleryImageIds: [],
            images: [crossSectionImage],
        },
    ],
}
const manifest: PhotographManifest = {
    version: 2,
    sections: [
        {
            id: 'editorial',
            title: 'Editorial',
            projects: [deletedProject, retainedProject],
        },
        otherSection,
    ],
}
const deletion = { sectionId: 'editorial', projectId: deletedProject.id }
const env = { PORTFOLIO_PREFIX: 'test' } as unknown as Env
const noWait = async () => undefined

describe('parsePhotographProjectDeletion', () => {
    it('대·소주제 ID를 trim하고 빈 값·긴 값을 거부한다', () => {
        expect(
            parsePhotographProjectDeletion({
                sectionId: ' editorial ',
                projectId: ' deleted-project ',
            }),
        ).toEqual(deletion)
        expect(parsePhotographProjectDeletion({ sectionId: '', projectId: 'project' })).toBeNull()
        expect(parsePhotographProjectDeletion({ sectionId: 'section', projectId: ' ' })).toBeNull()
        expect(
            parsePhotographProjectDeletion({
                sectionId: 'section',
                projectId: 'a'.repeat(121),
            }),
        ).toBeNull()
    })
})

describe('applyPhotographProjectDeletion', () => {
    it('선택 소주제만 제거하고 다른 소주제·대주제·순서를 보존한다', () => {
        const result = applyPhotographProjectDeletion(manifest, deletion)

        expect(result.ok).toBe(true)
        if (!result.ok) return
        expect(result.section.projects).toEqual([retainedProject])
        expect(result.section.projects[0]).toBe(retainedProject)
        expect(result.manifest.sections[1]).toBe(otherSection)
        expect(result.deletedProject).toBe(deletedProject)
    })

    it('중복 key는 합치고 남은 모든 대·소주제의 images library에서 공유된 key는 보존한다', () => {
        const result = applyPhotographProjectDeletion(manifest, deletion)

        expect(result.ok).toBe(true)
        if (!result.ok) return
        expect(result.cleanupCandidateObjectKeys).toEqual([
            uniqueImage.objectKey,
            unsafeImage.objectKey,
        ])
    })

    it('마지막 소주제를 삭제하면 빈 대주제를 유지한다', () => {
        const singleProjectManifest: PhotographManifest = {
            ...manifest,
            sections: [{ ...manifest.sections[0], projects: [deletedProject] }],
        }
        const result = applyPhotographProjectDeletion(singleProjectManifest, deletion)

        expect(result).toEqual(
            expect.objectContaining({
                ok: true,
                section: expect.objectContaining({ projects: [] }),
            }),
        )
    })

    it('없는 대주제와 소주제를 404로 거부한다', () => {
        expect(
            applyPhotographProjectDeletion(manifest, {
                sectionId: 'missing',
                projectId: deletedProject.id,
            }),
        ).toEqual(expect.objectContaining({ ok: false, status: 404 }))
        expect(
            applyPhotographProjectDeletion(manifest, {
                sectionId: 'editorial',
                projectId: 'missing',
            }),
        ).toEqual(expect.objectContaining({ ok: false, status: 404 }))
    })
})

describe('cleanupPhotographProjectAssets', () => {
    it('후보가 없으면 R2 delete 없이 not-needed를 반환한다', async () => {
        const deleteObject = jest.fn()

        const result = await cleanupPhotographAssetObjectKeys(
            createDeleteOnlyBucket(deleteObject),
            env,
            [],
        )

        expect(result.result).toEqual({
            status: 'not-needed',
            candidateCount: 0,
            confirmedDeletedCount: 0,
            cleanupPending: false,
        })
        expect(result.failedObjectKeys).toEqual([])
        expect(deleteObject).not.toHaveBeenCalled()
    })

    it('1001개 key를 1000개씩 나누어 삭제한다', async () => {
        const deleteObject = jest.fn().mockResolvedValue(undefined)
        const objectKeys = Array.from(
            { length: 1001 },
            (_, index) => `photographs/assets/${index}.webp`,
        )

        const result = await cleanupPhotographAssetObjectKeys(
            createDeleteOnlyBucket(deleteObject),
            env,
            objectKeys,
            { sleep: noWait },
        )

        expect(result.result).toEqual({
            status: 'completed',
            candidateCount: 1001,
            confirmedDeletedCount: 1001,
            cleanupPending: false,
        })
        expect(result.failedObjectKeys).toEqual([])
        expect(deleteObject).toHaveBeenCalledTimes(2)
        expect(deleteObject.mock.calls[0][0]).toHaveLength(1000)
        expect(deleteObject.mock.calls[1][0]).toHaveLength(1)
    })

    it('일시 실패한 batch를 재시도하고 성공한 수만 확정한다', async () => {
        const deleteObject = jest
            .fn()
            .mockRejectedValueOnce(new Error('temporary'))
            .mockResolvedValueOnce(undefined)

        const result = await cleanupPhotographAssetObjectKeys(
            createDeleteOnlyBucket(deleteObject),
            env,
            ['photographs/assets/retry.webp'],
            { sleep: noWait },
        )

        expect(result.result).toEqual(
            expect.objectContaining({
                status: 'completed',
                confirmedDeletedCount: 1,
                cleanupPending: false,
            }),
        )
        expect(deleteObject).toHaveBeenCalledTimes(2)
    })

    it('영구 실패와 소유 경로 밖 key는 미완료로 남기고 confirmed 수를 과장하지 않는다', async () => {
        const deleteObject = jest.fn().mockRejectedValue(new Error('permanent'))

        const result = await cleanupPhotographAssetObjectKeys(
            createDeleteOnlyBucket(deleteObject),
            env,
            ['photographs/assets/fail.webp', 'photographs/manifest.json', '../outside.webp'],
            { sleep: noWait },
        )

        expect(result.result).toEqual({
            status: 'incomplete',
            candidateCount: 3,
            confirmedDeletedCount: 0,
            cleanupPending: true,
        })
        expect(result.failedObjectKeys).toEqual([
            'photographs/manifest.json',
            '../outside.webp',
            'photographs/assets/fail.webp',
        ])
        expect(deleteObject).toHaveBeenCalledTimes(3)
    })
})

describe('storePhotographProjectDeletion', () => {
    it('manifest를 먼저 커밋한 뒤 안전한 후보만 삭제한다', async () => {
        const consoleError = jest.spyOn(console, 'error').mockImplementation(() => undefined)
        const put = jest.fn().mockResolvedValue({ etag: 'next', httpEtag: '"next"' })
        const deleteObject = jest.fn().mockResolvedValue(undefined)

        const result = await storePhotographProjectDeletion(
            createBucket(put, deleteObject),
            env,
            '"current"',
            deletion,
            { sleep: noWait },
        )

        expect(result).toEqual(
            expect.objectContaining({
                ok: true,
                status: 200,
                deletedProjectId: deletedProject.id,
                httpEtag: '"next"',
                assetCleanup: {
                    status: 'incomplete',
                    candidateCount: 2,
                    confirmedDeletedCount: 1,
                    cleanupPending: true,
                },
            }),
        )
        expect(put.mock.invocationCallOrder[0]).toBeLessThan(
            deleteObject.mock.invocationCallOrder[0],
        )
        expect(deleteObject).toHaveBeenCalledWith(['test/photographs/assets/unique.webp'])
        consoleError.mockRestore()
    })

    it('stale preflight와 최종 conditional 충돌에서는 asset을 삭제하지 않는다', async () => {
        const stalePut = jest.fn()
        const staleDelete = jest.fn()
        const conflictPut = jest.fn().mockResolvedValue(null)
        const conflictDelete = jest.fn()

        const staleResult = await storePhotographProjectDeletion(
            createBucket(stalePut, staleDelete),
            env,
            '"stale"',
            deletion,
        )
        const conflictResult = await storePhotographProjectDeletion(
            createBucket(conflictPut, conflictDelete),
            env,
            '"current"',
            deletion,
        )

        expect(staleResult).toEqual(expect.objectContaining({ ok: false, status: 412 }))
        expect(conflictResult).toEqual(expect.objectContaining({ ok: false, status: 412 }))
        expect(stalePut).not.toHaveBeenCalled()
        expect(staleDelete).not.toHaveBeenCalled()
        expect(conflictDelete).not.toHaveBeenCalled()
    })

    it('manifest put 예외에서는 asset을 삭제하지 않고 예외를 전달한다', async () => {
        const put = jest.fn().mockRejectedValue(new Error('manifest write failed'))
        const deleteObject = jest.fn()

        await expect(
            storePhotographProjectDeletion(
                createBucket(put, deleteObject),
                env,
                '"current"',
                deletion,
            ),
        ).rejects.toThrow('manifest write failed')
        expect(deleteObject).not.toHaveBeenCalled()
    })

    it('manifest 커밋 후 cleanup 실패는 삭제 성공과 incomplete 상태를 반환한다', async () => {
        const consoleError = jest.spyOn(console, 'error').mockImplementation(() => undefined)
        const put = jest.fn().mockResolvedValue({ etag: 'next', httpEtag: '"next"' })
        const deleteObject = jest.fn().mockRejectedValue(new Error('cleanup failed'))

        const result = await storePhotographProjectDeletion(
            createBucket(put, deleteObject),
            env,
            '"current"',
            deletion,
            { sleep: noWait },
        )

        expect(result).toEqual(
            expect.objectContaining({
                ok: true,
                assetCleanup: expect.objectContaining({
                    status: 'incomplete',
                    cleanupPending: true,
                }),
            }),
        )
        expect(consoleError).toHaveBeenCalledWith(
            'Photographs 소주제 삭제 후 R2 정리 미완료:',
            expect.objectContaining({ projectId: deletedProject.id }),
        )
        consoleError.mockRestore()
    })
})

function createImage(id: string, objectKey: string): PhotographImageMetadata {
    return { id, objectKey, alt: id, width: 100, height: 120 }
}

function createBucket(put: jest.Mock, deleteObject: jest.Mock): R2Bucket {
    const get = jest.fn().mockResolvedValue({
        body: true,
        json: jest.fn().mockResolvedValue(manifest),
        etag: 'current',
        httpEtag: '"current"',
    })
    return { get, put, delete: deleteObject } as unknown as R2Bucket
}

function createDeleteOnlyBucket(deleteObject: jest.Mock): R2Bucket {
    return { delete: deleteObject } as unknown as R2Bucket
}
