import Image from "next/image";
type Params = Promise<{ project: string }>;

export default async function Project(props: { params: Params }) {
    const params = await props.params;
    const projectName = params.project;

    return (
        <div className="w-full h-full flex flex-col items-center">
            <div className="w-full max-w-[640px] h-full">
                <div className="text-5xl font-bold">{projectName}</div>
                <div className="pt-4 relative w-full h-full">
                    <Image src="/project/life/1.jpg" alt={`${projectName}`} fill style={{ objectFit: "cover" }} />
                </div>
            </div>
        </div>
    );
}

export async function generateStaticParams() {
    const projects = ["Day", "Line", "Life"];
    return projects.map((project) => ({
        project,
    }));
}
