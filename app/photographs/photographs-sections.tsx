'use client'

import Image from 'next/image'
import { useReducedMotion } from 'motion/react'
import { Fragment, useCallback, useEffect, useId, useMemo, useRef, useState } from 'react'
import { FiChevronLeft, FiChevronRight, FiMaximize2 } from 'react-icons/fi'
import useEmblaCarousel from 'embla-carousel-react'
import { PhotographProjectLayout } from '@/components/photographs/photograph-project-layout'
import type {
    PhotographImage,
    PhotographProject,
    PhotographSection,
} from '@/lib/apis/photographs/types'
import { cn } from '@/lib/utils'
import { PhotographImageLightbox } from './components/photograph-image-lightbox'
import { usePhotographCarouselActivity } from './hooks/use-photograph-carousel-activity'
import { usePhotographCarouselLayoutMode } from './hooks/use-photograph-carousel-layout-mode'
import { usePhotographWheelStepNavigation } from './hooks/use-photograph-wheel-step-navigation'
import {
    getPhotographCarouselImageSizes,
    shouldRunPhotographCarouselAutoAdvance,
} from './lib/photograph-carousel-state'

interface PhotographsSectionsProps {
    sections: PhotographSection[]
}

interface PhotographSectionShowcaseProps {
    section: PhotographSection
    sectionIndex: number
}

interface PhotographProjectShowcaseProps {
    isFirstProject: boolean
    project: PhotographProject
    isPriority: boolean
}

interface PhotographProjectHeaderProps {
    project: PhotographProject
    heroImage: PhotographImage
    isPriority: boolean
    onOpenHeroImage: (openerElement: HTMLButtonElement) => void
    projectHeadingId: string
    projectTitleId: string
}

interface PhotographProjectCarouselProps {
    publication: string
    projectTitle: string
    carouselImages: PhotographImage[]
    isLightboxOpen: boolean
    onOpenImage: (imageIndex: number, openerElement: HTMLButtonElement) => void
}

interface PhotographProjectCarouselControlsProps {
    isAutoAdvanceStopped: boolean
    onShowPreviousImage: () => void
    onShowNextImage: () => void
    onStopAutoAdvance: () => void
}

interface PhotographProjectCarouselImageProps {
    image: PhotographImage
    imageIndex: number
    imageCount: number
    onOpenImage: (imageIndex: number, openerElement: HTMLButtonElement) => void
}

type PhotographLightboxState = { source: 'hero' } | { source: 'gallery'; imageIndex: number }
type PhotographCarouselLayoutMode = 'active' | 'static'

export function PhotographsSections({ sections }: PhotographsSectionsProps) {
    return (
        <PhotographsPageFrame>
            {sections.map((section, sectionIndex) => (
                <Fragment key={section.id}>
                    {sectionIndex > 0 ? <PhotographFullBleedDivider /> : null}
                    <PhotographSectionShowcase
                        section={section}
                        sectionIndex={sectionIndex}
                    />
                </Fragment>
            ))}
        </PhotographsPageFrame>
    )
}

function PhotographsPageFrame({ children }: { children: React.ReactNode }) {
    return (
        <main className="min-h-dvh overflow-hidden pb-28 pt-16 sm:pb-16">
            <div className="mx-auto w-full max-w-[1400px] px-4 sm:px-8">
                <h1 className="sr-only">Photographs</h1>
                {children}
            </div>
        </main>
    )
}

function PhotographFullBleedDivider() {
    return (
        <hr className="relative left-1/2 mb-[3.125rem] mt-[1.875rem] w-dvw -translate-x-1/2 border-0 border-t border-black/10" />
    )
}

function PhotographSectionShowcase({ section, sectionIndex }: PhotographSectionShowcaseProps) {
    const sectionHeadingId = useId()

    return (
        <section aria-labelledby={sectionHeadingId}>
            <PhotographSectionTitle title={section.title} headingId={sectionHeadingId} />
            {section.projects.map((project, projectIndex) => (
                <Fragment key={project.id}>
                    {projectIndex > 0 ? <PhotographFullBleedDivider /> : null}
                    <PhotographProjectShowcase
                        isFirstProject={projectIndex === 0}
                        project={project}
                        isPriority={sectionIndex === 0 && projectIndex === 0}
                    />
                </Fragment>
            ))}
        </section>
    )
}

