import fixture from '../../scripts/fixtures/hong-kong-photographs-manifest.json'
import type { PhotographManifest } from '../../lib/apis/photographs/types'
import {
    applyPhotographAssetUpload,
    parsePhotographAssetUploadForm,
    storePhotographAssets,
} from './photograph-asset-upload'
import { readWebpDimensions } from './webp'

const manifest = fixture as PhotographManifest
const project = manifest.sections[0].projects[0]
const env = { PORTFOLIO_PREFIX: 'test' } as unknown as Env
const imageBytes = createWebp('VP8X', 1200, 800)
const baseAsset = {
    alt: '새로 업로드한 화보 이미지',
    imageBytes,
    width: 1200,
    height: 800,
}
const upload = {
    sectionId: manifest.sections[0].id,
    projectId: project.id,
    target: 'gallery' as const,
    assets: [baseAsset],
}

describe('applyPhotographAssetUpload', () => {
    it('상단 업로드는 한 장을 추가하고 상단 reference만 바꾼다', () => {
        const result = applyPhotographAssetUpload(manifest, {
            ...upload,
            target: 'hero',
            assets: [createPreparedAsset('new-hero', baseAsset)],
        })

        expect(result.ok).toBe(true)
        if (!result.ok) return
        expect(result.project.heroImageId).toBe('asset-new-hero')
        expect(result.project.galleryImageIds).toEqual(project.galleryImageIds)
        expect(result.project.images.at(-1)).toEqual({
            id: 'asset-new-hero',
            objectKey: 'photographs/assets/new-hero.webp',
            alt: baseAsset.alt,
            width: baseAsset.width,
            height: baseAsset.height,
        })
    })

    it('하단 여러 장을 선택 순서대로 추가하고 상단 reference를 보존한다', () => {
        const secondAsset = { ...baseAsset, alt: '두 번째 화보 이미지' }
        const result = applyPhotographAssetUpload(manifest, {
            ...upload,
            assets: [
                createPreparedAsset('gallery-one', baseAsset),
                createPreparedAsset('gallery-two', secondAsset),
            ],
        })

        expect(result.ok).toBe(true)
        if (!result.ok) return
        expect(result.project.heroImageId).toBe(project.heroImageId)
        expect(result.project.galleryImageIds).toEqual([
            ...project.galleryImageIds,
            'asset-gallery-one',
            'asset-gallery-two',
        ])
        expect(result.project.images.slice(-2).map((image) => image.alt)).toEqual([
            baseAsset.alt,
            secondAsset.alt,
        ])
    })

    it('영역별 허용 수를 검사하고 다른 프로젝트 metadata를 보존한다', () => {
        expect(
            applyPhotographAssetUpload(manifest, { ...upload, target: 'hero', assets: [] }),
        ).toEqual(expect.objectContaining({ ok: false, status: 400 }))
        expect(
            applyPhotographAssetUpload(manifest, {
                ...upload,
                target: 'hero',
                assets: [
                    createPreparedAsset('one', baseAsset),
                    createPreparedAsset('two', baseAsset),
                ],
            }),
        ).toEqual(expect.objectContaining({ ok: false, status: 400 }))

        const otherProject = { ...project, id: 'other-project' }
        const manifestWithOtherProject: PhotographManifest = {
            ...manifest,
            sections: [
                {
                    ...manifest.sections[0],
                    projects: [project, otherProject],
                },
            ],
        }
        const result = applyPhotographAssetUpload(manifestWithOtherProject, {
            ...upload,
            assets: [createPreparedAsset('gallery', baseAsset)],
        })

        expect(result.ok).toBe(true)
        if (!result.ok) return
        expect(result.manifest.sections[0].projects[1]).toBe(otherProject)
    })
})

describe('readWebpDimensions', () => {
    it.each([
        ['VP8 ', 640, 480],
        ['VP8L', 1024, 768],
        ['VP8X', 1920, 1080],
    ] as const)('%s WebP 크기를 서버에서 읽는다', (chunkType, width, height) => {
        expect(readWebpDimensions(createWebp(chunkType, width, height))).toEqual({
            width,
            height,
        })
    })

    it('RIFF/WEBP magic이 없거나 실제 image bitstream이 없는 파일을 거부한다', () => {
        expect(readWebpDimensions(new Uint8Array(40).buffer)).toBeNull()
        expect(readWebpDimensions(createHeaderOnlyVp8x(1200, 800))).toBeNull()
    })
})

