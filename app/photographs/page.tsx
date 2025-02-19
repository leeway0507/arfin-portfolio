import { PcCard, MobileCard } from "./card";

export default async function Page() {
    const thumbnails = [
        {
            src: "/project/Day/1_Carla_2024.webp",
            alt: "Day",
        },
        {
            src: "/project/Line/1_Maria_2024.webp",
            alt: "Line",
        },
        {
            src: "/project/Life/1_Dazzling_2022.webp",
            alt: "Life",
        },
    ];
    return (
        <>
            <div className="hidden sm:flex max-w-6xl justify-center flex-row gap-x-4 pt-4 w-full mx-auto ">
                {thumbnails.map((thumbnail) => (
                    <PcCard key={thumbnail.alt} src={thumbnail.src} name={thumbnail.alt} />
                ))}
            </div>
            <div className="sm:hidden max-w-2xl flex flex-col gap-y-4 grow w-full mx-auto pb-24 ">
                {thumbnails.map((thumbnail) => (
                    <MobileCard key={thumbnail.alt} src={thumbnail.src} name={thumbnail.alt} />
                ))}
            </div>
        </>
    );
}
