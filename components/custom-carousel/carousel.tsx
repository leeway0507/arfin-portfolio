"use client";

import { motion } from "motion/react";
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
        coverRect: DOMRectReadOnly;
    }>({
        imageSize: { width: 0, height: 0 },
        coverRect: {} as DOMRectReadOnly,
    });

    const [isImageLoading, setIsImageLoading] = useState(true);

    const imageCoverRef = useRef<HTMLDivElement>(null);
    const imageRef = useRef<HTMLImageElement>(null);

    const showPrevImage = () => {
        setIsImageLoading(true);
        setImageIndex((idx) => {
            if (idx === 0) return slides.length - 1;
            return idx - 1;
        });
    };

    const showNextImage = () => {
        setIsImageLoading(true);
        setImageIndex((idx) => {
            if (idx === slides.length - 1) return 0;
            return idx + 1;
        });
    };

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
    }, [handleKeydown, handleResize]);

    return (
        <div className="w-full h-[calc(100dvh-4rem)] flex items-start">
            <motion.div
                key={imageIndex}
                initial={{ opacity: 0.0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.4 }}
                className=" w-full h-full py-4 sm:h-[95%] flex flex-col items-center"
                ref={imageCoverRef}
            >
                <Image
                    ref={imageRef}
                    width={0}
                    height={0}
                    onLoad={(image) => {
                        setIsImageLoading(false);
                        if (imageCoverRef.current) {
                            const imageSize = getContainedSize(image.currentTarget);
                            setImageMargin({
                                imageSize,
                                coverRect: image.currentTarget.getBoundingClientRect(),
                            });
                        }
                    }}
                    className="w-auto h-full max-h-[calc(100dvh-8rem)] object-contain"
                    src={slides[imageIndex].src}
                    alt={slides[imageIndex].alt}
                />

                <div
                    style={{
                        left: `${imageMargin.coverRect.left}px`,
                        top: `${
                            imageMargin.coverRect.top +
                            (imageMargin.coverRect.height - imageMargin.imageSize.height) / 2 +
                            imageMargin.imageSize.height
                        }px`,
                        opacity: isImageLoading ? 0 : 100,
                    }}
                    className="absolute text-sm"
                >
                    {slides[imageIndex].alt}
                </div>
            </motion.div>
            <div
                className="absolute flex w-full inset-x-0 my-4"
                style={{
                    height: `${imageMargin.coverRect.height}px`,
                }}
            >
                <div onClick={showPrevImage} className="flex basis-1/2 cursor-pointer" />
                <div onClick={showNextImage} className="flex basis-1/2 cursor-pointer" />
            </div>
        </div>
    );
};

export default CustomCarousel;