describe('parsePhotographAssetUploadForm', () => {
    it('여러 WebP의 dimensions와 alt를 선택 순서대로 결정한다', async () => {
        const formData = createUploadForm([
            createImageFile('one.webp'),
            createImageFile('two.webp'),
        ])

        const result = await parsePhotographAssetUploadForm(formData)

        expect(result.ok).toBe(true)
        if (!result.ok) return
        expect(result.upload.assets).toEqual([
            expect.objectContaining({ width: 1200, height: 800, alt: 'one' }),
            expect.objectContaining({ width: 1200, height: 800, alt: 'two' }),
        ])
    })

    it('상단 0장·2장, 하단 0장·11장과 files/alts 불일치를 거부한다', async () => {
        const heroEmpty = createUploadForm([], 'hero')
        const heroTwo = createUploadForm(
            [createImageFile('one.webp'), createImageFile('two.webp')],
            'hero',
        )
        const galleryEmpty = createUploadForm([])
        const galleryEleven = createUploadForm(
            Array.from({ length: 11 }, (_, index) => createImageFile(`${index}.webp`)),
        )
        const mismatch = createUploadForm([createImageFile('one.webp')])
        mismatch.append('alts', 'extra')

        for (const formData of [heroEmpty, heroTwo, galleryEmpty, galleryEleven, mismatch]) {
            await expect(parsePhotographAssetUploadForm(formData)).resolves.toEqual(
                expect.objectContaining({ ok: false, status: 400 }),
            )
        }
    })

    it('N번째 WebP가 잘못되면 전체 요청을 쓰기 전에 거부한다', async () => {
        const formData = createUploadForm([
            createImageFile('valid.webp'),
            new File([new Uint8Array(40)], 'broken.webp', { type: 'image/webp' }),
        ])

        await expect(parsePhotographAssetUploadForm(formData)).resolves.toEqual(
            expect.objectContaining({ ok: false, status: 422 }),
        )
    })

    it('WebP가 아닌 MIME, 1920px 초과, 장당 2MB 초과를 거부한다', async () => {
        const wrongMime = createUploadForm([
            new File([imageBytes], 'upload.png', { type: 'image/png' }),
        ])
        const oversizedDimensions = createUploadForm([
            new File([createWebp('VP8X', 1921, 1080)], 'wide.webp', { type: 'image/webp' }),
        ])
        const oversizedFile = createUploadForm([
            new File([new Uint8Array(2 * 1024 * 1024 + 1)], 'large.webp', {
                type: 'image/webp',
            }),
        ])

        await expect(parsePhotographAssetUploadForm(wrongMime)).resolves.toEqual(
            expect.objectContaining({ ok: false, status: 415 }),
        )
        await expect(parsePhotographAssetUploadForm(oversizedDimensions)).resolves.toEqual(
            expect.objectContaining({ ok: false, status: 422 }),
        )
        await expect(parsePhotographAssetUploadForm(oversizedFile)).resolves.toEqual(
            expect.objectContaining({ ok: false, status: 413 }),
        )
    })
})

