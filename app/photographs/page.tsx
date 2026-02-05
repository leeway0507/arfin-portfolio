import { EmblaCarousel } from './embla-carousel'
import { EmblaOptionsType } from 'embla-carousel'
import { IMG_DIR_ARR } from './images_dir'

export default async function Project() {
    const slides = IMG_DIR_ARR.map((f) => {
        if (f.includes('.webp')) {
            const alt = f.replace('.webp', '').replace(/\([^)]*\)/, '')
            const cdnSrc = new URL(f, process.env.NEXT_PUBLIC_IMAGE_URL).href
            return {
                src: cdnSrc,
                alt,
            }
        } else {
            return {
                src: f,
                alt: 'title',
            }
        }
    })
    const options: EmblaOptionsType = { loop: true, duration: 0, containScroll: false }
    return <EmblaCarousel slides={slides} options={options} />
}
