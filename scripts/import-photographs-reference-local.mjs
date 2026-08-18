#!/usr/bin/env node

import { createHash } from 'node:crypto'
import {
    appendFileSync,
    mkdirSync,
    mkdtempSync,
    readFileSync,
    rmSync,
    statSync,
    writeFileSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import { basename, join, resolve } from 'node:path'
import { spawnSync } from 'node:child_process'

const LOCAL_ADMIN_TOKEN = 'arfin-local-development-admin'
const MAX_WEBP_BYTES = 2 * 1024 * 1024
const MAX_IMAGE_EDGE = 1920
const API_BASE = process.env.PHOTOGRAPH_IMPORT_API_BASE ?? 'http://localhost:8788'
const SOURCE_ROOT = resolve(
    process.env.PHOTOGRAPH_IMPORT_SOURCE ?? '/Users/leeyangwoo/Downloads/photo',
)
const RUN_ROOT = resolve('tmp/photographs-import-runs')

const SECTION_SPECS = [
    {
        title: 'Editorial',
        existingProjectOrder: [
            {
                publication: 'L’Officiel Hommes Hong Kong',
                title: 'Layers of Him',
                textPosition: 'left',
            },
        ],
        projects: [
            {
                publication: 'Numéro Switzerland',
                title: 'Between Frames',
                textPosition: 'right',
                hero: asset(
                    'Numero Switzerland/E.M_07.jpg',
                    'Between Frames portrait for Numéro Switzerland',
                ),
                gallery: [
                    asset(
                        'Numero Switzerland/E.M_01.jpg',
                        'Between Frames pink dress portrait for Numéro Switzerland',
                    ),
                    asset(
                        'Numero Switzerland/E.M_06.jpg',
                        'Between Frames black fur portrait with a white bag',
                    ),
                    asset(
                        'Numero Switzerland/E.M_10.jpg',
                        'Between Frames black dress portrait for Numéro Switzerland',
                    ),
                    asset(
                        'Numero Switzerland/E.M_11.jpg',
                        'Between Frames black-and-white lace portrait',
                    ),
                    asset(
                        'Numero Switzerland/E.M_14.jpg',
                        'Between Frames pink corset portrait for Numéro Switzerland',
                    ),
                    asset(
                        'Numero Switzerland/E.M_05.jpg',
                        'Between Frames full-length black fur portrait',
                    ),
                    asset(
                        'Numero Switzerland/E.M_17.jpg',
                        'Between Frames open-back white shirt portrait',
                    ),
                    asset(
                        'Numero Switzerland/E.M_19.jpg',
                        'Between Frames brown corset portrait with a handbag',
                    ),
                    asset(
                        'Numero Switzerland/E.M_16.jpg',
                        'Between Frames white shirt and pleated skirt portrait',
                    ),
                    asset(
                        'Numero Switzerland/E.M_18.jpg',
                        'Between Frames black-and-white leather portrait',
                    ),
                ],
            },
        ],
    },
    {
        title: 'Celebrity',
        projects: [
            {
                publication: 'MBC',
                title: 'Sora & Jinkyung',
                textPosition: 'left',
                hero: asset(
                    'Sora&Jinkyung/Sora&Jinkyung_indoor.jpg',
                    'Sora and Jinkyung indoor portrait for MBC',
                ),
                gallery: [
                    asset(
                        'Sora&Jinkyung/Sora&Jinkyung_outdoor.jpg',
                        'Sora and Jinkyung outdoor portrait in Paris for MBC',
                    ),
                ],
            },
        ],
    },
    {
        title: 'Backstage - Fashion Show',
        projects: [
            {
                publication: 'Walter Van Beirendonck',
                title: 'FW 26',
                textPosition: 'left',
                hero: asset(
                    'Walter Van Beirendonck/YCH_7750 1.jpeg',
                    'Walter Van Beirendonck FW 26 backstage group portrait',
                ),
                gallery: [
                    asset(
                        'Walter Van Beirendonck/YCH_7780.jpeg',
                        'Walter Van Beirendonck FW 26 backstage hat lineup',
                    ),
                    asset(
                        'Walter Van Beirendonck/YCH_7809, 7846.jpeg',
                        'Walter Van Beirendonck FW 26 green look diptych',
                    ),
                ],
            },
            {
                publication: 'Pierre Cardin',
                title: 'FW 26',
                textPosition: 'right',
                hero: asset('Pierre Cardin/P.C_1_1.jpeg', 'Pierre Cardin FW 26 purple runway look'),
                gallery: [
                    asset(
                        'Pierre Cardin/P.C_2_1.jpeg',
                        'Pierre Cardin FW 26 black-and-white runway diptych',
                    ),
                ],
            },
        ],
    },
    {
        title: 'New Faces',
        projects: [
            {
                publication: 'Testshoot',
                title: 'Day',
                textPosition: 'left',
                hero: asset(
                    'New Faces/Sarah, 2024.JPEG',
                    'Sarah black-and-white test shoot portrait, 2024',
                ),
                gallery: [
                    asset('New Faces/Alice, 2025.jpeg', 'Alice test shoot portrait, 2025'),
                    asset('New Faces/Sia, 2024.jpeg', 'Sia outdoor test shoot portrait, 2024'),
                    asset('New Faces/Carla, 2024.jpeg', 'Carla test shoot portrait, 2024'),
                    asset(
                        'New Faces/Benedetta, 2025.jpeg',
                        'Benedetta black-and-white test shoot portrait, 2025',
                    ),
                    asset(
                        'New Faces/Nikolina, 2025.jpeg',
                        'Nikolina black-and-white test shoot portrait, 2025',
                    ),
                ],
            },
        ],
    },
    {
        title: 'Exhibition',
        projects: [
            {
                publication: 'Automne et Lumiére de Corée',
                title: 'Day',
                textPosition: 'left',
                hero: asset(
                    'Exhibition/Mora, 2025.jpeg',
                    'Mora reclining outdoors for Automne et Lumiére de Corée, 2025',
                ),
                gallery: [],
            },
        ],
    },
]

const mode = parseMode(process.argv.slice(2))
const apiUrl = validateLocalApiBase(API_BASE)
const runId = new Date().toISOString().replaceAll(':', '-').replaceAll('.', '-')
const runDirectory = join(RUN_ROOT, runId)
const journalPath = join(runDirectory, 'journal.jsonl')
const preparedDirectory = mkdtempSync(join(tmpdir(), 'arfin-photographs-import-'))

mkdirSync(runDirectory, { recursive: true })

try {
    journal('run-started', { mode, apiBase: apiUrl.origin, sourceRoot: SOURCE_ROOT })
    const preparedSections = prepareReferenceAssets(preparedDirectory)
    const initialSnapshot = await getManifestSnapshot()
    writeFileSync(
        join(runDirectory, 'manifest-before.json'),
        `${JSON.stringify(initialSnapshot.manifest, null, 2)}\n`,
    )
    const initialAnalysis = await analyzeManifest(initialSnapshot.manifest, preparedSections)
    writeFileSync(
        join(runDirectory, 'preflight.json'),
        `${JSON.stringify(initialAnalysis, null, 2)}\n`,
    )
    journal('preflight-completed', {
        etag: initialSnapshot.etag,
        plannedActions: initialAnalysis.actions,
    })

    if (mode === 'check') {
        console.log(JSON.stringify(initialAnalysis, null, 2))
        journal('check-completed', { etag: initialSnapshot.etag })
    } else {
        await applyImport(initialSnapshot, preparedSections)
    }
} catch (error) {
    journal('run-failed', { error: getErrorMessage(error) })
    console.error(`Import failed. Backup and journal: ${runDirectory}`)
    throw error
} finally {
    rmSync(preparedDirectory, { recursive: true, force: true })
}

function asset(relativePath, alt) {
    return { relativePath, alt }
}

function parseMode(args) {
    const isCheck = args.includes('--check')
    const isApply = args.includes('--apply')
    if (isCheck === isApply) {
        throw new Error('Use exactly one of --check or --apply.')
    }
    return isApply ? 'apply' : 'check'
}

function validateLocalApiBase(value) {
    const url = new URL(value)
    const localHostnames = new Set(['localhost', '127.0.0.1', '[::1]'])
    if (url.protocol !== 'http:' || !localHostnames.has(url.hostname) || url.port !== '8788') {
        throw new Error('Import API must be a local http URL on port 8788.')
    }
    return url
}

function prepareReferenceAssets(outputDirectory) {
    return SECTION_SPECS.map((section, sectionIndex) => ({
        ...section,
        projects: section.projects.map((project, projectIndex) => ({
            ...project,
            hero: prepareAsset(project.hero, outputDirectory, sectionIndex, projectIndex, 'hero'),
            gallery: project.gallery.map((image, imageIndex) =>
                prepareAsset(
                    image,
                    outputDirectory,
                    sectionIndex,
                    projectIndex,
                    `gallery-${imageIndex}`,
                ),
            ),
        })),
    }))
}

function prepareAsset(spec, outputDirectory, sectionIndex, projectIndex, role) {
    const sourcePath = join(SOURCE_ROOT, spec.relativePath)
    const sourceDimensions = readImageDimensions(sourcePath)
    const outputPath = join(outputDirectory, `${sectionIndex}-${projectIndex}-${role}.webp`)
    const resize =
        sourceDimensions.width >= sourceDimensions.height
            ? [String(MAX_IMAGE_EDGE), '0']
            : ['0', String(MAX_IMAGE_EDGE)]
    runCommand('cwebp', [
        '-quiet',
        '-mt',
        '-q',
        '82',
        '-metadata',
        'none',
        '-resize',
        ...resize,
        sourcePath,
        '-o',
        outputPath,
    ])

    const dimensions = readImageDimensions(outputPath)
    const byteLength = statSync(outputPath).size
    if (
        dimensions.width <= 0 ||
        dimensions.height <= 0 ||
        Math.max(dimensions.width, dimensions.height) > MAX_IMAGE_EDGE
    ) {
        throw new Error(`Invalid optimized dimensions: ${spec.relativePath}`)
    }
    if (byteLength <= 0 || byteLength > MAX_WEBP_BYTES) {
        throw new Error(`Optimized file exceeds 2 MiB: ${spec.relativePath}`)
    }
    if (!spec.alt.trim() || spec.alt.trim().length > 240) {
        throw new Error(`Invalid alt text: ${spec.relativePath}`)
    }

    const bytes = readFileSync(outputPath)
    return {
        ...spec,
        alt: spec.alt.trim(),
        outputPath,
        outputName: `${basename(spec.relativePath).replace(/\.[^.]+$/, '')}.webp`,
        byteLength,
        width: dimensions.width,
        height: dimensions.height,
        sha256: sha256(bytes),
    }
}

function readImageDimensions(path) {
    const result = runCommand('sips', ['-g', 'pixelWidth', '-g', 'pixelHeight', path])
    const width = Number(result.match(/pixelWidth:\s*(\d+)/)?.[1])
    const height = Number(result.match(/pixelHeight:\s*(\d+)/)?.[1])
    if (!Number.isInteger(width) || !Number.isInteger(height)) {
        throw new Error(`Unable to read image dimensions: ${path}`)
    }
    return { width, height }
}

function runCommand(command, args) {
    const result = spawnSync(command, args, { encoding: 'utf8' })
    if (result.status !== 0) {
        throw new Error(`${command} failed: ${result.stderr || result.stdout}`)
    }
    return result.stdout
}

async function applyImport(initialSnapshot, preparedSections) {
    let snapshot = initialSnapshot

    for (const sectionSpec of preparedSections) {
        let section = findExactSection(snapshot.manifest, sectionSpec.title)
        if (!section) {
            const mutation = await createSection(sectionSpec.title, snapshot.etag)
            journalMutation('section-created', mutation, { section: mutation.body.section })
            snapshot = await confirmMutationSnapshot(mutation.etag)
            section = findExactSection(snapshot.manifest, sectionSpec.title)
        }
        if (!section) throw new Error(`Created section not found: ${sectionSpec.title}`)

        for (const existingProjectSpec of sectionSpec.existingProjectOrder ?? []) {
            const existingProject = findExactProject(section, existingProjectSpec)
            if (!existingProject) {
                throw new Error(
                    `Required existing project not found: ${existingProjectSpec.publication} / ${existingProjectSpec.title}`,
                )
            }
            if (existingProject.textPosition === existingProjectSpec.textPosition) continue

            const mutation = await updateProjectPosition(
                section.id,
                existingProject,
                existingProjectSpec.textPosition,
                snapshot.etag,
            )
            journalMutation('existing-project-position-updated', mutation, {
                sectionId: section.id,
                projectId: existingProject.id,
                textPosition: existingProjectSpec.textPosition,
            })
            snapshot = await confirmMutationSnapshot(mutation.etag)
            section = findExactSection(snapshot.manifest, sectionSpec.title)
            if (!section) throw new Error(`Updated section not found: ${sectionSpec.title}`)
        }

        for (const projectSpec of sectionSpec.projects) {
            let project = findExactProject(section, projectSpec)
            if (!project) {
                const mutation = await createProject(section.id, projectSpec, snapshot.etag)
                journalMutation('project-created', mutation, {
                    sectionId: section.id,
                    project: mutation.body.project,
                })
                snapshot = await confirmMutationSnapshot(mutation.etag)
                section = findExactSection(snapshot.manifest, sectionSpec.title)
                project = section ? findExactProject(section, projectSpec) : null
            }
            if (!section || !project) {
                throw new Error(
                    `Created project not found: ${projectSpec.publication} / ${projectSpec.title}`,
                )
            }

            let inspection = await inspectProject(project, projectSpec)
            if (inspection.contentStatus === 'hero-only' && projectSpec.gallery.length > 0) {
                const existingObjectKeys = new Set(project.images.map((image) => image.objectKey))
                const mutation = await uploadGallery(
                    section.id,
                    project.id,
                    projectSpec.gallery,
                    snapshot.etag,
                )
                journalMutation('gallery-uploaded', mutation, {
                    sectionId: section.id,
                    projectId: project.id,
                    count: projectSpec.gallery.length,
                    uploadedObjectKeys: mutation.body.project.images
                        .map((image) => image.objectKey)
                        .filter((objectKey) => !existingObjectKeys.has(objectKey)),
                })
                snapshot = await confirmMutationSnapshot(mutation.etag)
                section = findExactSection(snapshot.manifest, sectionSpec.title)
                project = section ? findExactProject(section, projectSpec) : null
                if (!project) throw new Error(`Uploaded project not found: ${projectSpec.title}`)
                inspection = await inspectProject(project, projectSpec)
            }
            if (inspection.contentStatus !== 'complete') {
                throw new Error(inspection.error ?? `Project is not complete: ${projectSpec.title}`)
            }

            if (project.textPosition !== projectSpec.textPosition) {
                const mutation = await updateProjectPosition(
                    section.id,
                    project,
                    projectSpec.textPosition,
                    snapshot.etag,
                )
                journalMutation('project-position-updated', mutation, {
                    sectionId: section.id,
                    projectId: project.id,
                    textPosition: projectSpec.textPosition,
                })
                snapshot = await confirmMutationSnapshot(mutation.etag)
                section = findExactSection(snapshot.manifest, sectionSpec.title)
                project = section ? findExactProject(section, projectSpec) : null
                if (!project) throw new Error(`Updated project not found: ${projectSpec.title}`)
            }
        }
    }

    const completeAnalysis = await analyzeManifest(snapshot.manifest, preparedSections, {
        requireComplete: true,
    })
    journal('content-completed', { etag: snapshot.etag, analysis: completeAnalysis })

    snapshot = await reconcileProjectOrders(snapshot, preparedSections)
    snapshot = await reconcileSectionOrder(snapshot, preparedSections)

    const finalAnalysis = await analyzeManifest(snapshot.manifest, preparedSections, {
        requireComplete: true,
        requireOrder: true,
    })
    writeFileSync(
        join(runDirectory, 'manifest-after.json'),
        `${JSON.stringify(snapshot.manifest, null, 2)}\n`,
    )
    journal('run-completed', { etag: snapshot.etag, analysis: finalAnalysis })
    console.log(JSON.stringify(finalAnalysis, null, 2))
    console.log(`Import completed. Run record: ${runDirectory}`)
}

async function analyzeManifest(manifest, preparedSections, options = {}) {
    validateUniqueSpecMatches(manifest, preparedSections)
    const actions = []
    const projects = []

    for (const sectionSpec of preparedSections) {
        const section = findExactSection(manifest, sectionSpec.title)
        if (!section) {
            actions.push(`create section: ${sectionSpec.title}`)
            for (const projectSpec of sectionSpec.projects) {
                addNewProjectActions(actions, sectionSpec.title, projectSpec)
            }
            continue
        }

        for (const existingProjectSpec of sectionSpec.existingProjectOrder ?? []) {
            const existingProject = findExactProject(section, existingProjectSpec)
            if (existingProject?.textPosition !== existingProjectSpec.textPosition) {
                actions.push(
                    `set text position ${existingProjectSpec.textPosition}: ${existingProjectSpec.publication} / ${existingProjectSpec.title}`,
                )
            }
        }

        for (const projectSpec of sectionSpec.projects) {
            const project = findExactProject(section, projectSpec)
            if (!project) {
                addNewProjectActions(actions, sectionSpec.title, projectSpec)
                continue
            }
            const inspection = await inspectProject(project, projectSpec)
            projects.push({
                section: sectionSpec.title,
                publication: projectSpec.publication,
                title: projectSpec.title,
                ...inspection,
            })
            if (inspection.contentStatus === 'hero-only') {
                actions.push(
                    `upload ${projectSpec.gallery.length} gallery images: ${projectSpec.publication} / ${projectSpec.title}`,
                )
            } else if (inspection.contentStatus !== 'complete') {
                throw new Error(inspection.error)
            }
            if (project.textPosition !== projectSpec.textPosition) {
                actions.push(
                    `set text position ${projectSpec.textPosition}: ${projectSpec.publication} / ${projectSpec.title}`,
                )
            }
            if (options.requireComplete && inspection.contentStatus !== 'complete') {
                throw new Error(
                    `Project import is incomplete: ${projectSpec.publication} / ${projectSpec.title}`,
                )
            }
        }
    }

    const expectedSectionIds = mapKnownSectionOrder(manifest, preparedSections)
    const currentSectionIds = manifest.sections.map((section) => section.id)
    if (!arraysEqual(expectedSectionIds, currentSectionIds)) actions.push('reorder sections')

    for (const sectionSpec of preparedSections) {
        const section = findExactSection(manifest, sectionSpec.title)
        if (!section) continue
        const knownProjectSpecs = [
            ...(sectionSpec.existingProjectOrder ?? []),
            ...sectionSpec.projects,
        ]
        const hasEveryKnownProject = knownProjectSpecs.every((spec) =>
            findExactProject(section, spec),
        )
        if (!hasEveryKnownProject) continue
        const expectedProjectIds = mapKnownProjectOrder(section, sectionSpec)
        const currentProjectIds = section.projects.map((project) => project.id)
        if (!arraysEqual(expectedProjectIds, currentProjectIds)) {
            actions.push(`reorder projects: ${sectionSpec.title}`)
        }
    }

    if (options.requireOrder && actions.some((action) => action.startsWith('reorder'))) {
        throw new Error('Final section/project order does not match the PDF reference.')
    }
    if (options.requireComplete && actions.some((action) => !action.startsWith('reorder'))) {
        throw new Error('Final content does not match the PDF reference.')
    }

    return {
        sectionCount: manifest.sections.length,
        projectCount: manifest.sections.reduce(
            (count, section) => count + section.projects.length,
            0,
        ),
        actions,
        projects,
    }
}

function validateUniqueSpecMatches(manifest, preparedSections) {
    for (const sectionSpec of preparedSections) {
        const exactSections = manifest.sections.filter(
            (section) => section.title === sectionSpec.title,
        )
        if (exactSections.length > 1) throw new Error(`Duplicate section: ${sectionSpec.title}`)
        if (exactSections.length === 0) {
            if ((sectionSpec.existingProjectOrder?.length ?? 0) > 0) {
                throw new Error(`Required existing section not found: ${sectionSpec.title}`)
            }
            const normalizedMatches = manifest.sections.filter(
                (section) => normalizeTitle(section.title) === normalizeTitle(sectionSpec.title),
            )
            if (normalizedMatches.length > 0) {
                throw new Error(`Normalized section title collision: ${sectionSpec.title}`)
            }
            continue
        }

        const section = exactSections[0]
        for (const projectSpec of [
            ...(sectionSpec.existingProjectOrder ?? []),
            ...sectionSpec.projects,
        ]) {
            const matches = section.projects.filter(
                (project) =>
                    project.publication === projectSpec.publication &&
                    project.title === projectSpec.title,
            )
            if (matches.length > 1) {
                throw new Error(
                    `Duplicate project: ${sectionSpec.title} / ${projectSpec.publication} / ${projectSpec.title}`,
                )
            }
            if (sectionSpec.existingProjectOrder?.includes(projectSpec) && matches.length !== 1) {
                throw new Error(
                    `Required existing project not found: ${projectSpec.publication} / ${projectSpec.title}`,
                )
            }
        }
    }
}

function addNewProjectActions(actions, sectionTitle, projectSpec) {
    actions.push(
        `create project: ${sectionTitle} / ${projectSpec.publication} / ${projectSpec.title}`,
    )
    if (projectSpec.gallery.length > 0) {
        actions.push(
            `upload ${projectSpec.gallery.length} gallery images: ${projectSpec.publication} / ${projectSpec.title}`,
        )
    }
    if (projectSpec.textPosition !== 'left') {
        actions.push(
            `set text position ${projectSpec.textPosition}: ${projectSpec.publication} / ${projectSpec.title}`,
        )
    }
}

async function inspectProject(project, projectSpec) {
    const imageById = new Map(project.images.map((image) => [image.id, image]))
    if (imageById.size !== project.images.length) {
        return invalidInspection('Project contains duplicate image IDs.')
    }
    const heroImage = imageById.get(project.heroImageId)
    if (!heroImage) return invalidInspection('Project hero image metadata is missing.')
    await assertRemoteAssetMatches(heroImage, projectSpec.hero)

    const referencedIds = new Set([project.heroImageId, ...project.galleryImageIds])
    if (referencedIds.size !== 1 + project.galleryImageIds.length) {
        return invalidInspection('Hero and gallery references contain an unexpected duplicate.')
    }
    if (project.images.some((image) => !referencedIds.has(image.id))) {
        return invalidInspection('Project contains unexpected unused image metadata.')
    }
    if (project.galleryImageIds.length === 0 && projectSpec.gallery.length > 0) {
        if (project.images.length !== 1) {
            return invalidInspection('Hero-only project contains unexpected image metadata.')
        }
        return { contentStatus: 'hero-only', textPosition: project.textPosition }
    }
    if (project.galleryImageIds.length !== projectSpec.gallery.length) {
        return invalidInspection('Existing gallery count does not match the PDF reference.')
    }
    if (project.images.length !== 1 + projectSpec.gallery.length) {
        return invalidInspection('Existing image library count does not match the PDF reference.')
    }

    for (let index = 0; index < projectSpec.gallery.length; index += 1) {
        const image = imageById.get(project.galleryImageIds[index])
        if (!image) return invalidInspection(`Gallery image ${index + 1} metadata is missing.`)
        await assertRemoteAssetMatches(image, projectSpec.gallery[index])
    }
    return { contentStatus: 'complete', textPosition: project.textPosition }
}

function invalidInspection(error) {
    return { contentStatus: 'invalid', error }
}

async function assertRemoteAssetMatches(metadata, preparedAsset) {
    if (
        metadata.alt !== preparedAsset.alt ||
        metadata.width !== preparedAsset.width ||
        metadata.height !== preparedAsset.height
    ) {
        throw new Error(`Asset metadata mismatch: ${preparedAsset.relativePath}`)
    }
    const url = new URL('/api/photos/image', apiUrl)
    url.searchParams.set('filename', metadata.objectKey)
    const response = await fetch(url, { redirect: 'error' })
    if (!response.ok) {
        throw new Error(`Unable to read existing asset (${response.status}): ${metadata.objectKey}`)
    }
    const existingHash = sha256(Buffer.from(await response.arrayBuffer()))
    if (existingHash !== preparedAsset.sha256) {
        throw new Error(`Asset hash mismatch: ${preparedAsset.relativePath}`)
    }
}

async function createSection(title, etag) {
    return requestMutation('/api/photograph-sections', {
        method: 'POST',
        etag,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title }),
    })
}