describe('storePhotographAssets', () => {
    const batchUpload = {
        ...upload,
        assets: [baseAsset, { ...baseAsset, alt: '두 번째 이미지' }],
    }
    const batchUuids = ['uuid-one', 'uuid-two']

    it('여러 이미지와 manifest를 저장하고 새 ETag과 프로젝트를 반환한다', async () => {
        const put = jest
            .fn()
            .mockResolvedValueOnce({ etag: 'asset-one' })
            .mockResolvedValueOnce({ etag: 'asset-two' })
            .mockResolvedValueOnce({ etag: 'next-etag', httpEtag: '"next-etag"' })
        const deleteObject = jest.fn()
        const bucket = createBucket({ put, deleteObject })

        const result = await storePhotographAssets(
            bucket,
            env,
            '"current-etag"',
            batchUpload,
            batchUuids,
        )

        expect(result).toEqual(
            expect.objectContaining({ ok: true, status: 201, httpEtag: '"next-etag"' }),
        )
        expect(put).toHaveBeenNthCalledWith(
            1,
            'test/photographs/assets/uuid-one.webp',
            imageBytes,
            {
                httpMetadata: {
                    contentType: 'image/webp',
                    cacheControl: 'public, max-age=31536000, immutable',
                },
            },
        )
        expect(deleteObject).not.toHaveBeenCalled()
    })

    it('stale ETag이면 이미지 객체를 만들지 않는다', async () => {
        const put = jest.fn()
        const deleteObject = jest.fn()
        const bucket = createBucket({ put, deleteObject })

        const result = await storePhotographAssets(bucket, env, '"stale"', batchUpload, batchUuids)

        expect(result).toEqual(expect.objectContaining({ ok: false, status: 412 }))
        expect(put).not.toHaveBeenCalled()
        expect(deleteObject).not.toHaveBeenCalled()
    })

    it('N번째 객체 저장이 실패하면 시도한 객체를 모두 정리한다', async () => {
        const objectError = new Error('second object failed')
        const put = jest
            .fn()
            .mockResolvedValueOnce({ etag: 'asset-one' })
            .mockRejectedValueOnce(objectError)
        const deleteObject = jest.fn().mockResolvedValue(undefined)
        const bucket = createBucket({ put, deleteObject })

        await expect(
            storePhotographAssets(bucket, env, '"current-etag"', batchUpload, batchUuids),
        ).rejects.toBe(objectError)
        expect(deleteObject).toHaveBeenCalledWith([
            'test/photographs/assets/uuid-one.webp',
            'test/photographs/assets/uuid-two.webp',
        ])
    })

    it('manifest 조건부 저장 충돌이면 만든 객체를 모두 정리한다', async () => {
        const put = jest
            .fn()
            .mockResolvedValueOnce({ etag: 'asset-one' })
            .mockResolvedValueOnce({ etag: 'asset-two' })
            .mockResolvedValueOnce(null)
        const deleteObject = jest.fn().mockResolvedValue(undefined)
        const bucket = createBucket({ put, deleteObject })

        const result = await storePhotographAssets(
            bucket,
            env,
            '"current-etag"',
            batchUpload,
            batchUuids,
        )

        expect(result).toEqual(expect.objectContaining({ ok: false, status: 412 }))
        expect(deleteObject).toHaveBeenCalledWith([
            'test/photographs/assets/uuid-one.webp',
            'test/photographs/assets/uuid-two.webp',
        ])
    })

    it('manifest 저장 예외와 cleanup 실패가 겹쳐도 원래 오류를 유지한다', async () => {
        const manifestError = new Error('manifest write failed')
        const put = jest
            .fn()
            .mockResolvedValueOnce({ etag: 'asset-one' })
            .mockResolvedValueOnce({ etag: 'asset-two' })
            .mockRejectedValueOnce(manifestError)
        const deleteObject = jest.fn().mockRejectedValue(new Error('cleanup failed'))
        const bucket = createBucket({ put, deleteObject })
        const consoleError = jest.spyOn(console, 'error').mockImplementation(() => undefined)

        await expect(
            storePhotographAssets(bucket, env, '"current-etag"', batchUpload, batchUuids),
        ).rejects.toBe(manifestError)
        expect(consoleError).toHaveBeenCalled()
        consoleError.mockRestore()
    })
})

function createPreparedAsset(assetId: string, asset: typeof baseAsset) {
    return {
        ...asset,
        imageId: `asset-${assetId}`,
        objectKey: `photographs/assets/${assetId}.webp`,
    }
}

function createBucket({
    put,
    deleteObject,
}: {
    put: jest.Mock
    deleteObject: jest.Mock
}): R2Bucket {
    const get = jest.fn().mockResolvedValue({
        body: true,
        json: jest.fn().mockResolvedValue(manifest),
        etag: 'current-etag',
        httpEtag: '"current-etag"',
    })
    return { get, put, delete: deleteObject } as unknown as R2Bucket
}

