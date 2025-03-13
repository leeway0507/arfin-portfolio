'use client'

import { EmblaCarouselType, EmblaOptionsType } from 'embla-carousel'
import useEmblaCarousel, { EmblaViewportRefType } from 'embla-carousel-react'
import { usePrevNextButtons } from './embla-carousel-arrow-botton'
import './embla.css'
import { useState } from 'react'
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
