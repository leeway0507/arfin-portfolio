import fixture from '../../scripts/fixtures/hong-kong-photographs-manifest.json'
import type {
    PhotographAssetManagementUpdate,
    PhotographManifest,
} from '../../lib/apis/photographs/types'
import {
    applyPhotographAssetManagementUpdate,
    parsePhotographAssetManagementUpdate,
    storePhotographAssetManagementUpdate,
} from './photograph-asset-manage'

const manifest = fixture as PhotographManifest
const section = manifest.sections[0]
const project = section.projects[0]
const deletedImage = project.images[1]
const baseUpdate: PhotographAssetManagementUpdate = {
    sectionId: section.id,
    projectId: project.id,
    retainedImageAlts: project.images.map((image) => ({ imageId: image.id, alt: image.alt })),
    deletedImageIds: [],
}
const deleteUpdate: PhotographAssetManagementUpdate = {
    ...baseUpdate,
    retainedImageAlts: baseUpdate.retainedImageAlts.filter(
        (image) => image.imageId !== deletedImage.id,
    ),
    deletedImageIds: [deletedImage.id],
}
const env = { PORTFOLIO_PREFIX: 'test' } as unknown as Env
const noWait = async () => undefined

describe('parsePhotographAssetManagementUpdate', () => {
    it('ID와 alt를 trim하고 삭제 없는 alt-only 요청을 받는다', () => {
        expect(
            parsePhotographAssetManagementUpdate({
                ...baseUpdate,
                sectionId: ` ${section.id} `,
                projectId: ` ${project.id} `,
                retainedImageAlts: baseUpdate.retainedImageAlts.map((image) => ({
                    imageId: ` ${image.imageId} `,
                    alt: ` ${image.alt} `,
                })),
            }),
        ).toEqual(baseUpdate)
    })

    it('빈·241자 alt, duplicate, 유지·삭제 overlap을 거부한다', () => {
        expect(
            parsePhotographAssetManagementUpdate({
                ...baseUpdate,
                retainedImageAlts: [
                    ...baseUpdate.retainedImageAlts.slice(0, -1),
                    { ...baseUpdate.retainedImageAlts.at(-1), alt: ' ' },
                ],
            }),
        ).toBeNull()
        expect(
            parsePhotographAssetManagementUpdate({
                ...baseUpdate,
                retainedImageAlts: [
                    ...baseUpdate.retainedImageAlts.slice(0, -1),
                    { ...baseUpdate.retainedImageAlts.at(-1), alt: 'a'.repeat(241) },
                ],
            }),
        ).toBeNull()
        expect(
            parsePhotographAssetManagementUpdate({
                ...baseUpdate,
                retainedImageAlts: [
                    baseUpdate.retainedImageAlts[0],
                    baseUpdate.retainedImageAlts[0],
                ],
            }),
        ).toBeNull()
        expect(
            parsePhotographAssetManagementUpdate({
                ...baseUpdate,
                deletedImageIds: [project.heroImageId],
            }),
        ).toBeNull()
    })
})

