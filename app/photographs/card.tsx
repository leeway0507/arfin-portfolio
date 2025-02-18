"use client";

import Link from "next/link";
import Image from "next/image";
import { useRef, useState, useEffect } from "react";
import { motion } from "motion/react";

export default function Card({ src, name }: { src: string; name: string }) {
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
        <Link href={`/photographs/${name}`} className={`grow pt-[2rem]`}>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.4 }}
                className="w-full h-[85%] flex flex-col items-center justify-center aspect-[51/64]"
                ref={imageCoverRef}
            >
                <Image
                    src={src}
                    alt={name}
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
                />
            </motion.div>
            <div
                style={{
                    left: `${imageMargin.coverRect.left}px`,
                    top: `${
                        imageMargin.coverRect.top +
                        (imageMargin.coverRect.height - imageMargin.imageSize.height) / 2 +
                        imageMargin.imageSize.height
                    }px`,
                }}
                className="absolute font-medium text-lg"
            >
                {name}
            </div>
        </Link>
    );
}
