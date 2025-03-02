import { readdir, lstat, mkdir } from 'fs/promises'
import { existsSync } from 'fs'

import path from 'path'
import sharp from 'sharp'
type ResizeOptions = {
    maxWidth: number
    maxSize: number
    saveDir: string
    quality: number
}

async function resizeMultipleImages(rootDir: string, options: ResizeOptions) {
    if ((await lstat(rootDir)).isFile()) {
        if (rootDir.includes(".DS_Store")) {
            return
        }
        await resizeImage(rootDir, options)
        return
    }

    const dirs = await readdir(rootDir)

    for (const dir of dirs) {
        let opt = options
        if ((await lstat(path.join(rootDir, dir))).isDirectory()) {
            opt = { ...options, saveDir: path.join(options.saveDir, dir) }
        }
        await resizeMultipleImages(path.join(rootDir, dir), opt)
    }
    return
}
export async function resizeImage(fileDir: string, options: ResizeOptions) {
    const fileName = path.basename(fileDir).split('.')[0]
    const saveDir = `${options.saveDir}/${fileName}.webp`
    if (!existsSync(options.saveDir)) {
        await mkdir(options.saveDir)
    }

    const image = sharp(fileDir)
    const metadata = await image.metadata()
    const resizedImage = await image
        .resize(options.maxWidth, getHeight(metadata.width!, metadata.height!, options.maxWidth), {
            fit: 'contain',
        })
        .withMetadata()
        .webp({ quality: options.quality })
        .toFile(saveDir)

    console.log(`리사이징 이미지 info : ${JSON.stringify(resizedImage, null, 2)}`)
}

export function getHeight(originWidth: number, originHeight: number, maxWidth: number): number {
    return Math.floor((originHeight * maxWidth) / originWidth)
}

export { resizeMultipleImages }
