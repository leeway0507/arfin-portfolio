import fixture from '../../scripts/fixtures/hong-kong-photographs-manifest.json'
import type { PhotographManifest } from '../../lib/apis/photographs/types'
import { normalizePhotographManifest, putPhotographManifest } from './photographs-r2'

const manifest = fixture as PhotographManifest
const project = manifest.sections[0].projects[0]
const env = { PORTFOLIO_PREFIX: 'test' } as unknown as Env

describe('putPhotographManifest', () => {
    it('quoted ETag을 정규화해 조건부 put으로 manifest를 저장한다', async () => {
        const put = jest.fn().mockResolvedValue({ etag: 'next-etag', httpEtag: '"next-etag"' })
        const bucket = { put } as unknown as R2Bucket

        const result = await putPhotographManifest(bucket, env, manifest, '"previous-etag"')

        expect(put).toHaveBeenCalledWith(
            'test/photographs/manifest.json',
            expect.stringContaining('"version": 2'),
            expect.objectContaining({
                onlyIf: { etagMatches: 'previous-etag' },
                httpMetadata: {
                    contentType: 'application/json',
                    cacheControl: 'no-cache',
                },
            }),
        )
        expect(result).toEqual({
            manifest,
            etag: 'next-etag',
            httpEtag: '"next-etag"',
        })
    })

    it('조건이 맞지 않아 R2 put이 null이면 충돌 결과를 반환한다', async () => {
        const bucket = { put: jest.fn().mockResolvedValue(null) } as unknown as R2Bucket

        await expect(
            putPhotographManifest(bucket, env, manifest, '"stale-etag"'),
        ).resolves.toBeNull()
    })
})

describe('normalizePhotographManifest', () => {
    it('v1 manifest를 순서를 보존한 v2 구조로 메모리에서 변환한다', () => {
        const legacyManifest = {
            version: 1,
            sections: manifest.sections.map((section) => ({
                id: section.id,
                title: section.title,
                projects: section.projects.map((project) => ({
                    id: project.id,
                    publication: project.publication,
                    title: project.title,
                    featuredImageId: project.heroImageId,
                    images: project.images,
                })),
            })),
        }

        const normalized = normalizePhotographManifest(legacyManifest)

        expect(normalized?.version).toBe(2)
        expect(normalized?.sections[0].projects[0]).toEqual({
            ...project,
            textPosition: 'left',
            heroImageId: project.heroImageId,
            galleryImageIds: project.images
                .filter((image) => image.id !== project.heroImageId)
                .map((image) => image.id),
        })
    })

    it('중복 image ID가 있는 v1 manifest는 거부한다', () => {
        const duplicateImage = project.images[0]
        const brokenLegacyManifest = {
            version: 1,
            sections: [
                {
                    id: 'editorial',
                    title: 'Editorial',
                    projects: [
                        {
                            id: project.id,
                            publication: project.publication,
                            title: project.title,
                            featuredImageId: duplicateImage.id,
                            images: [duplicateImage, duplicateImage],
                        },
                    ],
                },
            ],
        }

        expect(normalizePhotographManifest(brokenLegacyManifest)).toBeNull()
    })
})
