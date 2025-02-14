"use client";

import { EmblaOptionsType } from "embla-carousel";
import useEmblaCarousel from "embla-carousel-react";
import Fade from "embla-carousel-fade";
import { NextButton, PrevButton, usePrevNextButtons } from "./embla-carousel-arrow-botton";
import Image from "next/image";
import "./embla.css";
import { useState } from "react";
type PropType = {
    slides: {
        src: string;
        alt: string;
    }[];
    options?: EmblaOptionsType;
};

const EmblaCarousel: React.FC<PropType> = (props) => {
    const { slides, options } = props;
    const [emblaRef, emblaApi] = useEmblaCarousel(options, [Fade()]);
    const [isImageLoaded, setIsImageLoaded] = useState(true);

    const { prevBtnDisabled, nextBtnDisabled, onPrevButtonClick, onNextButtonClick } = usePrevNextButtons(emblaApi);

    return (
        <div className="embla">
            <div className="embla__viewport" ref={emblaRef}>
                <div className="embla__container">
                    {slides.map((img) => (
                        <div className="embla__slide my-auto" key={img.src}>
                            <Image
                                className="embla__slide__img transition-opacity opacity-0 duration-[0.5s]"
                                src={img.src}
                                alt={img.alt}
                                width={0}
                                height={0}
                                sizes="100vw"
                                onLoad={(image) => {
                                    image.currentTarget.classList.remove("opacity-0");
                                    setIsImageLoaded(false);
                                }}
                            />
                            <div className={`h-5 w-full ${isImageLoaded ? "hidden" : "block"}`}>{img.alt}</div>
                        </div>
                    ))}
                </div>
            </div>
            <div className={`${isImageLoaded ? "hidden" : "flex"} justify-center items-center`}>
                <div className="embla__buttons">
                    <PrevButton onClick={onPrevButtonClick} disabled={prevBtnDisabled} />
                    <NextButton onClick={onNextButtonClick} disabled={nextBtnDisabled} />
                </div>
            </div>
        </div>
    );
};

export default EmblaCarousel;
