import Card from "./card";

export default async function Page() {
    const thumbnails = [
        {
            src: "/project/Day/1_Carla_2024.jpeg",
            name: "Day",
        },
        {
            src: "/project/Line/1.jpeg",
            name: "Line",
        },
        {
            src: "/project/Life/1.jpeg",
            name: "Life",
        },
    ];
    return (
        <div className="flex flex-col sm:justify-center sm:flex-row gap-x-4 pt-12 grow w-full mx-auto pb-24">
            {thumbnails.map((thumbnail) => (
                <Card key={thumbnail.name} src={thumbnail.src} name={thumbnail.name} />
            ))}
        </div>
    );
}
