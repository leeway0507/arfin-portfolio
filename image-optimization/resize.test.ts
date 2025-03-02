import { readdir, rm } from 'fs/promises'
import { resizeMultipleImages, resizeImage, getHeight } from './resize'
import path from 'path'
describe('image optimization', () => {
    const maxWidth = 1280
    const maxSize = 400
    const saveDir = path.join(__dirname, 'test-images/optimized')
    const imgDir = path.join(__dirname, 'test-images/project')
    const quality = 80
    const options = {
        maxWidth,
        maxSize,
        saveDir,
        quality
    }
    it('should resize all files in a folder', async () => {
        await resizeMultipleImages(imgDir, options)
        const dirFileCount = await readdir(imgDir).then((r) => r.length)
        const dirOptimizedFileCount = await readdir(saveDir).then((r) => r.length)

        expect(dirOptimizedFileCount).toBe(dirFileCount)

        await readdir(saveDir)
            .then((s) => s.filter((s) => s !== '.DS_Store'))
            .then(async (f) => await rm(`${saveDir}/${f}`, { recursive: true }))
    })
    it('should resize a single file in a folder', async () => {
        const fileDir = path.join(imgDir, 'Life', '1_Dazzling_2022.jpeg')
        await resizeImage(fileDir, options)
        const dirFileCount = await readdir(imgDir).then((r) => r.length)
        const dirOptimizedFileCount = await readdir(saveDir).then((r) => r.length)

        expect(dirOptimizedFileCount).toBe(dirFileCount)
        await readdir(saveDir)
            .then((s) => s.filter((s) => s !== '.DS_Store'))
            .then(async (f) => await rm(`${saveDir}/${f}`, { recursive: true }))
    })
    it('should return an exact height', () => {
        const testSize = [3024, 3793]
        const height = getHeight(testSize[0], testSize[1], maxWidth)
        expect(testSize[0] / testSize[1] - maxWidth / height).toBeLessThan(0.0001)
    })
})
