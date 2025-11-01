import Image from 'next/image'
import { type Slide } from './type'
import { twMerge } from 'tailwind-merge'

type GalleryProps = {
    slides: Slide[]
    openAll: boolean
    currentTargetIdx: number
    setCurrentTargetIdx: (s: number) => void
}

function Gallery({ slides, openAll, currentTargetIdx, setCurrentTargetIdx }: GalleryProps) {
    return (
        <div
            className={twMerge(
                'z-30 inset-0 absolute p-4 overflow-scroll bg-white',
                openAll ? 'block' : 'hidden',
            )}
        >
            <div className="pt-[4rem] flex gap-2 sm:gap-4 flex-wrap">
                {slides.map((img, idx) => {
                    return (
                        <button
                            key={img.src}
                            className={twMerge(
                                'relative h-[100px] sm:h-[240px] w-auto',
                                currentTargetIdx === idx ? 'border border-red-200' : 'border-0',
                            )}
                            onClick={() => setCurrentTargetIdx(idx)}
                        >
                            {img.alt === 'title' ? (
                                <div className="aspect-[3/4] h-full  sm:text-xl flex justify-center items-center">
                                    {img.src}
                                </div>
                            ) : (
                                <Image
                                    key={img.src}
                                    src={img.src}
                                    alt={img.alt}
                                    width={0}
                                    height={0}
                                    className="h-full w-auto object-contain"
                                />
                            )}
                        </button>
                    )
                })}
            </div>
        </div>
    )
}

export { Gallery }
