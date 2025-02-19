import CustomCarousel from "@/components/custom-carousel/carousel";

type Params = Promise<{ project: string }>;

const FILE_NAME = {
    Day: [
        "1_Carla_2024.webp",
        "2_Sarah_2024.webp",
        "3_Charlotte_2025.webp",
        "4_Sia_2024.webp",
        "5_Polina_2024.webp",
        "6_Marta_2024.webp",
        "7_Gbemi_2025.webp",
        "8_Saicou_2024.webp",
        "9_Aivita_2023.webp",
        "10_Subi_2025.webp",
    ],
    Line: [
        "1_Maria_2024.webp",
        "2_Maria_2024.webp",
        "3_Maria_2024.webp",
        "4_Maria_2024.webp",
        "5_Maria_2024.webp",
        "6_Maria_2024.webp",
        "7_Maria_2024.webp",
        "8_Maria_2024.webp",
    ],
    Life: ["1_Dazzling_2022.webp", "2_Fairy_2023.webp", "3_Light_2024.webp", "4_Purple Flower_2024.webp"],
};

export default async function Project(props: { params: Params }) {
    const params = await props.params;
    const projectName = params.project;
    const files = FILE_NAME[projectName as keyof typeof FILE_NAME];

    const slides = files
        .filter((f) => f !== ".DS_Store")
        .map((f) => {
            const [order, ...name] = f.replace(".webp", "").split("_");
            return {
                order: parseInt(order),
                src: `/project/${projectName}/${f}`,
                alt: name.join(", "),
            };
        })
        .sort((a, b) => a.order - b.order);

    return <CustomCarousel slides={slides} />;
}

export async function generateStaticParams() {
    const projects = ["Day", "Line", "Life"];
    return projects.map((project) => ({
        project,
    }));
}
