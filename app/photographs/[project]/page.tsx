import EmblaCarousel from "@/components/embla/embla-carousel";
import { EmblaOptionsType } from "embla-carousel";
import { readdir } from "fs/promises";
type Params = Promise<{ project: string }>;

export default async function Project(props: { params: Params }) {
    const params = await props.params;
    const projectName = params.project;

    const files = await readdir(`./public/project/${projectName}`);
    const slides = files
        .filter((f) => f !== ".DS_Store")
        .map((f) => {
            const [order, ...name] = f.replace(".jpeg", "").split("_");
            return {
                order: parseInt(order),
                src: `/project/${projectName}/${f}`,
                alt: name.join(","),
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
