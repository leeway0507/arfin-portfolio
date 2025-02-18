import type { Metadata } from "next";
import { Arimo } from "next/font/google";
import "./globals.css";
import { Nav } from "../components/nav/nav";

// Font files can be colocated inside of `app`
const arimo = Arimo({
    subsets: ["latin"],
    display: "swap",
});

export const metadata: Metadata = {
    title: "Arfin Yoon",
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="en" className="px-[2rem] relative ">
            <body className={`${arimo.className} antialiased flex pt-[4rem] sm:pb-0`}>
                <Nav />
                <div className="min-h-[calc(100dvh-4rem)] w-full">{children}</div>
            </body>
        </html>
    );
}
