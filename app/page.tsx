import Image from "next/image";
export default async function Page() {
    return (
        <div className="mx-auto flex flex-col grow h-[calc(100dvh-3rem)] align-center">
            <div className="flex flex-col my-auto">
                <div className="relative w-[95%] sm:min-w-[640px] sm:w-[55%] mx-auto bg-gray-300/50 aspect-[1.53/1]">
                    <Image src="main.png" alt="main" priority fill style={{ objectFit: "contain" }} />
                </div>
            </div>
        </div>
    );
}
