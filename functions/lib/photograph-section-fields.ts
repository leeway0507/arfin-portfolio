export function parsePhotographSectionTitle(value: unknown): string | null {
    return parseRequiredText(value, 120)
}

export function parsePhotographSectionId(value: unknown): string | null {
    return parseRequiredText(value, 120)
}

export function normalizePhotographSectionTitle(title: string): string {
    return title.normalize('NFKC').trim().replace(/\s+/g, ' ').toLowerCase()
}

function parseRequiredText(value: unknown, maxLength: number): string | null {
    if (typeof value !== 'string') return null
    const text = value.trim()
    return text.length > 0 && text.length <= maxLength ? text : null
}
