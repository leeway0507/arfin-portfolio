import type {
    PhotographAssetCleanupResult,
    PhotographImageMetadata,
    PhotographManifest,
} from '../../lib/apis/photographs/types'
import { deletePhotographAssets } from './photographs-r2'

const MAX_R2_DELETE_BATCH_SIZE = 1000
const MAX_R2_DELETE_ATTEMPTS = 3
const R2_DELETE_RETRY_DELAY_MS = 25

export interface PhotographAssetCleanupOptions {
    sleep?: (delayMs: number) => Promise<void>
}

export interface PhotographAssetCleanupExecution {
    result: PhotographAssetCleanupResult
    failedObjectKeys: string[]
}

export async function cleanupPhotographAssetObjectKeys(
    bucket: R2Bucket,
    env: Env,
    candidateObjectKeys: string[],
    options: PhotographAssetCleanupOptions = {},
): Promise<PhotographAssetCleanupExecution> {
    const uniqueCandidateObjectKeys = Array.from(new Set(candidateObjectKeys))
    if (uniqueCandidateObjectKeys.length === 0) {
        return {
            result: createAssetCleanupResult('not-needed', 0, 0),
            failedObjectKeys: [],
        }
    }

    const ownedObjectKeys = uniqueCandidateObjectKeys.filter(isOwnedPhotographImageObjectKey)
    const failedObjectKeys = uniqueCandidateObjectKeys.filter(
        (objectKey) => !isOwnedPhotographImageObjectKey(objectKey),
    )
    const sleep = options.sleep ?? waitForRetry
    let confirmedDeletedCount = 0

    for (const objectKeyBatch of chunkObjectKeys(ownedObjectKeys)) {
        const didDeleteBatch = await deletePhotographAssetBatchWithRetry(
            bucket,
            env,
            objectKeyBatch,
            sleep,
        )
        if (didDeleteBatch) {
            confirmedDeletedCount += objectKeyBatch.length
        } else {
            failedObjectKeys.push(...objectKeyBatch)
        }
    }

    const hasIncompleteCleanup = failedObjectKeys.length > 0
    return {
        result: createAssetCleanupResult(
            hasIncompleteCleanup ? 'incomplete' : 'completed',
            uniqueCandidateObjectKeys.length,
            confirmedDeletedCount,
        ),
        failedObjectKeys,
    }
}

export function getUnreferencedPhotographObjectKeys(
    manifest: PhotographManifest,
    removedImages: PhotographImageMetadata[],
): string[] {
    const remainingObjectKeys = new Set(
        manifest.sections.flatMap((section) =>
            section.projects.flatMap((project) => project.images.map((image) => image.objectKey)),
        ),
    )
    return Array.from(
        new Set(
            removedImages
                .map((image) => image.objectKey)
                .filter((objectKey) => !remainingObjectKeys.has(objectKey)),
        ),
    )
}

async function deletePhotographAssetBatchWithRetry(
    bucket: R2Bucket,
    env: Env,
    objectKeys: string[],
    sleep: (delayMs: number) => Promise<void>,
): Promise<boolean> {
    for (let attempt = 1; attempt <= MAX_R2_DELETE_ATTEMPTS; attempt += 1) {
        try {
            await deletePhotographAssets(bucket, env, objectKeys)
            return true
        } catch {
            if (attempt < MAX_R2_DELETE_ATTEMPTS) {
                await sleep(R2_DELETE_RETRY_DELAY_MS * attempt).catch(() => undefined)
            }
        }
    }
    return false
}

function isOwnedPhotographImageObjectKey(objectKey: string): boolean {
    const segments = objectKey.split('/')
    return (
        segments.length >= 3 &&
        segments[0] === 'photographs' &&
        segments.every((segment) => segment.length > 0 && segment !== '.' && segment !== '..') &&
        !objectKey.includes('\\') &&
        objectKey.endsWith('.webp')
    )
}

function chunkObjectKeys(objectKeys: string[]): string[][] {
    const chunks: string[][] = []
    for (let index = 0; index < objectKeys.length; index += MAX_R2_DELETE_BATCH_SIZE) {
        chunks.push(objectKeys.slice(index, index + MAX_R2_DELETE_BATCH_SIZE))
    }
    return chunks
}

function createAssetCleanupResult(
    status: PhotographAssetCleanupResult['status'],
    candidateCount: number,
    confirmedDeletedCount: number,
): PhotographAssetCleanupResult {
    return {
        status,
        candidateCount,
        confirmedDeletedCount,
        cleanupPending: status === 'incomplete',
    }
}

function waitForRetry(delayMs: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, delayMs))
}
