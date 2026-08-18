import { compressImageFile } from '../../../../lib/images/compression'
import { compressPhotographAssets } from './compress-photograph-assets'

jest.mock('../../../../lib/images/compression', () => ({
    compressImageFile: jest.fn(),
}))

const mockedCompressImageFile = jest.mocked(compressImageFile)

describe('compressPhotographAssets', () => {
    beforeEach(() => mockedCompressImageFile.mockReset())

    it('이미지를 선택 순서대로 한 장씩 압축하고 진행 상태를 알린다', async () => {
        const firstFile = createImageFile('first.jpg')
        const secondFile = createImageFile('second.jpg')
        const firstCompressed = createImageFile('first.webp')
        const secondCompressed = createImageFile('second.webp')
        let resolveFirst: (file: File) => void = () => undefined
        mockedCompressImageFile
            .mockImplementationOnce(() => new Promise<File>((resolve) => (resolveFirst = resolve)))
            .mockResolvedValueOnce(secondCompressed)
        const onProgress = jest.fn()

        const compression = compressPhotographAssets(
            [
                { file: firstFile, alt: ' 첫 번째 ' },
                { file: secondFile, alt: '두 번째' },
            ],
            onProgress,
        )
        await Promise.resolve()
        expect(mockedCompressImageFile).toHaveBeenCalledTimes(1)

        resolveFirst(firstCompressed)
        const result = await compression

        expect(mockedCompressImageFile.mock.calls).toEqual([[firstFile], [secondFile]])
        expect(onProgress.mock.calls).toEqual([
            [1, 2],
            [2, 2],
        ])
        expect(result).toEqual([
            { file: firstCompressed, alt: '첫 번째' },
            { file: secondCompressed, alt: '두 번째' },
        ])
    })

    it('중간 압축 실패 시 뒤 이미지를 처리하지 않고 실패를 전달한다', async () => {
        const compressionError = new Error('compression failed')
        mockedCompressImageFile
            .mockResolvedValueOnce(createImageFile('first.webp'))
            .mockRejectedValueOnce(compressionError)

        await expect(
            compressPhotographAssets(
                [
                    { file: createImageFile('first.jpg'), alt: 'first' },
                    { file: createImageFile('second.jpg'), alt: 'second' },
                    { file: createImageFile('third.jpg'), alt: 'third' },
                ],
                jest.fn(),
            ),
        ).rejects.toBe(compressionError)
        expect(mockedCompressImageFile).toHaveBeenCalledTimes(2)
    })
})

function createImageFile(filename: string): File {
    return new File([new Uint8Array([1, 2, 3])], filename, { type: 'image/jpeg' })
}
