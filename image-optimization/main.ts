import { resizeMultipleImages } from "./resize";
import path from "path";

const maxWidth = 1024
const maxSize = 400
const saveDir = path.join(__dirname, 'images/project')
const imgDir = path.join(__dirname, 'images/raw')
const quality = 80

async function main() {
    await resizeMultipleImages(imgDir, {
        maxSize,
        maxWidth,
        saveDir,
        quality
    })
}

main()