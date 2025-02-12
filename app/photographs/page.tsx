import Card from "./slide";

export default async function Page() {
    const x = [
        {
            src: "/1.jpg",
            year: "2025",
            name: "Day",
        },
        {
            src: "/2.jpeg",
            year: "2024",
            name: "Line",
        },
        {
            src: "/3.jpg",
            year: "2023",
            name: "Life",
        },
    ];
    return (
        <div className="flex items-center lg:justify-center py-8 flex-col lg:flex-row">
            {x.map((x) => (
                <Card key={x.name} src={x.src} year={x.year} name={x.name} />
            ))}
        </div>
    );
}
