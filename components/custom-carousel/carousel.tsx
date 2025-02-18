"use client";

import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";

type PropType = {
    slides: {
        src: string;
        alt: string;
    }[];
};

const CustomCarousel: React.FC<PropType> = (props) => {
    const slides = props.slides;
    const [imageIndex, setImageIndex] = useState(0);
    const [imageMargin, setImageMargin] = useState<{
        imageSize: {
            width: number;
            height: number;
        };
        coverRect: DOMRect;
    }>({
        imageSize: { width: 0, height: 0 },
        coverRect: new DOMRect(),
    });
    const imageCoverRef = useRef<HTMLDivElement>(null);
    const imageRef = useRef<HTMLImageElement>(null);

    const showPrevImage = () => {
        setImageIndex((idx) => {
            if (idx === 0) return slides.length - 1;
            return idx - 1;
        });
    };

    const showNextImage = () => {
        setImageIndex((idx) => {
            if (idx === slides.length - 1) return 0;
            return idx + 1;
        });
    };

    function getContainedSize(img: EventTarget & HTMLImageElement) {
        let ratio = img.naturalWidth / img.naturalHeight;
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

    const handleKeydown = useCallback(
        (event: KeyboardEvent) => {
            if (event.key === "ArrowLeft") {
                showPrevImage();
            }
            if (event.key === "ArrowRight") {
                showNextImage();
            }
        },
        [showPrevImage, showNextImage]
    );

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
        window.addEventListener("keydown", handleKeydown);
        window.addEventListener("resize", handleResize);
        return () => {
            window.removeEventListener("keydown", handleKeydown);
            window.removeEventListener("resize", handleResize);
        };
    }, []);

    return (
        <div className="w-full h-full">
            <motion.div
                key={imageIndex}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.4 }}
                className=" w-full pt-[2rem] h-[85%] flex flex-col items-center justify-center"
                ref={imageCoverRef}
            >
                <Image
                    ref={imageRef}
                    width={0}
                    height={0}
                    onLoad={(image) => {
                        if (imageCoverRef.current) {
                            const imageSize = getContainedSize(image.currentTarget);
                            setImageMargin({
                                imageSize,
                                coverRect: image.currentTarget.getBoundingClientRect(),
                            });
                        }
                    }}
                    className="w-auto h-full object-contain"
                    src={slides[imageIndex].src}
                    alt={slides[imageIndex].alt}
                />
                <div
                    onClick={showPrevImage}
                    className="absolute hover:bg-black/10 w-24 transition-all duration-[0.3s] cursor-pointer"
                    style={{
                        left: `${imageMargin.coverRect.left}px`,
                        height: `${imageMargin.coverRect.height}px`,
                    }}
                />
                <div
                    onClick={showNextImage}
                    className="absolute hover:bg-black/10 w-24 transition-all duration-[0.3s] cursor-pointer"
                    style={{
                        right: `${imageMargin.coverRect.left}px`,
                        height: `${imageMargin.coverRect.height}px`,
                    }}
                />

                <div
                    style={{
                        left: `${imageMargin.coverRect.left}px`,
                        top: `${
                            imageMargin.coverRect.top +
                            (imageMargin.coverRect.height - imageMargin.imageSize.height) / 2 +
                            imageMargin.imageSize.height
                        }px`,
                    }}
                    className="absolute"
                >
                    {slides[imageIndex].alt}
                </div>
            </motion.div>
            <div
                style={{
                    top: `${imageMargin.coverRect.top + imageMargin.coverRect.height}px`,
                }}
                className="absolute pt-8 left-0 right-0 flex justify-center space-x-4"
            >
                <PrevButton onClickFn={showPrevImage} />
                <NextButton onClickFn={showNextImage} />
            </div>
        </div>
    );
};

export const PrevButton: React.FC<{ onClickFn: () => void }> = (props) => {
    return (
        <button className="embla__button embla__button--prev" type="button" onClick={props.onClickFn}>
            <svg className="w-4 h-4" viewBox="0 0 532 532">
                <path
                    fill="currentColor"
                    d="M355.66 11.354c13.793-13.805 36.208-13.805 50.001 0 13.785 13.804 13.785 36.238 0 50.034L201.22 266l204.442 204.61c13.785 13.805 13.785 36.239 0 50.044-13.793 13.796-36.208 13.796-50.002 0a5994246.277 5994246.277 0 0 0-229.332-229.454 35.065 35.065 0 0 1-10.326-25.126c0-9.2 3.393-18.26 10.326-25.2C172.192 194.973 332.731 34.31 355.66 11.354Z"
                />
            </svg>
        </button>
    );
};

export const NextButton: React.FC<{ onClickFn: () => void }> = (props) => {
    return (
        <button className="embla__button embla__button--next" type="button" onClick={props.onClickFn}>
            <svg className="w-4 h-4" viewBox="0 0 532 532">
                <path
                    fill="currentColor"
                    d="M176.34 520.646c-13.793 13.805-36.208 13.805-50.001 0-13.785-13.804-13.785-36.238 0-50.034L330.78 266 126.34 61.391c-13.785-13.805-13.785-36.239 0-50.044 13.793-13.796 36.208-13.796 50.002 0 22.928 22.947 206.395 206.507 229.332 229.454a35.065 35.065 0 0 1 10.326 25.126c0 9.2-3.393 18.26-10.326 25.2-45.865 45.901-206.404 206.564-229.332 229.52Z"
                />
            </svg>
        </button>
    );
};

export default CustomCarousel;
