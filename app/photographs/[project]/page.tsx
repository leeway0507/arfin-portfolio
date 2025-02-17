import EmblaCarousel from "@/components/embla/embla-carousel";
import { EmblaOptionsType } from "embla-carousel";
type Params = Promise<{ project: string }>;

const FILE_NAME = {
    Day: [
        "1_Carla_2024.jpeg",
        "2_Sarah_2024.jpeg",
        "3_Charlotte_2025.jpeg",
        "4_Sia_2024.jpeg",
        "5_Polina_2024.jpeg",
        "6_Marta_2024.jpeg",
        "7_Gbemi_2025.jpeg",
        "8_Saicou_2024.jpeg",
        "9_Aivita_2023.jpeg",
        "10_Subi_2025.jpeg",
    ],
    Line: ["1.jpeg", "2.jpeg", "3.jpeg", "4.jpeg", "5.jpeg", "6.jpeg", "7.jpeg", "8.jpeg"],
    Life: ["1.jpeg", "2.jpeg", "3.jpeg", "4.jpeg"],
};

export default async function Project(props: { params: Params }) {
    const params = await props.params;
    const projectName = params.project;
    const files = FILE_NAME[projectName as keyof typeof FILE_NAME];

    const slides = files
        .filter((f) => f !== ".DS_Store")
        .map((f) => {
            const [order, ...name] = f.replace(".jpeg", "").split("_");
            return {
                order: parseInt(order),
                src: `/project/${projectName}/${f}`,
                alt: name.join(", "),
            };
        })
        .sort((a, b) => a.order - b.order);

    const OPTIONS: EmblaOptionsType = { loop: true, duration: 30 };

    return <EmblaCarousel slides={slides} options={OPTIONS} />;
}

export async function generateStaticParams() {
    const projects = ["Day", "Line", "Life"];
    return projects.map((project) => ({
        project,
    }));
}