function PhotographSectionTitle({ title, headingId }: { title: string; headingId: string }) {
    return (
        <header className="flex flex-col items-center text-center">
            <h2 id={headingId} className="text-[2.5rem] font-semibold tracking-[-0.035em]">
                {title}
            </h2>
            <hr className="mt-5 w-[13px] border-0 border-t-[3px] border-black" />
        </header>
    )
}

function PhotographProjectShowcase({
    isFirstProject,
    project,
    isPriority,
}: PhotographProjectShowcaseProps) {
    const heroImage = findHeroImage(project)
    const carouselImages = useMemo(() => findGalleryImages(project), [project])
    const projectHeadingId = useId()
    const projectTitleId = useId()
    const [lightboxState, setLightboxState] = useState<PhotographLightboxState | null>(null)
    const lightboxOpenerRef = useRef<HTMLButtonElement | null>(null)
    const lightboxImages = lightboxState?.source === 'gallery' ? carouselImages : [heroImage]
    const lightboxInitialIndex = lightboxState?.source === 'gallery' ? lightboxState.imageIndex : 0

    const handleOpenHeroImage = (openerElement: HTMLButtonElement) => {
        lightboxOpenerRef.current = openerElement
        setLightboxState({ source: 'hero' })
    }

    const handleOpenGalleryImage = (imageIndex: number, openerElement: HTMLButtonElement) => {
        lightboxOpenerRef.current = openerElement
        setLightboxState({ source: 'gallery', imageIndex })
    }

    const handleLightboxOpenChange = (isOpen: boolean) => {
        if (isOpen) return
        setLightboxState(null)
    }

    return (
        <article
            className={isFirstProject ? 'mt-5' : undefined}
            aria-labelledby={`${projectHeadingId} ${projectTitleId}`}
        >
            <PhotographProjectHeader
                project={project}
                heroImage={heroImage}
                isPriority={isPriority}
                onOpenHeroImage={handleOpenHeroImage}
                projectHeadingId={projectHeadingId}
                projectTitleId={projectTitleId}
            />
            {carouselImages.length > 0 && (
                <PhotographProjectCarousel
                    publication={project.publication}
                    projectTitle={project.title}
                    carouselImages={carouselImages}
                    isLightboxOpen={lightboxState !== null}
                    onOpenImage={handleOpenGalleryImage}
                />
            )}
            <PhotographImageLightbox
                images={lightboxImages}
                initialIndex={lightboxInitialIndex}
                open={lightboxState !== null}
                projectLabel={`${project.publication} — ${project.title}`}
                returnFocusTo={lightboxOpenerRef.current}
                onOpenChange={handleLightboxOpenChange}
            />
        </article>
    )
}

function PhotographProjectHeader({
    project,
    heroImage,
    isPriority,
    onOpenHeroImage,
    projectHeadingId,
    projectTitleId,
}: PhotographProjectHeaderProps) {
    return (
        <PhotographProjectLayout
            textPosition={project.textPosition}
            textContent={
                <PhotographProjectText
                    project={project}
                    projectHeadingId={projectHeadingId}
                    projectTitleId={projectTitleId}
                />
            }
            heroContent={
                <PhotographProjectHeroImage
                    image={heroImage}
                    isPriority={isPriority}
                    onOpenImage={onOpenHeroImage}
                />
            }
        />
    )
}

function PhotographProjectText({
    project,
    projectHeadingId,
    projectTitleId,
}: {
    project: PhotographProject
    projectHeadingId: string
    projectTitleId: string
}) {
    return (
        <header className="flex w-full flex-col items-center text-center">
            <h3
                id={projectHeadingId}
                className="max-w-[34rem] whitespace-pre-wrap text-[1.625rem] font-semibold tracking-[-0.025em]"
            >
                {project.publication}
            </h3>
            <hr className="mt-5 w-[13px] border-0 border-t-[3px] border-black" />
            <p
                id={projectTitleId}
                className="mt-5 whitespace-pre-wrap text-[1.375rem] tracking-[-0.02em]"
            >
                {project.title}
            </p>
        </header>
    )
}

