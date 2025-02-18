"use client";

import { EmblaOptionsType } from "embla-carousel";
import useEmblaCarousel from "embla-carousel-react";
import Fade from "embla-carousel-fade";
import { usePrevNextButtons } from "./embla-carousel-arrow-botton";
import Image from "next/image";
import "./embla.css";
import { useEffect, useRef, useState } from "react";
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

    const { onPrevButtonClick, onNextButtonClick } = usePrevNextButtons(emblaApi);

    return (
        <div className="embla relative">
            <div className="embla__viewport" ref={emblaRef}>
                <div className="embla__container">
                    {slides.map((img) => (
                        <Card
                            key={img.src}
                            alt={img.alt}
                            src={img.src}
                            onClickNext={onNextButtonClick}
                            onClickPrev={onPrevButtonClick}
                        />
                    ))}
                </div>
            </div>
        </div>
    );
};

function Card({
    alt,
    src,
    onClickNext,
    onClickPrev,
}: {
    alt: string;
    src: string;
    onClickPrev: () => void;
    onClickNext: () => void;
}) {
    const imageCoverRef = useRef<HTMLDivElement>(null);
    const imageRef = useRef<HTMLImageElement>(null);
    const [imageMargin, setImageMargin] = useState<{
        imageSize: {
            width: number;
            height: number;
        };
        coverRect: DOMRectReadOnly;
    }>({
        imageSize: { width: 0, height: 0 },
        coverRect: {} as DOMRectReadOnly,
    });

    const [isImageLoaded, setIsImageLoaded] = useState(true);

    const handleResize = () => {
        if (imageCoverRef.current && imageRef.current) {
            const imageSize = getContainedSize(imageRef.current);
            console.log(imageSize);
            setImageMargin({
                imageSize,
                coverRect: imageRef.current.getBoundingClientRect(),
            });
        }
    };
    useEffect(() => {
        window.addEventListener("resize", handleResize);
        return () => {
            window.removeEventListener("resize", handleResize);
        };
    }, [handleResize]);

    return (
        <div
            className="embla__slide relative h-[calc(100dvh-4rem)] overflow-hidden flex flex-col items-center justify-center"
            key={src}
            ref={imageCoverRef}
        >
            <Image
                className="w-auto h-full max-h-[calc(100dvh-10rem)] object-contain"
                ref={imageRef}
                src={src}
                alt={alt}
                width={0}
                height={0}
                onLoad={(image) => {
                    setIsImageLoaded(false);
                    image.currentTarget.classList.remove("opacity-0");
                    handleResize();
                }}
            />
            <div className="z-[50] absolute w-full h-full flex">
                <button onClick={onClickPrev} className="basis-1/2" />
                <button onClick={onClickNext} className="basis-1/2" />
            </div>

            <div
                style={{
                    width: `${imageMargin.imageSize.width}px`,
                    height: `${imageMargin.imageSize.height}px`,
                }}
                className={`absolute text-sm ${isImageLoaded ? "hidden" : "block"}`}
            >
                <div className="absolute -bottom-5">{alt}</div>
                {/* {JSON.stringify(imageMargin)} */}
            </div>
        </div>
    );
}

function getContainedSize(img: EventTarget & HTMLImageElement) {
    const ratio = img.naturalWidth / img.naturalHeight;
    let width = img.height * ratio;
    let height = img.height;
    if (width > img.width) {
        width = img.width;
        height = img.width / ratio;
    }
    return {
        width,
        height,
    };
}

export default EmblaCarousel;