describe('applyPhotographAssetManagementUpdate', () => {
    it('요청 alt 배열 순서와 무관하게 기존 images 순서·metadata를 보존한다', () => {
        const updatedAlt = '새 접근성 설명'
        const result = applyPhotographAssetManagementUpdate(manifest, {
            ...baseUpdate,
            retainedImageAlts: [...baseUpdate.retainedImageAlts]
                .reverse()
                .map((image) =>
                    image.imageId === project.images[0].id ? { ...image, alt: updatedAlt } : image,
                ),
        })

        expect(result.ok).toBe(true)
        if (!result.ok) return
        expect(result.project.images.map((image) => image.id)).toEqual(
            project.images.map((image) => image.id),
        )
        expect(result.project.images[0]).toEqual({ ...project.images[0], alt: updatedAlt })
        expect(result.project.images[0].objectKey).toBe(project.images[0].objectKey)
        expect(result.project.images[0].width).toBe(project.images[0].width)
    })

    it('삭제 이미지를 images와 gallery에서 제거하고 hero·다른 metadata를 보존한다', () => {
        const result = applyPhotographAssetManagementUpdate(manifest, deleteUpdate)

        expect(result.ok).toBe(true)
        if (!result.ok) return
        expect(result.project.images.some((image) => image.id === deletedImage.id)).toBe(false)
        expect(result.project.galleryImageIds).toEqual(
            project.galleryImageIds.filter((imageId) => imageId !== deletedImage.id),
        )
        expect(result.project.heroImageId).toBe(project.heroImageId)
        expect(result.project.publication).toBe(project.publication)
        expect(result.cleanupCandidateObjectKeys).toEqual([deletedImage.objectKey])
    })

    it('다른 소주제의 images library가 같은 objectKey를 쓰면 R2 삭제 후보에서 제외한다', () => {
        const sharedProject = {
            ...project,
            id: 'shared-project',
            heroImageId: 'shared-image',
            galleryImageIds: [],
            images: [{ ...deletedImage, id: 'shared-image' }],
        }
        const sharedManifest: PhotographManifest = {
            ...manifest,
            sections: [{ ...section, projects: [project, sharedProject] }],
        }
        const result = applyPhotographAssetManagementUpdate(sharedManifest, deleteUpdate)

        expect(result.ok).toBe(true)
        if (!result.ok) return
        expect(result.cleanupCandidateObjectKeys).toEqual([])
        expect(result.manifest.sections[0].projects[1]).toBe(sharedProject)
    })

    it('현재 이미지 ID를 정확히 분할하지 않거나 hero를 삭제하면 거부한다', () => {
        const missingUpdate = {
            ...baseUpdate,
            retainedImageAlts: baseUpdate.retainedImageAlts.slice(1),
        }
        const unknownUpdate = {
            ...baseUpdate,
            retainedImageAlts: [
                ...baseUpdate.retainedImageAlts,
                { imageId: 'unknown', alt: 'unknown' },
            ],
        }
        const heroDeleteUpdate = {
            ...baseUpdate,
            retainedImageAlts: baseUpdate.retainedImageAlts.filter(
                (image) => image.imageId !== project.heroImageId,
            ),
            deletedImageIds: [project.heroImageId],
        }

        expect(applyPhotographAssetManagementUpdate(manifest, missingUpdate)).toEqual(
            expect.objectContaining({ ok: false, status: 400 }),
        )
        expect(applyPhotographAssetManagementUpdate(manifest, unknownUpdate)).toEqual(
            expect.objectContaining({ ok: false, status: 400 }),
        )
        expect(applyPhotographAssetManagementUpdate(manifest, heroDeleteUpdate)).toEqual(
            expect.objectContaining({ ok: false, status: 400 }),
        )
    })

    it('alt와 삭제가 모두 같으면 manifest와 project를 그대로 반환한다', () => {
        const result = applyPhotographAssetManagementUpdate(manifest, baseUpdate)

        expect(result).toEqual(
            expect.objectContaining({
                ok: true,
                manifest,
                project,
                hasChanges: false,
                cleanupCandidateObjectKeys: [],
            }),
        )
    })
})