function PhotographProjectHeroImage({
    image,
    isPriority,
    onOpenImage,
}: {
    image: PhotographImage
    isPriority: boolean
    onOpenImage: (openerElement: HTMLButtonElement) => void
}) {
    const isLandscapeImage = image.width > image.height
    const handleOpenImage = (event: React.MouseEvent<HTMLButtonElement>) => {
        onOpenImage(event.currentTarget)
    }

    return (
        <figure
            className={cn(
                'mx-auto w-full',
                isLandscapeImage ? 'max-w-[40rem]' : 'max-w-[24.5rem]',
            )}
        >
            <button
                type="button"
                aria-label={`${image.alt} 대표 이미지 크게 보기`}
                className="group relative block w-full cursor-pointer overflow-hidden focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black"
                onClick={handleOpenImage}
            >
                <Image
                    src={image.imageUrl}
                    alt={image.alt}
                    width={image.width}
                    height={image.height}
                    className="pointer-events-none h-auto w-full select-none object-contain"
                    draggable={false}
                    priority={isPriority}
                    sizes={
                        isLandscapeImage
                            ? '(min-width: 1392px) 640px, (min-width: 768px) calc((100vw - 7rem) / 2), (min-width: 704px) 640px, (min-width: 640px) calc(100vw - 4rem), calc(100vw - 2rem)'
                            : '(min-width: 896px) 392px, (min-width: 768px) calc((100vw - 7rem) / 2), (min-width: 424px) 392px, calc(100vw - 2rem)'
                    }
                />
                <PhotographImageExpandHint />
            </button>
        </figure>
    )
}

function PhotographImageExpandHint() {
    return (
        <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 flex items-end justify-end bg-black/0 p-3 transition-colors duration-200 group-hover:bg-black/10 group-focus-visible:bg-black/10 motion-reduce:transition-none sm:p-4"
        >
            <span className="flex translate-y-1 items-center justify-center rounded-full bg-white/95 p-2.5 text-black opacity-0 shadow-sm ring-1 ring-black/10 transition-all duration-200 group-hover:translate-y-0 group-hover:opacity-100 group-focus-visible:translate-y-0 group-focus-visible:opacity-100 motion-reduce:transition-none">
                <FiMaximize2 className="size-4" />
            </span>
        </span>
    )
}

