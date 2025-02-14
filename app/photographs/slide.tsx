"use client";

import Link from "next/link";
import Image from "next/image";
import { useState } from "react";

export default function Card({ src, name }: { src: string; name: string }) {
    const [isLoading, setIsloading] = useState(true);
    return (
        <Link
            href={`/photographs/${name}`}
            className={`relative transition-opacity duration-[0.5s] ${isLoading ? "opacity-0" : "opacity-100"}`}
        >
            <div className="relative bg-gray-200 w-full ">
                <Image
                    src={src}
                    alt={name}
                    width={0}
                    height={0}
                    sizes="100vw"
                    style={{ height: "auto", width: "100%", objectFit: "contain" }}
                    onLoad={() => setIsloading(false)}
                />
            </div>
            <div className="font-medium text-lg ">{name}</div>
        </Link>
    );
}
