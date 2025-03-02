import { EmblaCarouselPc } from '@/components/embla/embla-carousel'
import { EmblaOptionsType } from 'embla-carousel'

export default async function Project() {
    const slides = FILE_NAME.map((f) => {
        if (f.includes('.webp')) {
            const [, ...name] = f.replace('.webp', '').split('_')
            const cdnSrc = new URL(f, process.env.NEXT_PUBLIC_IMAGE_URL).href
            return {
                src: cdnSrc,
                alt: name.join(', '),
            }
        } else {
            return {
                src: f,
                alt: 'title',
            }
        }
    })

    const options: EmblaOptionsType = { loop: true, duration: 0, containScroll: false }
    return <EmblaCarouselPc slides={slides} options={options} />
}

const FILE_NAME = [
    'Day',
    'Day/1_Sarah_2024.webp',
    'Day/2_Charlotte_2025.webp',
    'Day/3_Carla_2024.webp',
    'Day/4_Gbemi_2024.webp',
    'Day/5_Sarah_2024.webp',
    'Day/6_Sia_2024.webp',
    'Day/7_Maria_2024.webp',
    'Day/8_Marta_2024.webp',
    'Day/9_Polina_2024.webp',
    'Day/10_Aivita_2023.webp',
    'Day/11_Subi_2025.webp',
    'Day/12_Angie_2024.webp',
    'Day/13_Serena_2024.webp',
    'Day/14_Elisa_2024.webp',
    'Day/15_Saicou_2024.webp',
    'Day/16_Mathilde_2024.webp',
    'Day/17_Mathilde_2024.webp',
    'Day/18_Cristina_2024.webp',
    'Day/19_Margot_2024.webp',
    'Day/20_Brisa_2024.webp',
    'Day/21_Vlady_2024.webp',
    'Day/22_Ola_2024.webp',
    'Day/23_Ophely_2025.webp',
    'Day/24_Elie_2024.webp',
    'Day/25_Alexandre_2024.webp',
    'Day/26_Katya_2024.webp',
    'Day/27_Tennessee_2024.webp',
    'Day/28_Maria_2024.webp',
    'Day/29_Eline_2024.webp',
    'Day/30_Otalia_2024.webp',
    'Day/31_Mara_2024.webp',
    'Day/32_Margherita_2024.webp',
    'Day/33_Nati_2024.webp',
    'Day/34_Anika_2025.webp',
    'Day/35_Laura_2024.webp',
    'Day/36_Theresa_2024.webp',
    'Day/37_Coumba_2024.webp',
    'Day/38_Pauline_2024.webp',
    'Day/39_Evgenia_2024.webp',
    'Day/40_Oriana_2024.webp',
    'Day/41_Ruby_2025.webp',
    'Day/42_Marie_2024.webp',
    'Day/43_Lina_2025.webp',
    'Day/44_Soa_2024.webp',
    'Day/45_Victoria_2024.webp',
    'Day/46_Maxime_2024.webp',
    'Line',
    'Line/1_Maria_2024.webp',
    'Line/2_Maria_2024.webp',
    'Line/3_Maria_2024.webp',
    'Line/4_Maria_2024.webp',
    'Line/5_Maria_2024.webp',
    'Line/6_Maria_2024.webp',
    'Line/7_Maria_2024.webp',
    'Line/8_Maria_2024.webp',
    'Life',
    'Life/1_Dazzling_2022.webp',
    'Life/2_Fairy_2023.webp',
    'Life/3_Light_2024.webp',
    'Life/4_Purple Flower_2024.webp',
]