function PhotographProjectCarousel({
    publication,
    projectTitle,
    carouselImages,
    isLightboxOpen,
    onOpenImage,
}: PhotographProjectCarouselProps) {
    const shouldReduceMotion = useReducedMotion()
    const carouselStatusId = useId()
    const [isMotionReduced, setIsMotionReduced] = useState(false)
    const [isAutoAdvancePaused, setIsAutoAdvancePaused] = useState(false)
    const [isAutoAdvanceStopped, setIsAutoAdvanceStopped] = useState(false)
    const [canAdvance, setCanAdvance] = useState(false)
    const [readyLayoutMode, setReadyLayoutMode] =
        useState<PhotographCarouselLayoutMode | null>(null)
    const [carouselViewportElement, setCarouselViewportElement] = useState<HTMLElement | null>(null)
    const { carouselRegionRef, isCarouselVisible, isDocumentVisible } =
        usePhotographCarouselActivity()
    const carouselContentKey = carouselImages.map((image) => image.id).join('|')
    const { isLayoutMeasured, isUnderfilled } = usePhotographCarouselLayoutMode(
        carouselViewportElement,
        carouselContentKey,
    )
    const carouselLayoutMode: PhotographCarouselLayoutMode | null = !isLayoutMeasured
        ? null
        : isUnderfilled
          ? 'static'
          : 'active'
    const autoAdvanceIntervalRef = useRef<number | null>(null)
    const autoAdvanceResumeTimeoutRef = useRef<number | null>(null)
    const wasLightboxOpenRef = useRef(isLightboxOpen)
    const shouldRunAutoAdvance = shouldRunPhotographCarouselAutoAdvance({
        canAdvance,
        isMotionReduced,
        isAutoAdvancePaused,
        isAutoAdvanceStopped,
        isCarouselVisible,
        isDocumentVisible,
        isLightboxOpen,
    })
    const [emblaViewportRef, carouselApi] = useEmblaCarousel({
        active: isLayoutMeasured && !isUnderfilled,
        align: 'center',
        loop: true,
        skipSnaps: false,
    })
    const emblaViewportRefLatest = useRef(emblaViewportRef)
    emblaViewportRefLatest.current = emblaViewportRef
    const setCarouselViewportRef = useCallback(
        (element: HTMLElement | null) => {
            emblaViewportRefLatest.current(element)
            setCarouselViewportElement(element)
        },
        [],
    )

    useEffect(() => {
        if (!carouselApi || carouselLayoutMode === null) {
            setReadyLayoutMode(null)
            return
        }

        setReadyLayoutMode(carouselLayoutMode)
    }, [carouselApi, carouselLayoutMode])

    useEffect(() => {
        setIsMotionReduced(Boolean(shouldReduceMotion))
    }, [shouldReduceMotion])

    useEffect(() => {
        if (isUnderfilled) {
            setCanAdvance(false)
            return
        }
        if (!carouselApi) return

        const syncCarouselCapabilities = () => {
            setCanAdvance(carouselApi.canScrollNext() || carouselApi.canScrollPrev())
        }

        syncCarouselCapabilities()
        carouselApi.on('reInit', syncCarouselCapabilities)
        return () => {
            carouselApi.off('reInit', syncCarouselCapabilities)
        }
    }, [carouselApi, carouselImages.length, isUnderfilled])

    const scrollToPreviousImage = useCallback(() => {
        if (!carouselApi) return
        if (carouselApi.canScrollPrev()) {
            carouselApi.scrollPrev(Boolean(shouldReduceMotion))
            return
        }

        carouselApi.scrollTo(carouselApi.scrollSnapList().length - 1, Boolean(shouldReduceMotion))
    }, [carouselApi, shouldReduceMotion])

    const scrollToNextImage = useCallback(() => {
        if (!carouselApi) return
        if (carouselApi.canScrollNext()) {
            carouselApi.scrollNext(Boolean(shouldReduceMotion))
            return
        }

        carouselApi.scrollTo(0, Boolean(shouldReduceMotion))
    }, [carouselApi, shouldReduceMotion])

    const stopAutoAdvance = useCallback(() => {
        if (autoAdvanceIntervalRef.current === null) return

        window.clearInterval(autoAdvanceIntervalRef.current)
        autoAdvanceIntervalRef.current = null
    }, [])

    const cancelAutoAdvanceResume = useCallback(() => {
        if (autoAdvanceResumeTimeoutRef.current === null) return

        window.clearTimeout(autoAdvanceResumeTimeoutRef.current)
        autoAdvanceResumeTimeoutRef.current = null
    }, [])

    const startAutoAdvance = useCallback(() => {
        stopAutoAdvance()
        if (!carouselApi || !shouldRunAutoAdvance || carouselImages.length < 2) return

        autoAdvanceIntervalRef.current = window.setInterval(scrollToNextImage, CAROUSEL_INTERVAL_MS)
    }, [
        carouselApi,
        carouselImages.length,
        scrollToNextImage,
        shouldRunAutoAdvance,
        stopAutoAdvance,
    ])

    useEffect(() => {
        startAutoAdvance()
        return stopAutoAdvance
    }, [startAutoAdvance, stopAutoAdvance])

    useEffect(() => {
        if (!isMotionReduced) return

        cancelAutoAdvanceResume()
        setIsAutoAdvancePaused(false)
    }, [cancelAutoAdvanceResume, isMotionReduced])

    useEffect(() => cancelAutoAdvanceResume, [cancelAutoAdvanceResume])

    const pauseAutoAdvanceTemporarily = useCallback(() => {
        stopAutoAdvance()
        cancelAutoAdvanceResume()
        if (isMotionReduced || isAutoAdvanceStopped) return

        setIsAutoAdvancePaused(true)
        autoAdvanceResumeTimeoutRef.current = window.setTimeout(() => {
            autoAdvanceResumeTimeoutRef.current = null
            setIsAutoAdvancePaused(false)
        }, MANUAL_AUTO_ADVANCE_PAUSE_MS)
    }, [cancelAutoAdvanceResume, isAutoAdvanceStopped, isMotionReduced, stopAutoAdvance])

    const handleShowPreviousImage = () => {
        pauseAutoAdvanceTemporarily()
        scrollToPreviousImage()
    }

    const handleShowNextImage = () => {
        pauseAutoAdvanceTemporarily()
        scrollToNextImage()
    }

    usePhotographWheelStepNavigation({
        canNavigate: canAdvance,
        onShowNextImage: handleShowNextImage,
        onShowPreviousImage: handleShowPreviousImage,
        viewportElement: carouselViewportElement,
    })

    useEffect(() => {
        const wasLightboxOpen = wasLightboxOpenRef.current
        wasLightboxOpenRef.current = isLightboxOpen
        if (wasLightboxOpen && !isLightboxOpen) pauseAutoAdvanceTemporarily()
    }, [isLightboxOpen, pauseAutoAdvanceTemporarily])

    const handleStopAutoAdvance = () => {
        stopAutoAdvance()
        cancelAutoAdvanceResume()
        setIsAutoAdvancePaused(false)
        setIsAutoAdvanceStopped(true)
    }

    const autoAdvanceStatus = !canAdvance
        ? carouselImages.length === 1
            ? '사진 1장입니다.'
            : `${carouselImages.length}장의 사진을 모두 표시하고 있습니다.`
        : isMotionReduced || isAutoAdvanceStopped
          ? '자동 순환이 중지되었습니다.'
          : isAutoAdvancePaused
            ? '자동 순환이 5초간 일시정지되었습니다.'
            : !isCarouselVisible || !isDocumentVisible
              ? '화면 밖에서는 자동 순환이 일시정지됩니다.'
              : '자동 순환 중이며 좌우 버튼을 누르면 5초간 일시정지합니다.'
    const carouselInstructions = canAdvance
        ? `${autoAdvanceStatus} 좌우 버튼으로 이동할 수 있습니다.`
        : autoAdvanceStatus
    const isCarouselLayoutReady =
        carouselLayoutMode !== null && readyLayoutMode === carouselLayoutMode

    return (
        <div
            ref={carouselRegionRef}
            className="relative mx-auto mt-5 w-full sm:left-1/2 sm:mx-0 sm:w-[78vw] sm:max-w-[84rem] sm:-translate-x-1/2"
            aria-label={`${publication} — ${projectTitle} 사진 모음`}
            aria-describedby={carouselStatusId}
            role="region"
        >
            <span id={carouselStatusId} className="sr-only" aria-live="polite">
                {carouselInstructions}
            </span>
            <div className="overflow-hidden" ref={setCarouselViewportRef}>
                <div
                    className={`flex h-[13.5rem] touch-pan-y sm:h-[16.5rem] ${isUnderfilled ? 'justify-center' : ''} ${isCarouselLayoutReady ? '' : 'opacity-0'}`}
                >
                    {carouselImages.map((image, imageIndex) => (
                        <PhotographProjectCarouselImage
                            key={image.id}
                            image={image}
                            imageIndex={imageIndex}
                            imageCount={carouselImages.length}
                            onOpenImage={onOpenImage}
                        />
                    ))}
                </div>
            </div>
            {canAdvance ? (
                <PhotographProjectCarouselControls
                    isAutoAdvanceStopped={isAutoAdvanceStopped}
                    onShowPreviousImage={handleShowPreviousImage}
                    onShowNextImage={handleShowNextImage}
                    onStopAutoAdvance={handleStopAutoAdvance}
                />
            ) : null}
        </div>
    )
}

