import Image from "next/image";
export default async function Page() {
    return (
        <div className="mx-auto flex flex-col grow h-[calc(100dvh-3rem)] align-center">
            <div className="flex flex-col my-auto">
                <div className="relative w-[60%] sm:w-[45%] mx-auto bg-gray-300/50 aspect-[1.53/1]">
                    <Image src="day_09.jpeg" alt="main" priority fill style={{ objectFit: "contain" }} />
                </div>
                <div className="text-2xl sm:text-4xl flex mx-auto font-bold">ARFIN YOON</div>
            </div>
        </div>
    );
}
