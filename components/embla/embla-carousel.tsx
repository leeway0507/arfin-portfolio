"use client";

import { EmblaOptionsType } from "embla-carousel";
import useEmblaCarousel from "embla-carousel-react";
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

const EmblaCarouselPc: React.FC<PropType> = (props) => {
    const { slides, options } = props;
    const [emblaRef, emblaApi] = useEmblaCarousel(options, []);

    const { onPrevButtonClick, onNextButtonClick } = usePrevNextButtons(emblaApi);

    return (
        <div className="embla relative ">
            <div className="z-10 absolute flex w-full h-full ">
                <button onClick={onPrevButtonClick} className="basis-1/2" />
                <button onClick={onNextButtonClick} className="basis-1/2" />
            </div>
            <div className="embla__viewport" ref={emblaRef}>
                <div className="embla__container  relative">
                    {slides.map((img) => (
                        <CardPc key={img.src} alt={img.alt} src={img.src} />
                    ))}
                </div>
            </div>
        </div>
    );
};

function CardPc({ alt, src }: { alt: string; src: string }) {
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
    }, []);

    return (
        <div
            className="embla__slide relative h-dvh overflow-hidden flex flex-col items-center justify-center"
            key={src}
            ref={imageCoverRef}
        >
            {alt === "title" ? (
                <div className="embla__slide flex items-center justify-center text-5xl" key={src}>
                    {src}
                </div>
            ) : (
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
            )}
            <div
                style={{
                    width: `${imageMargin.imageSize.width}px`,
                    height: `${imageMargin.imageSize.height}px`,
                }}
                className={`absolute text-sm ${isImageLoaded ? "hidden" : "block"}`}
            >
                <div className="absolute -bottom-5">{alt}</div>
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

export { EmblaCarouselPc };