function PhotographProjectCarouselImage({
    image,
    imageIndex,
    imageCount,
    onOpenImage,
}: PhotographProjectCarouselImageProps) {
    const pointerStartRef = useRef<{ x: number; y: number } | null>(null)
    const didDragRef = useRef(false)

    const handlePointerDown = (event: React.PointerEvent<HTMLButtonElement>) => {
        pointerStartRef.current = { x: event.clientX, y: event.clientY }
        didDragRef.current = false
    }

    const handlePointerMove = (event: React.PointerEvent<HTMLButtonElement>) => {
        const start = pointerStartRef.current
        if (!start) return

        didDragRef.current =
            didDragRef.current || Math.hypot(event.clientX - start.x, event.clientY - start.y) >= 8
    }

    const handlePointerCancel = () => {
        pointerStartRef.current = null
        didDragRef.current = false
    }

    const handleOpenImage = (event: React.MouseEvent<HTMLButtonElement>) => {
        const isKeyboardActivation = event.detail === 0
        pointerStartRef.current = null
        if (didDragRef.current && !isKeyboardActivation) {
            didDragRef.current = false
            return
        }

        didDragRef.current = false
        onOpenImage(imageIndex, event.currentTarget)
    }

    return (
        <figure
            className="mr-1.5 min-w-0 shrink-0 grow-0 sm:mr-2"
            style={{ aspectRatio: `${image.width} / ${image.height}` }}
        >
            <button
                type="button"
                aria-label={`${image.alt} ${imageIndex + 1}/${imageCount} 크게 보기`}
                className="group relative block h-full w-full cursor-pointer overflow-hidden focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black"
                onClick={handleOpenImage}
                onPointerCancel={handlePointerCancel}
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
            >
                <Image
                    src={image.imageUrl}
                    alt={image.alt}
                    width={image.width}
                    height={image.height}
                    className="pointer-events-none h-full w-full select-none object-cover"
                    draggable={false}
                    sizes={getPhotographCarouselImageSizes(image.width, image.height)}
                />
                <PhotographImageExpandHint />
            </button>
        </figure>
    )
}

