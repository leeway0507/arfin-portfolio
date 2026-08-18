import fixture from '../../scripts/fixtures/hong-kong-photographs-manifest.json'
import type { PhotographManifest } from '../../lib/apis/photographs/types'
import {
    applyPhotographProjectCreation,
    parsePhotographProjectCreateForm,
    storePhotographProjectCreation,
} from './photograph-project-create'

const manifest = fixture as PhotographManifest
const section = manifest.sections[0]
const env = { PORTFOLIO_PREFIX: 'test' } as unknown as Env
const imageBytes = createWebp(1200, 800)
const creation = {
    sectionId: section.id,
    publication: 'New Publication',
    title: 'New Editorial',
    hero: {
        alt: '새 Editorial 대표 이미지',
        imageBytes,
        width: 1200,
        height: 800,
    },
}

describe('parsePhotographProjectCreateForm', () => {
    it('필수 문구와 대표 WebP를 읽고 텍스트를 정리한다', async () => {
        const result = await parsePhotographProjectCreateForm(createCreationForm())

        expect(result.ok).toBe(true)
        if (!result.ok) return
        expect(result.creation).toEqual(
            expect.objectContaining({
                sectionId: section.id,
                publication: creation.publication,
                title: creation.title,
                hero: expect.objectContaining({
                    alt: creation.hero.alt,
                    width: 1200,
                    height: 800,
                }),
            }),
        )
    })

    it('대표 파일이 없거나 둘 이상이면 거부한다', async () => {
        const missingHero = createCreationForm()
        missingHero.delete('heroFile')
        const twoHeroes = createCreationForm()
        twoHeroes.append('heroFile', createHeroFile('second.webp'))

        await expect(parsePhotographProjectCreateForm(missingHero)).resolves.toEqual(
            expect.objectContaining({ ok: false, status: 400 }),
        )
        await expect(parsePhotographProjectCreateForm(twoHeroes)).resolves.toEqual(
            expect.objectContaining({ ok: false, status: 400 }),
        )
    })

    it('빈 문구와 WebP가 아닌 대표 파일을 거부한다', async () => {
        const blankTitle = createCreationForm()
        blankTitle.set('title', ' ')
        const wrongMime = createCreationForm()
        wrongMime.set('heroFile', new File([imageBytes], 'hero.png', { type: 'image/png' }))

        await expect(parsePhotographProjectCreateForm(blankTitle)).resolves.toEqual(
            expect.objectContaining({ ok: false, status: 400 }),
        )
        await expect(parsePhotographProjectCreateForm(wrongMime)).resolves.toEqual(
            expect.objectContaining({ ok: false, status: 415 }),
        )
    })
})

describe('applyPhotographProjectCreation', () => {
    const input = {
        ...creation,
        projectId: 'project-new',
        heroImageId: 'asset-new',
        heroObjectKey: 'photographs/assets/new.webp',
    }

    it('새 프로젝트를 기본 배치와 빈 gallery로 Editorial 끝에 추가한다', () => {
        const result = applyPhotographProjectCreation(manifest, input)

        expect(result.ok).toBe(true)
        if (!result.ok) return
        expect(result.section.projects.slice(0, -1)).toEqual(section.projects)
        expect(result.section.projects.at(-1)).toEqual(result.project)
        expect(result.project).toEqual({
            id: 'project-new',
            publication: creation.publication,
            title: creation.title,
            textPosition: 'left',
            heroImageId: 'asset-new',
            galleryImageIds: [],
            images: [
                {
                    id: 'asset-new',
                    objectKey: 'photographs/assets/new.webp',
                    alt: creation.hero.alt,
                    width: 1200,
                    height: 800,
                },
            ],
        })
    })

    it('없는 section과 project/image/objectKey 충돌을 거부한다', () => {
        expect(
            applyPhotographProjectCreation(manifest, { ...input, sectionId: 'missing' }),
        ).toEqual(expect.objectContaining({ ok: false, status: 404 }))

        const firstProject = section.projects[0]
        const firstImage = firstProject.images[0]
        expect(
            applyPhotographProjectCreation(manifest, {
                ...input,
                projectId: firstProject.id,
            }),
        ).toEqual(expect.objectContaining({ ok: false, status: 409 }))
        expect(
            applyPhotographProjectCreation(manifest, {
                ...input,
                heroImageId: firstImage.id,
            }),
        ).toEqual(expect.objectContaining({ ok: false, status: 409 }))
        expect(
            applyPhotographProjectCreation(manifest, {
                ...input,
                heroObjectKey: firstImage.objectKey,
            }),
        ).toEqual(expect.objectContaining({ ok: false, status: 409 }))
    })
})

