import { useRef, useState, useEffect } from 'react'
import Image from 'next/image'

type ImageMargin = {
    imageSize: { width: number; height: number }
    coverRect: DOMRectReadOnly
}

function useImageResize(imageRef: React.RefObject<HTMLImageElement | null>) {
    const [imageMargin, setImageMargin] = useState<ImageMargin>({
        imageSize: { width: 0, height: 0 },
        coverRect: {} as DOMRectReadOnly,
    })

    const updateSize = () => {
        if (imageRef.current) {
            const imageSize = getContainedSize(imageRef.current)
            setImageMargin({
                imageSize,
                coverRect: imageRef.current.getBoundingClientRect(),
            })
        }
    }

    useEffect(() => {
        window.addEventListener('resize', updateSize)
        return () => window.removeEventListener('resize', updateSize)
    }, [])

    return { imageMargin, updateSize }
}

const getContainedSize = (img: EventTarget & HTMLImageElement) => {
    const ratio = img.naturalWidth / img.naturalHeight
    let width = img.height * ratio
    let height = img.height
    if (width > img.width) {
        width = img.width
        height = img.width / ratio
    }
    return {
        width,
        height,
    }
}

function Card({ alt, src }: { alt: string; src: string }) {
    const imageCoverRef = useRef<HTMLDivElement>(null)
    const imageRef = useRef<HTMLImageElement | null>(null)
    const { imageMargin, updateSize } = useImageResize(imageRef)
    const [isImageLoaded, setIsImageLoaded] = useState(true)

    return (
        <div
            className="embla__slide relative h-dvh overflow-hidden flex flex-col items-center justify-center"
            key={src}
            ref={imageCoverRef}
        >
            {alt === 'title' ? (
                <div className="embla__slide flex items-center justify-center text-5xl" key={src}>
                    {src}
                </div>
            ) : (
                <Image
                    className="w-auto h-full max-h-[calc(100dvh-10rem)] object-contain border-48"
                    ref={imageRef}
                    src={src}
                    alt={alt}
                    width={0}
                    height={0}
                    onLoad={(image) => {
                        setIsImageLoaded(false)
                        image.currentTarget.classList.remove('opacity-0')
                        updateSize()
                    }}
                />
            )}
            <Caption
                alt={alt}
                isImageLoaded={isImageLoaded}
                imageMarginWidth={imageMargin.imageSize.width}
                imageMarginHeight={imageMargin.imageSize.height}
            />
        </div>
    )
}

function Caption({
    alt,
    isImageLoaded,
    imageMarginWidth,
    imageMarginHeight,
}: {
    alt: string
    isImageLoaded: boolean
    imageMarginWidth: number
    imageMarginHeight: number
}) {
    return (
        <div
            style={{
                width: `${imageMarginWidth}px`,
                height: `${imageMarginHeight}px`,
            }}
            className={`absolute text-sm ${isImageLoaded ? 'hidden' : 'block'}`}
        >
            <div className="absolute -bottom-5">{alt}</div>
        </div>
    )
}

export { Card }
