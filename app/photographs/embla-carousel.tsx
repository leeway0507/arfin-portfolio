'use client'

import { EmblaOptionsType } from 'embla-carousel'
import useEmblaCarousel from 'embla-carousel-react'
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

    return (
        <>
            <Gallery slides={slides} openAll={openGallery} />
            <Slide
                openAll={openGallery}
                setOpenAll={setOpenGallery}
                slides={slides}
                options={options}
            />
        </>
    )
}

function Slide({
    openAll,
    setOpenAll,
    slides,
    options,
}: {
    openAll: boolean
    setOpenAll: (b: boolean) => void
    slides: Slide[]
    options?: EmblaOptionsType
}) {
    const [emblaRef, emblaApi] = useEmblaCarousel(options, [])
    const { onPrevButtonClick, onNextButtonClick } = usePrevNextButtons(emblaApi)
    return (
        <div className="embla relative">
            <div className="z-10 absolute flex w-full h-full ">
                <button onClick={onPrevButtonClick} className="basis-1/2 focus:outline-none" />
                <button onClick={onNextButtonClick} className="basis-1/2 focus:outline-none" />
            </div>
            <button
                className="absolute right-0 top-[2rem] sm:top-[4rem] z-30 p-4"
                onClick={() => setOpenAll(!openAll)}
            >
                {openAll ? <FaSquare /> : <FaTh />}
            </button>
            <div className="embla__viewport" ref={emblaRef}>
                <div className="embla__container  relative">
                    {slides.map((img) => (
                        <Card key={img.src} alt={img.alt} src={img.src} />
                    ))}
                </div>
            </div>
        </div>
    )
}

export { EmblaCarousel }