function createUploadForm(files: File[], target: 'hero' | 'gallery' = 'gallery'): FormData {
    const formData = new FormData()
    formData.set('sectionId', upload.sectionId)
    formData.set('projectId', upload.projectId)
    formData.set('target', target)
    files.forEach((file) => {
        formData.append('files', file)
        formData.append('alts', file.name.replace(/\.[^.]+$/, ''))
    })
    return formData
}

function createImageFile(filename: string): File {
    return new File([imageBytes], filename, { type: 'image/webp' })
}

function createWebp(chunkType: 'VP8 ' | 'VP8L' | 'VP8X', width: number, height: number) {
    const chunks =
        chunkType === 'VP8X'
            ? [
                  { type: 'VP8X' as const, data: createWebpChunkData('VP8X', width, height) },
                  { type: 'VP8 ' as const, data: createWebpChunkData('VP8 ', width, height) },
              ]
            : [{ type: chunkType, data: createWebpChunkData(chunkType, width, height) }]
    return createWebpFromChunks(chunks)
}

function createHeaderOnlyVp8x(width: number, height: number) {
    return createWebpFromChunks([
        { type: 'VP8X', data: createWebpChunkData('VP8X', width, height) },
    ])
}

function createWebpFromChunks(chunks: Array<{ type: string; data: Uint8Array }>) {
    const bodySize = chunks.reduce(
        (size, chunk) => size + 8 + chunk.data.length + (chunk.data.length % 2),
        0,
    )
    const bytes = new Uint8Array(12 + bodySize)
    writeAscii(bytes, 0, 'RIFF')
    writeUint32(bytes, 4, bytes.length - 8)
    writeAscii(bytes, 8, 'WEBP')

    let offset = 12
    chunks.forEach((chunk) => {
        writeAscii(bytes, offset, chunk.type)
        writeUint32(bytes, offset + 4, chunk.data.length)
        bytes.set(chunk.data, offset + 8)
        offset += 8 + chunk.data.length + (chunk.data.length % 2)
    })
    return bytes.buffer
}

function createWebpChunkData(
    chunkType: 'VP8 ' | 'VP8L' | 'VP8X',
    width: number,
    height: number,
): Uint8Array {
    if (chunkType === 'VP8 ') {
        const data = new Uint8Array(11)
        data.set([0x9d, 0x01, 0x2a], 3)
        writeUint16(data, 6, width)
        writeUint16(data, 8, height)
        return data
    }
    if (chunkType === 'VP8L') {
        const data = new Uint8Array(6)
        const widthMinusOne = width - 1
        const heightMinusOne = height - 1
        data[0] = 0x2f
        data[1] = widthMinusOne & 0xff
        data[2] = ((widthMinusOne >> 8) & 0x3f) | ((heightMinusOne & 0x03) << 6)
        data[3] = (heightMinusOne >> 2) & 0xff
        data[4] = (heightMinusOne >> 10) & 0x0f
        return data
    }

    const data = new Uint8Array(10)
    writeUint24(data, 4, width - 1)
    writeUint24(data, 7, height - 1)
    return data
}

function writeAscii(bytes: Uint8Array, offset: number, value: string) {
    Array.from(value).forEach((character, index) => {
        bytes[offset + index] = character.charCodeAt(0)
    })
}

function writeUint16(bytes: Uint8Array, offset: number, value: number) {
    bytes[offset] = value & 0xff
    bytes[offset + 1] = (value >> 8) & 0xff
}

function writeUint24(bytes: Uint8Array, offset: number, value: number) {
    bytes[offset] = value & 0xff
    bytes[offset + 1] = (value >> 8) & 0xff
    bytes[offset + 2] = (value >> 16) & 0xff
}

function writeUint32(bytes: Uint8Array, offset: number, value: number) {
    bytes[offset] = value & 0xff
    bytes[offset + 1] = (value >> 8) & 0xff
    bytes[offset + 2] = (value >> 16) & 0xff
    bytes[offset + 3] = (value >> 24) & 0xff
}