async function createProject(sectionId, projectSpec, etag) {
    const form = new FormData()
    form.set('sectionId', sectionId)
    form.set('publication', projectSpec.publication)
    form.set('title', projectSpec.title)
    form.set('heroAlt', projectSpec.hero.alt)
    form.set('heroFile', toBlob(projectSpec.hero), projectSpec.hero.outputName)
    return requestMutation('/api/photograph-projects', { method: 'POST', etag, body: form })
}

async function uploadGallery(sectionId, projectId, gallery, etag) {
    const form = new FormData()
    form.set('sectionId', sectionId)
    form.set('projectId', projectId)
    form.set('target', 'gallery')
    for (const image of gallery) {
        form.append('alts', image.alt)
        form.append('files', toBlob(image), image.outputName)
    }
    return requestMutation('/api/photograph-assets', { method: 'POST', etag, body: form })
}

async function updateProjectPosition(sectionId, project, textPosition, etag) {
    return requestMutation('/api/photographs', {
        method: 'PATCH',
        etag,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            sectionId,
            projectId: project.id,
            publication: project.publication,
            title: project.title,
            textPosition,
            heroImageId: project.heroImageId,
            galleryImageIds: project.galleryImageIds,
        }),
    })
}

async function reconcileProjectOrders(snapshot, preparedSections) {
    let currentSnapshot = snapshot
    for (const sectionSpec of preparedSections) {
        const section = findExactSection(currentSnapshot.manifest, sectionSpec.title)
        if (!section)
            throw new Error(`Section missing during order reconciliation: ${sectionSpec.title}`)
        const projectIds = mapKnownProjectOrder(section, sectionSpec)
        if (
            arraysEqual(
                projectIds,
                section.projects.map((project) => project.id),
            )
        )
            continue
        const mutation = await requestMutation('/api/photograph-project-order', {
            method: 'PATCH',
            etag: currentSnapshot.etag,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sectionId: section.id, projectIds }),
        })
        journalMutation('project-order-reconciled', mutation, {
            sectionId: section.id,
            projectIds,
        })
        currentSnapshot = await confirmMutationSnapshot(mutation.etag)
    }
    return currentSnapshot
}

