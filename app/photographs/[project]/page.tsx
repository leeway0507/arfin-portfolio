export default async function Project({ params }: { params: { project: string } }) {
    const { project: projectName } = await params;

    return (
        <div className="flex flex-col items-center pt-8">
            <div>
                <div className="text-5xl font-bold text-left">{projectName}</div>
                <div className="pt-4 max-w-md">
                    <img src="/project/life/1.jpg" alt={`${projectName}`} />
                </div>
            </div>
        </div>
    );
}
