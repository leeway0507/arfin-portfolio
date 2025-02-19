"use client";

import Link from "next/link";
import Image from "next/image";
import { useRef, useState, useEffect } from "react";
import { motion } from "motion/react";

export function MobileCard({ src, name }: { src: string; name: string }) {
    const [isImageLoading, setIsImageLoading] = useState(true);

    return (
        <Link href={`/photographs/${name}`} className={`w-full h-full`}>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.4 }}
                className="w-full h-full"
            >
                <div className="relative flex flex-col items-center justify-center">
                    <Image
                        src={src}
                        alt={name}
                        width={0}
                        height={0}
                        onLoad={() => {
                            setIsImageLoading(false);
                        }}
                        className="w-full h-auto object-contain"
                    />
                </div>
                <div style={{ opacity: isImageLoading ? 0 : 100 }} className="font-medium">
                    {name}
                </div>
            </motion.div>
        </Link>
    );
}
export function PcCard({ src, name }: { src: string; name: string }) {
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
        <Link href={`/photographs/${name}`} className={`basis-1/3 w-full`}>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.4 }}
                className="w-full h-full"
                ref={imageCoverRef}
            >
                <div className="w-full h-full flex flex-col items-center justify-center aspect-[51/64]">
                    <Image
                        src={src}
                        alt={name}
                        ref={imageRef}
                        width={0}
                        height={0}
                        onLoad={(image) => {
                            if (imageCoverRef.current) {
                                const imageSize = getContainedSize(image.currentTarget);
                                setIsImageLoading(false);
                                setImageMargin({
                                    imageSize,
                                    coverRect: image.currentTarget.getBoundingClientRect(),
                                });
                            }
                        }}
                        className="w-auto h-full object-contain"
                    />
                </div>
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
                    className="absolute font-medium"
                >
                    {name}
                </div>
            </motion.div>
        </Link>
    );
}
