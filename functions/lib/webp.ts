export function readWebpDimensions(
    imageBytes: ArrayBuffer,
): { width: number; height: number } | null {
    const bytes = new Uint8Array(imageBytes)
    if (
        bytes.length < 21 ||
        readAscii(bytes, 0, 4) !== 'RIFF' ||
        readAscii(bytes, 8, 4) !== 'WEBP'
    ) {
        return null
    }

    const declaredFileSize = readUint32(bytes, 4) + 8
    if (declaredFileSize !== bytes.length) return null

    let chunkOffset = 12
    let canvasDimensions: { width: number; height: number } | null = null
    let imageDimensions: { width: number; height: number } | null = null
    let hasImagePayload = false
    while (chunkOffset + 8 <= declaredFileSize) {
        const chunkType = readAscii(bytes, chunkOffset, 4)
        const chunkSize = readUint32(bytes, chunkOffset + 4)
        const dataOffset = chunkOffset + 8
        const dataEnd = dataOffset + chunkSize
        if (dataEnd > declaredFileSize) return null

        const dimensions = readWebpChunkDimensions(bytes, chunkType, dataOffset, chunkSize)
        if (dimensions && dimensions.width > 0 && dimensions.height > 0) {
            if (chunkType === 'VP8X') {
                canvasDimensions = dimensions
            } else {
                imageDimensions ??= dimensions
                hasImagePayload = true
            }
        }
        if (chunkType === 'ANMF' && hasValidAnimatedFrame(bytes, dataOffset, chunkSize)) {
            hasImagePayload = true
        }

        chunkOffset = dataEnd + (chunkSize % 2)
    }

    if (chunkOffset !== declaredFileSize || !hasImagePayload) return null
    return canvasDimensions ?? imageDimensions
}

function readWebpChunkDimensions(
    bytes: Uint8Array,
    chunkType: string,
    offset: number,
    size: number,
): { width: number; height: number } | null {
    if (
        chunkType === 'VP8 ' &&
        size > 10 &&
        bytes[offset + 3] === 0x9d &&
        bytes[offset + 4] === 0x01 &&
        bytes[offset + 5] === 0x2a
    ) {
        return {
            width: readUint16(bytes, offset + 6) & 0x3fff,
            height: readUint16(bytes, offset + 8) & 0x3fff,
        }
    }
    if (chunkType === 'VP8L' && size > 5 && bytes[offset] === 0x2f) {
        return {
            width: 1 + bytes[offset + 1] + ((bytes[offset + 2] & 0x3f) << 8),
            height:
                1 +
                (bytes[offset + 2] >> 6) +
                (bytes[offset + 3] << 2) +
                ((bytes[offset + 4] & 0x0f) << 10),
        }
    }
    if (chunkType === 'VP8X' && size >= 10) {
        return {
            width: 1 + readUint24(bytes, offset + 4),
            height: 1 + readUint24(bytes, offset + 7),
        }
    }
    return null
}

function hasValidAnimatedFrame(bytes: Uint8Array, offset: number, size: number): boolean {
    if (size < 16 + 8) return false

    const frameEnd = offset + size
    let subchunkOffset = offset + 16
    while (subchunkOffset + 8 <= frameEnd) {
        const subchunkType = readAscii(bytes, subchunkOffset, 4)
        const subchunkSize = readUint32(bytes, subchunkOffset + 4)
        const dataOffset = subchunkOffset + 8
        const dataEnd = dataOffset + subchunkSize
        if (dataEnd > frameEnd) return false

        if (
            (subchunkType === 'VP8 ' || subchunkType === 'VP8L') &&
            readWebpChunkDimensions(bytes, subchunkType, dataOffset, subchunkSize)
        ) {
            return true
        }
        subchunkOffset = dataEnd + (subchunkSize % 2)
    }

    return false
}

function readAscii(bytes: Uint8Array, offset: number, length: number): string {
    return String.fromCharCode(...bytes.subarray(offset, offset + length))
}

function readUint16(bytes: Uint8Array, offset: number): number {
    return bytes[offset] | (bytes[offset + 1] << 8)
}

function readUint24(bytes: Uint8Array, offset: number): number {
    return bytes[offset] | (bytes[offset + 1] << 8) | (bytes[offset + 2] << 16)
}

function readUint32(bytes: Uint8Array, offset: number): number {
    return (
        (bytes[offset] |
            (bytes[offset + 1] << 8) |
            (bytes[offset + 2] << 16) |
            (bytes[offset + 3] << 24)) >>>
        0
    )
}
