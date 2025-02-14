"use client";

import Link from "next/link";
import Image from "next/image";
import { useState } from "react";

export default function Card({ src, year, name }: { src: string; year: string; name: string }) {
    const [isLoading, setIsloading] = useState(true);
    return (
        <Link
            href={`/photographs/${name}`}
            className={`relative transition-opacity duration-[0.5s] ${isLoading ? "opacity-0" : "opacity-100"}`}
        >
            <div className="h-[30rem] bg-gray-200 ">
                <Image
                    src={src}
                    alt={name}
                    width={0}
                    height={0}
                    sizes="100vw"
                    style={{ height: "100%", width: "auto", objectFit: "contain" }}
                    onLoadingComplete={() => setIsloading(false)}
                />
            </div>
            <div className="font-medium text-lg ">{name}</div>
        </Link>
    );
}
