'use client'

import Image from 'next/image'
import * as DialogPrimitive from '@radix-ui/react-dialog'
import useEmblaCarousel from 'embla-carousel-react'
import { useReducedMotion } from 'motion/react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { FiChevronLeft, FiChevronRight, FiX } from 'react-icons/fi'
import type { PhotographImage } from '@/lib/apis/photographs/types'
import { usePhotographWheelStepNavigation } from '../hooks/use-photograph-wheel-step-navigation'

interface PhotographImageLightboxProps {
    images: PhotographImage[]
    initialIndex: number
    open: boolean
    projectLabel: string
    returnFocusTo: HTMLButtonElement | null
    onOpenChange: (open: boolean) => void
}

interface PhotographImageLightboxViewportProps {
    images: PhotographImage[]
    viewportRef: (element: HTMLDivElement | null) => void
}

interface PhotographImageLightboxControlsProps {
    onShowNextImage: () => void
    onShowPreviousImage: () => void
}

export function PhotographImageLightbox({
    images,
    initialIndex,
    open,
    projectLabel,
    returnFocusTo,
    onOpenChange,
}: PhotographImageLightboxProps) {
    const shouldReduceMotion = useReducedMotion()
    const [viewportElement, setViewportElement] = useState<HTMLElement | null>(null)
    const [emblaViewportRef, carouselApi] = useEmblaCarousel({
        align: 'center',
        loop: images.length > 1,
        startIndex: clampImageIndex(initialIndex, images.length),
    })
    const [selectedIndex, setSelectedIndex] = useState(() =>
        clampImageIndex(initialIndex, images.length),
    )
    const emblaViewportRefLatest = useRef(emblaViewportRef)
    emblaViewportRefLatest.current = emblaViewportRef

    const setViewportRef = useCallback(
        (element: HTMLElement | null) => {
            emblaViewportRefLatest.current(element)
            setViewportElement(element)
        },
        [],
    )

    useEffect(() => {
        if (!carouselApi) return

        const syncSelectedIndex = () => setSelectedIndex(carouselApi.selectedScrollSnap())
        syncSelectedIndex()
        carouselApi.on('select', syncSelectedIndex)
        carouselApi.on('reInit', syncSelectedIndex)
        return () => {
            carouselApi.off('select', syncSelectedIndex)
            carouselApi.off('reInit', syncSelectedIndex)
        }
    }, [carouselApi])

    useEffect(() => {
        if (!open || !carouselApi) return

        const nextIndex = clampImageIndex(initialIndex, images.length)
        carouselApi.scrollTo(nextIndex, true)
        setSelectedIndex(nextIndex)
    }, [carouselApi, images.length, initialIndex, open])

    const showPreviousImage = useCallback(
        () => carouselApi?.scrollPrev(Boolean(shouldReduceMotion)),
        [carouselApi, shouldReduceMotion],
    )
    const showNextImage = useCallback(
        () => carouselApi?.scrollNext(Boolean(shouldReduceMotion)),
        [carouselApi, shouldReduceMotion],
    )

    usePhotographWheelStepNavigation({
        canNavigate: images.length > 1,
        onShowNextImage: showNextImage,
        onShowPreviousImage: showPreviousImage,
        viewportElement,
    })

    const handleLightboxKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
        if (event.altKey || event.ctrlKey || event.metaKey || images.length <= 1) return
        if (event.key === 'ArrowLeft') {
            event.preventDefault()
            showPreviousImage()
        }
        if (event.key === 'ArrowRight') {
            event.preventDefault()
            showNextImage()
        }
    }

    const handleCloseAutoFocus = (event: Event) => {
        event.preventDefault()
        returnFocusTo?.focus()
    }

    return (
        <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
            <DialogPrimitive.Portal>
                <DialogPrimitive.Overlay className="fixed inset-0 z-[100] bg-white data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
                <DialogPrimitive.Content
                    className="fixed inset-0 z-[101] flex h-dvh w-dvw flex-col overflow-hidden bg-white text-black focus:outline-none"
                    onCloseAutoFocus={handleCloseAutoFocus}
                    onKeyDown={handleLightboxKeyDown}
                >
                    <DialogPrimitive.Title className="sr-only">
                        {projectLabel} 전체 화면 사진 보기
                    </DialogPrimitive.Title>
                    <DialogPrimitive.Description className="sr-only">
                        좌우 화살표 키와 버튼으로 사진을 이동하고 Esc 키로 닫을 수 있습니다.
                    </DialogPrimitive.Description>
                    <DialogPrimitive.Close
                        autoFocus
                        aria-label="전체 화면 닫기"
                        className="absolute right-4 top-4 z-20 flex size-11 items-center justify-center rounded-full bg-white/80 text-black shadow-sm transition-colors hover:bg-black/5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black sm:right-6 sm:top-6"
                    >
                        <FiX aria-hidden="true" className="size-7" />
                    </DialogPrimitive.Close>
                    <PhotographImageLightboxViewport images={images} viewportRef={setViewportRef} />
                    {images.length > 1 ? (
                        <PhotographImageLightboxControls
                            onShowPreviousImage={showPreviousImage}
                            onShowNextImage={showNextImage}
                        />
                    ) : null}
                    <PhotographImageLightboxCounter
                        currentIndex={selectedIndex}
                        totalCount={images.length}
                    />
                </DialogPrimitive.Content>
            </DialogPrimitive.Portal>
        </DialogPrimitive.Root>
    )
}

