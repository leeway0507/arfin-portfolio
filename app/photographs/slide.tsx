import Link from "next/link";

export default function Card({ src, year, name }: { src: string; year: string; name: string }) {
    return (
        <Link href={`/photographs/${name}`} className="relative w-96 aspect-[1.28/1]">
            <img src={src} alt={name} />
            <div className="absolute top-0 h-full w-full hover:opacity-100 opacity-0 transition duration-500 bg-black/50 text-white">
                <div className="p-4 text-xl font-bold capitalize">{name}</div>
                <div className="px-4 font-bold capitalize">{year}</div>
            </div>
        </Link>
    );
}
