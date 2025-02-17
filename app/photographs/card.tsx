"use client";

import Link from "next/link";
import Image from "next/image";
import { useState } from "react";

export default function Card({ src, name }: { src: string; name: string }) {
    const [isLoading, setIsloading] = useState(true);
    return (
        <Link
            href={`/photographs/${name}`}
            className={`grow relative transition-opacity duration-[0.5s]  ${isLoading ? "opacity-0" : "opacity-100"}`}
        >
            <div className="relative aspect-[51/64] ">
                <Image
                    src={src}
                    alt={name}
                    fill
                    className="h-auto w-full object-contain"
                    onLoad={() => setIsloading(false)}
                />
            </div>
            <div className="font-medium text-lg">{name}</div>
        </Link>
    );
}