describe('storePhotographProjectCreation', () => {
    it('대표 이미지와 manifest를 저장하고 canonical section과 ETag을 반환한다', async () => {
        const put = jest
            .fn()
            .mockResolvedValueOnce({ etag: 'hero-etag' })
            .mockResolvedValueOnce({ etag: 'next-etag', httpEtag: '"next-etag"' })
        const deleteObject = jest.fn()
        const bucket = createBucket({ put, deleteObject })
        const createUuid = jest
            .fn()
            .mockReturnValueOnce('project-uuid')
            .mockReturnValueOnce('asset-uuid')

        const result = await storePhotographProjectCreation(
            bucket,
            env,
            '"current-etag"',
            creation,
            createUuid,
        )

        expect(result).toEqual(
            expect.objectContaining({ ok: true, status: 201, httpEtag: '"next-etag"' }),
        )
        if (!result.ok) return
        expect(result.project.id).toBe('project-project-uuid')
        expect(result.section.projects.at(-1)).toEqual(result.project)
        expect(put).toHaveBeenNthCalledWith(
            1,
            'test/photographs/assets/asset-uuid.webp',
            imageBytes,
            expect.any(Object),
        )
        expect(deleteObject).not.toHaveBeenCalled()
    })

    it('UUID 충돌 시 새 UUID를 선택한다', async () => {
        const collisionManifest = createCollisionManifest()
        const put = jest
            .fn()
            .mockResolvedValueOnce({ etag: 'hero-etag' })
            .mockResolvedValueOnce({ etag: 'next-etag', httpEtag: '"next-etag"' })
        const bucket = createBucket({
            put,
            deleteObject: jest.fn(),
            storedManifest: collisionManifest,
        })
        const createUuid = jest
            .fn()
            .mockReturnValueOnce('collision')
            .mockReturnValueOnce('project-unique')
            .mockReturnValueOnce('collision')
            .mockReturnValueOnce('asset-unique')

        const result = await storePhotographProjectCreation(
            bucket,
            env,
            '"current-etag"',
            creation,
            createUuid,
        )

        expect(result).toEqual(expect.objectContaining({ ok: true }))
        if (!result.ok) return
        expect(result.project.id).toBe('project-project-unique')
        expect(result.project.heroImageId).toBe('asset-asset-unique')
    })

    it('stale ETag이면 대표 이미지 객체를 만들지 않는다', async () => {
        const put = jest.fn()
        const deleteObject = jest.fn()
        const bucket = createBucket({ put, deleteObject })

        const result = await storePhotographProjectCreation(bucket, env, '"stale"', creation)

        expect(result).toEqual(expect.objectContaining({ ok: false, status: 412 }))
        expect(put).not.toHaveBeenCalled()
        expect(deleteObject).not.toHaveBeenCalled()
    })

    it('manifest 저장 충돌이면 만든 대표 이미지 객체를 정리한다', async () => {
        const put = jest
            .fn()
            .mockResolvedValueOnce({ etag: 'hero-etag' })
            .mockResolvedValueOnce(null)
        const deleteObject = jest.fn().mockResolvedValue(undefined)
        const bucket = createBucket({ put, deleteObject })

        const result = await storePhotographProjectCreation(
            bucket,
            env,
            '"current-etag"',
            creation,
            jest.fn().mockReturnValueOnce('project').mockReturnValueOnce('asset'),
        )

        expect(result).toEqual(expect.objectContaining({ ok: false, status: 412 }))
        expect(deleteObject).toHaveBeenCalledWith(['test/photographs/assets/asset.webp'])
    })

    it('대표 이미지 저장 예외에도 시도한 객체를 정리하고 원래 오류를 유지한다', async () => {
        const writeError = new Error('hero write failed')
        const put = jest.fn().mockRejectedValueOnce(writeError)
        const deleteObject = jest.fn().mockRejectedValue(new Error('cleanup failed'))
        const bucket = createBucket({ put, deleteObject })
        const consoleError = jest.spyOn(console, 'error').mockImplementation(() => undefined)

        await expect(
            storePhotographProjectCreation(
                bucket,
                env,
                '"current-etag"',
                creation,
                jest.fn().mockReturnValueOnce('project').mockReturnValueOnce('asset'),
            ),
        ).rejects.toBe(writeError)
        expect(deleteObject).toHaveBeenCalledWith(['test/photographs/assets/asset.webp'])
        expect(consoleError).toHaveBeenCalled()
        consoleError.mockRestore()
    })
})

function createCreationForm(): FormData {
    const formData = new FormData()
    formData.set('sectionId', ` ${creation.sectionId} `)
    formData.set('publication', ` ${creation.publication} `)
    formData.set('title', ` ${creation.title} `)
    formData.set('heroAlt', ` ${creation.hero.alt} `)
    formData.set('heroFile', createHeroFile('hero.webp'))
    return formData
}

function createHeroFile(filename: string): File {
    return new File([imageBytes], filename, { type: 'image/webp' })
}

function createBucket({
    put,
    deleteObject,
    storedManifest = manifest,
}: {
    put: jest.Mock
    deleteObject: jest.Mock
    storedManifest?: PhotographManifest
}): R2Bucket {
    const get = jest.fn().mockResolvedValue({
        body: true,
        json: jest.fn().mockResolvedValue(storedManifest),
        etag: 'current-etag',
        httpEtag: '"current-etag"',
    })
    return { get, put, delete: deleteObject } as unknown as R2Bucket
}

function createCollisionManifest(): PhotographManifest {
    const firstProject = section.projects[0]
    return {
        ...manifest,
        sections: [
            {
                ...section,
                projects: [
                    ...section.projects,
                    {
                        ...firstProject,
                        id: 'project-collision',
                        heroImageId: 'asset-collision',
                        images: [
                            {
                                ...firstProject.images[0],
                                id: 'asset-collision',
                                objectKey: 'photographs/assets/collision.webp',
                            },
                        ],
                        galleryImageIds: [],
                    },
                ],
            },
        ],
    }
}

function createWebp(width: number, height: number): ArrayBuffer {
    const vp8xData = new Uint8Array(10)
    writeUint24(vp8xData, 4, width - 1)
    writeUint24(vp8xData, 7, height - 1)
    const vp8Data = new Uint8Array(11)
    vp8Data.set([0x9d, 0x01, 0x2a], 3)
    writeUint16(vp8Data, 6, width)
    writeUint16(vp8Data, 8, height)
    const chunks = [
        { type: 'VP8X', data: vp8xData },
        { type: 'VP8 ', data: vp8Data },
    ]
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
