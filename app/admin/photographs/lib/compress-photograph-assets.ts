import type { PhotographAssetUploadItem } from '@/lib/apis/photographs/types'
import { compressImageFile } from '../../../../lib/images/compression'

export async function compressPhotographAssets(
    assets: PhotographAssetUploadItem[],
    onProgress: (completedCount: number, totalCount: number) => void,
): Promise<PhotographAssetUploadItem[]> {
    const compressedAssets: PhotographAssetUploadItem[] = []

    for (let index = 0; index < assets.length; index += 1) {
        onProgress(index + 1, assets.length)
        compressedAssets.push({
            alt: assets[index].alt.trim(),
            file: await compressImageFile(assets[index].file),
        })
    }
    return compressedAssets
}
