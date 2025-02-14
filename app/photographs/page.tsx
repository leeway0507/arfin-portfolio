import Card from "./slide";

export default async function Page() {
    const x = [
        {
            src: "project/Day/1_Carla_2024.jpeg",
            year: "2025",
            name: "Day",
        },
        {
            src: "project/Line/1.jpeg",
            year: "2024",
            name: "Line",
        },
        {
            src: "project/Life/1.jpeg",
            year: "2023",
            name: "Life",
        },
    ];
    return (
        <div className="flex items-center lg:justify-center flex-col lg:flex-row gap-x-4 pt-12">
            {x.map((x) => (
                <Card key={x.name} src={x.src} name={x.name} />
            ))}
        </div>
    );
}