function PhotographProjectCarouselControls({
    isAutoAdvanceStopped,
    onShowPreviousImage,
    onShowNextImage,
    onStopAutoAdvance,
}: PhotographProjectCarouselControlsProps) {
    const controlInstructionsId = useId()
    const permanentStopGestureTimeoutRef = useRef<number | null>(null)
    const suppressedManualMoveTimeoutRef = useRef<number | null>(null)
    const activePermanentStopPointerIdRef = useRef<number | null>(null)
    const isPermanentStopGestureReadyRef = useRef(false)
    const suppressNextManualMoveRef = useRef(false)

    const cancelPermanentStopGesture = useCallback(() => {
        if (permanentStopGestureTimeoutRef.current !== null) {
            window.clearTimeout(permanentStopGestureTimeoutRef.current)
        }
        permanentStopGestureTimeoutRef.current = null
        activePermanentStopPointerIdRef.current = null
        isPermanentStopGestureReadyRef.current = false
    }, [])

    const resetSuppressedManualMove = useCallback(() => {
        if (suppressedManualMoveTimeoutRef.current !== null) {
            window.clearTimeout(suppressedManualMoveTimeoutRef.current)
        }
        suppressedManualMoveTimeoutRef.current = null
        suppressNextManualMoveRef.current = false
    }, [])

    useEffect(
        () => () => {
            cancelPermanentStopGesture()
            resetSuppressedManualMove()
        },
        [cancelPermanentStopGesture, resetSuppressedManualMove],
    )

    const startPermanentStopGesture = (event: React.PointerEvent<HTMLButtonElement>) => {
        if (!event.isPrimary || event.button !== 0) return

        cancelPermanentStopGesture()
        resetSuppressedManualMove()
        activePermanentStopPointerIdRef.current = event.pointerId
        permanentStopGestureTimeoutRef.current = window.setTimeout(() => {
            permanentStopGestureTimeoutRef.current = null
            isPermanentStopGestureReadyRef.current = true
        }, PERMANENT_STOP_GESTURE_MS)
    }

    const finishPermanentStopGesture = (event: React.PointerEvent<HTMLButtonElement>) => {
        if (event.pointerId !== activePermanentStopPointerIdRef.current) return

        const shouldStopAutoAdvance = isPermanentStopGestureReadyRef.current
        cancelPermanentStopGesture()

        if (!shouldStopAutoAdvance) return

        suppressNextManualMoveRef.current = true
        suppressedManualMoveTimeoutRef.current = window.setTimeout(
            resetSuppressedManualMove,
            SUPPRESSED_MANUAL_MOVE_WINDOW_MS,
        )
        onStopAutoAdvance()
    }

    const abandonPermanentStopGesture = (event: React.PointerEvent<HTMLButtonElement>) => {
        if (event.pointerId !== activePermanentStopPointerIdRef.current) return

        cancelPermanentStopGesture()
    }

    const handleShowPreviousImage = () => {
        if (suppressNextManualMoveRef.current) {
            resetSuppressedManualMove()
            return
        }

        onShowPreviousImage()
    }

    const handleShowNextImage = () => {
        if (suppressNextManualMoveRef.current) {
            resetSuppressedManualMove()
            return
        }

        onShowNextImage()
    }

    const handleControlContextMenu = (event: React.MouseEvent<HTMLButtonElement>) => {
        event.preventDefault()
    }

    return (
        <>
            <button
                type="button"
                aria-label="이전 사진 보기"
                aria-describedby={controlInstructionsId}
                title="길게 누르면 자동 순환 중지"
                className="absolute left-2 top-1/2 z-10 flex size-8 -translate-y-1/2 touch-manipulation select-none items-center justify-center rounded-full text-neutral-600 transition-colors [filter:drop-shadow(0_0_1px_rgba(255,255,255,0.9))] hover:text-black focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black sm:-left-10"
                onClick={handleShowPreviousImage}
                onContextMenu={handleControlContextMenu}
                onPointerCancel={abandonPermanentStopGesture}
                onPointerDown={startPermanentStopGesture}
                onPointerLeave={abandonPermanentStopGesture}
                onPointerUp={finishPermanentStopGesture}
            >
                <FiChevronLeft aria-hidden="true" className="size-3.5" />
            </button>
            <button
                type="button"
                aria-label="다음 사진 보기"
                aria-describedby={controlInstructionsId}
                title="길게 누르면 자동 순환 중지"
                className="absolute right-2 top-1/2 z-10 flex size-8 -translate-y-1/2 touch-manipulation select-none items-center justify-center rounded-full text-neutral-600 transition-colors [filter:drop-shadow(0_0_1px_rgba(255,255,255,0.9))] hover:text-black focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black sm:-right-10"
                onClick={handleShowNextImage}
                onContextMenu={handleControlContextMenu}
                onPointerCancel={abandonPermanentStopGesture}
                onPointerDown={startPermanentStopGesture}
                onPointerLeave={abandonPermanentStopGesture}
                onPointerUp={finishPermanentStopGesture}
            >
                <FiChevronRight aria-hidden="true" className="size-3.5" />
            </button>
            <span id={controlInstructionsId} className="sr-only">
                한 번 누르면 5초간 일시정지하고, 길게 누르면 자동 순환을 중지합니다. 키보드에서는
                다음 정지 버튼을 사용할 수 있습니다.
            </span>
            <button
                type="button"
                aria-pressed={isAutoAdvanceStopped}
                className="sr-only focus:not-sr-only focus:absolute focus:-bottom-10 focus:left-1/2 focus:z-20 focus:-translate-x-1/2 focus:rounded-full focus:bg-white focus:px-3 focus:py-1.5 focus:text-xs focus:text-black focus:shadow focus:outline focus:outline-2 focus:outline-offset-2 focus:outline-black"
                onClick={onStopAutoAdvance}
            >
                {isAutoAdvanceStopped ? '자동 순환 중지됨' : '자동 순환 중지'}
            </button>
        </>
    )
}

const CAROUSEL_INTERVAL_MS = 2600
const MANUAL_AUTO_ADVANCE_PAUSE_MS = 5000
const PERMANENT_STOP_GESTURE_MS = 800
const SUPPRESSED_MANUAL_MOVE_WINDOW_MS = 1000

function findHeroImage(project: PhotographProject): PhotographImage {
    return project.images.find((image) => image.id === project.heroImageId) ?? project.images[0]
}

function findGalleryImages(project: PhotographProject): PhotographImage[] {
    const imageById = new Map(project.images.map((image) => [image.id, image]))
    return project.galleryImageIds.flatMap((imageId) => {
        const image = imageById.get(imageId)
        return image ? [image] : []
    })
}
