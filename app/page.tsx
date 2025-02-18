import Image from "next/image";
export default async function Page() {
    return (
        <div className="w-full h-full flex items-center">
            <div className="relative w-[95%] sm:min-w-[640px] sm:w-[55%] mx-auto bg-gray-300/50 aspect-[1.53/1]">
                <Image src="/main.png" alt="main" priority fill style={{ objectFit: "contain" }} />
            </div>
        </div>
    );
}
