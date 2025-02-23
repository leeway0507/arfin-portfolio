import { EmblaCarouselPc } from "@/components/embla/embla-carousel";
import { EmblaOptionsType } from "embla-carousel";

const FILE_NAME = [
    "Day",
    "Day/1_Carla_2024.webp",
    "Day/2_Sarah_2024.webp",
    "Day/3_Charlotte_2025.webp",
    "Day/4_Sia_2024.webp",
    "Day/5_Polina_2024.webp",
    "Day/6_Marta_2024.webp",
    "Day/7_Gbemi_2025.webp",
    "Day/8_Saicou_2024.webp",
    "Day/9_Aivita_2023.webp",
    "Day/10_Subi_2025.webp",
    "Line",
    "Line/1_Maria_2024.webp",
    "Line/2_Maria_2024.webp",
    "Line/3_Maria_2024.webp",
    "Line/4_Maria_2024.webp",
    "Line/5_Maria_2024.webp",
    "Line/6_Maria_2024.webp",
    "Line/7_Maria_2024.webp",
    "Line/8_Maria_2024.webp",
    "Life",
    "Life/1_Dazzling_2022.webp",
    "Life/2_Fairy_2023.webp",
    "Life/3_Light_2024.webp",
    "Life/4_Purple Flower_2024.webp",
];

export default async function Project() {
    const slides = FILE_NAME.map((f) => {
        if (f.includes(".webp")) {
            const [, ...name] = f.replace(".webp", "").split("_");
            return {
                src: `/project/${f}`,
                alt: name.join(", "),
            };
        } else {
            return {
                src: f,
                alt: "title",
            };
        }
    });

    const options: EmblaOptionsType = { loop: true, duration: 0, containScroll: false };
    return <EmblaCarouselPc slides={slides} options={options} />;
}

export async function generateStaticParams() {
    const projects = ["Day", "Line", "Life"];
    return projects.map((project) => ({
        project,
    }));
}
