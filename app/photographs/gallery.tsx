import Image from 'next/image'
import { type Slide } from './type'

function Gallery({ slides, openAll }: { slides: Slide[]; openAll: boolean }) {
    return (
        <div
            className={`z-30 inset-0 absolute p-4 overflow-scroll bg-white ${openAll ? 'block' : 'hidden'}`}
        >
            <div className="pt-[4rem] flex gap-2 sm:gap-4 flex-wrap ">
                {slides.map((img) => {
                    return (
                        <div key={img.src} className="relative h-[100px] sm:h-[240px] w-auto">
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
                        </div>
                    )
                })}
            </div>
        </div>
    )
}

export { Gallery }
