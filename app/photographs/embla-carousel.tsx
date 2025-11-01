'use client'

import { EmblaCarouselType, EmblaOptionsType } from 'embla-carousel'
import useEmblaCarousel, { EmblaViewportRefType } from 'embla-carousel-react'
import { usePrevNextButtons } from './embla-carousel-arrow-botton'
import './embla.css'
import { useState, useEffect, useCallback } from 'react'
import { FaTh } from 'react-icons/fa'
import { FaSquare } from 'react-icons/fa'
import { Card } from './card'
import { type Slide } from './type'
import { Gallery } from './gallery'

type PropType = {
    slides: Slide[]
    options?: EmblaOptionsType
}

const EmblaCarousel: React.FC<PropType> = (props) => {
    const { slides, options } = props
    const [openGallery, setOpenGallery] = useState(false)
    const [currentTargetIdx, setCurrentTargetIdx] = useState(0)
    const [emblaRef, emblaApi] = useEmblaCarousel(options, [])

    // 이미지 프리로딩 함수
    const preloadImages = useCallback(
        (startIdx: number, count: number = 3) => {
            for (let i = 1; i <= count; i++) {
                const targetIdx = startIdx + i
                if (targetIdx < slides.length && slides[targetIdx].alt !== 'title') {
                    const img = new Image()
                    img.src = slides[targetIdx].src
                }
            }
        },
        [slides],
    )

    // 현재 인덱스가 변경될 때마다 다음 이미지들을 프리로드
    useEffect(() => {
        preloadImages(currentTargetIdx, 3)
    }, [currentTargetIdx, preloadImages])

    // Embla API가 준비되면 초기 인덱스 설정 및 select 이벤트 리스너 등록
    useEffect(() => {
        if (!emblaApi) return

        const onSelect = () => {
            const selectedIdx = emblaApi.selectedScrollSnap()
            setCurrentTargetIdx(selectedIdx)
        }

        // 초기 인덱스 설정
        onSelect()

        // select 이벤트 리스너 등록
        emblaApi.on('select', onSelect)

        return () => {
            emblaApi.off('select', onSelect)
        }
    }, [emblaApi])

    const scrollToSlide = (idx: number) => {
        if (emblaApi) {
            emblaApi.scrollTo(idx)
        }
    }
    const setTarget = (idx: number) => {
        setOpenGallery(false)
        setCurrentTargetIdx(idx)
        scrollToSlide(idx)
    }

    return (
        <>
            <Gallery
                slides={slides}
                openAll={openGallery}
                currentTargetIdx={currentTargetIdx}
                setCurrentTargetIdx={setTarget}
            />
            <Slide
                openAll={openGallery}
                setOpenAll={setOpenGallery}
                slides={slides}
                emblaRef={emblaRef}
                emblaApi={emblaApi!}
                setCurrentTarget={setCurrentTargetIdx}
            />
        </>
    )
}

function Slide({
    openAll,
    setOpenAll,
    slides,
    emblaRef,
    emblaApi,
    setCurrentTarget,
}: {
    openAll: boolean
    setOpenAll: (b: boolean) => void
    slides: Slide[]
    emblaRef: EmblaViewportRefType
    emblaApi: EmblaCarouselType
    setCurrentTarget: (idx: number) => void
}) {
    const { onPrevButtonClick, onNextButtonClick } = usePrevNextButtons(emblaApi)
    const onPrevClick = () => {
        onPrevButtonClick()
        setCurrentTarget(emblaApi.selectedScrollSnap())
    }
    const onNextClick = () => {
        onNextButtonClick()
        setCurrentTarget(emblaApi.selectedScrollSnap())
    }
    return (
        <div className="embla relative">
            <div className="z-10 absolute flex w-full h-full ">
                <button onClick={onPrevClick} className="basis-1/2 focus:outline-none" />
                <button onClick={onNextClick} className="basis-1/2 focus:outline-none" />
            </div>
            <button
                className="absolute right-0 top-[2rem] sm:top-[4rem] z-30 p-4"
                onClick={() => setOpenAll(!openAll)}
            >
                {openAll ? <FaSquare /> : <FaTh />}
            </button>
            <div className="embla__viewport" ref={emblaRef}>
                <div className="embla__container relative">
                    {slides.map((img) => (
                        <Card key={img.src} alt={img.alt} src={img.src} />
                    ))}
                </div>
            </div>
        </div>
    )
}

export { EmblaCarousel }