function PhotographImageLightboxViewport({
    images,
    viewportRef,
}: PhotographImageLightboxViewportProps) {
    return (
        <div className="min-h-0 flex-1 overflow-hidden touch-pan-y" ref={viewportRef}>
            <div className="flex h-full">
                {images.map((image) => (
                    <PhotographImageLightboxSlide key={image.id} image={image} />
                ))}
            </div>
        </div>
    )
}

function PhotographImageLightboxSlide({ image }: { image: PhotographImage }) {
    return (
        <figure className="flex h-full min-w-0 shrink-0 grow-0 basis-full items-center justify-center px-10 py-16 sm:px-20 sm:py-12">
            <Image
                src={image.imageUrl}
                alt={image.alt}
                width={image.width}
                height={image.height}
                className="max-h-[calc(100dvh-8rem)] max-w-full select-none object-contain"
                draggable={false}
                sizes="100vw"
            />
        </figure>
    )
}

function PhotographImageLightboxControls({
    onShowNextImage,
    onShowPreviousImage,
}: PhotographImageLightboxControlsProps) {
    return (
        <>
            <button
                type="button"
                aria-label="이전 확대 사진 보기"
                className="absolute left-3 top-1/2 z-20 flex size-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/80 text-black shadow-sm transition-colors hover:bg-black/5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black sm:left-6"
                onClick={onShowPreviousImage}
            >
                <FiChevronLeft aria-hidden="true" className="size-8" />
            </button>
            <button
                type="button"
                aria-label="다음 확대 사진 보기"
                className="absolute right-3 top-1/2 z-20 flex size-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/80 text-black shadow-sm transition-colors hover:bg-black/5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black sm:right-6"
                onClick={onShowNextImage}
            >
                <FiChevronRight aria-hidden="true" className="size-8" />
            </button>
        </>
    )
}

function PhotographImageLightboxCounter({
    currentIndex,
    totalCount,
}: {
    currentIndex: number
    totalCount: number
}) {
    return (
        <p
            className="pointer-events-none absolute bottom-5 left-1/2 z-20 -translate-x-1/2 text-sm tabular-nums text-black/70"
            aria-live="polite"
        >
            {currentIndex + 1} / {totalCount}
        </p>
    )
}

function clampImageIndex(index: number, imageCount: number): number {
    if (imageCount <= 0) return 0
    return Math.min(Math.max(index, 0), imageCount - 1)
}