async function reconcileSectionOrder(snapshot, preparedSections) {
    const sectionIds = mapKnownSectionOrder(snapshot.manifest, preparedSections)
    if (
        arraysEqual(
            sectionIds,
            snapshot.manifest.sections.map((section) => section.id),
        )
    ) {
        return snapshot
    }
    const mutation = await requestMutation('/api/photograph-section-order', {
        method: 'PATCH',
        etag: snapshot.etag,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sectionIds }),
    })
    journalMutation('section-order-reconciled', mutation, { sectionIds })
    return confirmMutationSnapshot(mutation.etag)
}

function mapKnownProjectOrder(section, sectionSpec) {
    const knownSpecs = [...(sectionSpec.existingProjectOrder ?? []), ...sectionSpec.projects]
    const knownIds = knownSpecs.map((spec) => {
        const project = findExactProject(section, spec)
        if (!project)
            throw new Error(
                `Known project missing during order reconciliation: ${spec.publication} / ${spec.title}`,
            )
        return project.id
    })
    const knownIdSet = new Set(knownIds)
    return [
        ...knownIds,
        ...section.projects
            .filter((project) => !knownIdSet.has(project.id))
            .map((project) => project.id),
    ]
}

function mapKnownSectionOrder(manifest, preparedSections) {
    const knownIds = preparedSections.flatMap((spec) => {
        const section = findExactSection(manifest, spec.title)
        return section ? [section.id] : []
    })
    const knownIdSet = new Set(knownIds)
    return [
        ...knownIds,
        ...manifest.sections
            .filter((section) => !knownIdSet.has(section.id))
            .map((section) => section.id),
    ]
}