describe('storePhotographAssetManagementUpdate', () => {
    it('no-op은 manifest put과 asset delete 없이 현재 ETag을 반환한다', async () => {
        const put = jest.fn()
        const deleteObject = jest.fn()

        const result = await storePhotographAssetManagementUpdate(
            createBucket(put, deleteObject),
            env,
            '"current"',
            baseUpdate,
        )

        expect(result).toEqual(
            expect.objectContaining({
                ok: true,
                httpEtag: '"current"',
                assetCleanup: expect.objectContaining({ status: 'not-needed' }),
            }),
        )
        expect(put).not.toHaveBeenCalled()
        expect(deleteObject).not.toHaveBeenCalled()
    })

    it('alt-only 변경은 manifest만 저장하고 R2 asset은 삭제하지 않는다', async () => {
        const put = jest.fn().mockResolvedValue({ etag: 'next', httpEtag: '"next"' })
        const deleteObject = jest.fn()
        const altUpdate = {
            ...baseUpdate,
            retainedImageAlts: baseUpdate.retainedImageAlts.map((image, index) =>
                index === 0 ? { ...image, alt: 'Updated alt' } : image,
            ),
        }

        const result = await storePhotographAssetManagementUpdate(
            createBucket(put, deleteObject),
            env,
            '"current"',
            altUpdate,
        )

        expect(result).toEqual(expect.objectContaining({ ok: true, httpEtag: '"next"' }))
        expect(put).toHaveBeenCalledTimes(1)
        expect(deleteObject).not.toHaveBeenCalled()
    })

    it('manifest 커밋 후에만 삭제 asset을 R2에서 정리한다', async () => {
        const put = jest.fn().mockResolvedValue({ etag: 'next', httpEtag: '"next"' })
        const deleteObject = jest.fn().mockResolvedValue(undefined)

        const result = await storePhotographAssetManagementUpdate(
            createBucket(put, deleteObject),
            env,
            '"current"',
            deleteUpdate,
            { sleep: noWait },
        )

        expect(result).toEqual(
            expect.objectContaining({
                ok: true,
                assetCleanup: expect.objectContaining({
                    status: 'completed',
                    confirmedDeletedCount: 1,
                }),
            }),
        )
        expect(put.mock.invocationCallOrder[0]).toBeLessThan(
            deleteObject.mock.invocationCallOrder[0],
        )
    })

    it('stale·final conflict·manifest put 예외에서는 asset delete를 호출하지 않는다', async () => {
        const staleDelete = jest.fn()
        const conflictDelete = jest.fn()
        const throwDelete = jest.fn()

        const stale = await storePhotographAssetManagementUpdate(
            createBucket(jest.fn(), staleDelete),
            env,
            '"stale"',
            deleteUpdate,
        )
        const conflict = await storePhotographAssetManagementUpdate(
            createBucket(jest.fn().mockResolvedValue(null), conflictDelete),
            env,
            '"current"',
            deleteUpdate,
        )
        await expect(
            storePhotographAssetManagementUpdate(
                createBucket(jest.fn().mockRejectedValue(new Error('put failed')), throwDelete),
                env,
                '"current"',
                deleteUpdate,
            ),
        ).rejects.toThrow('put failed')

        expect(stale).toEqual(expect.objectContaining({ ok: false, status: 412 }))
        expect(conflict).toEqual(expect.objectContaining({ ok: false, status: 412 }))
        expect(staleDelete).not.toHaveBeenCalled()
        expect(conflictDelete).not.toHaveBeenCalled()
        expect(throwDelete).not.toHaveBeenCalled()
    })

    it('manifest 커밋 후 cleanup 실패는 200 incomplete와 로그를 반환한다', async () => {
        const consoleError = jest.spyOn(console, 'error').mockImplementation(() => undefined)
        const put = jest.fn().mockResolvedValue({ etag: 'next', httpEtag: '"next"' })
        const deleteObject = jest.fn().mockRejectedValue(new Error('cleanup failed'))

        const result = await storePhotographAssetManagementUpdate(
            createBucket(put, deleteObject),
            env,
            '"current"',
            deleteUpdate,
            { sleep: noWait },
        )

        expect(result).toEqual(
            expect.objectContaining({
                ok: true,
                status: 200,
                assetCleanup: expect.objectContaining({
                    status: 'incomplete',
                    cleanupPending: true,
                }),
            }),
        )
        expect(consoleError).toHaveBeenCalled()
        consoleError.mockRestore()
    })
})

function createBucket(put: jest.Mock, deleteObject: jest.Mock): R2Bucket {
    const get = jest.fn().mockResolvedValue({
        body: true,
        json: jest.fn().mockResolvedValue(manifest),
        etag: 'current',
        httpEtag: '"current"',
    })
    return { get, put, delete: deleteObject } as unknown as R2Bucket
}
