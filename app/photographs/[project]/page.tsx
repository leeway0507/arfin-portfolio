import Image from "next/image";
type Params = Promise<{ project: string }>;

export default async function Project(props: { params: Params }) {
    const params = await props.params;
    const projectName = params.project;

    return (
        <div className="flex flex-col items-center pt-8">
            <div>
                <div className="text-5xl font-bold text-left">{projectName}</div>
                <div className="pt-4 max-w-md">
                    <Image src="/project/life/1.jpg" alt={`${projectName}`} />
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