async function requestMutation(path, { method, etag, headers = {}, body }) {
    const response = await fetch(new URL(path, apiUrl), {
        method,
        redirect: 'error',
        headers: {
            Authorization: `Bearer ${LOCAL_ADMIN_TOKEN}`,
            'If-Match': etag,
            ...headers,
        },
        body,
    })
    const responseText = await response.text()
    const responseBody = responseText ? JSON.parse(responseText) : null
    if (!response.ok) {
        throw new Error(`${method} ${path} failed (${response.status}): ${responseText}`)
    }
    const nextEtag = response.headers.get('ETag')
    if (!nextEtag) throw new Error(`${method} ${path} response is missing ETag.`)
    return { body: responseBody, etag: nextEtag, status: response.status }
}

async function getManifestSnapshot() {
    const response = await fetch(new URL('/api/photographs', apiUrl), {
        redirect: 'error',
        headers: { Authorization: `Bearer ${LOCAL_ADMIN_TOKEN}` },
    })
    if (!response.ok) throw new Error(`GET manifest failed (${response.status}).`)
    const etag = response.headers.get('ETag')
    if (!etag) throw new Error('GET manifest response is missing ETag.')
    return { manifest: await response.json(), etag }
}

async function confirmMutationSnapshot(expectedEtag) {
    const snapshot = await getManifestSnapshot()
    if (snapshot.etag !== expectedEtag) {
        throw new Error('Mutation response ETag does not match the current manifest ETag.')
    }
    return snapshot
}

function journalMutation(event, mutation, details) {
    journal(event, { status: mutation.status, etag: mutation.etag, ...details })
}

function journal(event, details) {
    appendFileSync(
        journalPath,
        `${JSON.stringify({ at: new Date().toISOString(), event, ...details })}\n`,
    )
}

function toBlob(preparedAsset) {
    return new Blob([readFileSync(preparedAsset.outputPath)], { type: 'image/webp' })
}

function findExactSection(manifest, title) {
    return manifest.sections.find((section) => section.title === title) ?? null
}

function findExactProject(section, spec) {
    return (
        section.projects.find(
            (project) => project.publication === spec.publication && project.title === spec.title,
        ) ?? null
    )
}

function normalizeTitle(value) {
    return value.normalize('NFKC').trim().toLocaleLowerCase('en-US').replace(/\s+/g, ' ')
}

function sha256(bytes) {
    return createHash('sha256').update(bytes).digest('hex')
}

function arraysEqual(left, right) {
    return left.length === right.length && left.every((value, index) => value === right[index])
}

function getErrorMessage(error) {
    return error instanceof Error ? error.message : String(error)
}
